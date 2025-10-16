-- ========================================
-- DATOS DE PRUEBA PARA HISTORIAL DE PAGOS
-- ========================================

-- Insertar usuarios de prueba si no existen
INSERT INTO Usuarios (nombre, apellido, email, nombre_usuario, contraseña_hash, rol, fecha_registro)
SELECT * FROM (
    SELECT 'María', 'González', 'maria.gonzalez@email.com', 'maria_gonzalez', '$2b$10$dummy', 'estudiante', GETDATE() - 45
    UNION ALL
    SELECT 'Carlos', 'Rodriguez', 'carlos.rodriguez@email.com', 'carlos_rodriguez', '$2b$10$dummy', 'estudiante', GETDATE() - 30
    UNION ALL
    SELECT 'Ana', 'López', 'ana.lopez@email.com', 'ana_lopez', '$2b$10$dummy', 'estudiante', GETDATE() - 60
    UNION ALL
    SELECT 'Juan', 'Martínez', 'juan.martinez@email.com', 'juan_martinez', '$2b$10$dummy', 'estudiante', GETDATE() - 20
    UNION ALL
    SELECT 'Laura', 'Sánchez', 'laura.sanchez@email.com', 'laura_sanchez', '$2b$10$dummy', 'estudiante', GETDATE() - 15
    UNION ALL
    SELECT 'Pedro', 'García', 'pedro.garcia@email.com', 'pedro_garcia', '$2b$10$dummy', 'estudiante', GETDATE() - 90
    UNION ALL
    SELECT 'Isabel', 'Herrera', 'isabel.herrera@email.com', 'isabel_herrera', '$2b$10$dummy', 'estudiante', GETDATE() - 5
    UNION ALL
    SELECT 'Diego', 'Torres', 'diego.torres@email.com', 'diego_torres', '$2b$10$dummy', 'estudiante', GETDATE() - 75
) AS tmp
WHERE NOT EXISTS (
    SELECT 1 FROM Usuarios WHERE email = tmp.email
);

-- Insertar cursos de prueba si no existen
INSERT INTO Cursos (titulo, descripcion, precio, estatus, fecha_creacion, id_instructor)
SELECT * FROM (
    SELECT 'JavaScript Completo', 'Curso completo de JavaScript desde cero', 299.00, 'publicado', GETDATE() - 40, 1
    UNION ALL
    SELECT 'React para Principiantes', 'Aprende React desde los fundamentos', 399.00, 'publicado', GETDATE() - 35, 1
    UNION ALL
    SELECT 'Node.js Avanzado', 'Desarrollo backend con Node.js', 499.00, 'publicado', GETDATE() - 25, 1
    UNION ALL
    SELECT 'Python Data Science', 'Análisis de datos con Python', 599.00, 'publicado', GETDATE() - 50, 1
    UNION ALL
    SELECT 'SQL y Bases de Datos', 'Domina SQL Server y MySQL', 349.00, 'publicado', GETDATE() - 30, 1
) AS tmp
WHERE NOT EXISTS (
    SELECT 1 FROM Cursos WHERE titulo = tmp.titulo
);

-- Insertar membresías de prueba si no existen
INSERT INTO Membresias (nombre, descripcion, precio, duracion_dias, beneficios)
SELECT * FROM (
    SELECT 'Premium Monthly', 'Acceso completo por 30 días', 99.00, 30, 'Acceso a todos los cursos, descargas, certificados'
    UNION ALL
    SELECT 'Premium Quarterly', 'Acceso completo por 90 días', 249.00, 90, 'Acceso a todos los cursos, descargas, certificados, soporte prioritario'
    UNION ALL
    SELECT 'Premium Annual', 'Acceso completo por 365 días', 899.00, 365, 'Acceso a todos los cursos, descargas, certificados, soporte 24/7, sesiones 1:1'
) AS tmp
WHERE NOT EXISTS (
    SELECT 1 FROM Membresias WHERE nombre = tmp.nombre
);

