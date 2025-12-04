/**
 * Carrito - Funcionalidad del carrito de compras
 * Maneja eliminación, guardado, cupones y procesamiento de pagos
 */

var express = require('express');
var router = express.Router();
const { requireAuth } = require('../../middleware/auth');

/* GET carrito count for navbar */
router.get('/count', requireAuth, async function(req, res, next) {
  try {
    const user = req.session.user;
    if (!user) {
      return res.json({ count: 0 });
    }

    const db = req.app.locals.db;
    
    const countQuery = `
      SELECT COUNT(*) as count
      FROM Carrito_Compras car
      WHERE car.id_usuario = @id_usuario AND car.estatus = 'activo'
    `;
    
    const countResult = await db.executeQuery(countQuery, { id_usuario: user.id_usuario || user.id });
    const count = countResult.recordset[0]?.count || 0;
    
    res.json({ count: count });
  } catch (error) {
    console.error('[CARRITO COUNT] ❌ Error:', error);
    res.json({ count: 0 });
  }
});

/* GET carrito page */
router.get('/', requireAuth, async function(req, res, next) {
  try {
    const user = req.session.user;
    const db = req.app.locals.db;
    
    // Validación adicional de seguridad
    if (!user) {
      return res.redirect('/auth/login?error=sesion_expirada');
    }
    
    console.log('[CARRITO] 🛒 Acceso al carrito - Usuario:', user.email);

    // Obtener items del carrito del usuario
    const carritoQuery = `
      SELECT 
        car.id_carrito,
        1 as cantidad,
        car.fecha_agregado,
        car.estatus,
        c.id_curso,
        c.titulo,
        c.descripcion,
        c.miniatura,
        c.precio,
        c.nivel,
        cat.nombre as categoria_nombre,
        u.nombre + ' ' + u.apellido as instructor_nombre
      FROM Carrito_Compras car
      INNER JOIN Cursos c ON car.id_curso = c.id_curso
      INNER JOIN Categorias cat ON c.id_categoria = cat.id_categoria
      INNER JOIN Usuarios u ON c.id_usuario = u.id_usuario
      WHERE car.id_usuario = @userId AND c.estatus = 'publicado' AND car.estatus = 'activo'
      ORDER BY car.fecha_agregado DESC
    `;

    const userId = user.id_usuario || user.id;
    
    const carritoResult = await db.executeQuery(carritoQuery, { 
      userId: userId 
    });

    const items = carritoResult.recordset || [];
    
    // Calcular totales
    const subtotal = items.reduce((sum, item) => sum + (item.precio * item.cantidad), 0);
    const total = subtotal; // Aquí podrías agregar impuestos, descuentos, etc.

    console.log('[CARRITO] ✅ Items encontrados:', items.length, '- Total: $', total);

    // Verificar parámetros de pago en la URL
    const pagoStatus = req.query.pago;
    let pagoMessage = null;
    
    if (pagoStatus === 'success') {
      pagoMessage = { type: 'success', text: '¡Pago completado exitosamente! Tus cursos están disponibles.' };
    } else if (pagoStatus === 'failure') {
      pagoMessage = { type: 'error', text: 'El pago no pudo ser procesado. Intenta nuevamente.' };
    } else if (pagoStatus === 'pending') {
      pagoMessage = { type: 'info', text: 'Tu pago está siendo procesado. Te notificaremos cuando esté listo.' };
    }

    res.render('estudiante/carrito', {
      title: 'Mi Carrito - StartEducation',
      items: items,
      subtotal: subtotal,
      total: total,
      itemCount: items.length,
      userName: user.nombre,
      userEmail: user.email,
      userRole: user.rol,
      pagoMessage: pagoMessage,
      layout: 'layouts/main'  // Layout corregido sin referencias req.get
    });

  } catch (error) {
    console.error('[CARRITO] ❌ Error:', error);
    res.status(500).render('shared/error', {
      title: 'Error del Servidor',
      message: 'Error al cargar el carrito',
      error: error,
      userName: req.session.user?.nombre,
      userRole: req.session.user?.rol
    });
  }
});

/**
 * POST /carrito/add
 * Añade un curso al carrito, con validaciones completas de acceso.
 */
