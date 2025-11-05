-- Script para migrar usuario existente a SuperAdmin RBAC
USE StartEducationDB;

-- Paso 1: Verificar que existe la columna RolID en la tabla Usuarios
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('Usuarios') AND name = 'RolID')
BEGIN
    ALTER TABLE Usuarios ADD RolID INT NULL;
    ALTER TABLE Usuarios ADD CONSTRAINT FK_Usuarios_Roles FOREIGN KEY (RolID) REFERENCES Roles(RolID);
    PRINT '✅ Columna RolID agregada a tabla Usuarios';
END
ELSE
BEGIN
    PRINT '✅ Columna RolID ya existe en tabla Usuarios';
END

-- Paso 2: Mostrar usuarios existentes
PRINT '';
PRINT '👥 USUARIOS ACTUALES:';
PRINT '=' + REPLICATE('=', 50);
SELECT 
    id_usuario,
    nombre + ' ' + apellido as NombreCompleto,
    email,
    rol as RolLegacy,
    RolID as RolRBAC,
    estatus
FROM Usuarios 
WHERE estatus = 'activo';

-- Paso 3: Obtener el ID del rol SuperAdmin
DECLARE @SuperAdminRolID INT;
SELECT @SuperAdminRolID = RolID FROM Roles WHERE NombreRol = 'SuperAdmin';

PRINT '';
PRINT '🔐 ASIGNANDO ROL SUPERADMIN...';
PRINT '=' + REPLICATE('=', 50);
PRINT 'SuperAdmin RolID: ' + CAST(@SuperAdminRolID AS VARCHAR);

-- Paso 4: Asignar rol SuperAdmin al usuario existente
UPDATE Usuarios 
SET RolID = @SuperAdminRolID
WHERE email = 'admin@starteducation.com' AND estatus = 'activo';

IF @@ROWCOUNT > 0
BEGIN
    PRINT '✅ Usuario admin@starteducation.com migrado a SuperAdmin exitosamente';
END
ELSE
BEGIN
    PRINT '⚠️ No se encontró el usuario admin@starteducation.com o ya tenía rol asignado';
END

-- Paso 5: Verificar la migración
PRINT '';
PRINT '🎯 VERIFICACIÓN POST-MIGRACIÓN:';
PRINT '=' + REPLICATE('=', 50);
SELECT 
    u.id_usuario,
    u.nombre + ' ' + u.apellido as NombreCompleto,
    u.email,
    u.rol as RolLegacy,
    r.NombreRol as RolRBAC,
    r.Descripcion,
    COUNT(rp.PermisoID) as TotalPermisos
FROM Usuarios u
LEFT JOIN Roles r ON u.RolID = r.RolID
LEFT JOIN RolPermiso rp ON r.RolID = rp.RolID
WHERE u.estatus = 'activo'
GROUP BY u.id_usuario, u.nombre, u.apellido, u.email, u.rol, r.NombreRol, r.Descripcion;

-- Paso 6: Mostrar algunos permisos del SuperAdmin como ejemplo
PRINT '';
PRINT '🔑 PERMISOS ASIGNADOS AL SUPERADMIN (muestra):';
PRINT '=' + REPLICATE('=', 50);
SELECT TOP 10
    p.Modulo,
    p.NombrePermiso,
    p.Descripcion
FROM Roles r
INNER JOIN RolPermiso rp ON r.RolID = rp.RolID  
INNER JOIN Permisos p ON rp.PermisoID = p.PermisoID
WHERE r.NombreRol = 'SuperAdmin'
ORDER BY p.Modulo, p.NombrePermiso;

PRINT '';
PRINT '🎉 MIGRACIÓN COMPLETADA!';
PRINT '=' + REPLICATE('=', 50);
PRINT '💡 Próximos pasos:';
PRINT '   1. El usuario ahora debe cerrar sesión y volver a iniciar';
PRINT '   2. Los permisos se cargarán automáticamente en la nueva sesión';
PRINT '   3. Podrá acceder a /admin/roles y otras funciones administrativas';
PRINT '';