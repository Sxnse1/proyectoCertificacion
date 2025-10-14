-- fix_video_indices_and_constraints.sql
-- Script FASE 2: Crear índices y constraints después de que las columnas existan
-- Ejecutar SOLO después de fix_video_schema_bunny_v2.sql

USE [StartEducationDB]
GO

PRINT '=== FASE 2: AGREGANDO INDICES Y CONSTRAINTS ===';

-- Verificar que las columnas existen antes de continuar
DECLARE @columnCount INT;
SELECT @columnCount = COUNT(*) 
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_NAME = 'Video' 
  AND COLUMN_NAME IN ('bunny_video_id', 'bunny_library_id', 'bunny_embed_url', 'bunny_thumbnail_url', 'video_provider', 'bunny_metadata');

IF @columnCount = 6
BEGIN
    PRINT 'Todas las columnas bunny detectadas. Procediendo con índices y constraints...';
    
    -- Agregar constraint para video_provider
    IF NOT EXISTS (SELECT 1 FROM sys.check_constraints WHERE name = 'CK_Video_Provider' AND parent_object_id = OBJECT_ID('dbo.Video'))
    BEGIN
        PRINT 'Agregando constraint CK_Video_Provider...';
        ALTER TABLE [dbo].[Video] ADD CONSTRAINT [CK_Video_Provider] CHECK ([video_provider] IN ('vimeo', 'bunny', 'pending'));
    END
    
    -- Agregar índices
    IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_Video_BunnyVideoId' AND object_id = OBJECT_ID('dbo.Video'))
    BEGIN
        PRINT 'Creando índice IX_Video_BunnyVideoId...';
        CREATE NONCLUSTERED INDEX [IX_Video_BunnyVideoId] ON [dbo].[Video] ([bunny_video_id]);
    END
    
    IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_Video_Provider' AND object_id = OBJECT_ID('dbo.Video'))
    BEGIN
        PRINT 'Creando índice IX_Video_Provider...';
        CREATE NONCLUSTERED INDEX [IX_Video_Provider] ON [dbo].[Video] ([video_provider]);
    END
    
    IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_Video_Modulo_Provider' AND object_id = OBJECT_ID('dbo.Video'))
    BEGIN
        PRINT 'Creando índice compuesto IX_Video_Modulo_Provider...';
        CREATE NONCLUSTERED INDEX [IX_Video_Modulo_Provider] ON [dbo].[Video] ([id_modulo], [video_provider]);
    END
    
    -- Actualizar datos existentes
    PRINT 'Actualizando provider de videos existentes...';
    UPDATE [dbo].[Video] 
    SET [video_provider] = 'vimeo' 
    WHERE [url] LIKE '%vimeo.com%';

    UPDATE [dbo].[Video] 
    SET [video_provider] = 'pending' 
    WHERE ([url] IS NULL OR [url] = '' OR [url] NOT LIKE '%vimeo.com%') AND [video_provider] = 'bunny';
    
    PRINT 'Conteo por provider:';
    SELECT video_provider, COUNT(*) as cantidad
    FROM dbo.Video 
    GROUP BY video_provider;
    
END
ELSE
BEGIN
    PRINT 'ERROR: No se detectaron todas las columnas bunny. Ejecutar primero fix_video_schema_bunny_v2.sql';
    PRINT 'Columnas detectadas: ' + CAST(@columnCount AS VARCHAR(10)) + ' de 6 requeridas';
END

PRINT '=== FIN FASE 2 ===';