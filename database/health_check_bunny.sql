-- health_check_bunny.sql
-- Script de verificación para comprobar si la migración a Bunny NET (schema) se aplicó correctamente.
-- Ejecuta este script en SSMS (o con sqlcmd) contra la base de datos StartEducationDB.

PRINT '--- CHECK: EXISTENCIA DE COLUMNAS bunny_* EN dbo.Video ---';
SELECT COLUMN_NAME
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_NAME = 'Video'
  AND TABLE_SCHEMA = 'dbo'
  AND COLUMN_NAME IN (
    'bunny_video_id',
    'bunny_library_id',
    'bunny_embed_url',
    'bunny_thumbnail_url',
    'video_provider',
    'bunny_metadata'
  );

PRINT '--- SAMPLE ROWS (si las columnas existen se seleccionarán; si no, mostrará filas básicas) ---';
IF EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME='Video' AND TABLE_SCHEMA='dbo' AND COLUMN_NAME='bunny_video_id')
BEGIN
  PRINT 'Columnas bunny detectadas: mostrando TOP 10 con campos bunny_*';
  EXEC('SELECT TOP 10 id_video, id_modulo, titulo, url, bunny_video_id, bunny_library_id, bunny_embed_url, bunny_thumbnail_url, video_provider FROM dbo.Video ORDER BY id_video;');
END
ELSE
BEGIN
  PRINT 'Columnas bunny NO detectadas: mostrando TOP 10 columnas básicas';
  SELECT TOP 10 id_video, id_modulo, titulo, url FROM dbo.Video ORDER BY id_video;
END

PRINT '--- CHECK: OBJETOS AUXILIARES (backup, proc, vista, trigger) ---';
SELECT TABLE_SCHEMA, TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'Video_Backup_Vimeo';
SELECT ROUTINE_SCHEMA, ROUTINE_NAME, ROUTINE_TYPE FROM INFORMATION_SCHEMA.ROUTINES WHERE ROUTINE_NAME = 'sp_MigrateVideoToBunny';
SELECT TABLE_SCHEMA, TABLE_NAME FROM INFORMATION_SCHEMA.VIEWS WHERE TABLE_NAME = 'vw_Videos_Compatible';

PRINT '--- CHECK: TRIGGER tr_Video_BunnyValidation ---';
SELECT t.name AS trigger_name, OBJECT_NAME(t.parent_id) AS parent_table, t.is_disabled
FROM sys.triggers t
WHERE t.name = 'tr_Video_BunnyValidation';

PRINT '--- CHECK: INDICES (nombres esperados) EN dbo.Video ---';
SELECT i.name AS index_name, i.type_desc, i.is_unique
FROM sys.indexes i
WHERE i.object_id = OBJECT_ID('dbo.Video')
  AND i.name IN ('IX_Video_BunnyVideoId','IX_Video_Provider','IX_Video_Modulo_Provider');

PRINT '--- CHECK: TODOS LOS INDICES EN dbo.Video (para inspección) ---';
EXEC sp_helpindex 'dbo.Video';

PRINT '--- FIN DE SCRIPT ---';

/* Instrucciones:
   1) Ejecuta este script en SSMS conectado a la base de datos StartEducationDB.
   2) Si las columnas bunny_* no existen, copia aquí el resultado del script y los mensajes de error si tienes alguno al intentar ejecutar el migration SQL.
   3) Si necesitas que te ayude a aplicar el migration SQL, pega el error que obtengas al ejecutar 'database/migrate_to_bunny.sql' y lo reviso.
*/
