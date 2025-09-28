-- Tabla para auditoría de videos eliminados
-- Ejecutar este script si deseas llevar un registro de los videos eliminados

IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='VideoAuditLog' AND xtype='U')
BEGIN
    CREATE TABLE VideoAuditLog (
        id_audit INT IDENTITY(1,1) PRIMARY KEY,
        video_id_original INT NOT NULL,
        titulo NVARCHAR(200) NOT NULL,
        modulo NVARCHAR(200),
        curso NVARCHAR(200),
        estatus_anterior NVARCHAR(50),
        eliminado_por NVARCHAR(100) NOT NULL,
        eliminado_por_id INT,
        fecha_eliminacion DATETIME2 DEFAULT GETDATE(),
        url_vimeo_original NVARCHAR(500),
        vimeo_delete_success BIT DEFAULT 0,
        notas NTEXT,
        ip_address NVARCHAR(45),
        user_agent NVARCHAR(500)
    );

    -- Índices para búsquedas eficientes
    CREATE INDEX IX_VideoAuditLog_FechaEliminacion ON VideoAuditLog(fecha_eliminacion DESC);
    CREATE INDEX IX_VideoAuditLog_EliminadoPor ON VideoAuditLog(eliminado_por);
    CREATE INDEX IX_VideoAuditLog_VideoId ON VideoAuditLog(video_id_original);

    PRINT 'Tabla VideoAuditLog creada exitosamente';
END
ELSE
BEGIN
    PRINT 'La tabla VideoAuditLog ya existe';
END

-- Opcional: Agregar columna fecha_modificacion a la tabla Video si no existe
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('Video') AND name = 'fecha_modificacion')
BEGIN
    ALTER TABLE Video ADD fecha_modificacion DATETIME2;
    UPDATE Video SET fecha_modificacion = fecha_creacion WHERE fecha_modificacion IS NULL;
    PRINT 'Columna fecha_modificacion agregada a tabla Video';
END
ELSE
BEGIN
    PRINT 'La columna fecha_modificacion ya existe en tabla Video';
END