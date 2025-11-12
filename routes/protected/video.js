var express = require('express');
var router = express.Router();

/* GET video player by ID (database ID or bunny ID) */
router.get('/:videoId', async function(req, res, next) {
  try {
    const { videoId } = req.params;
    const user = req.session.user;
    const db = req.app.locals.db;
    
    console.log('[VIDEO] 🎬 Acceso a video:', user.email, '- ID solicitado:', videoId);
    
    // Buscar video en la base de datos
    // Determinar si videoId es numérico (id_video) o es un UUID (bunny_video_id)
    const isNumeric = /^\d+$/.test(videoId);
    
    let query, params;
    
    if (isNumeric) {
      // Si es numérico, buscar por id_video y bunny_video_id
      query = `
        SELECT 
          v.id_video,
          v.titulo,
          v.descripcion,
          v.url,
          v.bunny_video_id,
          v.bunny_library_id,
          v.bunny_embed_url,
          v.bunny_thumbnail_url,
          v.video_provider,
          v.duracion_segundos,
          v.estatus,
          v.fecha_creacion,
          v.orden as video_orden,
          m.id_modulo,
          m.titulo as modulo_titulo,
          m.orden as modulo_orden,
          c.id_curso,
          c.titulo as curso_titulo,
          c.descripcion as curso_descripcion,
          c.miniatura as curso_miniatura
        FROM Video v
        LEFT JOIN Modulos m ON v.id_modulo = m.id_modulo
        LEFT JOIN Cursos c ON m.id_curso = c.id_curso
        WHERE v.id_video = @videoIdInt OR v.bunny_video_id = @videoIdStr
      `;
      params = { videoIdInt: parseInt(videoId), videoIdStr: videoId };
    } else {
      // Si no es numérico (UUID), buscar por bunny_video_id y URL
      query = `
        SELECT 
          v.id_video,
          v.titulo,
          v.descripcion,
          v.url,
          v.bunny_video_id,
          v.bunny_library_id,
          v.bunny_embed_url,
          v.bunny_thumbnail_url,
          v.video_provider,
          v.duracion_segundos,
          v.estatus,
          v.fecha_creacion,
          v.orden as video_orden,
          m.id_modulo,
          m.titulo as modulo_titulo,
          m.orden as modulo_orden,
          c.id_curso,
          c.titulo as curso_titulo,
          c.descripcion as curso_descripcion,
          c.miniatura as curso_miniatura
        FROM Video v
        LEFT JOIN Modulos m ON v.id_modulo = m.id_modulo
        LEFT JOIN Cursos c ON m.id_curso = c.id_curso
        WHERE v.bunny_video_id = @videoId OR v.url LIKE '%' + @videoId + '%'
      `;
      params = { videoId: videoId };
    }
    
    console.log('[VIDEO] 🔍 Buscando video - Tipo:', isNumeric ? 'Numérico' : 'UUID', '- ID:', videoId);
    const result = await db.executeQuery(query, params);
    
    if (!result.recordset || result.recordset.length === 0) {
      console.log('[VIDEO] ❌ Video no encontrado:', videoId);
      return res.render('shared/error', {
        title: 'Video No Encontrado',
        message: 'Lo sentimos',
        error: { message: 'Este video no existe.' },
        userName: user.nombre,
        userRole: user.rol
      });
    }
    
    const video = result.recordset[0];
    console.log('[VIDEO] ✅ Video encontrado:', video.titulo, '- Provider:', video.video_provider, '- Estado:', video.estatus);
    
    // VALIDACIONES DE PERMISOS SEGÚN ESTADO DEL VIDEO
    const userRole = user.rol;
    const videoEstatus = video.estatus;
    
    console.log('[VIDEO] 🔐 Validando permisos - Usuario:', user.email, 'Rol:', userRole, 'Video estado:', videoEstatus);
    
    // Reglas de acceso:
    // 1. Videos PÚBLICOS: Todos los usuarios autenticados pueden verlos
    // 2. Videos BORRADOR: Solo instructores y admins pueden verlos
    // 3. Videos ARCHIVADOS: Solo el instructor que lo creó puede verlo (por ahora solo instructores/admins)
    
    if (videoEstatus === 'borrador') {
      if (userRole !== 'instructor' && userRole !== 'admin' && userRole !== 'SuperAdmin' && userRole !== 'Admin') {
        console.log('[VIDEO] ❌ Acceso denegado - Video en borrador, usuario no es instructor/admin');
        return res.status(403).render('shared/error', {
          title: 'Acceso Denegado',
          message: 'Video no disponible',
          error: { message: 'Este video está en desarrollo y no está disponible para estudiantes.' },
          userName: user.nombre,
          userRole: user.rol
        });
      }
    }
    
    if (videoEstatus === 'archivado') {
      if (userRole !== 'instructor' && userRole !== 'admin' && userRole !== 'SuperAdmin' && userRole !== 'Admin') {
        console.log('[VIDEO] ❌ Acceso denegado - Video archivado, usuario no es instructor/admin');
        return res.status(403).render('shared/error', {
          title: 'Contenido Archivado',
          message: 'Video no disponible', 
          error: { message: 'Este video ha sido archivado y ya no está disponible.' },
          userName: user.nombre,
          userRole: user.rol
        });
      }
    }
    
    // Solo videos con estado 'publicado' son accesibles para todos los usuarios
    if (videoEstatus !== 'publicado' && videoEstatus !== 'borrador' && videoEstatus !== 'archivado') {
      console.log('[VIDEO] ❌ Video con estado desconocido:', videoEstatus);
      return res.status(404).render('shared/error', {
        title: 'Video No Disponible',
        message: 'Estado inválido',
        error: { message: 'Este video no está disponible en este momento.' },
        userName: user.nombre,
        userRole: user.rol
      });
    }
    
    console.log('[VIDEO] ✅ Permisos validados - Acceso concedido');
    
    // Obtener todos los módulos y videos del curso para la navegación
    let courseStructure = [];
    if (video.id_curso) {
      const courseQuery = `
        SELECT 
          m.id_modulo,
          m.titulo as modulo_titulo,
          m.orden as modulo_orden,
          v.id_video,
          v.titulo as video_titulo,
          v.orden as video_orden,
          v.duracion_segundos,
          v.estatus as video_estatus,
          v.bunny_video_id
        FROM Modulos m
        LEFT JOIN Video v ON m.id_modulo = v.id_modulo
        WHERE m.id_curso = @cursoId
        ORDER BY m.orden ASC, v.orden ASC
      `;
      
      const courseResult = await db.executeQuery(courseQuery, { cursoId: video.id_curso });
      
      // Organizar los datos por módulos
      const modulesMap = new Map();
      
      courseResult.recordset.forEach(row => {
        if (!modulesMap.has(row.id_modulo)) {
          modulesMap.set(row.id_modulo, {
            id_modulo: row.id_modulo,
            titulo: row.modulo_titulo,
            orden: row.modulo_orden,
            videos: []
          });
        }
        
        if (row.id_video) {
          // Solo mostrar videos publicados a estudiantes
          const canSeeVideo = userRole === 'instructor' || userRole === 'admin' || userRole === 'SuperAdmin' || userRole === 'Admin' || row.video_estatus === 'publicado';
          
          if (canSeeVideo) {
            modulesMap.get(row.id_modulo).videos.push({
              id_video: row.id_video,
              titulo: row.video_titulo,
              orden: row.video_orden,
              duracion_segundos: row.duracion_segundos,
              estatus: row.video_estatus,
              bunny_video_id: row.bunny_video_id,
              isCurrentVideo: row.id_video === video.id_video
            });
          }
        }
      });
      
      courseStructure = Array.from(modulesMap.values()).sort((a, b) => a.orden - b.orden);
    }
    
    // Determinar el videoId correcto para el reproductor
    let playerId;
    if (video.video_provider === 'bunny' && video.bunny_video_id) {
      playerId = video.bunny_video_id;
    } else if (video.url) {
      // Extraer ID de URL legacy de Vimeo o Bunny
      const urlMatch = video.url.match(/(?:vimeo\.com\/|embed\/\d+\/)([a-f0-9-]+)/);
      playerId = urlMatch ? urlMatch[1] : videoId;
    } else {
      playerId = videoId;
    }
    
    res.render('estudiante/video-player', {
      title: `Video: ${video.titulo}`,
      videoTitle: video.titulo,
      videoDescription: video.descripcion || 'Contenido educativo del curso',
      userName: user.nombre,
      userEmail: user.email,
      userRole: user.rol,
      videoId: playerId, // ID para el iframe del reproductor (Bunny/Vimeo)
      dbVideoId: video.id_video, // ID de la base de datos para progreso
      bunnyVideoId: video.bunny_video_id,
      bunnyEmbedUrl: video.bunny_embed_url,
      videoProvider: video.video_provider || 'bunny',
      videoDuration: video.duracion_segundos,
      videoStatus: video.estatus,
      videoOrder: video.video_orden,
      moduleTitle: video.modulo_titulo,
      courseTitle: video.curso_titulo,
      courseDescription: video.curso_descripcion,
      courseThumbnail: video.curso_miniatura,
      courseId: video.id_curso,
      moduleId: video.id_modulo,
      courseStructure: courseStructure,
      bunnyLibraryId: video.bunny_library_id || process.env.BUNNY_LIBRARY_ID
    });
    
  } catch (error) {
    console.error('[VIDEO] ❌ Error cargando video:', error);
    res.status(500).render('shared/error', {
      title: 'Error del Servidor',
      message: 'Error al cargar el video',
      error: error,
      userName: req.session.user?.nombre,
      userRole: req.session.user?.rol
    });
  }
});

