const sql = require('mssql');
require('dotenv').config();

// Configuración de la base de datos desde .env
const config = {
    server: process.env.DB_SERVER,
    database: process.env.DB_DATABASE,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    port: parseInt(process.env.DB_PORT) || 1433,
    options: {
        encrypt: process.env.DB_ENCRYPT === 'true',
        trustServerCertificate: process.env.DB_TRUST_CERT === 'true',
        enableArithAbort: true,
        connectionTimeout: 30000,
        requestTimeout: 30000
    }
};

async function checkDatabase() {
    try {
        console.log('🔄 Conectando a la base de datos...');
        await sql.connect(config);
        console.log('✅ Conexión exitosa');

        // 1. Verificar si la tabla Usuarios existe
        console.log('\n🔍 Verificando si la tabla Usuarios existe...');
        const tableCheck = await sql.query(`
            SELECT TABLE_NAME 
            FROM INFORMATION_SCHEMA.TABLES 
            WHERE TABLE_NAME = 'Usuarios'
        `);
        
        if (tableCheck.recordset.length === 0) {
            console.log('❌ La tabla Usuarios NO existe');
            console.log('📋 Listando todas las tablas disponibles:');
            
            const allTables = await sql.query(`
                SELECT TABLE_NAME 
                FROM INFORMATION_SCHEMA.TABLES 
                WHERE TABLE_TYPE = 'BASE TABLE'
                ORDER BY TABLE_NAME
            `);
            
            console.log('Tablas encontradas:', allTables.recordset.map(t => t.TABLE_NAME));
            return;
        }

        console.log('✅ La tabla Usuarios existe');

        // 2. Verificar la estructura de la tabla
        console.log('\n📋 Estructura de la tabla Usuarios:');
        const columns = await sql.query(`
            SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COLUMN_DEFAULT
            FROM INFORMATION_SCHEMA.COLUMNS
            WHERE TABLE_NAME = 'Usuarios'
            ORDER BY ORDINAL_POSITION
        `);
        
        console.table(columns.recordset);

        // 3. Contar todos los usuarios
        console.log('\n👥 Contando usuarios...');
        const userCount = await sql.query(`SELECT COUNT(*) as total FROM Usuarios`);
        console.log(`Total de usuarios: ${userCount.recordset[0].total}`);

        // 4. Mostrar todos los usuarios si hay algunos
        if (userCount.recordset[0].total > 0) {
            console.log('\n📋 Lista de usuarios:');
            const allUsers = await sql.query(`
                SELECT id_usuario, nombre, apellido, email, rol, estatus, fecha_registro
                FROM Usuarios
                ORDER BY id_usuario
            `);
            console.table(allUsers.recordset);
        } else {
            console.log('❌ No hay usuarios en la base de datos');
        }

        // 5. Verificar específicamente el usuario admin que intentamos crear
        console.log('\n🔍 Buscando usuario admin específico...');
        const adminUser = await sql.query(`
            SELECT * FROM Usuarios WHERE email = 'admin@starteducation.com'
        `);
        
        if (adminUser.recordset.length > 0) {
            console.log('✅ Usuario admin encontrado:');
            console.table(adminUser.recordset);
        } else {
            console.log('❌ Usuario admin NO encontrado');
        }

    } catch (error) {
        console.error('❌ Error al verificar la base de datos:', error);
    } finally {
        await sql.close();
        console.log('\n🔌 Conexión cerrada');
    }
}

// Ejecutar el script
checkDatabase();