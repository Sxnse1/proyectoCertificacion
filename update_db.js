const sql = require('mssql');
const fs = require('fs');
const path = require('path');

// Configuración de la base de datos
const config = {
    server: 'starteducation.c1wqwe44ocx1.us-east-2.rds.amazonaws.com',
    database: 'StartEducationDB',
    user: 'barberadmin',
    password: 'barberadmin193755',
    options: {
        encrypt: true,
        trustServerCertificate: true,
        enableArithAbort: true,
        connectionTimeout: 30000,
        requestTimeout: 30000
    }
};

async function updateDatabase() {
    try {
        console.log('🔄 Conectando a la base de datos...');
        await sql.connect(config);
        console.log('✅ Conexión exitosa');

        // 1. Agregar columna 'activo' si no existe
        console.log('📝 Verificando columna activo en Usuarios...');
        const checkColumn = await sql.query(`
            SELECT COLUMN_NAME
            FROM INFORMATION_SCHEMA.COLUMNS
            WHERE TABLE_NAME = 'Usuarios' AND COLUMN_NAME = 'activo'
        `);

        if (checkColumn.recordset.length === 0) {
            console.log('➕ Agregando columna activo...');
            await sql.query(`ALTER TABLE Usuarios ADD activo BIT NOT NULL DEFAULT 1`);
            console.log('✅ Columna activo agregada');
        } else {
            console.log('✅ Columna activo ya existe');
        }

        // 2. Actualizar rol del usuario
        console.log('👤 Actualizando rol del usuario juanpi@gmail.com...');
        const updateResult = await sql.query(`
            UPDATE Usuarios
            SET rol = 'user'
            WHERE email = 'juanpi@gmail.com'
        `);
        console.log(`✅ ${updateResult.rowsAffected[0]} usuario(s) actualizado(s)`);

        // 3. Verificar el cambio
        const userCheck = await sql.query(`
            SELECT id_usuario, nombre, apellido, email, rol, activo
            FROM Usuarios
            WHERE email = 'juanpi@gmail.com'
        `);
        console.log('👤 Usuario actualizado:', userCheck.recordset[0]);

        // 4. Insertar datos de prueba
        console.log('📚 Insertando datos de prueba...');

        // Categorías
        const categoriasCheck = await sql.query(`SELECT COUNT(*) as count FROM Categorias`);
        if (categoriasCheck.recordset[0].count === 0) {
            await sql.query(`
                INSERT INTO Categorias (nombre, descripcion) VALUES
                ('Desarrollo Web', 'Cursos sobre desarrollo web frontend y backend'),
                ('Bases de Datos', 'Cursos sobre diseño y administración de bases de datos'),
                ('Programación', 'Cursos de lenguajes de programación')
            `);
            console.log('✅ Categorías insertadas');
        }

        // Usuario instructor
        const instructorCheck = await sql.query(`
            SELECT COUNT(*) as count FROM Usuarios WHERE email = 'instructor@starteducation.com'
        `);
        if (instructorCheck.recordset[0].count === 0) {
            await sql.query(`
                INSERT INTO Usuarios (nombre, apellido, nombre_usuario, email, password, rol, estatus, activo)
                VALUES ('María', 'González', 'instructor1', 'instructor@starteducation.com',
                        '$2b$10$dummy.hash.for.testing.purposes.only', 'instructor', 'activo', 1)
            `);
            console.log('✅ Instructor insertado');
        }

        // Cursos
        const cursosCheck = await sql.query(`SELECT COUNT(*) as count FROM Cursos`);
        if (cursosCheck.recordset[0].count === 0) {
            const instructorId = await sql.query(`
                SELECT id_usuario FROM Usuarios WHERE email = 'instructor@starteducation.com'
            `);
            const categoriaId = await sql.query(`
                SELECT id_categoria FROM Categorias WHERE nombre = 'Desarrollo Web'
            `);

            if (instructorId.recordset.length > 0 && categoriaId.recordset.length > 0) {
                await sql.query(`
                    INSERT INTO Cursos (id_usuario, id_categoria, titulo, descripcion, precio, nivel, estatus)
                    VALUES (${instructorId.recordset[0].id_usuario}, ${categoriaId.recordset[0].id_categoria},
                            'JavaScript Avanzado', 'Curso completo de JavaScript moderno con ES6+', 49.99, 'avanzado', 'publicado'),
                           (${instructorId.recordset[0].id_usuario}, ${categoriaId.recordset[0].id_categoria},
                            'React para Principiantes', 'Aprende React desde cero', 39.99, 'intermedio', 'publicado')
                `);
                console.log('✅ Cursos insertados');
            }
        }

        // Certificados de prueba
        const certificadosCheck = await sql.query(`
            SELECT COUNT(*) as count FROM Certificados WHERE id_usuario = 4
        `);
        if (certificadosCheck.recordset[0].count === 0) {
            const cursoId = await sql.query(`SELECT TOP 1 id_curso FROM Cursos ORDER BY id_curso`);
            if (cursoId.recordset.length > 0) {
                const codigo = 'CERT' + Math.random().toString(36).substr(2, 6).toUpperCase();
                await sql.query(`
                    INSERT INTO Certificados (id_usuario, id_curso, fecha_emision, codigo_validacion)
                    VALUES (4, ${cursoId.recordset[0].id_curso}, GETDATE(), '${codigo}')
                `);
                console.log('✅ Certificado de prueba insertado');
            }
        }

        // Estadísticas finales
        const stats = await sql.query(`
            SELECT 'Usuarios' as tabla, COUNT(*) as cantidad FROM Usuarios
            UNION ALL
            SELECT 'Categorias', COUNT(*) FROM Categorias
            UNION ALL
            SELECT 'Cursos', COUNT(*) FROM Cursos
            UNION ALL
            SELECT 'Certificados', COUNT(*) FROM Certificados
        `);

        console.log('\n📊 Estadísticas de la base de datos:');
        stats.recordset.forEach(row => {
            console.log(`  ${row.tabla}: ${row.cantidad}`);
        });

        console.log('\n🎉 ¡Base de datos actualizada exitosamente!');
        console.log('👤 Usuario juanpi@gmail.com ahora tiene rol: user');

    } catch (error) {
        console.error('❌ Error actualizando la base de datos:', error);
    } finally {
        await sql.close();
    }
}

updateDatabase();