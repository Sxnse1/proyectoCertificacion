/**
 * User Dashboard Routes - StartEducation Platform
 * Maneja las rutas relacionadas con el dashboard de estudiantes
 */

const express = require('express');
const router = express.Router();

// Importamos el servicio de Bunny para construir las URLs de las imágenes
const bunnyService = require('../../services/bunnyService');

/**
 * GET /user-dashboard - Dashboard principal para estudiantes
 */
router.get('/', async function(req, res, next) {
  try {
    const user = req.session.user;
    
    if (!user) {
      console.log('[USER-DASHBOARD] ⚠️ Usuario no autenticado');
      return res.redirect('/auth/login');
    }
    
    console.log('[USER-DASHBOARD] 👤 Usuario accediendo al dashboard:', user.email);
    
    const db = req.app.locals.db;
    
    if (!db) {
      console.log('[USER-DASHBOARD] ⚠️ No hay conexión a base de datos');
      return res.render('error', {
        title: 'Error del Sistema',
        message: 'Sistema en mantenimiento. Intenta más tarde.',
        error: { status: 503, stack: '' }
      });
    }

    // Definición de variables
    let cursosInscritos = 0;
    let cursosCompletados = 0;
    let horasEstudio = 0;
    let certificados = 0;
    let subscription = { active: false };
    let recomendaciones = [];
    let cursosEnProgreso = [];

    try {
      const tablesResult = await db.executeQuery(`
        SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES 
        WHERE TABLE_TYPE = 'BASE TABLE' 
        AND TABLE_NAME IN ('inscripciones', 'certificados', 'Suscripciones', 'Membresias', 'Cursos')
      `);
      
      const existingTables = tablesResult.recordset ? tablesResult.recordset.map(row => row.TABLE_NAME) : [];
      console.log('[USER-DASHBOARD] 📋 Tablas disponibles:', existingTables);

      // --- 1. OBTENER RECOMENDACIONES (1 BÁSICO, 1 INTERMEDIO, 1 AVANZADO) ---
      if (existingTables.some(table => table.toLowerCase().includes('cursos'))) {
        try {
          const cursosRecomendadosResult = await db.executeQuery(`
            WITH RankedCursos AS (
              SELECT
                id_curso, titulo, descripcion, miniatura, nivel,
                ROW_NUMBER() OVER(PARTITION BY nivel ORDER BY NEWID()) as rn
              FROM Cursos
              WHERE estatus = 'publicado'
            )
            SELECT
              id_curso, titulo AS nombre, descripcion, miniatura, nivel
            FROM RankedCursos
            WHERE rn = 1 AND nivel IN ('básico', 'intermedio', 'avanzado');
          `);
          
          if (cursosRecomendadosResult && cursosRecomendadosResult.recordset) {
            recomendaciones = cursosRecomendadosResult.recordset;
            // Construimos la URL completa para cada miniatura
            recomendaciones.forEach(curso => {
              if (curso.miniatura) {
                curso.imagen_url = bunnyService.getBunnyCdnUrl(curso.miniatura);
              }
            });
          }
        } catch (cursosError) {
          console.error('[USER-DASHBOARD] ⚠️ Error consultando recomendaciones por nivel:', cursosError.message);
        }
      }

      // --- 2. OBTENER ESTADÍSTICAS Y CURSOS EN PROGRESO ---
      if (existingTables.some(table => table.toLowerCase().includes('inscripciones'))) {
        try {
          const cursosResult = await db.executeQuery(`SELECT COUNT(*) as total FROM inscripciones WHERE id_usuario = @userId`, { userId: user.id });
          if (cursosResult && cursosResult.recordset.length > 0) cursosInscritos = cursosResult.recordset[0].total || 0;

          const completadosResult = await db.executeQuery(`SELECT COUNT(*) as total FROM inscripciones WHERE id_usuario = @userId AND progreso = 100`, { userId: user.id });
          if (completadosResult && completadosResult.recordset.length > 0) cursosCompletados = completadosResult.recordset[0].total || 0;
          
          if (existingTables.some(table => table.toLowerCase().includes('cursos'))) {
            const progresoResult = await db.executeQuery(`
              SELECT c.titulo AS nombre, c.miniatura, i.progreso
              FROM inscripciones i
              INNER JOIN Cursos c ON i.id_curso = c.id_curso
              WHERE i.id_usuario = @userId AND i.progreso > 0 AND i.progreso < 100
            `, { userId: user.id });
            if (progresoResult && progresoResult.recordset) {
              cursosEnProgreso = progresoResult.recordset;
              // También corregimos las URLs de las miniaturas para los cursos en progreso
              cursosEnProgreso.forEach(curso => {
                if (curso.miniatura) {
                  curso.imagen_url = bunnyService.getBunnyCdnUrl(curso.miniatura);
                }
              });
            }
          }
        } catch (inscripcionesError) {
          console.error('[USER-DASHBOARD] ⚠️ Error consultando inscripciones:', inscripcionesError.message);
        }
      }
      
      // --- 3. CONSULTA DE CERTIFICADOS (LÓGICA ORIGINAL RESTAURADA) ---
      if (existingTables.some(table => table.toLowerCase().includes('certificados'))) {
        try {
          const certificadosResult = await db.executeQuery(`
            SELECT COUNT(*) as total FROM certificados WHERE id_usuario = @userId
          `, { userId: user.id });
          if (certificadosResult && certificadosResult.recordset.length > 0) {
            certificados = certificadosResult.recordset[0].total || 0;
          }
        } catch (certificadosError) {
          console.log('[USER-DASHBOARD] ⚠️ Error consultando certificados.');
        }
      }

      // --- 4. VERIFICAR SUSCRIPCIÓN ACTIVA (LÓGICA ORIGINAL RESTAURADA) ---
      if (existingTables.some(table => table.toLowerCase().includes('suscripciones'))) {
        try {
          const subscriptionResult = await db.executeQuery(`
            SELECT TOP 1 s.id_suscripcion, s.estatus, s.fecha_compra as fecha_inicio, s.fecha_vencimiento, m.nombre as planName, m.precio
            FROM Suscripciones s
            INNER JOIN Membresias m ON s.id_membresia = m.id_membresia
            WHERE s.id_usuario = @userId AND s.estatus = 'activa' AND s.fecha_vencimiento > GETDATE()
            ORDER BY s.fecha_vencimiento DESC
          `, { userId: user.id });
          
          if (subscriptionResult && subscriptionResult.recordset.length > 0) {
            const sub = subscriptionResult.recordset[0];
            subscription = { active: true, planName: sub.planName, price: sub.precio, startDate: sub.fecha_compra, endDate: sub.fecha_vencimiento };
          }
        } catch (subscriptionError) {
          console.log('[USER-DASHBOARD] ⚠️ Error consultando suscripción.');
        }
      }
      
    } catch (dbError) {
      console.error('[USER-DASHBOARD] ❌ Error consultando la base de datos:', dbError.message);
    }
    
    // --- LÓGICA DE RESPALDO ---
    if (recomendaciones.length === 0) {
      console.log('[USER-DASHBOARD] 💡 No se encontraron cursos publicados. Usando recomendaciones de respaldo.');
      recomendaciones = [
        { nombre: 'Curso Básico de Ejemplo', descripcion: 'Ideal para principiantes.', imagen_url: 'https://images.unsplash.com/photo-1542831371-29b0f74f9713?q=80&w=2070&auto=format&fit=crop' },
        { nombre: 'Curso Intermedio de Ejemplo', descripcion: 'Para llevar tus habilidades al siguiente nivel.', imagen_url: 'https://images.unsplash.com/photo-1557862921-37829c790f19?q=80&w=2071&auto=format&fit=crop' },
        { nombre: 'Curso Avanzado de Ejemplo', descripcion: 'Conviértete en un experto en el área.', imagen_url: 'https://images.unsplash.com/photo-1504639725590-c4a6c8de41c2?q=80&w=2070&auto=format&fit=crop' }
      ];
    }

    // Normalizar objetos para la plantilla: asegurarnos de tener campos consistentes
    const normalizedRecommended = recomendaciones.map((c, idx) => {
      const titulo = c.titulo || c.nombre || c.titulo || `Curso ${idx + 1}`;
      const descripcion = c.descripcion || c.descripcion || '';
      const miniatura = c.miniatura || null;
      const imagen_url = c.imagen_url || (miniatura ? bunnyService.getBunnyCdnUrl(miniatura) : null) || c.imagen_url || null;
      // intentar extraer id si existe (id_curso o id)
      const id = c.id_curso || c.id || null;
      return { id, titulo, descripcion, miniatura, imagen_url };
    });

    // Log de depuración: imprime las primeras recomendaciones (miniatura/imagen_url)
    try {
      console.log('[USER-DASHBOARD] 🔍 recommendedCourses sample:', JSON.stringify(normalizedRecommended.slice(0,5), null, 2));
    } catch (e) {
      console.log('[USER-DASHBOARD] 🔍 Error al serializar recomendaciones:', e.message);
    }

    res.render('estudiante/user-dashboard', {
      title: 'Mi Dashboard - StartEducation',
      user: user,
      stats: { cursosInscritos, cursosCompletados, horasEstudio, certificados },
      subscription: subscription,
      categorias: recomendaciones,
      recommendedCourses: normalizedRecommended,
      cursosEnProgreso: cursosEnProgreso,
      layout: false
    });

  } catch (error) {
    console.error('[USER-DASHBOARD] ❌ Error fatal en dashboard:', error);
    res.render('error', {
      title: 'Error',
      message: 'Error al cargar el dashboard',
      error: error
    });
  }
});

module.exports = router;