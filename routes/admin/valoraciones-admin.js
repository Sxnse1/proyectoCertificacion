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

// GET - Vista principal de valoraciones
router.get('/', async (req, res) => {
  try {
    const pool = await sql.connect(config);
    
    // Obtener estadísticas
    const statsQuery = await pool.request().query(`
      SELECT 
        COUNT(*) as totalValoraciones,
        (SELECT COUNT(*) FROM Valoraciones WHERE estatus = 'pendiente') as pendientesModeracion,
        AVG(CAST(calificacion AS FLOAT)) as promedioGeneral,
        (SELECT COUNT(*) FROM Valoraciones 
         WHERE MONTH(fecha) = MONTH(GETDATE()) 
         AND YEAR(fecha) = YEAR(GETDATE())) as valoracionesMes
      FROM Valoraciones
    `);
    
    // Obtener todas las valoraciones
    const valoracionesQuery = await pool.request().query(`
      SELECT 
        v.id_valoracion,
        v.id_usuario,
        v.id_curso,
        v.calificacion,
        v.comentario,
        v.fecha,
        v.estatus,
        u.nombre as usuario_nombre,
        UPPER(LEFT(u.nombre, 1)) + UPPER(LEFT(SUBSTRING(u.nombre, CHARINDEX(' ', u.nombre) + 1, LEN(u.nombre)), 1)) as iniciales,
        c.titulo as curso_titulo,
        c.imagen as curso_imagen,
        inst.nombre as instructor_nombre
      FROM Valoraciones v
      INNER JOIN Usuarios u ON v.id_usuario = u.id_usuario
      INNER JOIN Cursos c ON v.id_curso = c.id_curso
      INNER JOIN Usuarios inst ON c.id_instructor = inst.id_usuario
      ORDER BY v.fecha DESC
    `);
    
    // Obtener cursos para filtros
    const cursosQuery = await pool.request().query(`
      SELECT id_curso, titulo FROM Cursos ORDER BY titulo
    `);
    
    // Distribución de ratings
    const distribucionQuery = await pool.request().query(`
      SELECT 
        calificacion as estrellas,
        COUNT(*) as cantidad,
        (COUNT(*) * 100.0 / (SELECT COUNT(*) FROM Valoraciones)) as porcentaje
      FROM Valoraciones
      GROUP BY calificacion
      ORDER BY calificacion DESC
    `);
    
    // Cursos mejor valorados
    const mejorValoradosQuery = await pool.request().query(`
      SELECT TOP 10
        c.id_curso,
        c.titulo,
        c.imagen,
        AVG(CAST(v.calificacion AS FLOAT)) as rating,
        COUNT(v.id_valoracion) as cantidad_reviews
      FROM Cursos c
      INNER JOIN Valoraciones v ON c.id_curso = v.id_curso
      WHERE v.estatus = 'aprobada'
      GROUP BY c.id_curso, c.titulo, c.imagen
      ORDER BY rating DESC, cantidad_reviews DESC
    `);
    
    // Cursos con rating bajo
    const ratingBajoQuery = await pool.request().query(`
      SELECT TOP 5
        c.id_curso,
        c.titulo,
        AVG(CAST(v.calificacion AS FLOAT)) as rating
      FROM Cursos c
      INNER JOIN Valoraciones v ON c.id_curso = v.id_curso
      WHERE v.estatus = 'aprobada'
      GROUP BY c.id_curso, c.titulo
      HAVING AVG(CAST(v.calificacion AS FLOAT)) < 3.0
      ORDER BY rating ASC
    `);
    
    const stats = statsQuery.recordset[0];
    
    // Calcular estadísticas adicionales
    const totalValoraciones = stats.totalValoraciones || 1;
    const aprobadas = valoracionesQuery.recordset.filter(v => v.estatus === 'aprobada').length;
    const positivas = valoracionesQuery.recordset.filter(v => v.calificacion >= 4 && v.estatus === 'aprobada').length;
    
    res.render('admin/valoraciones-admin', {
      totalValoraciones: stats.totalValoraciones || 0,
      pendientesModeracion: stats.pendientesModeracion || 0,
      promedioGeneral: (stats.promedioGeneral || 0).toFixed(1),
      valoracionesMes: stats.valoracionesMes || 0,
      valoraciones: valoracionesQuery.recordset,
      cursos: cursosQuery.recordset,
      distribucionRatings: distribucionQuery.recordset.map(d => ({
        ...d,
        porcentaje: d.porcentaje.toFixed(1)
      })),
      cursosMejorValorados: mejorValoradosQuery.recordset.map(c => ({
        ...c,
        rating: c.rating.toFixed(1)
      })),
      cursosRatingBajo: ratingBajoQuery.recordset.map(c => ({
        ...c,
        rating: c.rating.toFixed(1)
      })),
      tasaAprobacion: ((aprobadas / totalValoraciones) * 100).toFixed(1),
      porcentajePositivas: ((positivas / totalValoraciones) * 100).toFixed(1),
      tiempoPromedioRespuesta: 2.5,
      user: req.session.user
    });
  } catch (err) {
    console.error('Error al cargar valoraciones:', err);
    res.status(500).send('Error al cargar valoraciones');
  }
});

