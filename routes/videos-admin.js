const express = require('express');
const router = express.Router();
const vimeoService = require('../services/vimeoService');
const { uploadConfig, handleUploadError, cleanupTempFile, validateVideoData } = require('../middleware/uploadMiddleware');
const requireAuth = require('../middleware/auth').requireAuth;
const requireRole = require('../middleware/auth').requireRole;

// Middleware de autenticación para todas las rutas
router.use(requireAuth);
router.use(requireRole(['instructor', 'admin']));

/* GET - Lista de videos para administración */
router.get('/', async function(req, res, next) {
  try {
    const db = req.app.locals.db;
    
    // Obtener videos con información de módulos y cursos
    // Primero probamos con una consulta básica
    const result = await db.executeQuery(`
      SELECT 
        v.id_video,
        v.titulo,
        ISNULL(v.descripcion, '') as descripcion,
        ISNULL(v.url, '') as url_vimeo,
        CASE 
          WHEN v.duracion_segundos IS NOT NULL THEN v.duracion_segundos / 60
          ELSE 0 
        END as duracion_minutos,
        v.estatus,
        v.fecha_creacion,
        v.id_modulo,
        ISNULL(m.titulo, 'Sin módulo') as modulo_titulo,
        ISNULL(c.titulo, 'Sin curso') as curso_titulo,
        FORMAT(v.fecha_creacion, 'dd/MM/yyyy HH:mm') as fecha_formateada
      FROM Video v
      LEFT JOIN Modulos m ON v.id_modulo = m.id_modulo
      LEFT JOIN Cursos c ON m.id_curso = c.id_curso
      ORDER BY v.fecha_creacion DESC
    `);
    
    const videos = result.recordset;
    console.log('[VIDEOS-ADMIN] 📹 Videos encontrados:', videos.length);
    
    // Obtener módulos para el modal de subida
    const modulosResult = await db.executeQuery(`
      SELECT 
        m.id_modulo,
        m.titulo,
        c.titulo as curso_titulo,
        CONCAT(c.titulo, ' - ', m.titulo) as display_name
      FROM Modulos m
      INNER JOIN Cursos c ON m.id_curso = c.id_curso
      WHERE c.estatus = 'publicado'
      ORDER BY c.titulo, m.orden, m.titulo
    `);
    
    const modulos = modulosResult.recordset;
    
    res.render('videos-admin', {
      title: 'Gestión de Videos',
      videos: videos,
      modulos: modulos,
      userName: req.session.user.nombre,
      userRole: req.session.user.rol,
      layout: false
    });
    
  } catch (error) {
    console.error('[VIDEOS-ADMIN] ❌ Error obteniendo videos:', error);
    res.status(500).render('error', {
      message: 'Error al cargar la lista de videos',
      error: error
    });
  }
});

/* GET - Obtener módulos disponibles (API para modal) */
router.get('/modulos', async function(req, res, next) {
  try {
    const db = req.app.locals.db;
    
    // Obtener módulos disponibles
    const modulosResult = await db.executeQuery(`
      SELECT 
        m.id_modulo,
        m.titulo,
        c.titulo as curso_titulo,
        CONCAT(c.titulo, ' - ', m.titulo) as display_name
      FROM Modulos m
      INNER JOIN Cursos c ON m.id_curso = c.id_curso
      WHERE c.estatus = 'publicado'
      ORDER BY c.titulo, m.orden, m.titulo
    `);
    
    const modulos = modulosResult.recordset || [];
    res.json(modulos);
    
  } catch (error) {
    console.error('[VIDEOS-ADMIN] ❌ Error obteniendo módulos:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener módulos'
    });
  }
});

/* GET - Formulario para nuevo video */
router.get('/nuevo', async function(req, res, next) {
  try {
    const db = req.app.locals.db;
    
    // Obtener módulos disponibles
    const modulosResult = await db.executeQuery(`
      SELECT 
        m.id_modulo,
        m.titulo,
        c.titulo as curso_titulo,
        CONCAT(c.titulo, ' - ', m.titulo) as display_name
      FROM Modulos m
      INNER JOIN Cursos c ON m.id_curso = c.id_curso
      WHERE c.estatus = 'publicado'
      ORDER BY c.titulo, m.orden, m.titulo
    `);
    
    const modulos = modulosResult.recordset;
    
    res.render('video-upload-form', {
      title: 'Subir Nuevo Video',
      modulos: modulos,
      userName: req.session.user.nombre,
      userRole: req.session.user.rol,
      layout: false
    });
    
  } catch (error) {
    console.error('[VIDEOS-ADMIN] ❌ Error cargando formulario:', error);
    res.status(500).render('error', {
      message: 'Error al cargar el formulario',
      error: error
    });
  }
});

