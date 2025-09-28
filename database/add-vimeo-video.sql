-- Script para agregar tu video de Vimeo existente a la base de datos
USE StartEducationDB;
GO

PRINT '=== AGREGANDO VIDEO DE VIMEO EXISTENTE ===';
PRINT 'Video ID: 1122531979';
PRINT 'URL: https://vimeo.com/1122531979';
PRINT '';

-- Paso 1: Crear una categoría si no existe
IF NOT EXISTS (SELECT 1 FROM Categorias WHERE nombre = 'Barbería')
BEGIN
    INSERT INTO Categorias (nombre, descripcion) VALUES 
    ('Barbería', 'Cursos especializados en técnicas de barbería y cuidado personal');
    PRINT '✅ Categoría Barbería creada';
END
ELSE
BEGIN
    PRINT '✅ Categoría Barbería ya existe';
END

-- Paso 2: Buscar o crear un usuario instructor
DECLARE @instructor_id INT;
SELECT TOP 1 @instructor_id = id_usuario FROM Usuarios WHERE rol IN ('instructor', 'admin');

IF @instructor_id IS NULL
BEGIN
    PRINT '❌ No se encontró ningún usuario instructor/admin';
    PRINT '   Creando usuario admin temporal...';
    
    INSERT INTO Usuarios (nombre, apellido, nombre_usuario, email, password, rol, estatus) VALUES 
    ('Admin', 'Sistema', 'admin_temp', 'admin@temp.com', 'temp123', 'instructor', 'activo');
    
    SET @instructor_id = SCOPE_IDENTITY();
    PRINT '✅ Usuario instructor temporal creado con ID: ' + CAST(@instructor_id AS VARCHAR);
END
ELSE
BEGIN
    PRINT '✅ Usuario instructor/admin encontrado con ID: ' + CAST(@instructor_id AS VARCHAR);
END

-- Paso 3: Crear curso de prueba
DECLARE @categoria_id INT;
SELECT @categoria_id = id_categoria FROM Categorias WHERE nombre = 'Barbería';

DECLARE @curso_id INT;
IF NOT EXISTS (SELECT 1 FROM Cursos WHERE titulo = 'Curso de Prueba - Videos')
BEGIN
    INSERT INTO Cursos (id_usuario, id_categoria, titulo, descripcion, precio, nivel, estatus) VALUES 
    (@instructor_id, @categoria_id, 'Curso de Prueba - Videos', 
     'Curso creado para probar la funcionalidad de videos con Vimeo', 
     0.00, 'básico', 'publicado');
    
    SET @curso_id = SCOPE_IDENTITY();
    PRINT '✅ Curso de prueba creado con ID: ' + CAST(@curso_id AS VARCHAR);
END
ELSE
BEGIN
    SELECT @curso_id = id_curso FROM Cursos WHERE titulo = 'Curso de Prueba - Videos';
    PRINT '✅ Curso de prueba ya existe con ID: ' + CAST(@curso_id AS VARCHAR);
END

-- Paso 4: Crear módulo de prueba
DECLARE @modulo_id INT;
IF NOT EXISTS (SELECT 1 FROM Modulos WHERE titulo = 'Videos de Prueba' AND id_curso = @curso_id)
BEGIN
    INSERT INTO Modulos (id_curso, titulo, orden) VALUES 
    (@curso_id, 'Videos de Prueba', 1);
    
    SET @modulo_id = SCOPE_IDENTITY();
    PRINT '✅ Módulo de prueba creado con ID: ' + CAST(@modulo_id AS VARCHAR);
END
ELSE
BEGIN
    SELECT @modulo_id = id_modulo FROM Modulos WHERE titulo = 'Videos de Prueba' AND id_curso = @curso_id;
    PRINT '✅ Módulo de prueba ya existe con ID: ' + CAST(@modulo_id AS VARCHAR);
END

-- Paso 5: Registrar el video de Vimeo
IF NOT EXISTS (SELECT 1 FROM Video WHERE url = 'https://vimeo.com/1122531979')
BEGIN
    INSERT INTO Video (
        id_modulo, 
        titulo, 
        descripcion, 
        url, 
        duracion_segundos, 
        orden, 
        estatus, 
        fecha_creacion
    ) VALUES (
        @modulo_id,
        'Video de Prueba Vimeo',
        'Video de testing importado desde Vimeo existente (ID: 1122531979)',
        'https://vimeo.com/1122531979',
        NULL, -- Duración desconocida, se puede actualizar después
        1,
        'publicado',
        GETDATE()
    );
    
    PRINT '✅ Video de Vimeo registrado exitosamente';
    PRINT '   - Título: Video de Prueba Vimeo';
    PRINT '   - URL: https://vimeo.com/1122531979';
    PRINT '   - Estado: publicado';
END
ELSE
BEGIN
    PRINT '⚠️ El video ya está registrado en la base de datos';
END

-- Paso 6: Mostrar resumen
PRINT '';
PRINT '=== RESUMEN FINAL ===';

SELECT 
    'Videos' as Tabla, 
    COUNT(*) as Total_Registros 
FROM Video
UNION ALL
SELECT 
    'Modulos' as Tabla, 
    COUNT(*) as Total_Registros 
FROM Modulos
UNION ALL
SELECT 
    'Cursos' as Tabla, 
    COUNT(*) as Total_Registros 
FROM Cursos;

PRINT '';
PRINT '📹 VIDEO REGISTRADO:';
SELECT 
    v.titulo as 'Título del Video',
    v.url as 'URL de Vimeo',
    v.estatus as 'Estado',
    m.titulo as 'Módulo',
    c.titulo as 'Curso'
FROM Video v
INNER JOIN Modulos m ON v.id_modulo = m.id_modulo
INNER JOIN Cursos c ON m.id_curso = c.id_curso
WHERE v.url = 'https://vimeo.com/1122531979';

PRINT '';
PRINT '🎯 ¡Video listo! Ahora debería aparecer en /videos-admin';
PRINT '🔄 Refresca la página del admin para verlo';
GO