var express = require('express');
var router = express.Router();

/* GET cursos para estudiantes */
router.get('/', async function(req, res, next) {
  try {
    const { user, email, rol, id } = req.query;
    
    // Verificar que el usuario esté autenticado
    if (!user || !email || !id) {
      return res.redirect('/auth/login?error=acceso_no_autorizado');
    }
    
    console.log('[CURSOS] 📚 Cargando cursos para usuario:', email, '- Rol:', rol);
    
    const db = req.app.locals.db;
    
    if (!db) {
      console.log('[CURSOS] ⚠️ No hay conexión a base de datos');
      return res.render('cursos-estudiante-local', {
        title: 'Mis Cursos',
        userName: user,
        userEmail: email,
        userRole: rol,
        userId: id,
        cursos: [],
        error: 'Sistema en mantenimiento'
      });
    }
    
    // Obtener cursos disponibles con su información completa
    const cursosQuery = `
      SELECT 
        c.id_curso,
        c.titulo,
        c.descripcion,
        c.precio,
        c.nivel,
        c.miniatura,
        c.estatus as curso_estatus,
        cat.nombre as categoria_nombre,
        u.nombre + ' ' + u.apellido as instructor_nombre,
        -- Verificar si el usuario ya compró el curso
        CASE WHEN comp.id_compra IS NOT NULL THEN 1 ELSE 0 END as ya_comprado,
        -- Contar módulos del curso
        (SELECT COUNT(*) FROM Modulos m WHERE m.id_curso = c.id_curso) as total_modulos,
        -- Contar videos del curso
        (SELECT COUNT(*) FROM Video v 
         INNER JOIN Modulos m ON v.id_modulo = m.id_modulo 
         WHERE m.id_curso = c.id_curso AND v.estatus = 'publicado') as total_videos,
        -- Calcular progreso del usuario en el curso
        COALESCE(
          (SELECT COUNT(*) FROM Progreso p 
           INNER JOIN Video v ON p.id_video = v.id_video
           INNER JOIN Modulos m ON v.id_modulo = m.id_modulo
           WHERE m.id_curso = c.id_curso AND p.id_usuario = @userId AND p.completado = 1), 0
        ) as videos_completados
      FROM Cursos c
      INNER JOIN Categorias cat ON c.id_categoria = cat.id_categoria
      INNER JOIN Usuarios u ON c.id_usuario = u.id_usuario
      LEFT JOIN Compras comp ON c.id_curso = comp.id_curso AND comp.id_usuario = @userId
      WHERE c.estatus = 'publicado'
      ORDER BY 
        CASE WHEN comp.id_compra IS NOT NULL THEN 0 ELSE 1 END, -- Cursos comprados primero
        c.fecha_creacion DESC
    `;
    
    const cursosResult = await db.executeQuery(cursosQuery, { userId: parseInt(id) });
    const cursos = cursosResult.recordset || [];
    
    // Obtener cursos favoritos del usuario
    const favoritosQuery = `
      SELECT f.id_curso 
      FROM Favoritos f 
      WHERE f.id_usuario = @userId AND f.estatus = 'activo'
    `;
    
    const favoritosResult = await db.executeQuery(favoritosQuery, { userId: parseInt(id) });
    const cursosFavoritos = favoritosResult.recordset.map(f => f.id_curso);
    
    // Obtener progreso general del usuario
    const progresoQuery = `
      SELECT 
        COUNT(DISTINCT p.id_video) as videos_completados_total,
        COUNT(DISTINCT v.id_video) as videos_disponibles_total
      FROM Usuarios u
      LEFT JOIN Compras comp ON u.id_usuario = comp.id_usuario
      LEFT JOIN Cursos c ON comp.id_curso = c.id_curso
      LEFT JOIN Modulos m ON c.id_curso = m.id_curso
      LEFT JOIN Video v ON m.id_modulo = v.id_modulo AND v.estatus = 'publicado'
      LEFT JOIN Progreso p ON v.id_video = p.id_video AND p.id_usuario = u.id_usuario AND p.completado = 1
      WHERE u.id_usuario = @userId
    `;
    
    const progresoResult = await db.executeQuery(progresoQuery, { userId: parseInt(id) });
    const progreso = progresoResult.recordset[0] || { videos_completados_total: 0, videos_disponibles_total: 0 };
    
    // Procesar datos para la vista
    const cursosProcessed = cursos.map(curso => ({
      ...curso,
      es_favorito: cursosFavoritos.includes(curso.id_curso),
      progreso_porcentaje: curso.total_videos > 0 ? Math.round((curso.videos_completados / curso.total_videos) * 100) : 0,
      precio_formateado: `$${curso.precio.toLocaleString('es-MX')} MXN`,
      nivel_emoji: curso.nivel === 'básico' ? '🌱' : curso.nivel === 'intermedio' ? '📈' : '🏆'
    }));
    
    // Separar cursos comprados y disponibles
    const cursosComprados = cursosProcessed.filter(c => c.ya_comprado);
    const cursosDisponibles = cursosProcessed.filter(c => !c.ya_comprado);
    
    console.log(`[CURSOS] ✅ Cargados ${cursos.length} cursos (${cursosComprados.length} comprados, ${cursosDisponibles.length} disponibles)`);
    
    res.render('estudiante/cursos-estudiante-db', {
      title: 'Mis Cursos - StartEducation',
      userName: user,
      userEmail: email,
      userRole: rol,
      userId: id,
      cursosComprados: cursosComprados,
      cursosDisponibles: cursosDisponibles,
      totalCursos: cursos.length,
      totalComprados: cursosComprados.length,
      progreso: progreso,
      stats: {
        cursos_activos: cursosComprados.length,
        videos_completados: progreso.videos_completados_total || 0,
        progreso_general: progreso.videos_disponibles_total > 0 ? 
          Math.round((progreso.videos_completados_total / progreso.videos_disponibles_total) * 100) : 0
      }
    });
    
  } catch (error) {
    console.error('[CURSOS] ❌ Error cargando cursos:', error.message);
    console.error('[CURSOS] Stack:', error.stack);
    
    res.render('cursos-estudiante-local', {
      title: 'Mis Cursos',
      userName: req.query.user || 'Usuario',
      userEmail: req.query.email || '',
      userRole: req.query.rol || 'user',
      userId: req.query.id || '',
      cursos: [],
      error: 'Error cargando cursos. Intenta nuevamente.'
    });
  }
});

