const express = require('express');
const router = express.Router();
const sql = require('mssql');
const { connect } = require('../../config/database');

// GET - Vista principal de suscripciones
router.get('/', async (req, res) => {
  try {
    const pool = await connect();
    
    // Obtener estadísticas
    const statsQuery = await pool.request().query(`
      SELECT 
        COUNT(*) as totalSuscripciones,
        (SELECT COUNT(*) FROM Suscripciones WHERE estatus = 'activa') as suscripcionesActivas,
        (SELECT COUNT(*) FROM Suscripciones 
         WHERE estatus = 'activa' AND DATEDIFF(day, GETDATE(), fecha_vencimiento) <= 7) as proximasExpirar,
        (SELECT SUM(m.precio) FROM Suscripciones s 
         INNER JOIN Membresias m ON s.id_membresia = m.id_membresia 
         WHERE s.estatus = 'activa') as ingresosMensuales
      FROM Suscripciones
    `);
    
    // Obtener todas las suscripciones con datos de usuario y membresía
    const suscripcionesQuery = await pool.request().query(`
      SELECT 
        s.id_suscripcion,
        s.id_usuario,
        s.id_membresia,
        s.fecha_compra,
        s.fecha_vencimiento,
        s.estatus,
        m.precio as precio,
        u.nombre as usuario_nombre,
        u.email as usuario_email,
        m.nombre as membresia_nombre,
        DATEDIFF(day, GETDATE(), s.fecha_vencimiento) as dias_restantes
      FROM Suscripciones s
      INNER JOIN Usuarios u ON s.id_usuario = u.id_usuario
      INNER JOIN Membresias m ON s.id_membresia = m.id_membresia
      ORDER BY s.fecha_compra DESC
    `);
    
    // Obtener lista de membresías para el filtro
    const membresiasQuery = await pool.request().query(`
      SELECT id_membresia, nombre FROM Membresias ORDER BY nombre
    `);
    
    const stats = statsQuery.recordset[0];
    
    // Calcular tasa de retención (simulado)
    const tasaRetencion = 85.5;
    
    res.render('admin/suscripciones-admin', {
      suscripcionesActivas: stats.suscripcionesActivas || 0,
      proximasExpirar: stats.proximasExpirar || 0,
      ingresosMensuales: (stats.ingresosMensuales || 0).toFixed(2),
      tasaRetencion: tasaRetencion,
      suscripciones: suscripcionesQuery.recordset,
      membresias: membresiasQuery.recordset,
      user: req.session.user
    });
  } catch (err) {
    console.error('Error al cargar suscripciones:', err);
    res.status(500).send('Error al cargar suscripciones');
  }
});

// GET - Detalles de una suscripción
router.get('/:id', async (req, res) => {
  const { id } = req.params;
  
  try {
    const pool = await sql.connect(config);
    const result = await pool.request()
      .input('id', sql.Int, id)
      .query(`
        SELECT 
          s.*,
          u.nombre as usuario_nombre,
          u.email as usuario_email,
          m.nombre as membresia_nombre,
          m.descripcion as membresia_descripcion,
          DATEDIFF(day, GETDATE(), s.fecha_vencimiento) as dias_restantes
        FROM Suscripciones s
        INNER JOIN Usuarios u ON s.id_usuario = u.id_usuario
        INNER JOIN Membresias m ON s.id_membresia = m.id_membresia
        WHERE s.id_suscripcion = @id
      `);
    
    if (result.recordset.length === 0) {
      return res.status(404).json({ success: false, error: 'Suscripción no encontrada' });
    }
    
    res.json({ success: true, data: result.recordset[0] });
  } catch (err) {
    console.error('Error al obtener suscripción:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST - Renovar suscripción
router.post('/:id/renovar', async (req, res) => {
  const { id } = req.params;
  
  try {
    const pool = await sql.connect(config);
    
    // Obtener información de la suscripción y membresía
    const suscripcionQuery = await pool.request()
      .input('id', sql.Int, id)
      .query(`
        SELECT s.*, m.duracion_meses 
        FROM Suscripciones s
        INNER JOIN Membresias m ON s.id_membresia = m.id_membresia
        WHERE s.id_suscripcion = @id
      `);
    
    if (suscripcionQuery.recordset.length === 0) {
      return res.status(404).json({ success: false, error: 'Suscripción no encontrada' });
    }
    
    const suscripcion = suscripcionQuery.recordset[0];
    const duracionMeses = suscripcion.duracion_meses;
    
    // Renovar suscripción
    await pool.request()
      .input('id', sql.Int, id)
      .input('duracion', sql.Int, duracionMeses)
      .query(`
        UPDATE Suscripciones 
        SET fecha_vencimiento = DATEADD(MONTH, @duracion, GETDATE()),
            estatus = 'activa'
        WHERE id_suscripcion = @id
      `);
    
    res.json({ success: true, message: 'Suscripción renovada exitosamente' });
  } catch (err) {
    console.error('Error al renovar suscripción:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST - Cancelar suscripción
router.post('/:id/cancelar', async (req, res) => {
  const { id } = req.params;
  
  try {
    const pool = await sql.connect(config);
    await pool.request()
      .input('id', sql.Int, id)
      .query(`
        UPDATE Suscripciones 
        SET estatus = 'cancelada'
        WHERE id_suscripcion = @id
      `);
    
    res.json({ success: true, message: 'Suscripción cancelada exitosamente' });
  } catch (err) {
    console.error('Error al cancelar suscripción:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST - Reactivar suscripción
router.post('/:id/reactivar', async (req, res) => {
  const { id } = req.params;
  
  try {
    const pool = await sql.connect(config);
    await pool.request()
      .input('id', sql.Int, id)
      .query(`
        UPDATE Suscripciones 
        SET estatus = 'activa'
        WHERE id_suscripcion = @id
      `);
    
    res.json({ success: true, message: 'Suscripción reactivada exitosamente' });
  } catch (err) {
    console.error('Error al reactivar suscripción:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET - Exportar suscripciones
router.get('/exportar', async (req, res) => {
  try {
    const pool = await sql.connect(config);
    const result = await pool.request().query(`
      SELECT 
        s.id_suscripcion,
        u.nombre as usuario,
        u.email,
        m.nombre as membresia,
        s.precio,
        s.fecha_compra,
        s.fecha_vencimiento,
        s.estatus
      FROM Suscripciones s
      INNER JOIN Usuarios u ON s.id_usuario = u.id_usuario
      INNER JOIN Membresias m ON s.id_membresia = m.id_membresia
      ORDER BY s.fecha_compra DESC
    `);
    
    // Aquí implementarías la lógica de exportación a Excel/CSV
    // Por ahora, devolvemos JSON
    res.json({ success: true, data: result.recordset });
  } catch (err) {
    console.error('Error al exportar suscripciones:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
