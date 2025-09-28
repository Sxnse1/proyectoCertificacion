-- Script para agregar autenticación de dos factores (2FA) a la tabla Usuarios
-- Ejecutar este script para agregar las columnas necesarias para 2FA

-- Agregar columnas para 2FA
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('Usuarios') AND name = 'two_factor_secret')
BEGIN
    ALTER TABLE Usuarios ADD two_factor_secret NVARCHAR(32) NULL;
    PRINT 'Columna two_factor_secret agregada a tabla Usuarios';
END
ELSE
BEGIN
    PRINT 'La columna two_factor_secret ya existe en tabla Usuarios';
END

IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('Usuarios') AND name = 'two_factor_enabled')
BEGIN
    ALTER TABLE Usuarios ADD two_factor_enabled BIT DEFAULT 0;
    PRINT 'Columna two_factor_enabled agregada a tabla Usuarios';
END
ELSE
BEGIN
    PRINT 'La columna two_factor_enabled ya existe en tabla Usuarios';
END

IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('Usuarios') AND name = 'two_factor_verified')
BEGIN
    ALTER TABLE Usuarios ADD two_factor_verified BIT DEFAULT 0;
    PRINT 'Columna two_factor_verified agregada a tabla Usuarios';
END
ELSE
BEGIN
    PRINT 'La columna two_factor_verified ya existe en tabla Usuarios';
END

IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('Usuarios') AND name = 'backup_codes')
BEGIN
    ALTER TABLE Usuarios ADD backup_codes NVARCHAR(1000) NULL;
    PRINT 'Columna backup_codes agregada a tabla Usuarios';
END
ELSE
BEGIN
    PRINT 'La columna backup_codes ya existe en tabla Usuarios';
END

-- Actualizar usuarios existentes que son instructores para requerir 2FA
UPDATE Usuarios 
SET two_factor_enabled = 0, two_factor_verified = 0
WHERE rol = 'instructor' AND two_factor_enabled IS NULL;

PRINT '✅ Configuración de 2FA agregada exitosamente';
PRINT '📝 Nota: Los instructores necesitarán configurar 2FA en su próximo login';

-- Opcional: Ver usuarios instructores que necesitan configurar 2FA
SELECT 
    id_usuario,
    nombre,
    email,
    rol,
    two_factor_enabled,
    two_factor_verified
FROM Usuarios 
WHERE rol = 'instructor';