-- Insertar compras de prueba (últimos 3 meses)
DECLARE @usuario_maria INT = (SELECT id_usuario FROM Usuarios WHERE email = 'maria.gonzalez@email.com');
DECLARE @usuario_carlos INT = (SELECT id_usuario FROM Usuarios WHERE email = 'carlos.rodriguez@email.com');
DECLARE @usuario_ana INT = (SELECT id_usuario FROM Usuarios WHERE email = 'ana.lopez@email.com');
DECLARE @usuario_juan INT = (SELECT id_usuario FROM Usuarios WHERE email = 'juan.martinez@email.com');
DECLARE @usuario_laura INT = (SELECT id_usuario FROM Usuarios WHERE email = 'laura.sanchez@email.com');
DECLARE @usuario_pedro INT = (SELECT id_usuario FROM Usuarios WHERE email = 'pedro.garcia@email.com');
DECLARE @usuario_isabel INT = (SELECT id_usuario FROM Usuarios WHERE email = 'isabel.herrera@email.com');
DECLARE @usuario_diego INT = (SELECT id_usuario FROM Usuarios WHERE email = 'diego.torres@email.com');

DECLARE @curso_js INT = (SELECT id_curso FROM Cursos WHERE titulo = 'JavaScript Completo');
DECLARE @curso_react INT = (SELECT id_curso FROM Cursos WHERE titulo = 'React para Principiantes');
DECLARE @curso_node INT = (SELECT id_curso FROM Cursos WHERE titulo = 'Node.js Avanzado');
DECLARE @curso_python INT = (SELECT id_curso FROM Cursos WHERE titulo = 'Python Data Science');
DECLARE @curso_sql INT = (SELECT id_curso FROM Cursos WHERE titulo = 'SQL y Bases de Datos');

-- Compras individuales de cursos
INSERT INTO Compras (id_usuario, id_curso, monto, descripcion, metodo_pago, fecha_compra)
VALUES 
    -- Compras recientes (últimos 15 días)
    (@usuario_maria, @curso_js, 299.00, 'Compra curso JavaScript Completo', 'Tarjeta de Crédito', GETDATE() - 5),
    (@usuario_carlos, @curso_react, 399.00, 'Compra curso React para Principiantes', 'PayPal', GETDATE() - 3),
    (@usuario_laura, @curso_python, 599.00, 'Compra curso Python Data Science', 'Tarjeta de Débito', GETDATE() - 2),
    (@usuario_isabel, @curso_sql, 349.00, 'Compra curso SQL y Bases de Datos', 'Transferencia', GETDATE() - 1),
    
    -- Compras del mes pasado
    (@usuario_ana, @curso_js, 299.00, 'Compra curso JavaScript Completo', 'Tarjeta de Crédito', GETDATE() - 25),
    (@usuario_juan, @curso_node, 499.00, 'Compra curso Node.js Avanzado', 'PayPal', GETDATE() - 20),
    (@usuario_pedro, @curso_react, 399.00, 'Compra curso React para Principiantes', 'Tarjeta de Crédito', GETDATE() - 35),
    (@usuario_diego, @curso_python, 599.00, 'Compra curso Python Data Science', 'Stripe', GETDATE() - 30),
    
    -- Compras más antiguas (hace 2-3 meses)
    (@usuario_maria, @curso_react, 399.00, 'Compra curso React para Principiantes', 'Tarjeta de Crédito', GETDATE() - 60),
    (@usuario_carlos, @curso_sql, 349.00, 'Compra curso SQL y Bases de Datos', 'PayPal', GETDATE() - 65),
    (@usuario_ana, @curso_node, 499.00, 'Compra curso Node.js Avanzado', 'Tarjeta de Débito', GETDATE() - 70),
    (@usuario_juan, @curso_python, 599.00, 'Compra curso Python Data Science', 'Transferencia', GETDATE() - 80),
    (@usuario_pedro, @curso_js, 299.00, 'Compra curso JavaScript Completo', 'Tarjeta de Crédito', GETDATE() - 85),
    (@usuario_diego, @curso_sql, 349.00, 'Compra curso SQL y Bases de Datos', 'Stripe', GETDATE() - 90);

-- Obtener IDs de membresías
DECLARE @membresia_monthly INT = (SELECT id_membresia FROM Membresias WHERE nombre = 'Premium Monthly');
DECLARE @membresia_quarterly INT = (SELECT id_membresia FROM Membresias WHERE nombre = 'Premium Quarterly');
DECLARE @membresia_annual INT = (SELECT id_membresia FROM Membresias WHERE nombre = 'Premium Annual');

