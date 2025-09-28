-- Script para insertar datos de ejemplo en tu base de datos existente
USE StartEducationDB;
GO

-- Primero, vamos a verificar si ya tenemos datos
PRINT '=== VERIFICANDO DATOS EXISTENTES ===';

SELECT 'Usuarios' as Tabla, COUNT(*) as Registros FROM Usuarios
UNION ALL
SELECT 'Categorias' as Tabla, COUNT(*) as Registros FROM Categorias
UNION ALL
SELECT 'Cursos' as Tabla, COUNT(*) as Registros FROM Cursos
UNION ALL
SELECT 'Modulos' as Tabla, COUNT(*) as Registros FROM Modulos
UNION ALL
SELECT 'Video' as Tabla, COUNT(*) as Registros FROM Video;
GO

-- Insertar categorías si no existen
IF NOT EXISTS (SELECT 1 FROM Categorias)
BEGIN
    INSERT INTO Categorias (nombre, descripcion) VALUES 
    ('Barbería', 'Cursos especializados en técnicas de barbería y cuidado personal'),
    ('Peluquería', 'Técnicas de corte y peinado para todo tipo de cabello'),
    ('Estética', 'Cuidado facial y tratamientos de belleza');
    
    PRINT '✅ Categorías insertadas';
END
ELSE
BEGIN
    PRINT '⚠️ Las categorías ya existen';
END
GO

-- Buscar un usuario instructor existente
DECLARE @instructor_id INT;
SELECT TOP 1 @instructor_id = id_usuario FROM Usuarios WHERE rol = 'instructor';

IF @instructor_id IS NULL
BEGIN
    PRINT '❌ No se encontró ningún usuario instructor. Creando uno...';
    
    INSERT INTO Usuarios (nombre, apellido, nombre_usuario, email, password, rol, estatus) VALUES 
    ('Admin', 'Sistema', 'admin', 'admin@starteducation.com', 'admin123', 'instructor', 'activo');
    
    SET @instructor_id = SCOPE_IDENTITY();
    PRINT '✅ Usuario instructor creado con ID: ' + CAST(@instructor_id AS VARCHAR);
END
ELSE
BEGIN
    PRINT '✅ Usuario instructor encontrado con ID: ' + CAST(@instructor_id AS VARCHAR);
END
GO

-- Insertar cursos de ejemplo si no existen
DECLARE @categoria_barberia INT;
SELECT @categoria_barberia = id_categoria FROM Categorias WHERE nombre = 'Barbería';

IF NOT EXISTS (SELECT 1 FROM Cursos)
BEGIN
    DECLARE @instructor_id INT;
    SELECT TOP 1 @instructor_id = id_usuario FROM Usuarios WHERE rol = 'instructor';
    
    INSERT INTO Cursos (id_usuario, id_categoria, titulo, descripcion, precio, nivel, estatus) VALUES 
    (@instructor_id, @categoria_barberia, 'Curso Básico de Barbería', 
     'Aprende las técnicas fundamentales de barbería profesional. Desde el manejo de herramientas hasta los cortes más populares.', 
     99.99, 'básico', 'publicado'),
    (@instructor_id, @categoria_barberia, 'Técnicas Avanzadas de Corte', 
     'Perfecciona tus habilidades con técnicas avanzadas de corte y styling. Incluye degradados complejos y estilos modernos.', 
     149.99, 'intermedio', 'publicado'),
    (@instructor_id, @categoria_barberia, 'Barbería Clásica Tradicional', 
     'Domina las técnicas tradicionales de barbería, incluyendo afeitado con navaja y cuidado de barba.', 
     199.99, 'avanzado', 'publicado');
    
    PRINT '✅ Cursos insertados';
END
ELSE
BEGIN
    PRINT '⚠️ Los cursos ya existen';
END
GO

