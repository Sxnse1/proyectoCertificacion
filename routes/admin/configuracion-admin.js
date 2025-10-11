const express = require('express');
const router = express.Router();
const sql = require('mssql');
const config = require('../../config/database');

// Middleware para verificar si el usuario es administrador
function verificarAdmin(req, res, next) {
  if (req.session.user && req.session.user.id_rol === 1) {
    next();
  } else {
    res.status(403).send('Acceso denegado. Se requieren permisos de administrador.');
  }
}

// GET - Vista principal de configuración
router.get('/', async (req, res) => {
  try {
    const pool = await sql.connect(config);
    
    // Obtener estadísticas generales del sistema
    const statsQuery = await pool.request().query(`
      SELECT 
        (SELECT COUNT(*) FROM Usuarios) as totalUsuarios,
        (SELECT COUNT(*) FROM Cursos) as totalCursos,
        (SELECT COUNT(*) FROM Categorias) as totalCategorias,
        (SELECT COUNT(*) FROM Compras) as totalVentas,
        (SELECT SUM(monto) FROM Compras) as ingresoTotal
    `);
    
    // Obtener configuraciones actuales (simuladas - podrías crear una tabla Configuraciones)
    const configuraciones = {
      nombrePlatforma: "StartEducation",
      emailContacto: "admin@starteducation.com",
      monedaPrincipal: "USD",
      idiomaPrincipal: "es",
      mantenimientoActivo: false,
      registroPublico: true,
      aprobarCursos: true,
      comisionPlataforma: 15.0,
      emailNotificaciones: true,
      backupAutomatico: true,
      logoUrl: "/images/logo.png",
      colorPrimario: "#ea580c",
      colorSecundario: "#1f2937"
    };
    
    // Obtener información del servidor de base de datos
    const serverInfoQuery = await pool.request().query(`
      SELECT 
        @@VERSION as version_sql,
        DB_NAME() as nombre_bd,
        (SELECT COUNT(*) FROM sys.tables) as total_tablas
    `);
    
    // Obtener logs recientes (simulados)
    const logsRecientes = [
      {
        fecha: new Date(),
        nivel: 'INFO',
        mensaje: 'Sistema iniciado correctamente',
        usuario: 'Sistema'
      },
      {
        fecha: new Date(Date.now() - 3600000),
        nivel: 'WARNING', 
        mensaje: 'Intento de acceso fallido desde IP 192.168.1.100',
        usuario: 'Sistema'
      },
      {
        fecha: new Date(Date.now() - 7200000),
        nivel: 'INFO',
        mensaje: 'Backup automático completado',
        usuario: 'Sistema'
      }
    ];
    
    const stats = statsQuery.recordset[0];
    const serverInfo = serverInfoQuery.recordset[0];
    
    res.render('admin/configuracion-admin', {
      // Estadísticas
      totalUsuarios: stats.totalUsuarios || 0,
      totalCursos: stats.totalCursos || 0,
      totalCategorias: stats.totalCategorias || 0,
      totalVentas: stats.totalVentas || 0,
      ingresoTotal: (stats.ingresoTotal || 0).toFixed(2),
      
      // Configuraciones
      configuraciones: configuraciones,
      
      // Información del servidor
      serverInfo: serverInfo,
      
      // Logs
      logsRecientes: logsRecientes,
      
      user: req.session.user
    });
  } catch (err) {
    console.error('Error al cargar configuración:', err);
    res.status(500).send('Error al cargar configuración');
  }
});

// POST - Actualizar configuración general
router.post('/general', async (req, res) => {
  try {
    const {
      nombrePlatforma,
      emailContacto,
      monedaPrincipal,
      idiomaPrincipal,
      colorPrimario,
      colorSecundario
    } = req.body;
    
    // Aquí implementarías la lógica para guardar en base de datos
    // Por ahora solo simulamos una respuesta exitosa
    
    res.json({ 
      success: true, 
      message: 'Configuración general actualizada exitosamente' 
    });
  } catch (err) {
    console.error('Error al actualizar configuración:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST - Actualizar configuración de sistema
router.post('/sistema', async (req, res) => {
  try {
    const {
      mantenimientoActivo,
      registroPublico,
      aprobarCursos,
      emailNotificaciones,
      backupAutomatico
    } = req.body;
    
    // Aquí implementarías la lógica para guardar en base de datos
    
    res.json({ 
      success: true, 
      message: 'Configuración de sistema actualizada exitosamente' 
    });
  } catch (err) {
    console.error('Error al actualizar configuración de sistema:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST - Actualizar configuración de pagos
router.post('/pagos', async (req, res) => {
  try {
    const { comisionPlataforma } = req.body;
    
    // Validar que la comisión esté entre 0 y 100
    if (comisionPlataforma < 0 || comisionPlataforma > 100) {
      return res.status(400).json({ 
        success: false, 
        error: 'La comisión debe estar entre 0% y 100%' 
      });
    }
    
    res.json({ 
      success: true, 
      message: 'Configuración de pagos actualizada exitosamente' 
    });
  } catch (err) {
    console.error('Error al actualizar configuración de pagos:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST - Ejecutar backup manual
router.post('/backup', async (req, res) => {
  try {
    // Aquí implementarías la lógica de backup
    // Por ahora solo simulamos
    
    res.json({ 
      success: true, 
      message: 'Backup iniciado correctamente. Recibirás una notificación cuando termine.' 
    });
  } catch (err) {
    console.error('Error al ejecutar backup:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET - Descargar logs
router.get('/logs/descargar', async (req, res) => {
  try {
    const fechaHoy = new Date().toISOString().split('T')[0];
    const logsContent = `[${new Date().toISOString()}] INFO - Logs descargados por ${req.session.user.email}\n`;
    
    res.setHeader('Content-Type', 'text/plain');
    res.setHeader('Content-Disposition', `attachment; filename="logs_${fechaHoy}.txt"`);
    res.send(logsContent);
  } catch (err) {
    console.error('Error al descargar logs:', err);
    res.status(500).send('Error al descargar logs');
  }
});

module.exports = router;