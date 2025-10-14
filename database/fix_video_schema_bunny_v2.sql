-- fix_video_schema_bunny_v2.sql
-- Script SIMPLIFICADO para agregar columnas bunny_* a dbo.Video
-- Versión que evita completamente errores de columnas inexistentes

USE [StartEducationDB]
GO

PRINT '=== FASE 1: AGREGANDO COLUMNAS BUNNY ===';

-- Agregar todas las columnas bunny de una vez, sin referencias cruzadas
IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME='Video' AND COLUMN_NAME='bunny_video_id')
BEGIN
    PRINT 'Agregando bunny_video_id...';
    ALTER TABLE [dbo].[Video] ADD [bunny_video_id] [nvarchar](50) NULL;
END

IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME='Video' AND COLUMN_NAME='bunny_library_id')
BEGIN
    PRINT 'Agregando bunny_library_id...';
    ALTER TABLE [dbo].[Video] ADD [bunny_library_id] [nvarchar](50) NULL;
END

IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME='Video' AND COLUMN_NAME='bunny_embed_url')
BEGIN
    PRINT 'Agregando bunny_embed_url...';
    ALTER TABLE [dbo].[Video] ADD [bunny_embed_url] [nvarchar](1000) NULL;
END

IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME='Video' AND COLUMN_NAME='bunny_thumbnail_url')
BEGIN
    PRINT 'Agregando bunny_thumbnail_url...';
    ALTER TABLE [dbo].[Video] ADD [bunny_thumbnail_url] [nvarchar](1000) NULL;
END

IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME='Video' AND COLUMN_NAME='video_provider')
BEGIN
    PRINT 'Agregando video_provider...';
    ALTER TABLE [dbo].[Video] ADD [video_provider] [nvarchar](20) NOT NULL DEFAULT 'bunny';
END

IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME='Video' AND COLUMN_NAME='bunny_metadata')
BEGIN
    PRINT 'Agregando bunny_metadata...';
    ALTER TABLE [dbo].[Video] ADD [bunny_metadata] [nvarchar](max) NULL;
END

PRINT '=== VERIFICANDO COLUMNAS AGREGADAS ===';
SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COLUMN_DEFAULT
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_NAME = 'Video' 
  AND COLUMN_NAME IN ('bunny_video_id', 'bunny_library_id', 'bunny_embed_url', 'bunny_thumbnail_url', 'video_provider', 'bunny_metadata')
ORDER BY COLUMN_NAME;

PRINT '=== FIN FASE 1 ===';