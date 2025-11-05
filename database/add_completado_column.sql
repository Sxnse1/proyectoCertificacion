-- Migración: Agregar columna 'completado' a la tabla Video_Progreso
-- Fecha: 5 de noviembre de 2025
-- Propósito: Permitir marcar videos como completados al 98% de progreso

USE StartEducationDB;
GO

-- Verificar si la columna ya existe
IF NOT EXISTS (
    SELECT * FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_NAME = 'Video_Progreso' 
    AND COLUMN_NAME = 'completado'
)
BEGIN
    -- Agregar la columna completado
    ALTER TABLE dbo.Video_Progreso 
    ADD completado BIT NOT NULL DEFAULT 0;
    
    PRINT '✅ Columna "completado" agregada exitosamente a Video_Progreso';
END
ELSE
BEGIN
    PRINT '⚠️  La columna "completado" ya existe en Video_Progreso';
END

-- Verificar la estructura actualizada
SELECT 
    COLUMN_NAME,
    DATA_TYPE,
    IS_NULLABLE,
    COLUMN_DEFAULT
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_NAME = 'Video_Progreso'
ORDER BY ORDINAL_POSITION;

PRINT '📋 Estructura actual de la tabla Video_Progreso mostrada arriba';