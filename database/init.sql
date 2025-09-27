-- Script para crear tabla de usuarios con la nueva estructura
-- Ejecuta este script en tu base de datos SQL Server

USE StartEducationDB;

-- Crear tabla Usuarios con la estructura especificada
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='Usuarios' AND xtype='U')
BEGIN
    CREATE TABLE Usuarios (
        id_usuario INT PRIMARY KEY IDENTITY(1,1),
        nombre NVARCHAR(150) NOT NULL,
        apellido NVARCHAR(150) NOT NULL,
        nombre_usuario NVARCHAR(50) NOT NULL UNIQUE,
        email NVARCHAR(255) NOT NULL UNIQUE,
        password NVARCHAR(255) NOT NULL, -- Almacenar siempre contraseñas hasheadas
        rol NVARCHAR(20) NOT NULL CHECK (rol IN ('instructor', 'user')),
        fecha_registro DATETIME2 NOT NULL DEFAULT GETDATE(),
        estatus NVARCHAR(20) NOT NULL CHECK (estatus IN ('activo', 'inactivo', 'baneado'))
    );
    
    -- Insertar usuarios de prueba
    INSERT INTO Usuarios (nombre, apellido, nombre_usuario, email, password, rol, estatus) VALUES 
    -- Instructores
    ('Juan Carlos', 'Pérez López', 'jperez', 'juan@instructor.com', '123456', 'instructor', 'activo'),
    ('María Elena', 'García Rodríguez', 'mgarcia', 'maria@instructor.com', 'password', 'instructor', 'activo'),
    ('Carlos Alberto', 'López Martínez', 'clopez', 'carlos@instructor.com', '123456', 'instructor', 'activo'),
    ('Ana Patricia', 'Hernández Silva', 'ahernandez', 'ana@instructor.com', 'instructor123', 'instructor', 'activo'),
    
    -- Usuarios regulares (que serán redirigidos a une.edu.mx)
    ('Pedro Luis', 'González Vega', 'pgonzalez', 'pedro@student.com', 'student123', 'user', 'activo'),
    ('Laura Isabel', 'Morales Castro', 'lmorales', 'laura@student.com', 'user123', 'user', 'activo'),
    ('Diego Fernando', 'Ruiz Flores', 'druiz', 'diego@student.com', 'password123', 'user', 'activo'),
    
    -- Usuario para pruebas con diferentes estatus
    ('Test', 'Inactivo', 'tinactivo', 'test@inactive.com', 'test123', 'user', 'inactivo'),
    ('Test', 'Baneado', 'tbaneado', 'test@banned.com', 'test123', 'user', 'baneado');
    
    PRINT '✅ Tabla Usuarios creada con datos de prueba';
    PRINT '';
    PRINT '👨‍🏫 INSTRUCTORES (van al dashboard):';
    PRINT '   - juan@instructor.com / 123456';
    PRINT '   - maria@instructor.com / password';
    PRINT '   - carlos@instructor.com / 123456';
    PRINT '   - ana@instructor.com / instructor123';
    PRINT '';
    PRINT '👨‍🎓 USUARIOS (van a une.edu.mx):';
    PRINT '   - pedro@student.com / student123';
    PRINT '   - laura@student.com / user123';
    PRINT '   - diego@student.com / password123';
    PRINT '';
    PRINT '🧪 USUARIOS DE PRUEBA (diferentes estatus):';
    PRINT '   - test@inactive.com / test123 (inactivo)';
    PRINT '   - test@banned.com / test123 (baneado)';
END
ELSE
BEGIN
    PRINT '⚠️ La tabla Usuarios ya existe';
    PRINT 'Si quieres recrearla, ejecuta: DROP TABLE Usuarios; y luego este script';
END

-- Mostrar usuarios existentes
IF EXISTS (SELECT * FROM sysobjects WHERE name='Usuarios' AND xtype='U')
BEGIN
    PRINT '';
    PRINT '📊 USUARIOS ACTUALES EN LA TABLA:';
    SELECT 
        id_usuario,
        nombre + ' ' + apellido AS nombre_completo,
        nombre_usuario,
        email,
        rol,
        estatus,
        fecha_registro
    FROM Usuarios 
    ORDER BY rol DESC, nombre;
END