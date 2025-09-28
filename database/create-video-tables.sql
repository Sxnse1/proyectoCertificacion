-- Script para crear las tablas necesarias para el sistema de videos
USE StartEducationDB;

-- Crear tabla Cursos
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='Cursos' AND xtype='U')
BEGIN
    CREATE TABLE Cursos (
        id_curso INT PRIMARY KEY IDENTITY(1,1),
        titulo NVARCHAR(255) NOT NULL,
        descripcion NTEXT,
        imagen_url NVARCHAR(500),
        precio DECIMAL(10,2),
        estatus NVARCHAR(20) NOT NULL CHECK (estatus IN ('activo', 'inactivo', 'borrador')) DEFAULT 'activo',
        fecha_creacion DATETIME2 NOT NULL DEFAULT GETDATE(),
        fecha_actualizacion DATETIME2 NOT NULL DEFAULT GETDATE()
    );
    
    -- Insertar curso de ejemplo
    INSERT INTO Cursos (titulo, descripcion, precio, estatus) VALUES 
    ('Curso Básico de Barbería', 'Aprende las técnicas fundamentales de barbería profesional', 99.99, 'activo'),
    ('Técnicas Avanzadas de Corte', 'Perfecciona tus habilidades con técnicas avanzadas', 149.99, 'activo');
    
    PRINT '✅ Tabla Cursos creada';
END
ELSE
BEGIN
    PRINT '⚠️ La tabla Cursos ya existe';
END

-- Crear tabla Modulos
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='Modulos' AND xtype='U')
BEGIN
    CREATE TABLE Modulos (
        id_modulo INT PRIMARY KEY IDENTITY(1,1),
        id_curso INT NOT NULL,
        titulo NVARCHAR(255) NOT NULL,
        descripcion NTEXT,
        orden INT NOT NULL DEFAULT 1,
        estatus NVARCHAR(20) NOT NULL CHECK (estatus IN ('activo', 'inactivo', 'borrador')) DEFAULT 'activo',
        fecha_creacion DATETIME2 NOT NULL DEFAULT GETDATE(),
        FOREIGN KEY (id_curso) REFERENCES Cursos(id_curso)
    );
    
    -- Insertar módulos de ejemplo
    INSERT INTO Modulos (id_curso, titulo, descripcion, orden, estatus) VALUES 
    (1, 'Introducción a la Barbería', 'Conceptos básicos y herramientas', 1, 'activo'),
    (1, 'Técnicas de Corte Básico', 'Aprende los cortes fundamentales', 2, 'activo'),
    (1, 'Afeitado Clásico', 'Técnicas de afeitado tradicional', 3, 'activo'),
    (2, 'Cortes Modernos', 'Tendencias actuales en barbería', 1, 'activo'),
    (2, 'Técnicas de Degradado', 'Domina el arte del degradado perfecto', 2, 'activo');
    
    PRINT '✅ Tabla Modulos creada';
END
ELSE
BEGIN
    PRINT '⚠️ La tabla Modulos ya existe';
END

-- Crear tabla Videos
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='Videos' AND xtype='U')
BEGIN
    CREATE TABLE Videos (
        id_video INT PRIMARY KEY IDENTITY(1,1),
        id_modulo INT NOT NULL,
        titulo NVARCHAR(255) NOT NULL,
        url_vimeo NVARCHAR(500),
        vimeo_id NVARCHAR(50),
        duracion_minutos INT,
        estatus NVARCHAR(20) NOT NULL CHECK (estatus IN ('activo', 'inactivo', 'borrador', 'archivado')) DEFAULT 'borrador',
        fecha_creacion DATETIME2 NOT NULL DEFAULT GETDATE(),
        fecha_actualizacion DATETIME2 NOT NULL DEFAULT GETDATE(),
        FOREIGN KEY (id_modulo) REFERENCES Modulos(id_modulo)
    );
    
    -- Insertar algunos videos de ejemplo
    INSERT INTO Videos (id_modulo, titulo, duracion_minutos, estatus) VALUES 
    (1, 'Bienvenida al Curso de Barbería', 5, 'activo'),
    (1, 'Conociendo las Herramientas Básicas', 12, 'activo'),
    (2, 'Primer Corte: Técnica Básica', 25, 'activo'),
    (2, 'Práctica de Corte con Tijeras', 30, 'borrador'),
    (3, 'Preparación para el Afeitado', 15, 'activo'),
    (4, 'Cortes Fade Modernos', 35, 'activo'),
    (5, 'Degradado Perfecto Paso a Paso', 40, 'borrador');
    
    PRINT '✅ Tabla Videos creada';
END
ELSE
BEGIN
    PRINT '⚠️ La tabla Videos ya existe';
END

-- Mostrar estructura creada
PRINT '';
PRINT '📊 ESTRUCTURA CREADA:';
SELECT 'Cursos' as Tabla, COUNT(*) as Registros FROM Cursos
UNION ALL
SELECT 'Modulos' as Tabla, COUNT(*) as Registros FROM Modulos  
UNION ALL
SELECT 'Videos' as Tabla, COUNT(*) as Registros FROM Videos;

PRINT '';
PRINT '🎬 VIDEOS DE EJEMPLO:';
SELECT 
    v.titulo as Video,
    m.titulo as Modulo,
    c.titulo as Curso,
    v.estatus,
    v.duracion_minutos
FROM Videos v
INNER JOIN Modulos m ON v.id_modulo = m.id_modulo
INNER JOIN Cursos c ON m.id_curso = c.id_curso
ORDER BY c.titulo, m.orden, v.id_video;