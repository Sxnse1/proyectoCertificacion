-- Script para actualizar la base de datos StartEducationDB
-- Ejecutar en SQL Server Management Studio o similar

USE StartEducationDB;
GO

-- 1. Agregar columna 'activo' a la tabla Usuarios si no existe
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('Usuarios') AND name = 'activo')
BEGIN
    ALTER TABLE Usuarios ADD activo BIT NOT NULL DEFAULT 1;
END
GO

-- 2. Actualizar el rol del usuario juanpi@gmail.com a 'admin'
UPDATE Usuarios
SET rol = 'admin'
WHERE email = 'juanpi@gmail.com';
GO

-- 3. Verificar que el cambio se aplicó
SELECT id_usuario, nombre, apellido, email, rol, activo
FROM Usuarios
WHERE email = 'juanpi@gmail.com';
GO

-- 4. Crear algunos datos de prueba si no existen
-- Insertar categorías de prueba
IF NOT EXISTS (SELECT * FROM Categorias WHERE nombre = 'Desarrollo Web')
BEGIN
    INSERT INTO Categorias (nombre, descripcion) VALUES
    ('Desarrollo Web', 'Cursos sobre desarrollo web frontend y backend'),
    ('Bases de Datos', 'Cursos sobre diseño y administración de bases de datos'),
    ('Programación', 'Cursos de lenguajes de programación');
END
GO

-- Insertar usuario instructor si no existe
IF NOT EXISTS (SELECT * FROM Usuarios WHERE email = 'instructor@starteducation.com')
BEGIN
    INSERT INTO Usuarios (nombre, apellido, nombre_usuario, email, password, rol, estatus, activo)
    VALUES ('María', 'González', 'instructor1', 'instructor@starteducation.com',
            '$2b$10$dummy.hash.for.testing.purposes.only', 'instructor', 'activo', 1);
END
GO

-- Insertar cursos de prueba
IF NOT EXISTS (SELECT * FROM Cursos WHERE titulo = 'JavaScript Avanzado')
BEGIN
    DECLARE @id_instructor INT = (SELECT id_usuario FROM Usuarios WHERE email = 'instructor@starteducation.com');
    DECLARE @id_categoria INT = (SELECT id_categoria FROM Categorias WHERE nombre = 'Desarrollo Web');

    INSERT INTO Cursos (id_usuario, id_categoria, titulo, descripcion, precio, nivel, estatus)
    VALUES (@id_instructor, @id_categoria, 'JavaScript Avanzado',
            'Curso completo de JavaScript moderno con ES6+', 49.99, 'avanzado', 'publicado');

    INSERT INTO Cursos (id_usuario, id_categoria, titulo, descripcion, precio, nivel, estatus)
    VALUES (@id_instructor, @id_categoria, 'React para Principiantes',
            'Aprende React desde cero', 39.99, 'intermedio', 'publicado');
END
GO

-- Insertar algunos certificados de prueba
IF NOT EXISTS (SELECT * FROM Certificados WHERE id_usuario = 4)
BEGIN
    DECLARE @id_curso INT = (SELECT TOP 1 id_curso FROM Cursos ORDER BY id_curso);

    INSERT INTO Certificados (id_usuario, id_curso, fecha_emision, codigo_validacion)
    VALUES (4, @id_curso, GETDATE(), 'CERT' + CAST(ABS(CHECKSUM(NEWID())) % 1000000 AS VARCHAR(6)));
END
GO

-- Verificar datos insertados
SELECT 'Usuarios' as tabla, COUNT(*) as cantidad FROM Usuarios
UNION ALL
SELECT 'Categorias', COUNT(*) FROM Categorias
UNION ALL
SELECT 'Cursos', COUNT(*) FROM Cursos
UNION ALL
SELECT 'Certificados', COUNT(*) FROM Certificados;
GO

PRINT '✅ Base de datos actualizada exitosamente';
PRINT 'Usuario juanpi@gmail.com ahora tiene rol: admin';
PRINT 'Datos de prueba insertados';