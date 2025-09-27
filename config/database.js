// Configuración de conexión a SQL Server
require('dotenv').config();
const sql = require('mssql');

// Configuración de la base de datos desde variables de entorno
const config = {
    server: process.env.DB_SERVER || 'localhost',
    database: process.env.DB_DATABASE || 'proyectoCertificacion',
    user: process.env.DB_USER || 'sa',
    password: process.env.DB_PASSWORD || '',
    port: parseInt(process.env.DB_PORT) || 1433,
    options: {
        encrypt: process.env.DB_ENCRYPT === 'true', // Para Azure SQL Database
        trustServerCertificate: process.env.DB_TRUST_CERT === 'true', // Para desarrollo local
        enableArithAbort: true,
        connectionTimeout: process.env.NODE_ENV === 'production' ? 60000 : 30000,
        requestTimeout: process.env.NODE_ENV === 'production' ? 60000 : 30000,
        // Configuraciones adicionales para producción
        ...(process.env.NODE_ENV === 'production' && {
            cryptoCredentialsDetails: {
                minVersion: 'TLSv1.2'
            }
        })
    },
    pool: {
        max: process.env.NODE_ENV === 'production' ? 20 : 10,
        min: process.env.NODE_ENV === 'production' ? 5 : 0,
        idleTimeoutMillis: 30000,
        acquireTimeoutMillis: 60000,
        createTimeoutMillis: 30000,
        destroyTimeoutMillis: 5000,
        reapIntervalMillis: 1000
    }
};

let pool = null;

/**
 * Conecta a SQL Server y retorna el pool de conexiones
 */
async function connect() {
    if (pool && pool.connected) {
        console.log('[DB] 🔄 Usando conexión existente');
        return pool;
    }

    try {
        console.log('='.repeat(50));
        console.log('[DB] 🚀 INICIANDO CONEXIÓN A SQL SERVER');
        console.log('='.repeat(50));
        console.log('[DB] 📋 Configuración de conexión:');
        console.log(`[DB]    📍 Servidor: ${config.server}`);
        console.log(`[DB]    🗃️  Base de datos: ${config.database}`);
        console.log(`[DB]    👤 Usuario: ${config.user}`);
        console.log(`[DB]    🔌 Puerto: ${config.port}`);
        console.log(`[DB]    🔐 Encriptación: ${config.options.encrypt ? 'SÍ' : 'NO'}`);
        console.log(`[DB]    🛡️  Certificado confiable: ${config.options.trustServerCertificate ? 'SÍ' : 'NO'}`);
        console.log('-'.repeat(50));

        console.log('[DB] ⏳ Estableciendo conexión...');
        pool = await sql.connect(config);
        
        console.log('[DB] ✅ ¡CONEXIÓN EXITOSA!');
        
        // Probar la conexión con una consulta simple
        console.log('[DB] 🧪 Probando conexión con consulta...');
        const testResult = await pool.request().query('SELECT @@VERSION as version, GETDATE() as fecha');
        
        console.log('[DB] 📊 Información del servidor:');
        console.log(`[DB]    📅 Fecha/Hora servidor: ${testResult.recordset[0].fecha}`);
        console.log(`[DB]    💾 Versión SQL Server: ${testResult.recordset[0].version.split('\n')[0]}`);
        
        console.log('='.repeat(50));
        console.log('[DB] 🎉 BASE DE DATOS LISTA PARA USAR');
        console.log('='.repeat(50));
        
        // Evento para manejar errores de conexión
        pool.on('error', err => {
            console.error('[DB] ❌ Error en pool de conexiones:', err);
        });

        return pool;
    } catch (err) {
        console.log('='.repeat(50));
        console.error('[DB] ❌ ERROR DE CONEXIÓN');
        console.log('='.repeat(50));
        console.error('[DB] 💥 Mensaje de error:', err.message);
        console.error('[DB] 🔍 Detalles del error:', err.code || 'Sin código');
        
        if (err.message.includes('ECONNREFUSED')) {
            console.error('[DB] 💡 Posibles soluciones:');
            console.error('[DB]    1. Verificar que SQL Server esté ejecutándose');
            console.error('[DB]    2. Verificar el puerto (por defecto 1433)');
            console.error('[DB]    3. Verificar firewall de Windows');
        } else if (err.message.includes('Login failed')) {
            console.error('[DB] 💡 Posibles soluciones:');
            console.error('[DB]    1. Verificar usuario y contraseña');
            console.error('[DB]    2. Verificar permisos del usuario');
            console.error('[DB]    3. Verificar autenticación SQL habilitada');
        }
        
        console.log('='.repeat(50));
        throw err;
    }
}

/**
 * Obtiene el pool de conexiones actual
 */
function getPool() {
    if (!pool || !pool.connected) {
        throw new Error('La base de datos no está conectada. Llama a connect() primero.');
    }
    return pool;
}

/**
 * Ejecuta una consulta SQL
 * @param {string} query - La consulta SQL a ejecutar
 * @param {object} params - Parámetros para la consulta (opcional)
 */
async function executeQuery(query, params = {}) {
    try {
        const pool = getPool();
        const request = pool.request();
        
        // Agregar parámetros si existen
        Object.keys(params).forEach(key => {
            request.input(key, params[key]);
        });
        
        const result = await request.query(query);
        return result;
    } catch (err) {
        console.error('[DB] Error ejecutando consulta:', err.message);
        throw err;
    }
}

/**
 * Cierra la conexión a la base de datos
 */
async function close() {
    if (pool) {
        try {
            await pool.close();
            pool = null;
            console.log('[DB] Conexión cerrada');
        } catch (err) {
            console.error('[DB] Error cerrando conexión:', err.message);
        }
    }
}

module.exports = {
    connect,
    getPool,
    executeQuery,
    close,
    sql // Exportamos sql para usar tipos de datos
};