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

module.exports = router;