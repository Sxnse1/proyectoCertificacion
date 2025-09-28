-- =====================================================================================
-- Script para agregar tu video de Vimeo existente a la base de datos
-- Ejecuta este código completo en SQL Server Management Studio
-- Video: https://vimeo.com/1122531979
-- =====================================================================================

USE StartEducationDB;
GO

PRINT '🎬 ===== AGREGANDO VIDEO DE VIMEO EXISTENTE =====';
PRINT 'Video ID: 1122531979';
PRINT 'URL: https://vimeo.com/1122531979';
PRINT 'Fecha: ' + CONVERT(VARCHAR, GETDATE(), 120);
PRINT '';

-- =====================================================================================
-- PASO 1: Crear categoría "Barbería" si no existe
-- =====================================================================================
PRINT '📂 Paso 1: Verificando/Creando categoría...';

IF NOT EXISTS (SELECT 1 FROM Categorias WHERE nombre = 'Barbería')
BEGIN
    INSERT INTO Categorias (nombre, descripcion) VALUES 
    ('Barbería', 'Cursos especializados en técnicas de barbería y cuidado personal');
    PRINT '   ✅ Categoría "Barbería" creada exitosamente';
END
ELSE
BEGIN
    PRINT '   ✅ Categoría "Barbería" ya existe';
END

-- =====================================================================================
-- PASO 2: Buscar o crear usuario instructor
-- =====================================================================================
PRINT '';
PRINT '👤 Paso 2: Verificando usuario instructor...';

DECLARE @instructor_id INT;
SELECT TOP 1 @instructor_id = id_usuario 
FROM Usuarios 
WHERE rol IN ('instructor', 'admin') 
ORDER BY fecha_registro ASC;

IF @instructor_id IS NULL
BEGIN
    PRINT '   ⚠️ No se encontró usuario instructor/admin';
    PRINT '   ✅ Creando usuario instructor temporal...';
    
    INSERT INTO Usuarios (nombre, apellido, nombre_usuario, email, password, rol, estatus) VALUES 
    ('Admin', 'Sistema', 'admin_sistema', 'admin@sistema.com', 'temp123', 'instructor', 'activo');
    
    SET @instructor_id = SCOPE_IDENTITY();
    PRINT '   ✅ Usuario instructor creado con ID: ' + CAST(@instructor_id AS VARCHAR);
END
ELSE
BEGIN
    DECLARE @instructor_nombre VARCHAR(300);
    SELECT @instructor_nombre = nombre + ' ' + apellido + ' (' + email + ')'
    FROM Usuarios WHERE id_usuario = @instructor_id;
    
    PRINT '   ✅ Usuario instructor encontrado: ' + @instructor_nombre;
    PRINT '   ✅ ID: ' + CAST(@instructor_id AS VARCHAR);
END

-- =====================================================================================
-- PASO 3: Crear curso de prueba
-- =====================================================================================
PRINT '';
PRINT '📚 Paso 3: Verificando/Creando curso...';

DECLARE @categoria_id INT;
SELECT @categoria_id = id_categoria FROM Categorias WHERE nombre = 'Barbería';

DECLARE @curso_id INT;
IF NOT EXISTS (SELECT 1 FROM Cursos WHERE titulo = 'Curso de Prueba - Videos Vimeo')
BEGIN
    INSERT INTO Cursos (id_usuario, id_categoria, titulo, descripcion, precio, nivel, estatus) VALUES 
    (@instructor_id, @categoria_id, 'Curso de Prueba - Videos Vimeo', 
     'Curso creado para probar la funcionalidad de videos con Vimeo. Contiene videos de testing y ejemplos.', 
     0.00, 'básico', 'publicado');
    
    SET @curso_id = SCOPE_IDENTITY();
    PRINT '   ✅ Curso "Curso de Prueba - Videos Vimeo" creado con ID: ' + CAST(@curso_id AS VARCHAR);
END
ELSE
BEGIN
    SELECT @curso_id = id_curso FROM Cursos WHERE titulo = 'Curso de Prueba - Videos Vimeo';
    PRINT '   ✅ Curso "Curso de Prueba - Videos Vimeo" ya existe con ID: ' + CAST(@curso_id AS VARCHAR);
END

-- =====================================================================================
-- PASO 4: Crear módulo de prueba
-- =====================================================================================
PRINT '';
PRINT '📖 Paso 4: Verificando/Creando módulo...';

DECLARE @modulo_id INT;
IF NOT EXISTS (SELECT 1 FROM Modulos WHERE titulo = 'Videos de Prueba Vimeo' AND id_curso = @curso_id)
BEGIN
    INSERT INTO Modulos (id_curso, titulo, orden) VALUES 
    (@curso_id, 'Videos de Prueba Vimeo', 1);
    
    SET @modulo_id = SCOPE_IDENTITY();
    PRINT '   ✅ Módulo "Videos de Prueba Vimeo" creado con ID: ' + CAST(@modulo_id AS VARCHAR);
