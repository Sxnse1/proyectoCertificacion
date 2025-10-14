-- =================================================================================
-- Script de migración de Vimeo a Bunny.net Stream
-- Base de datos: StartEducationDB (SQL Server)
-- Fecha: 2025-01-13
-- Propósito: Migrar campos de video de Vimeo a Bunny.net Stream
-- =================================================================================

USE StartEducationDB;
GO

PRINT '🚀 Iniciando migración de Vimeo a Bunny.net Stream...';
PRINT '===============================================';

-- PASO 1: Agregar nuevas columnas para Bunny.net (si no existen)
PRINT '📋 PASO 1: Agregando columnas de Bunny.net...';

IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('dbo.Video') AND name = 'bunny_video_id')
BEGIN
    ALTER TABLE Video ADD bunny_video_id NVARCHAR(100) NULL;
    PRINT '✅ Columna bunny_video_id agregada';
END
ELSE
BEGIN
    PRINT '⚠️ Columna bunny_video_id ya existe';
END

IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('dbo.Video') AND name = 'bunny_library_id')
BEGIN
    ALTER TABLE Video ADD bunny_library_id NVARCHAR(50) NULL;
    PRINT '✅ Columna bunny_library_id agregada';
END
ELSE
BEGIN
    PRINT '⚠️ Columna bunny_library_id ya existe';
END

IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('dbo.Video') AND name = 'bunny_embed_url')
BEGIN
    ALTER TABLE Video ADD bunny_embed_url NVARCHAR(500) NULL;
    PRINT '✅ Columna bunny_embed_url agregada';
END
ELSE
BEGIN
    PRINT '⚠️ Columna bunny_embed_url ya existe';
END

IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('dbo.Video') AND name = 'bunny_thumbnail_url')
BEGIN
    ALTER TABLE Video ADD bunny_thumbnail_url NVARCHAR(500) NULL;
    PRINT '✅ Columna bunny_thumbnail_url agregada';
END
ELSE
BEGIN
    PRINT '⚠️ Columna bunny_thumbnail_url ya existe';
END

IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('dbo.Video') AND name = 'video_provider')
BEGIN
    ALTER TABLE Video ADD video_provider NVARCHAR(20) DEFAULT 'bunny' NULL;
    PRINT '✅ Columna video_provider agregada';
END
ELSE
BEGIN
    PRINT '⚠️ Columna video_provider ya existe';
END

-- Agregar columna de metadatos adicionales para Bunny.net
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('dbo.Video') AND name = 'bunny_metadata')
BEGIN
    ALTER TABLE Video ADD bunny_metadata NVARCHAR(MAX) NULL; -- Para almacenar JSON con información adicional
    PRINT '✅ Columna bunny_metadata agregada';
END
ELSE
BEGIN
    PRINT '⚠️ Columna bunny_metadata ya existe';
END

-- PASO 2: Crear índices para optimizar consultas
PRINT '🔍 PASO 2: Creando índices de optimización...';

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_Video_BunnyVideoId' AND object_id = OBJECT_ID('dbo.Video'))
BEGIN
    CREATE INDEX IX_Video_BunnyVideoId ON Video(bunny_video_id) WHERE bunny_video_id IS NOT NULL;
    PRINT '✅ Índice IX_Video_BunnyVideoId creado';
END
ELSE
BEGIN
    PRINT '⚠️ Índice IX_Video_BunnyVideoId ya existe';
END

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_Video_Provider' AND object_id = OBJECT_ID('dbo.Video'))
BEGIN
    CREATE INDEX IX_Video_Provider ON Video(video_provider) WHERE video_provider IS NOT NULL;
    PRINT '✅ Índice IX_Video_Provider creado';
END
ELSE
BEGIN
    PRINT '⚠️ Índice IX_Video_Provider ya existe';
END

-- Índice compuesto para búsquedas eficientes
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_Video_Modulo_Provider' AND object_id = OBJECT_ID('dbo.Video'))
BEGIN
    CREATE INDEX IX_Video_Modulo_Provider ON Video(id_modulo, video_provider) INCLUDE (titulo, estatus);
    PRINT '✅ Índice IX_Video_Modulo_Provider creado';
END
ELSE
BEGIN
    PRINT '⚠️ Índice IX_Video_Modulo_Provider ya existe';
END

