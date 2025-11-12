-- Crear tabla Compras para registrar transacciones completadas
-- StartEducation Platform - Mercado Pago Integration

USE StartEducationDB;
GO

-- Verificar si la tabla ya existe
IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'Compras')
BEGIN
    CREATE TABLE Compras (
        id_compra INT IDENTITY(1,1) PRIMARY KEY,
        id_usuario INT NOT NULL,
        id_curso INT NOT NULL,
        cantidad INT NOT NULL DEFAULT 1,
        precio_pagado DECIMAL(10,2) NOT NULL,
        metodo_pago VARCHAR(50) NOT NULL,
        transaction_id VARCHAR(255) NULL,
        fecha_compra DATETIME NOT NULL DEFAULT GETDATE(),
        estatus VARCHAR(20) NOT NULL DEFAULT 'completada',
        notas TEXT NULL,
        
        -- Claves foráneas
        CONSTRAINT FK_Compras_Usuario FOREIGN KEY (id_usuario) 
            REFERENCES usuarios(id_usuario) ON DELETE CASCADE,
        CONSTRAINT FK_Compras_Curso FOREIGN KEY (id_curso) 
            REFERENCES Cursos(id_curso) ON DELETE CASCADE,
            
        -- Índices para rendimiento
        INDEX IX_Compras_Usuario (id_usuario),
        INDEX IX_Compras_Curso (id_curso),
        INDEX IX_Compras_Fecha (fecha_compra),
        INDEX IX_Compras_TransactionId (transaction_id)
    );
    
    PRINT '✅ Tabla Compras creada exitosamente';
END
ELSE
BEGIN
    PRINT '⚠️ La tabla Compras ya existe';
END

-- Verificar estructura de la tabla Carrito_Compras
IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS 
               WHERE TABLE_NAME = 'Carrito_Compras' AND COLUMN_NAME = 'estatus')
BEGIN
    ALTER TABLE Carrito_Compras ADD estatus VARCHAR(20) NOT NULL DEFAULT 'activo';
    PRINT '✅ Columna estatus agregada a Carrito_Compras';
END

IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS 
               WHERE TABLE_NAME = 'Carrito_Compras' AND COLUMN_NAME = 'fecha_modificacion')
BEGIN
    ALTER TABLE Carrito_Compras ADD fecha_modificacion DATETIME NULL DEFAULT GETDATE();
    PRINT '✅ Columna fecha_modificacion agregada a Carrito_Compras';
END

-- Crear índices adicionales si no existen
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_Carrito_Estatus')
BEGIN
    CREATE INDEX IX_Carrito_Estatus ON Carrito_Compras (estatus);
    PRINT '✅ Índice IX_Carrito_Estatus creado';
END

PRINT '🚀 Base de datos preparada para Mercado Pago';