-- ========================================
-- SCRIPT PARA CORREGIR COLUMNA 2FA SECRET
-- Ejecutar DESPUÉS del script de alteración
-- ========================================

USE [StartEducationDB]
GO

-- Verificar el tamaño actual de la columna
PRINT '🔍 VERIFICANDO TAMAÑO ACTUAL DE COLUMNA:';
PRINT '========================================';

SELECT 
    c.COLUMN_NAME as 'Columna',
    c.DATA_TYPE as 'Tipo_Dato',
    c.CHARACTER_MAXIMUM_LENGTH as 'Longitud_Max'
FROM INFORMATION_SCHEMA.COLUMNS c
WHERE c.TABLE_NAME = 'Usuarios' 
AND c.COLUMN_NAME = 'two_factor_secret';

PRINT '';
PRINT '🔧 AUMENTANDO TAMAÑO DE COLUMNA two_factor_secret:';
PRINT '==================================================';

-- Aumentar el tamaño de la columna two_factor_secret de 32 a 64 caracteres
ALTER TABLE [dbo].[Usuarios] 
ALTER COLUMN [two_factor_secret] NVARCHAR(64) NULL;

PRINT '✅ Columna two_factor_secret actualizada a NVARCHAR(64)';

-- También aumentar backup_codes por si acaso
ALTER TABLE [dbo].[Usuarios] 
ALTER COLUMN [backup_codes] NVARCHAR(2000) NULL;

PRINT '✅ Columna backup_codes actualizada a NVARCHAR(2000)';

PRINT '';
PRINT '📋 VERIFICANDO NUEVOS TAMAÑOS:';
PRINT '==============================';

SELECT 
    c.COLUMN_NAME as 'Columna',
    c.DATA_TYPE as 'Tipo_Dato',
    c.CHARACTER_MAXIMUM_LENGTH as 'Longitud_Max'
FROM INFORMATION_SCHEMA.COLUMNS c
WHERE c.TABLE_NAME = 'Usuarios' 
AND c.COLUMN_NAME IN ('two_factor_secret', 'backup_codes')
ORDER BY c.COLUMN_NAME;

PRINT '';
PRINT '🎉 CORRECCIÓN COMPLETADA EXITOSAMENTE';
PRINT '====================================';
PRINT 'Ahora los secrets de 2FA se pueden almacenar correctamente.';

GO