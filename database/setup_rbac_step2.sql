-- Insertar Permisos de Sistema
INSERT INTO Permisos (NombrePermiso, Descripcion, Modulo) VALUES
('gestionar_roles', 'Crear, editar y eliminar roles del sistema', 'Sistema'),
('gestionar_permisos', 'Asignar y revocar permisos a roles', 'Sistema'),
('ver_logs_auditoria', 'Acceder a logs de auditoría del sistema', 'Sistema'),
('gestionar_configuracion', 'Modificar configuración general del sistema', 'Sistema');

-- Insertar Permisos de Usuarios
INSERT INTO Permisos (NombrePermiso, Descripcion, Modulo) VALUES
('ver_usuarios', 'Ver lista de usuarios del sistema', 'Usuarios'),
('crear_usuarios', 'Crear nuevos usuarios', 'Usuarios'),
('editar_usuarios', 'Modificar información de usuarios existentes', 'Usuarios'),
('eliminar_usuarios', 'Eliminar usuarios del sistema', 'Usuarios'),
('cambiar_roles_usuarios', 'Modificar roles de otros usuarios', 'Usuarios');

-- Insertar Permisos de Cursos
INSERT INTO Permisos (NombrePermiso, Descripcion, Modulo) VALUES
('ver_cursos', 'Ver lista de cursos', 'Cursos'),
('crear_cursos', 'Crear nuevos cursos', 'Cursos'),
('editar_cursos', 'Modificar cursos existentes', 'Cursos'),
('eliminar_cursos', 'Eliminar cursos del sistema', 'Cursos'),
('publicar_cursos', 'Publicar/despublicar cursos', 'Cursos'),
('gestionar_categorias', 'Gestionar categorías de cursos', 'Cursos');

-- Insertar Permisos de Videos
INSERT INTO Permisos (NombrePermiso, Descripcion, Modulo) VALUES
('ver_videos', 'Ver lista de videos', 'Videos'),
('crear_videos', 'Subir nuevos videos', 'Videos'),
('editar_videos', 'Modificar información de videos', 'Videos'),
('eliminar_videos', 'Eliminar videos del sistema', 'Videos');

-- Insertar Permisos Financieros
INSERT INTO Permisos (NombrePermiso, Descripcion, Modulo) VALUES
('ver_membresias', 'Ver información de membresías', 'Finanzas'),
('gestionar_membresias', 'Crear y modificar planes de membresía', 'Finanzas'),
('ver_compras', 'Ver historial de compras y transacciones', 'Finanzas'),
('gestionar_compras', 'Procesar reembolsos y modificar compras', 'Finanzas'),
('ver_analytics_financieros', 'Acceder a reportes financieros', 'Finanzas');

-- Insertar Permisos de Analytics
INSERT INTO Permisos (NombrePermiso, Descripcion, Modulo) VALUES
('ver_analytics', 'Ver dashboards y métricas generales', 'Analytics'),
('ver_analytics_avanzados', 'Acceder a reportes detallados y métricas avanzadas', 'Analytics'),
('exportar_reportes', 'Exportar reportes y datos', 'Analytics');

-- Insertar Permisos de Contenido
INSERT INTO Permisos (NombrePermiso, Descripcion, Modulo) VALUES
('ver_valoraciones', 'Ver valoraciones de cursos', 'Contenido'),
('gestionar_valoraciones', 'Moderar y eliminar valoraciones', 'Contenido'),
('ver_favoritos', 'Ver listas de favoritos de usuarios', 'Contenido');