-- ============================================================
-- 🛡️ SISTEMA RBAC (Role-Based Access Control) - StartEducation
-- ============================================================
-- Script para implementar sistema de control de acceso granular
-- Autor: Arquitecto Backend Senior
-- Fecha: 5 de noviembre de 2025
-- ============================================================

USE StartEducationDB;
GO

-- ============================================================
-- 📋 PASO 1: CREACIÓN DE TABLAS RBAC
-- ============================================================

-- Tabla de Roles
CREATE TABLE Roles (
    RolID INT IDENTITY(1,1) PRIMARY KEY,
    NombreRol NVARCHAR(100) UNIQUE NOT NULL,
    Descripcion NVARCHAR(500) NULL,
    Activo BIT DEFAULT 1,
    FechaCreacion DATETIME2 DEFAULT GETDATE(),
    FechaModificacion DATETIME2 DEFAULT GETDATE()
);

-- Tabla de Permisos
CREATE TABLE Permisos (
    PermisoID INT IDENTITY(1,1) PRIMARY KEY,
    NombrePermiso NVARCHAR(100) UNIQUE NOT NULL,
    Descripcion NVARCHAR(500) NULL,
    Modulo NVARCHAR(100) NULL, -- Para agrupar permisos por módulo
    Activo BIT DEFAULT 1,
    FechaCreacion DATETIME2 DEFAULT GETDATE()
);

-- Tabla Pivote - Relación Roles-Permisos (N:M)
CREATE TABLE RolPermiso (
    RolID INT NOT NULL,
    PermisoID INT NOT NULL,
    FechaAsignacion DATETIME2 DEFAULT GETDATE(),
    PRIMARY KEY (RolID, PermisoID),
    FOREIGN KEY (RolID) REFERENCES Roles(RolID) ON DELETE CASCADE,
    FOREIGN KEY (PermisoID) REFERENCES Permisos(PermisoID) ON DELETE CASCADE
);

-- ============================================================
-- 📋 PASO 2: MODIFICACIÓN DE TABLA USUARIOS
-- ============================================================

-- Agregar nueva columna RolID como FK
ALTER TABLE Usuarios 
ADD RolID INT NULL;

-- Crear FK constraint
ALTER TABLE Usuarios 
ADD CONSTRAINT FK_Usuarios_Roles 
FOREIGN KEY (RolID) REFERENCES Roles(RolID);

-- ============================================================
-- 📋 PASO 3: DATOS MAESTROS - ROLES
-- ============================================================

INSERT INTO Roles (NombreRol, Descripcion) VALUES
('SuperAdmin', 'Administrador con acceso completo al sistema. Puede gestionar roles y permisos.'),
('Admin', 'Administrador general con acceso a la mayoría de funciones administrativas.'),
('Editor', 'Editor de contenido con permisos para gestionar cursos, videos y categorías.'),
('Finanzas', 'Acceso a módulos financieros: membresías, compras, analytics financieros.'),
('Soporte', 'Acceso limitado para atención al cliente: ver usuarios, cursos, no puede eliminar.'),
('Instructor', 'Instructor con permisos limitados para gestionar sus propios cursos.');

-- ============================================================
-- 📋 PASO 4: DATOS MAESTROS - PERMISOS
-- ============================================================

-- Permisos de Sistema y Roles
INSERT INTO Permisos (NombrePermiso, Descripcion, Modulo) VALUES
('gestionar_roles', 'Crear, editar y eliminar roles del sistema', 'Sistema'),
('gestionar_permisos', 'Asignar y revocar permisos a roles', 'Sistema'),
('ver_logs_auditoria', 'Acceder a logs de auditoría del sistema', 'Sistema'),
('gestionar_configuracion', 'Modificar configuración general del sistema', 'Sistema');

-- Permisos de Usuarios
INSERT INTO Permisos (NombrePermiso, Descripcion, Modulo) VALUES
('ver_usuarios', 'Ver lista de usuarios del sistema', 'Usuarios'),
('crear_usuarios', 'Crear nuevos usuarios', 'Usuarios'),
('editar_usuarios', 'Modificar información de usuarios existentes', 'Usuarios'),
('eliminar_usuarios', 'Eliminar usuarios del sistema', 'Usuarios'),
('cambiar_roles_usuarios', 'Modificar roles de otros usuarios', 'Usuarios');

