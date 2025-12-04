-- Crear tabla para almacenar sesiones de usuario
-- Usar con connect-mssql-v2 para persistencia de sesiones

USE [StartEducationDB];
GO

-- Verificar si la tabla ya existe
IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES 
               WHERE TABLE_SCHEMA = 'dbo' AND TABLE_NAME = 'Sessions')
BEGIN
    -- Crear tabla de sesiones
    CREATE TABLE [dbo].[Sessions] (
        [sid] NVARCHAR(255) NOT NULL PRIMARY KEY,
        [session] NTEXT NOT NULL,
        [expires] DATETIME2 NOT NULL
    );

    -- Crear índice para optimizar consultas por expiración
    CREATE INDEX [IDX_Sessions_Expires] ON [dbo].[Sessions] ([expires]);

    PRINT '✅ Tabla Sessions creada exitosamente';
END
ELSE
BEGIN
    PRINT 'ℹ️ La tabla Sessions ya existe';
END

-- Mostrar información de la tabla
SELECT 
    COLUMN_NAME,
    DATA_TYPE,
    CHARACTER_MAXIMUM_LENGTH,
    IS_NULLABLE
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_NAME = 'Sessions'
ORDER BY ORDINAL_POSITION;

PRINT '🗄️ Estructura de la tabla Sessions mostrada arriba';