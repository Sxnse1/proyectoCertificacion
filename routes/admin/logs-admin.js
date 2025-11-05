/**
 * 🔍 LOGS DE AUDITORÍA - ADMINISTRACIÓN
 * ============================================================
 * Rutas para visualizar y gestionar logs de auditoría
 * del sistema StartEducation
 * ============================================================
 */

var express = require('express');
var router = express.Router();
const auditService = require('../../services/auditService');

/* GET - Vista principal de logs de auditoría */
router.get('/', async function(req, res, next) {
  try {
    const db = req.app.locals.db;
    
    // Parámetros de consulta
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 25;
    const searchUser = req.query.user || '';
    const filterEntity = req.query.entidad || '';
    const filterAction = req.query.accion || '';
    const filterDate = req.query.fecha || '';
    const offset = (page - 1) * limit;

    console.log('[AUDIT LOGS] 🔍 Consultando logs de auditoría:', {
      page, limit, searchUser, filterEntity, filterAction, filterDate
    });

    // Construir filtros
    const filters = {
      limit,
      offset
    };

    if (filterEntity) filters.entidad = filterEntity;
    if (filterAction) filters.accion = filterAction;

    // Obtener logs con filtros
    const logs = await auditService.getLogs(filters, db);

    // Si hay filtro de usuario, filtrar por nombre/email
    let filteredLogs = logs;
    if (searchUser) {
      const searchLower = searchUser.toLowerCase();
      filteredLogs = logs.filter(log => 
        log.UsuarioNombre.toLowerCase().includes(searchLower) ||
        log.UsuarioEmail.toLowerCase().includes(searchLower)
      );
    }

    // Si hay filtro de fecha, filtrar por fecha
    if (filterDate) {
      const filterDateObj = new Date(filterDate);
      filteredLogs = filteredLogs.filter(log => {
        const logDate = new Date(log.Timestamp);
        return logDate.toDateString() === filterDateObj.toDateString();
      });
    }

    // Obtener estadísticas de auditoría
    const stats = await auditService.getAuditStats(db);

    // Obtener valores únicos para filtros
    const allLogsForFilters = await auditService.getLogs({ limit: 1000 }, db);
    const uniqueEntities = [...new Set(allLogsForFilters.map(log => log.Entidad))].sort();
    const uniqueActions = [...new Set(allLogsForFilters.map(log => log.Accion))].sort();

    // Calcular información de paginación
    const totalLogs = filteredLogs.length;
    const totalPages = Math.ceil(totalLogs / limit);
    const paginatedLogs = filteredLogs.slice(0, limit); // Ya aplicamos offset en la consulta inicial

    console.log('[AUDIT LOGS] ✅ Logs consultados exitosamente:', {
      total: totalLogs,
      page,
      totalPages
    });

    try {
      res.render('admin/logs-admin', {
        title: 'Logs de Auditoría - StartEducation',
        logs: paginatedLogs,
        stats: stats,
        pagination: {
          currentPage: page,
          totalPages: totalPages,
          totalItems: totalLogs,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1,
          nextPage: page + 1,
          prevPage: page - 1,
          limit: limit
        },
        filters: {
          user: searchUser,
          entidad: filterEntity,
          accion: filterAction,
          fecha: filterDate,
          uniqueEntities: uniqueEntities,
          uniqueActions: uniqueActions
        },
        currentUser: req.session.user,
        isAdmin: req.session.user.rol === 'admin'
      });
    } catch (renderError) {
      console.error('[AUDIT LOGS] ❌ Error renderizando vista:', renderError);
      console.error('[AUDIT LOGS] ❌ Stack trace render:', renderError.stack);
      res.status(500).json({
        error: 'Error renderizando vista',
        details: renderError.message,
        data: {
          logsCount: paginatedLogs.length,
          statsKeys: Object.keys(stats || {}),
          filtersKeys: Object.keys({
            user: searchUser,
            entidad: filterEntity,
            accion: filterAction,
            fecha: filterDate,
            uniqueEntities: uniqueEntities,
            uniqueActions: uniqueActions
          })
        }
      });
    }

  } catch (error) {
    console.error('[AUDIT LOGS] ❌ Error consultando logs:', error);
    console.error('[AUDIT LOGS] ❌ Stack trace:', error.stack);
    res.status(500).render('shared/error', {
      title: 'Error del Servidor',
      message: 'Error consultando logs de auditoría',
      error: error,
      userName: req.session.user?.nombre,
      userRole: req.session.user?.rol
    });
  }
});

