var express = require('express');
var router = express.Router();
const sql = require('mssql');
const { getBunnyCdnUrl } = require('../services/bunnyService');

/* GET home page. */
router.get('/', async function(req, res, next) {
  try {
    // Consulta para obtener los 3 cursos más populares basados en módulos y videos
    const query = `
      SELECT TOP 3
          c.id_curso,
          c.titulo,
          c.descripcion,
          c.miniatura,
          c.precio,
          c.nivel,
          cat.nombre as categoria_nombre,
          u.nombre + ' ' + u.apellido as instructor_nombre,
          (SELECT COUNT(*) FROM Modulos m WHERE m.id_curso = c.id_curso) as total_modulos,
          (SELECT COUNT(*) FROM Video v INNER JOIN Modulos m ON v.id_modulo = m.id_modulo 
           WHERE m.id_curso = c.id_curso AND v.estatus = 'publicado') as total_videos
      FROM Cursos c
      INNER JOIN Categorias cat ON c.id_categoria = cat.id_categoria
      INNER JOIN Usuarios u ON c.id_usuario = u.id_usuario
      WHERE c.estatus = 'publicado'
      ORDER BY 
          (SELECT COUNT(*) FROM Modulos m WHERE m.id_curso = c.id_curso) DESC,
          (SELECT COUNT(*) FROM Video v INNER JOIN Modulos m ON v.id_modulo = m.id_modulo 
           WHERE m.id_curso = c.id_curso AND v.estatus = 'publicado') DESC,
          c.fecha_creacion DESC
    `;

    const result = await sql.query(query);
    
    // Procesar cursos recomendados con URLs de miniaturas
    const recommendedCourses = result.recordset.map(course => ({
      id_curso: course.id_curso,
      titulo: course.titulo,
      descripcion: course.descripcion,
      miniatura: course.miniatura ? getBunnyCdnUrl(course.miniatura) : null,
      precio: parseFloat(course.precio),
      nivel: course.nivel,
      categoria_nombre: course.categoria_nombre,
      instructor_nombre: course.instructor_nombre,
      total_modulos: course.total_modulos,
      total_videos: course.total_videos
    }));

    console.log('📚 Cursos recomendados para homepage:', recommendedCourses.length);

    res.render('shared/index-bootstrap', { 
      title: 'Academia de Barbería Profesional',
      layout: false,
      recommendedCourses: recommendedCourses
    });

  } catch (error) {
    console.error('❌ Error al cargar página principal:', error);
    res.render('shared/index-bootstrap', { 
      title: 'Academia de Barbería Profesional',
      layout: false,
      recommendedCourses: []
    });
  }
});

/* GET test database connection */
router.get('/test-db', async function(req, res, next) {
  try {
    console.log('[ROUTE] 🧪 Probando conexión desde ruta /test-db');
    const db = req.app.locals.db;
    
    const result = await db.executeQuery('SELECT @@VERSION as version, GETDATE() as fecha, DB_NAME() as database_name');
    
    console.log('[ROUTE] ✅ Consulta ejecutada exitosamente');
    console.log('[ROUTE] 📊 Resultado:', result.recordset[0]);
    
    res.json({
      success: true,
      message: '¡Conexión a SQL Server funcionando correctamente!',
      data: {
        version: result.recordset[0].version.split('\n')[0],
        fecha_servidor: result.recordset[0].fecha,
        base_datos: result.recordset[0].database_name
      }
    });
  } catch (error) {
    console.error('[ROUTE] ❌ Error en prueba de conexión:', error.message);
    res.status(500).json({
      success: false,
      message: 'Error probando la conexión',
      error: error.message
    });
  }
});

module.exports = router;
