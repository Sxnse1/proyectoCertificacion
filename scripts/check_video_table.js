require('dotenv').config();
const db = require('../config/database');

async function checkVideoTableStructure() {
  try {
    console.log('🔍 Verificando estructura de la tabla Video...');
    
    await db.connect();
    
    // Obtener información de las columnas de la tabla Video
    const result = await db.executeQuery(`
      SELECT 
        COLUMN_NAME,
        DATA_TYPE,
        IS_NULLABLE,
        COLUMN_DEFAULT
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_NAME = 'Video'
      ORDER BY ORDINAL_POSITION
    `);
    
    console.log('\n📊 Estructura actual de la tabla Video:');
    console.log('==========================================');
    
    result.recordset.forEach(col => {
      console.log(`${col.COLUMN_NAME.padEnd(25)} | ${col.DATA_TYPE.padEnd(15)} | ${col.IS_NULLABLE === 'YES' ? 'NULL' : 'NOT NULL'}`);
    });
    
    // Verificar columnas específicas de Bunny
    const bunnyColumns = ['bunny_id', 'bunny_video_id', 'bunny_library_id', 'bunny_embed_url', 'thumbnail_url'];
    console.log('\n🔍 Verificando columnas de Bunny.net:');
    console.log('====================================');
    
    bunnyColumns.forEach(colName => {
      const exists = result.recordset.find(col => col.COLUMN_NAME.toLowerCase() === colName.toLowerCase());
      console.log(`${colName.padEnd(20)} | ${exists ? '✅ Existe' : '❌ Falta'}`);
    });
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await db.close();
  }
}

checkVideoTableStructure();