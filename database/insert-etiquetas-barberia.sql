-- ===============================================
-- SCRIPT DE ETIQUETAS DE EJEMPLO PARA BARBERÍA
-- StartEducationDB - Módulo de Etiquetas
-- ===============================================

USE [StartEducationDB]
GO

-- Insertar etiquetas específicas para barbería
INSERT INTO Etiquetas (nombre) VALUES
-- Herramientas
('Tijeras'),
('Navaja'),
('Máquina'),
('Peine'),
('Cepillo'),

-- Niveles de experiencia
('Principiante'),
('Intermedio'),
('Avanzado'),
('Profesional'),

-- Estilos de corte
('Fade'),
('Undercut'),
('Pompadour'),
('Quiff'),
('Buzz Cut'),
('Crew Cut'),
('Caesar'),
('Clásico'),
('Moderno'),
('Vintage'),

-- Tipos de cabello
('Cabello Rizado'),
('Cabello Liso'),
('Cabello Grueso'),
('Cabello Fino'),
('Cabello Graso'),
('Cabello Seco'),

-- Técnicas específicas
('Degradado'),
('Texturizado'),
('Layering'),
('Razor Cut'),
('Scissor Cut'),
('Blending'),

-- Tipos de servicio
('Corte'),
('Afeitado'),
('Styling'),
('Lavado'),
('Tratamiento'),

-- Estilos por época/tendencia
('Retro'),
('Hipster'),
('Ejecutivo'),
('Casual'),
('Formal'),

-- Duración
('Rápido'),
('Detallado'),

-- Público objetivo
('Niños'),
('Adolescentes'),
('Adultos'),
('Seniors');

-- Verificar inserción
SELECT 
    id_etiqueta,
    nombre
FROM Etiquetas
ORDER BY nombre;

PRINT '✅ Etiquetas de barbería insertadas exitosamente';
PRINT 'Total de etiquetas: ';

SELECT COUNT(*) as 'Total Etiquetas' FROM Etiquetas;

GO