/**
 * Favoritos Routes - StartEducation Platform
 * Maneja las rutas relacionadas con los cursos favoritos de los estudiantes
 */

const express = require('express');
const router = express.Router();

/**
 * GET /favoritos - Página principal de favoritos
 */
router.get('/', async function(req, res, next) {
  try {
    const user = req.session.user;
    
    if (!user) {
      console.log('[FAVORITOS] 🚫 Usuario no autenticado');
      return res.redirect('/auth/login');
    }

    console.log('[FAVORITOS] 💖 Usuario accediendo a favoritos:', user.email);
    
    // Solo permitir acceso a usuarios (estudiantes)
    if (user.rol !== 'user' && user.rol !== 'estudiante') {
      console.log('[FAVORITOS] 🚫 Rol no autorizado:', user.rol);
      return res.redirect('/user-dashboard');
    }

    const db = req.app.locals.db;
    
    if (!db) {
      console.log('[FAVORITOS] ⚠️ No hay conexión a base de datos');
      return res.render('error', {
        title: 'Error del Sistema',
        message: 'Sistema en mantenimiento. Intenta más tarde.',
        error: { status: 503, stack: '' }
      });
    }

    // Obtener estadísticas de favoritos
    let totalFavoritos = 0;
    let favoritosActivos = 0;
    let favoritosComprados = 0;
    let favoritosEliminados = 0;
    let favoritos = [];

    try {
      // Obtener estadísticas de favoritos del usuario
      const statsResult = await db.executeQuery(`
        SELECT 
          COUNT(*) as total_favoritos,
          SUM(CASE WHEN estatus = 'activo' THEN 1 ELSE 0 END) as favoritos_activos,
          SUM(CASE WHEN estatus = 'comprado' THEN 1 ELSE 0 END) as favoritos_comprados,
          SUM(CASE WHEN estatus = 'eliminado' THEN 1 ELSE 0 END) as favoritos_eliminados
        FROM Favoritos
        WHERE id_usuario = @userId
      `, { userId: user.id });

      if (statsResult && statsResult.recordset && statsResult.recordset.length > 0) {
        const stats = statsResult.recordset[0];
        totalFavoritos = stats.total_favoritos || 0;
        favoritosActivos = stats.favoritos_activos || 0;
        favoritosComprados = stats.favoritos_comprados || 0;
        favoritosEliminados = stats.favoritos_eliminados || 0;
      }

      // Obtener cursos favoritos con información completa
      const favoritosResult = await db.executeQuery(`
        SELECT 
          f.id_favorito,
          f.fecha_agregado,
          f.estatus as estatus_favorito,
          c.id_curso,
          c.titulo,
          c.descripcion,
          c.precio,
          c.nivel,
          c.miniatura,
          c.fecha_creacion,
          c.estatus as estatus_curso,
          u.nombre + ' ' + u.apellido as instructor_nombre,
          cat.nombre as categoria_nombre,
          ISNULL((SELECT AVG(CAST(calificacion AS FLOAT)) FROM Valoraciones v WHERE v.id_curso = c.id_curso), 0) as calificacion_promedio,
          ISNULL((SELECT COUNT(*) FROM Valoraciones v WHERE v.id_curso = c.id_curso), 0) as total_valoraciones,
          -- Verificar si el usuario ya compró el curso
          CASE WHEN EXISTS (SELECT 1 FROM Compras comp WHERE comp.id_usuario = @userId AND comp.id_curso = c.id_curso) 
               THEN 1 ELSE 0 END as ya_comprado
        FROM Favoritos f
        INNER JOIN Cursos c ON f.id_curso = c.id_curso
        INNER JOIN Usuarios u ON c.id_usuario = u.id_usuario
        INNER JOIN Categorias cat ON c.id_categoria = cat.id_categoria
        WHERE f.id_usuario = @userId 
        AND f.estatus IN ('activo', 'guardado', 'comprado')
        AND c.estatus = 'publicado'
        ORDER BY f.fecha_agregado DESC
      `, { userId: user.id });

      if (favoritosResult && favoritosResult.recordset) {
        favoritos = favoritosResult.recordset.map(favorito => ({
          ...favorito,
          precio_formato: favorito.precio ? `$${favorito.precio.toLocaleString('es-MX')} MXN` : 'Gratis',
          calificacion_promedio: Math.round(favorito.calificacion_promedio * 10) / 10,
          fecha_agregado_formato: new Date(favorito.fecha_agregado).toLocaleDateString('es-MX'),
          fecha_creacion_formato: new Date(favorito.fecha_creacion).toLocaleDateString('es-MX')
        }));
      }

    } catch (dbError) {
      console.error('[FAVORITOS] ❌ Error consultando datos:', dbError.message);
      // Continuar con datos por defecto
    }

    console.log('[FAVORITOS] 📊 Estadísticas del usuario:', {
      totalFavoritos,
      favoritosActivos,
      favoritosComprados,
      favoritosEliminados
    });

    res.render('estudiante/favoritos', {
      title: 'Mis Cursos Favoritos - StartEducation',
      user: user,
      favoritos: favoritos,
      stats: {
        totalFavoritos,
        favoritosActivos,
        favoritosComprados,
        favoritosEliminados
      },
      layout: false
    });

  } catch (error) {
    console.error('[FAVORITOS] ❌ Error general:', error);
    res.render('error', {
      title: 'Error',
      message: 'Error al cargar tus cursos favoritos',
      error: error
    });
  }
});

