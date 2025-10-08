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

// GET - Vista principal de pagos
router.get('/', async (req, res) => {
  try {
    const pool = await sql.connect(config);
    
    // Obtener estadísticas
    const statsQuery = await pool.request().query(`
      SELECT 
        SUM(monto) as totalIngresos,
        (SELECT SUM(monto) FROM Historial_Pagos 
         WHERE MONTH(fecha) = MONTH(GETDATE()) AND YEAR(fecha) = YEAR(GETDATE())) as ingresosMes,
        COUNT(*) as totalTransacciones,
        (COUNT(CASE WHEN estatus = 'completado' THEN 1 END) * 100.0 / COUNT(*)) as tasaExito
      FROM Historial_Pagos
    `);
    
    // Obtener todos los pagos con información de usuario
    const pagosQuery = await pool.request().query(`
      SELECT 
        hp.id_pago,
        hp.id_usuario,
        hp.id_compra,
        hp.monto,
        hp.metodo_pago,
        hp.estatus,
        hp.fecha,
        u.nombre as usuario_nombre,
        u.email as usuario_email,
        CASE 
          WHEN c.id_curso IS NOT NULL THEN 'Curso: ' + cur.titulo
          WHEN s.id_membresia IS NOT NULL THEN 'Membresía: ' + m.nombre
          ELSE 'Compra general'
        END as concepto
      FROM Historial_Pagos hp
      INNER JOIN Usuarios u ON hp.id_usuario = u.id_usuario
      LEFT JOIN Compras c ON hp.id_compra = c.id_compra
      LEFT JOIN Cursos cur ON c.id_curso = cur.id_curso
      LEFT JOIN Suscripciones s ON c.id_suscripcion = s.id_suscripcion
      LEFT JOIN Membresias m ON s.id_membresia = m.id_membresia
      ORDER BY hp.fecha DESC
    `);
    
    // Obtener distribución por método de pago
    const metodosPagoQuery = await pool.request().query(`
      SELECT 
        metodo_pago as metodo,
        SUM(monto) as total
      FROM Historial_Pagos
      WHERE estatus = 'completado'
      GROUP BY metodo_pago
    `);
    
    // Obtener top compradores
    const topCompradoresQuery = await pool.request().query(`
      SELECT TOP 10
        u.id_usuario,
        u.nombre,
        COUNT(hp.id_pago) as cantidad_compras,
        SUM(hp.monto) as total
      FROM Historial_Pagos hp
      INNER JOIN Usuarios u ON hp.id_usuario = u.id_usuario
      WHERE hp.estatus = 'completado'
      GROUP BY u.id_usuario, u.nombre
      ORDER BY total DESC
    `);
    
    // Obtener pagos pendientes
    const pendientesQuery = await pool.request().query(`
      SELECT 
        COUNT(*) as cantidad,
        SUM(monto) as total
      FROM Historial_Pagos
      WHERE estatus = 'pendiente'
    `);
    
    const stats = statsQuery.recordset[0];
    const pendientes = pendientesQuery.recordset[0];
    
    res.render('admin/historial-pagos-admin', {
      totalIngresos: (stats.totalIngresos || 0).toFixed(2),
      ingresosMes: (stats.ingresosMes || 0).toFixed(2),
      totalTransacciones: stats.totalTransacciones || 0,
      tasaExito: (stats.tasaExito || 0).toFixed(1),
      pagos: pagosQuery.recordset,
      metodosPago: metodosPagoQuery.recordset,
      topCompradores: topCompradoresQuery.recordset,
      pagosPendientes: pendientes.cantidad || 0,
      totalPendiente: (pendientes.total || 0).toFixed(2),
      user: req.session.user
    });
  } catch (err) {
    console.error('Error al cargar historial de pagos:', err);
    res.status(500).send('Error al cargar historial de pagos');
  }
});

// GET - Detalles de un pago
router.get('/:pagoId', async (req, res) => {
  const { pagoId } = req.params;
  
  try {
    const pool = await sql.connect(config);
    const result = await pool.request()
      .input('pagoId', sql.NVarChar, pagoId)
      .query(`
        SELECT 
          hp.*,
          u.nombre as usuario_nombre,
          u.email as usuario_email,
          u.telefono as usuario_telefono
        FROM Historial_Pagos hp
        INNER JOIN Usuarios u ON hp.id_usuario = u.id_usuario
        WHERE hp.id_pago = @pagoId
      `);
    
    if (result.recordset.length === 0) {
      return res.status(404).json({ success: false, error: 'Pago no encontrado' });
    }
    
    res.json({ success: true, data: result.recordset[0] });
  } catch (err) {
    console.error('Error al obtener pago:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET - Descargar recibo de pago
router.get('/:pagoId/recibo', async (req, res) => {
  const { pagoId } = req.params;
  
  try {
    // Aquí implementarías la generación del PDF del recibo
    res.json({ 
      success: true, 
      message: 'Generación de recibo en desarrollo',
      pagoId: pagoId
    });
  } catch (err) {
    console.error('Error al generar recibo:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST - Confirmar pago pendiente
router.post('/:pagoId/confirmar', async (req, res) => {
  const { pagoId } = req.params;
  
  try {
    const pool = await sql.connect(config);
    await pool.request()
      .input('pagoId', sql.NVarChar, pagoId)
      .query(`
        UPDATE Historial_Pagos 
        SET estatus = 'completado'
        WHERE id_pago = @pagoId
      `);
    
    res.json({ success: true, message: 'Pago confirmado exitosamente' });
  } catch (err) {
    console.error('Error al confirmar pago:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET - Exportar a Excel
router.get('/exportar/excel', async (req, res) => {
  try {
    const pool = await sql.connect(config);
    const result = await pool.request().query(`
      SELECT 
        hp.id_pago,
        u.nombre as usuario,
        u.email,
        hp.monto,
        hp.metodo_pago,
        hp.estatus,
        hp.fecha
      FROM Historial_Pagos hp
      INNER JOIN Usuarios u ON hp.id_usuario = u.id_usuario
      ORDER BY hp.fecha DESC
    `);
    
    // Aquí implementarías la exportación a Excel
    res.json({ success: true, data: result.recordset });
  } catch (err) {
    console.error('Error al exportar:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET - Exportar a PDF
router.get('/exportar/pdf', async (req, res) => {
  try {
    // Aquí implementarías la exportación a PDF
    res.json({ 
      success: true, 
      message: 'Exportación a PDF en desarrollo'
    });
  } catch (err) {
    console.error('Error al exportar:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
