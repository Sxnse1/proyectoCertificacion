const express = require('express');
const router = express.Router();
const sql = require('mssql');
const { connect } = require('../../config/database');

// GET - Vista principal de compras
router.get('/', async (req, res) => {
  try {
    const pool = await connect();
    
    // Obtener estadísticas
    const statsQuery = await pool.request().query(`
      SELECT 
        COUNT(*) as totalCompras,
        ISNULL(SUM(monto), 0) as ingresosTotales,
        (SELECT COUNT(*) FROM Compras 
         WHERE MONTH(fecha_compra) = MONTH(GETDATE()) 
         AND YEAR(fecha_compra) = YEAR(GETDATE())) as comprasMes,
        ISNULL(AVG(monto), 0) as ticketPromedio
      FROM Compras
    `);
    
    // Obtener todas las compras con información del usuario y curso
    const comprasQuery = await pool.request().query(`
      SELECT 
        c.id_compra,
        c.id_usuario,
        c.id_curso,
        c.monto,
        c.descripcion,
        c.metodo_pago,
        c.fecha_compra,
        u.nombre + ' ' + u.apellido as usuario_nombre,
        u.email as usuario_email,
        cr.titulo as curso_titulo
      FROM Compras c
      INNER JOIN Usuarios u ON c.id_usuario = u.id_usuario
      INNER JOIN Cursos cr ON c.id_curso = cr.id_curso
      ORDER BY c.fecha_compra DESC
    `);
    
    // Top ventas por curso
    const topVentasQuery = await pool.request().query(`
      SELECT TOP 10
        cr.id_curso,
        cr.titulo,
        cr.miniatura,
        u.nombre + ' ' + u.apellido as instructor_nombre,
        COUNT(c.id_compra) as cantidad_ventas,
        SUM(c.monto) as ingresos,
        ISNULL(AVG(CAST(v.calificacion AS FLOAT)), 0) as rating
      FROM Compras c
      INNER JOIN Cursos cr ON c.id_curso = cr.id_curso
      INNER JOIN Usuarios u ON cr.id_usuario = u.id_usuario
      LEFT JOIN Valoraciones v ON cr.id_curso = v.id_curso
      GROUP BY cr.id_curso, cr.titulo, cr.miniatura, u.nombre, u.apellido
      ORDER BY cantidad_ventas DESC
    `);
    
    // Top compradores
    const topCompradoresQuery = await pool.request().query(`
      SELECT TOP 10
        u.id_usuario,
        u.nombre + ' ' + u.apellido as nombre,
        u.email,
        COUNT(c.id_compra) as cantidad_compras,
        SUM(c.monto) as total_gastado
      FROM Compras c
      INNER JOIN Usuarios u ON c.id_usuario = u.id_usuario
      GROUP BY u.id_usuario, u.nombre, u.apellido, u.email
      ORDER BY total_gastado DESC
    `);
    
    const stats = statsQuery.recordset[0];
    
    res.render('admin/compras-admin', {
      totalCompras: stats.totalCompras || 0,
      ingresosTotales: (stats.ingresosTotales || 0).toFixed(2),
      comprasMes: stats.comprasMes || 0,
      ticketPromedio: (stats.ticketPromedio || 0).toFixed(2),
      compras: comprasQuery.recordset,
      topVentas: topVentasQuery.recordset.map(v => ({
        ...v,
        rating: (v.rating || 0).toFixed(1)
      })),
      topCompradores: topCompradoresQuery.recordset,
      user: req.session.user
    });
  } catch (err) {
    console.error('Error al cargar compras:', err);
    res.status(500).send('Error al cargar compras: ' + err.message);
  }
});

// GET - Detalles de una compra
router.get('/:id', async (req, res) => {
  try {
    const pool = await connect();
    const { id } = req.params;
    
    const compraQuery = await pool.request()
      .input('id', sql.Int, id)
      .query(`
        SELECT 
          c.*,
          u.nombre + ' ' + u.apellido as usuario_nombre,
          u.email as usuario_email,
          cr.titulo as curso_titulo,
          cr.descripcion as curso_descripcion
        FROM Compras c
        INNER JOIN Usuarios u ON c.id_usuario = u.id_usuario
        INNER JOIN Cursos cr ON c.id_curso = cr.id_curso
        WHERE c.id_compra = @id
      `);
    
    if (compraQuery.recordset.length === 0) {
      return res.status(404).json({ error: 'Compra no encontrada' });
    }
    
    res.json(compraQuery.recordset[0]);
  } catch (err) {
    console.error('Error al obtener compra:', err);
    res.status(500).json({ error: err.message });
  }
});

// POST - Crear nueva compra (manual por admin)
router.post('/', async (req, res) => {
  try {
    const pool = await connect();
    const { id_usuario, id_curso, monto, descripcion, metodo_pago } = req.body;
    
    await pool.request()
      .input('id_usuario', sql.Int, id_usuario)
      .input('id_curso', sql.Int, id_curso)
      .input('monto', sql.Decimal(10, 2), monto)
      .input('descripcion', sql.NVarChar, descripcion || null)
      .input('metodo_pago', sql.NVarChar, metodo_pago || null)
      .query(`
        INSERT INTO Compras (id_usuario, id_curso, monto, descripcion, metodo_pago, fecha_compra)
        VALUES (@id_usuario, @id_curso, @monto, @descripcion, @metodo_pago, GETDATE())
      `);
    
    res.json({ success: true, message: 'Compra registrada exitosamente' });
  } catch (err) {
    console.error('Error al crear compra:', err);
    res.status(500).json({ error: err.message });
  }
});

// DELETE - Eliminar compra (reembolso)
router.delete('/:id', async (req, res) => {
  try {
    const pool = await connect();
    const { id } = req.params;
    
    await pool.request()
      .input('id', sql.Int, id)
      .query('DELETE FROM Compras WHERE id_compra = @id');
    
    res.json({ success: true, message: 'Compra eliminada exitosamente' });
  } catch (err) {
    console.error('Error al eliminar compra:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