-- PASO 3: Backup de datos existentes (crear tabla de respaldo si no existe)
PRINT '💾 PASO 3: Creando backup de datos existentes...';

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'Video_Backup_Vimeo')
BEGIN
    SELECT 
        v.id_video,
        v.id_modulo,
        v.titulo,
        v.descripcion,
        v.url as vimeo_url_original,
        v.duracion_segundos,
        v.orden,
        v.estatus,
        v.fecha_creacion,
        m.titulo as modulo_titulo,
        c.titulo as curso_titulo,
        c.id_curso,
        GETDATE() as fecha_backup
    INTO Video_Backup_Vimeo
    FROM Video v
    INNER JOIN Modulos m ON v.id_modulo = m.id_modulo
    INNER JOIN Cursos c ON m.id_curso = c.id_curso
    WHERE v.url IS NOT NULL;
    
    DECLARE @backup_count INT = @@ROWCOUNT;
    PRINT '✅ ' + CAST(@backup_count AS NVARCHAR(10)) + ' registros respaldados en Video_Backup_Vimeo';
END
ELSE
BEGIN
    PRINT '⚠️ Tabla Video_Backup_Vimeo ya existe - saltando backup';
END

-- PASO 4: Marcar videos existentes como Vimeo para compatibilidad
PRINT '🏷️ PASO 4: Marcando videos existentes como Vimeo...';

UPDATE Video 
SET video_provider = 'vimeo'
WHERE url IS NOT NULL 
  AND video_provider IS NULL;

DECLARE @vimeo_count INT = @@ROWCOUNT;
PRINT '✅ ' + CAST(@vimeo_count AS NVARCHAR(10)) + ' videos marcados como provider vimeo';

-- Marcar videos sin URL como pendientes
UPDATE Video 
SET video_provider = 'pending'
WHERE url IS NULL 
  AND video_provider IS NULL;

DECLARE @pending_count INT = @@ROWCOUNT;
PRINT '📝 ' + CAST(@pending_count AS NVARCHAR(10)) + ' videos sin URL marcados como pendientes';

-- PASO 5: Función para extraer ID de Vimeo de URL (para referencia)
/*
EJEMPLO DE USO MANUAL PARA MIGRACIÓN:

-- Extraer IDs de Vimeo existentes
SELECT 
    id_video,
    titulo,
    url,
    CASE 
        WHEN url LIKE '%vimeo.com/%' THEN 
            SUBSTRING(url, CHARINDEX('vimeo.com/', url) + 10, LEN(url))
        WHEN url LIKE '%player.vimeo.com/video/%' THEN
            SUBSTRING(url, CHARINDEX('player.vimeo.com/video/', url) + 26, LEN(url))
        ELSE NULL
    END as vimeo_id_extraido
FROM Video
WHERE url IS NOT NULL;
*/

-- PASO 6: Crear vista para compatibilidad durante la migración
PRINT '👁️ PASO 6: Creando vista de compatibilidad...';

IF EXISTS (SELECT * FROM sys.views WHERE name = 'vw_Videos_Compatible')
BEGIN
    DROP VIEW vw_Videos_Compatible;
    PRINT '🗑️ Vista anterior eliminada';
END
GO

