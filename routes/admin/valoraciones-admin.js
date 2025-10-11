const express = require('express');
const router = express.Router();
const sql = require('mssql');
const { connect } = require('../../config/database');

// GET - Vista principal de valoraciones
router.get('/', async (req, res) => {
  try {
    const pool = await connect();
    
    // Obtener estadísticas
    const statsQuery = await pool.request().query(`
      SELECT 
        COUNT(*) as totalValoraciones,
        AVG(CAST(calificacion AS FLOAT)) as promedioGeneral,
        (SELECT COUNT(*) FROM Valoraciones 
         WHERE MONTH(fecha) = MONTH(GETDATE()) 
         AND YEAR(fecha) = YEAR(GETDATE())) as valoracionesMes,
        (SELECT COUNT(*) FROM Valoraciones WHERE calificacion = 5) as valoraciones5Estrellas
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
        v.fecha_modificacion,
        u.nombre + ' ' + u.apellido as usuario_nombre,
        u.email as usuario_email,
        c.titulo as curso_titulo,
        inst.nombre + ' ' + inst.apellido as instructor_nombre
      FROM Valoraciones v
      INNER JOIN Usuarios u ON v.id_usuario = u.id_usuario
      INNER JOIN Cursos c ON v.id_curso = c.id_curso
      INNER JOIN Usuarios inst ON c.id_usuario = inst.id_usuario
      ORDER BY v.fecha DESC
    `);
    
    // Top cursos mejor valorados
    const topCursosQuery = await pool.request().query(`
      SELECT TOP 10
        c.id_curso,
        c.titulo,
        COUNT(v.id_valoracion) as cantidad_valoraciones,
        AVG(CAST(v.calificacion AS FLOAT)) as rating_promedio
      FROM Cursos c
      INNER JOIN Valoraciones v ON c.id_curso = v.id_curso
      GROUP BY c.id_curso, c.titulo
      HAVING COUNT(v.id_valoracion) >= 3
      ORDER BY rating_promedio DESC, cantidad_valoraciones DESC
    `);
    
    const stats = statsQuery.recordset[0];
    
    res.render('admin/valoraciones-admin', {
      totalValoraciones: stats.totalValoraciones || 0,
      promedioGeneral: (stats.promedioGeneral || 0).toFixed(1),
      valoracionesMes: stats.valoracionesMes || 0,
      valoraciones5Estrellas: stats.valoraciones5Estrellas || 0,
      valoraciones: valoracionesQuery.recordset,
      topCursos: topCursosQuery.recordset.map(c => ({
        ...c,
        rating_promedio: (c.rating_promedio || 0).toFixed(1)
      })),
      user: req.session.user
    });
  } catch (err) {
    console.error('Error al cargar valoraciones:', err);
    res.status(500).send('Error al cargar valoraciones: ' + err.message);
  }
});

// GET - Detalles de una valoración
router.get('/:id', async (req, res) => {
  try {
    const pool = await connect();
    const { id } = req.params;
    
    const valoracionQuery = await pool.request()
      .input('id', sql.Int, id)
      .query(`
        SELECT 
          v.*,
          u.nombre + ' ' + u.apellido as usuario_nombre,
          u.email as usuario_email,
          c.titulo as curso_titulo,
          inst.nombre + ' ' + inst.apellido as instructor_nombre
        FROM Valoraciones v
        INNER JOIN Usuarios u ON v.id_usuario = u.id_usuario
        INNER JOIN Cursos c ON v.id_curso = c.id_curso
        INNER JOIN Usuarios inst ON c.id_usuario = inst.id_usuario
        WHERE v.id_valoracion = @id
      `);
    
    if (valoracionQuery.recordset.length === 0) {
      return res.status(404).json({ error: 'Valoración no encontrada' });
    }
    
    res.json(valoracionQuery.recordset[0]);
  } catch (err) {
    console.error('Error al obtener valoración:', err);
    res.status(500).json({ error: err.message });
  }
});

// DELETE - Eliminar valoración
router.delete('/:id', async (req, res) => {
  try {
    const pool = await connect();
    const { id } = req.params;
    
    await pool.request()
      .input('id', sql.Int, id)
      .query('DELETE FROM Valoraciones WHERE id_valoracion = @id');
    
    res.json({ success: true, message: 'Valoración eliminada exitosamente' });
  } catch (err) {
    console.error('Error al eliminar valoración:', err);
    res.status(500).json({ error: err.message });
  }
});

// PUT - Actualizar valoración (por moderación)
router.put('/:id', async (req, res) => {
  try {
    const pool = await connect();
    const { id } = req.params;
    const { comentario } = req.body;
    
    await pool.request()
      .input('id', sql.Int, id)
      .input('comentario', sql.NVarChar, comentario)
      .query(`
        UPDATE Valoraciones 
        SET comentario = @comentario,
            fecha_modificacion = GETDATE()
        WHERE id_valoracion = @id
      `);
    
    res.json({ success: true, message: 'Valoración actualizada exitosamente' });
  } catch (err) {
    console.error('Error al actualizar valoración:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
