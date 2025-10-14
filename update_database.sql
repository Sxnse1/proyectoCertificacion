-- Actualización de base de datos para StartEducation
-- Agregar tabla Carrito si no existe

USE [StartEducationDB]
GO

-- Tabla Carrito para manejar items en carrito de usuarios
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='Carrito' AND xtype='U')
BEGIN
    CREATE TABLE [dbo].[Carrito](
        [id_carrito] [int] IDENTITY(1,1) NOT NULL,
        [id_usuario] [int] NOT NULL,
        [id_curso] [int] NOT NULL,
        [cantidad] [int] NOT NULL DEFAULT(1),
        [fecha_agregado] [datetime2](7) NOT NULL DEFAULT(GETDATE()),
        PRIMARY KEY CLUSTERED ([id_carrito] ASC)
    )

    -- Agregar restricciones de llave foránea
    ALTER TABLE [dbo].[Carrito]  
    WITH CHECK ADD CONSTRAINT [FK_Carrito_Usuario] 
    FOREIGN KEY([id_usuario]) REFERENCES [dbo].[Usuarios] ([id_usuario])
    ON DELETE CASCADE

    ALTER TABLE [dbo].[Carrito] CHECK CONSTRAINT [FK_Carrito_Usuario]

    ALTER TABLE [dbo].[Carrito]  
    WITH CHECK ADD CONSTRAINT [FK_Carrito_Curso] 
    FOREIGN KEY([id_curso]) REFERENCES [dbo].[Cursos] ([id_curso])
    ON DELETE CASCADE

    ALTER TABLE [dbo].[Carrito] CHECK CONSTRAINT [FK_Carrito_Curso]

    -- Agregar restricción para evitar duplicados
    ALTER TABLE [dbo].[Carrito] 
    ADD CONSTRAINT [UQ_Carrito_Usuario_Curso] UNIQUE ([id_usuario], [id_curso])

    -- Agregar restricción de cantidad positiva
    ALTER TABLE [dbo].[Carrito] 
    ADD CONSTRAINT [CK_Carrito_Cantidad_Positiva] CHECK ([cantidad] > 0)

    PRINT 'Tabla Carrito creada exitosamente'
END
ELSE
BEGIN
    PRINT 'Tabla Carrito ya existe'
END
GO

-- Tabla Compras para registrar compras realizadas (si no existe)
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='Compras' AND xtype='U')
BEGIN
    CREATE TABLE [dbo].[Compras](
        [id_compra] [int] IDENTITY(1,1) NOT NULL,
        [id_usuario] [int] NOT NULL,
        [id_curso] [int] NOT NULL,
        [precio_pagado] [decimal](10, 2) NOT NULL,
        [fecha_compra] [datetime2](7) NOT NULL DEFAULT(GETDATE()),
        [metodo_pago] [nvarchar](50) NULL,
        [referencia_pago] [nvarchar](255) NULL,
        [estatus] [nvarchar](20) NOT NULL DEFAULT('completada'),
        PRIMARY KEY CLUSTERED ([id_compra] ASC)
    )

    -- Agregar restricciones de llave foránea
    ALTER TABLE [dbo].[Compras]  
    WITH CHECK ADD CONSTRAINT [FK_Compras_Usuario] 
    FOREIGN KEY([id_usuario]) REFERENCES [dbo].[Usuarios] ([id_usuario])

    ALTER TABLE [dbo].[Compras] CHECK CONSTRAINT [FK_Compras_Usuario]

    ALTER TABLE [dbo].[Compras]  
    WITH CHECK ADD CONSTRAINT [FK_Compras_Curso] 
    FOREIGN KEY([id_curso]) REFERENCES [dbo].[Cursos] ([id_curso])

    ALTER TABLE [dbo].[Compras] CHECK CONSTRAINT [FK_Compras_Curso]

    -- Agregar restricción de precio positivo
    ALTER TABLE [dbo].[Compras] 
    ADD CONSTRAINT [CK_Compras_Precio_Positivo] CHECK ([precio_pagado] >= 0)

    -- Agregar restricción de estatus
    ALTER TABLE [dbo].[Compras] 
    ADD CONSTRAINT [CK_Compras_Estatus] 
    CHECK ([estatus] IN ('pendiente', 'completada', 'cancelada', 'reembolsada'))

    PRINT 'Tabla Compras creada exitosamente'
END
ELSE
BEGIN
    PRINT 'Tabla Compras ya existe'
END
GO

-- Tabla Progreso para seguimiento de avance en cursos (si no existe)
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='Progreso' AND xtype='U')
BEGIN
    CREATE TABLE [dbo].[Progreso](
        [id_progreso] [int] IDENTITY(1,1) NOT NULL,
        [id_usuario] [int] NOT NULL,
        [id_video] [int] NOT NULL,
        [completado] [bit] NOT NULL DEFAULT(0),
        [minuto_actual] [int] NOT NULL DEFAULT(0),
        [fecha_ultima_vista] [datetime2](7) NOT NULL DEFAULT(GETDATE()),
        PRIMARY KEY CLUSTERED ([id_progreso] ASC)
    )

    -- Agregar restricciones de llave foránea
    ALTER TABLE [dbo].[Progreso]  
    WITH CHECK ADD CONSTRAINT [FK_Progreso_Usuario] 
    FOREIGN KEY([id_usuario]) REFERENCES [dbo].[Usuarios] ([id_usuario])
    ON DELETE CASCADE

    ALTER TABLE [dbo].[Progreso] CHECK CONSTRAINT [FK_Progreso_Usuario]

    ALTER TABLE [dbo].[Progreso]  
    WITH CHECK ADD CONSTRAINT [FK_Progreso_Video] 
    FOREIGN KEY([id_video]) REFERENCES [dbo].[Video] ([id_video])
    ON DELETE CASCADE

    ALTER TABLE [dbo].[Progreso] CHECK CONSTRAINT [FK_Progreso_Video]

    -- Agregar restricción para evitar duplicados
    ALTER TABLE [dbo].[Progreso] 
    ADD CONSTRAINT [UQ_Progreso_Usuario_Video] UNIQUE ([id_usuario], [id_video])

    -- Agregar restricción de minuto no negativo
    ALTER TABLE [dbo].[Progreso] 
    ADD CONSTRAINT [CK_Progreso_Minuto_NoNegativo] CHECK ([minuto_actual] >= 0)

    PRINT 'Tabla Progreso creada exitosamente'
END
ELSE
BEGIN
    PRINT 'Tabla Progreso ya existe'
END
GO

PRINT 'Actualización de base de datos completada'