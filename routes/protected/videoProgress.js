var express = require('express');
var router = express.Router();

/**
 * POST /video/progress
 * body: { videoId: number, seconds: number, completado?: boolean }
 * Protected: requireAuth in index.routes mount
 */
router.post('/progress', async function(req, res, next) {
  try {
    const user = req.session.user;
    const db = req.app.locals.db;
    const { videoId, seconds, completado } = req.body;

    if (!videoId || typeof seconds === 'undefined') {
      return res.status(400).json({ success: false, message: 'Parámetros inválidos' });
    }

    // Convertir segundos a minutos (tabla usa minuto_actual)
    const minutos = Math.floor(parseInt(seconds) / 60);

    // Upsert into Progreso table
    const upsertQuery = `
      IF EXISTS (SELECT 1 FROM Progreso WHERE id_usuario = @userId AND id_video = @videoId)
        UPDATE Progreso 
        SET 
          minuto_actual = @minutos, 
          completado = IIF(@completado = 1, 1, completado),
          fecha_completado = IIF(@completado = 1 AND completado = 0, GETDATE(), fecha_completado),
          fecha_modificacion = GETDATE() 
        WHERE id_usuario = @userId AND id_video = @videoId
      ELSE
        INSERT INTO Progreso (id_usuario, id_video, minuto_actual, completado, fecha_inicio, fecha_completado, fecha_modificacion) 
        VALUES (@userId, @videoId, @minutos, @completado, GETDATE(), IIF(@completado = 1, GETDATE(), NULL), GETDATE())
    `;

    await db.executeQuery(upsertQuery, {
      userId: user.id_usuario,
      videoId: parseInt(videoId),
      minutos: minutos,
      completado: completado || false
    });

    return res.json({ success: true });
  } catch (error) {
    console.error('[VIDEO PROGRESS] Error saving progress', error);
    return res.status(500).json({ success: false, message: 'Error interno' });
  }
});

router.get('/progress/:videoId', async function(req, res, next) {
  try {
    const user = req.session.user;
    const db = req.app.locals.db;
    const videoId = parseInt(req.params.videoId);

    const q = `SELECT minuto_actual, completado, fecha_completado FROM Progreso WHERE id_usuario = @userId AND id_video = @videoId`;
    const r = await db.executeQuery(q, { userId: user.id_usuario, videoId });
    
    if (r.recordset && r.recordset[0]) {
      const progress = r.recordset[0];
      // Convertir minutos a segundos
      const seconds = (progress.minuto_actual || 0) * 60;
      return res.json({ 
        success: true, 
        seconds: seconds,
        completado: progress.completado,
        fecha_completado: progress.fecha_completado
      });
    } else {
      return res.json({ 
        success: true, 
        seconds: 0,
        completado: false,
        fecha_completado: null
      });
    }
  } catch (error) {
    console.error('[VIDEO PROGRESS] Error reading progress', error);
    return res.status(500).json({ success: false, message: 'Error interno' });
  }
});

module.exports = router;
