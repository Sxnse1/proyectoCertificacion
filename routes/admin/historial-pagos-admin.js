const express = require('express');
const router = express.Router();
const sql = require('mssql');
const { connect } = require('../../config/database');

// GET - Vista principal de historial de pagos
router.get('/', async (req, res) => {
  try {
    console.log('🔍 [HISTORIAL-PAGOS] Iniciando carga de historial de pagos...');
    const pool = await connect();
    
    // Obtener estadísticas básicas unificadas
    console.log('📊 [HISTORIAL-PAGOS] Consultando estadísticas...');
    const statsQuery = await pool.request().query(`
      SELECT 
        (
          ISNULL((SELECT SUM(monto) FROM Compras), 0) + 
          ISNULL((SELECT SUM(m.precio) FROM Suscripciones s INNER JOIN Membresias m ON s.id_membresia = m.id_membresia), 0)
        ) as totalIngresos,
        (
          ISNULL((SELECT SUM(monto) FROM Compras 
                  WHERE MONTH(fecha_compra) = MONTH(GETDATE()) AND YEAR(fecha_compra) = YEAR(GETDATE())), 0) +
          ISNULL((SELECT SUM(m.precio) FROM Suscripciones s 
                  INNER JOIN Membresias m ON s.id_membresia = m.id_membresia
                  WHERE MONTH(s.fecha_compra) = MONTH(GETDATE()) AND YEAR(s.fecha_compra) = YEAR(GETDATE())), 0)
        ) as ingresosMes,
        (
          (SELECT COUNT(*) FROM Compras) + 
          (SELECT COUNT(*) FROM Suscripciones)
        ) as totalTransacciones,
        (
          (SELECT COUNT(*) FROM Compras) + 
          (SELECT COUNT(*) FROM Suscripciones WHERE estatus IN ('activa', 'expirada'))
        ) * 100.0 / NULLIF(
          (SELECT COUNT(*) FROM Compras) + (SELECT COUNT(*) FROM Suscripciones), 0
        ) as tasaExito
    `);
    console.log('✅ [HISTORIAL-PAGOS] Estadísticas obtenidas:', statsQuery.recordset[0]);
    
    // Obtener filtros de la URL
    const { fechaDesde, fechaHasta } = req.query;
    
    // Construir consulta unificada para compras y suscripciones
    let querySQL = `
      SELECT 
        'compra_' + CAST(c.id_compra as VARCHAR) as id_pago,
        c.id_usuario,
        c.id_compra,
        NULL as id_suscripcion,
        c.monto,
        'exitoso' as estatus,
        c.fecha_compra as fecha_pago,
        u.nombre + ' ' + ISNULL(u.apellido, '') as usuario_nombre,
        u.email as usuario_email,
        'Compra Individual' as tipo_pago,
        ISNULL(cur.titulo, ISNULL(c.descripcion, 'Compra sin descripción')) as concepto,
        ISNULL(c.metodo_pago, 'No especificado') as metodo_pago,
        'compra' as origen
      FROM Compras c
      INNER JOIN Usuarios u ON c.id_usuario = u.id_usuario
      LEFT JOIN Cursos cur ON c.id_curso = cur.id_curso
      
      UNION ALL
      
      SELECT 
        'suscripcion_' + CAST(s.id_suscripcion as VARCHAR) as id_pago,
        s.id_usuario,
        NULL as id_compra,
        s.id_suscripcion,
        m.precio as monto,
        CASE 
          WHEN s.estatus = 'activa' AND s.fecha_vencimiento > GETDATE() THEN 'exitoso'
          WHEN s.estatus = 'cancelada' THEN 'cancelado'
          WHEN s.estatus = 'expirada' OR s.fecha_vencimiento <= GETDATE() THEN 'expirado'
          ELSE 'pendiente'
        END as estatus,
        s.fecha_compra as fecha_pago,
        u2.nombre + ' ' + ISNULL(u2.apellido, '') as usuario_nombre,
        u2.email as usuario_email,
        'Suscripción' as tipo_pago,
        'Membresía: ' + m.nombre as concepto,
        'Suscripción Premium' as metodo_pago,
        'suscripcion' as origen
      FROM Suscripciones s
      INNER JOIN Usuarios u2 ON s.id_usuario = u2.id_usuario
      INNER JOIN Membresias m ON s.id_membresia = m.id_membresia
    `;
    
    const request = pool.request();
    
    // Agregar filtros si existen
    const { tipo } = req.query; // Nuevo filtro por tipo
    let whereConditions = [];
    
    if (fechaDesde) {
      whereConditions.push('(c.fecha_compra >= @fechaDesde OR s.fecha_compra >= @fechaDesde)');
      request.input('fechaDesde', sql.Date, fechaDesde);
    }
    if (fechaHasta) {
      whereConditions.push('(c.fecha_compra <= @fechaHasta OR s.fecha_compra <= @fechaHasta)');
      request.input('fechaHasta', sql.Date, fechaHasta);
    }
    
    // Aplicar filtros usando subconsulta
    if (whereConditions.length > 0 || tipo) {
      let finalQuery = `SELECT * FROM (${querySQL}) as UnifiedPayments WHERE 1=1`;
      
      if (whereConditions.length > 0) {
        finalQuery += ` AND fecha_pago >= ISNULL(@fechaDesde, '1900-01-01') AND fecha_pago <= ISNULL(@fechaHasta, '2100-12-31')`;
      }
      
      if (tipo && tipo !== 'todos') {
        finalQuery += ` AND origen = @tipo`;
        request.input('tipo', sql.VarChar, tipo);
      }
      
      querySQL = finalQuery;
    }
    
    querySQL += ' ORDER BY fecha_pago DESC';
    
    console.log('📋 [HISTORIAL-PAGOS] Consultando pagos...');
    const pagosQuery = await request.query(querySQL);
    console.log('✅ [HISTORIAL-PAGOS] Pagos encontrados:', pagosQuery.recordset.length);
    
    // Obtener distribución por estatus unificada
    console.log('📈 [HISTORIAL-PAGOS] Consultando distribución...');
    const distribucionEstatusQuery = await pool.request().query(`
      SELECT 
        estatus,
        COUNT(*) as cantidad,
        SUM(monto) as total
      FROM (
        SELECT 
          'exitoso' as estatus,
          monto
        FROM Compras
        
        UNION ALL
        
        SELECT 
          CASE 
            WHEN s.estatus = 'activa' AND s.fecha_vencimiento > GETDATE() THEN 'exitoso'
            WHEN s.estatus = 'cancelada' THEN 'cancelado'
            WHEN s.estatus = 'expirada' OR s.fecha_vencimiento <= GETDATE() THEN 'expirado'
            ELSE 'pendiente'
          END as estatus,
          m.precio as monto
        FROM Suscripciones s
        INNER JOIN Membresias m ON s.id_membresia = m.id_membresia
      ) as UnifiedPayments
      GROUP BY estatus
    `);
    
    // Obtener top compradores unificado
    console.log('🏆 [HISTORIAL-PAGOS] Consultando top compradores...');
    const topCompradoresQuery = await pool.request().query(`
      SELECT TOP 10
        u.id_usuario,
        u.nombre + ' ' + ISNULL(u.apellido, '') as nombre,
        u.email,
        ISNULL(compras.cantidad_compras, 0) + ISNULL(suscripciones.cantidad_suscripciones, 0) as cantidad_transacciones,
        ISNULL(compras.total_compras, 0) + ISNULL(suscripciones.total_suscripciones, 0) as total_gastado,
        ISNULL(compras.cantidad_compras, 0) as compras_individuales,
        ISNULL(suscripciones.cantidad_suscripciones, 0) as suscripciones_activas
      FROM Usuarios u
      LEFT JOIN (
        SELECT 
          id_usuario,
          COUNT(*) as cantidad_compras,
          SUM(monto) as total_compras
        FROM Compras
        GROUP BY id_usuario
      ) compras ON u.id_usuario = compras.id_usuario
      LEFT JOIN (
        SELECT 
          s.id_usuario,
          COUNT(*) as cantidad_suscripciones,
          SUM(m.precio) as total_suscripciones
        FROM Suscripciones s
        INNER JOIN Membresias m ON s.id_membresia = m.id_membresia
        GROUP BY s.id_usuario
      ) suscripciones ON u.id_usuario = suscripciones.id_usuario
      WHERE (compras.id_usuario IS NOT NULL OR suscripciones.id_usuario IS NOT NULL)
      ORDER BY total_gastado DESC
    `);
    
    const stats = statsQuery.recordset[0];
    console.log('🎯 [HISTORIAL-PAGOS] Renderizando vista...');
    
    // Test temporal - devolver JSON en lugar de renderizar
    if (req.query.test === 'json') {
      return res.json({
        title: 'Historial de Pagos',
        stats: {
          totalIngresos: (stats.totalIngresos || 0).toFixed(2),
          ingresosMes: (stats.ingresosMes || 0).toFixed(2),
          totalTransacciones: stats.totalTransacciones || 0,
          tasaExito: (stats.tasaExito || 0).toFixed(1)
        },
        pagos: pagosQuery.recordset.slice(0, 3), // Solo los primeros 3 para debug
        distribucionEstatus: distribucionEstatusQuery.recordset,
        topCompradores: topCompradoresQuery.recordset.slice(0, 2)
      });
    }
    
    try {
      res.render('admin/historial-pagos-admin', {
        title: 'Historial de Pagos',
        stats: {
          totalIngresos: (stats.totalIngresos || 0).toFixed(2),
          ingresosMes: (stats.ingresosMes || 0).toFixed(2),
          totalTransacciones: stats.totalTransacciones || 0,
          tasaExito: (stats.tasaExito || 0).toFixed(1)
        },
        pagos: pagosQuery.recordset,
        distribucionEstatus: distribucionEstatusQuery.recordset,
        topCompradores: topCompradoresQuery.recordset,
        filtros: {
          fechaDesde: req.query.fechaDesde || '',
          fechaHasta: req.query.fechaHasta || '',
          tipo: req.query.tipo || 'todos'
        },
        userName: req.session.user?.nombre || 'Admin',
        userRole: req.session.user?.rol || 'admin'
      });
    } catch (renderError) {
      console.error('❌ [HISTORIAL-PAGOS] Error en render:', renderError);
      throw renderError;
    }
  } catch (err) {
    console.error('❌ [HISTORIAL-PAGOS] Error completo:', err);
    console.error('❌ [HISTORIAL-PAGOS] Stack trace:', err.stack);
    res.status(500).send('Error al cargar historial de pagos: ' + err.message);
  }
});

