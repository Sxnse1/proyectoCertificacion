// Script para ejecutar la actualización de base de datos
const database = require('../config/database');

async function actualizarBaseDatos() {
  try {
    console.log('🔄 Iniciando actualización de base de datos...');
    
    // Conectar a la base de datos
    await database.connect();
    
    // Script de actualización - ejecutar una consulta a la vez
    console.log('📝 Añadiendo columna tiene_password_temporal...');
    try {
      await database.executeQuery(`
        IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('Usuarios') AND name = 'tiene_password_temporal')
        BEGIN
            ALTER TABLE Usuarios 
            ADD tiene_password_temporal BIT NOT NULL DEFAULT 0;
        END
      `);
      console.log('✅ Columna tiene_password_temporal procesada');
    } catch (error) {
      console.log('⚠️ Error con tiene_password_temporal:', error.message);
    }
    
    console.log('📝 Añadiendo columna fecha_password_temporal...');
    try {
      await database.executeQuery(`
        IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('Usuarios') AND name = 'fecha_password_temporal')
        BEGIN
            ALTER TABLE Usuarios 
            ADD fecha_password_temporal DATETIME2 NULL;
        END
      `);
      console.log('✅ Columna fecha_password_temporal procesada');
    } catch (error) {
      console.log('⚠️ Error con fecha_password_temporal:', error.message);
    }
    
    console.log('📝 Creando índice...');
    try {
      await database.executeQuery(`
        IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_Usuarios_PasswordTemporal')
        BEGIN
            CREATE INDEX IX_Usuarios_PasswordTemporal 
            ON Usuarios (tiene_password_temporal, fecha_password_temporal)
            WHERE tiene_password_temporal = 1;
        END
      `);
      console.log('✅ Índice IX_Usuarios_PasswordTemporal procesado');
    } catch (error) {
      console.log('⚠️ Error con índice:', error.message);
    }
    
    // Verificar que las columnas se crearon correctamente
    console.log('🔍 Verificando columnas creadas...');
    const verification = await database.executeQuery(`
      SELECT 
          COLUMN_NAME,
          DATA_TYPE,
          IS_NULLABLE,
          COLUMN_DEFAULT
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_NAME = 'Usuarios' 
          AND COLUMN_NAME IN ('tiene_password_temporal', 'fecha_password_temporal')
      ORDER BY COLUMN_NAME;
    `);
    
    console.log('📋 Columnas verificadas:');
    verification.recordset.forEach(col => {
      console.log(`   • ${col.COLUMN_NAME} (${col.DATA_TYPE}) - Nullable: ${col.IS_NULLABLE}`);
    });
    
    console.log('🎉 ¡Actualización de base de datos completada exitosamente!');
    
  } catch (error) {
    console.error('❌ Error actualizando base de datos:', error.message);
    throw error;
  }
}

// Ejecutar si se llama directamente
if (require.main === module) {
  actualizarBaseDatos()
    .then(() => {
      console.log('✅ Script de actualización completado');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Error en script de actualización:', error);
      process.exit(1);
    });
}

module.exports = { actualizarBaseDatos };