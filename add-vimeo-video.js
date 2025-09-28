// Script para agregar tu video de Vimeo existente a la base de datos
const sql = require('mssql');

const dbConfig = {
  server: 'starteducation.c1wqwe44ocx1.us-east-2.rds.amazonaws.com',
  database: 'StartEducationDB',
  user: 'barberadmin',
  password: 'StartEducation2024!',
  port: 1433,
  options: {
    encrypt: true,
    trustServerCertificate: true,
    connectTimeout: 30000,
    requestTimeout: 30000
  }
};

async function addVimeoVideo() {
  try {
    console.log('🎬 AGREGANDO VIDEO DE VIMEO EXISTENTE');
    console.log('Video ID: 1122531979');
    console.log('URL: https://vimeo.com/1122531979');
    console.log('');

    const pool = await sql.connect(dbConfig);

    // Paso 1: Crear categoría si no existe
    console.log('📂 Verificando categoría...');
    await pool.request().query(`
      IF NOT EXISTS (SELECT 1 FROM Categorias WHERE nombre = 'Barbería')
      BEGIN
          INSERT INTO Categorias (nombre, descripcion) VALUES 
          ('Barbería', 'Cursos especializados en técnicas de barbería y cuidado personal');
      END
    `);

    // Paso 2: Buscar usuario instructor
    console.log('👤 Buscando usuario instructor...');
    const userResult = await pool.request().query(`
      SELECT TOP 1 id_usuario FROM Usuarios WHERE rol IN ('instructor', 'admin')
    `);

    let instructorId;
    if (userResult.recordset.length === 0) {
      console.log('⚠️ Creando usuario instructor temporal...');
      const newUserResult = await pool.request().query(`
        INSERT INTO Usuarios (nombre, apellido, nombre_usuario, email, password, rol, estatus) 
        VALUES ('Admin', 'Sistema', 'admin_temp', 'admin@temp.com', 'temp123', 'instructor', 'activo');
        SELECT SCOPE_IDENTITY() as id;
      `);
      instructorId = newUserResult.recordset[0].id;
    } else {
      instructorId = userResult.recordset[0].id_usuario;
    }
    console.log('✅ Usuario instructor ID:', instructorId);

    // Paso 3: Crear curso
    console.log('📚 Creando curso de prueba...');
    const categoriaResult = await pool.request().query(`
      SELECT id_categoria FROM Categorias WHERE nombre = 'Barbería'
    `);
    const categoriaId = categoriaResult.recordset[0].id_categoria;

    const cursoResult = await pool.request()
      .input('instructor_id', sql.Int, instructorId)
      .input('categoria_id', sql.Int, categoriaId)
      .query(`
        IF NOT EXISTS (SELECT 1 FROM Cursos WHERE titulo = 'Curso de Prueba - Videos')
        BEGIN
            INSERT INTO Cursos (id_usuario, id_categoria, titulo, descripcion, precio, nivel, estatus) 
            VALUES (@instructor_id, @categoria_id, 'Curso de Prueba - Videos', 
                   'Curso creado para probar la funcionalidad de videos con Vimeo', 
                   0.00, 'básico', 'publicado');
        END
        
        SELECT id_curso FROM Cursos WHERE titulo = 'Curso de Prueba - Videos';
      `);
    
    const cursoId = cursoResult.recordset[0].id_curso;
    console.log('✅ Curso ID:', cursoId);

    // Paso 4: Crear módulo
    console.log('📖 Creando módulo de prueba...');
    const moduloResult = await pool.request()
      .input('curso_id', sql.Int, cursoId)
      .query(`
        IF NOT EXISTS (SELECT 1 FROM Modulos WHERE titulo = 'Videos de Prueba' AND id_curso = @curso_id)
        BEGIN
            INSERT INTO Modulos (id_curso, titulo, orden) VALUES (@curso_id, 'Videos de Prueba', 1);
        END
        
        SELECT id_modulo FROM Modulos WHERE titulo = 'Videos de Prueba' AND id_curso = @curso_id;
      `);
    
    const moduloId = moduloResult.recordset[0].id_modulo;
    console.log('✅ Módulo ID:', moduloId);

    // Paso 5: Registrar el video
    console.log('🎥 Registrando video de Vimeo...');
    const videoExists = await pool.request().query(`
      SELECT COUNT(*) as count FROM Video WHERE url = 'https://vimeo.com/1122531979'
    `);

    if (videoExists.recordset[0].count === 0) {
      await pool.request()
        .input('modulo_id', sql.Int, moduloId)
        .query(`
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
        `);
      
      console.log('✅ Video registrado exitosamente!');
    } else {
      console.log('⚠️ El video ya está registrado');
    }

    // Paso 6: Mostrar resumen
    console.log('');
    console.log('📊 RESUMEN FINAL:');
    
    const resumen = await pool.request().query(`
      SELECT 'Videos' as Tabla, COUNT(*) as Total FROM Video
      UNION ALL
      SELECT 'Modulos' as Tabla, COUNT(*) as Total FROM Modulos
      UNION ALL
      SELECT 'Cursos' as Tabla, COUNT(*) as Total FROM Cursos
    `);
    
    resumen.recordset.forEach(row => {
      console.log(`${row.Tabla}: ${row.Total}`);
    });

    console.log('');
    console.log('🎬 VIDEO REGISTRADO:');
    const videoInfo = await pool.request().query(`
      SELECT 
          v.titulo as titulo,
          v.url as url,
          v.estatus as estatus,
          m.titulo as modulo,
          c.titulo as curso
      FROM Video v
      INNER JOIN Modulos m ON v.id_modulo = m.id_modulo
      INNER JOIN Cursos c ON m.id_curso = c.id_curso
      WHERE v.url = 'https://vimeo.com/1122531979'
    `);

    if (videoInfo.recordset.length > 0) {
      const video = videoInfo.recordset[0];
      console.log(`- Título: ${video.titulo}`);
      console.log(`- URL: ${video.url}`);
      console.log(`- Estado: ${video.estatus}`);
      console.log(`- Módulo: ${video.modulo}`);
      console.log(`- Curso: ${video.curso}`);
    }

    console.log('');
    console.log('🎯 ¡LISTO! Tu video ahora debería aparecer en /videos-admin');
    console.log('🔄 Refresca la página del administrador para verlo');

    await pool.close();
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

// Ejecutar el script
addVimeoVideo();