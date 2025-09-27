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
        encrypt: process.env.DB_ENCRYPT === 'true',
        trustServerCertificate: process.env.DB_TRUST_CERT === 'true',
        enableArithAbort: true,
        // Timeouts más largos para Heroku y AWS RDS
        connectionTimeout: process.env.NODE_ENV === 'production' ? 90000 : 30000,
        requestTimeout: process.env.NODE_ENV === 'production' ? 90000 : 30000,
        // Configuraciones específicas para AWS RDS en Heroku
        ...(process.env.NODE_ENV === 'production' && {
            // Usar TLS 1.2 mínimo para AWS RDS
            cryptoCredentialsDetails: {
                minVersion: 'TLSv1.2'
            },
            // Configuraciones adicionales para estabilidad
            packetSize: 4096,
            connectionRetryInterval: 1000,
            maxRetriesOnFailover: 3,
            multiSubnetFailover: false
        })
    },
    pool: {
        max: process.env.NODE_ENV === 'production' ? 15 : 10,
        min: process.env.NODE_ENV === 'production' ? 2 : 0,
        idleTimeoutMillis: 30000,
        acquireTimeoutMillis: 90000, // Más tiempo para adquirir conexión
        createTimeoutMillis: 60000,  // Más tiempo para crear conexión
        destroyTimeoutMillis: 5000,
        reapIntervalMillis: 1000,
        createRetryIntervalMillis: 200
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
        console.log(`[DB]    🌍 Entorno: ${process.env.NODE_ENV || 'development'}`);
        console.log(`[DB]    🕒 Timeout conexión: ${config.options.connectionTimeout}ms`);
        console.log(`[DB]    🕒 Timeout consulta: ${config.options.requestTimeout}ms`);
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
        console.error('[DB] 🔍 Código de error:', err.code || 'Sin código');
        console.error('[DB] 🔍 Número de error:', err.number || 'Sin número');
        console.error('[DB] 🔍 Estado:', err.state || 'Sin estado');
        console.error('[DB] 🔍 Severidad:', err.class || 'Sin severidad');
        
        // Diagnósticos específicos para Heroku y AWS RDS
        if (err.message.includes('ECONNREFUSED')) {
            console.error('[DB] 💡 PROBLEMA DE CONECTIVIDAD:');
            console.error('[DB]    - El servidor SQL no es accesible');
            console.error('[DB]    - Verificar que el servidor esté ejecutándose');
            console.error('[DB]    - Verificar configuración de Security Groups (AWS)');
        } else if (err.message.includes('ETIMEOUT') || err.message.includes('timeout')) {
            console.error('[DB] 💡 PROBLEMA DE TIMEOUT:');
            console.error('[DB]    - Conexión muy lenta o bloqueada');
            console.error('[DB]    - Verificar Security Groups en AWS RDS');
            console.error('[DB]    - Verificar que el puerto 1433 esté abierto');
            console.error('[DB]    - Agregar IPs de Heroku al whitelist');
        } else if (err.message.includes('Login failed') || err.message.includes('authentication')) {
            console.error('[DB] 💡 PROBLEMA DE AUTENTICACIÓN:');
            console.error('[DB]    - Usuario o contraseña incorrectos');
            console.error('[DB]    - Verificar variables de entorno en Heroku');
            console.error('[DB]    - Verificar que el usuario tenga permisos');
        } else if (err.message.includes('Cannot open database')) {
            console.error('[DB] 💡 PROBLEMA DE BASE DE DATOS:');
            console.error('[DB]    - La base de datos no existe');
            console.error('[DB]    - El usuario no tiene acceso a la base de datos');
            console.error('[DB]    - Verificar nombre de la base de datos');
        } else if (err.message.includes('getaddrinfo ENOTFOUND')) {
            console.error('[DB] 💡 PROBLEMA DE DNS:');
            console.error('[DB]    - No se puede resolver el nombre del servidor');
            console.error('[DB]    - Verificar el nombre del servidor en variables de entorno');
        }
        
        console.error('[DB] 🔧 PARA HEROKU - Verificar:');
        console.error('[DB]    1. heroku config (variables de entorno)');
        console.error('[DB]    2. Security Groups en AWS RDS');
        console.error('[DB]    3. heroku logs --tail (logs en vivo)');
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