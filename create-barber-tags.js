// Script para crear etiquetas de barbería usando la API
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

async function createBarberTags() {
  let pool;
  try {
    // Conectar a la base de datos
    pool = await sql.connect(config);
    console.log('✅ Conectado a la base de datos');
    console.log('🏷️ Creando etiquetas de barbería...');

    const etiquetasBarberia = [
      // Herramientas
      'Tijeras', 'Navaja', 'Máquina', 'Peine', 'Cepillo',
      
      // Niveles de experiencia
      'Principiante', 'Intermedio', 'Avanzado', 'Profesional',
      
      // Estilos de corte
      'Fade', 'Undercut', 'Pompadour', 'Quiff', 'Buzz Cut',
      'Crew Cut', 'Caesar', 'Clásico', 'Moderno', 'Vintage',
      
      // Tipos de cabello
      'Cabello Rizado', 'Cabello Liso', 'Cabello Grueso', 
      'Cabello Fino', 'Cabello Graso', 'Cabello Seco',
      
      // Técnicas específicas
      'Degradado', 'Texturizado', 'Layering', 'Razor Cut',
      'Scissor Cut', 'Blending',
      
      // Tipos de servicio
      'Corte', 'Afeitado', 'Styling', 'Lavado', 'Tratamiento',
      
      // Estilos por época/tendencia
      'Retro', 'Hipster', 'Ejecutivo', 'Casual', 'Formal',
      
      // Duración
      'Rápido', 'Detallado',
      
      // Público objetivo
      'Niños', 'Adolescentes', 'Adultos', 'Seniors'
    ];

    let creadas = 0;
    let duplicadas = 0;

    for (const nombreEtiqueta of etiquetasBarberia) {
      try {
        // Verificar si ya existe
        const existeQuery = 'SELECT id_etiqueta FROM Etiquetas WHERE LOWER(nombre) = LOWER(@nombre)';
        const existeResult = await pool.request()
          .input('nombre', sql.NVarChar, nombreEtiqueta)
          .query(existeQuery);

        if (existeResult.recordset.length > 0) {
          console.log(`⚠️  "${nombreEtiqueta}" ya existe`);
          duplicadas++;
          continue;
        }

        // Crear etiqueta
        const insertQuery = `
          INSERT INTO Etiquetas (nombre)
          OUTPUT INSERTED.id_etiqueta, INSERTED.nombre
          VALUES (@nombre)
        `;

        const result = await pool.request()
          .input('nombre', sql.NVarChar, nombreEtiqueta)
          .query(insertQuery);

        console.log(`✅ Etiqueta creada: "${nombreEtiqueta}" (ID: ${result.recordset[0].id_etiqueta})`);
        creadas++;

      } catch (error) {
        console.error(`❌ Error con "${nombreEtiqueta}":`, error.message);
      }
    }

    console.log('\n🎉 ¡Proceso completado!');
    console.log(`📊 RESUMEN:`);
    console.log(`   ✅ Etiquetas creadas: ${creadas}`);
    console.log(`   ⚠️  Etiquetas duplicadas: ${duplicadas}`);
    console.log(`   📋 Total procesadas: ${etiquetasBarberia.length}`);

    // Mostrar estadísticas finales
    const statsQuery = `
      SELECT COUNT(*) as total_etiquetas
      FROM Etiquetas
    `;

    const statsResult = await pool.request().query(statsQuery);
    console.log(`\n📈 Total de etiquetas en la base de datos: ${statsResult.recordset[0].total_etiquetas}`);

  } catch (error) {
    console.error('❌ Error general:', error.message);
  } finally {
    if (pool) {
      await pool.close();
      console.log('\n🔌 Conexión cerrada');
    }
  }
}

createBarberTags();