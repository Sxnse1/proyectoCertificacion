var express = require('express');
var router = express.Router();
const requireAuth = require('../../middleware/auth').requireAuth;

/* GET detalle de curso específico */
router.get('/:cursoId', requireAuth, async function(req, res, next) {
  try {
    const { cursoId } = req.params;
    const user = req.session.user;
    const db = req.app.locals.db;
    
    console.log('[CURSO-DETALLE] 📚 Acceso al curso:', cursoId, '- Usuario:', user.email);

    // Obtener información del curso
    // Use EXISTS subqueries for purchase/subscription checks to avoid JOIN duplication or mismatches
    const cursoQuery = `
      SELECT 
        c.*,
        cat.nombre as categoria_nombre,
        u.nombre + ' ' + u.apellido as instructor_nombre,
        u.email as instructor_email,
        -- Verificar si el usuario ya compró el curso (EXISTS para mayor robustez)
        CASE WHEN EXISTS(SELECT 1 FROM Compras comp2 WHERE comp2.id_usuario = @userId AND comp2.id_curso = c.id_curso) THEN 1 ELSE 0 END as ya_comprado,
        -- Verificar si tiene suscripción activa (EXISTS)
        CASE WHEN EXISTS(
            SELECT 1 FROM Suscripciones s2 
            WHERE s2.id_usuario = @userId AND s2.estatus = 'activa' AND s2.fecha_vencimiento >= GETDATE()
        ) THEN 1 ELSE 0 END as tiene_suscripcion_activa,
        -- Contar módulos del curso
        (SELECT COUNT(*) FROM Modulos m WHERE m.id_curso = c.id_curso) as total_modulos,
        -- Contar videos publicados del curso
        (SELECT COUNT(*) FROM Video v 
         INNER JOIN Modulos m ON v.id_modulo = m.id_modulo 
         WHERE m.id_curso = c.id_curso AND v.estatus = 'publicado') as total_videos,
        -- Calcular duración total en minutos
        (SELECT ISNULL(SUM(v.duracion_segundos), 0) / 60 FROM Video v 
         INNER JOIN Modulos m ON v.id_modulo = m.id_modulo 
         WHERE m.id_curso = c.id_curso AND v.estatus = 'publicado') as duracion_total_minutos
      FROM Cursos c
      INNER JOIN Categorias cat ON c.id_categoria = cat.id_categoria
      INNER JOIN Usuarios u ON c.id_usuario = u.id_usuario
      WHERE c.id_curso = @cursoId AND c.estatus = 'publicado'
    `;

    const cursoResult = await db.executeQuery(cursoQuery, { 
      cursoId: parseInt(cursoId),
      userId: user.id_usuario
    });

    if (!cursoResult.recordset || cursoResult.recordset.length === 0) {
      return res.status(404).render('shared/error', {
        title: 'Curso No Encontrado',
        message: 'El curso solicitado no existe o no está disponible',
        error: { message: 'Verifica que el enlace sea correcto o que el curso esté publicado.' },
        userName: user.nombre,
        userRole: user.rol
      });
    }

    const curso = cursoResult.recordset[0];
    const tieneAcceso = curso.ya_comprado || curso.tiene_suscripcion_activa;

    console.log('[CURSO-DETALLE] ✅ Curso encontrado:', curso.titulo);
    console.log('[CURSO-DETALLE] 👤 Usuario:', user.email, '- Acceso:', tieneAcceso ? 'SÍ' : 'NO');

    // Obtener módulos y videos del curso
    const modulosQuery = `
      SELECT 
        m.id_modulo,
        m.titulo as modulo_titulo,
        m.orden as modulo_orden,
        -- Contar videos del módulo (solo publicados para vista pública)
        (SELECT COUNT(*) FROM Video v WHERE v.id_modulo = m.id_modulo AND v.estatus = 'publicado') as total_videos,
        -- Calcular duración del módulo
        (SELECT ISNULL(SUM(v.duracion_segundos), 0) / 60 FROM Video v WHERE v.id_modulo = m.id_modulo AND v.estatus = 'publicado') as duracion_minutos
      FROM Modulos m
      WHERE m.id_curso = @cursoId
      ORDER BY m.orden
    `;

    const modulosResult = await db.executeQuery(modulosQuery, { cursoId: parseInt(cursoId) });
    const modulos = modulosResult.recordset || [];

    // Obtener videos para cada módulo
    for (let modulo of modulos) {
      const videosQuery = `
        SELECT 
          v.id_video,
          v.titulo,
          v.descripcion,
          v.duracion_segundos,
          v.orden,
          v.estatus,
          -- Verificar si es video de preview (primeros 2 videos de cada módulo son preview)
          CASE WHEN v.orden <= 2 THEN 1 ELSE 0 END as es_preview,
          -- Verificar progreso si tiene acceso
          CASE WHEN @tieneAcceso = 1 THEN COALESCE(p.completado, 0) ELSE 0 END as completado,
          CASE WHEN @tieneAcceso = 1 THEN COALESCE(p.minuto_actual, 0) ELSE 0 END as minuto_actual
        FROM Video v
        LEFT JOIN Progreso p ON v.id_video = p.id_video AND p.id_usuario = @userId AND @tieneAcceso = 1
        WHERE v.id_modulo = @moduloId AND v.estatus = 'publicado'
        ORDER BY v.orden
      `;
      
      const videosResult = await db.executeQuery(videosQuery, { 
        moduloId: modulo.id_modulo,
        userId: user.id_usuario,
        tieneAcceso: tieneAcceso ? 1 : 0
      });
      
      modulo.videos = videosResult.recordset || [];
    }

    // Calcular estadísticas de progreso si tiene acceso
    let progreso = {
      videos_completados: 0,
      total_videos: curso.total_videos,
      porcentaje_completado: 0
    };

    if (tieneAcceso) {
      // Obtener estadísticas de progreso
      const progresoQuery = `
        SELECT COUNT(*) as videos_completados
        FROM Progreso p 
        INNER JOIN Video v ON p.id_video = v.id_video
        INNER JOIN Modulos m ON v.id_modulo = m.id_modulo
        WHERE m.id_curso = @cursoId AND p.id_usuario = @userId AND p.completado = 1
      `;
      
      const progresoResult = await db.executeQuery(progresoQuery, {
        cursoId: parseInt(cursoId),
        userId: user.id_usuario
      });
      
      progreso.videos_completados = progresoResult.recordset[0].videos_completados;
      progreso.porcentaje_completado = curso.total_videos > 0 ? 
        Math.round((progreso.videos_completados / curso.total_videos) * 100) : 0;
      
      // Obtener el último video visto para navegación inteligente
      const ultimoVideoQuery = `
        SELECT TOP 1 
          v.id_video,
          v.titulo as video_titulo,
          p.segundos_actuales,
          p.completado
        FROM Progreso p
        INNER JOIN Video v ON p.id_video = v.id_video
        INNER JOIN Modulos m ON v.id_modulo = m.id_modulo
        WHERE m.id_curso = @cursoId AND p.id_usuario = @userId
        ORDER BY p.fecha_modificacion DESC
      `;
      
      const ultimoVideoResult = await db.executeQuery(ultimoVideoQuery, {
        cursoId: parseInt(cursoId),
        userId: user.id_usuario
      });
      
      if (ultimoVideoResult && ultimoVideoResult.recordset && ultimoVideoResult.recordset.length > 0) {
        const ultimoVideo = ultimoVideoResult.recordset[0];
        progreso.ultimo_video_id = ultimoVideo.id_video;
        progreso.ultimo_video_titulo = ultimoVideo.video_titulo;
        progreso.segundos_actuales = ultimoVideo.segundos_actuales;
        progreso.video_completado = ultimoVideo.completado;
      } else {
        // Si no hay progreso, obtener el primer video del curso
        const primerVideoQuery = `
          SELECT TOP 1 
            v.id_video,
            v.titulo as video_titulo
          FROM Video v
          INNER JOIN Modulos m ON v.id_modulo = m.id_modulo
          WHERE m.id_curso = @cursoId AND v.estatus = 'publicado'
          ORDER BY m.orden ASC, v.orden ASC
        `;
        
        const primerVideoResult = await db.executeQuery(primerVideoQuery, {
          cursoId: parseInt(cursoId)
        });
        
        if (primerVideoResult && primerVideoResult.recordset && primerVideoResult.recordset.length > 0) {
          const primerVideo = primerVideoResult.recordset[0];
          progreso.primer_video_id = primerVideo.id_video;
          progreso.primer_video_titulo = primerVideo.video_titulo;
        }
      }
    }

    console.log('[CURSO-DETALLE] 📊 Progreso:', progreso);

    const backUrl = req.get('referer') || '/user-dashboard';

    res.render('public/curso-detalle', {
      title: `${curso.titulo} - StartEducation`,
      curso: curso,
      modulos: modulos,
      tieneAcceso: tieneAcceso,
      progreso: progreso,
      userName: user.nombre,
      userEmail: user.email,
      userRole: user.rol
      , backUrl: backUrl
    });

  } catch (error) {
    console.error('[CURSO-DETALLE] ❌ Error:', error);
    res.status(500).render('shared/error', {
      title: 'Error del Servidor',
      message: 'Error al cargar el detalle del curso',
      error: error,
      userName: req.session.user?.nombre,
      userRole: req.session.user?.rol
    });
  }
});

module.exports = router;