// GET - Detalles de una valoración
router.get('/:id', async (req, res) => {
  const { id } = req.params;
  
  try {
    const pool = await sql.connect(config);
    const result = await pool.request()
      .input('id', sql.Int, id)
      .query(`
        SELECT 
          v.*,
          u.nombre as usuario_nombre,
          u.email as usuario_email,
          c.titulo as curso_titulo,
          inst.nombre as instructor_nombre
        FROM Valoraciones v
        INNER JOIN Usuarios u ON v.id_usuario = u.id_usuario
        INNER JOIN Cursos c ON v.id_curso = c.id_curso
        INNER JOIN Usuarios inst ON c.id_instructor = inst.id_usuario
        WHERE v.id_valoracion = @id
      `);
    
    if (result.recordset.length === 0) {
      return res.status(404).json({ success: false, error: 'Valoración no encontrada' });
    }
    
    res.json({ success: true, data: result.recordset[0] });
  } catch (err) {
    console.error('Error al obtener valoración:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST - Aprobar valoración
router.post('/:id/aprobar', async (req, res) => {
  const { id } = req.params;
  
  try {
    const pool = await sql.connect(config);
    await pool.request()
      .input('id', sql.Int, id)
      .query(`
        UPDATE Valoraciones 
        SET estatus = 'aprobada'
        WHERE id_valoracion = @id
      `);
    
    res.json({ success: true, message: 'Valoración aprobada exitosamente' });
  } catch (err) {
    console.error('Error al aprobar valoración:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST - Rechazar valoración
router.post('/:id/rechazar', async (req, res) => {
  const { id } = req.params;
  const { motivo } = req.body;
  
  try {
    const pool = await sql.connect(config);
    await pool.request()
      .input('id', sql.Int, id)
      .query(`
        UPDATE Valoraciones 
        SET estatus = 'rechazada'
        WHERE id_valoracion = @id
      `);
    
    // Aquí podrías guardar el motivo en una tabla de auditoría
    // y notificar al usuario si es necesario
    
    res.json({ success: true, message: 'Valoración rechazada' });
  } catch (err) {
    console.error('Error al rechazar valoración:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST - Ocultar valoración
router.post('/:id/ocultar', async (req, res) => {
  const { id } = req.params;
  
  try {
    const pool = await sql.connect(config);
    await pool.request()
      .input('id', sql.Int, id)
      .query(`
        UPDATE Valoraciones 
        SET estatus = 'oculta'
        WHERE id_valoracion = @id
      `);
    
    res.json({ success: true, message: 'Valoración ocultada' });
  } catch (err) {
    console.error('Error al ocultar valoración:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// DELETE - Eliminar valoración
router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  
  try {
    const pool = await sql.connect(config);
    await pool.request()
      .input('id', sql.Int, id)
      .query('DELETE FROM Valoraciones WHERE id_valoracion = @id');
    
    res.json({ success: true, message: 'Valoración eliminada permanentemente' });
  } catch (err) {
    console.error('Error al eliminar valoración:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST - Aprobar múltiples valoraciones
router.post('/aprobar-masivo', async (req, res) => {
  const { ids } = req.body; // Array de IDs
  
  try {
    const pool = await sql.connect(config);
    
    // Convertir array a string para SQL IN clause
    const idsString = ids.join(',');
    
    await pool.request().query(`
      UPDATE Valoraciones 
      SET estatus = 'aprobada'
      WHERE id_valoracion IN (${idsString})
    `);
    
    res.json({ 
      success: true, 
      message: `${ids.length} valoraciones aprobadas`,
      cantidad: ids.length
    });
  } catch (err) {
    console.error('Error al aprobar valoraciones masivamente:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET - Exportar valoraciones
router.get('/exportar', async (req, res) => {
  try {
    const pool = await sql.connect(config);
    const result = await pool.request().query(`
      SELECT 
        v.id_valoracion,
        u.nombre as usuario,
        u.email,
        c.titulo as curso,
        v.calificacion,
        v.comentario,
        v.fecha,
        v.estatus
      FROM Valoraciones v
      INNER JOIN Usuarios u ON v.id_usuario = u.id_usuario
      INNER JOIN Cursos c ON v.id_curso = c.id_curso
      ORDER BY v.fecha DESC
    `);
    
    res.json({ success: true, data: result.recordset });
  } catch (err) {
    console.error('Error al exportar:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
