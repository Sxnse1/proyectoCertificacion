-- ============================================================
-- TABLA DE AUDITORÍA PARA STARTEDUCATION
-- ============================================================
-- Esta tabla registra todas las acciones sensibles realizadas
-- por administradores en el panel de administración (/admin)
-- ============================================================

USE StartEducationDB;
GO

-- Verificar si la tabla ya existe y eliminarla si es necesario (solo para desarrollo)
IF EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[AuditLogs]') AND type in (N'U'))
BEGIN
    PRINT 'La tabla AuditLogs ya existe. Eliminándola para recrearla...'
    DROP TABLE [dbo].[AuditLogs]
END
GO

-- Crear la tabla AuditLogs
CREATE TABLE [dbo].[AuditLogs] (
    -- Identificador único del log de auditoría
    [LogID] INT IDENTITY(1,1) PRIMARY KEY,
    
    -- Usuario que realizó la acción (FK a tabla Usuarios)
    [UsuarioID] INT NOT NULL,
    
    -- Descripción de la acción realizada
    -- Ejemplos: 'USUARIO_CREADO', 'CURSO_ELIMINADO', 'MEMBRESIA_ACTUALIZADA'
    [Accion] NVARCHAR(100) NOT NULL,
    
    -- Tipo de entidad afectada
    -- Ejemplos: 'Usuario', 'Curso', 'Membresia', 'Video', 'Modulo'
    [Entidad] NVARCHAR(50) NOT NULL,
    
    -- ID de la entidad afectada (puede ser NULL para acciones generales)
    [EntidadID] INT NULL,
    
    -- Detalles adicionales en formato JSON
    -- Incluye datos como: valores anteriores, nuevos valores, payload de request
    [Detalles] NVARCHAR(MAX) NULL,
    
    -- Dirección IP desde donde se realizó la acción
    [IP] NVARCHAR(50) NULL,
    
    -- Timestamp de cuando ocurrió la acción
    [Timestamp] DATETIME NOT NULL DEFAULT GETDATE(),
    
    -- Índices para mejorar el rendimiento de consultas
    INDEX IX_AuditLogs_UsuarioID (UsuarioID),
    INDEX IX_AuditLogs_Timestamp (Timestamp DESC),
    INDEX IX_AuditLogs_Entidad (Entidad, EntidadID),
    INDEX IX_AuditLogs_Accion (Accion),
    
    -- Foreign Key constraint
    CONSTRAINT FK_AuditLogs_Usuario 
        FOREIGN KEY (UsuarioID) 
        REFERENCES [dbo].[Usuarios](id_usuario)
        ON DELETE NO ACTION  -- No permitir eliminar usuarios que tienen logs
        ON UPDATE CASCADE    -- Actualizar si cambia el ID del usuario
);
GO

-- Agregar comentarios descriptivos a la tabla y columnas
EXEC sys.sp_addextendedproperty 
    @name = N'MS_Description', 
    @value = N'Tabla de auditoría que registra todas las acciones sensibles realizadas por administradores en el sistema', 
    @level0type = N'SCHEMA', @level0name = N'dbo', 
    @level1type = N'TABLE', @level1name = N'AuditLogs';

EXEC sys.sp_addextendedproperty 
    @name = N'MS_Description', 
    @value = N'ID único del registro de auditoría', 
    @level0type = N'SCHEMA', @level0name = N'dbo', 
    @level1type = N'TABLE', @level1name = N'AuditLogs', 
    @level2type = N'COLUMN', @level2name = N'LogID';

EXEC sys.sp_addextendedproperty 
    @name = N'MS_Description', 
    @value = N'ID del usuario que realizó la acción (FK a Usuarios)', 
    @level0type = N'SCHEMA', @level0name = N'dbo', 
    @level1type = N'TABLE', @level1name = N'AuditLogs', 
    @level2type = N'COLUMN', @level2name = N'UsuarioID';

EXEC sys.sp_addextendedproperty 
    @name = N'MS_Description', 
    @value = N'Descripción de la acción realizada (ej: USUARIO_CREADO, CURSO_ELIMINADO)', 
    @level0type = N'SCHEMA', @level0name = N'dbo', 
    @level1type = N'TABLE', @level1name = N'AuditLogs', 
    @level2type = N'COLUMN', @level2name = N'Accion';

EXEC sys.sp_addextendedproperty 
    @name = N'MS_Description', 
    @value = N'Tipo de entidad afectada (ej: Usuario, Curso, Membresia)', 
    @level0type = N'SCHEMA', @level0name = N'dbo', 
    @level1type = N'TABLE', @level1name = N'AuditLogs', 
    @level2type = N'COLUMN', @level2name = N'Entidad';