-- Insertar suscripciones con diferentes estados
INSERT INTO Suscripciones (id_usuario, id_membresia, fecha_compra, fecha_vencimiento, estatus)
VALUES 
    -- Suscripciones activas
    (@usuario_maria, @membresia_monthly, GETDATE() - 10, GETDATE() + 20, 'activa'),
    (@usuario_carlos, @membresia_quarterly, GETDATE() - 20, GETDATE() + 70, 'activa'),
    (@usuario_laura, @membresia_annual, GETDATE() - 30, GETDATE() + 335, 'activa'),
    (@usuario_isabel, @membresia_monthly, GETDATE() - 5, GETDATE() + 25, 'activa'),
    
    -- Suscripciones que van a expirar pronto
    (@usuario_ana, @membresia_monthly, GETDATE() - 25, GETDATE() + 5, 'activa'),
    (@usuario_juan, @membresia_quarterly, GETDATE() - 85, GETDATE() + 5, 'activa'),
    
    -- Suscripciones expiradas
    (@usuario_pedro, @membresia_monthly, GETDATE() - 60, GETDATE() - 30, 'expirada'),
    (@usuario_diego, @membresia_quarterly, GETDATE() - 120, GETDATE() - 30, 'expirada'),
    
    -- Suscripciones canceladas
    (@usuario_maria, @membresia_quarterly, GETDATE() - 150, GETDATE() - 60, 'cancelada'),
    (@usuario_carlos, @membresia_monthly, GETDATE() - 100, GETDATE() - 70, 'cancelada'),
    
    -- Más suscripciones activas para variedad
    (@usuario_ana, @membresia_quarterly, GETDATE() - 15, GETDATE() + 75, 'activa'),
    (@usuario_pedro, @membresia_annual, GETDATE() - 45, GETDATE() + 320, 'activa');

-- Mostrar resumen de datos insertados
PRINT '===== RESUMEN DE DATOS INSERTADOS =====';
PRINT 'Usuarios: ' + CAST((SELECT COUNT(*) FROM Usuarios WHERE email LIKE '%@email.com') AS VARCHAR);
PRINT 'Cursos: ' + CAST((SELECT COUNT(*) FROM Cursos WHERE titulo IN ('JavaScript Completo', 'React para Principiantes', 'Node.js Avanzado', 'Python Data Science', 'SQL y Bases de Datos')) AS VARCHAR);
PRINT 'Membresías: ' + CAST((SELECT COUNT(*) FROM Membresias WHERE nombre LIKE 'Premium%') AS VARCHAR);
PRINT 'Compras: ' + CAST((SELECT COUNT(*) FROM Compras WHERE id_usuario IN (SELECT id_usuario FROM Usuarios WHERE email LIKE '%@email.com')) AS VARCHAR);
PRINT 'Suscripciones: ' + CAST((SELECT COUNT(*) FROM Suscripciones WHERE id_usuario IN (SELECT id_usuario FROM Usuarios WHERE email LIKE '%@email.com')) AS VARCHAR);

-- Mostrar estadísticas por estado de suscripciones
SELECT 
    estatus,
    COUNT(*) as cantidad,
    SUM(m.precio) as total_ingresos
FROM Suscripciones s
INNER JOIN Membresias m ON s.id_membresia = m.id_membresia
WHERE s.id_usuario IN (SELECT id_usuario FROM Usuarios WHERE email LIKE '%@email.com')
GROUP BY estatus;

-- Mostrar total de ingresos por tipo
SELECT 
    'Compras Individuales' as tipo,
    COUNT(*) as cantidad,
    SUM(monto) as total_ingresos
FROM Compras 
WHERE id_usuario IN (SELECT id_usuario FROM Usuarios WHERE email LIKE '%@email.com')
UNION ALL
SELECT 
    'Suscripciones' as tipo,
    COUNT(*) as cantidad,
    SUM(m.precio) as total_ingresos
FROM Suscripciones s
INNER JOIN Membresias m ON s.id_membresia = m.id_membresia
WHERE s.id_usuario IN (SELECT id_usuario FROM Usuarios WHERE email LIKE '%@email.com');

PRINT '===== DATOS DE PRUEBA INSERTADOS EXITOSAMENTE =====';