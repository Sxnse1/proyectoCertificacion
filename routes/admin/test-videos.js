const express = require('express');
const router = express.Router();
const sql = require('mssql');
const { connect } = require('../../config/database');

// GET - Test de actualización de videos
router.get('/test-update/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const db = req.app.locals.db || { executeQuery: require('../../config/database').executeQuery };
    
    console.log('🧪 [TEST-VIDEO] Testing video update for ID:', id);
    
    // Obtener datos actuales del video
    const currentVideo = await db.executeQuery(`
      SELECT id_video, titulo, descripcion, estatus, id_modulo 
      FROM Video 
      WHERE id_video = @videoId
    `, { videoId: id });
    
    if (!currentVideo.recordset || currentVideo.recordset.length === 0) {
      return res.json({ error: 'Video no encontrado' });
    }
    
    const video = currentVideo.recordset[0];
    console.log('🧪 [TEST-VIDEO] Current video data:', video);
    
    // Intentar actualizar la descripción
    const newDescription = `Descripción actualizada - Test ${new Date().toISOString()}`;
    
    const updateResult = await db.executeQuery(`
      UPDATE Video 
      SET descripcion = @descripcion, fecha_modificacion = GETDATE()
      WHERE id_video = @videoId
    `, { 
      videoId: id,
      descripcion: newDescription 
    });
    
    console.log('🧪 [TEST-VIDEO] Update result:', updateResult);
    
    // Verificar la actualización
    const updatedVideo = await db.executeQuery(`
      SELECT id_video, titulo, descripcion, estatus, id_modulo 
      FROM Video 
      WHERE id_video = @videoId
    `, { videoId: id });
    
    res.json({
      success: true,
      original: video,
      updated: updatedVideo.recordset[0],
      updateResult: updateResult.rowsAffected
    });
    
  } catch (error) {
    console.error('🧪 [TEST-VIDEO] Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST - Test simple de actualización de descripción
router.post('/simple-update/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { descripcion } = req.body;
    const db = req.app.locals.db || { executeQuery: require('../../config/database').executeQuery };
    
    console.log('🧪 [SIMPLE-TEST] Updating description for video:', id);
    console.log('🧪 [SIMPLE-TEST] New description:', descripcion);
    
    const result = await db.executeQuery(`
      UPDATE Video 
      SET descripcion = @descripcion, fecha_modificacion = GETDATE()
      WHERE id_video = @videoId
    `, { 
      videoId: id,
      descripcion: descripcion || 'Test description'
    });
    
    console.log('🧪 [SIMPLE-TEST] Update result:', result.rowsAffected);
    
    res.json({
      success: true,
      message: 'Descripción actualizada',
      rowsAffected: result.rowsAffected
    });
    
  } catch (error) {
    console.error('🧪 [SIMPLE-TEST] Error:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;