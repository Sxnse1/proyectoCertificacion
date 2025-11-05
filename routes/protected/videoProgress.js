var express = require('express');
var router = express.Router();

/**
 * POST /video/progress
 * body: { videoId: number, seconds: number, completado?: boolean }
 * Protected: requireAuth in index.routes mount
 * 
 * IMPORTANTE: Opera con SEGUNDOS exactos para máxima precisión
 * - NO convierte a minutos (evita pérdida de precisión)
 * - Guarda directamente en columna 'segundos_actuales'
 */
router.post('/progress', async function(req, res, next) {
  try {
    const user = req.session.user;
    const db = req.app.locals.db;
    const { videoId, seconds, completado } = req.body;

    // Validación de parámetros
    if (!videoId || typeof seconds === 'undefined') {
      return res.status(400).json({ 
        success: false, 
        message: 'Parámetros inválidos: videoId y seconds son requeridos' 
      });
    }

    // Procesar segundos directamente - SIN conversión a minutos
    const segundosExactos = parseInt(seconds) || 0;
    const videoIdInt = parseInt(videoId);
    const completadoBool = Boolean(completado);

    console.log(`[VIDEO PROGRESS] Guardando progreso - Video: ${videoIdInt}, Segundos: ${segundosExactos}, Completado: ${completadoBool}`);

    // UPSERT query usando ÚNICAMENTE segundos_actuales (precisión exacta)
    const upsertQuery = `
      IF EXISTS (SELECT 1 FROM Progreso WHERE id_usuario = @userId AND id_video = @videoId)
        UPDATE Progreso 
        SET 
          segundos_actuales = @segundos, 
          completado = IIF(@completado = 1, 1, completado),
          fecha_completado = IIF(@completado = 1 AND completado = 0, GETDATE(), fecha_completado),
          fecha_modificacion = GETDATE() 
        WHERE id_usuario = @userId AND id_video = @videoId
      ELSE
        INSERT INTO Progreso (id_usuario, id_video, segundos_actuales, completado, fecha_inicio, fecha_completado, fecha_modificacion) 
        VALUES (@userId, @videoId, @segundos, @completado, GETDATE(), IIF(@completado = 1, GETDATE(), NULL), GETDATE())
    `;

    await db.executeQuery(upsertQuery, {
      userId: user.id_usuario,
      videoId: videoIdInt,
      segundos: segundosExactos,
      completado: completadoBool
    });

    return res.json({ 
      success: true,
      segundos_guardados: segundosExactos,
      completado: completadoBool
    });
  } catch (error) {
    console.error('[VIDEO PROGRESS] Error saving progress', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Error interno al guardar progreso' 
    });
  }
});

/**
 * GET /video/progress/:videoId
 * Recupera el progreso exacto en SEGUNDOS (sin conversión)
 * 
 * IMPORTANTE: Devuelve segundos_actuales directamente
 * - NO multiplica por 60 (mantiene precisión exacta)
 * - Permite reanudación en el segundo exacto
 */
router.get('/progress/:videoId', async function(req, res, next) {
  try {
    const user = req.session.user;
    const db = req.app.locals.db;
    const videoId = parseInt(req.params.videoId);

    // Validación de parámetro
    if (!videoId || isNaN(videoId)) {
      return res.status(400).json({ 
        success: false, 
        message: 'videoId inválido' 
      });
    }

    console.log(`[VIDEO PROGRESS] Recuperando progreso - Usuario: ${user.id_usuario}, Video: ${videoId}`);

    // Query para obtener progreso usando segundos_actuales (precisión exacta)
    const query = `
      SELECT 
        segundos_actuales, 
        completado, 
        fecha_completado,
        fecha_modificacion
      FROM Progreso 
      WHERE id_usuario = @userId AND id_video = @videoId
    `;
    
    const result = await db.executeQuery(query, { 
      userId: user.id_usuario, 
      videoId: videoId 
    });
    
    if (result.recordset && result.recordset[0]) {
      const progress = result.recordset[0];
      
      // Devolver segundos exactos - SIN conversión desde minutos
      const segundosExactos = progress.segundos_actuales || 0;
      
      console.log(`[VIDEO PROGRESS] Progreso encontrado - Segundos: ${segundosExactos}, Completado: ${progress.completado}`);
      
      return res.json({ 
        success: true, 
        seconds: segundosExactos,  // Precisión exacta
        completado: progress.completado,
        fecha_completado: progress.fecha_completado,
        fecha_modificacion: progress.fecha_modificacion
      });
    } else {
      console.log(`[VIDEO PROGRESS] No hay progreso previo - Usuario: ${user.id_usuario}, Video: ${videoId}`);
      
      // Sin progreso previo
      return res.json({ 
        success: true, 
        seconds: 0,
        completado: false,
        fecha_completado: null,
        fecha_modificacion: null
      });
    }
  } catch (error) {
    console.error('[VIDEO PROGRESS] Error reading progress', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Error interno al recuperar progreso' 
    });
  }
});

module.exports = router;