/**
 * POST /favoritos/agregar - Agregar curso a favoritos
 */
/**
 * POST /favoritos/agregar - Agregar curso a favoritos
 * POST /favoritos/add - Alias para compatibilidad
 */
router.post('/agregar', async function(req, res, next) {
  try {
    const user = req.session.user;
    const { cursoId, id_curso } = req.body;
    const finalCursoId = cursoId || id_curso;

    if (!user || !finalCursoId) {
      return res.status(400).json({ 
        success: false, 
        message: 'Datos incompletos' 
      });
    }

    const db = req.app.locals.db;
    
    if (!db) {
      return res.status(500).json({ 
        success: false, 
        message: 'Error de conexión a base de datos' 
      });
    }

    const userId = user.id_usuario || user.id;
    console.log('[FAVORITOS] ➕ Agregando curso a favoritos:', { userId, cursoId: finalCursoId });

    // Verificar si el curso ya está en favoritos
    const existeResult = await db.executeQuery(`
      SELECT id_favorito, estatus 
      FROM Favoritos 
      WHERE id_usuario = @userId AND id_curso = @cursoId
    `, { userId, cursoId: parseInt(finalCursoId) });

    if (existeResult && existeResult.recordset && existeResult.recordset.length > 0) {
      const favoritoExistente = existeResult.recordset[0];
      
      if (favoritoExistente.estatus === 'eliminado') {
        // Reactivar el favorito eliminado
        await db.executeQuery(`
          UPDATE Favoritos 
          SET estatus = 'activo', fecha_agregado = GETDATE()
          WHERE id_favorito = @favoritoId
        `, { favoritoId: favoritoExistente.id_favorito });
        
        console.log('[FAVORITOS] 🔄 Favorito reactivado');
        return res.json({ 
          success: true, 
          message: 'Curso agregado a favoritos exitosamente',
          action: 'reactivated'
        });
      } else {
        return res.json({ 
          success: false, 
          message: 'El curso ya está en tus favoritos' 
        });
      }
    }

    // Agregar nuevo favorito
    await db.executeQuery(`
      INSERT INTO Favoritos (id_usuario, id_curso, fecha_agregado, estatus)
      VALUES (@userId, @cursoId, GETDATE(), 'activo')
    `, { userId, cursoId: parseInt(finalCursoId) });

    console.log('[FAVORITOS] ✅ Curso agregado a favoritos exitosamente');
    res.json({ 
      success: true, 
      message: 'Curso agregado a favoritos exitosamente',
      action: 'added'
    });

  } catch (error) {
    console.error('[FAVORITOS] ❌ Error agregando a favoritos:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error interno del servidor' 
    });
  }
});

// Alias para compatibilidad con el frontend
router.post('/add', async function(req, res, next) {
  // Reutilizar la misma lógica
  return router.handle(Object.assign(req, { 
    url: '/agregar',
    originalUrl: req.originalUrl.replace('/add', '/agregar')
  }), res, next);
});

/**
 * POST /favoritos/eliminar - Eliminar curso de favoritos
 */
router.post('/eliminar', async function(req, res, next) {
  try {
    const user = req.session.user;
    const { cursoId } = req.body;

    if (!user || !cursoId) {
      return res.status(400).json({ 
        success: false, 
        message: 'Datos incompletos' 
      });
    }

    const db = req.app.locals.db;
    
    if (!db) {
      return res.status(500).json({ 
        success: false, 
        message: 'Error de conexión a base de datos' 
      });
    }

    console.log('[FAVORITOS] ➖ Eliminando curso de favoritos:', { userId: user.id, cursoId });

    // Actualizar el estatus a eliminado (soft delete)
    const result = await db.executeQuery(`
      UPDATE Favoritos 
      SET estatus = 'eliminado'
      WHERE id_usuario = @userId AND id_curso = @cursoId
    `, { userId: user.id, cursoId: parseInt(cursoId) });

    if (result && result.rowsAffected && result.rowsAffected[0] > 0) {
      console.log('[FAVORITOS] ✅ Curso eliminado de favoritos exitosamente');
      res.json({ 
        success: true, 
        message: 'Curso eliminado de favoritos exitosamente' 
      });
    } else {
      res.json({ 
        success: false, 
        message: 'No se encontró el curso en tus favoritos' 
      });
    }

  } catch (error) {
    console.error('[FAVORITOS] ❌ Error eliminando de favoritos:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error interno del servidor' 
    });
  }
});

/**
 * GET /favoritos/verificar/:cursoId - Verificar si un curso está en favoritos
 */
router.get('/verificar/:cursoId', async function(req, res, next) {
  try {
    const user = req.session.user;
    const { cursoId } = req.params;

    if (!user) {
      return res.json({ enFavoritos: false });
    }

    const db = req.app.locals.db;
    
    if (!db) {
      return res.status(500).json({ 
        success: false, 
        message: 'Error de conexión a base de datos' 
      });
    }

    const result = await db.executeQuery(`
      SELECT id_favorito 
      FROM Favoritos 
      WHERE id_usuario = @userId AND id_curso = @cursoId AND estatus = 'activo'
    `, { userId: user.id, cursoId: parseInt(cursoId) });

    const enFavoritos = result && result.recordset && result.recordset.length > 0;

    res.json({ enFavoritos: enFavoritos });

  } catch (error) {
    console.error('[FAVORITOS] ❌ Error verificando favorito:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error interno del servidor' 
    });
  }
});

module.exports = router;