/* POST - Subir nuevo video */
// Ruta temporal de prueba sin Vimeo
router.post('/upload-test', async (req, res) => {
  console.log('[TEST-UPLOAD] 🧪 Ruta de prueba simple');
  console.log('[TEST-UPLOAD] 📝 Body:', req.body);
  console.log('[TEST-UPLOAD] 📁 File:', req.file);
  
  res.json({
    success: true,
    message: 'Ruta de prueba funcionando',
    received: {
      body: req.body,
      file: req.file ? 'Archivo presente' : 'Sin archivo'
    }
  });
});

router.post('/upload', 
  (req, res, next) => {
    console.log('[VIDEO-UPLOAD] 📋 Datos recibidos:', {
      body: req.body,
      file: req.file ? 'Archivo presente' : 'Sin archivo'
    });
    next();
  },
  uploadConfig.single('video'),
  (req, res, next) => {
    console.log('[VIDEO-UPLOAD] 🗂️ Después de multer:', {
      body: req.body,
      file: req.file ? {
        filename: req.file.filename,
        path: req.file.path,
        size: req.file.size,
        mimetype: req.file.mimetype
      } : 'Sin archivo'
    });
    next();
  },
  validateVideoData,
  async function(req, res, next) {
    let tempFilePath = null;
    
    try {
      console.log('[VIDEO-UPLOAD] 🎬 Iniciando proceso de upload');
      
      if (!req.file) {
        console.log('[VIDEO-UPLOAD] ❌ No se recibió archivo');
        return res.status(400).json({
          success: false,
          error: 'No se recibió ningún archivo de video'
        });
      }
      
      tempFilePath = req.file.path;
      const { titulo, descripcion, id_modulo, duracion_minutos = 0, estatus = 'borrador' } = req.body;
      
      console.log('[VIDEO-UPLOAD] 🎬 Iniciando proceso de upload:', titulo);
      console.log('[VIDEO-UPLOAD] 📁 Archivo temporal:', tempFilePath);
      
      // SIMULACIÓN TEMPORAL - No subir a Vimeo por ahora para debugging
      console.log('[VIDEO-UPLOAD] 🧪 MODO DEBUG: Simulando upload a Vimeo...');
      const vimeoResult = {
        video_id: 'debug_' + Date.now(),
        vimeo_url: 'https://vimeo.com/debug_' + Date.now(),
        embed_url: 'https://player.vimeo.com/video/debug_' + Date.now()
      };
      
      // Preparar datos para Vimeo (comentado temporalmente)
      // const videoData = {
      //   titulo: titulo,
      //   descripcion: descripcion,
      //   privacidad: 'unlisted' // Privado por defecto para cursos de pago
      // };
      
      // Subir a Vimeo (comentado temporalmente)
      // console.log('[VIDEO-UPLOAD] ☁️ Subiendo a Vimeo...');
      // const vimeoResult = await vimeoService.uploadVideo(tempFilePath, videoData);
      
      // Guardar en base de datos
      const db = req.app.locals.db;
      
      // Obtener el próximo orden para este módulo
      const ordenResult = await db.executeQuery(`
        SELECT ISNULL(MAX(orden), 0) + 1 as siguiente_orden 
        FROM Video 
        WHERE id_modulo = @id_modulo
      `, { id_modulo: id_modulo });
      
      const siguienteOrden = ordenResult.recordset[0].siguiente_orden;
      
      const insertResult = await db.executeQuery(`
        INSERT INTO Video (
          id_modulo, titulo, descripcion, url, 
          duracion_segundos, orden, estatus, fecha_creacion
        ) 
        OUTPUT INSERTED.*
        VALUES (
          @id_modulo, @titulo, @descripcion, @url,
          @duracion_segundos, @orden, @estatus, GETDATE()
        )
      `, {
        id_modulo: id_modulo,
        titulo: titulo,
        descripcion: descripcion || null,
        url: vimeoResult.embed_url,
        duracion_segundos: (parseInt(duracion_minutos) || 0) * 60,
        orden: siguienteOrden,
        estatus: estatus
      });
      
      const nuevoVideo = insertResult.recordset[0];
      
      console.log('[VIDEO-UPLOAD] ✅ Video guardado en BD:', nuevoVideo.id_video);
      
      // Limpiar archivo temporal
      await cleanupTempFile(tempFilePath);
      
      res.json({
        success: true,
        message: 'Video subido exitosamente',
        video: {
          id: nuevoVideo.id_video,
          titulo: nuevoVideo.titulo,
          vimeo_id: vimeoResult.video_id,
          vimeo_url: vimeoResult.vimeo_url,
          embed_url: vimeoResult.embed_url
        }
      });
      
    } catch (error) {
      console.error('[VIDEO-UPLOAD] ❌ Error en upload:', error);
      
      // Limpiar archivo temporal en caso de error
      if (tempFilePath) {
        await cleanupTempFile(tempFilePath);
      }
      
      res.status(500).json({
        success: false,
        error: 'Error al subir el video: ' + error.message
      });
    }
  }
);

