/**
 * Suscripciones Routes - StartEducation Platform
 * Maneja las rutas relacionadas con las suscripciones para estudiantes
 */

const express = require('express');
const router = express.Router();
const { requireAuth } = require('../../middleware/auth');

// SDK de Mercado Pago para pagos reales
const { MercadoPagoConfig, Preference } = require('mercadopago');
const client = new MercadoPagoConfig({
    accessToken: process.env.MERCADOPAGO_ACCESS_TOKEN
});

/**
 * GET /suscripciones - Vista de planes de suscripción para estudiantes
 */
router.get('/', async function(req, res, next) {
  try {
    const user = req.session.user;
    
    if (!user) {
      console.log('[SUSCRIPCIONES] ⚠️ Usuario no autenticado');
      return res.redirect('/auth/login');
    }
    
    console.log('[SUSCRIPCIONES] 👤 Usuario accediendo a suscripciones:', user.email);
    
    const db = req.app.locals.db;
    
    if (!db) {
      console.log('[SUSCRIPCIONES] ⚠️ No hay conexión a base de datos');
      return res.render('error', {
        title: 'Error del Sistema',
        message: 'Sistema en mantenimiento. Intenta más tarde.',
        error: { status: 503, stack: '' }
      });
    }

    let membresias = [];
    let currentSubscription = null;
    let stats = {
      totalPlanes: 0,
      usuariosActivos: 0,
      descuentoActual: 15
    };

    try {
      // Verificar qué tablas existen
      const tablesResult = await db.executeQuery(`
        SELECT TABLE_NAME 
        FROM INFORMATION_SCHEMA.TABLES 
        WHERE TABLE_TYPE = 'BASE TABLE' 
        AND TABLE_NAME IN ('Membresias', 'Suscripciones', 'Usuarios')
      `);
      
      const existingTables = tablesResult.recordset ? tablesResult.recordset.map(row => row.TABLE_NAME) : [];
      console.log('[SUSCRIPCIONES] 📋 Tablas disponibles:', existingTables);

      // Obtener membresías disponibles
      if (existingTables.includes('Membresias')) {
        try {
          const membresiasResult = await db.executeQuery(`
            SELECT 
              id_membresia,
              nombre,
              descripcion,
              precio,
              tipo_periodo
            FROM Membresias 
            ORDER BY precio ASC
          `);
          
          if (membresiasResult && membresiasResult.recordset) {
            membresias = membresiasResult.recordset;
            stats.totalPlanes = membresias.length;
          }
        } catch (membresiasError) {
          console.log('[SUSCRIPCIONES] ⚠️ Error consultando membresías');
        }
      }

      // Verificar suscripción actual del usuario
      if (existingTables.includes('Suscripciones') && existingTables.includes('Membresias')) {
        try {
          const subscriptionResult = await db.executeQuery(`
            SELECT TOP 1 
              s.id_suscripcion,
              s.estatus,
              s.fecha_compra as startDate,
              s.fecha_vencimiento as endDate,
              s.id_membresia as membershipId,
              m.nombre as planName,
              m.precio as price
            FROM Suscripciones s
            INNER JOIN Membresias m ON s.id_membresia = m.id_membresia
            WHERE s.id_usuario = @userId 
            AND s.estatus = 'activa'
            AND s.fecha_vencimiento > GETDATE()
            ORDER BY s.fecha_vencimiento DESC
          `, { userId: user.id });
          
          if (subscriptionResult && subscriptionResult.recordset && subscriptionResult.recordset.length > 0) {
            const sub = subscriptionResult.recordset[0];
            currentSubscription = {
              active: true,
              planName: sub.planName,
              price: sub.price,
              startDate: sub.startDate,
              endDate: sub.endDate,
              membershipId: sub.membershipId
            };
          } else {
            currentSubscription = { active: false };
          }
        } catch (subscriptionError) {
          console.log('[SUSCRIPCIONES] ⚠️ Error consultando suscripción actual');
          currentSubscription = { active: false };
        }
      }

      // Obtener estadísticas de usuarios activos
      if (existingTables.includes('Suscripciones')) {
        try {
          const activeUsersResult = await db.executeQuery(`
            SELECT COUNT(DISTINCT id_usuario) as total
            FROM Suscripciones 
            WHERE estatus = 'activa' 
            AND fecha_vencimiento > GETDATE()
          `);
          
          if (activeUsersResult && activeUsersResult.recordset && activeUsersResult.recordset.length > 0) {
            stats.usuariosActivos = activeUsersResult.recordset[0].total || 0;
          }
        } catch (statsError) {
          console.log('[SUSCRIPCIONES] ⚠️ Error consultando estadísticas');
        }
      }

      // Si no hay datos en la base de datos, usar datos de ejemplo
      if (membresias.length === 0) {
        membresias = [
          {
            id_membresia: 1,
            nombre: 'Plan Básico',
            descripcion: 'Perfecto para comenzar tu aprendizaje',
            precio: 19.99,
            tipo_periodo: 'mensual',
            beneficios: 'Acceso a cursos básicos|Soporte por email|Certificados básicos|Biblioteca de recursos'
          },
          {
            id_membresia: 2,
            nombre: 'Plan Premium',
            descripcion: 'Acceso completo con beneficios adicionales',
            precio: 39.99,
            tipo_periodo: 'mensual',
            beneficios: 'Acceso a todos los cursos|Soporte prioritario|Certificados premium|Videos HD|Descargas offline|Comunidad exclusiva'
          },
          {
            id_membresia: 3,
            nombre: 'Plan Pro',
            descripcion: 'Para profesionales que buscan excelencia',
            precio: 59.99,
            tipo_periodo: 'mensual',
            beneficios: 'Todo lo del Premium|Mentoring 1:1|Proyectos personalizados|Acceso anticipado|Sesiones en vivo|Portfolio personalizado'
          }
        ];
        stats.totalPlanes = membresias.length;
      }

    } catch (dbError) {
      console.error('[SUSCRIPCIONES] ❌ Error consultando datos:', dbError.message);
      // Usar datos de ejemplo en caso de error completo
      membresias = [
        {
          id_membresia: 1,
          nombre: 'Plan Básico',
          descripcion: 'Perfecto para comenzar tu aprendizaje',
          precio: 19.99,
          tipo_periodo: 'mensual',
          beneficios: 'Acceso a cursos básicos|Soporte por email|Certificados básicos'
        },
        {
          id_membresia: 2,
          nombre: 'Plan Premium',
          descripcion: 'Acceso completo con beneficios adicionales',
          precio: 39.99,
          tipo_periodo: 'mensual',
          beneficios: 'Acceso a todos los cursos|Soporte prioritario|Certificados premium|Videos HD'
        },
        {
          id_membresia: 3,
          nombre: 'Plan Pro',
          descripcion: 'Para profesionales que buscan excelencia',
          precio: 59.99,
          tipo_periodo: 'mensual',
          beneficios: 'Todo lo del Premium|Mentoring 1:1|Proyectos personalizados|Acceso anticipado'
        }
      ];
      stats = { totalPlanes: 3, usuariosActivos: 247, descuentoActual: 15 };
      currentSubscription = { active: false };
    }

    console.log('[SUSCRIPCIONES] 📊 Datos obtenidos:', {
      membresiasCount: membresias.length,
      hasCurrentSubscription: currentSubscription && currentSubscription.active,
      stats: stats
    });

    res.render('estudiante/suscripciones', {
      title: 'Planes de Suscripción - StartEducation',
      user: user,
      membresias: membresias,
      currentSubscription: currentSubscription,
      stats: stats,
      layout: false
    });

  } catch (error) {
    console.error('[SUSCRIPCIONES] ❌ Error en ruta:', error);
    res.render('error', {
      title: 'Error',
      message: 'Error al cargar planes de suscripción',
      error: error
    });
  }
});

