const express = require('express');
const router = express.Router();
const sql = require('mssql');
const { connect } = require('../../config/database');

// GET - Test simple para ver si funciona
router.get('/', async (req, res) => {
  try {
    console.log('🔍 [TEST-PAGOS] Iniciando test...');
    const pool = await connect();
    
    // Consulta muy simple
    const testQuery = await pool.request().query('SELECT COUNT(*) as total FROM Compras');
    console.log('✅ [TEST-PAGOS] Total compras:', testQuery.recordset[0]);
    
    res.json({
      success: true,
      message: 'Test exitoso',
      data: testQuery.recordset[0]
    });
    
  } catch (err) {
    console.error('❌ [TEST-PAGOS] Error:', err);
    res.status(500).json({ 
      success: false, 
      error: err.message 
    });
  }
});

module.exports = router;