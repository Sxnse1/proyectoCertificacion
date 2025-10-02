-- =================================================================================
-- Script de Actualización de Base de Datos - Contraseñas Temporales
-- Añade funcionalidad para manejar contraseñas temporales
-- =================================================================================

USE StartEducationDB;
GO

-- Verificar si las columnas ya existen antes de crearlas
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('Usuarios') AND name = 'tiene_password_temporal')
BEGIN
    ALTER TABLE Usuarios 
    ADD tiene_password_temporal BIT NOT NULL DEFAULT 0;
    
    PRINT '✅ Columna tiene_password_temporal añadida exitosamente';
END
ELSE
BEGIN
    PRINT '⚠️ La columna tiene_password_temporal ya existe';
END
GO

IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('Usuarios') AND name = 'fecha_password_temporal')
BEGIN
    ALTER TABLE Usuarios 
    ADD fecha_password_temporal DATETIME2 NULL;
    
    PRINT '✅ Columna fecha_password_temporal añadida exitosamente';
END
ELSE
BEGIN
    PRINT '⚠️ La columna fecha_password_temporal ya existe';
END
GO

-- Script para verificar la estructura actualizada
SELECT 
    COLUMN_NAME,
    DATA_TYPE,
    IS_NULLABLE,
    COLUMN_DEFAULT
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_NAME = 'Usuarios' 
    AND COLUMN_NAME IN ('tiene_password_temporal', 'fecha_password_temporal')
ORDER BY ORDINAL_POSITION;

PRINT '🔍 Estructura de columnas de contraseña temporal verificada';
GO

-- Crear índice para mejorar consultas de usuarios con contraseña temporal
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_Usuarios_PasswordTemporal')
BEGIN
    CREATE INDEX IX_Usuarios_PasswordTemporal 
    ON Usuarios (tiene_password_temporal, fecha_password_temporal)
    WHERE tiene_password_temporal = 1;
    
    PRINT '✅ Índice IX_Usuarios_PasswordTemporal creado exitosamente';
END
ELSE
BEGIN
    PRINT '⚠️ El índice IX_Usuarios_PasswordTemporal ya existe';
END
GO

-- Comentarios descriptivos para las nuevas columnas
EXEC sp_addextendedproperty 
    @name = N'MS_Description', 
    @value = N'Indica si el usuario tiene una contraseña temporal que debe cambiar en el primer login', 
    @level0type = N'SCHEMA', @level0name = N'dbo', 
    @level1type = N'TABLE', @level1name = N'Usuarios', 
    @level2type = N'COLUMN', @level2name = N'tiene_password_temporal';

EXEC sp_addextendedproperty 
    @name = N'MS_Description', 
    @value = N'Fecha y hora cuando se asignó la contraseña temporal', 
    @level0type = N'SCHEMA', @level0name = N'dbo', 
    @level1type = N'TABLE', @level1name = N'Usuarios', 
    @level2type = N'COLUMN', @level2name = N'fecha_password_temporal';

PRINT '📝 Comentarios descriptivos añadidos a las columnas';
GO

PRINT '🎉 ¡Actualización de base de datos completada exitosamente!';
PRINT '📋 Resumen de cambios:';
PRINT '   • Columna tiene_password_temporal (BIT)';
PRINT '   • Columna fecha_password_temporal (DATETIME2)';
PRINT '   • Índice para optimizar consultas';
PRINT '   • Comentarios descriptivos';
GO