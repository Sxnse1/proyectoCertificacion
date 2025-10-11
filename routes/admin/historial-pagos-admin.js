const express = require('express');
const router = express.Router();
const sql = require('mssql');
const { connect } = require('../../config/database');

// GET - Vista principal de historial de pagos
router.get('/', async (req, res) => {
  try {
    const pool = await connect();
    
    // Obtener estadísticas
    const statsQuery = await pool.request().query(`
      SELECT 
        ISNULL(SUM(monto), 0) as totalIngresos,
        (SELECT ISNULL(SUM(monto), 0) FROM Historial_Pagos 
         WHERE MONTH(fecha_pago) = MONTH(GETDATE()) AND YEAR(fecha_pago) = YEAR(GETDATE())) as ingresosMes,
        COUNT(*) as totalTransacciones,
        (COUNT(CASE WHEN estatus = 'exitoso' THEN 1 END) * 100.0 / NULLIF(COUNT(*), 0)) as tasaExito
      FROM Historial_Pagos
    `);
    
    // Obtener todos los pagos con información de usuario
    const pagosQuery = await pool.request().query(`
      SELECT 
        hp.id_pago,
        hp.id_usuario,
        hp.id_compra,
        hp.id_suscripcion,
        hp.monto,
        hp.estatus,
        hp.fecha_pago,
        u.nombre + ' ' + u.apellido as usuario_nombre,
        u.email as usuario_email,
        CASE 
          WHEN hp.id_compra IS NOT NULL THEN 'Compra de Curso'
          WHEN hp.id_suscripcion IS NOT NULL THEN 'Suscripción'
          ELSE 'Otro'
        END as tipo_pago,
        CASE 
          WHEN c.id_curso IS NOT NULL THEN cur.titulo
          WHEN s.id_membresia IS NOT NULL THEN m.nombre
          ELSE 'N/A'
        END as concepto
      FROM Historial_Pagos hp
      INNER JOIN Usuarios u ON hp.id_usuario = u.id_usuario
      LEFT JOIN Compras c ON hp.id_compra = c.id_compra
      LEFT JOIN Cursos cur ON c.id_curso = cur.id_curso
      LEFT JOIN Suscripciones s ON hp.id_suscripcion = s.id_suscripcion
      LEFT JOIN Membresias m ON s.id_membresia = m.id_membresia
      ORDER BY hp.fecha_pago DESC
    `);
    
    // Obtener distribución por estatus
    const distribucionEstatusQuery = await pool.request().query(`
      SELECT 
        estatus,
        COUNT(*) as cantidad,
        SUM(monto) as total
      FROM Historial_Pagos
      GROUP BY estatus
    `);
    
    // Obtener top compradores
    const topCompradoresQuery = await pool.request().query(`
      SELECT TOP 10
        u.id_usuario,
        u.nombre + ' ' + u.apellido as nombre,
        u.email,
        COUNT(hp.id_pago) as cantidad_transacciones,
        SUM(hp.monto) as total_gastado
      FROM Historial_Pagos hp
      INNER JOIN Usuarios u ON hp.id_usuario = u.id_usuario
      WHERE hp.estatus = 'exitoso'
      GROUP BY u.id_usuario, u.nombre, u.apellido, u.email
      ORDER BY total_gastado DESC
    `);
    
    const stats = statsQuery.recordset[0];
    
    res.render('admin/historial-pagos-admin', {
      totalIngresos: (stats.totalIngresos || 0).toFixed(2),
      ingresosMes: (stats.ingresosMes || 0).toFixed(2),
      totalTransacciones: stats.totalTransacciones || 0,
      tasaExito: (stats.tasaExito || 0).toFixed(1),
      pagos: pagosQuery.recordset,
      distribucionEstatus: distribucionEstatusQuery.recordset,
      topCompradores: topCompradoresQuery.recordset,
      user: req.session.user
    });
  } catch (err) {
    console.error('Error al cargar historial de pagos:', err);
    res.status(500).send('Error al cargar historial de pagos: ' + err.message);
  }
});

// GET - Detalles de un pago
router.get('/:id', async (req, res) => {
  try {
    const pool = await connect();
    const { id } = req.params;
    
    const pagoQuery = await pool.request()
      .input('id', sql.Int, id)
      .query(`
        SELECT 
          hp.*,
          u.nombre + ' ' + u.apellido as usuario_nombre,
          u.email as usuario_email,
          CASE 
            WHEN c.id_curso IS NOT NULL THEN cur.titulo
            WHEN s.id_membresia IS NOT NULL THEN m.nombre
            ELSE 'N/A'
          END as concepto
        FROM Historial_Pagos hp
        INNER JOIN Usuarios u ON hp.id_usuario = u.id_usuario
        LEFT JOIN Compras c ON hp.id_compra = c.id_compra
        LEFT JOIN Cursos cur ON c.id_curso = cur.id_curso
        LEFT JOIN Suscripciones s ON hp.id_suscripcion = s.id_suscripcion
        LEFT JOIN Membresias m ON s.id_membresia = m.id_membresia
        WHERE hp.id_pago = @id
      `);
    
    if (pagoQuery.recordset.length === 0) {
      return res.status(404).json({ error: 'Pago no encontrado' });
    }
    
    res.json(pagoQuery.recordset[0]);
  } catch (err) {
    console.error('Error al obtener pago:', err);
    res.status(500).json({ error: err.message });
  }
});

// PUT - Actualizar estatus de pago (por ejemplo, procesar reembolso)
router.put('/:id', async (req, res) => {
  try {
    const pool = await connect();
    const { id } = req.params;
    const { estatus } = req.body;
    
    // Validar estatus
    const estatusValidos = ['exitoso', 'fallido', 'reembolsado'];
    if (!estatusValidos.includes(estatus)) {
      return res.status(400).json({ error: 'Estatus inválido' });
    }
    
    await pool.request()
      .input('id', sql.Int, id)
      .input('estatus', sql.NVarChar, estatus)
      .query(`
        UPDATE Historial_Pagos 
        SET estatus = @estatus
        WHERE id_pago = @id
      `);
    
    res.json({ success: true, message: 'Estatus actualizado exitosamente' });
  } catch (err) {
    console.error('Error al actualizar pago:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
