require('dotenv').config();
const db = require('../config/database');

async function checkVideoData() {
  try {
    console.log('🔍 Verificando datos de la tabla Video...');
    
    await db.connect();

    // Verificar todos los videos
    const allVideos = await db.executeQuery(`
      SELECT 
        id_video,
        titulo,
        duracion_segundos,
        estatus,
        video_provider
      FROM Video
    `);

    console.log('\n📊 Videos encontrados:');
    console.log('===================');
    
    allVideos.recordset.forEach(video => {
      console.log(`ID: ${video.id_video} | Título: ${video.titulo}`);
      console.log(`  Duración: ${video.duracion_segundos} (${typeof video.duracion_segundos})`);
      console.log(`  Estatus: ${video.estatus}`);
      console.log(`  Provider: ${video.video_provider}`);
      console.log('---');
    });

    // Verificar tipos de datos problemáticos
    const problematicData = await db.executeQuery(`
      SELECT 
        id_video,
        titulo,
        duracion_segundos
      FROM Video
      WHERE duracion_segundos IS NOT NULL 
        AND (
          TRY_CAST(duracion_segundos AS INT) IS NULL
          OR ISNUMERIC(CAST(duracion_segundos AS VARCHAR)) = 0
        )
    `);

    if (problematicData.recordset.length > 0) {
      console.log('\n⚠️ Datos problemáticos encontrados:');
      console.log('==================================');
      problematicData.recordset.forEach(video => {
        console.log(`ID: ${video.id_video} | Duración: "${video.duracion_segundos}"`);
      });
    } else {
      console.log('\n✅ No se encontraron datos problemáticos en duracion_segundos');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    await db.close();
  }
}

checkVideoData();