/**
 * 🧪 LOGS TEST - RUTA DE PRUEBA
 * ============================================================
 * Ruta temporal para probar la funcionalidad de logs sin middleware
 * ============================================================
 */

var express = require('express');
var router = express.Router();
const auditService = require('../services/auditService');

/* GET - Ruta de prueba para logs */
router.get('/', async function(req, res, next) {
  try {
    const db = req.app.locals.db;
    
    // Usuario temporal para pruebas
    const testUser = {
      id_usuario: 1,
      nombre: 'Admin',
      apellido: 'Test',
      email: 'admin@starteducation.com',
      rol: 'admin'
    };
    
    console.log('[LOGS TEST] 🧪 Iniciando prueba de logs...');
    
    // Obtener logs de auditoría
    const logs = await auditService.getLogs({ limit: 25, offset: 0 }, db);
    const stats = await auditService.getAuditStats(db);
    const allLogsForFilters = await auditService.getLogs({ limit: 1000 }, db);
    
    const uniqueEntities = [...new Set(allLogsForFilters.map(log => log.Entidad))].sort();
    const uniqueActions = [...new Set(allLogsForFilters.map(log => log.Accion))].sort();

    console.log('[LOGS TEST] ✅ Datos cargados:', {
      logs: logs.length,
      stats: Object.keys(stats || {}),
      uniqueEntities: uniqueEntities.length,
      uniqueActions: uniqueActions.length
    });

    res.render('admin/logs-admin', {
      title: 'Logs de Auditoría - StartEducation (TEST)',
      logs: logs,
      stats: stats,
      pagination: {
        currentPage: 1,
        totalPages: 1,
        totalItems: logs.length,
        hasNextPage: false,
        hasPrevPage: false,
        nextPage: 2,
        prevPage: 0,
        limit: 25
      },
      filters: {
        user: '',
        entidad: '',
        accion: '',
        fecha: '',
        uniqueEntities: uniqueEntities,
        uniqueActions: uniqueActions
      },
      currentUser: testUser,
      isAdmin: true
    });

  } catch (error) {
    console.error('[LOGS TEST] ❌ Error:', error);
    console.error('[LOGS TEST] ❌ Stack trace:', error.stack);
    res.status(500).json({
      error: 'Error en ruta de prueba',
      message: error.message,
      stack: error.stack
    });
  }
});

module.exports = router;