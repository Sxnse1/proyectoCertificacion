// Script para diagnosticar el problema de login
const database = require('../config/database');

async function diagnosticarLogin() {
  try {
    console.log('🔍 Diagnosticando problema de login...');
    
    // Conectar a la base de datos
    await database.connect();
    
    // 1. Verificar si las columnas existen
    console.log('\n1. Verificando estructura de tabla Usuarios:');
    const columns = await database.executeQuery(`
      SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COLUMN_DEFAULT
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_NAME = 'Usuarios'
      ORDER BY ORDINAL_POSITION;
    `);
    
    console.log('Columnas encontradas:');
    columns.recordset.forEach(col => {
      console.log(`   • ${col.COLUMN_NAME} (${col.DATA_TYPE}) - Nullable: ${col.IS_NULLABLE}`);
    });
    
    // 2. Verificar si las columnas de contraseña temporal existen
    const passwordTempColumns = columns.recordset.filter(col => 
      col.COLUMN_NAME.includes('password_temporal')
    );
    
    console.log('\n2. Columnas de contraseña temporal:');
    if (passwordTempColumns.length > 0) {
      passwordTempColumns.forEach(col => {
        console.log(`   ✅ ${col.COLUMN_NAME} existe`);
      });
    } else {
      console.log('   ❌ No se encontraron columnas de contraseña temporal');
    }
    
    // 3. Listar usuarios existentes
    console.log('\n3. Usuarios en la base de datos:');
    const users = await database.executeQuery(`
      SELECT TOP 10 
        id_usuario, 
        nombre, 
        apellido, 
        email, 
        rol, 
        estatus,
        CASE 
          WHEN LEN(password) > 50 THEN 'HASHEADA'
          ELSE 'TEXTO PLANO'
        END as tipo_password
      FROM Usuarios
      ORDER BY fecha_registro DESC;
    `);
    
    console.log(`Total de usuarios encontrados: ${users.recordset.length}`);
    users.recordset.forEach(user => {
      console.log(`   • ${user.email} | ${user.rol} | ${user.estatus} | ${user.tipo_password}`);
    });
    
    // 4. Intentar la consulta que usa el login
    console.log('\n4. Probando consulta de login:');
    
    if (passwordTempColumns.length > 0) {
      // Con columnas de contraseña temporal
      const loginQuery = `
        SELECT id_usuario, nombre, apellido, nombre_usuario, email, password, rol, estatus, 
               tiene_password_temporal, fecha_password_temporal
        FROM Usuarios 
        WHERE estatus = 'activo'
        ORDER BY fecha_registro DESC;
      `;
      
      try {
        const loginTest = await database.executeQuery(loginQuery);
        console.log(`   ✅ Consulta de login exitosa - ${loginTest.recordset.length} usuarios activos`);
      } catch (queryError) {
        console.log(`   ❌ Error en consulta de login:`, queryError.message);
      }
    } else {
      // Sin columnas de contraseña temporal
      console.log('   ⚠️ Las columnas de contraseña temporal no existen');
    }
    
    console.log('\n✅ Diagnóstico completado');
    
  } catch (error) {
    console.error('❌ Error en diagnóstico:', error.message);
    throw error;
  }
}

// Ejecutar si se llama directamente
if (require.main === module) {
  diagnosticarLogin()
    .then(() => {
      console.log('\n🎯 Diagnóstico completado');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Error en diagnóstico:', error);
      process.exit(1);
    });
}

module.exports = { diagnosticarLogin };