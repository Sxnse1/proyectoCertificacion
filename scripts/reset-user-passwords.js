/**
 * Script para resetear contraseñas de usuarios de prueba
 * Esto te permitirá hacer login fácilmente para probar el carrito
 */

const bcrypt = require('bcrypt');
const sql = require('mssql');

// Configuración de la base de datos
const dbConfig = {
    server: process.env.DB_SERVER || 'Cesar',
    database: process.env.DB_DATABASE || 'StartEducationDB',
    user: process.env.DB_USER || 'barberadmin',
    password: process.env.DB_PASSWORD || 'barberpass123',
    port: parseInt(process.env.DB_PORT) || 1433,
    options: {
        encrypt: true,
        trustServerCertificate: true,
        enableArithAbort: true,
        requestTimeout: 30000,
        connectionTimeout: 30000
    }
};

async function resetPasswords() {
    try {
        // Conectar a la base de datos
        await sql.connect(dbConfig);
        console.log('✅ Conectado a la base de datos');

        // Contraseñas por defecto para testing
        const defaultPasswords = {
            'cesar@gmail.com': 'cesar123',
            'maria@example.com': 'maria123',
            'carlos@example.com': 'carlos123',
            'ana@example.com': 'ana123',
            'juanpi@gmail.com': 'juan123',
            'admin@starteducation.com': 'admin123'
        };

        console.log('\n🔄 Actualizando contraseñas...\n');

        for (const [email, plainPassword] of Object.entries(defaultPasswords)) {
            try {
                // Generar hash de la contraseña
                const hashedPassword = await bcrypt.hash(plainPassword, 10);
                
                // Actualizar la contraseña en la base de datos
                const result = await sql.query(`
                    UPDATE Usuarios 
                    SET password = '${hashedPassword}'
                    WHERE email = '${email}'
                `);

                if (result.rowsAffected[0] > 0) {
                    console.log(`✅ ${email} -> ${plainPassword}`);
                } else {
                    console.log(`⚠️  ${email} -> Usuario no encontrado`);
                }
            } catch (error) {
                console.log(`❌ ${email} -> Error: ${error.message}`);
            }
        }

        console.log('\n🎉 ¡Contraseñas actualizadas! Ahora puedes hacer login con:');
        console.log('\n📧 Usuarios disponibles para login:');
        console.log('   cesar@gmail.com / cesar123');
        console.log('   maria@example.com / maria123');
        console.log('   carlos@example.com / carlos123');
        console.log('   admin@starteducation.com / admin123');
        console.log('\n🛒 Después del login podrás agregar cursos al carrito!');

    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        // Cerrar conexión
        await sql.close();
        console.log('\n🔌 Conexión cerrada');
    }
}

// Ejecutar el script
resetPasswords();