CREATE VIEW vw_Videos_Compatible AS
SELECT 
    v.id_video,
    v.titulo,
    v.descripcion,
    v.duracion_segundos,
    v.orden,
    v.estatus,
    v.fecha_creacion,
    v.id_modulo,
    v.video_provider,
    
    -- URLs según el provider
    CASE 
        WHEN v.video_provider = 'bunny' THEN v.bunny_embed_url
        WHEN v.video_provider = 'vimeo' THEN v.url
        ELSE NULL
    END as embed_url,
    
    -- IDs según el provider
    CASE 
        WHEN v.video_provider = 'bunny' THEN v.bunny_video_id
        WHEN v.video_provider = 'vimeo' AND v.url LIKE '%vimeo.com/%' THEN 
            SUBSTRING(v.url, CHARINDEX('vimeo.com/', v.url) + 10, 
                     CASE 
                        WHEN CHARINDEX('?', v.url, CHARINDEX('vimeo.com/', v.url) + 10) > 0 
                        THEN CHARINDEX('?', v.url, CHARINDEX('vimeo.com/', v.url) + 10) - CHARINDEX('vimeo.com/', v.url) - 10
                        ELSE LEN(v.url) - CHARINDEX('vimeo.com/', v.url) - 9
                     END)
        WHEN v.video_provider = 'vimeo' AND v.url LIKE '%player.vimeo.com/video/%' THEN
            SUBSTRING(v.url, CHARINDEX('player.vimeo.com/video/', v.url) + 26, 
                     CASE 
                        WHEN CHARINDEX('?', v.url, CHARINDEX('player.vimeo.com/video/', v.url) + 26) > 0 
                        THEN CHARINDEX('?', v.url, CHARINDEX('player.vimeo.com/video/', v.url) + 26) - CHARINDEX('player.vimeo.com/video/', v.url) - 26
                        ELSE LEN(v.url) - CHARINDEX('player.vimeo.com/video/', v.url) - 25
                     END)
        ELSE NULL
    END as video_id,
    
    -- Thumbnail URL
    CASE 
        WHEN v.video_provider = 'bunny' THEN v.bunny_thumbnail_url
        ELSE NULL
    END as thumbnail_url,
    
    -- Información de módulo y curso
    m.titulo as modulo_titulo,
    c.titulo as curso_titulo,
    c.id_curso,
    c.estatus as curso_estatus,
    
    -- Duración formateada
    CASE 
        WHEN v.duracion_segundos IS NULL THEN 'N/A'
        WHEN v.duracion_segundos < 60 THEN CAST(v.duracion_segundos AS NVARCHAR) + 's'
        WHEN v.duracion_segundos < 3600 THEN 
            CAST(v.duracion_segundos / 60 AS NVARCHAR) + ':' + 
            FORMAT(v.duracion_segundos % 60, '00') + 'min'
        ELSE 
            CAST(v.duracion_segundos / 3600 AS NVARCHAR) + ':' +
            FORMAT((v.duracion_segundos % 3600) / 60, '00') + ':' +
            FORMAT(v.duracion_segundos % 60, '00') + 'h'
    END as duracion_formateada
    
FROM Video v
LEFT JOIN Modulos m ON v.id_modulo = m.id_modulo
LEFT JOIN Cursos c ON m.id_curso = c.id_curso;
GO

PRINT '✅ Vista vw_Videos_Compatible creada para compatibilidad';

-- PASO 7: Crear procedimiento almacenado para migrar un video específico a Bunny.net
PRINT '⚙️ PASO 7: Creando procedimientos almacenados...';

IF EXISTS (SELECT * FROM sys.procedures WHERE name = 'sp_MigrateVideoToBunny')
BEGIN
    DROP PROCEDURE sp_MigrateVideoToBunny;
    PRINT '🗑️ Procedimiento anterior eliminado';
END
GO

CREATE PROCEDURE sp_MigrateVideoToBunny
    @VideoId INT,
    @BunnyVideoId NVARCHAR(100),
    @BunnyLibraryId NVARCHAR(50),
    @BunnyEmbedUrl NVARCHAR(500),
    @BunnyThumbnailUrl NVARCHAR(500) = NULL,
    @BunnyMetadata NVARCHAR(MAX) = NULL