/* PATCH - Cambiar estado de video */
router.patch('/:id/status', async function(req, res, next) {
  try {
    const videoId = req.params.id;
    const { estatus } = req.body;
    const db = req.app.locals.db;

    // Validar que el estatus sea válido
    const validStatuses = ['activo', 'borrador', 'archivado'];
    if (!validStatuses.includes(estatus)) {
      return res.status(400).json({
        success: false,
        error: 'Estado no válido. Los estados permitidos son: activo, borrador, archivado'
      });
    }

    // Verificar que el video existe
    const videoResult = await db.executeQuery(
      'SELECT * FROM Video WHERE id_video = @id',
      { id: videoId }
    );

    if (videoResult.recordset.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Video no encontrado'
      });
    }

    const video = videoResult.recordset[0];
    console.log(`[VIDEO-STATUS] 🔄 Cambiando estado del video ${videoId} de '${video.estatus}' a '${estatus}'`);

    // Actualizar el estado en la base de datos
    await db.executeQuery(`
      UPDATE Video 
      SET estatus = @estatus, fecha_modificacion = GETDATE()
      WHERE id_video = @id
    `, {
      id: videoId,
      estatus: estatus
    });

    // Registrar el cambio en logs (opcional)
    console.log(`[VIDEO-STATUS] ✅ Estado actualizado exitosamente para video ${videoId}`);

    res.json({
      success: true,
      message: `Estado del video cambiado a '${estatus}' exitosamente`,
      video: {
        id: videoId,
        titulo: video.titulo,
        estado_anterior: video.estatus,
        estado_nuevo: estatus
      }
    });

  } catch (error) {
    console.error('[VIDEO-STATUS] ❌ Error cambiando estado:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor al cambiar el estado del video'
    });
  }
});