EXEC sys.sp_addextendedproperty 
    @name = N'MS_Description', 
    @value = N'ID de la entidad afectada (puede ser NULL para acciones generales)', 
    @level0type = N'SCHEMA', @level0name = N'dbo', 
    @level1type = N'TABLE', @level1name = N'AuditLogs', 
    @level2type = N'COLUMN', @level2name = N'EntidadID';

EXEC sys.sp_addextendedproperty 
    @name = N'MS_Description', 
    @value = N'Detalles adicionales en formato JSON (valores anteriores, nuevos, payload)', 
    @level0type = N'SCHEMA', @level0name = N'dbo', 
    @level1type = N'TABLE', @level1name = N'AuditLogs', 
    @level2type = N'COLUMN', @level2name = N'Detalles';

EXEC sys.sp_addextendedproperty 
    @name = N'MS_Description', 
    @value = N'Dirección IP desde donde se realizó la acción', 
    @level0type = N'SCHEMA', @level0name = N'dbo', 
    @level1type = N'TABLE', @level1name = N'AuditLogs', 
    @level2type = N'COLUMN', @level2name = N'IP';

EXEC sys.sp_addextendedproperty 
    @name = N'MS_Description', 
    @value = N'Fecha y hora cuando ocurrió la acción', 
    @level0type = N'SCHEMA', @level0name = N'dbo', 
    @level1type = N'TABLE', @level1name = N'AuditLogs', 
    @level2type = N'COLUMN', @level2name = N'Timestamp';

-- Insertar algunos datos de prueba para testing (usando ID de usuario existente)
DECLARE @UsuarioID INT;
SELECT TOP 1 @UsuarioID = id_usuario FROM Usuarios ORDER BY id_usuario;

IF @UsuarioID IS NOT NULL
BEGIN
    INSERT INTO [dbo].[AuditLogs] (UsuarioID, Accion, Entidad, EntidadID, Detalles, IP)
    VALUES 
        (@UsuarioID, 'TABLA_AUDITORIA_CREADA', 'Sistema', NULL, '{"descripcion": "Tabla de auditoría creada exitosamente", "version": "1.0"}', '127.0.0.1'),
        (@UsuarioID, 'SISTEMA_INICIALIZADO', 'Sistema', NULL, '{"mensaje": "Sistema de auditoría inicializado", "timestamp": "' + CONVERT(NVARCHAR(50), GETDATE(), 127) + '"}', '127.0.0.1');
    PRINT '✅ Datos de prueba insertados con UsuarioID: ' + CAST(@UsuarioID AS NVARCHAR(10));
END
ELSE
BEGIN
    PRINT '⚠️ No se encontraron usuarios para insertar datos de prueba';
END

PRINT '✅ Tabla AuditLogs creada exitosamente con índices y constraints';
PRINT '✅ Datos de prueba insertados';
PRINT '📊 Verificando estructura de la tabla...';

-- Mostrar información de la tabla creada
SELECT 
    COLUMN_NAME,
    DATA_TYPE,
    IS_NULLABLE,
    COLUMN_DEFAULT,
    CHARACTER_MAXIMUM_LENGTH
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_NAME = 'AuditLogs'
ORDER BY ORDINAL_POSITION;

PRINT '🔗 Foreign Keys creadas:';
SELECT 
    fk.name AS ForeignKeyName,
    tp.name AS ParentTable,
    cp.name AS ParentColumn,
    tr.name AS ReferencedTable,
    cr.name AS ReferencedColumn
FROM sys.foreign_keys fk
INNER JOIN sys.tables tp ON fk.parent_object_id = tp.object_id
INNER JOIN sys.tables tr ON fk.referenced_object_id = tr.object_id
INNER JOIN sys.foreign_key_columns fkc ON fk.object_id = fkc.constraint_object_id
INNER JOIN sys.columns cp ON fkc.parent_column_id = cp.column_id AND fkc.parent_object_id = cp.object_id
INNER JOIN sys.columns cr ON fkc.referenced_column_id = cr.column_id AND fkc.referenced_object_id = cr.object_id
WHERE tp.name = 'AuditLogs';

PRINT '📈 Índices creados:';
SELECT 
    i.name AS IndexName,
    i.type_desc AS IndexType,
    c.name AS ColumnName
FROM sys.indexes i
INNER JOIN sys.index_columns ic ON i.object_id = ic.object_id AND i.index_id = ic.index_id
INNER JOIN sys.columns c ON ic.object_id = c.object_id AND ic.column_id = c.column_id
INNER JOIN sys.tables t ON i.object_id = t.object_id
WHERE t.name = 'AuditLogs' AND i.type > 0
ORDER BY i.name, ic.key_ordinal;

GO