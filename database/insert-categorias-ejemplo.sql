-- ===============================================
-- SCRIPT DE DATOS DE PRUEBA PARA CATEGORÍAS
-- StartEducationDB - Módulo de Categorías
-- ===============================================

USE [StartEducationDB]
GO

-- Insertar categorías de ejemplo
INSERT INTO Categorias (nombre, descripcion) VALUES
('Desarrollo Web', 'Cursos relacionados con el desarrollo de sitios web y aplicaciones web'),
('Programación', 'Lenguajes de programación y conceptos fundamentales'),
('Bases de Datos', 'Diseño, administración y consulta de bases de datos'),
('Diseño UX/UI', 'Experiencia de usuario y diseño de interfaces'),
('Marketing Digital', 'Estrategias de marketing en línea y redes sociales'),
('Inteligencia Artificial', 'Machine Learning, Deep Learning y AI'),
('Ciberseguridad', 'Seguridad informática y protección de datos'),
('Gestión de Proyectos', 'Metodologías ágiles y administración de proyectos'),
('Análisis de Datos', 'Business Intelligence y análisis estadístico'),
('Desarrollo Móvil', 'Aplicaciones para iOS, Android y multiplataforma');

-- Verificar inserción
SELECT 
    id_categoria,
    nombre,
    descripcion
FROM Categorias
ORDER BY nombre;

PRINT '✅ Categorías de ejemplo insertadas exitosamente';
PRINT 'Total de categorías: ';

SELECT COUNT(*) as 'Total Categorías' FROM Categorias;

GO