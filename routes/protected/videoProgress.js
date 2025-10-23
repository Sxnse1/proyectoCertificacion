var express = require('express');
var router = express.Router();

/**
 * POST /video/progress
 * body: { videoId: number, seconds: number }
 * Protected: requireAuth in index.routes mount
 */
router.post('/progress', async function(req, res, next) {
  try {
    const user = req.session.user;
    const db = req.app.locals.db;
    const { videoId, seconds } = req.body;

    if (!videoId || typeof seconds === 'undefined') {
      return res.status(400).json({ success: false, message: 'Parámetros inválidos' });
    }

    // Upsert into Video_Progreso
    const upsertQuery = `
      IF EXISTS (SELECT 1 FROM Video_Progreso WHERE id_usuario = @userId AND id_video = @videoId)
        UPDATE Video_Progreso SET segundos = @seconds, fecha_actualizacion = GETDATE() WHERE id_usuario = @userId AND id_video = @videoId
      ELSE
        INSERT INTO Video_Progreso (id_usuario, id_video, segundos, fecha_actualizacion) VALUES (@userId, @videoId, @seconds, GETDATE())
    `;

    await db.executeQuery(upsertQuery, {
      userId: user.id_usuario,
      videoId: parseInt(videoId),
      seconds: parseInt(seconds)
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

    const q = `SELECT segundos FROM Video_Progreso WHERE id_usuario = @userId AND id_video = @videoId`;
    const r = await db.executeQuery(q, { userId: user.id_usuario, videoId });
    const seconds = (r.recordset && r.recordset[0]) ? r.recordset[0].segundos : 0;
    return res.json({ success: true, seconds: seconds || 0 });
  } catch (error) {
    console.error('[VIDEO PROGRESS] Error reading progress', error);
    return res.status(500).json({ success: false, message: 'Error interno' });
  }
});

module.exports = router;
