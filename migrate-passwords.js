const bcrypt = require('bcryptjs');
const db = require('./config/database');

/**
 * Script para hashear contraseñas existentes que están en texto plano
 * ADVERTENCIA: Este script solo debe ejecutarse UNA VEZ
 */
async function hashearContrasenasExistentes() {
    try {
        console.log('🔐 INICIANDO MIGRACIÓN DE CONTRASEÑAS...');
        console.log('⚠️  ADVERTENCIA: Este proceso hasheará todas las contraseñas en texto plano');
        
        const pool = await db.connect();
        
        // Obtener todos los usuarios
        const result = await pool.request().query(`
            SELECT id_usuario, email, password 
            FROM Usuarios 
            ORDER BY id_usuario
        `);
        
        console.log(`📊 Encontrados ${result.recordset.length} usuarios`);
        
        let processedCount = 0;
        let skippedCount = 0;
        
        for (const user of result.recordset) {
            try {
                // Verificar si la contraseña ya está hasheada
                // Los hashes de bcrypt siempre empiezan con $2a$, $2b$, $2x$, $2y$
                const isAlreadyHashed = /^\$2[abxy]\$/.test(user.password);
                
                if (isAlreadyHashed) {
                    console.log(`⏭️  ${user.email}: Ya hasheada, omitiendo...`);
                    skippedCount++;
                    continue;
                }
                
                // Hashear la contraseña
                const hashedPassword = await bcrypt.hash(user.password, 10);
                
                // Actualizar en la base de datos
                await pool.request()
                    .input('id', user.id_usuario)
                    .input('hashedPassword', hashedPassword)
                    .query(`
                        UPDATE Usuarios 
                        SET password = @hashedPassword 
                        WHERE id_usuario = @id
                    `);
                
                console.log(`✅ ${user.email}: Contraseña hasheada (${user.password} -> ${hashedPassword.substring(0, 20)}...)`);
                processedCount++;
                
            } catch (userError) {
                console.error(`❌ Error procesando usuario ${user.email}:`, userError.message);
            }
        }
        
        console.log('\n🎉 MIGRACIÓN COMPLETADA');
        console.log(`✅ Contraseñas hasheadas: ${processedCount}`);
        console.log(`⏭️  Contraseñas ya hasheadas: ${skippedCount}`);
        console.log(`📊 Total procesado: ${processedCount + skippedCount}`);
        
        // Verificar que todas las contraseñas estén hasheadas
        const verification = await pool.request().query(`
            SELECT COUNT(*) as total,
                   SUM(CASE WHEN password LIKE '$2%$%' THEN 1 ELSE 0 END) as hashed,
                   SUM(CASE WHEN password NOT LIKE '$2%$%' THEN 1 ELSE 0 END) as plain_text
            FROM Usuarios
        `);
        
        const stats = verification.recordset[0];
        console.log('\n📈 ESTADÍSTICAS FINALES:');
        console.log(`👥 Total usuarios: ${stats.total}`);
        console.log(`🔐 Contraseñas hasheadas: ${stats.hashed}`);
        console.log(`⚠️  Contraseñas en texto plano: ${stats.plain_text}`);
        
        if (stats.plain_text > 0) {
            console.log('\n⚠️  ADVERTENCIA: Aún hay contraseñas en texto plano!');
        } else {
            console.log('\n✅ ¡Todas las contraseñas están hasheadas correctamente!');
        }
        
    } catch (error) {
        console.error('❌ Error en la migración:', error.message);
        console.error('Stack:', error.stack);
    } finally {
        // Cerrar conexión
        if (db.pool) {
            await db.pool.close();
        }
        process.exit(0);
    }
}

// Ejecutar solo si se llama directamente
if (require.main === module) {
    console.log('🚀 Ejecutando migración de contraseñas...');
    hashearContrasenasExistentes();
}

module.exports = { hashearContrasenasExistentes };