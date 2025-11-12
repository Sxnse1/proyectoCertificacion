/**
 * Rutas de Pagos - Integración con Mercado Pago
 * Maneja creación de preferencias de pago y webhooks
 */

const express = require('express');
const router = express.Router();
const { MercadoPagoConfig, Preference, Payment } = require('mercadopago');

// Configurar Mercado Pago
const client = new MercadoPagoConfig({
  accessToken: process.env.MERCADOPAGO_ACCESS_TOKEN,
  options: {
    timeout: 10000,
    idempotencyKey: 'abc'
  }
});

/**
 * POST /pagos/crear-preferencia
 * Crea una preferencia de pago con los items del carrito
 */
router.post('/crear-preferencia', async function(req, res, next) {
  try {
    const user = req.session.user;
    const db = req.app.locals.db;
    
    if (!user) {
      return res.status(401).json({ 
        success: false, 
        message: 'Usuario no autenticado' 
      });
    }

    console.log('[PAGOS] 💳 Creando preferencia para usuario:', user.email);

    // Obtener items del carrito
    const carritoQuery = `
      SELECT 
        cc.id_carrito,
        cc.id_curso,
        c.titulo,
        c.precio,
        c.descripcion,
        c.miniatura,
        1 as cantidad
      FROM Carrito_Compras cc
      INNER JOIN Cursos c ON cc.id_curso = c.id_curso
      WHERE cc.id_usuario = @userId AND cc.estatus = 'activo'
    `;

    const carritoResult = await db.executeQuery(carritoQuery, {
      userId: user.id
    });

    if (!carritoResult.recordset || carritoResult.recordset.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'El carrito está vacío'
      });
    }

    const items = carritoResult.recordset;
    
    // Calcular total
    const total = items.reduce((sum, item) => {
      return sum + (parseFloat(item.precio) * parseInt(item.cantidad));
    }, 0);

    console.log(`[PAGOS] 🛒 Carrito: ${items.length} items, Total: $${total}`);

    // Crear items para Mercado Pago
    const mpItems = items.map(item => {
      const precio = parseFloat(item.precio);
      console.log(`[PAGOS] 💰 Item: ${item.titulo} - Precio: $${precio}`);
      
      return {
        id: item.id_curso.toString(),
        title: item.titulo,
        description: item.descripcion || `Curso: ${item.titulo}`,
        picture_url: item.miniatura || '',
        category_id: 'education',
        quantity: parseInt(item.cantidad),
        currency_id: 'MXN',
        unit_price: precio
      };
    });

    // Generar URLs base - Usar URLs específicas para evitar problemas
    const protocol = req.protocol;
    const host = req.get('host');
    
    // Para desarrollo local, usar URLs específicas
    let baseUrl;
    if (host.includes('localhost') || host.includes('127.0.0.1')) {
      baseUrl = 'http://localhost:3000';
    } else {
      baseUrl = `${protocol}://${host}`;
    }
    
    console.log('[PAGOS] 🔗 URLs generadas:', {
      protocol,
      host,
      baseUrl,
      success: `${baseUrl}/carrito?pago=success`,
      failure: `${baseUrl}/carrito?pago=failure`,
      pending: `${baseUrl}/carrito?pago=pending`
    });
    
    // Configurar preferencia básica (solo lo esencial)
    const preferenceData = {
      items: mpItems,
      payer: {
        name: user.nombre.split(' ')[0] || 'Usuario',
        surname: user.nombre.split(' ').slice(1).join(' ') || 'StartEducation', 
        email: user.email,
      },
      external_reference: user.id.toString(),
      statement_descriptor: 'StartEducation'
    };

    console.log('[PAGOS] 📝 Datos de preferencia:', {
      items: mpItems.length,
      total: total,
      email: user.email,
      external_reference: user.id,
      baseUrl: baseUrl
    });
    
    console.log('[PAGOS] 🔍 Preferencia completa:', JSON.stringify(preferenceData, null, 2));

    // Crear preferencia en Mercado Pago
    const preference = new Preference(client);
    const result = await preference.create({ body: preferenceData });

    console.log('[PAGOS] ✅ Preferencia creada:', result.id);

    res.json({
      success: true,
      preferenceId: result.id,
      initPoint: result.init_point,
      publicKey: process.env.MERCADOPAGO_PUBLIC_KEY,
      total: total,
      items: mpItems.length
    });

  } catch (error) {
    console.error('[PAGOS] ❌ Error creando preferencia:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * POST /pagos/webhook  
 * Webhook para recibir notificaciones de Mercado Pago
 */
router.post('/webhook', async function(req, res, next) {
  try {
    const { type, data } = req.body;
    
    console.log('[PAGOS] 🔔 Webhook recibido:', { type, data });

    // Solo procesar notificaciones de pagos
    if (type !== 'payment') {
      console.log('[PAGOS] ⏭️ Ignorando notificación tipo:', type);
      return res.status(200).send('OK');
    }

    const paymentId = data.id;
    if (!paymentId) {
      console.log('[PAGOS] ⚠️ ID de pago no encontrado');
      return res.status(400).send('Payment ID missing');
    }

    // Obtener información del pago
    const payment = new Payment(client);
    const paymentInfo = await payment.get({ id: paymentId });

    console.log('[PAGOS] 📄 Info del pago:', {
      id: paymentInfo.id,
      status: paymentInfo.status,
      external_reference: paymentInfo.external_reference,
      transaction_amount: paymentInfo.transaction_amount
    });

    // Solo procesar pagos aprobados
    if (paymentInfo.status === 'approved') {
      const userId = parseInt(paymentInfo.external_reference);
      
      if (!userId) {
        console.log('[PAGOS] ⚠️ Usuario no identificado en external_reference');
        return res.status(200).send('OK');
      }

      const db = req.app.locals.db;
      
      // Iniciar transacción
      const transaction = db.transaction();
      await transaction.begin();

      try {
        // Obtener items del carrito activo con precios correctos
        const carritoQuery = `
          SELECT 
            cc.id_carrito,
            cc.id_curso,
            1 as cantidad,
            c.precio
          FROM Carrito_Compras cc
          INNER JOIN Cursos c ON cc.id_curso = c.id_curso
          WHERE cc.id_usuario = @userId AND cc.estatus = 'activo'
        `;
        
        const carritoResult = await transaction.request()
          .input('userId', userId)
          .query(carritoQuery);

        const items = carritoResult.recordset;
        
        if (items.length === 0) {
          console.log('[PAGOS] ⚠️ No hay items en carrito para usuario:', userId);
          await transaction.rollback();
          return res.status(200).send('OK');
        }

        // Mover items a tabla Compras con precios correctos
        for (const item of items) {
          await transaction.request()
            .input('userId', userId)
            .input('cursoId', item.id_curso)
            .input('cantidad', item.cantidad)
            .input('precio', parseFloat(item.precio))
            .input('metodoPago', 'mercadopago')
            .input('transactionId', paymentId)
            .query(`
              INSERT INTO Compras (
                id_usuario, id_curso, cantidad, precio_pagado, 
                metodo_pago, transaction_id, fecha_compra, estatus
              ) VALUES (
                @userId, @cursoId, @cantidad, @precio,
                @metodoPago, @transactionId, GETDATE(), 'completada'
              )
            `);
        }

        // Actualizar carrito a 'comprado'
        await transaction.request()
          .input('userId', userId)
          .query(`
            UPDATE Carrito_Compras 
            SET estatus = 'comprado', fecha_modificacion = GETDATE()
            WHERE id_usuario = @userId AND estatus = 'activo'
          `);

        // Crear inscripciones automáticas
        for (const item of items) {
          await transaction.request()
            .input('userId', userId)
            .input('cursoId', item.id_curso)
            .query(`
              IF NOT EXISTS (SELECT 1 FROM inscripciones WHERE id_usuario = @userId AND id_curso = @cursoId)
              BEGIN
                INSERT INTO inscripciones (id_usuario, id_curso, fecha_inscripcion, progreso, estatus)
                VALUES (@userId, @cursoId, GETDATE(), 0, 'activa')
              END
            `);
        }

        await transaction.commit();
        
        console.log(`[PAGOS] ✅ Pago procesado exitosamente - Usuario: ${userId}, Items: ${items.length}`);

      } catch (dbError) {
        await transaction.rollback();
        console.error('[PAGOS] ❌ Error en base de datos:', dbError);
        throw dbError;
      }
    }

    res.status(200).send('OK');

  } catch (error) {
    console.error('[PAGOS] ❌ Error en webhook:', error);
    res.status(500).send('Error interno');
  }
});

/**
 * GET /pagos/status/:paymentId
 * Consultar estado de un pago específico  
 */
router.get('/status/:paymentId', async function(req, res, next) {
  try {
    const { paymentId } = req.params;
    
    const payment = new Payment(client);
    const paymentInfo = await payment.get({ id: paymentId });

    res.json({
      success: true,
      payment: {
        id: paymentInfo.id,
        status: paymentInfo.status,
        status_detail: paymentInfo.status_detail,
        transaction_amount: paymentInfo.transaction_amount,
        date_created: paymentInfo.date_created
      }
    });

  } catch (error) {
    console.error('[PAGOS] ❌ Error consultando pago:', error);
    res.status(500).json({
      success: false,
      message: 'Error consultando estado del pago'
    });
  }
});

module.exports = router;