AS
BEGIN
    SET NOCOUNT ON;
    
    DECLARE @OriginalUrl NVARCHAR(500);
    DECLARE @VideoTitle NVARCHAR(255);
    
    BEGIN TRY
        BEGIN TRANSACTION;
        
        -- Verificar que el video existe y obtener datos actuales
        SELECT @OriginalUrl = url, @VideoTitle = titulo
        FROM Video 
        WHERE id_video = @VideoId;
        
        IF @OriginalUrl IS NULL AND @VideoTitle IS NULL
        BEGIN
            RAISERROR('Video no encontrado con ID: %d', 16, 1, @VideoId);
            RETURN;
        END
        
        -- Crear registro de auditoría en tabla de backup si no existe
        IF NOT EXISTS (SELECT 1 FROM Video_Backup_Vimeo WHERE id_video = @VideoId)
        BEGIN
            INSERT INTO Video_Backup_Vimeo (
                id_video, titulo, vimeo_url_original, fecha_backup,
                modulo_titulo, curso_titulo, id_curso
            )
            SELECT 
                v.id_video,
                v.titulo,
                v.url,
                GETDATE(),
                m.titulo,
                c.titulo,
                c.id_curso
            FROM Video v
            INNER JOIN Modulos m ON v.id_modulo = m.id_modulo
            INNER JOIN Cursos c ON m.id_curso = c.id_curso
            WHERE v.id_video = @VideoId;
        END
        
        -- Actualizar el video con información de Bunny.net
        UPDATE Video 
        SET 
            bunny_video_id = @BunnyVideoId,
            bunny_library_id = @BunnyLibraryId,
            bunny_embed_url = @BunnyEmbedUrl,
            bunny_thumbnail_url = @BunnyThumbnailUrl,
            bunny_metadata = @BunnyMetadata,
            video_provider = 'bunny',
            url = @BunnyEmbedUrl  -- Actualizar URL principal también
        WHERE id_video = @VideoId;
        
        COMMIT TRANSACTION;
        
        PRINT '✅ Video "' + @VideoTitle + '" (ID: ' + CAST(@VideoId AS NVARCHAR(10)) + ') migrado exitosamente a Bunny.net';
        
        -- Retornar información de confirmación
        SELECT 
            @VideoId as video_id,
            @VideoTitle as titulo,
            @OriginalUrl as url_anterior,
            @BunnyEmbedUrl as nueva_url,
            'bunny' as nuevo_provider,
            GETDATE() as fecha_migracion;
        
    END TRY
    BEGIN CATCH
        ROLLBACK TRANSACTION;
        
        DECLARE @ErrorMessage NVARCHAR(4000) = ERROR_MESSAGE();
        DECLARE @ErrorSeverity INT = ERROR_SEVERITY();
        DECLARE @ErrorState INT = ERROR_STATE();
        
        PRINT '❌ Error migrando video ID ' + CAST(@VideoId AS NVARCHAR(10)) + ': ' + @ErrorMessage;
        RAISERROR(@ErrorMessage, @ErrorSeverity, @ErrorState);
    END CATCH
END
GO

PRINT '✅ Procedimiento sp_MigrateVideoToBunny creado';

-- Crear procedimiento para obtener estadísticas de migración
IF EXISTS (SELECT * FROM sys.procedures WHERE name = 'sp_GetMigrationStats')
BEGIN
    DROP PROCEDURE sp_GetMigrationStats;
END
GO

CREATE PROCEDURE sp_GetMigrationStats
AS
BEGIN
    SET NOCOUNT ON;
    
    PRINT '📊 Estadísticas de Migración:';
    PRINT '===============================================';
    
    -- Estadísticas por provider
    SELECT 
        ISNULL(video_provider, 'SIN_PROVIDER') as Provider,
        COUNT(*) as Total_Videos,
        COUNT(CASE WHEN url IS NOT NULL THEN 1 END) as Con_URL,
        COUNT(CASE WHEN bunny_video_id IS NOT NULL THEN 1 END) as Con_Bunny_ID,
        COUNT(CASE WHEN estatus = 'publicado' THEN 1 END) as Publicados
    FROM Video 
    GROUP BY video_provider
    ORDER BY Total_Videos DESC;
    
    -- Resumen por curso
    SELECT 
        c.titulo as Curso,
        COUNT(v.id_video) as Total_Videos,
        COUNT(CASE WHEN v.video_provider = 'bunny' THEN 1 END) as En_Bunny,
        COUNT(CASE WHEN v.video_provider = 'vimeo' THEN 1 END) as En_Vimeo,
        COUNT(CASE WHEN v.video_provider IS NULL OR v.video_provider = 'pending' THEN 1 END) as Pendientes
    FROM Cursos c
    INNER JOIN Modulos m ON c.id_curso = m.id_curso
    INNER JOIN Video v ON m.id_modulo = v.id_modulo
    GROUP BY c.titulo
    ORDER BY Total_Videos DESC;
END
GO

PRINT '✅ Procedimiento sp_GetMigrationStats creado';

-- PASO 8: Crear función para generar URLs de Bunny.net
IF EXISTS (SELECT * FROM sys.objects WHERE name = 'fn_GenerateBunnyUrls' AND type = 'TF')
BEGIN
    DROP FUNCTION fn_GenerateBunnyUrls;
END
GO

