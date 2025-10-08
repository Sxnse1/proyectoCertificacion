var express = require('express');
var router = express.Router();

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('shared/index-bootstrap', { 
    title: 'Academia de Barbería Profesional',
    layout: false 
  });
});

/* GET test database connection */
router.get('/test-db', async function(req, res, next) {
  try {
    console.log('[ROUTE] 🧪 Probando conexión desde ruta /test-db');
    const db = req.app.locals.db;
    
    const result = await db.executeQuery('SELECT @@VERSION as version, GETDATE() as fecha, DB_NAME() as database_name');
    
    console.log('[ROUTE] ✅ Consulta ejecutada exitosamente');
    console.log('[ROUTE] 📊 Resultado:', result.recordset[0]);
    
    res.json({
      success: true,
      message: '¡Conexión a SQL Server funcionando correctamente!',
      data: {
        version: result.recordset[0].version.split('\n')[0],
        fecha_servidor: result.recordset[0].fecha,
        base_datos: result.recordset[0].database_name
      }
    });
  } catch (error) {
    console.error('[ROUTE] ❌ Error en prueba de conexión:', error.message);
    res.status(500).json({
      success: false,
      message: 'Error probando la conexión',
      error: error.message
    });
  }
});

module.exports = router;
