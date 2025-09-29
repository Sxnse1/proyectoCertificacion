// Script para asignar etiquetas a cursos de ejemplo
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

async function assignTagsToCourses() {
  let pool;
  try {
    // Conectar a la base de datos
    pool = await sql.connect(config);
    console.log('✅ Conectado a la base de datos');
    console.log('🏷️ Asignando etiquetas a cursos...');

    // Obtener cursos existentes
    const cursosQuery = 'SELECT id_curso, titulo FROM Cursos';
    const cursosResult = await pool.request().query(cursosQuery);
    console.log(`📚 Cursos encontrados: ${cursosResult.recordset.length}`);

    // Obtener etiquetas existentes
    const etiquetasQuery = 'SELECT id_etiqueta, nombre FROM Etiquetas';
    const etiquetasResult = await pool.request().query(etiquetasQuery);
    console.log(`🏷️ Etiquetas disponibles: ${etiquetasResult.recordset.length}`);

    // Función auxiliar para encontrar etiqueta por nombre
    const findEtiqueta = (nombre) => {
      return etiquetasResult.recordset.find(e => 
        e.nombre.toLowerCase() === nombre.toLowerCase()
      );
    };

    // Asignaciones específicas por curso
    const asignaciones = [
      {
        curso: 'HTML y CSS desde Cero',
        etiquetas: ['Principiante', 'Moderno']
      },
      {
        curso: 'JavaScript Moderno', 
        etiquetas: ['Intermedio', 'Moderno', 'Profesional']
      },
      {
        curso: 'React para Principiantes',
        etiquetas: ['Principiante', 'Moderno']
      },
      {
        curso: 'SQL Server Avanzado',
        etiquetas: ['Avanzado', 'Profesional']
      },
      {
        curso: 'Diseño de Interfaces Modernas',
        etiquetas: ['Intermedio', 'Moderno', 'Profesional']
      },
      {
        curso: 'Marketing en Redes Sociales',
        etiquetas: ['Principiante', 'Moderno', 'Rápido']
      }
    ];

    let asignacionesRealizadas = 0;

    for (const asignacion of asignaciones) {
      // Buscar el curso
      const curso = cursosResult.recordset.find(c => 
        c.titulo.toLowerCase().includes(asignacion.curso.toLowerCase())
      );

      if (!curso) {
        console.log(`⚠️  Curso no encontrado: "${asignacion.curso}"`);
        continue;
      }

      console.log(`\n📚 Procesando curso: "${curso.titulo}" (ID: ${curso.id_curso})`);

      for (const nombreEtiqueta of asignacion.etiquetas) {
        const etiqueta = findEtiqueta(nombreEtiqueta);
        
        if (!etiqueta) {
          console.log(`   ⚠️  Etiqueta no encontrada: "${nombreEtiqueta}"`);
          continue;
        }

        try {
          // Verificar si ya existe la relación
          const existeQuery = `
            SELECT 1 FROM Curso_Etiqueta 
            WHERE id_curso = @id_curso AND id_etiqueta = @id_etiqueta
          `;
          
          const existeResult = await pool.request()
            .input('id_curso', sql.Int, curso.id_curso)
            .input('id_etiqueta', sql.Int, etiqueta.id_etiqueta)
            .query(existeQuery);

          if (existeResult.recordset.length > 0) {
            console.log(`   ⚠️  Ya asignada: "${nombreEtiqueta}"`);
            continue;
          }

          // Crear la relación
          const insertQuery = `
            INSERT INTO Curso_Etiqueta (id_curso, id_etiqueta)
            VALUES (@id_curso, @id_etiqueta)
          `;

          await pool.request()
            .input('id_curso', sql.Int, curso.id_curso)
            .input('id_etiqueta', sql.Int, etiqueta.id_etiqueta)
            .query(insertQuery);

          console.log(`   ✅ Etiqueta asignada: "${nombreEtiqueta}"`);
          asignacionesRealizadas++;

        } catch (error) {
          console.error(`   ❌ Error asignando "${nombreEtiqueta}":`, error.message);
        }
      }
    }

    console.log(`\n🎉 ¡Asignación completada!`);
    console.log(`📊 Total de asignaciones realizadas: ${asignacionesRealizadas}`);

    // Mostrar estadísticas finales
    const statsQuery = `
      SELECT 
        c.titulo,
        COUNT(ce.id_etiqueta) as total_etiquetas
      FROM Cursos c
      LEFT JOIN Curso_Etiqueta ce ON c.id_curso = ce.id_curso
      GROUP BY c.id_curso, c.titulo
      ORDER BY c.titulo
    `;

    const statsResult = await pool.request().query(statsQuery);
    
    console.log(`\n📈 ESTADÍSTICAS POR CURSO:`);
    for (const stat of statsResult.recordset) {
      console.log(`   📚 "${stat.titulo}": ${stat.total_etiquetas} etiquetas`);
    }

  } catch (error) {
    console.error('❌ Error general:', error.message);
  } finally {
    if (pool) {
      await pool.close();
      console.log('\n🔌 Conexión cerrada');
    }
  }
}

assignTagsToCourses();