// GET - Detalles de un pago (compra o suscripción)
router.get('/:id', async (req, res) => {
  try {
    const pool = await connect();
    const { id } = req.params;
    
    // Determinar si es compra o suscripción por el prefijo
    let pagoQuery;
    
    if (id.startsWith('compra_')) {
      const compraId = id.replace('compra_', '');
      pagoQuery = await pool.request()
        .input('id', sql.Int, compraId)
        .query(`
          SELECT 
            'compra_' + CAST(c.id_compra as VARCHAR) as id_pago,
            c.id_usuario,
            c.monto,
            c.descripcion,
            c.metodo_pago,
            c.fecha_compra as fecha_pago,
            'exitoso' as estatus,
            u.nombre + ' ' + ISNULL(u.apellido, '') as usuario_nombre,
            u.email as usuario_email,
            ISNULL(cur.titulo, c.descripcion) as concepto,
            'Compra Individual' as tipo_pago,
            'compra' as origen,
            cur.titulo as curso_titulo,
            NULL as membresia_nombre,
            NULL as fecha_vencimiento
          FROM Compras c
          INNER JOIN Usuarios u ON c.id_usuario = u.id_usuario
          LEFT JOIN Cursos cur ON c.id_curso = cur.id_curso
          WHERE c.id_compra = @id
        `);
    } else if (id.startsWith('suscripcion_')) {
      const suscripcionId = id.replace('suscripcion_', '');
      pagoQuery = await pool.request()
        .input('id', sql.Int, suscripcionId)
        .query(`
          SELECT 
            'suscripcion_' + CAST(s.id_suscripcion as VARCHAR) as id_pago,
            s.id_usuario,
            m.precio as monto,
            'Suscripción a membresía premium' as descripcion,
            'Suscripción Premium' as metodo_pago,
            s.fecha_compra as fecha_pago,
            CASE 
              WHEN s.estatus = 'activa' AND s.fecha_vencimiento > GETDATE() THEN 'exitoso'
              WHEN s.estatus = 'cancelada' THEN 'cancelado'
              WHEN s.estatus = 'expirada' OR s.fecha_vencimiento <= GETDATE() THEN 'expirado'
              ELSE 'pendiente'
            END as estatus,
            u.nombre + ' ' + ISNULL(u.apellido, '') as usuario_nombre,
            u.email as usuario_email,
            'Membresía: ' + m.nombre as concepto,
            'Suscripción' as tipo_pago,
            'suscripcion' as origen,
            NULL as curso_titulo,
            m.nombre as membresia_nombre,
            s.fecha_vencimiento
          FROM Suscripciones s
          INNER JOIN Usuarios u ON s.id_usuario = u.id_usuario
          INNER JOIN Membresias m ON s.id_membresia = m.id_membresia
          WHERE s.id_suscripcion = @id
        `);
    } else {
      return res.status(400).json({ error: 'ID de pago inválido' });
    }
    
    if (pagoQuery.recordset.length === 0) {
      return res.status(404).json({ error: 'Pago no encontrado' });
    }
    
    res.json(pagoQuery.recordset[0]);
  } catch (err) {
    console.error('Error al obtener pago:', err);
    res.status(500).json({ error: err.message });
  }
});

