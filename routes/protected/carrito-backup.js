/**
 * Carrito - Funcionalidad del carrito de compras
 * Maneja eliminación, guardado, cupones y procesamiento de pagos
 */

var express = require('express');
var router = express.Router();
const { requireAuth } = require('../../middleware/auth');

/* GET carrito page */
router.get('/', async function(req, res, next) {
  try {
    const user = req.session.user;
    const db = req.app.locals.db;
    
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

    const carritoResult = await db.executeQuery(carritoQuery, { 
      userId: user.id_usuario 
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
    try {
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

        // Si pasa todas las validaciones, lo insertamos:
        const insertQuery = `
            INSERT INTO Carrito_Compras (id_usuario, id_curso, fecha_agregado, estatus)
            VALUES (@id_usuario, @id_curso, GETDATE(), 'activo')
        `;
        await db.executeQuery(insertQuery, { 
            id_usuario: id_usuario, 
            id_curso: parseInt(id_curso, 10) 
        });

        console.log(`[CARRITO] ✅ Curso ${id_curso} agregado exitosamente al carrito del usuario ${id_usuario}`);
        res.json({ success: true, message: 'Curso añadido al carrito.' });

    } catch (error) {
        console.error('[CARRITO] ❌ Error al añadir al carrito:', error);
        res.status(500).json({ success: false, message: 'Error interno del servidor.' });
    }
});

/* DELETE eliminar item del carrito */
router.delete('/eliminar/:carritoId', async function(req, res, next) {
  try {
    const { carritoId } = req.params;
    const user = req.session.user;
    const db = req.app.locals.db;
    
    console.log('[CARRITO] 🗑️ Eliminando item:', carritoId, '- Usuario:', user.email);

    const deleteQuery = `
      UPDATE Carrito_Compras 
      SET estatus = 'eliminado'
      WHERE id_carrito = @carritoId AND id_usuario = @userId
    `;
    
    const result = await db.executeQuery(deleteQuery, { 
      carritoId: parseInt(carritoId),
      userId: user.id_usuario
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

module.exports = router;

    if (compraResult.recordset && compraResult.recordset.length > 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'Ya tienes acceso a este curso' 
      });
    }

    // Verificar si el curso ya está en el carrito
    const carritoExistQuery = `
      SELECT id_carrito, estatus 
      FROM Carrito_Compras 
      WHERE id_usuario = @userId AND id_curso = @cursoId
    `;
    
    const carritoExistResult = await db.executeQuery(carritoExistQuery, { 
      userId: user.id_usuario,
      cursoId: parseInt(cursoId)
    });

    if (carritoExistResult.recordset && carritoExistResult.recordset.length > 0) {
      const itemExistente = carritoExistResult.recordset[0];
      
      if (itemExistente.estatus === 'eliminado') {
        // Reactivar item eliminado
        const updateQuery = `
          UPDATE Carrito_Compras 
          SET estatus = 'activo', fecha_agregado = GETDATE()
          WHERE id_usuario = @userId AND id_curso = @cursoId
        `;
        
        await db.executeQuery(updateQuery, { 
          userId: user.id_usuario,
          cursoId: parseInt(cursoId)
        });
        
        console.log('[CARRITO] ✅ Item reactivado en carrito');
      } else {
        // Ya está activo en el carrito, solo actualizar fecha
        const updateQuery = `
          UPDATE Carrito_Compras 
          SET fecha_agregado = GETDATE()
          WHERE id_usuario = @userId AND id_curso = @cursoId
        `;
        
        await db.executeQuery(updateQuery, { 
          userId: user.id_usuario,
          cursoId: parseInt(cursoId)
        });
        
        console.log('[CARRITO] ✅ Fecha actualizada en carrito');
      }
    } else {
      // Agregar nuevo item al carrito
      const insertQuery = `
        INSERT INTO Carrito_Compras (id_usuario, id_curso, fecha_agregado, estatus)
        VALUES (@userId, @cursoId, GETDATE(), 'activo')
      `;
      
      await db.executeQuery(insertQuery, { 
        userId: user.id_usuario,
        cursoId: parseInt(cursoId)
      });
      
      console.log('[CARRITO] ✅ Curso agregado al carrito');
    }

    res.json({ 
      success: true, 
      message: 'Curso agregado al carrito exitosamente' 
    });

  } catch (error) {
    console.error('[CARRITO] ❌ Error agregando al carrito:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error interno del servidor' 
    });
  }
});

/* DELETE eliminar item del carrito */
router.delete('/eliminar/:carritoId', async function(req, res, next) {
  try {
    const { carritoId } = req.params;
    const user = req.session.user;
    const db = req.app.locals.db;
    
    console.log('[CARRITO] 🗑️ Eliminando item:', carritoId, '- Usuario:', user.email);

    const deleteQuery = `
      UPDATE Carrito_Compras 
      SET estatus = 'eliminado'
      WHERE id_carrito = @carritoId AND id_usuario = @userId
    `;
    
    const result = await db.executeQuery(deleteQuery, { 
      carritoId: parseInt(carritoId),
      userId: user.id_usuario
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

module.exports = router;
    }

    // Verificación 2: ¿Curso ya comprado?
    const comprasQuery = await db.executeQuery("SELECT COUNT(*) AS count FROM Compras WHERE id_usuario = @id_usuario AND id_curso = @id_curso", { id_usuario, id_curso: parseInt(cursoId, 10) });
    if (comprasQuery.recordset[0].count > 0) {
        req.session.message = { 
            type: 'info', 
            text: 'Ya has comprado este curso anteriormente.' 
        };
        return res.redirect(`/curso/${cursoId}`);
    }
        
    // Verificación 3: ¿Ya está en el carrito activo?
    const carritoQuery = await db.executeQuery("SELECT COUNT(*) AS count FROM Carrito_Compras WHERE id_usuario = @id_usuario AND id_curso = @id_curso AND estatus = 'activo'", { id_usuario, id_curso: parseInt(cursoId, 10) });
    if (carritoQuery.recordset[0].count > 0) {
        req.session.message = { 
            type: 'info', 
            text: 'Este curso ya se encuentra en tu carrito.' 
        };
        return res.redirect('/carrito');
    }
    
    // --- FIN DE VALIDACIÓN DE ACCESO ---

    // Verificar que el curso existe y está publicado
    const cursoQuery = `
      SELECT id_curso, titulo, precio, estatus 
      FROM Cursos 
      WHERE id_curso = @cursoId AND estatus = 'publicado'
    `;
    
    const cursoResult = await db.executeQuery(cursoQuery, { 
      cursoId: parseInt(cursoId) 
    });

    if (!cursoResult.recordset || cursoResult.recordset.length === 0) {
      req.session.message = { 
        type: 'error', 
        text: 'Curso no encontrado o no disponible' 
      };
      return res.redirect('/cursos');
    }

    // Si llega aquí, todas las validaciones pasaron - agregar al carrito directamente
    const insertQuery = `
      INSERT INTO Carrito_Compras (id_usuario, id_curso, fecha_agregado, estatus)
      VALUES (@userId, @cursoId, GETDATE(), 'activo')
    `;
    
    await db.executeQuery(insertQuery, { 
      userId: id_usuario,
      cursoId: parseInt(cursoId)
    });
    
    req.session.message = { 
      type: 'success', 
      text: 'Curso agregado al carrito exitosamente' 
    };

    res.redirect('/carrito');

  } catch (error) {
    console.error('[CARRITO] ❌ Error:', error);
    req.session.message = { 
      type: 'error', 
      text: 'Error al agregar el curso al carrito' 
    };
    res.redirect('/cursos');
  }
});

/* DELETE eliminar item del carrito */
router.delete('/eliminar/:carritoId', async function(req, res, next) {
  try {
    const { carritoId } = req.params;
    const user = req.session.user;
    const db = req.app.locals.db;
    
    console.log('[CARRITO] 🗑️ Eliminando item:', carritoId, '- Usuario:', user.email);

    const deleteQuery = `
      UPDATE Carrito_Compras 
      SET estatus = 'eliminado'
      WHERE id_carrito = @carritoId AND id_usuario = @userId
    `;
    
    const result = await db.executeQuery(deleteQuery, { 
      carritoId: parseInt(carritoId),
      userId: user.id_usuario
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

module.exports = router;