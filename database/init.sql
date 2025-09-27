-- Script para crear tabla de ejemplo
-- Ejecuta este script en tu base de datos SQL Server

USE StartEducationDB;

-- Crear tabla usuarios
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='usuarios' AND xtype='U')
BEGIN
    CREATE TABLE usuarios (
        id INT IDENTITY(1,1) PRIMARY KEY,
        nombre NVARCHAR(100) NOT NULL,
        email NVARCHAR(150) NOT NULL UNIQUE,
        fecha_creacion DATETIME2 DEFAULT GETDATE(),
        activo BIT DEFAULT 1
    );
    
    -- Insertar datos de prueba
    INSERT INTO usuarios (nombre, email) VALUES 
    ('Juan Pérez', 'juan@example.com'),
    ('María García', 'maria@example.com'),
    ('Carlos López', 'carlos@example.com');
    
    PRINT 'Tabla usuarios creada con datos de prueba';
END
ELSE
BEGIN
    PRINT 'La tabla usuarios ya existe';
END