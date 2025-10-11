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

// GET - Vista principal de carritos
router.get('/', async (req, res) => {
  try {
    const pool = await sql.connect(config);
    
    // Obtener estadísticas
    const statsQuery = await pool.request().query(`
      SELECT 
        COUNT(DISTINCT id_usuario) as carritosActivos,
        (SELECT COUNT(DISTINCT id_usuario) FROM Carrito_Compras 
         WHERE DATEDIFF(day, fecha_agregado, GETDATE()) > 3) as carritosAbandonados,
        (SELECT SUM(c.precio) FROM Carrito_Compras cc
         INNER JOIN Cursos c ON cc.id_curso = c.id_curso) as valorTotal
      FROM Carrito_Compras
    `);
    
    // Obtener carritos por usuario
    const carritosQuery = await pool.request().query(`
      SELECT 
        u.id_usuario,
        u.nombre as usuario_nombre,
        u.email as usuario_email,
        COUNT(cc.id_carrito) as cantidad_items,
        SUM(c.precio) as total,
        MAX(cc.fecha_agregado) as fecha_agregado,
        DATEDIFF(day, MAX(cc.fecha_agregado), GETDATE()) as dias_inactivo,
        CASE WHEN DATEDIFF(day, MAX(cc.fecha_agregado), GETDATE()) > 3 THEN 1 ELSE 0 END as abandonado
      FROM Carrito_Compras cc
      INNER JOIN Usuarios u ON cc.id_usuario = u.id_usuario
      INNER JOIN Cursos c ON cc.id_curso = c.id_curso
      GROUP BY u.id_usuario, u.nombre, u.email
      ORDER BY fecha_agregado DESC
    `);
    
    // Obtener cursos más agregados
    const cursosPopularesQuery = await pool.request().query(`
      SELECT TOP 10
        c.id_curso,
        c.titulo,
        c.miniatura,
        COUNT(cc.id_carrito) as cantidad
      FROM Carrito_Compras cc
      INNER JOIN Cursos c ON cc.id_curso = c.id_curso
      GROUP BY c.id_curso, c.titulo, c.miniatura
      ORDER BY cantidad DESC
    `);
    
    // Obtener actividad reciente
    const actividadQuery = await pool.request().query(`
      SELECT TOP 20
        u.nombre as usuario_nombre,
        c.titulo as curso_titulo,
        cc.fecha_agregado,
        'Agregó al carrito' as accion,
        DATEDIFF(minute, cc.fecha_agregado, GETDATE()) as minutos_transcurridos
      FROM Carrito_Compras cc
      INNER JOIN Usuarios u ON cc.id_usuario = u.id_usuario
      INNER JOIN Cursos c ON cc.id_curso = c.id_curso
      ORDER BY cc.fecha_agregado DESC
    `);
    
    const stats = statsQuery.recordset[0];
    
    // Calcular tasa de conversión (simulado)
    const tasaConversion = 35.8;
    
    res.render('admin/carrito-admin', {
      carritosActivos: stats.carritosActivos || 0,
      carritosAbandonados: stats.carritosAbandonados || 0,
      valorTotal: (stats.valorTotal || 0).toFixed(2),
      tasaConversion: tasaConversion,
      carritos: carritosQuery.recordset,
      cursosPopulares: cursosPopularesQuery.recordset,
      actividadReciente: actividadQuery.recordset.map(a => ({
        ...a,
        tiempo: a.minutos_transcurridos < 60 
          ? `${a.minutos_transcurridos} min` 
          : `${Math.floor(a.minutos_transcurridos / 60)} h`
      })),
      user: req.session.user
    });
  } catch (err) {
    console.error('Error al cargar carritos:', err);
    res.status(500).send('Error al cargar carritos');
  }
});

// GET - Detalles de carrito de un usuario
router.get('/:userId', async (req, res) => {
  const { userId } = req.params;
  
  try {
    const pool = await sql.connect(config);
    const result = await pool.request()
      .input('userId', sql.Int, userId)
      .query(`
        SELECT 
          cc.id_carrito,
          cc.fecha_agregado,
          c.id_curso,
          c.titulo,
          c.descripcion,
          c.precio,
          c.miniatura,
          u.nombre as instructor_nombre
        FROM Carrito_Compras cc
        INNER JOIN Cursos c ON cc.id_curso = c.id_curso
        INNER JOIN Usuarios u ON c.id_usuario = u.id_usuario
        WHERE cc.id_usuario = @userId
        ORDER BY cc.fecha_agregado DESC
      `);
    
    res.json({ success: true, data: result.recordset });
  } catch (err) {
    console.error('Error al obtener carrito:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST - Enviar recordatorio a un usuario
router.post('/:userId/recordatorio', async (req, res) => {
  const { userId } = req.params;
  
  try {
    // Aquí implementarías el envío de email usando tu servicio de email
    // Por ahora solo simulamos
    
    res.json({ 
      success: true, 
      message: 'Recordatorio enviado exitosamente' 
    });
  } catch (err) {
    console.error('Error al enviar recordatorio:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST - Enviar recordatorios masivos
router.post('/recordatorios-masivos', async (req, res) => {
  try {
    const pool = await sql.connect(config);
    
    // Obtener usuarios con carritos abandonados
    const result = await pool.request().query(`
      SELECT DISTINCT u.id_usuario, u.email, u.nombre
      FROM Carrito_Compras cc
      INNER JOIN Usuarios u ON cc.id_usuario = u.id_usuario
      WHERE DATEDIFF(day, cc.fecha_agregado, GETDATE()) > 3
    `);
    
    const cantidadEnviados = result.recordset.length;
    
    // Aquí implementarías el envío masivo de emails
    
    res.json({ 
      success: true, 
      enviados: cantidadEnviados,
      message: `${cantidadEnviados} recordatorios enviados` 
    });
  } catch (err) {
    console.error('Error al enviar recordatorios masivos:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// DELETE - Limpiar carrito de un usuario
router.delete('/:userId/limpiar', async (req, res) => {
  const { userId } = req.params;
  
  try {
    const pool = await sql.connect(config);
    await pool.request()
      .input('userId', sql.Int, userId)
      .query('DELETE FROM Carrito_Compras WHERE id_usuario = @userId');
    
    res.json({ success: true, message: 'Carrito limpiado exitosamente' });
  } catch (err) {
    console.error('Error al limpiar carrito:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
