// Script para verificar un usuario específico
const database = require('../config/database');
const bcrypt = require('bcryptjs');

async function verificarUsuario(email, password) {
  try {
    console.log('🔍 Verificando usuario:', email);
    
    await database.connect();
    
    // Buscar usuario
    const result = await database.executeQuery(
      `SELECT id_usuario, nombre, apellido, nombre_usuario, email, password, rol, estatus, 
              ISNULL(tiene_password_temporal, 0) as tiene_password_temporal, 
              fecha_password_temporal
       FROM Usuarios WHERE email = @email`,
      { email: email.toLowerCase() }
    );
    
    if (result.recordset.length === 0) {
      console.log('❌ Usuario no encontrado');
      return;
    }
    
    const user = result.recordset[0];
    console.log('✅ Usuario encontrado:');
    console.log('   • Nombre:', user.nombre, user.apellido);
    console.log('   • Email:', user.email);
    console.log('   • Rol:', user.rol);
    console.log('   • Estatus:', user.estatus);
    console.log('   • Contraseña temporal:', user.tiene_password_temporal ? 'SÍ' : 'NO');
    console.log('   • Fecha contraseña temporal:', user.fecha_password_temporal);
    
    // Verificar contraseña si se proporcionó
    if (password) {
      console.log('\n🔐 Verificando contraseña...');
      
      // Verificar si es hash de bcrypt
      const isBcryptHash = /^\$2[abxy]\$/.test(user.password);
      console.log('   • Tipo de contraseña:', isBcryptHash ? 'HASHEADA' : 'TEXTO PLANO');
      
      let passwordMatch = false;
      
      if (isBcryptHash) {
        passwordMatch = await bcrypt.compare(password, user.password);
      } else {
        passwordMatch = (password === user.password);
      }
      
      console.log('   • Contraseña correcta:', passwordMatch ? '✅ SÍ' : '❌ NO');
      
      if (passwordMatch) {
        console.log('\n🎯 Login sería exitoso para este usuario');
        
        if (user.tiene_password_temporal) {
          console.log('   → Sería redirigido a cambio de contraseña');
        } else {
          console.log('   → Sería redirigido al dashboard/cursos según rol');
        }
      }
    }
    
  } catch (error) {
    console.error('❌ Error verificando usuario:', error.message);
  }
}

// Usar desde línea de comandos
if (require.main === module) {
  const args = process.argv.slice(2);
  
  if (args.length < 1) {
    console.log('Uso: node scripts/check-user.js <email> [password]');
    console.log('Ejemplo: node scripts/check-user.js mendo@gmail.com mipassword');
    process.exit(1);
  }
  
  const email = args[0];
  const password = args[1];
  
  verificarUsuario(email, password)
    .then(() => {
      console.log('\n✅ Verificación completada');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Error:', error);
      process.exit(1);
    });
}

module.exports = { verificarUsuario };