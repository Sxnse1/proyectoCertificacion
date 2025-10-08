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

// GET - Vista principal de compras
router.get('/', async (req, res) => {
  try {
    const pool = await sql.connect(config);
    
    // Obtener estadísticas
    const statsQuery = await pool.request().query(`
      SELECT 
        COUNT(*) as totalCompras,
        SUM(total) as ingresosTotales,
        (SELECT COUNT(*) FROM Compras 
         WHERE MONTH(fecha_compra) = MONTH(GETDATE()) 
         AND YEAR(fecha_compra) = YEAR(GETDATE())) as comprasMes,
        AVG(total) as ticketPromedio
      FROM Compras
    `);
    
    // Obtener todas las compras
    const comprasQuery = await pool.request().query(`
      SELECT 
        c.id_compra,
        c.id_usuario,
        c.id_curso,
        c.id_suscripcion,
        c.precio,
        c.descuento,
        c.total,
        c.fecha_compra,
        u.nombre as usuario_nombre,
        u.email as usuario_email,
        CASE 
          WHEN c.id_curso IS NOT NULL THEN 'curso'
          WHEN c.id_suscripcion IS NOT NULL THEN 'suscripcion'
          ELSE 'otro'
        END as tipo_compra,
        CASE 
          WHEN c.id_curso IS NOT NULL THEN cur.titulo
          WHEN c.id_suscripcion IS NOT NULL THEN m.nombre
          ELSE 'N/A'
        END as producto_nombre,
        CASE 
          WHEN c.id_curso IS NOT NULL THEN cur.imagen
          ELSE NULL
        END as producto_imagen
      FROM Compras c
      INNER JOIN Usuarios u ON c.id_usuario = u.id_usuario
      LEFT JOIN Cursos cur ON c.id_curso = cur.id_curso
      LEFT JOIN Suscripciones s ON c.id_suscripcion = s.id_suscripcion
      LEFT JOIN Membresias m ON s.id_membresia = m.id_membresia
      ORDER BY c.fecha_compra DESC
    `);
    
    // Top ventas por curso
    const topVentasQuery = await pool.request().query(`
      SELECT TOP 10
        c.id_curso,
        c.titulo,
        c.imagen,
        inst.nombre as instructor_nombre,
        COUNT(comp.id_compra) as cantidad_ventas,
        SUM(comp.total) as ingresos,
        AVG(ISNULL(v.calificacion, 0)) as rating
      FROM Compras comp
      INNER JOIN Cursos c ON comp.id_curso = c.id_curso
      INNER JOIN Usuarios inst ON c.id_instructor = inst.id_usuario
      LEFT JOIN Valoraciones v ON c.id_curso = v.id_curso
      WHERE comp.id_curso IS NOT NULL
      GROUP BY c.id_curso, c.titulo, c.imagen, inst.nombre
      ORDER BY cantidad_ventas DESC
    `);
    
    // Top compradores
    const topCompradoresQuery = await pool.request().query(`
      SELECT TOP 10
        u.id_usuario,
        u.nombre,
        COUNT(c.id_compra) as cantidad_compras,
        SUM(c.total) as total_gastado
      FROM Compras c
      INNER JOIN Usuarios u ON c.id_usuario = u.id_usuario
      GROUP BY u.id_usuario, u.nombre
      ORDER BY total_gastado DESC
    `);
    
    // Actividad reciente
    const actividadQuery = await pool.request().query(`
      SELECT TOP 20
        u.nombre as usuario_nombre,
        CASE 
          WHEN c.id_curso IS NOT NULL THEN cur.titulo
          WHEN c.id_suscripcion IS NOT NULL THEN m.nombre
          ELSE 'Producto'
        END as producto_nombre,
        comp.total as monto,
        comp.fecha_compra,
        DATEDIFF(minute, comp.fecha_compra, GETDATE()) as minutos_transcurridos
      FROM Compras comp
      INNER JOIN Usuarios u ON comp.id_usuario = u.id_usuario
      LEFT JOIN Cursos cur ON comp.id_curso = cur.id_curso
      LEFT JOIN Suscripciones s ON comp.id_suscripcion = s.id_suscripcion
      LEFT JOIN Membresias m ON s.id_membresia = m.id_membresia
      ORDER BY comp.fecha_compra DESC
    `);
    
    const stats = statsQuery.recordset[0];
    
    // Calcular porcentajes de distribución
    const totalComprasConCurso = comprasQuery.recordset.filter(c => c.tipo_compra === 'curso').length;
    const totalComprasConSuscripcion = comprasQuery.recordset.filter(c => c.tipo_compra === 'suscripcion').length;
    const totalComprasTotal = comprasQuery.recordset.length || 1;
    
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
      actividadReciente: actividadQuery.recordset.map(a => ({
        ...a,
        tiempo: a.minutos_transcurridos < 60 
          ? `${a.minutos_transcurridos} min` 
          : `${Math.floor(a.minutos_transcurridos / 60)} h`
      })),
      porcentajeCursos: ((totalComprasConCurso / totalComprasTotal) * 100).toFixed(1),
      porcentajeSuscripciones: ((totalComprasConSuscripcion / totalComprasTotal) * 100).toFixed(1),
      crecimiento: 15.3,
      horarioPico: '14:00 - 16:00',
      user: req.session.user
    });
  } catch (err) {
    console.error('Error al cargar compras:', err);
    res.status(500).send('Error al cargar compras');
  }
});

