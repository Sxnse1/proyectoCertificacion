-- Asignar TODOS los permisos a SuperAdmin
INSERT INTO RolPermiso (RolID, PermisoID)
SELECT 
    (SELECT RolID FROM Roles WHERE NombreRol = 'SuperAdmin'),
    PermisoID
FROM Permisos;

-- Asignar permisos a Admin (todos excepto gestión de roles)
INSERT INTO RolPermiso (RolID, PermisoID)
SELECT 
    (SELECT RolID FROM Roles WHERE NombreRol = 'Admin'),
    PermisoID
FROM Permisos
WHERE NombrePermiso NOT IN ('gestionar_roles', 'gestionar_permisos');

-- Asignar permisos a Editor (contenido)
INSERT INTO RolPermiso (RolID, PermisoID)
SELECT 
    (SELECT RolID FROM Roles WHERE NombreRol = 'Editor'),
    PermisoID
FROM Permisos
WHERE Modulo IN ('Cursos', 'Videos', 'Contenido') 
   OR NombrePermiso IN ('ver_usuarios', 'ver_analytics');

-- Asignar permisos a Finanzas
INSERT INTO RolPermiso (RolID, PermisoID)
SELECT 
    (SELECT RolID FROM Roles WHERE NombreRol = 'Finanzas'),
    PermisoID
FROM Permisos
WHERE Modulo IN ('Finanzas', 'Analytics') 
   OR NombrePermiso IN ('ver_usuarios', 'ver_cursos');

-- Asignar permisos a Soporte (solo lectura)
INSERT INTO RolPermiso (RolID, PermisoID)
SELECT 
    (SELECT RolID FROM Roles WHERE NombreRol = 'Soporte'),
    PermisoID
FROM Permisos
WHERE NombrePermiso IN (
    'ver_usuarios', 'ver_cursos', 'ver_videos', 'ver_valoraciones', 'ver_favoritos',
    'ver_membresias', 'ver_compras', 'ver_analytics'
);

-- Asignar permisos a Instructor
INSERT INTO RolPermiso (RolID, PermisoID)
SELECT 
    (SELECT RolID FROM Roles WHERE NombreRol = 'Instructor'),
    PermisoID
FROM Permisos
WHERE NombrePermiso IN (
    'ver_cursos', 'crear_cursos', 'editar_cursos', 'publicar_cursos',
    'ver_videos', 'crear_videos', 'editar_videos',
    'ver_analytics'
);

-- Migrar usuarios existentes
UPDATE Usuarios SET RolID = (SELECT RolID FROM Roles WHERE NombreRol = 'Instructor') WHERE Rol = 'instructor';
UPDATE Usuarios SET RolID = (SELECT RolID FROM Roles WHERE NombreRol = 'SuperAdmin') WHERE Rol IN ('Admin', 'admin', 'administrador');
UPDATE Usuarios SET RolID = (SELECT RolID FROM Roles WHERE NombreRol = 'Instructor') WHERE RolID IS NULL;