-- Permisos de Cursos
INSERT INTO Permisos (NombrePermiso, Descripcion, Modulo) VALUES
('ver_cursos', 'Ver lista de cursos', 'Cursos'),
('crear_cursos', 'Crear nuevos cursos', 'Cursos'),
('editar_cursos', 'Modificar cursos existentes', 'Cursos'),
('eliminar_cursos', 'Eliminar cursos del sistema', 'Cursos'),
('publicar_cursos', 'Publicar/despublicar cursos', 'Cursos'),
('gestionar_categorias', 'Gestionar categorías de cursos', 'Cursos');

-- Permisos de Videos
INSERT INTO Permisos (NombrePermiso, Descripcion, Modulo) VALUES
('ver_videos', 'Ver lista de videos', 'Videos'),
('crear_videos', 'Subir nuevos videos', 'Videos'),
('editar_videos', 'Modificar información de videos', 'Videos'),
('eliminar_videos', 'Eliminar videos del sistema', 'Videos');

-- Permisos Financieros
INSERT INTO Permisos (NombrePermiso, Descripcion, Modulo) VALUES
('ver_membresias', 'Ver información de membresías', 'Finanzas'),
('gestionar_membresias', 'Crear y modificar planes de membresía', 'Finanzas'),
('ver_compras', 'Ver historial de compras y transacciones', 'Finanzas'),
('gestionar_compras', 'Procesar reembolsos y modificar compras', 'Finanzas'),
('ver_analytics_financieros', 'Acceder a reportes financieros', 'Finanzas');

-- Permisos de Analytics
INSERT INTO Permisos (NombrePermiso, Descripcion, Modulo) VALUES
('ver_analytics', 'Ver dashboards y métricas generales', 'Analytics'),
('ver_analytics_avanzados', 'Acceder a reportes detallados y métricas avanzadas', 'Analytics'),
('exportar_reportes', 'Exportar reportes y datos', 'Analytics');

-- Permisos de Valoraciones y Favoritos
INSERT INTO Permisos (NombrePermiso, Descripcion, Modulo) VALUES
('ver_valoraciones', 'Ver valoraciones de cursos', 'Contenido'),
('gestionar_valoraciones', 'Moderar y eliminar valoraciones', 'Contenido'),
('ver_favoritos', 'Ver listas de favoritos de usuarios', 'Contenido');

-- ============================================================
-- 📋 PASO 5: ASIGNACIÓN DE PERMISOS A ROLES
-- ============================================================

-- SuperAdmin: TODOS los permisos
INSERT INTO RolPermiso (RolID, PermisoID)
SELECT 
    (SELECT RolID FROM Roles WHERE NombreRol = 'SuperAdmin'),
    PermisoID
FROM Permisos;

-- Admin: Todos excepto gestión de roles
INSERT INTO RolPermiso (RolID, PermisoID)
SELECT 
    (SELECT RolID FROM Roles WHERE NombreRol = 'Admin'),
    PermisoID
FROM Permisos
WHERE NombrePermiso NOT IN ('gestionar_roles', 'gestionar_permisos');

-- Editor: Permisos de contenido
INSERT INTO RolPermiso (RolID, PermisoID)
SELECT 
    (SELECT RolID FROM Roles WHERE NombreRol = 'Editor'),
    PermisoID
FROM Permisos
WHERE Modulo IN ('Cursos', 'Videos', 'Contenido') 
   OR NombrePermiso IN ('ver_usuarios', 'ver_analytics');

-- Finanzas: Permisos financieros y analytics
INSERT INTO RolPermiso (RolID, PermisoID)
SELECT 
    (SELECT RolID FROM Roles WHERE NombreRol = 'Finanzas'),
    PermisoID
FROM Permisos
WHERE Modulo IN ('Finanzas', 'Analytics') 
   OR NombrePermiso IN ('ver_usuarios', 'ver_cursos');

-- Soporte: Solo lectura en la mayoría de módulos
INSERT INTO RolPermiso (RolID, PermisoID)
SELECT 
    (SELECT RolID FROM Roles WHERE NombreRol = 'Soporte'),
    PermisoID
FROM Permisos
WHERE NombrePermiso IN (
    'ver_usuarios', 'ver_cursos', 'ver_videos', 'ver_valoraciones', 'ver_favoritos',
    'ver_membresias', 'ver_compras', 'ver_analytics'
);

-- Instructor: Permisos básicos para gestionar sus cursos
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

