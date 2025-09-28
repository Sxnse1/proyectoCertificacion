-- ========================================
-- SCRIPT DE VERIFICACIÓN Y PRUEBA DE 2FA
-- Ejecutar DESPUÉS del script de alteración
-- ========================================

USE [StartEducationDB]
GO

-- 1. Verificar que todas las columnas existen
PRINT '🔍 VERIFICANDO ESTRUCTURA DE TABLA USUARIOS:';
PRINT '==========================================';

SELECT 
    c.COLUMN_NAME as 'Columna',
    c.DATA_TYPE as 'Tipo_Dato',
    c.CHARACTER_MAXIMUM_LENGTH as 'Longitud_Max',
    c.IS_NULLABLE as 'Permite_NULL',
    c.COLUMN_DEFAULT as 'Valor_Default'
FROM INFORMATION_SCHEMA.COLUMNS c
WHERE c.TABLE_NAME = 'Usuarios'
ORDER BY c.ORDINAL_POSITION;

PRINT '';

-- 2. Verificar constraints
PRINT '🔒 VERIFICANDO CONSTRAINTS:';
PRINT '==========================';

SELECT 
    CONSTRAINT_NAME as 'Nombre_Constraint',
    CHECK_CLAUSE as 'Definicion'
FROM INFORMATION_SCHEMA.CHECK_CONSTRAINTS 
WHERE TABLE_NAME = 'Usuarios'
ORDER BY CONSTRAINT_NAME;

PRINT '';

-- 3. Mostrar todos los usuarios y su estado de 2FA
PRINT '👥 ESTADO ACTUAL DE USUARIOS:';
PRINT '=============================';

SELECT 
    id_usuario as 'ID',
    nombre + ' ' + apellido as 'Nombre_Completo',
    email as 'Email',
    rol as 'Rol',
    estatus as 'Estado',
    two_factor_enabled as '2FA_Habilitado',
    two_factor_verified as '2FA_Verificado',
    CASE 
        WHEN two_factor_secret IS NULL THEN 'No configurado'
        ELSE 'Secret almacenado'
    END as 'Estado_Secret',
    CASE 
        WHEN backup_codes IS NULL THEN 'Sin códigos'
        ELSE 'Códigos disponibles'
    END as 'Códigos_Respaldo'
FROM [dbo].[Usuarios] 
ORDER BY rol DESC, nombre;

PRINT '';

-- 4. Contar usuarios por estado de 2FA
PRINT '📊 ESTADÍSTICAS DE 2FA:';
PRINT '======================';

SELECT 
    rol as 'Rol',
    COUNT(*) as 'Total_Usuarios',
    SUM(CASE WHEN two_factor_enabled = 1 THEN 1 ELSE 0 END) as 'Con_2FA_Habilitado',
    SUM(CASE WHEN two_factor_verified = 1 THEN 1 ELSE 0 END) as 'Con_2FA_Verificado',
    SUM(CASE WHEN two_factor_secret IS NOT NULL THEN 1 ELSE 0 END) as 'Con_Secret_Configurado'
FROM [dbo].[Usuarios]
GROUP BY rol
ORDER BY rol DESC;

PRINT '';

-- 5. Verificar que los valores por defecto se aplicaron correctamente
PRINT '✅ VERIFICACIÓN DE VALORES POR DEFECTO:';
PRINT '=====================================';

DECLARE @TotalUsuarios INT
DECLARE @UsuariosConDefaults INT

SELECT @TotalUsuarios = COUNT(*) FROM [dbo].[Usuarios];

SELECT @UsuariosConDefaults = COUNT(*) 
FROM [dbo].[Usuarios] 
WHERE two_factor_enabled = 0 AND two_factor_verified = 0;

PRINT 'Total de usuarios: ' + CAST(@TotalUsuarios AS NVARCHAR(10));
PRINT 'Usuarios con valores por defecto de 2FA: ' + CAST(@UsuariosConDefaults AS NVARCHAR(10));

IF @TotalUsuarios = @UsuariosConDefaults
    PRINT '✅ Todos los usuarios tienen valores por defecto correctos';
ELSE
    PRINT '⚠️ Algunos usuarios pueden tener valores inconsistentes';

PRINT '';

-- 6. Script para crear un usuario admin de prueba (opcional)
PRINT '🔧 PARA CREAR UN USUARIO ADMIN DE PRUEBA:';
PRINT '========================================';
PRINT 'Ejecuta este código si necesitas un usuario admin para probar:';
PRINT '';
PRINT '-- Crear usuario admin de prueba';
PRINT 'INSERT INTO [dbo].[Usuarios] (';
PRINT '    nombre, apellido, nombre_usuario, email, password, rol, estatus';
PRINT ') VALUES (';
PRINT '    ''Admin'', ''Sistema'', ''admin'', ''admin@starteducation.com'',';
PRINT '    ''$2b$10$example.hash.here'', ''admin'', ''activo''';
PRINT ');';
PRINT '';

-- 7. Verificar integridad final
PRINT '🎯 VERIFICACIÓN FINAL:';
PRINT '====================';

-- Verificar que no hay valores NULL donde no deberían estar
SELECT 
    'Verificando integridad de datos...' as 'Estado',
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM [dbo].[Usuarios] 
            WHERE two_factor_enabled IS NULL OR two_factor_verified IS NULL
        ) THEN '❌ ERROR: Hay valores NULL en columnas NOT NULL'
        ELSE '✅ OK: Integridad de datos correcta'
    END as 'Resultado'

PRINT '';
PRINT '🎉 VERIFICACIÓN COMPLETADA';
PRINT '=========================';
PRINT 'El sistema de 2FA está listo para usar.';
PRINT 'Los instructores serán redirigidos a configurar 2FA en su próximo login.';

GO