END
ELSE
BEGIN
    SELECT @modulo_id = id_modulo FROM Modulos WHERE titulo = 'Videos de Prueba Vimeo' AND id_curso = @curso_id;
    PRINT '   ✅ Módulo "Videos de Prueba Vimeo" ya existe con ID: ' + CAST(@modulo_id AS VARCHAR);
END

-- =====================================================================================
-- PASO 5: Registrar el video de Vimeo
-- =====================================================================================
PRINT '';
PRINT '🎥 Paso 5: Registrando video de Vimeo...';

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
        'Video de Prueba Vimeo (ID: 1122531979)',
        'Video de testing importado desde Vimeo existente. Este video se usa para probar la funcionalidad de integración con Vimeo en la plataforma StartEducation.',
        'https://vimeo.com/1122531979',
        NULL, -- Duración desconocida, se puede actualizar manualmente después
        1,
        'publicado',
        GETDATE()
    );
    
    DECLARE @video_id INT = SCOPE_IDENTITY();
    PRINT '   ✅ Video registrado exitosamente con ID: ' + CAST(@video_id AS VARCHAR);
    PRINT '   ✅ Título: Video de Prueba Vimeo (ID: 1122531979)';
    PRINT '   ✅ URL: https://vimeo.com/1122531979';
    PRINT '   ✅ Estado: publicado';
END
ELSE
BEGIN
    PRINT '   ⚠️ El video ya está registrado en la base de datos';
    
    -- Mostrar información del video existente
    SELECT @video_id = id_video FROM Video WHERE url = 'https://vimeo.com/1122531979';
    PRINT '   ✅ Video existente ID: ' + CAST(@video_id AS VARCHAR);
END

-- =====================================================================================
-- PASO 6: Verificar y mostrar resumen completo
-- =====================================================================================
PRINT '';
PRINT '📊 ===== RESUMEN FINAL =====';

-- Contar registros en cada tabla
DECLARE @total_videos INT, @total_modulos INT, @total_cursos INT, @total_categorias INT;

SELECT @total_videos = COUNT(*) FROM Video;
SELECT @total_modulos = COUNT(*) FROM Modulos;
SELECT @total_cursos = COUNT(*) FROM Cursos;
SELECT @total_categorias = COUNT(*) FROM Categorias;

PRINT 'Registros en la base de datos:';
PRINT '   📹 Videos: ' + CAST(@total_videos AS VARCHAR);
PRINT '   📖 Módulos: ' + CAST(@total_modulos AS VARCHAR);
PRINT '   📚 Cursos: ' + CAST(@total_cursos AS VARCHAR);
PRINT '   📂 Categorías: ' + CAST(@total_categorias AS VARCHAR);

-- Mostrar información detallada del video
PRINT '';
PRINT '🎬 INFORMACIÓN DEL VIDEO AGREGADO:';

SELECT 
    v.id_video as 'ID Video',
    v.titulo as 'Título',
    v.url as 'URL Vimeo',
    v.estatus as 'Estado',
    v.orden as 'Orden',
    FORMAT(v.fecha_creacion, 'dd/MM/yyyy HH:mm') as 'Fecha Creación',
    m.titulo as 'Módulo',
    c.titulo as 'Curso',
    cat.nombre as 'Categoría'
FROM Video v
INNER JOIN Modulos m ON v.id_modulo = m.id_modulo
INNER JOIN Cursos c ON m.id_curso = c.id_curso
INNER JOIN Categorias cat ON c.id_categoria = cat.id_categoria
WHERE v.url = 'https://vimeo.com/1122531979';

-- =====================================================================================
-- PASO 7: Instrucciones finales
-- =====================================================================================
PRINT '';
PRINT '🎯 ===== INSTRUCCIONES FINALES =====';
PRINT '1. ✅ El video ha sido registrado exitosamente en la base de datos';
PRINT '2. 🌐 Ve a tu aplicación web: http://localhost:3000/videos-admin';
PRINT '3. 🔄 Refresca la página si ya la tenías abierta';
PRINT '4. 📹 Tu video debería aparecer en la lista de videos';
PRINT '5. 👀 Puedes hacer clic en el ícono del ojo para verlo en Vimeo';
PRINT '6. ✏️ Puedes editar la información del video si es necesario';
PRINT '';
PRINT '🎉 ¡PROCESO COMPLETADO EXITOSAMENTE!';
PRINT '📺 Tu video de Vimeo ya está integrado en StartEducation';

GO