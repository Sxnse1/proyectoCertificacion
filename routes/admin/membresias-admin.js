const express = require('express');
const router = express.Router();
const sql = require('mssql');
const { connect } = require('../../config/database');

// GET - Vista principal de membresías
router.get('/', async (req, res) => {
  try {
    const pool = await connect();
    
    // Obtener estadísticas
    const statsQuery = await pool.request().query(`
      SELECT 
        COUNT(*) as totalPlanes,
        (SELECT COUNT(DISTINCT id_usuario) FROM Suscripciones WHERE estatus = 'activa') as suscriptoresActivos,
        (SELECT SUM(m.precio) FROM Suscripciones s 
         INNER JOIN Membresias m ON s.id_membresia = m.id_membresia 
         WHERE s.estatus = 'activa') as ingresosMensuales
      FROM Membresias
    `);
    
    // Obtener todas las membresías con conteo de suscriptores
    const membresiasQuery = await pool.request().query(`
      SELECT 
        m.id_membresia,
        m.nombre,
        m.descripcion,
        m.precio,
        m.tipo_periodo,
        COUNT(s.id_suscripcion) as total_suscriptores,
        (SELECT COUNT(*) FROM Suscripciones WHERE id_membresia = m.id_membresia AND estatus = 'activa') as suscriptores_activos
      FROM Membresias m
      LEFT JOIN Suscripciones s ON m.id_membresia = s.id_membresia
      GROUP BY m.id_membresia, m.nombre, m.descripcion, m.precio, m.tipo_periodo
      ORDER BY m.precio
    `);
    
    const stats = statsQuery.recordset[0];
    
    // Calcular crecimiento (simulado - puedes implementar lógica real)
    const crecimiento = 12.5;
    
    res.render('admin/membresias-admin', {
      totalPlanes: stats.totalPlanes || 0,
      suscriptoresActivos: stats.suscriptoresActivos || 0,
      ingresosMensuales: stats.ingresosMensuales || 0,
      crecimiento: crecimiento,
      membresias: membresiasQuery.recordset,
      user: req.session.user
    });
  } catch (err) {
    console.error('Error al cargar membresías:', err);
    res.status(500).send('Error al cargar membresías');
  }
});

// POST - Crear nueva membresía
router.post('/', async (req, res) => {
  const { nombre, descripcion, precio, duracion_meses } = req.body;
  
  try {
    const pool = await sql.connect(config);
    await pool.request()
      .input('nombre', sql.NVarChar, nombre)
      .input('descripcion', sql.NVarChar, descripcion)
      .input('precio', sql.Decimal(10, 2), precio)
      .input('duracion', sql.Int, duracion_meses)
      .query(`
        INSERT INTO Membresias (nombre, descripcion, precio, duracion_meses, fecha_creacion)
        VALUES (@nombre, @descripcion, @precio, @duracion, GETDATE())
      `);
    
    res.json({ success: true, message: 'Membresía creada exitosamente' });
  } catch (err) {
    console.error('Error al crear membresía:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// PUT - Actualizar membresía
router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const { nombre, descripcion, precio, duracion_meses } = req.body;
  
  try {
    const pool = await sql.connect(config);
    await pool.request()
      .input('id', sql.Int, id)
      .input('nombre', sql.NVarChar, nombre)
      .input('descripcion', sql.NVarChar, descripcion)
      .input('precio', sql.Decimal(10, 2), precio)
      .input('duracion', sql.Int, duracion_meses)
      .query(`
        UPDATE Membresias 
        SET nombre = @nombre, 
            descripcion = @descripcion, 
            precio = @precio, 
            duracion_meses = @duracion
        WHERE id_membresia = @id
      `);
    
    res.json({ success: true, message: 'Membresía actualizada exitosamente' });
  } catch (err) {
    console.error('Error al actualizar membresía:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// DELETE - Eliminar membresía
router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  
  try {
    const pool = await sql.connect(config);
    
    // Verificar si hay suscripciones activas
    const checkQuery = await pool.request()
      .input('id', sql.Int, id)
      .query(`
        SELECT COUNT(*) as count 
        FROM Suscripciones 
        WHERE id_membresia = @id AND estatus = 'activa'
      `);
    
    if (checkQuery.recordset[0].count > 0) {
      return res.status(400).json({ 
        success: false, 
        error: 'No se puede eliminar una membresía con suscripciones activas' 
      });
    }
    
    await pool.request()
      .input('id', sql.Int, id)
      .query('DELETE FROM Membresias WHERE id_membresia = @id');
    
    res.json({ success: true, message: 'Membresía eliminada exitosamente' });
  } catch (err) {
    console.error('Error al eliminar membresía:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET - Detalles de una membresía
router.get('/:id', async (req, res) => {
  const { id } = req.params;
  
  try {
    const pool = await sql.connect(config);
    const result = await pool.request()
      .input('id', sql.Int, id)
      .query(`
        SELECT 
          m.*,
          COUNT(s.id_suscripcion) as total_suscriptores,
          (SELECT COUNT(*) FROM Suscripciones WHERE id_membresia = m.id_membresia AND estatus = 'activa') as suscriptores_activos
        FROM Membresias m
        LEFT JOIN Suscripciones s ON m.id_membresia = s.id_membresia
        WHERE m.id_membresia = @id
        GROUP BY m.id_membresia, m.nombre, m.descripcion, m.precio, m.duracion_meses, m.fecha_creacion
      `);
    
    if (result.recordset.length === 0) {
      return res.status(404).json({ success: false, error: 'Membresía no encontrada' });
    }
    
    res.json({ success: true, data: result.recordset[0] });
  } catch (err) {
    console.error('Error al obtener membresía:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
