const sql = require('mssql');
const bcrypt = require('bcryptjs');
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

async function createAdminUser() {
    try {
        console.log('🔄 Conectando a la base de datos...');
        await sql.connect(config);
        console.log('✅ Conexión exitosa');

        // Verificar si ya existe un usuario con este email
        const existingUser = await sql.query(`
            SELECT COUNT(*) as count FROM Usuarios WHERE email = 'admin@starteducation.com'
        `);

        if (existingUser.recordset[0].count > 0) {
            console.log('⚠️ Ya existe un usuario con el email admin@starteducation.com');
            return;
        }

        // Generar hash de la contraseña
        const password = 'admin123'; // Cambia esta contraseña
        const hashedPassword = await bcrypt.hash(password, 10);

        // Insertar el usuario administrador/instructor
        const result = await sql.query(`
            INSERT INTO Usuarios (nombre, apellido, nombre_usuario, email, password, rol, estatus, activo, fecha_registro)
            VALUES (
                'Administrador',
                'Sistema',
                'admin',
                'admin@starteducation.com',
                '${hashedPassword}',
                'instructor',
                'activo',
                1,
                GETDATE()
            )
        `);

        console.log('✅ Usuario administrador creado exitosamente!');
        console.log('📧 Email: admin@starteducation.com');
        console.log('🔑 Contraseña: admin123');
        console.log('👤 Rol: instructor');
        console.log('');
        console.log('🚨 IMPORTANTE: Cambia la contraseña después del primer login');

        // Verificar que se creó correctamente
        const newUser = await sql.query(`
            SELECT id_usuario, nombre, apellido, email, rol, estatus, activo, fecha_registro
            FROM Usuarios 
            WHERE email = 'admin@starteducation.com'
        `);

        console.log('');
        console.log('✅ Usuario verificado:', newUser.recordset[0]);

    } catch (error) {
        console.error('❌ Error al crear usuario administrador:', error);
    } finally {
        await sql.close();
        console.log('🔌 Conexión cerrada');
    }
}

// Ejecutar el script
createAdminUser();