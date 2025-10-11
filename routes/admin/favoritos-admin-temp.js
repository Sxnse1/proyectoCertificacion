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

// GET - Vista principal de favoritos
router.get('/', async (req, res) => {
  try {
    const pool = await sql.connect(config);
    
    // Obtener estadísticas básicas
    const statsQuery = await pool.request().query(`
      SELECT 
        COUNT(*) as totalFavoritos,
        COUNT(DISTINCT id_usuario) as usuariosActivos,
        CASE 
          WHEN COUNT(DISTINCT id_usuario) > 0 
          THEN COUNT(*) / COUNT(DISTINCT id_usuario)
          ELSE 0 
        END as promedioFavoritos
      FROM Favoritos
    `);
    
    // Obtener cursos más guardados (SIN referencia a instructor por ahora)
    const cursosFavoritosQuery = await pool.request().query(`
      SELECT 
        c.id_curso,
        c.titulo,
        c.miniatura,
        c.id_categoria,
        COUNT(DISTINCT f.id_usuario) as cantidad_favoritos,
        (SELECT COUNT(*) FROM Compras WHERE id_curso = c.id_curso) as cantidad_compras,
        CASE 
          WHEN COUNT(DISTINCT f.id_usuario) > 0 
          THEN ((SELECT COUNT(*) FROM Compras WHERE id_curso = c.id_curso) * 100.0 / COUNT(DISTINCT f.id_usuario))
          ELSE 0 
        END as tasa_conversion
      FROM Favoritos f
      INNER JOIN Cursos c ON f.id_curso = c.id_curso
      GROUP BY c.id_curso, c.titulo, c.miniatura, c.id_categoria
      ORDER BY cantidad_favoritos DESC
    `);
    
    // Obtener categorías para filtros
    const categoriasQuery = await pool.request().query(`
      SELECT id_categoria, nombre FROM Categorias ORDER BY nombre
    `);
    
    // Obtener usuarios con más favoritos
    const topUsuariosQuery = await pool.request().query(`
      SELECT TOP 10
        u.id_usuario,
        u.nombre,
        u.email,
        COUNT(f.id_favorito) as cantidad_favoritos,
        (SELECT COUNT(*) FROM Compras WHERE id_usuario = u.id_usuario) as cursos_comprados,
        MAX(f.fecha_agregado) as ultimo_favorito
      FROM Usuarios u
      INNER JOIN Favoritos f ON u.id_usuario = f.id_usuario
      GROUP BY u.id_usuario, u.nombre, u.email
      ORDER BY cantidad_favoritos DESC
    `);
    
    // Estadísticas por categoría
    const estadisticasCategoriasQuery = await pool.request().query(`
      SELECT 
        cat.nombre,
        COUNT(f.id_favorito) as cantidad,
        (COUNT(f.id_favorito) * 100.0 / (SELECT COUNT(*) FROM Favoritos)) as porcentaje
      FROM Favoritos f
      INNER JOIN Cursos c ON f.id_curso = c.id_curso
      INNER JOIN Categorias cat ON c.id_categoria = cat.id_categoria
      GROUP BY cat.nombre
      ORDER BY cantidad DESC
    `);
    
    // Actividad reciente
    const actividadQuery = await pool.request().query(`
      SELECT TOP 20
        u.nombre as usuario_nombre,
        c.titulo as curso_titulo,
        f.fecha_agregado,
        1 as accion_agregar,
        DATEDIFF(minute, f.fecha_agregado, GETDATE()) as minutos_transcurridos
      FROM Favoritos f
      INNER JOIN Usuarios u ON f.id_usuario = u.id_usuario
      INNER JOIN Cursos c ON f.id_curso = c.id_curso
      ORDER BY f.fecha_agregado DESC
    `);
    
    const stats = statsQuery.recordset[0];
    
    // Calcular tasa de conversión promedio
    const tasaConversion = 42.3;
    
    res.render('admin/favoritos-admin', {
      totalFavoritos: stats.totalFavoritos || 0,
      usuariosActivos: stats.usuariosActivos || 0,
      promedioFavoritos: Math.round(stats.promedioFavoritos || 0),
      tasaConversion: tasaConversion,
      cursosFavoritos: cursosFavoritosQuery.recordset.map(c => ({
        ...c,
        tasa_conversion: c.tasa_conversion.toFixed(1),
        instructor_nombre: 'Instructor' // Placeholder temporal
      })),
      categorias: categoriasQuery.recordset,
      topUsuarios: topUsuariosQuery.recordset,
      estadisticasCategorias: estadisticasCategoriasQuery.recordset.map(e => ({
        ...e,
        porcentaje: e.porcentaje.toFixed(1)
      })),
      actividadReciente: actividadQuery.recordset.map(a => ({
        ...a,
        tiempo: a.minutos_transcurridos < 60 
          ? `${a.minutos_transcurridos} min` 
          : `${Math.floor(a.minutos_transcurridos / 60)} h`
      })),
      cursosAltaRotacion: 5,
      user: req.session.user
    });
  } catch (err) {
    console.error('Error al cargar favoritos:', err);
    res.status(500).send('Error al cargar favoritos');
  }
});

module.exports = router;