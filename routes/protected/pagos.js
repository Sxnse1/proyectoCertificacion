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
      userId: user.id_usuario || user.id
    });

    if (!carritoResult.recordset || carritoResult.recordset.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'El carrito está vacío'
      });
    }

    const items = carritoResult.recordset;
    
    // --- INICIO DE VALIDACIÓN DE DOBLE PAGO ---
    const id_usuario = user.id_usuario || user.id;
    let itemsParaPagar = [...items]; // Clonamos los items para poder filtrarlos
    
    console.log(`[PAGOS] 🛒 Items en carrito antes de filtrar: ${items.length}`);

    // Verificación 1: ¿El usuario tiene una suscripción activa?
    const subsQuery = await db.executeQuery("SELECT COUNT(*) AS count FROM Suscripciones WHERE id_usuario = @id_usuario AND estatus = 'activa'", { id_usuario });
    const tieneSuscripcionActiva = subsQuery.recordset[0].count > 0;

    if (tieneSuscripcionActiva) {
        // Si tiene suscripción, no debe comprar cursos individuales.
        console.log(`[PAGOS] 🛡️ Usuario ${id_usuario} tiene suscripción activa. No se procesarán compras individuales.`);
        itemsParaPagar = []; // Vaciamos la lista
    } else {
        // Verificación 2: No tiene suscripción. Filtrar cursos que YA compró.
        const comprasQuery = await db.executeQuery("SELECT id_curso FROM Compras WHERE id_usuario = @id_usuario", { id_usuario });
        
        // Creamos un Set para búsqueda rápida
        const cursosCompradosIds = new Set(comprasQuery.recordset.map(c => c.id_curso));

        if (cursosCompradosIds.size > 0) {
            const itemsOriginales = itemsParaPagar.length;
            // Filtramos la lista: nos quedamos solo con items que NO estén en el Set de cursosCompradosIds
            itemsParaPagar = itemsParaPagar.filter(item => !cursosCompradosIds.has(item.id_curso));
            
            if (itemsParaPagar.length < itemsOriginales) {
                console.log(`[PAGOS] 🛡️ Se filtraron ${itemsOriginales - itemsParaPagar.length} cursos que el usuario ya posee.`);
            }
        }
    }

    // Verificación 3: Comprobar si queda algo por pagar
    if (itemsParaPagar.length === 0) {
      console.log(`[PAGOS] 🛑 No hay items válidos para pagar.`);
      return res.status(400).json({
          success: false,
          message: 'El carrito está vacío o ya posees acceso a todos los cursos en él.'
      });
    }
    
    console.log(`[PAGOS] 🛒 Items en carrito después de filtrar: ${itemsParaPagar.length}`);
    // --- FIN DE VALIDACIÓN DE DOBLE PAGO ---
    
    // Calcular total
    const total = itemsParaPagar.reduce((sum, item) => {
      return sum + (parseFloat(item.precio) * parseInt(item.cantidad));
    }, 0);

    console.log(`[PAGOS] 🛒 Carrito: ${items.length} items, Total: $${total}`);

    // Crear items para Mercado Pago
    const mpItems = itemsParaPagar.map(item => {
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
      external_reference: (user.id_usuario || user.id).toString(),
      statement_descriptor: 'StartEducation'
    };

    console.log('[PAGOS] 📝 Datos de preferencia:', {
      items: mpItems.length,
      total: total,
      email: user.email,
      external_reference: user.id_usuario || user.id,
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
      
      // ¡Corrección Clave! Usar los items de MP, no el carrito
      const itemsPagados = paymentInfo.additional_info ? paymentInfo.additional_info.items : null;

      if (!userId || !itemsPagados || itemsPagados.length === 0) {
          console.log('[PAGOS] ⚠️ Pago aprobado pero sin external_reference o sin items. No se puede procesar:', paymentId);
          return res.status(200).send('OK (nada que procesar)');
      }

      const db = req.app.locals.db;
      
      // Iniciar transacción
      const transaction = db.transaction();
      await transaction.begin();

      try {
        // Iteramos sobre los items que SÍ se pagaron
        for (const item of itemsPagados) {
            const id_curso = parseInt(item.id, 10);
            const monto_pagado = parseFloat(item.unit_price);

            await transaction.request()
                .input('userId', userId)
                .input('cursoId', id_curso)
                .input('monto', monto_pagado)
                .input('metodoPago', 'mercadopago')
                .input('descripcion', `Pago MP: ${paymentId}`)
                .query(`
                    INSERT INTO Compras (
                        id_usuario, id_curso, monto, 
                        metodo_pago, descripcion, fecha_compra
                    ) VALUES (
                        @userId, @cursoId, @monto,
                        @metodoPago, @descripcion, GETDATE()
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

        await transaction.commit();
        
        console.log(`[PAGOS] ✅ Pago procesado exitosamente - Usuario: ${userId}, Items: ${itemsPagados.length}`);

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

/**
 * POST /pagos/webhook-suscripcion
 * Webhook para recibir notificaciones de PAGOS DE SUSCRIPCIONES
 */
router.post('/webhook-suscripcion', async (req, res) => {
    const { type, data } = req.body;

    // Solo procesar notificaciones de pagos
    if (type !== 'payment') {
        console.log('[MP Webhook Subs]: Ignorando notificación tipo:', type);
        return res.status(200).send('Evento no procesado');
    }

    const paymentId = data.id;
    if (!paymentId) {
        console.log('[MP Webhook Subs]: ⚠️ ID de pago no encontrado');
        return res.status(400).send('Payment ID missing');
    }
    
    console.log(`[MP Webhook Subs]: 🔔 Recibido pago ID: ${paymentId}`);

    try {
        // Usamos el 'client' de MercadoPagoConfig definido al inicio de este archivo
        const payment = new Payment(client);
        const paymentInfo = await payment.get({ id: paymentId });

        console.log(`[MP Webhook Subs]: 📄 Info del pago:`, {
            id: paymentInfo.id,
            status: paymentInfo.status,
            external_reference: paymentInfo.external_reference
        });

        // Solo procesar pagos aprobados
        if (paymentInfo.status === 'approved') {
            const userId = parseInt(paymentInfo.external_reference, 10);
            
            // Los items de la suscripción están en additional_info
            const items = paymentInfo.additional_info ? paymentInfo.additional_info.items : null;

            if (!items || items.length === 0) {
                console.error('[MP Webhook Subs]: ❌ No se encontraron "items" en additional_info. No se puede activar la membresía.');
                throw new Error('No hay items en la información del pago.');
            }

            // Asumimos una sola membresía por pago
            const id_membresia = parseInt(items[0].id, 10);
            const monto = parseFloat(items[0].unit_price);

            if (!userId || isNaN(userId) || !id_membresia || isNaN(id_membresia)) {
                console.error(`[MP Webhook Subs]: ❌ Datos inválidos: userId=${userId}, id_membresia=${id_membresia}`);
                throw new Error(`Datos inválidos: userId=${userId}, id_membresia=${id_membresia}`);
            }

            // Obtener la instancia de BD (como en el otro webhook)
            const db = req.app.locals.db;
            if (!db) {
                console.error('[MP Webhook Subs]: ❌ La conexión a la base de datos (db) no está disponible en req.app.locals');
                throw new Error('Conexión DB no disponible');
            }

            // Iniciar transacción (como en el otro webhook)
            const transaction = db.transaction();
            
            try {
                await transaction.begin();

                // 1. Obtener detalles de la membresía para calcular la fecha de vencimiento
                const membresiaResult = await transaction.request()
                    .input('id_membresia', id_membresia)
                    .query('SELECT tipo_periodo FROM Membresias WHERE id_membresia = @id_membresia');
                
                if (membresiaResult.recordset.length === 0) {
                    throw new Error(`Membresía con ID ${id_membresia} no encontrada.`);
                }

                const tipo_periodo = membresiaResult.recordset[0].tipo_periodo;
                let fecha_vencimiento_sql;

                // Calcular fecha de vencimiento
                switch (tipo_periodo) {
                    case 'mensual':
                        fecha_vencimiento_sql = "DATEADD(month, 1, GETDATE())";
                        break;
                    case 'anual':
                        fecha_vencimiento_sql = "DATEADD(year, 1, GETDATE())";
                        break;
                    case 'vitalicio':
                        fecha_vencimiento_sql = "'9999-12-31'"; // Fecha "infinita"
                        break;
                    default:
                        throw new Error(`Tipo de periodo desconocido: ${tipo_periodo}`);
                }

                // 2. Insertar la nueva suscripción
                const insertSuscripcionResult = await transaction.request()
                    .input('id_usuario', userId)
                    .input('id_membresia', id_membresia)
                    .query(`
                        INSERT INTO Suscripciones (id_usuario, id_membresia, fecha_compra, fecha_vencimiento, estatus)
                        OUTPUT INSERTED.id_suscripcion -- Devolver el ID recién creado
                        VALUES (@id_usuario, @id_membresia, GETDATE(), ${fecha_vencimiento_sql}, 'activa')
                    `);
                
                const id_suscripcion = insertSuscripcionResult.recordset[0].id_suscripcion;

                // 3. Insertar en el historial de pagos
                await transaction.request()
                    .input('id_usuario', userId)
                    .input('id_suscripcion', id_suscripcion)
                    .input('monto', monto)
                    .input('estatus', 'exitoso')
                    .query(`
                        INSERT INTO Historial_Pagos (id_usuario, id_suscripcion, id_compra, monto, fecha_pago, estatus)
                        VALUES (@id_usuario, @id_suscripcion, NULL, @monto, GETDATE(), @estatus)
                    `);
                
                await transaction.commit();
                console.log(`[MP Webhook Subs]: ✅ Suscripción ${id_suscripcion} activada para usuario ${userId}.`);

            } catch (err) {
                await transaction.rollback();
                console.error('[MP Webhook Subs] ❌ Error en transacción DB:', err.message);
                // Devolvemos 500 para que MercadoPago reintente
                return res.status(500).send('Error procesando el pago (transacción DB)');
            }
        } else {
            console.log(`[MP Webhook Subs]: ℹ️ Pago ${paymentId} no aprobado (estatus: ${paymentInfo.status}). No se procesa.`);
        }

        // Devolvemos 200 OK para que MercadoPago no reintente
        res.status(200).send('Webhook recibido');

    } catch (error) {
        console.error(`[MP Webhook Subs] ❌ Error fatal al procesar pago ${paymentId}:`, error.message);
        // Devolvemos 500 para que MercadoPago reintente
        res.status(500).send('Error procesando el pago (fetch MP)');
    }
});

module.exports = router;