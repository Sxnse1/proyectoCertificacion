const express = require('express');
const router = express.Router();
const bunnyService = require('../../services/bunnyService');
const { uploadConfig, handleUploadError, cleanupTempFile, validateVideoData } = require('../../middleware/uploadMiddleware');
const requireAuth = require('../../middleware/auth').requireAuth;
const requireRole = require('../../middleware/auth').requireRole;

// Middleware de autenticación para todas las rutas
router.use(requireAuth);
router.use(requireRole(['instructor', 'admin']));

/* GET - Lista de videos para administración */
router.get('/', async function(req, res, next) {
  try {
    const db = req.app.locals.db;
    
    // Obtener videos con información de módulos y cursos, incluyendo campos Bunny
    const result = await db.executeQuery(`
      SELECT 
        v.id_video,
        v.titulo,
        ISNULL(v.descripcion, '') as descripcion,
        ISNULL(v.url, '') as url_vimeo,
        ISNULL(v.bunny_video_id, '') as bunny_video_id,
        ISNULL(v.bunny_library_id, '') as bunny_library_id,
        ISNULL(v.bunny_embed_url, '') as bunny_embed_url,
        ISNULL(v.bunny_thumbnail_url, '') as bunny_thumbnail_url,
        ISNULL(v.video_provider, 'bunny') as video_provider,
        CASE 
          WHEN v.duracion_segundos IS NOT NULL THEN v.duracion_segundos / 60
          ELSE 0 
        END as duracion_minutos,
        v.estatus,
        v.fecha_creacion,
        ISNULL(v.fecha_modificacion, v.fecha_creacion) as fecha_modificacion,
        v.id_modulo,
        ISNULL(m.titulo, 'Sin módulo') as modulo_titulo,
        ISNULL(c.titulo, 'Sin curso') as curso_titulo,
        FORMAT(v.fecha_creacion, 'dd/MM/yyyy HH:mm') as fecha_formateada,
        FORMAT(ISNULL(v.fecha_modificacion, v.fecha_creacion), 'dd/MM/yyyy HH:mm') as fecha_modificacion_formateada
      FROM Video v
      LEFT JOIN Modulos m ON v.id_modulo = m.id_modulo
      LEFT JOIN Cursos c ON m.id_curso = c.id_curso
      ORDER BY v.fecha_creacion DESC
    `);
    
    const videos = result.recordset.map(video => {
      // Determinar el ID correcto para el reproductor
      let bunnyId = null;
      
      // 1. Si es un video de Bunny, usar bunny_video_id directamente
      if (video.video_provider === 'bunny' && video.bunny_video_id) {
        bunnyId = video.bunny_video_id;
      }
      // 2. Si no, intentar extraer de la URL (para videos legacy)
      else if (video.url_vimeo) {
        // Formato Bunny: https://iframe.mediadelivery.net/embed/{libraryId}/{videoId}
        const bunnyIdMatch = video.url_vimeo.match(/embed\/\d+\/([a-f0-9-]+)/) || 
                            video.url_vimeo.match(/\/([a-f0-9-]+)\/play_/) ||
                            video.url_vimeo.match(/\/([a-f0-9-]+)\/thumbnail/);
        if (bunnyIdMatch) {
          bunnyId = bunnyIdMatch[1];
        }
        // Formato Vimeo: https://vimeo.com/{videoId} o https://player.vimeo.com/video/{videoId}
        else {
          const vimeoIdMatch = video.url_vimeo.match(/(?:vimeo\.com\/|video\/)(\d+)/);
          if (vimeoIdMatch) {
            bunnyId = vimeoIdMatch[1];
          }
        }
      }
      
      // 3. Fallback al id_video de la base de datos
      if (!bunnyId) {
        bunnyId = video.id_video.toString();
      }
      
      return {
        ...video,
        bunny_id: bunnyId,
        vimeo_id: bunnyId, // Mantener compatibilidad temporal
        effective_id: bunnyId // ID efectivo para usar en el reproductor
      };
    });
    
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
    
    res.render('admin/videos-admin', {
      title: 'Gestión de Videos',
      videos: videos,
      modulos: modulos,
      userName: req.session.user.nombre,
      userRole: req.session.user.rol,
      bunnyLibraryId: process.env.BUNNY_LIBRARY_ID || 'TU_LIBRARY_ID_AQUI',
      layout: false
    });
    
  } catch (error) {
    console.error('[VIDEOS-ADMIN] ❌ Error obteniendo videos:', error);
    res.status(500).render('shared/error', {
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
    
    res.render('admin/videos-admin', {
      title: 'Subir Nuevo Video',
      videos: [], // Empty array for new upload
      modulos: modulos,
      userName: req.session.user.nombre,
      userRole: req.session.user.rol,
      bunnyLibraryId: process.env.BUNNY_LIBRARY_ID || 'TU_LIBRARY_ID_AQUI',
      layout: false
    });
    
  } catch (error) {
    console.error('[VIDEOS-ADMIN] ❌ Error cargando formulario:', error);
    res.status(500).render('shared/error', {
      message: 'Error al cargar el formulario',
      error: error
    });
  }
});

/* GET - Formulario para editar video */
router.get('/:id/edit', async function(req, res, next) {
  try {
    const { id } = req.params;
    const db = req.app.locals.db;
    
    console.log('[VIDEOS-ADMIN] 📝 Acceso a edición de video ID:', id);
    
    // Obtener el video específico
    const videoResult = await db.executeQuery(`
      SELECT 
        v.id_video,
        v.titulo,
        ISNULL(v.descripcion, '') as descripcion,
        ISNULL(v.url, '') as url_vimeo,
        ISNULL(v.bunny_video_id, '') as bunny_video_id,
        ISNULL(v.bunny_library_id, '') as bunny_library_id,
        ISNULL(v.bunny_embed_url, '') as bunny_embed_url,
        ISNULL(v.bunny_thumbnail_url, '') as bunny_thumbnail_url,
        ISNULL(v.video_provider, 'bunny') as video_provider,
        v.duracion_segundos,
        v.estatus,
        v.id_modulo,
        m.titulo as modulo_titulo,
        c.titulo as curso_titulo
      FROM Video v
      LEFT JOIN Modulos m ON v.id_modulo = m.id_modulo
      LEFT JOIN Cursos c ON m.id_curso = c.id_curso
      WHERE v.id_video = @videoId
    `, { videoId: id });
    
    if (!videoResult.recordset || videoResult.recordset.length === 0) {
      return res.status(404).render('shared/error', {
        title: 'Video No Encontrado',
        message: 'El video que intentas editar no existe.',
        userName: req.session.user.nombre,
        userRole: req.session.user.rol
      });
    }
    
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
    
    const video = videoResult.recordset[0];
    const modulos = modulosResult.recordset;
    
    res.render('admin/videos-edit', {
      title: `Editar Video: ${video.titulo}`,
      video: video,
      modulos: modulos,
      userName: req.session.user.nombre,
      userRole: req.session.user.rol,
      bunnyLibraryId: process.env.BUNNY_LIBRARY_ID,
      layout: false
    });
    
  } catch (error) {
    console.error('[VIDEOS-ADMIN] ❌ Error cargando video para editar:', error);
    res.status(500).render('shared/error', {
      message: 'Error al cargar el video para edición',
      error: error,
      userName: req.session.user.nombre,
      userRole: req.session.user.rol
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
      let { titulo, descripcion, id_modulo, duracion_minutos = 0, estatus = 'borrador', orden } = req.body;
      
      // Validar estatus permitidos según constraint de DB
      const estatusPermitidos = ['borrador', 'publicado', 'archivado'];
      if (!estatusPermitidos.includes(estatus)) {
        console.log('[VIDEO-UPLOAD] ❌ Estatus inválido recibido:', estatus, '- Usando borrador por defecto');
        estatus = 'borrador';
      }
      
      // Mapear 'activo' a 'publicado' para compatibilidad con formularios antiguos
      if (estatus === 'activo') {
        estatus = 'publicado';
        console.log('[VIDEO-UPLOAD] 🔄 Mapeando "activo" a "publicado"');
      }
      
      console.log('[VIDEO-UPLOAD] 🎬 Iniciando proceso de upload:', titulo);
      console.log('[VIDEO-UPLOAD] 📁 Archivo temporal:', tempFilePath);
      console.log('[VIDEO-UPLOAD] 📋 Estatus validado:', estatus);
      
      // Subir a Bunny.net
      console.log('[VIDEO-UPLOAD] ☁️ Subiendo a Bunny.net...');
      const bunnyResult = await bunnyService.uploadVideo(tempFilePath, {
        titulo: titulo,
        descripcion: descripcion
      });
      
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
      
      // Determinar el orden del video
      let ordenFinal;
      if (orden && parseInt(orden) > 0) {
        ordenFinal = parseInt(orden);
        console.log('[VIDEO-UPLOAD] 🔢 Usando orden proporcionado:', ordenFinal);
      } else {
        // Obtener el próximo orden para este módulo si no se especifica
        const ordenResult = await db.executeQuery(`
          SELECT ISNULL(MAX(orden), 0) + 1 as siguiente_orden 
          FROM Video 
          WHERE id_modulo = @id_modulo
        `, { id_modulo: id_modulo });
        
        ordenFinal = ordenResult.recordset[0].siguiente_orden;
        console.log('[VIDEO-UPLOAD] 🔢 Usando siguiente orden automático:', ordenFinal);
      }
      
      const insertResult = await db.executeQuery(`
        INSERT INTO Video (
          id_modulo, titulo, descripcion, url, 
          bunny_video_id, bunny_library_id, bunny_embed_url, bunny_thumbnail_url,
          video_provider, bunny_metadata,
          duracion_segundos, orden, estatus, fecha_creacion
        ) 
        OUTPUT INSERTED.*
        VALUES (
          @id_modulo, @titulo, @descripcion, @url,
          @bunny_video_id, @bunny_library_id, @bunny_embed_url, @bunny_thumbnail_url,
          @video_provider, @bunny_metadata,
          @duracion_segundos, @orden, @estatus, GETDATE()
        )
      `, {
        id_modulo: id_modulo,
        titulo: titulo,
        descripcion: descripcion || null,
        url: bunnyResult.embed_url,
        bunny_video_id: bunnyResult.video_id || null,
        bunny_library_id: process.env.BUNNY_LIBRARY_ID || null,
        bunny_embed_url: bunnyResult.embed_url || null,
        bunny_thumbnail_url: bunnyResult.thumbnail_url || null,
        video_provider: 'bunny',
        bunny_metadata: bunnyResult.metadata ? JSON.stringify(bunnyResult.metadata) : null,
        duracion_segundos: (parseInt(duracion_minutos) || 0) * 60,
        orden: ordenFinal,
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
          bunny_id: bunnyResult.video_id,
          bunny_url: bunnyResult.stream_url,
          embed_url: bunnyResult.embed_url,
          thumbnail_url: bunnyResult.thumbnail_url
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

/* PUT - Actualizar información de video */
router.put('/:id', async function(req, res, next) {
  try {
    const { id } = req.params;
    const { titulo, descripcion, id_modulo, estatus } = req.body;
    const db = req.app.locals.db;
    
    console.log('[VIDEOS-ADMIN] ✏️ Actualizando video ID:', id);
    console.log('[VIDEOS-ADMIN] 📝 Datos a actualizar:', { titulo, descripcion, id_modulo, estatus });
    
    // Validar que el video existe
    const existsResult = await db.executeQuery(`
      SELECT id_video FROM Video WHERE id_video = @videoId
    `, { videoId: id });
    
    if (!existsResult.recordset || existsResult.recordset.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Video no encontrado'
      });
    }
    
    // Validar estatus (mapear activo a publicado para compatibilidad)
    if (estatus === 'activo') {
      estatus = 'publicado';
    }
    
    const validStatuses = ['publicado', 'borrador', 'archivado'];
    if (estatus && !validStatuses.includes(estatus)) {
      return res.status(400).json({
        success: false,
        error: 'Estado no válido. Los estados permitidos son: publicado, borrador, archivado'
      });
    }
    
    // Construir query de actualización
    let updateFields = [];
    let params = { videoId: id };
    
    if (titulo) {
      updateFields.push('titulo = @titulo');
      params.titulo = titulo;
    }
    
    if (descripcion !== undefined) { // Permitir descripción vacía
      updateFields.push('descripcion = @descripcion');
      params.descripcion = descripcion;
    }
    
    if (id_modulo) {
      updateFields.push('id_modulo = @id_modulo');
      params.id_modulo = id_modulo;
    }
    
    if (estatus) {
      updateFields.push('estatus = @estatus');
      params.estatus = estatus;
    }
    
    if (updateFields.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No hay campos para actualizar'
      });
    }
    
    // Añadir fecha de modificación
    updateFields.push('fecha_modificacion = GETDATE()');
    
    const updateQuery = `
      UPDATE Video 
      SET ${updateFields.join(', ')}
      WHERE id_video = @videoId
    `;
    
    await db.executeQuery(updateQuery, params);
    
    console.log('[VIDEOS-ADMIN] ✅ Video actualizado exitosamente');
    
    res.json({
      success: true,
      message: 'Video actualizado exitosamente'
    });
    
  } catch (error) {
    console.error('[VIDEOS-ADMIN] ❌ Error actualizando video:', error);
    res.status(500).json({
      success: false,
      error: 'Error al actualizar el video: ' + error.message
    });
  }
});

/* PUT - Cambiar estado de video */
router.put('/:id/status', async function(req, res, next) {
  try {
    const videoId = req.params.id;
    const { estatus } = req.body;
    const db = req.app.locals.db;

    // Validar que el estatus sea válido
    const validStatuses = ['publicado', 'borrador', 'archivado'];
    if (!validStatuses.includes(estatus)) {
      return res.status(400).json({
        success: false,
        error: 'Estado no válido. Los estados permitidos son: publicado, borrador, archivado'
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
    
    // Verificar permisos adicionales (solo admin puede eliminar videos publicados)
    if (video.estatus === 'publicado' && req.session.user.rol !== 'admin') {
      console.log(`[VIDEO-DELETE] ⚠️ Usuario ${req.session.user.nombre} intentó eliminar video publicado sin permisos`);
      return res.status(403).json({
        success: false,
        error: 'Solo los administradores pueden eliminar videos publicados. Cambia el video a borrador primero.'
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
    
    // Eliminar de Bunny.net si existe
    let bunnyDeleteSuccess = false;
    if (video.url) {
      try {
        // Extraer ID de Bunny de diferentes formatos de URL
        let bunnyId = null;
        
        // Formato: https://iframe.mediadelivery.net/embed/{libraryId}/{videoId}
        let bunnyIdMatch = video.url.match(/embed\/\d+\/([a-f0-9-]+)/);
        if (bunnyIdMatch) {
          bunnyId = bunnyIdMatch[1];
        } else {
          // Formato: https://iframe.mediadelivery.net/{libraryId}/{videoId}/play_720p.mp4
          bunnyIdMatch = video.url.match(/\/([a-f0-9-]+)\/play_/);
          if (bunnyIdMatch) {
            bunnyId = bunnyIdMatch[1];
          }
        }
        
        if (bunnyId) {
          console.log(`[VIDEO-DELETE] ☁️ Eliminando de Bunny.net: ${bunnyId}`);
          await bunnyService.deleteVideo(bunnyId);
          console.log('[VIDEO-DELETE] ✅ Video eliminado de Bunny.net exitosamente');
          bunnyDeleteSuccess = true;
        } else {
          console.log('[VIDEO-DELETE] ⚠️ No se pudo extraer ID de Bunny.net de la URL:', video.url);
        }
      } catch (bunnyError) {
        console.error('[VIDEO-DELETE] ❌ Error eliminando de Bunny.net:', bunnyError);
        // Continuar con la eliminación de BD aunque falle Bunny.net
        console.log('[VIDEO-DELETE] ⚠️ Continuando con eliminación de BD a pesar del error de Bunny.net');
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
          vimeo_delete_success: bunnyDeleteSuccess
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
          vimeo_eliminado: bunnyDeleteSuccess,
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
      'SELECT url FROM Video WHERE id_video = @id',
      { id: videoId }
    );
    
    if (videoResult.recordset.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Video no encontrado'
      });
    }
    
    const videoUrl = videoResult.recordset[0].url;
    
    if (!videoUrl) {
      return res.json({
        success: true,
        status: 'no_bunny_id'
      });
    }
    
    // Extraer Bunny ID de la URL
    let bunnyId = null;
    const bunnyIdMatch = videoUrl.match(/embed\/\d+\/([a-f0-9-]+)/) || 
                        videoUrl.match(/\/([a-f0-9-]+)\/play_/);
    if (bunnyIdMatch) {
      bunnyId = bunnyIdMatch[1];
    }
    
    if (!bunnyId) {
      return res.json({
        success: true,
        status: 'invalid_url'
      });
    }
    
    // Obtener estado de Bunny.net
    const status = await bunnyService.getVideoStatus(bunnyId);
    
    res.json({
      success: true,
      status: status,
      processing: status === 'uploading' || status === 'processing' || status === 'encoding' || status === 'queued'
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