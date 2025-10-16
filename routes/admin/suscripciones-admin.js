const express = require('express');
const router = express.Router();
const sql = require('mssql');
const { connect } = require('../../config/database');

// GET - Vista principal de suscripciones
router.get('/', async (req, res) => {
  try {
    const pool = await connect();
    
    // Obtener estadísticas completas
    const statsQuery = await pool.request().query(`
      SELECT 
        COUNT(*) as totalSuscripciones,
        SUM(CASE WHEN estatus = 'activa' AND fecha_vencimiento > GETDATE() THEN 1 ELSE 0 END) as suscripcionesActivas,
        SUM(CASE WHEN estatus = 'cancelada' THEN 1 ELSE 0 END) as suscripcionesCanceladas,
        SUM(CASE WHEN estatus = 'activa' AND fecha_vencimiento <= GETDATE() THEN 1 ELSE 0 END) as suscripcionesExpiradas,
        SUM(CASE WHEN estatus = 'pausada' THEN 1 ELSE 0 END) as suscripcionesPausadas,
        SUM(CASE WHEN estatus = 'activa' AND DATEDIFF(day, GETDATE(), fecha_vencimiento) <= 7 AND fecha_vencimiento > GETDATE() THEN 1 ELSE 0 END) as proximasExpirar,
        (SELECT SUM(m.precio) FROM Suscripciones s 
         INNER JOIN Membresias m ON s.id_membresia = m.id_membresia 
         WHERE s.estatus = 'activa' AND s.fecha_vencimiento > GETDATE()) as ingresosMensuales,
        (SELECT SUM(m.precio) FROM Suscripciones s 
         INNER JOIN Membresias m ON s.id_membresia = m.id_membresia 
         WHERE s.fecha_compra >= DATEADD(month, -1, GETDATE())) as ingresosUltimoMes,
        (SELECT COUNT(DISTINCT id_usuario) FROM Suscripciones WHERE estatus = 'activa') as usuariosActivos
      FROM Suscripciones
    `);
    
    // Filtros de búsqueda
    const search = req.query.search || '';
    const estatusFilter = req.query.estatus || '';
    const membresiaFilter = req.query.membresia || '';
    
    // Construir query con filtros
    let whereClause = '';
    let parameters = {};
    
    if (search || estatusFilter || membresiaFilter) {
      let conditions = [];
      
      if (search) {
        conditions.push("(u.nombre LIKE @search OR u.email LIKE @search)");
        parameters.search = `%${search}%`;
      }
      
      if (estatusFilter) {
        conditions.push("s.estatus = @estatus");
        parameters.estatus = estatusFilter;
      }
      
      if (membresiaFilter) {
        conditions.push("s.id_membresia = @membresia");
        parameters.membresia = parseInt(membresiaFilter);
      }
      
      whereClause = 'WHERE ' + conditions.join(' AND ');
    }

    // Obtener todas las suscripciones con datos de usuario y membresía
    const suscripcionesQuery = await pool.request()
      .input('search', sql.NVarChar, parameters.search || '')
      .input('estatus', sql.VarChar, parameters.estatus || '')
      .input('membresia', sql.Int, parameters.membresia || 0)
      .query(`
        SELECT 
          s.id_suscripcion,
          s.id_usuario,
          s.id_membresia,
          s.fecha_compra,
          s.fecha_vencimiento,
          s.estatus,
          m.precio as precio,
          u.nombre as nombre_usuario,
          u.apellido as apellido_usuario,
          u.email as email_usuario,
          u.fecha_registro as fecha_registro_usuario,
          m.nombre as nombre_membresia,
          m.tipo_periodo as tipo_periodo,
          m.descripcion as descripcion_membresia,
          DATEDIFF(day, GETDATE(), s.fecha_vencimiento) as dias_restantes,
          CASE 
            WHEN s.estatus = 'activa' AND s.fecha_vencimiento > GETDATE() THEN 'Activa'
            WHEN s.estatus = 'activa' AND s.fecha_vencimiento <= GETDATE() THEN 'Expirada'
            WHEN s.estatus = 'cancelada' THEN 'Cancelada'
            WHEN s.estatus = 'pausada' THEN 'Pausada'
            ELSE 'Inactiva'
          END as estado_display,
          CASE 
            WHEN s.estatus = 'activa' AND DATEDIFF(day, GETDATE(), s.fecha_vencimiento) <= 7 THEN 'warning'
            WHEN s.estatus = 'activa' AND s.fecha_vencimiento > GETDATE() THEN 'success'
            WHEN s.estatus = 'cancelada' THEN 'danger'
            ELSE 'secondary'
          END as badge_class
        FROM Suscripciones s
        INNER JOIN Usuarios u ON s.id_usuario = u.id_usuario
        INNER JOIN Membresias m ON s.id_membresia = m.id_membresia
        ${whereClause}
        ORDER BY 
          CASE s.estatus 
            WHEN 'activa' THEN 1 
            WHEN 'pausada' THEN 2 
            WHEN 'expirada' THEN 3 
            ELSE 4 
          END,
          s.fecha_vencimiento DESC
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

// POST - Pausar suscripción
router.post('/:id/pausar', async (req, res) => {
  const { id } = req.params;
  
  try {
    const pool = await sql.connect(config);
    
    await pool.request()
      .input('id', sql.Int, id)
      .query(`
        UPDATE Suscripciones 
        SET estatus = 'pausada'
        WHERE id_suscripcion = @id AND estatus = 'activa'
      `);
    
    res.json({ success: true, message: 'Suscripción pausada exitosamente' });
  } catch (err) {
    console.error('Error al pausar suscripción:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST - Reanudar suscripción
router.post('/:id/reanudar', async (req, res) => {
  const { id } = req.params;
  
  try {
    const pool = await sql.connect(config);
    
    await pool.request()
      .input('id', sql.Int, id)
      .query(`
        UPDATE Suscripciones 
        SET estatus = 'activa'
        WHERE id_suscripcion = @id AND estatus = 'pausada'
      `);
    
    res.json({ success: true, message: 'Suscripción reanudada exitosamente' });
  } catch (err) {
    console.error('Error al reanudar suscripción:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST - Extender vencimiento
router.post('/:id/extender', async (req, res) => {
  const { id } = req.params;
  const { dias } = req.body;
  
  if (!dias || dias <= 0) {
    return res.status(400).json({ success: false, error: 'Número de días inválido' });
  }
  
  try {
    const pool = await sql.connect(config);
    
    await pool.request()
      .input('id', sql.Int, id)
      .input('dias', sql.Int, dias)
      .query(`
        UPDATE Suscripciones 
        SET fecha_vencimiento = DATEADD(DAY, @dias, fecha_vencimiento)
        WHERE id_suscripcion = @id
      `);
    
    res.json({ success: true, message: `Suscripción extendida ${dias} días exitosamente` });
  } catch (err) {
    console.error('Error al extender suscripción:', err);
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

module.exports = router;