/* GET video player page (legacy route with query params) */
router.get('/', function(req, res, next) {
  const { videoId, title, description, simple, duration, order, status, module, createdAt } = req.query;
  
  // Si hay videoId en query, redirigir a la nueva ruta
  if (videoId) {
    const queryParams = new URLSearchParams(req.query);
    queryParams.delete('videoId');
    const remainingParams = queryParams.toString();
    const redirectUrl = `/video/${videoId}${remainingParams ? '?' + remainingParams : ''}`;
    return res.redirect(redirectUrl);
  }
  
  // Si no hay videoId, mostrar error
  const user = req.session.user;
  res.render('shared/error', {
    title: 'Video No Especificado',
    message: 'Lo sentimos',
    error: { message: 'No se especificó qué video reproducir.' },
    userName: user?.nombre,
    userRole: user?.rol
  });
});

/* GET video simple (sin espacios extra) */
router.get('/simple', function(req, res, next) {
  const { videoId, title, description, user, email, rol } = req.query;
  
  // Si no hay parámetros de usuario, redirigir al login
  if (!user || !email) {
    return res.redirect('/auth/login');
  }
  
  res.render('estudiante/video-player', {
    title: title || 'Reproducción de Video',
    videoTitle: title || 'Video del Curso',
    videoDescription: description || 'Contenido educativo del curso de barbería',
    userName: user,
    userEmail: email,
    userRole: rol,
    videoId: videoId || '1122531979', // ID por defecto
    bunnyLibraryId: process.env.BUNNY_LIBRARY_ID || null
  });
});

/* GET video específico por ID */
router.get('/:videoId', function(req, res, next) {
  const { videoId } = req.params;
  const { title, description, duration, order, status, module, createdAt } = req.query;
  
  // La autenticación ya se verifica en el middleware
  const user = req.session.user;
  
  console.log('[VIDEO] 🎬 Acceso a video específico:', user.email, '- Video ID:', videoId);
  
  res.render('estudiante/video-player', {
    title: `Video: ${title || 'Contenido del Curso'}`,
    videoTitle: title || 'Video del Curso',
    videoDescription: description || 'Contenido educativo del curso de barbería',
    userName: user.nombre,
    userEmail: user.email,
    userRole: user.rol,
    videoId: videoId,
    videoDuration: duration || null,
    videoOrder: order || 1,
    videoStatus: status || 'publicado',
    moduleId: module || null,
    videoCreatedAt: createdAt || new Date().toISOString()
  });
});

module.exports = router;