// GET - Detalles de una compra
router.get('/:id', async (req, res) => {
  const { id } = req.params;
  
  try {
    const pool = await sql.connect(config);
    const result = await pool.request()
      .input('id', sql.Int, id)
      .query(`
        SELECT 
          c.*,
          u.nombre as usuario_nombre,
          u.email as usuario_email,
          u.telefono as usuario_telefono,
          cur.titulo as curso_titulo,
          m.nombre as membresia_nombre
        FROM Compras c
        INNER JOIN Usuarios u ON c.id_usuario = u.id_usuario
        LEFT JOIN Cursos cur ON c.id_curso = cur.id_curso
        LEFT JOIN Suscripciones s ON c.id_suscripcion = s.id_suscripcion
        LEFT JOIN Membresias m ON s.id_membresia = m.id_membresia
        WHERE c.id_compra = @id
      `);
    
    if (result.recordset.length === 0) {
      return res.status(404).json({ success: false, error: 'Compra no encontrada' });
    }
    
    res.json({ success: true, data: result.recordset[0] });
  } catch (err) {
    console.error('Error al obtener compra:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET - Descargar factura
router.get('/:id/factura', async (req, res) => {
  const { id } = req.params;
  
  try {
    // Aquí implementarías la generación de la factura en PDF
    res.json({ 
      success: true, 
      message: 'Generación de factura en desarrollo',
      compraId: id
    });
  } catch (err) {
    console.error('Error al generar factura:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST - Procesar reembolso
router.post('/:id/reembolso', async (req, res) => {
  const { id } = req.params;
  const { motivo } = req.body;
  
  try {
    const pool = await sql.connect(config);
    
    // Obtener información de la compra
    const compraQuery = await pool.request()
      .input('id', sql.Int, id)
      .query('SELECT * FROM Compras WHERE id_compra = @id');
    
    if (compraQuery.recordset.length === 0) {
      return res.status(404).json({ success: false, error: 'Compra no encontrada' });
    }
    
    const compra = compraQuery.recordset[0];
    
    // Aquí implementarías la lógica de reembolso
    // - Actualizar el estado del pago en Historial_Pagos
    // - Revocar acceso al curso/suscripción
    // - Registrar el motivo del reembolso
    
    await pool.request()
      .input('compraId', sql.Int, id)
      .query(`
        UPDATE Historial_Pagos 
        SET estatus = 'reembolsado'
        WHERE id_compra = @compraId
      `);
    
    // Si es un curso, remover acceso
    if (compra.id_curso) {
      await pool.request()
        .input('usuario', sql.Int, compra.id_usuario)
        .input('curso', sql.Int, compra.id_curso)
        .query(`
          DELETE FROM Progreso 
          WHERE id_usuario = @usuario AND id_curso = @curso
        `);
    }
    
    res.json({ 
      success: true, 
      message: 'Reembolso procesado exitosamente',
      monto: compra.total
    });
  } catch (err) {
    console.error('Error al procesar reembolso:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET - Exportar a Excel
router.get('/exportar/excel', async (req, res) => {
  try {
    const pool = await sql.connect(config);
    const result = await pool.request().query(`
      SELECT 
        c.id_compra,
        u.nombre as usuario,
        u.email,
        CASE 
          WHEN c.id_curso IS NOT NULL THEN cur.titulo
          WHEN c.id_suscripcion IS NOT NULL THEN m.nombre
          ELSE 'N/A'
        END as producto,
        c.precio,
        c.descuento,
        c.total,
        c.fecha_compra
      FROM Compras c
      INNER JOIN Usuarios u ON c.id_usuario = u.id_usuario
      LEFT JOIN Cursos cur ON c.id_curso = cur.id_curso
      LEFT JOIN Suscripciones s ON c.id_suscripcion = s.id_suscripcion
      LEFT JOIN Membresias m ON s.id_membresia = m.id_membresia
      ORDER BY c.fecha_compra DESC
    `);
    
    res.json({ success: true, data: result.recordset });
  } catch (err) {
    console.error('Error al exportar:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET - Exportar a PDF
router.get('/exportar/pdf', async (req, res) => {
  try {
    res.json({ 
      success: true, 
      message: 'Exportación a PDF en desarrollo'
    });
  } catch (err) {
    console.error('Error al exportar:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET - Generar reporte detallado
router.get('/reporte', async (req, res) => {
  try {
    const pool = await sql.connect(config);
    
    // Reporte completo con múltiples estadísticas
    const reporteQuery = await pool.request().query(`
      SELECT 
        (SELECT COUNT(*) FROM Compras) as total_compras,
        (SELECT SUM(total) FROM Compras) as ingresos_totales,
        (SELECT AVG(total) FROM Compras) as ticket_promedio,
        (SELECT COUNT(DISTINCT id_usuario) FROM Compras) as clientes_unicos,
        (SELECT COUNT(*) FROM Compras WHERE id_curso IS NOT NULL) as compras_cursos,
        (SELECT COUNT(*) FROM Compras WHERE id_suscripcion IS NOT NULL) as compras_suscripciones
    `);
    
    res.json({ 
      success: true, 
      reporte: reporteQuery.recordset[0]
    });
  } catch (err) {
    console.error('Error al generar reporte:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
