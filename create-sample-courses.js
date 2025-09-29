// Script para crear cursos de ejemplo y mostrar la funcionalidad de categorías
require('dotenv').config();
const sql = require('mssql');

// Configuración de la base de datos
const config = {
    server: process.env.DB_SERVER,
    database: process.env.DB_DATABASE,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    port: parseInt(process.env.DB_PORT) || 1433,
    options: {
        encrypt: process.env.DB_ENCRYPT === 'true',
        trustServerCertificate: process.env.DB_TRUST_CERT === 'true',
        enableArithAbort: true
    }
};

async function createSampleCourses() {
  let pool;
  try {
    // Conectar a la base de datos
    pool = await sql.connect(config);
    console.log('✅ Conectado a la base de datos');
    console.log('🚀 Creando cursos de ejemplo...');
    
    // Obtener categorías existentes
    const categorias = await pool.request().query('SELECT id_categoria, nombre FROM Categorias');
    console.log('📋 Categorías encontradas:', categorias.recordset.length);
    
    // Obtener usuario instructor
    const usuarios = await pool.request().query("SELECT id_usuario FROM Usuarios WHERE rol = 'instructor'");
    if (usuarios.recordset.length === 0) {
      console.log('❌ No se encontró ningún instructor');
      return;
    }
    
    const instructorId = usuarios.recordset[0].id_usuario;
    console.log('👨‍🏫 Instructor ID:', instructorId);
    
    const cursosSample = [
      {
        titulo: 'HTML y CSS desde Cero',
        descripcion: 'Aprende los fundamentos del desarrollo web con HTML5 y CSS3',
        precio: 49.99,
        nivel: 'básico',
        estatus: 'publicado',
        categoria: 'Desarrollo Web'
      },
      {
        titulo: 'JavaScript Moderno',
        descripcion: 'Domina ES6+ y las mejores prácticas de JavaScript',
        precio: 69.99,
        nivel: 'intermedio',
        estatus: 'publicado',
        categoria: 'Programación'
      },
      {
        titulo: 'React para Principiantes',
        descripcion: 'Crea aplicaciones web modernas con React',
        precio: 89.99,
        nivel: 'intermedio',
        estatus: 'borrador',
        categoria: 'Desarrollo Web'
      },
      {
        titulo: 'SQL Server Avanzado',
        descripcion: 'Optimización y administración avanzada de bases de datos',
        precio: 79.99,
        nivel: 'avanzado',
        estatus: 'publicado',
        categoria: 'Bases de Datos'
      },
      {
        titulo: 'Diseño de Interfaces Modernas',
        descripcion: 'Principios de UX/UI y herramientas de diseño',
        precio: 59.99,
        nivel: 'básico',
        estatus: 'borrador',
        categoria: 'Diseño UX/UI'
      },
      {
        titulo: 'Marketing en Redes Sociales',
        descripcion: 'Estrategias efectivas para el marketing digital',
        precio: 39.99,
        nivel: 'básico',
        estatus: 'inactivo',
        categoria: 'Marketing Digital'
      }
    ];
    
    for (const curso of cursosSample) {
      // Buscar la categoría correspondiente
      const categoria = categorias.recordset.find(c => c.nombre === curso.categoria);
      if (!categoria) {
        console.log('⚠️  Categoría no encontrada:', curso.categoria);
        continue;
      }
      
      const query = `
        INSERT INTO Cursos (id_usuario, id_categoria, titulo, descripcion, precio, nivel, estatus)
        VALUES (@id_usuario, @id_categoria, @titulo, @descripcion, @precio, @nivel, @estatus)
      `;
      
      const params = {
        id_usuario: instructorId,
        id_categoria: categoria.id_categoria,
        titulo: curso.titulo,
        descripcion: curso.descripcion,
        precio: curso.precio,
        nivel: curso.nivel,
        estatus: curso.estatus
      };
      
      const request = pool.request();
      Object.keys(params).forEach(key => {
        request.input(key, params[key]);
      });
      await request.query(query);
      console.log(`✅ Curso creado: ${curso.titulo} (${curso.estatus}) - Categoría: ${curso.categoria}`);
    }
    
    console.log('🎉 ¡Todos los cursos de ejemplo creados exitosamente!');
    
    // Mostrar estadísticas finales
    const stats = await pool.request().query(`
      SELECT 
        c.nombre as categoria,
        COUNT(cu.id_curso) as total_cursos,
        COUNT(CASE WHEN cu.estatus = 'publicado' THEN 1 END) as publicados,
        COUNT(CASE WHEN cu.estatus = 'borrador' THEN 1 END) as borradores,
        COUNT(CASE WHEN cu.estatus = 'inactivo' THEN 1 END) as inactivos
      FROM Categorias c
      LEFT JOIN Cursos cu ON c.id_categoria = cu.id_categoria
      GROUP BY c.nombre, c.id_categoria
      ORDER BY c.nombre
    `);
    
    console.log('\n📊 ESTADÍSTICAS FINALES:');
    stats.recordset.forEach(stat => {
      console.log(`📁 ${stat.categoria}: ${stat.total_cursos} cursos (✅${stat.publicados} publicados, 📝${stat.borradores} borradores, ⏸️${stat.inactivos} inactivos)`);
    });
    
  } catch (error) {
    console.error('❌ Error creando cursos:', error.message);
  } finally {
    if (pool) await pool.close();
  }
}

createSampleCourses();