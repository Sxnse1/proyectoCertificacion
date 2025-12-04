-- Crear tabla de Inscripciones para cursos gratuitos
-- Manejo de inscripciones separado de Compras (pagadas)

USE [StartEducationDB];
GO

-- Verificar si la tabla ya existe
IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES 
               WHERE TABLE_SCHEMA = 'dbo' AND TABLE_NAME = 'Inscripciones')
BEGIN
    -- Crear tabla de inscripciones
    CREATE TABLE [dbo].[Inscripciones] (
        [id_inscripcion] INT IDENTITY(1,1) PRIMARY KEY,
        [id_usuario] INT NOT NULL,
        [id_curso] INT NOT NULL,
        [fecha_inscripcion] DATETIME2 DEFAULT GETDATE(),
        [estado] NVARCHAR(20) DEFAULT 'activo' CHECK (estado IN ('activo', 'completado', 'suspendido')),
        [progreso] DECIMAL(5,2) DEFAULT 0.00 CHECK (progreso >= 0 AND progreso <= 100),
        [fecha_completado] DATETIME2 NULL,
        [calificacion] DECIMAL(3,2) NULL CHECK (calificacion >= 0 AND calificacion <= 10),
        [notas] NTEXT NULL,
        [fecha_modificacion] DATETIME2 DEFAULT GETDATE(),
        
        -- Claves foráneas
        FOREIGN KEY ([id_usuario]) REFERENCES [Usuarios]([id_usuario]) ON DELETE CASCADE,
        FOREIGN KEY ([id_curso]) REFERENCES [Cursos]([id_curso]) ON DELETE CASCADE,
        
        -- Índice único para evitar inscripciones duplicadas
        UNIQUE ([id_usuario], [id_curso])
    );

    -- Crear índices para mejorar rendimiento
    CREATE INDEX [IDX_Inscripciones_Usuario] ON [dbo].[Inscripciones] ([id_usuario]);
    CREATE INDEX [IDX_Inscripciones_Curso] ON [dbo].[Inscripciones] ([id_curso]);
    CREATE INDEX [IDX_Inscripciones_Estado] ON [dbo].[Inscripciones] ([estado]);
    CREATE INDEX [IDX_Inscripciones_Fecha] ON [dbo].[Inscripciones] ([fecha_inscripcion]);

    PRINT '✅ Tabla Inscripciones creada exitosamente';
END
ELSE
BEGIN
    PRINT 'ℹ️ La tabla Inscripciones ya existe';
END

-- Mostrar estructura de la tabla
SELECT 
    COLUMN_NAME,
    DATA_TYPE,
    CHARACTER_MAXIMUM_LENGTH,
    IS_NULLABLE,
    COLUMN_DEFAULT
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_NAME = 'Inscripciones'
ORDER BY ORDINAL_POSITION;

PRINT '🗄️ Estructura de la tabla Inscripciones mostrada arriba';

-- Crear vista para obtener inscripciones con datos del curso y usuario
IF NOT EXISTS (SELECT * FROM sys.views WHERE name = 'vw_InscripcionesCompletas')
BEGIN
    EXEC('
    CREATE VIEW vw_InscripcionesCompletas AS
    SELECT 
        i.id_inscripcion,
        i.id_usuario,
        i.id_curso,
        i.fecha_inscripcion,
        i.estado,
        i.progreso,
        i.fecha_completado,
        i.calificacion,
        i.notas,
        i.fecha_modificacion,
        u.nombre + '' '' + u.apellido as nombre_completo,
        u.email,
        c.titulo as curso_titulo,
        c.descripcion as curso_descripcion,
        c.precio as curso_precio,
        c.duracion as curso_duracion,
        c.nivel as curso_nivel,
        c.miniatura as curso_miniatura
    FROM Inscripciones i
    INNER JOIN Usuarios u ON i.id_usuario = u.id_usuario
    INNER JOIN Cursos c ON i.id_curso = c.id_curso
    ');
    
    PRINT '✅ Vista vw_InscripcionesCompletas creada exitosamente';
END
ELSE
BEGIN
    PRINT 'ℹ️ La vista vw_InscripcionesCompletas ya existe';
END