/* GET - API endpoint para obtener logs en formato JSON */
router.get('/api', async function(req, res, next) {
  try {
    const db = req.app.locals.db;
    
    const filters = {
      usuarioId: req.query.usuarioId ? parseInt(req.query.usuarioId) : null,
      entidad: req.query.entidad || null,
      accion: req.query.accion || null,
      limit: parseInt(req.query.limit) || 50,
      offset: parseInt(req.query.offset) || 0
    };

    console.log('[AUDIT LOGS API] 🔍 Consultando logs via API:', filters);

    const logs = await auditService.getLogs(filters, db);

    res.json({
      success: true,
      logs: logs,
      total: logs.length,
      filters: filters
    });

  } catch (error) {
    console.error('[AUDIT LOGS API] ❌ Error:', error);
    res.status(500).json({
      success: false,
      message: 'Error consultando logs de auditoría',
      error: error.message
    });
  }
});

/* GET - API endpoint para obtener estadísticas de auditoría */
router.get('/api/stats', async function(req, res, next) {
  try {
    const db = req.app.locals.db;
    
    console.log('[AUDIT STATS API] 📊 Consultando estadísticas de auditoría...');

    const stats = await auditService.getAuditStats(db);

    res.json({
      success: true,
      stats: stats
    });

  } catch (error) {
    console.error('[AUDIT STATS API] ❌ Error:', error);
    res.status(500).json({
      success: false,
      message: 'Error consultando estadísticas de auditoría',
      error: error.message
    });
  }
});

/* GET - Vista detallada de un log específico */
router.get('/:logId', async function(req, res, next) {
  try {
    const db = req.app.locals.db;
    const logId = parseInt(req.params.logId);

    if (isNaN(logId)) {
      return res.status(400).render('shared/error', {
        title: 'ID Inválido',
        message: 'ID de log inválido',
        error: { message: 'El ID del log debe ser un número válido' },
        userName: req.session.user?.nombre,
        userRole: req.session.user?.rol
      });
    }

    console.log('[AUDIT LOG DETAIL] 🔍 Consultando detalle del log:', logId);

    // Obtener log específico
    const logs = await auditService.getLogs({ limit: 1, offset: 0 }, db);
    const log = logs.find(l => l.LogID === logId);

    if (!log) {
      return res.status(404).render('shared/error', {
        title: 'Log No Encontrado',
        message: 'Log de auditoría no encontrado',
        error: { message: 'El log solicitado no existe o fue eliminado' },
        userName: req.session.user?.nombre,
        userRole: req.session.user?.rol
      });
    }

    // Parsear detalles JSON para mejor visualización
    let detallesParsed = null;
    if (log.Detalles) {
      try {
        detallesParsed = JSON.parse(log.Detalles);
      } catch (parseError) {
        console.warn('[AUDIT LOG DETAIL] ⚠️ Error parseando detalles JSON:', parseError);
        detallesParsed = { error: 'No se pudo parsear los detalles', raw: log.Detalles };
      }
    }

    res.render('admin/log-detail', {
      title: `Log de Auditoría #${logId} - StartEducation`,
      log: log,
      detallesParsed: detallesParsed,
      detallesFormatted: detallesParsed ? JSON.stringify(detallesParsed, null, 2) : null,
      currentUser: req.session.user,
      isAdmin: req.session.user.rol === 'admin'
    });

  } catch (error) {
    console.error('[AUDIT LOG DETAIL] ❌ Error consultando detalle:', error);
    res.status(500).render('shared/error', {
      title: 'Error del Servidor',
      message: 'Error consultando detalle del log',
      error: error,
      userName: req.session.user?.nombre,
      userRole: req.session.user?.rol
    });
  }
});

