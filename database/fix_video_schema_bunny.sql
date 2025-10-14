-- fix_video_schema_bunny.sql
-- Script para agregar las columnas bunny_* faltantes a dbo.Video
-- Basado en la DDL actual proporcionada por el usuario
-- Ejecutar en StartEducationDB

USE [StartEducationDB]
GO

PRINT '=== INICIANDO ACTUALIZACION DE SCHEMA PARA BUNNY.NET ===';

-- Verificar si las columnas ya existen antes de agregarlas
IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME='Video' AND COLUMN_NAME='bunny_video_id')
BEGIN
    PRINT 'Agregando columna bunny_video_id...';
    ALTER TABLE [dbo].[Video] ADD [bunny_video_id] [nvarchar](50) NULL;
END
ELSE
    PRINT 'Columna bunny_video_id ya existe, omitiendo...';

IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME='Video' AND COLUMN_NAME='bunny_library_id')
BEGIN
    PRINT 'Agregando columna bunny_library_id...';
    ALTER TABLE [dbo].[Video] ADD [bunny_library_id] [nvarchar](50) NULL;
END
ELSE
    PRINT 'Columna bunny_library_id ya existe, omitiendo...';

IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME='Video' AND COLUMN_NAME='bunny_embed_url')
BEGIN
    PRINT 'Agregando columna bunny_embed_url...';
    ALTER TABLE [dbo].[Video] ADD [bunny_embed_url] [nvarchar](1000) NULL;
END
ELSE
    PRINT 'Columna bunny_embed_url ya existe, omitiendo...';

IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME='Video' AND COLUMN_NAME='bunny_thumbnail_url')
BEGIN
    PRINT 'Agregando columna bunny_thumbnail_url...';
    ALTER TABLE [dbo].[Video] ADD [bunny_thumbnail_url] [nvarchar](1000) NULL;
END
ELSE
    PRINT 'Columna bunny_thumbnail_url ya existe, omitiendo...';

IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME='Video' AND COLUMN_NAME='video_provider')
BEGIN
    PRINT 'Agregando columna video_provider...';
    ALTER TABLE [dbo].[Video] ADD [video_provider] [nvarchar](20) NOT NULL DEFAULT 'bunny';
END
ELSE
    PRINT 'Columna video_provider ya existe, omitiendo...';

IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME='Video' AND COLUMN_NAME='bunny_metadata')
BEGIN
    PRINT 'Agregando columna bunny_metadata...';
    ALTER TABLE [dbo].[Video] ADD [bunny_metadata] [nvarchar](max) NULL;
END
ELSE
    PRINT 'Columna bunny_metadata ya existe, omitiendo...';

-- Esperar para asegurar que las columnas estén completamente creadas
WAITFOR DELAY '00:00:01';

-- Agregar constraint para video_provider (solo valores válidos)
IF NOT EXISTS (SELECT 1 FROM sys.check_constraints WHERE name = 'CK_Video_Provider' AND parent_object_id = OBJECT_ID('dbo.Video'))
  AND EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME='Video' AND COLUMN_NAME='video_provider')
BEGIN
    PRINT 'Agregando constraint CK_Video_Provider...';
    ALTER TABLE [dbo].[Video] ADD CONSTRAINT [CK_Video_Provider] CHECK ([video_provider] IN ('vimeo', 'bunny', 'pending'));
END
ELSE
    PRINT 'Constraint CK_Video_Provider ya existe o columna no disponible, omitiendo...';

-- Agregar índices para optimizar consultas
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_Video_BunnyVideoId' AND object_id = OBJECT_ID('dbo.Video'))
  AND EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME='Video' AND COLUMN_NAME='bunny_video_id')
BEGIN
    PRINT 'Creando índice IX_Video_BunnyVideoId...';
    CREATE NONCLUSTERED INDEX [IX_Video_BunnyVideoId] ON [dbo].[Video] ([bunny_video_id]);
END
ELSE
    PRINT 'Índice IX_Video_BunnyVideoId ya existe o columna no disponible, omitiendo...';

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_Video_Provider' AND object_id = OBJECT_ID('dbo.Video'))
  AND EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME='Video' AND COLUMN_NAME='video_provider')
BEGIN
    PRINT 'Creando índice IX_Video_Provider...';
    CREATE NONCLUSTERED INDEX [IX_Video_Provider] ON [dbo].[Video] ([video_provider]);
END
ELSE
    PRINT 'Índice IX_Video_Provider ya existe o columna no disponible, omitiendo...';

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_Video_Modulo_Provider' AND object_id = OBJECT_ID('dbo.Video'))
  AND EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME='Video' AND COLUMN_NAME='video_provider')
BEGIN
    PRINT 'Creando índice compuesto IX_Video_Modulo_Provider...';
    CREATE NONCLUSTERED INDEX [IX_Video_Modulo_Provider] ON [dbo].[Video] ([id_modulo], [video_provider]);
END
ELSE
    PRINT 'Índice IX_Video_Modulo_Provider ya existe o columna no disponible, omitiendo...';

-- Crear vista de compatibilidad solo si todas las columnas existen
IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.VIEWS WHERE TABLE_NAME = 'vw_Videos_Compatible')
  AND (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME='Video' AND COLUMN_NAME IN ('bunny_video_id','bunny_library_id','bunny_embed_url','bunny_thumbnail_url','video_provider','bunny_metadata')) = 6
BEGIN
    PRINT 'Creando vista vw_Videos_Compatible...';
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
END
ELSE
    PRINT 'Vista vw_Videos_Compatible ya existe o faltan columnas, omitiendo...';

-- Actualizar videos existentes solo si la columna video_provider existe
IF EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME='Video' AND COLUMN_NAME='video_provider')
BEGIN
    PRINT 'Actualizando videos existentes con provider correcto...';
    UPDATE [dbo].[Video] 
    SET [video_provider] = 'vimeo' 
    WHERE [url] LIKE '%vimeo.com%';

    UPDATE [dbo].[Video] 
    SET [video_provider] = 'pending' 
    WHERE ([url] IS NULL OR [url] = '') OR [url] NOT LIKE '%vimeo.com%';
END
ELSE
    PRINT 'Columna video_provider no disponible, omitiendo actualización de datos...';
GO

PRINT '=== ACTUALIZACION COMPLETADA ===';

-- Verificar resultados
PRINT 'Verificando columnas agregadas...';
SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COLUMN_DEFAULT
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_NAME = 'Video' 
  AND COLUMN_NAME IN ('bunny_video_id', 'bunny_library_id', 'bunny_embed_url', 'bunny_thumbnail_url', 'video_provider', 'bunny_metadata')
ORDER BY COLUMN_NAME;

PRINT 'Verificando índices creados...';
SELECT i.name AS index_name, i.type_desc, i.is_unique
FROM sys.indexes i
WHERE i.object_id = OBJECT_ID('dbo.Video')
  AND i.name LIKE 'IX_Video_%';

PRINT 'Conteo de videos por provider:';
SELECT video_provider, COUNT(*) as cantidad
FROM dbo.Video 
GROUP BY video_provider;

PRINT '=== FIN DEL SCRIPT ===';