/* GET detalle de curso específico */
router.get('/:cursoId', async function(req, res, next) {
  try {
    const { cursoId } = req.params;
    const { user, email, rol, id } = req.query;
    
    if (!user || !email || !id) {
      return res.redirect('/auth/login');
    }
    
    const db = req.app.locals.db;
    
    if (!db) {
      return res.redirect(`/cursos?user=${user}&email=${email}&rol=${rol}&id=${id}&error=sistema_mantenimiento`);
    }
    
    // Obtener información detallada del curso
    const cursoQuery = `
      SELECT 
        c.*,
        cat.nombre as categoria_nombre,
        u.nombre + ' ' + u.apellido as instructor_nombre,
        u.email as instructor_email,
        CASE WHEN comp.id_compra IS NOT NULL THEN 1 ELSE 0 END as ya_comprado
      FROM Cursos c
      INNER JOIN Categorias cat ON c.id_categoria = cat.id_categoria
      INNER JOIN Usuarios u ON c.id_usuario = u.id_usuario
      LEFT JOIN Compras comp ON c.id_curso = comp.id_curso AND comp.id_usuario = @userId
      WHERE c.id_curso = @cursoId AND c.estatus = 'publicado'
    `;
    
    const cursoResult = await db.executeQuery(cursoQuery, { 
      cursoId: parseInt(cursoId), 
      userId: parseInt(id) 
    });
    
    if (cursoResult.recordset.length === 0) {
      return res.redirect(`/cursos?user=${user}&email=${email}&rol=${rol}&id=${id}&error=curso_no_encontrado`);
    }
    
    const curso = cursoResult.recordset[0];
    
    // Obtener módulos y videos del curso según permisos
    let videoCountFilter;
    if (rol === 'instructor' || rol === 'admin' || rol === 'SuperAdmin' || rol === 'Admin') {
      // Instructores y admins ven: publicados y borradores
      videoCountFilter = "AND v.estatus IN ('publicado', 'borrador')";
    } else {
      // Estudiantes solo ven videos publicados
      videoCountFilter = "AND v.estatus = 'publicado'";
    }
    
    const modulosQuery = `
      SELECT 
        m.*,
        (SELECT COUNT(*) FROM Video v WHERE v.id_modulo = m.id_modulo ${videoCountFilter}) as total_videos
      FROM Modulos m
      WHERE m.id_curso = @cursoId
      ORDER BY m.orden
    `;
    
    const modulosResult = await db.executeQuery(modulosQuery, { cursoId: parseInt(cursoId) });
    const modulos = modulosResult.recordset || [];
    
    // Obtener videos para cada módulo según permisos
    for (let modulo of modulos) {
      // Determinar filtro de estado según el rol del usuario
      let estatusFilter;
      if (rol === 'instructor' || rol === 'admin' || rol === 'SuperAdmin' || rol === 'Admin') {
        // Instructores y admins ven: publicados y borradores (no archivados)
        estatusFilter = "AND v.estatus IN ('publicado', 'borrador')";
      } else {
        // Estudiantes solo ven videos publicados
        estatusFilter = "AND v.estatus = 'publicado'";
      }
      
      const videosQuery = `
        SELECT 
          v.*,
          COALESCE(p.completado, 0) as completado,
          COALESCE(p.minuto_actual, 0) as minuto_actual
        FROM Video v
        LEFT JOIN Progreso p ON v.id_video = p.id_video AND p.id_usuario = @userId
        WHERE v.id_modulo = @moduloId ${estatusFilter}
        ORDER BY v.orden
      `;
      
      const videosResult = await db.executeQuery(videosQuery, { 
        moduloId: modulo.id_modulo,
        userId: parseInt(id)
      });
      
      modulo.videos = videosResult.recordset || [];
    }
    
    res.render('estudiante/curso-detalle-db', {
      title: `${curso.titulo} - StartEducation`,
      userName: user,
      userEmail: email,
      userRole: rol,
      userId: id,
      curso: curso,
      modulos: modulos
    });
    
  } catch (error) {
    console.error('[CURSOS] ❌ Error cargando detalle del curso:', error.message);
    res.redirect(`/cursos?user=${req.query.user}&email=${req.query.email}&rol=${req.query.rol}&id=${req.query.id}&error=error_servidor`);
  }
});

module.exports = router;