/**
 * POST /suscripciones/crear-preferencia-membresia
 * Crea una preferencia de pago en Mercado Pago para una membresía
 */
router.post('/crear-preferencia-membresia', requireAuth, async (req, res) => {
    try {
        console.log('[SUSCRIPCIONES] 🎯 Iniciando creación de preferencia');
        console.log('[SUSCRIPCIONES] 📦 Body recibido:', req.body);
        
        const { id_membresia } = req.body;
        const user = req.session.user;
        const db = req.app.locals.db;
        
        console.log('[SUSCRIPCIONES] 👤 Usuario:', user.email);
        console.log('[SUSCRIPCIONES] 🏷️ ID Membresía:', id_membresia);

        if (!id_membresia) {
            console.log('[SUSCRIPCIONES] ❌ ID de membresía no proporcionado');
            return res.status(400).json({ success: false, message: 'ID de membresía no proporcionado.' });
        }

        // 1. Obtener los datos de la membresía de la BD
        console.log('[SUSCRIPCIONES] 🔍 Consultando membresía en BD...');
        const membresiaQuery = "SELECT nombre, precio, descripcion FROM Membresias WHERE id_membresia = @id_membresia";
        const membresiaResult = await db.executeQuery(membresiaQuery, { id_membresia });
        console.log('[SUSCRIPCIONES] 📊 Resultado membresía:', membresiaResult.recordset);

        if (membresiaResult.recordset.length === 0) {
            console.log('[SUSCRIPCIONES] ❌ Membresía no encontrada');
            return res.status(404).json({ success: false, message: 'Membresía no encontrada.' });
        }

        const membresia = membresiaResult.recordset[0];
        const precio = parseFloat(membresia.precio);
        console.log('[SUSCRIPCIONES] 💰 Precio calculado:', precio);

        // 2. Crear el item para Mercado Pago
        const mpItems = [{
            id: id_membresia.toString(),
            title: membresia.nombre,
            description: membresia.descripcion || `Suscripción a ${membresia.nombre}`,
            quantity: 1,
            currency_id: 'MXN', // Asegúrate que sea tu moneda
            unit_price: precio
        }];
        console.log('[SUSCRIPCIONES] 🛍️ Items para MP:', JSON.stringify(mpItems, null, 2));

        // 3. Configurar la preferencia de pago
        console.log('[SUSCRIPCIONES] 🔧 Creando preferencia de MercadoPago...');
        console.log('[SUSCRIPCIONES] 🔐 Token MP:', process.env.MERCADOPAGO_ACCESS_TOKEN ? 'Configurado' : 'NO CONFIGURADO');
        console.log('[SUSCRIPCIONES] 👤 Usuario completo:', JSON.stringify(user, null, 2));
        
        // Validar campos del usuario
        const userEmail = user.email || 'default@example.com';
        const userName = user.nombre || 'Usuario';
        const userSurname = user.apellido || 'Sin Apellido';
        const userId = user.id_usuario || user.id;
        
        console.log('[SUSCRIPCIONES] ✅ Campos validados - Email:', userEmail, 'Nombre:', userName, 'Apellido:', userSurname, 'ID:', userId);
        
        // Construir URLs de retorno
        const baseUrl = process.env.BASE_URL || 'http://localhost:3000';
        const backUrls = {
            success: `${baseUrl}/suscripciones?pago=success`,
            failure: `${baseUrl}/suscripciones?pago=failure`, 
            pending: `${baseUrl}/suscripciones?pago=pending`
        };
        
        console.log('[SUSCRIPCIONES] 🔗 URLs de retorno:', backUrls);
        
        // Estructura MÍNIMA de la preferencia para debugging
        const preferenceBody = {
            items: mpItems,
            payer: {
                email: userEmail,
                name: userName,
                surname: userSurname
            },
            external_reference: userId.toString()
        };
        
        console.log('[SUSCRIPCIONES] 📝 Cuerpo de preferencia completo:', JSON.stringify(preferenceBody, null, 2));
        
        const preference = new Preference(client);
        const result = await preference.create({
            body: preferenceBody
        });

        console.log(`[SUSCRIPCIONES] ✅ Preferencia de pago creada: ${result.id}`);
        console.log(`[SUSCRIPCIONES] 🔗 Init point: ${result.init_point}`);
        
        res.json({
            success: true,
            preferenceId: result.id,
            initPoint: result.init_point // La URL de pago
        });

    } catch (error) {
        console.error('[SUSCRIPCIONES] ❌ Error completo:', error);
        console.error('[SUSCRIPCIONES] ❌ Stack trace:', error.stack);
        res.status(500).json({ success: false, message: 'Error al procesar el pago.' });
    }
});

