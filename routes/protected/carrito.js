var express = require('express');
var router = express.Router();

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

    res.render('estudiante/carrito', {
      title: 'Mi Carrito - StartEducation',
      items: items,
      subtotal: subtotal,
      total: total,
      itemCount: items.length,
      userName: user.nombre,
      userEmail: user.email,
      userRole: user.rol,
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

/* POST agregar curso al carrito */
router.post('/agregar/:cursoId', async function(req, res, next) {
  try {
    const { cursoId } = req.params;
    const user = req.session.user;
    const db = req.app.locals.db;
    
    console.log('[CARRITO] ➕ Agregando curso al carrito:', cursoId, '- Usuario:', user.email);

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
      return res.status(404).json({ 
        success: false, 
        message: 'Curso no encontrado o no disponible' 
      });
    }

    // Verificar que el usuario no ya compró el curso
    const compraQuery = `
      SELECT id_compra 
      FROM Compras 
      WHERE id_usuario = @userId AND id_curso = @cursoId
    `;
    
    const compraResult = await db.executeQuery(compraQuery, { 
      userId: user.id_usuario,
      cursoId: parseInt(cursoId)
    });

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

/* GET ruta para agregar via URL */
router.get('/agregar/:cursoId', async function(req, res, next) {
  try {
    const { cursoId } = req.params;
    const user = req.session.user;
    const db = req.app.locals.db;
    
    console.log('[CARRITO] ➕ Agregando curso via GET:', cursoId, '- Usuario:', user.email);

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

    // Verificar que el usuario no ya compró el curso
    const compraQuery = `
      SELECT id_compra 
      FROM Compras 
      WHERE id_usuario = @userId AND id_curso = @cursoId
    `;
    
    const compraResult = await db.executeQuery(compraQuery, { 
      userId: user.id_usuario,
      cursoId: parseInt(cursoId)
    });

    if (compraResult.recordset && compraResult.recordset.length > 0) {
      req.session.message = { 
        type: 'info', 
        text: 'Ya tienes acceso a este curso' 
      };
      return res.redirect(`/curso/${cursoId}`);
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
        await db.executeQuery(`
          UPDATE Carrito_Compras 
          SET estatus = 'activo', fecha_agregado = GETDATE()
          WHERE id_usuario = @userId AND id_curso = @cursoId
        `, { 
          userId: user.id_usuario,
          cursoId: parseInt(cursoId)
        });
        
        req.session.message = { 
          type: 'success', 
          text: 'Curso agregado al carrito exitosamente' 
        };
      } else {
        req.session.message = { 
          type: 'info', 
          text: 'Este curso ya está en tu carrito' 
        };
      }
    } else {
      // Agregar al carrito
      const insertQuery = `
        INSERT INTO Carrito_Compras (id_usuario, id_curso, fecha_agregado, estatus)
        VALUES (@userId, @cursoId, GETDATE(), 'activo')
      `;
      
      await db.executeQuery(insertQuery, { 
        userId: user.id_usuario,
        cursoId: parseInt(cursoId)
      });
      
      req.session.message = { 
        type: 'success', 
        text: 'Curso agregado al carrito exitosamente' 
      };
    }

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