// PUT - Actualizar descripción de pago (compra o suscripción)
router.put('/:id', async (req, res) => {
  try {
    const pool = await connect();
    const { id } = req.params;
    const { descripcion, estatus } = req.body;
    
    if (id.startsWith('compra_')) {
      const compraId = id.replace('compra_', '');
      await pool.request()
        .input('id', sql.Int, compraId)
        .input('descripcion', sql.NVarChar, descripcion)
        .query(`
          UPDATE Compras 
          SET descripcion = @descripcion
          WHERE id_compra = @id
        `);
    } else if (id.startsWith('suscripcion_')) {
      const suscripcionId = id.replace('suscripcion_', '');
      
      // Para suscripciones, podemos actualizar el estatus si se proporciona
      let updateQuery = '';
      const request = pool.request()
        .input('id', sql.Int, suscripcionId);
      
      if (estatus && ['activa', 'cancelada', 'expirada'].includes(estatus)) {
        updateQuery = `UPDATE Suscripciones SET estatus = @estatus WHERE id_suscripcion = @id`;
        request.input('estatus', sql.VarChar, estatus);
      } else {
        return res.status(400).json({ error: 'Solo se puede actualizar el estatus de suscripciones a: activa, cancelada, expirada' });
      }
      
      await request.query(updateQuery);
    } else {
      return res.status(400).json({ error: 'ID de pago inválido' });
    }
    
    res.json({ success: true, message: 'Pago actualizado exitosamente' });
  } catch (err) {
    console.error('Error al actualizar pago:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