/**
 * GET /suscripciones/mis-suscripciones
 * Vista de las suscripciones del usuario actual
 */
router.get('/mis-suscripciones', requireAuth, async (req, res) => {
    try {
        const user = req.session.user;
        const db = req.app.locals.db;

        console.log('[MIS SUSCRIPCIONES] Usuario accediendo:', user.email);

        // Obtener suscripciones del usuario
        const suscripcionesQuery = `
            SELECT 
                s.id_suscripcion,
                s.fecha_compra,
                s.fecha_vencimiento,
                s.estatus,
                m.nombre as plan_nombre,
                m.descripcion as plan_descripcion,
                m.precio
            FROM Suscripciones s
            INNER JOIN Membresias m ON s.id_membresia = m.id_membresia
            WHERE s.id_usuario = @id_usuario
            ORDER BY s.fecha_compra DESC
        `;

        const result = await db.executeQuery(suscripcionesQuery, { 
            id_usuario: user.id_usuario 
        });

        const suscripciones = result.recordset || [];

        // Verificar mensajes de estado del pago
        const paymentStatus = req.query.pago;
        let statusMessage = null;
        
        if (paymentStatus === 'success') {
            statusMessage = { type: 'success', text: '¡Pago procesado exitosamente! Tu suscripción está activa.' };
        } else if (paymentStatus === 'failure') {
            statusMessage = { type: 'error', text: 'El pago no pudo ser procesado. Intenta nuevamente.' };
        } else if (paymentStatus === 'pending') {
            statusMessage = { type: 'warning', text: 'Tu pago está pendiente de confirmación.' };
        }

        res.render('estudiante/mis-suscripciones', {
            title: 'Mis Suscripciones - StartEducation',
            user: user,
            suscripciones: suscripciones,
            statusMessage: statusMessage,
            layout: false
        });

    } catch (error) {
        console.error('[MIS SUSCRIPCIONES] Error:', error);
        res.render('error', {
            title: 'Error',
            message: 'Error al cargar tus suscripciones',
            error: error
        });
    }
});

