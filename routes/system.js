var express = require('express');
var router = express.Router();

/* GET system status - Para debugging en Heroku */
router.get('/status', function(req, res, next) {
  const status = {
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    port: process.env.PORT || 3000,
    database: {
      configured: !!(process.env.DB_SERVER && process.env.DB_DATABASE),
      connected: !!(req.app.locals.db),
      server: process.env.DB_SERVER ? process.env.DB_SERVER.substring(0, 20) + '***' : 'No configurado'
    },
    heroku: {
      dyno: process.env.DYNO || 'No detectado',
      app_name: process.env.HEROKU_APP_NAME || 'No detectado'
    },
    version: require('../package.json').version,
    uptime: process.uptime()
  };

  res.json({
    status: 'ok',
    message: 'Sistema funcionando',
    data: status
  });
});

/* GET health check - Para Heroku health checks */
router.get('/health', function(req, res, next) {
  res.status(200).json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString() 
  });
});

/* GET database test - Probar conexión específicamente */
router.get('/db-test', async function(req, res, next) {
  try {
    const db = req.app.locals.db;
    
    if (!db) {
      return res.status(503).json({
        success: false,
        message: 'No hay conexión a base de datos disponible',
        details: 'La aplicación no pudo conectarse a SQL Server al iniciar',
        timestamp: new Date().toISOString(),
        suggestions: [
          'Verificar variables de entorno en Heroku',
          'Verificar Security Groups en AWS RDS',
          'Verificar que el servidor SQL esté accesible'
        ]
      });
    }
    
    // Intentar una consulta simple
    const result = await db.executeQuery('SELECT @@VERSION as version, GETDATE() as fecha, DB_NAME() as database_name');
    
    res.json({
      success: true,
      message: 'Conexión a base de datos exitosa',
      data: {
        version: result.recordset[0].version.split('\n')[0],
        fecha_servidor: result.recordset[0].fecha,
        base_datos: result.recordset[0].database_name,
        timestamp: new Date().toISOString()
      }
    });
    
  } catch (error) {
    console.error('[SYSTEM] Error en db-test:', error);
    res.status(500).json({
      success: false,
      message: 'Error probando conexión a base de datos',
      error: error.message,
      code: error.code,
      number: error.number,
      timestamp: new Date().toISOString(),
      suggestions: [
        'Revisar heroku logs --tail',
        'Verificar configuración de variables de entorno',
        'Verificar conectividad desde Heroku a RDS'
      ]
    });
  }
});

/* GET diagnostic page - Página web para diagnosticar problemas */
router.get('/diagnostic', function(req, res, next) {
  res.render('db-diagnostic', { 
    title: 'Diagnóstico de Base de Datos',
    layout: false // No usar layout para esta página
  });
});

/* GET force database connection - Forzar reconexión */
router.get('/force-reconnect', async function(req, res, next) {
  try {
    console.log('[SYSTEM] 🔄 Forzando reconexión a base de datos...');
    
    // Importar módulo de base de datos
    const db = require('../config/database');
    
    // Cerrar conexión existente si la hay
    try {
      await db.close();
      console.log('[SYSTEM] 🔌 Conexión anterior cerrada');
    } catch (err) {
      console.log('[SYSTEM] ⚠️ No había conexión previa para cerrar');
    }
    
    // Intentar nueva conexión
    const connection = await db.connect();
    req.app.locals.db = db;
    
    console.log('[SYSTEM] ✅ Reconexión exitosa');
    
    res.json({
      success: true,
      message: 'Reconexión a base de datos exitosa',
      timestamp: new Date().toISOString(),
      connection_status: 'connected'
    });
    
  } catch (error) {
    console.error('[SYSTEM] ❌ Error en reconexión:', error);
    res.status(500).json({
      success: false,
      message: 'Error forzando reconexión',
      error: error.message,
      code: error.code,
      timestamp: new Date().toISOString()
    });
  }
});

module.exports = router;
