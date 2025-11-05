-- Asignación directa de permisos sin problemas de QUOTED_IDENTIFIER
USE StartEducationDB;

-- Limpiar asignaciones existentes para estos roles
DELETE FROM RolPermiso WHERE RolID IN (2,3,4,5,6);

-- 2. ADMIN - La mayoría de permisos excepto los más críticos
INSERT INTO RolPermiso (RolID, PermisoID) VALUES
-- Usuarios (sin eliminar)
(2, 1), -- ver_usuarios
(2, 2), -- crear_usuarios  
(2, 3), -- editar_usuarios
(2, 5), -- cambiar_estado_usuarios

-- Cursos (todos)
(2, 6), -- gestionar_cursos
(2, 7), -- crear_cursos
(2, 8), -- editar_cursos
(2, 9), -- eliminar_cursos
(2, 10), -- publicar_cursos
(2, 11), -- cambiar_estado_cursos

-- Videos (todos)
(2, 12), -- gestionar_videos
(2, 13), -- subir_videos
(2, 14), -- editar_videos
(2, 15), -- eliminar_videos

-- Contenido (todos)
(2, 16), -- gestionar_contenido
(2, 17), -- crear_categorias
(2, 18), -- editar_categorias

-- Analytics (todos)
(2, 19), -- ver_analytics
(2, 20), -- generar_reportes
(2, 21), -- exportar_datos

-- Finanzas (sin configurar pagos)
(2, 22), -- ver_finanzas
(2, 23), -- gestionar_suscripciones
(2, 24), -- ver_pagos
(2, 25); -- generar_reportes_financieros

-- 3. EDITOR - Solo contenido y cursos
INSERT INTO RolPermiso (RolID, PermisoID) VALUES
-- Cursos (sin eliminar)
(3, 6), -- gestionar_cursos
(3, 7), -- crear_cursos
(3, 8), -- editar_cursos
(3, 10), -- publicar_cursos

-- Videos (sin eliminar)
(3, 12), -- gestionar_videos
(3, 13), -- subir_videos
(3, 14), -- editar_videos

-- Contenido (todos)
(3, 16), -- gestionar_contenido
(3, 17), -- crear_categorias
(3, 18); -- editar_categorias

-- 4. FINANZAS - Solo módulos financieros
INSERT INTO RolPermiso (RolID, PermisoID) VALUES
-- Finanzas (todos)
(4, 22), -- ver_finanzas
(4, 23), -- gestionar_suscripciones
(4, 24), -- ver_pagos
(4, 25), -- generar_reportes_financieros
(4, 26), -- configurar_pagos

-- Analytics financieros
(4, 19), -- ver_analytics
(4, 20); -- generar_reportes

-- 5. SOPORTE - Acceso limitado de solo lectura
INSERT INTO RolPermiso (RolID, PermisoID) VALUES
-- Usuarios (solo ver)
(5, 1), -- ver_usuarios

-- Analytics básico
(5, 19), -- ver_analytics

-- Finanzas (solo ver)
(5, 24); -- ver_pagos

-- 6. INSTRUCTOR - Permisos básicos para su contenido
INSERT INTO RolPermiso (RolID, PermisoID) VALUES
-- Cursos (crear y editar solo)
(6, 7), -- crear_cursos
(6, 8), -- editar_cursos

-- Videos (crear y editar)
(6, 13), -- subir_videos
(6, 14); -- editar_videos

PRINT 'Permisos asignados correctamente a todos los roles';

-- Verificar asignaciones
SELECT 
    r.NombreRol,
    COUNT(rp.PermisoID) as PermisosAsignados
FROM Roles r
LEFT JOIN RolPermiso rp ON r.RolID = rp.RolID
GROUP BY r.RolID, r.NombreRol
ORDER BY r.RolID;