router.post('/add', requireAuth, async (req, res) => {
    console.log('[CARRITO] 🎯 RUTA POST /add EJECUTÁNDOSE');
    try {
        // Debug: Log de usuario y sesión
        console.log('[CARRITO DEBUG] 🔍 Intento de agregar al carrito');
        console.log('[CARRITO DEBUG] 👤 Usuario en sesión:', req.session.user ? req.session.user.email : 'NO LOGUEADO');
        console.log('[CARRITO DEBUG] 📦 Body:', req.body);
        console.log('[CARRITO DEBUG] 🍪 Session ID:', req.sessionID);
        
        const { id_curso } = req.body;
        const id_usuario = req.session.user.id_usuario || req.session.user.id;
        const db = req.app.locals.db;

        if (!id_curso) {
            return res.status(400).json({ 
                success: false, 
                message: 'ID del curso no proporcionado.' 
            });
        }

        console.log(`[CARRITO] 🛒 Validando acceso para curso ${id_curso} - Usuario: ${id_usuario}`);

        // --- INICIO DE VALIDACIÓN DE ACCESO ---
        
        // Verificación 1: ¿Suscripción activa?
        const subsQuery = await db.executeQuery("SELECT COUNT(*) AS count FROM Suscripciones WHERE id_usuario = @id_usuario AND estatus = 'activa'", { id_usuario });
        if (subsQuery.recordset[0].count > 0) {
            return res.status(400).json({ 
                success: false, 
                message: 'Ya tienes acceso a todos los cursos con tu suscripción activa.' 
            });
        }

        // Verificación 2: ¿Curso ya comprado?
        const comprasQuery = await db.executeQuery("SELECT COUNT(*) AS count FROM Compras WHERE id_usuario = @id_usuario AND id_curso = @id_curso", { id_usuario, id_curso: parseInt(id_curso, 10) });
        if (comprasQuery.recordset[0].count > 0) {
            return res.status(400).json({ 
                success: false, 
                message: 'Ya has comprado este curso anteriormente.' 
            });
        }
        
        // Verificación 3: ¿Ya está en el carrito activo?
        const carritoQuery = await db.executeQuery("SELECT COUNT(*) AS count FROM Carrito_Compras WHERE id_usuario = @id_usuario AND id_curso = @id_curso AND estatus = 'activo'", { id_usuario, id_curso: parseInt(id_curso, 10) });
        if (carritoQuery.recordset[0].count > 0) {
            return res.status(400).json({ 
                success: false, 
                message: 'Este curso ya se encuentra en tu carrito.' 
            });
        }
        // --- FIN DE VALIDACIÓN DE ACCESO ---

        console.log(`[CARRITO] ✅ Validaciones pasadas, agregando curso al carrito`);

        // Verificar si existe un registro eliminado que podamos reactivar
        const eliminadoQuery = await db.executeQuery(
            "SELECT id_carrito FROM Carrito_Compras WHERE id_usuario = @id_usuario AND id_curso = @id_curso AND estatus = 'eliminado'", 
            { id_usuario, id_curso: parseInt(id_curso, 10) }
        );

        if (eliminadoQuery.recordset.length > 0) {
            // Reactivar el registro existente
            const reactivarQuery = `
                UPDATE Carrito_Compras 
                SET estatus = 'activo', fecha_agregado = GETDATE()
                WHERE id_usuario = @id_usuario AND id_curso = @id_curso AND estatus = 'eliminado'
            `;
            await db.executeQuery(reactivarQuery, { 
                id_usuario: id_usuario, 
                id_curso: parseInt(id_curso, 10) 
            });
            console.log(`[CARRITO] ♻️ Curso ${id_curso} reactivado en el carrito del usuario ${id_usuario}`);
        } else {
            // Insertar nuevo registro
            const insertQuery = `
                INSERT INTO Carrito_Compras (id_usuario, id_curso, fecha_agregado, estatus)
                VALUES (@id_usuario, @id_curso, GETDATE(), 'activo')
            `;
            await db.executeQuery(insertQuery, { 
                id_usuario: id_usuario, 
                id_curso: parseInt(id_curso, 10) 
            });
            console.log(`[CARRITO] ✅ Curso ${id_curso} agregado exitosamente al carrito del usuario ${id_usuario}`);
        }

        res.json({ success: true, message: 'Curso añadido al carrito.' });

    } catch (error) {
        console.error('[CARRITO] ❌ Error al añadir al carrito:', error);
        
        // Manejar error de duplicado específicamente
        if (error.number === 2627) { // Error de UNIQUE KEY constraint
            return res.status(400).json({ 
                success: false, 
                message: 'Este curso ya se encuentra en tu carrito.' 
            });
        }
        
        res.status(500).json({ success: false, message: 'Error interno del servidor.' });
    }
});

/* DELETE eliminar item del carrito */
router.delete('/eliminar/:carritoId', requireAuth, async function(req, res, next) {
  try {
    const { carritoId } = req.params;
    const user = req.session.user;
    const db = req.app.locals.db;
    const userId = user.id_usuario || user.id;
    
    console.log('[CARRITO] 🗑️ Eliminando item:', carritoId, '- Usuario:', user.email, '- UserId:', userId);

    const deleteQuery = `
      UPDATE Carrito_Compras 
      SET estatus = 'eliminado'
      WHERE id_carrito = @carritoId AND id_usuario = @userId
    `;
    
    const result = await db.executeQuery(deleteQuery, { 
      carritoId: parseInt(carritoId),
      userId: userId
    });

    if (result.rowsAffected[0] > 0) {
      res.json({ 
        success: true, 
        message: 'Item eliminado del carrito' 
      });
    } else {
      res.status(404).json({ 
        success: false, 
        message: 'Item no encontrado' 
      });
    }

  } catch (error) {
    console.error('[CARRITO] ❌ Error eliminando item:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error interno del servidor' 
    });
  }
});

/* DELETE eliminar curso del carrito por ID de curso */
router.delete('/eliminar/curso/:cursoId', requireAuth, async function(req, res, next) {
  try {
    const { cursoId } = req.params;
    const user = req.session.user;
    const db = req.app.locals.db;
    const userId = user.id_usuario || user.id;
    
    console.log('[CARRITO] 🗑️ Eliminando curso:', cursoId, '- Usuario:', user.email, '- UserId:', userId);

    const deleteQuery = `
      UPDATE Carrito_Compras 
      SET estatus = 'eliminado'
      WHERE id_curso = @cursoId AND id_usuario = @userId AND estatus = 'activo'
    `;
    
    const result = await db.executeQuery(deleteQuery, { 
      cursoId: parseInt(cursoId),
      userId: userId
    });

    if (result.rowsAffected[0] > 0) {
      res.json({ 
        success: true, 
        message: 'Curso eliminado del carrito' 
      });
    } else {
      res.status(404).json({ 
        success: false, 
        message: 'Curso no encontrado en el carrito' 
      });
    }

  } catch (error) {
    console.error('[CARRITO] ❌ Error eliminando curso:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error interno del servidor' 
    });
  }
});

module.exports = router;