/* POST - Exportar logs de auditoría (CSV) */
router.post('/export', async function(req, res, next) {
  try {
    const db = req.app.locals.db;
    const { formato, fechaInicio, fechaFin, entidad, accion } = req.body;

    console.log('[AUDIT EXPORT] 📤 Exportando logs:', { formato, fechaInicio, fechaFin, entidad, accion });

    // Construir filtros para exportación
    const filters = {
      limit: 10000, // Límite alto para exportación
      offset: 0
    };

    if (entidad) filters.entidad = entidad;
    if (accion) filters.accion = accion;

    // Obtener logs para exportación
    let logs = await auditService.getLogs(filters, db);

    // Filtrar por fechas si se especifican
    if (fechaInicio || fechaFin) {
      logs = logs.filter(log => {
        const logDate = new Date(log.Timestamp);
        if (fechaInicio && logDate < new Date(fechaInicio)) return false;
        if (fechaFin && logDate > new Date(fechaFin)) return false;
        return true;
      });
    }

    // Registrar la exportación en auditoría
    try {
      await auditService.logAction({
        usuarioId: req.session.user.id_usuario,
        accion: 'LOGS_EXPORTADOS',
        entidad: auditService.AUDIT_ENTITIES.SISTEMA,
        entidadId: null,
        detalles: {
          filtros_aplicados: { entidad, accion, fechaInicio, fechaFin },
          total_logs_exportados: logs.length,
          formato: formato,
          admin_exportador: req.session.user.email
        },
        ip: req.ip
      }, db);
    } catch (auditError) {
      console.error('[AUDIT EXPORT] ⚠️ Error registrando auditoría de exportación:', auditError);
    }

    if (formato === 'csv') {
      // Generar CSV
      const csvHeader = 'LogID,Usuario,Email,Accion,Entidad,EntidadID,IP,Timestamp\n';
      const csvData = logs.map(log => 
        `${log.LogID},"${log.UsuarioNombre}","${log.UsuarioEmail}","${log.Accion}","${log.Entidad}",${log.EntidadID || ''},"${log.IP || ''}","${log.Timestamp}"`
      ).join('\n');

      const csv = csvHeader + csvData;
      const filename = `audit_logs_${new Date().toISOString().split('T')[0]}.csv`;

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.send(csv);
    } else {
      // Formato JSON por defecto
      const filename = `audit_logs_${new Date().toISOString().split('T')[0]}.json`;
      
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.json({
        exportedBy: req.session.user.email,
        exportedAt: new Date().toISOString(),
        totalLogs: logs.length,
        filters: { entidad, accion, fechaInicio, fechaFin },
        logs: logs
      });
    }

    console.log('[AUDIT EXPORT] ✅ Logs exportados exitosamente:', logs.length, 'registros');

  } catch (error) {
    console.error('[AUDIT EXPORT] ❌ Error exportando logs:', error);
    res.status(500).json({
      success: false,
      message: 'Error exportando logs de auditoría',
      error: error.message
    });
  }
});

// Ruta temporal de prueba (sin autenticación)
router.get('/test', async function(req, res, next) {
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
    
    // Obtener logs de auditoría
    const logs = await auditService.getLogs({ limit: 25, offset: 0 }, db);
    const stats = await auditService.getAuditStats(db);
    const allLogsForFilters = await auditService.getLogs({ limit: 1000 }, db);
    
    const uniqueEntities = [...new Set(allLogsForFilters.map(log => log.Entidad))].sort();
    const uniqueActions = [...new Set(allLogsForFilters.map(log => log.Accion))].sort();

    console.log('[AUDIT LOGS TEST] ✅ Datos cargados:', {
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
    console.error('[AUDIT LOGS TEST] ❌ Error:', error);
    console.error('[AUDIT LOGS TEST] ❌ Stack trace:', error.stack);
    res.status(500).json({
      error: 'Error en ruta de prueba',
      message: error.message,
      stack: error.stack
    });
  }
});

module.exports = router;