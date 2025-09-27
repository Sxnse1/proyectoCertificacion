const bcrypt = require('bcryptjs');
const db = require('./config/database');

/**
 * Script completo de validación del sistema de login
 */
async function validarSistemaCompleto() {
    try {
        console.log('🔍 VALIDACIÓN COMPLETA DEL SISTEMA DE LOGIN');
        console.log('=' .repeat(50));
        
        const pool = await db.connect();
        
        // 1. Verificar estructura de la tabla
        console.log('\n1️⃣ VERIFICANDO ESTRUCTURA DE LA TABLA...');
        
        const tableInfo = await pool.request().query(`
            SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, CHARACTER_MAXIMUM_LENGTH
            FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_NAME = 'Usuarios'
            ORDER BY ORDINAL_POSITION
        `);
        
        console.log('📋 Columnas encontradas:');
        tableInfo.recordset.forEach(col => {
            console.log(`   • ${col.COLUMN_NAME} (${col.DATA_TYPE}${col.CHARACTER_MAXIMUM_LENGTH ? `(${col.CHARACTER_MAXIMUM_LENGTH})` : ''}) - ${col.IS_NULLABLE === 'YES' ? 'NULL' : 'NOT NULL'}`);
        });
        
        // 2. Verificar todos los usuarios
        console.log('\n2️⃣ VERIFICANDO USUARIOS EN LA BASE DE DATOS...');
        
        const allUsers = await pool.request().query(`
            SELECT id_usuario, nombre, apellido, email, rol, estatus, 
                   LEN(password) as password_length,
                   CASE 
                       WHEN password LIKE '$2%$%' THEN 'HASHEADA'
                       ELSE 'TEXTO PLANO'
                   END as password_status
            FROM Usuarios 
            ORDER BY rol DESC, nombre
        `);
        
        console.log(`👥 Total de usuarios: ${allUsers.recordset.length}`);
        
        let hashedCount = 0;
        let plainTextCount = 0;
        
        allUsers.recordset.forEach(user => {
            const status = user.password_status === 'HASHEADA' ? '🔐' : '⚠️';
            console.log(`   ${status} ${user.nombre} ${user.apellido} (${user.email})`);
            console.log(`      Rol: ${user.rol} | Estatus: ${user.estatus} | Contraseña: ${user.password_status} (${user.password_length} chars)`);
            
            if (user.password_status === 'HASHEADA') {
                hashedCount++;
            } else {
                plainTextCount++;
            }
        });
        
        console.log(`\n📊 Resumen de contraseñas:`);
        console.log(`   🔐 Hasheadas: ${hashedCount}`);
        console.log(`   ⚠️  Texto plano: ${plainTextCount}`);
        
        // 3. Verificar credenciales conocidas
        console.log('\n3️⃣ PROBANDO CREDENCIALES CONOCIDAS...');
        
        const knownCredentials = [
            { email: 'cesardavila1937@gmail.com', password: 'pass123', expectedRole: 'instructor' },
            { email: 'ericka@gmail.com', password: 'pass123', expectedRole: 'instructor' },
            { email: 'carlos.garcia@example.com', password: 'HASHED_PASSWORD_AQUI', expectedRole: 'user' }
        ];
        
        for (const cred of knownCredentials) {
            try {
                const userResult = await pool.request()
                    .input('email', cred.email)
                    .query('SELECT * FROM Usuarios WHERE email = @email');
                
                if (userResult.recordset.length === 0) {
                    console.log(`❌ Usuario no encontrado: ${cred.email}`);
                    continue;
                }
                
                const user = userResult.recordset[0];
                const passwordMatch = await bcrypt.compare(cred.password, user.password);
                
                const statusIcon = passwordMatch ? '✅' : '❌';
                const roleIcon = user.rol === cred.expectedRole ? '✅' : '❌';
                
                console.log(`   ${statusIcon} ${cred.email}`);
                console.log(`      Contraseña: ${passwordMatch ? 'VÁLIDA' : 'INVÁLIDA'}`);
                console.log(`      Rol esperado: ${cred.expectedRole} | Rol actual: ${user.rol} ${roleIcon}`);
                console.log(`      Estatus: ${user.estatus}`);
                
            } catch (error) {
                console.log(`❌ Error probando ${cred.email}: ${error.message}`);
            }
        }
        
        // 4. Verificar rutas y endpoints
        console.log('\n4️⃣ VERIFICANDO CONFIGURACIÓN DEL SISTEMA...');
        
        console.log('📂 Archivos del sistema:');
        const fs = require('fs');
        const files = [
            'routes/auth.js',
            'routes/register.js',
            'views/login.hbs',
            'config/database.js',
            'migrate-passwords.js',
            'verify-login.js',
            'CREDENCIALES.md'
        ];
        
        files.forEach(file => {
            const exists = fs.existsSync(file);
            console.log(`   ${exists ? '✅' : '❌'} ${file}`);
        });
        
        // 5. Resumen final
        console.log('\n5️⃣ RESUMEN FINAL');
        console.log('=' .repeat(30));
        
        const allPasswordsHashed = plainTextCount === 0;
        const hasValidCredentials = hashedCount >= 3;
        
        console.log(`Sistema de login: ${allPasswordsHashed && hasValidCredentials ? '✅ FUNCIONANDO' : '⚠️ NECESITA ATENCIÓN'}`);
        console.log(`Contraseñas hasheadas: ${allPasswordsHashed ? '✅' : '❌'} (${hashedCount}/${allUsers.recordset.length})`);
        console.log(`Credenciales de prueba: ${hasValidCredentials ? '✅' : '❌'}`);
        
        console.log('\n🔗 URLs de prueba:');
        console.log('   • http://localhost:3000/auth/login');
        console.log('   • http://localhost:3000/login-test.html');
        console.log('   • http://localhost:3000/nav-test.html');
        
        console.log('\n📋 Próximos pasos:');
        if (allPasswordsHashed && hasValidCredentials) {
            console.log('   ✅ El sistema está listo para usar');
            console.log('   📝 Usa las credenciales del archivo CREDENCIALES.md');
            console.log('   🧪 Prueba el login desde login-test.html');
        } else {
            console.log('   ⚠️ Revisa las contraseñas que aún están en texto plano');
            console.log('   🔄 Ejecuta migrate-passwords.js si es necesario');
        }
        
    } catch (error) {
        console.error('❌ Error en validación:', error.message);
        console.error('Stack:', error.stack);
    } finally {
        if (db.pool) {
            await db.pool.close();
        }
        process.exit(0);
    }
}

// Ejecutar validación
if (require.main === module) {
    validarSistemaCompleto();
}

module.exports = { validarSistemaCompleto };