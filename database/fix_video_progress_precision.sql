-- Script de Migración: Corregir Pérdida de Precisión en Progreso de Video
-- Fecha: 5 de noviembre de 2025
-- Problema: Conversión de segundos -> minutos -> segundos causa pérdida de precisión

-- 1. Agregar nueva columna para segundos
IF NOT EXISTS(SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('Progreso') AND name = 'segundos_actuales')
BEGIN
    ALTER TABLE Progreso ADD segundos_actuales INT NOT NULL DEFAULT 0;
    PRINT 'Columna segundos_actuales agregada a la tabla Progreso';
END
ELSE
BEGIN
    PRINT 'Columna segundos_actuales ya existe en la tabla Progreso';
END

-- 2. Migrar datos existentes de minutos a segundos
UPDATE Progreso 
SET segundos_actuales = minuto_actual * 60 
WHERE minuto_actual > 0 AND segundos_actuales = 0;

-- 3. Verificar la migración
SELECT 
    COUNT(*) as total_registros,
    COUNT(CASE WHEN minuto_actual > 0 THEN 1 END) as con_progreso_minutos,
    COUNT(CASE WHEN segundos_actuales > 0 THEN 1 END) as con_progreso_segundos,
    COUNT(CASE WHEN minuto_actual > 0 AND segundos_actuales = minuto_actual * 60 THEN 1 END) as migrados_correctamente
FROM Progreso;

-- 4. Mostrar algunos ejemplos de la migración
SELECT TOP 5
    id_usuario,
    id_video, 
    minuto_actual as minutos_anterior,
    segundos_actuales as segundos_nuevo,
    completado,
    CASE 
        WHEN minuto_actual = 0 THEN 'Sin progreso anterior'
        WHEN segundos_actuales = minuto_actual * 60 THEN 'Migrado correctamente'
        ELSE 'Verificar migración'
    END as estado_migracion
FROM Progreso 
ORDER BY fecha_modificacion DESC;

PRINT 'Migración completada. La API ahora usa segundos_actuales para mayor precisión.';
PRINT 'IMPORTANTE: La API ha sido actualizada para usar segundos_actuales en lugar de minuto_actual';