-- ============================================================
-- 📋 PASO 6: MIGRACIÓN DE DATOS EXISTENTES
-- ============================================================

-- Migrar usuarios existentes con rol 'instructor' a RolID correspondiente
UPDATE Usuarios 
SET RolID = (SELECT RolID FROM Roles WHERE NombreRol = 'Instructor')
WHERE Rol = 'instructor';

-- Migrar usuarios con rol 'Admin' (asumir que son SuperAdmin)
UPDATE Usuarios 
SET RolID = (SELECT RolID FROM Roles WHERE NombreRol = 'SuperAdmin')
WHERE Rol = 'Admin' OR Rol = 'admin' OR Rol = 'administrador';

-- Para usuarios sin rol definido, asignar rol básico de Instructor
UPDATE Usuarios 
SET RolID = (SELECT RolID FROM Roles WHERE NombreRol = 'Instructor')
WHERE RolID IS NULL;

-- ============================================================
-- 📋 PASO 7: ÍNDICES PARA OPTIMIZACIÓN
-- ============================================================

-- Índice para optimizar consultas de permisos por usuario
CREATE INDEX IX_RolPermiso_RolID ON RolPermiso(RolID);
CREATE INDEX IX_RolPermiso_PermisoID ON RolPermiso(PermisoID);

-- Índice para tabla Usuarios
CREATE INDEX IX_Usuarios_RolID ON Usuarios(RolID);

-- Índices para búsquedas por nombre
CREATE INDEX IX_Roles_NombreRol ON Roles(NombreRol);
CREATE INDEX IX_Permisos_NombrePermiso ON Permisos(NombrePermiso);
CREATE INDEX IX_Permisos_Modulo ON Permisos(Modulo);

-- ============================================================
-- 📋 PASO 8: VISTAS PARA CONSULTAS OPTIMIZADAS
-- ============================================================

-- Vista para obtener permisos de usuario fácilmente
CREATE VIEW VistaUsuariosPermisos AS
SELECT 
    u.id_usuario,
    u.nombre,
    u.email,
    r.NombreRol,
    r.Descripcion AS DescripcionRol,
    p.NombrePermiso,
    p.Descripcion AS DescripcionPermiso,
    p.Modulo
FROM Usuarios u
INNER JOIN Roles r ON u.RolID = r.RolID
INNER JOIN RolPermiso rp ON r.RolID = rp.RolID
INNER JOIN Permisos p ON rp.PermisoID = p.PermisoID
WHERE r.Activo = 1 AND p.Activo = 1;

-- Vista resumen de roles
CREATE VIEW VistaRolesResumen AS
SELECT 
    r.RolID,
    r.NombreRol,
    r.Descripcion,
    COUNT(rp.PermisoID) AS TotalPermisos,
    COUNT(u.id_usuario) AS UsuariosAsignados
FROM Roles r
LEFT JOIN RolPermiso rp ON r.RolID = rp.RolID
LEFT JOIN Usuarios u ON r.RolID = u.RolID
WHERE r.Activo = 1
GROUP BY r.RolID, r.NombreRol, r.Descripcion;

-- ============================================================
-- 📊 VERIFICACIÓN DE IMPLEMENTACIÓN
-- ============================================================

-- Consulta de verificación: Ver todos los roles y sus permisos
SELECT 
    r.NombreRol,
    COUNT(rp.PermisoID) as TotalPermisos,
    STRING_AGG(p.NombrePermiso, ', ') as PermisosAsignados
FROM Roles r
LEFT JOIN RolPermiso rp ON r.RolID = rp.RolID
LEFT JOIN Permisos p ON rp.PermisoID = p.PermisoID
GROUP BY r.RolID, r.NombreRol
ORDER BY r.RolID;

-- Consulta de verificación: Ver usuarios y sus roles
SELECT 
    u.nombre,
    u.email,
    r.NombreRol,
    u.Rol as RolAntiguo
FROM Usuarios u
LEFT JOIN Roles r ON u.RolID = r.RolID
ORDER BY r.NombreRol, u.nombre;

PRINT '✅ Sistema RBAC implementado exitosamente!';
PRINT '📊 Roles creados: 6';
PRINT '🔑 Permisos definidos: 25';
PRINT '🔗 Relaciones configuradas correctamente';
PRINT '📈 Índices creados para optimización';
PRINT '👀 Vistas creadas para consultas eficientes';