/**
 * POST /suscripciones/cancelar/:id_suscripcion
 * Permite a un usuario cancelar su propia suscripción activa.
 * La suscripción pasa a estado 'cancelada' y expirará en la fecha_vencimiento.
 */
router.post('/cancelar/:id_suscripcion', requireAuth, async (req, res) => {
    try {
        const { id_suscripcion } = req.params;
        const id_usuario = req.session.user.id_usuario; // De la sesión
        const db = req.app.locals.db;

        if (!id_suscripcion || !id_usuario) {
            return res.status(400).json({
                success: false,
                message: 'Solicitud inválida.'
            });
        }

        // ¡Validación de seguridad crítica!
        // Asegurarse de que el usuario solo cancele SUS propias suscripciones
        // y que la suscripción esté 'activa'.
        const updateQuery = `
            UPDATE Suscripciones
            SET estatus = 'cancelada'
            WHERE 
                id_suscripcion = @id_suscripcion 
                AND id_usuario = @id_usuario 
                AND estatus = 'activa'
        `;

        const result = await db.executeQuery(updateQuery, { 
            id_suscripcion: parseInt(id_suscripcion, 10), 
            id_usuario: id_usuario 
        });

        if (result.rowsAffected[0] > 0) {
            // Éxito
            return res.json({
                success: true,
                message: 'Tu suscripción ha sido cancelada. Seguirás teniendo acceso hasta la fecha de vencimiento.'
            });
        } else {
            // Falla (no se encontró, no le pertenece, o no estaba activa)
            return res.status(400).json({
                success: false,
                message: 'No se pudo cancelar la suscripción. Es posible que ya estuviera inactiva o no te pertenezca.'
            });
        }
        
    } catch (error) {
        console.error('Error al cancelar suscripción:', error);
        return res.status(500).json({
            success: false,
            message: 'Ocurrió un error al procesar tu solicitud.'
        });
    }
});

module.exports = router;