-- Insertar módulos si no existen
IF NOT EXISTS (SELECT 1 FROM Modulos)
BEGIN
    DECLARE @curso1_id INT, @curso2_id INT, @curso3_id INT;
    
    SELECT @curso1_id = id_curso FROM Cursos WHERE titulo = 'Curso Básico de Barbería';
    SELECT @curso2_id = id_curso FROM Cursos WHERE titulo = 'Técnicas Avanzadas de Corte';
    SELECT @curso3_id = id_curso FROM Cursos WHERE titulo = 'Barbería Clásica Tradicional';
    
    -- Módulos para Curso Básico
    INSERT INTO Modulos (id_curso, titulo, orden) VALUES 
    (@curso1_id, 'Introducción y Herramientas', 1),
    (@curso1_id, 'Técnicas de Corte Básico', 2),
    (@curso1_id, 'Mantenimiento y Limpieza', 3),
    
    -- Módulos para Técnicas Avanzadas
    (@curso2_id, 'Degradados Modernos', 1),
    (@curso2_id, 'Estilos de Temporada', 2),
    (@curso2_id, 'Técnicas de Texturizado', 3),
    
    -- Módulos para Barbería Clásica
    (@curso3_id, 'Historia de la Barbería', 1),
    (@curso3_id, 'Afeitado Tradicional', 2),
    (@curso3_id, 'Cuidado de Barba y Bigote', 3);
    
    PRINT '✅ Módulos insertados';
END
ELSE
BEGIN
    PRINT '⚠️ Los módulos ya existen';
END
GO

-- Insertar videos de ejemplo si no existen
IF NOT EXISTS (SELECT 1 FROM Video)
BEGIN
    DECLARE @modulo_id INT;
    
    -- Videos para el primer módulo
    SELECT TOP 1 @modulo_id = id_modulo FROM Modulos WHERE titulo = 'Introducción y Herramientas';
    
    IF @modulo_id IS NOT NULL
    BEGIN
        INSERT INTO Video (id_modulo, titulo, descripcion, duracion_segundos, orden, estatus) VALUES 
        (@modulo_id, 'Bienvenida al Curso', 'Video de introducción al curso de barbería básica', 300, 1, 'publicado'),
        (@modulo_id, 'Conociendo las Herramientas', 'Explicación detallada de todas las herramientas básicas', 720, 2, 'publicado'),
        (@modulo_id, 'Configuración del Espacio de Trabajo', 'Cómo organizar tu estación de barbería', 480, 3, 'borrador');
        
        PRINT '✅ Videos de ejemplo insertados';
    END
    
    -- Videos para técnicas básicas
    SELECT TOP 1 @modulo_id = id_modulo FROM Modulos WHERE titulo = 'Técnicas de Corte Básico';
    
    IF @modulo_id IS NOT NULL
    BEGIN
        INSERT INTO Video (id_modulo, titulo, descripcion, duracion_segundos, orden, estatus) VALUES 
        (@modulo_id, 'Primer Corte: Técnica Básica', 'Aprende tu primer corte profesional paso a paso', 1500, 1, 'publicado'),
        (@modulo_id, 'Uso de Tijeras vs Máquina', 'Cuándo usar cada herramienta correctamente', 900, 2, 'publicado'),
        (@modulo_id, 'Práctica Supervisada', 'Ejercicios prácticos con retroalimentación', 1800, 3, 'borrador');
        
        PRINT '✅ Videos de técnicas básicas insertados';
    END
END
ELSE
BEGIN
    PRINT '⚠️ Los videos ya existen';
END
GO

-- Mostrar resumen final
PRINT '';
PRINT '=== RESUMEN FINAL ===';
SELECT 'Usuarios' as Tabla, COUNT(*) as Registros FROM Usuarios
UNION ALL
SELECT 'Categorias' as Tabla, COUNT(*) as Registros FROM Categorias
UNION ALL
SELECT 'Cursos' as Tabla, COUNT(*) as Registros FROM Cursos
UNION ALL
SELECT 'Modulos' as Tabla, COUNT(*) as Registros FROM Modulos
UNION ALL
SELECT 'Video' as Tabla, COUNT(*) as Registros FROM Video;

PRINT '';
PRINT '📹 VIDEOS DISPONIBLES:';
SELECT 
    v.titulo as Video,
    m.titulo as Modulo,
    c.titulo as Curso,
    v.estatus,
    v.duracion_segundos / 60 as duracion_minutos
FROM Video v
INNER JOIN Modulos m ON v.id_modulo = m.id_modulo
INNER JOIN Cursos c ON m.id_curso = c.id_curso
ORDER BY c.titulo, m.orden, v.orden;

PRINT '';
PRINT '🎯 LISTO PARA PROBAR EL SISTEMA DE VIDEOS!';