CREATE FUNCTION fn_GenerateBunnyUrls(@LibraryId NVARCHAR(50), @VideoId NVARCHAR(100))
RETURNS @BunnyUrls TABLE (
    embed_url NVARCHAR(500),
    thumbnail_url NVARCHAR(500),
    direct_play_url NVARCHAR(500)
)
AS
BEGIN
    INSERT INTO @BunnyUrls
    SELECT 
        'https://iframe.mediadelivery.net/embed/' + @LibraryId + '/' + @VideoId as embed_url,
        'https://iframe.mediadelivery.net/' + @LibraryId + '/' + @VideoId + '/thumbnail.jpg' as thumbnail_url,
        'https://iframe.mediadelivery.net/' + @LibraryId + '/' + @VideoId + '/play_720p.mp4' as direct_play_url;
    
    RETURN;
END
GO

PRINT 'Función fn_GenerateBunnyUrls creada';

-- PASO 8: Crear triggers para mantener consistencia
PRINT '🔧 PASO 8: Creando triggers de consistencia...';

-- Trigger para validar datos de Bunny.net
IF EXISTS (SELECT * FROM sys.triggers WHERE name = 'tr_Video_BunnyValidation')
BEGIN
    DROP TRIGGER tr_Video_BunnyValidation;
END
GO

CREATE TRIGGER tr_Video_BunnyValidation
ON Video
AFTER INSERT, UPDATE
AS
BEGIN
    SET NOCOUNT ON;
    
    -- Validar que si es provider bunny, tenga los campos requeridos
    IF EXISTS (
        SELECT 1 FROM inserted 
        WHERE video_provider = 'bunny' 
        AND (bunny_video_id IS NULL OR bunny_embed_url IS NULL)
    )
    BEGIN
        RAISERROR('Videos con provider "bunny" requieren bunny_video_id y bunny_embed_url', 16, 1);
        ROLLBACK TRANSACTION;
        RETURN;
    END
    
    -- Auto-generar URLs si solo se proporciona el ID
    UPDATE v
    SET 
        bunny_embed_url = CASE 
            WHEN v.bunny_embed_url IS NULL AND v.bunny_video_id IS NOT NULL AND v.bunny_library_id IS NOT NULL
            THEN 'https://iframe.mediadelivery.net/embed/' + v.bunny_library_id + '/' + v.bunny_video_id
            ELSE v.bunny_embed_url
        END,
        bunny_thumbnail_url = CASE 
            WHEN v.bunny_thumbnail_url IS NULL AND v.bunny_video_id IS NOT NULL AND v.bunny_library_id IS NOT NULL
            THEN 'https://iframe.mediadelivery.net/' + v.bunny_library_id + '/' + v.bunny_video_id + '/thumbnail.jpg'
            ELSE v.bunny_thumbnail_url
        END
    FROM Video v
    INNER JOIN inserted i ON v.id_video = i.id_video
    WHERE v.video_provider = 'bunny';
END
GO

PRINT '✅ Trigger tr_Video_BunnyValidation creado';

-- INFORMACIÓN DE MIGRACIÓN COMPLETADA
PRINT '';
PRINT '🎉 ===============================================';
PRINT '✅ MIGRACIÓN DE ESTRUCTURA COMPLETADA EXITOSAMENTE';
PRINT '===============================================';
PRINT '';
PRINT '📋 Próximos pasos manuales:';
PRINT '1. 🔑 Configurar variables de entorno:';
PRINT '   - BUNNY_API_KEY=tu_api_key_aqui';
PRINT '   - BUNNY_LIBRARY_ID=tu_library_id_aqui';
PRINT '';
PRINT '2. 🎬 Opciones para migrar videos:';
PRINT '   - Subir nuevos videos: /admin/videos/nuevo';
PRINT '   - Migración automática: node scripts/migrate_videos.js migrate';
PRINT '   - Migración individual: EXEC sp_MigrateVideoToBunny @VideoId, @BunnyVideoId, ...';
PRINT '';
PRINT '3. 🔍 Verificar migración:';
PRINT '   - EXEC sp_GetMigrationStats';
PRINT '   - SELECT * FROM vw_Videos_Compatible';
PRINT '';
PRINT '4. 🧪 Probar funcionalidad:';
PRINT '   - Acceder a /admin/videos';
PRINT '   - Subir video de prueba';
PRINT '   - Verificar reproducción';
PRINT '';
PRINT '===============================================';

-- Ejecutar estadísticas iniciales
PRINT '📊 ESTADÍSTICAS INICIALES:';
EXEC sp_GetMigrationStats;