/* DELETE - Eliminar video permanentemente */
router.delete('/:id', async function(req, res, next) {
  try {
    const videoId = req.params.id;
    const db = req.app.locals.db;
    
    console.log(`[VIDEO-DELETE] 🗑️ Iniciando eliminación permanente del video ${videoId}`);
    
    // Obtener información completa del video
    const videoResult = await db.executeQuery(`
      SELECT 
        v.*, 
        m.titulo as modulo_titulo,
        c.titulo as curso_titulo
      FROM Video v
      LEFT JOIN Modulos m ON v.id_modulo = m.id_modulo
      LEFT JOIN Cursos c ON m.id_curso = c.id_curso
      WHERE v.id_video = @id
    `, { id: videoId });
    
    if (videoResult.recordset.length === 0) {
      console.log(`[VIDEO-DELETE] ❌ Video ${videoId} no encontrado`);
      return res.status(404).json({
        success: false,
        error: 'Video no encontrado'
      });
    }
    
    const video = videoResult.recordset[0];
    console.log(`[VIDEO-DELETE] 📹 Video encontrado: "${video.titulo}" (${video.modulo_titulo})`);
    
    // Verificar permisos adicionales (solo admin puede eliminar videos activos)
    if (video.estatus === 'activo' && req.session.user.rol !== 'admin') {
      console.log(`[VIDEO-DELETE] ⚠️ Usuario ${req.session.user.nombre} intentó eliminar video activo sin permisos`);
      return res.status(403).json({
        success: false,
        error: 'Solo los administradores pueden eliminar videos activos. Cambia el video a borrador primero.'
      });
    }
    
    // Crear registro de auditoría antes de eliminar
    const auditData = {
      video_id: videoId,
      titulo: video.titulo,
      modulo: video.modulo_titulo,
      curso: video.curso_titulo,
      estatus_anterior: video.estatus,
      eliminado_por: req.session.user.nombre,
      eliminado_por_id: req.session.user.id,
      fecha_eliminacion: new Date().toISOString(),
      url_vimeo: video.url
    };
    
    console.log('[VIDEO-DELETE] 📝 Registro de auditoría:', auditData);
    
    // Eliminar de Vimeo si existe
    let vimeoDeleteSuccess = false;
    if (video.url) {
      try {
        // Extraer ID de Vimeo de diferentes formatos de URL
        let vimeoId = null;
        
        // Formato: https://vimeo.com/123456789
        let vimeoIdMatch = video.url.match(/vimeo\.com\/(\d+)/);
        if (vimeoIdMatch) {
          vimeoId = vimeoIdMatch[1];
        } else {
          // Formato: https://player.vimeo.com/video/123456789
          vimeoIdMatch = video.url.match(/player\.vimeo\.com\/video\/(\d+)/);
          if (vimeoIdMatch) {
            vimeoId = vimeoIdMatch[1];
          }
        }
        
        if (vimeoId) {
          console.log(`[VIDEO-DELETE] ☁️ Eliminando de Vimeo: ${vimeoId}`);
          await vimeoService.deleteVideo(vimeoId);
          console.log('[VIDEO-DELETE] ✅ Video eliminado de Vimeo exitosamente');
          vimeoDeleteSuccess = true;
        } else {
          console.log('[VIDEO-DELETE] ⚠️ No se pudo extraer ID de Vimeo de la URL:', video.url);
        }
      } catch (vimeoError) {
        console.error('[VIDEO-DELETE] ❌ Error eliminando de Vimeo:', vimeoError);
        // Continuar con la eliminación de BD aunque falle Vimeo
        console.log('[VIDEO-DELETE] ⚠️ Continuando con eliminación de BD a pesar del error de Vimeo');
      }
    }
    
    // Eliminar de base de datos
    console.log(`[VIDEO-DELETE] 🗄️ Eliminando de base de datos: ${videoId}`);
    const deleteResult = await db.executeQuery(
      'DELETE FROM Video WHERE id_video = @id',
      { id: videoId }
    );
    
    if (deleteResult.rowsAffected && deleteResult.rowsAffected[0] > 0) {
      console.log('[VIDEO-DELETE] ✅ Video eliminado de BD exitosamente');
      
      // Opcional: Guardar registro de auditoría en tabla de logs
      try {
        await db.executeQuery(`
          INSERT INTO VideoAuditLog (
            video_id_original, titulo, modulo, curso, estatus_anterior, 
            eliminado_por, eliminado_por_id, fecha_eliminacion, url_vimeo_original,
            vimeo_delete_success
          ) VALUES (
            @video_id, @titulo, @modulo, @curso, @estatus_anterior,
            @eliminado_por, @eliminado_por_id, GETDATE(), @url_vimeo,
            @vimeo_delete_success
          )
        `, {
          ...auditData,
          vimeo_delete_success: vimeoDeleteSuccess
        });
        console.log('[VIDEO-DELETE] 📋 Registro de auditoría guardado');
      } catch (auditError) {
        console.error('[VIDEO-DELETE] ⚠️ Error guardando auditoría (no crítico):', auditError);
        // No fallar la operación por error de auditoría
      }
      
      res.json({
        success: true,
        message: 'Video eliminado permanentemente',
        details: {
          video_eliminado: video.titulo,
          vimeo_eliminado: vimeoDeleteSuccess,
          eliminado_por: req.session.user.nombre
        }
      });
    } else {
      console.log('[VIDEO-DELETE] ❌ No se pudo eliminar de BD - no existe o error');
      res.status(500).json({
        success: false,
        error: 'No se pudo eliminar el video de la base de datos'
      });
    }
    
  } catch (error) {
    console.error('[VIDEO-DELETE] ❌ Error crítico eliminando video:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor al eliminar el video',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/* GET - Obtener estado de procesamiento de video */
router.get('/:id/status', async function(req, res, next) {
  try {
    const videoId = req.params.id;
    const db = req.app.locals.db;
    
    // Obtener video de BD
    const videoResult = await db.executeQuery(
      'SELECT vimeo_video_id FROM Video WHERE id_video = @id',
      { id: videoId }
    );
    
    if (videoResult.recordset.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Video no encontrado'
      });
    }
    
    const vimeoVideoId = videoResult.recordset[0].vimeo_video_id;
    
    if (!vimeoVideoId) {
      return res.json({
        success: true,
        status: 'no_vimeo_id'
      });
    }
    
    // Obtener estado de Vimeo
    const status = await vimeoService.getVideoStatus(vimeoVideoId);
    
    res.json({
      success: true,
      status: status,
      processing: status === 'uploading' || status === 'processing'
    });
    
  } catch (error) {
    console.error('[VIDEO-STATUS] ❌ Error obteniendo estado:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener el estado del video'
    });
  }
});

// Middleware de manejo de errores de upload
router.use(handleUploadError);

module.exports = router;