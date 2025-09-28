-- Script para actualizar el usuario actual a rol admin y permitir administración de videos
USE StartEducationDB;
GO

-- Primero, vamos a ver los usuarios existentes
PRINT '=== USUARIOS ACTUALES ===';
SELECT id_usuario, nombre, apellido, email, rol, estatus FROM Usuarios;
GO

-- Modificar el constraint de rol para incluir 'admin'
BEGIN TRY
    -- Eliminar el constraint existente
    ALTER TABLE Usuarios DROP CONSTRAINT CK__Usuarios__rol__[NUMBER];
    PRINT '✅ Constraint de rol eliminado';
CATCH
    PRINT '⚠️ No se pudo eliminar constraint (puede que no exista)';
END TRY
GO

-- Agregar el nuevo constraint con 'admin'
ALTER TABLE Usuarios ADD CONSTRAINT CK_Usuarios_Rol 
CHECK (rol IN ('instructor', 'user', 'admin'));
GO
PRINT '✅ Nuevo constraint de rol agregado (instructor, user, admin)';

-- Actualizar tu usuario a admin
UPDATE Usuarios 
SET rol = 'admin' 
WHERE email = 'cesardavila1937@gmail.com';
GO

IF @@ROWCOUNT > 0
BEGIN
    PRINT '✅ Usuario cesardavila1937@gmail.com actualizado a rol admin';
END
ELSE
BEGIN
    PRINT '⚠️ Usuario cesardavila1937@gmail.com no encontrado o ya es admin';
END
GO

-- Verificar el cambio
PRINT '';
PRINT '=== USUARIOS DESPUÉS DEL CAMBIO ===';
SELECT id_usuario, nombre, apellido, email, rol, estatus FROM Usuarios;
GO

PRINT '';
PRINT '🎯 ¡Ahora puedes acceder al módulo de videos como admin!';