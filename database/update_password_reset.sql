-- Script para agregar campos de reseteo de contraseña a la tabla Usuarios
-- Ejecuta este script en tu base de datos SQL Server

-- Agregar columna reset_token si no existe
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('Usuarios') AND name = 'reset_token')
BEGIN
    ALTER TABLE Usuarios ADD reset_token NVARCHAR(64) NULL;
END

-- Agregar columna reset_token_expiry si no existe
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('Usuarios') AND name = 'reset_token_expiry')
BEGIN
    ALTER TABLE Usuarios ADD reset_token_expiry DATETIME2 NULL;
END

-- Verificar que las columnas fueron creadas
SELECT 
    CASE 
        WHEN EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('Usuarios') AND name = 'reset_token')
        THEN '✅ Columna reset_token disponible'
        ELSE '❌ Error: Columna reset_token no existe'
    END as EstadoResetToken,
    CASE 
        WHEN EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('Usuarios') AND name = 'reset_token_expiry')
        THEN '✅ Columna reset_token_expiry disponible'
        ELSE '❌ Error: Columna reset_token_expiry no existe'
    END as EstadoResetTokenExpiry;