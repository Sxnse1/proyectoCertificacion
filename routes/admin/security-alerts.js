/**
 * 🚨 ALERTAS DE SEGURIDAD - ADMINISTRACIÓN
 * ============================================================
 * Rutas para visualizar alertas de seguridad y patrones sospechosos
 * detectados automáticamente por el sistema
 * ============================================================
 */

var express = require('express');
var router = express.Router();
const securityAlertService = require('../../services/securityAlertService');

/* GET - Vista principal de alertas de seguridad */
router.get('/', async function(req, res, next) {
  try {
    const db = req.app.locals.db;
    
    console.log('[SECURITY ALERTS] 🔍 Consultando alertas de seguridad...');
    
    // Generar reporte completo de seguridad
    const securityReport = await securityAlertService.generateSecurityReport(db);
    
    console.log('[SECURITY ALERTS] ✅ Reporte generado:', {
      total_alerts: securityReport.summary.total_alerts,
      high_severity: securityReport.summary.high_severity,
      medium_severity: securityReport.summary.medium_severity
    });

    res.render('admin/security-alerts', {
      title: 'Alertas de Seguridad - StartEducation',
      report: securityReport,
      alerts: securityReport.alerts,
      stats: securityReport.statistics,
      recommendations: securityReport.recommendations,
      currentUser: req.session.user,
      isAdmin: req.session.user.rol === 'admin'
    });

  } catch (error) {
    console.error('[SECURITY ALERTS] ❌ Error consultando alertas:', error);
    console.error('[SECURITY ALERTS] ❌ Stack trace:', error.stack);
    res.status(500).render('shared/error', {
      title: 'Error del Servidor',
      message: 'Error consultando alertas de seguridad',
      error: error,
      userName: req.session.user?.nombre,
      userRole: req.session.user?.rol
    });
  }
});

/* GET - API para obtener alertas en formato JSON */
router.get('/api', async function(req, res, next) {
  try {
    const db = req.app.locals.db;
    
    const securityReport = await securityAlertService.generateSecurityReport(db);
    
    res.json({
      success: true,
      data: securityReport
    });

  } catch (error) {
    console.error('[SECURITY ALERTS API] ❌ Error:', error);
    res.status(500).json({
      success: false,
      message: 'Error obteniendo alertas de seguridad',
      error: error.message
    });
  }
});

/* POST - Marcar alerta como revisada */
router.post('/dismiss/:alertType', async function(req, res, next) {
  try {
    const alertType = req.params.alertType;
    
    console.log(`[SECURITY ALERTS] 📋 Marcando alerta como revisada: ${alertType}`);
    
    // En una implementación real, guardaríamos esto en la base de datos
    // Por ahora, solo registramos la acción
    
    res.json({
      success: true,
      message: 'Alerta marcada como revisada'
    });

  } catch (error) {
    console.error('[SECURITY ALERTS] ❌ Error marcando alerta:', error);
    res.status(500).json({
      success: false,
      message: 'Error marcando alerta como revisada',
      error: error.message
    });
  }
});

module.exports = router;