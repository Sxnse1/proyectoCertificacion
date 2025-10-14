-- create_video_view.sql
-- Script FASE 3: Crear vista de compatibilidad 
-- Ejecutar SOLO después de las fases 1 y 2

USE [StartEducationDB]
GO

PRINT '=== FASE 3: CREANDO VISTA DE COMPATIBILIDAD ===';

-- Verificar que todas las columnas y constraints existen
DECLARE @columnCount INT, @constraintCount INT;
SELECT @columnCount = COUNT(*) 
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_NAME = 'Video' 
  AND COLUMN_NAME IN ('bunny_video_id', 'bunny_library_id', 'bunny_embed_url', 'bunny_thumbnail_url', 'video_provider', 'bunny_metadata');

SELECT @constraintCount = COUNT(*)
FROM sys.check_constraints 
WHERE name = 'CK_Video_Provider' AND parent_object_id = OBJECT_ID('dbo.Video');

IF @columnCount = 6 AND @constraintCount = 1
BEGIN
    PRINT 'Prerequisitos cumplidos. Creando vista...';
    
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.VIEWS WHERE TABLE_NAME = 'vw_Videos_Compatible')
    BEGIN
        EXEC('
        CREATE VIEW [dbo].[vw_Videos_Compatible] AS
        SELECT 
            id_video,
            id_modulo,
            titulo,
            descripcion,
            url,
            duracion_segundos,
            orden,
            fecha_creacion,
            estatus,
            bunny_video_id,
            bunny_library_id,
            bunny_embed_url,
            bunny_thumbnail_url,
            video_provider,
            bunny_metadata,
            -- Campos calculados para compatibilidad
            CASE 
                WHEN video_provider = ''bunny'' AND bunny_embed_url IS NOT NULL THEN bunny_embed_url
                ELSE url 
            END AS effective_url,
            CASE 
                WHEN video_provider = ''bunny'' AND bunny_thumbnail_url IS NOT NULL THEN bunny_thumbnail_url
                ELSE NULL 
            END AS effective_thumbnail
        FROM dbo.Video;
        ');
        
        PRINT 'Vista vw_Videos_Compatible creada exitosamente.';
    END
    ELSE
        PRINT 'Vista vw_Videos_Compatible ya existe.';
        
END
ELSE
BEGIN
    PRINT 'ERROR: Prerequisitos no cumplidos.';
    PRINT 'Columnas: ' + CAST(@columnCount AS VARCHAR(10)) + ' de 6 requeridas';
    PRINT 'Constraints: ' + CAST(@constraintCount AS VARCHAR(10)) + ' de 1 requerido';
    PRINT 'Ejecutar primero fix_video_schema_bunny_v2.sql y fix_video_indices_and_constraints.sql';
END

PRINT '=== FIN FASE 3 ===';

-- Test rápido de la vista
IF EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.VIEWS WHERE TABLE_NAME = 'vw_Videos_Compatible')
BEGIN
    PRINT 'Test de la vista:';
    SELECT TOP 3 id_video, titulo, video_provider, effective_url 
    FROM vw_Videos_Compatible;
END