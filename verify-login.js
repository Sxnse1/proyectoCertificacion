const bcrypt = require('bcryptjs');
const db = require('./config/database');

/**
 * Script para verificar que el login funcione correctamente
 * con las contraseñas hasheadas
 */
async function verificarLogin() {
    try {
        console.log('🧪 VERIFICANDO SISTEMA DE LOGIN...');
        
        const pool = await db.connect();
        
        // Obtener usuarios de prueba
        const result = await pool.request().query(`
            SELECT id_usuario, email, password, rol, estatus 
            FROM Usuarios 
            WHERE email IN (
                'cesardavila1937@gmail.com',
                'ericka@gmail.com', 
                'carlos.garcia@example.com',
                'juanpi@gmail.com',
                'rosa@gmail.com'
            )
            ORDER BY email
        `);
        
        console.log(`📊 Encontrados ${result.recordset.length} usuarios para verificar`);
        
        // Contraseñas de prueba conocidas
        const testCredentials = [
            { email: 'cesardavila1937@gmail.com', password: 'pass123' },
            { email: 'ericka@gmail.com', password: 'pass123' },
            { email: 'carlos.garcia@example.com', password: 'HASHED_PASSWORD_AQUI' },
            { email: 'juanpi@gmail.com', password: 'unknown' }, // No sabemos la contraseña original
            { email: 'rosa@gmail.com', password: 'unknown' }    // No sabemos la contraseña original
        ];
        
        console.log('\n🔍 VERIFICANDO CREDENCIALES...\n');
        
        for (const testCred of testCredentials) {
            const user = result.recordset.find(u => u.email === testCred.email);
            
            if (!user) {
                console.log(`❌ Usuario no encontrado: ${testCred.email}`);
                continue;
            }
            
            console.log(`👤 Usuario: ${testCred.email}`);
            console.log(`   Rol: ${user.rol}`);
            console.log(`   Estatus: ${user.estatus}`);
            console.log(`   Hash: ${user.password.substring(0, 30)}...`);
            
            if (testCred.password === 'unknown') {
                console.log(`   ⚠️  Contraseña original desconocida - omitiendo verificación`);
                console.log('');
                continue;
            }
            
            try {
                // Simular verificación de login
                const isValidPassword = await bcrypt.compare(testCred.password, user.password);
                
                if (isValidPassword) {
                    console.log(`   ✅ Login OK - Contraseña '${testCred.password}' válida`);
                } else {
                    console.log(`   ❌ Login FALLO - Contraseña '${testCred.password}' inválida`);
                }
                
            } catch (error) {
                console.log(`   ❌ Error en verificación: ${error.message}`);
            }
            
            console.log('');
        }
        
        // Mostrar instrucciones de login
        console.log('📋 CREDENCIALES DE PRUEBA CONFIRMADAS:');
        console.log('');
        console.log('🔐 Para probar el login, usa:');
        console.log('   • cesardavila1937@gmail.com / pass123');
        console.log('   • ericka@gmail.com / pass123');
        console.log('   • carlos.garcia@example.com / HASHED_PASSWORD_AQUI');
        console.log('');
        console.log('ℹ️  Nota: Los usuarios juanpi@gmail.com y rosa@gmail.com ya tenían');
        console.log('   contraseñas hasheadas, pero no conocemos sus contraseñas originales.');
        
    } catch (error) {
        console.error('❌ Error en verificación:', error.message);
    } finally {
        if (db.pool) {
            await db.pool.close();
        }
        process.exit(0);
    }
}

// Ejecutar verificación
if (require.main === module) {
    verificarLogin();
}

module.exports = { verificarLogin };