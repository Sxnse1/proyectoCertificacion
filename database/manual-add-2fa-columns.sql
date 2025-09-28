-- ========================================
-- SCRIPT PARA AGREGAR 2FA A TABLA USUARIOS
-- Ejecutar en StartEducationDB
-- ========================================

USE [StartEducationDB]
GO

-- 1. Agregar columna para almacenar el secret de 2FA
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('[dbo].[Usuarios]') AND name = 'two_factor_secret')
BEGIN
    ALTER TABLE [dbo].[Usuarios] 
    ADD [two_factor_secret] NVARCHAR(64) NULL;
    
    PRINT '✅ Columna two_factor_secret agregada exitosamente';
END
ELSE
BEGIN
    PRINT '⚠️ La columna two_factor_secret ya existe';
END

-- 2. Agregar columna para indicar si 2FA está habilitado
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('[dbo].[Usuarios]') AND name = 'two_factor_enabled')
BEGIN
    ALTER TABLE [dbo].[Usuarios] 
    ADD [two_factor_enabled] BIT NOT NULL DEFAULT 0;
    
    PRINT '✅ Columna two_factor_enabled agregada exitosamente';
END
ELSE
BEGIN
    PRINT '⚠️ La columna two_factor_enabled ya existe';
END

-- 3. Agregar columna para indicar si 2FA está verificado/configurado
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('[dbo].[Usuarios]') AND name = 'two_factor_verified')
BEGIN
    ALTER TABLE [dbo].[Usuarios] 
    ADD [two_factor_verified] BIT NOT NULL DEFAULT 0;
    
    PRINT '✅ Columna two_factor_verified agregada exitosamente';
END
ELSE
BEGIN
    PRINT '⚠️ La columna two_factor_verified ya existe';
END

-- 4. Agregar columna para códigos de respaldo (JSON)
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('[dbo].[Usuarios]') AND name = 'backup_codes')
BEGIN
    ALTER TABLE [dbo].[Usuarios] 
    ADD [backup_codes] NVARCHAR(2000) NULL;
    
    PRINT '✅ Columna backup_codes agregada exitosamente';
END
ELSE
BEGIN
    PRINT '⚠️ La columna backup_codes ya existe';
END

-- 5. Actualizar el constraint de rol para incluir 'admin' si no existe
-- Primero eliminamos el constraint existente
DECLARE @ConstraintName NVARCHAR(255)
SELECT @ConstraintName = CONSTRAINT_NAME 
FROM INFORMATION_SCHEMA.CHECK_CONSTRAINTS 
WHERE CONSTRAINT_NAME LIKE '%rol%' 
AND TABLE_NAME = 'Usuarios'

IF @ConstraintName IS NOT NULL
BEGIN
    DECLARE @SQL NVARCHAR(500)
    SET @SQL = 'ALTER TABLE [dbo].[Usuarios] DROP CONSTRAINT [' + @ConstraintName + ']'
    EXEC sp_executesql @SQL
    PRINT '🔄 Constraint de rol anterior eliminado: ' + @ConstraintName
END

-- Agregar nuevo constraint que incluye 'admin'
ALTER TABLE [dbo].[Usuarios] 
ADD CONSTRAINT CK_Usuarios_Rol 
CHECK ([rol] IN ('user', 'instructor', 'admin'));

PRINT '✅ Nuevo constraint de rol agregado (incluye admin)';

-- 6. Verificar la estructura actualizada
PRINT '';
PRINT '📋 VERIFICACIÓN DE COLUMNAS AGREGADAS:';
PRINT '=====================================';

SELECT 
    COLUMN_NAME as 'Columna',
    DATA_TYPE as 'Tipo',
    IS_NULLABLE as 'Nullable',
    COLUMN_DEFAULT as 'Valor_Default'
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_NAME = 'Usuarios' 
AND COLUMN_NAME IN ('two_factor_secret', 'two_factor_enabled', 'two_factor_verified', 'backup_codes')
ORDER BY COLUMN_NAME;

-- 7. Mostrar usuarios instructores que necesitarán configurar 2FA
PRINT '';
PRINT '👨‍🏫 USUARIOS INSTRUCTORES QUE NECESITARÁN CONFIGURAR 2FA:';
PRINT '======================================================';

SELECT 
    id_usuario,
    nombre + ' ' + apellido as 'Nombre_Completo',
    email,
    rol,
    two_factor_enabled as '2FA_Habilitado',
    two_factor_verified as '2FA_Verificado'
FROM [dbo].[Usuarios] 
WHERE rol IN ('instructor', 'admin')
ORDER BY rol, nombre;

PRINT '';
PRINT '🎉 CONFIGURACIÓN DE 2FA COMPLETADA EXITOSAMENTE';
PRINT '===============================================';
PRINT 'Los instructores serán requeridos a configurar 2FA en su próximo login.';
PRINT '';

GO