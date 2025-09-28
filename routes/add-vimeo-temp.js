// Ruta temporal para agregar tu video de Vimeo existente
const express = require('express');
const router = express.Router();

/* POST - Agregar video de Vimeo existente */
router.post('/add-existing-vimeo', async function(req, res) {
  try {
    const db = req.app.locals.db;
    
    console.log('🎬 AGREGANDO VIDEO DE VIMEO EXISTENTE');
    console.log('Video ID: 1122531979');
    console.log('URL: https://vimeo.com/1122531979');

    // Paso 1: Crear categoría si no existe
    await db.executeQuery(`
      IF NOT EXISTS (SELECT 1 FROM Categorias WHERE nombre = 'Barbería')
      BEGIN
          INSERT INTO Categorias (nombre, descripcion) VALUES 
          ('Barbería', 'Cursos especializados en técnicas de barbería y cuidado personal');
      END
    `);

    // Paso 2: Buscar usuario instructor existente
    const userResult = await db.executeQuery(`
      SELECT TOP 1 id_usuario FROM Usuarios WHERE rol IN ('instructor', 'admin')
    `);

    let instructorId;
    if (userResult.recordset.length === 0) {
      // Crear usuario temporal si no existe
      const newUserResult = await db.executeQuery(`
        INSERT INTO Usuarios (nombre, apellido, nombre_usuario, email, password, rol, estatus) 
        OUTPUT INSERTED.id_usuario
        VALUES ('Admin', 'Sistema', 'admin_temp', 'admin@temp.com', 'temp123', 'instructor', 'activo');
      `);
      instructorId = newUserResult.recordset[0].id_usuario;
    } else {
      instructorId = userResult.recordset[0].id_usuario;
    }

    // Paso 3: Crear curso
    const categoriaResult = await db.executeQuery(`
      SELECT id_categoria FROM Categorias WHERE nombre = 'Barbería'
    `);
    const categoriaId = categoriaResult.recordset[0].id_categoria;

    const cursoResult = await db.executeQuery(`
      IF NOT EXISTS (SELECT 1 FROM Cursos WHERE titulo = 'Curso de Prueba - Videos')
      BEGIN
          INSERT INTO Cursos (id_usuario, id_categoria, titulo, descripcion, precio, nivel, estatus) 
          VALUES (@instructor_id, @categoria_id, 'Curso de Prueba - Videos', 
                 'Curso creado para probar la funcionalidad de videos con Vimeo', 
                 0.00, 'básico', 'publicado');
      END
      
      SELECT id_curso FROM Cursos WHERE titulo = 'Curso de Prueba - Videos';
    `, {
      instructor_id: instructorId,
      categoria_id: categoriaId
    });
    
    const cursoId = cursoResult.recordset[0].id_curso;

    // Paso 4: Crear módulo
    const moduloResult = await db.executeQuery(`
      IF NOT EXISTS (SELECT 1 FROM Modulos WHERE titulo = 'Videos de Prueba' AND id_curso = @curso_id)
      BEGIN
          INSERT INTO Modulos (id_curso, titulo, orden) VALUES (@curso_id, 'Videos de Prueba', 1);
      END
      
      SELECT id_modulo FROM Modulos WHERE titulo = 'Videos de Prueba' AND id_curso = @curso_id;
    `, {
      curso_id: cursoId
    });
    
    const moduloId = moduloResult.recordset[0].id_modulo;

    // Paso 5: Verificar si el video ya existe
    const videoExists = await db.executeQuery(`
      SELECT COUNT(*) as count FROM Video WHERE url = 'https://vimeo.com/1122531979'
    `);

    if (videoExists.recordset[0].count === 0) {
      // Registrar el video
      await db.executeQuery(`
        INSERT INTO Video (
            id_modulo, titulo, descripcion, url, duracion_segundos, orden, estatus, fecha_creacion
        ) VALUES (
            @modulo_id,
            'Video de Prueba Vimeo',
            'Video de testing importado desde Vimeo existente (ID: 1122531979)',
            'https://vimeo.com/1122531979',
            NULL,
            1,
            'publicado',
            GETDATE()
        );
      `, {
        modulo_id: moduloId
      });

      console.log('✅ Video registrado exitosamente!');
    } else {
      console.log('⚠️ El video ya está registrado');
    }

    // Obtener información del video registrado
    const videoInfo = await db.executeQuery(`
      SELECT 
          v.titulo, v.url, v.estatus,
          m.titulo as modulo_titulo,
          c.titulo as curso_titulo
      FROM Video v
      INNER JOIN Modulos m ON v.id_modulo = m.id_modulo
      INNER JOIN Cursos c ON m.id_curso = c.id_curso
      WHERE v.url = 'https://vimeo.com/1122531979'
    `);

    res.json({
      success: true,
      message: '¡Video de Vimeo agregado exitosamente!',
      video: videoInfo.recordset[0]
    });

  } catch (error) {
    console.error('❌ Error agregando video:', error);
    res.status(500).json({
      success: false,
      error: 'Error al agregar el video: ' + error.message
    });
  }
});

module.exports = router;