/**
 * User Dashboard Routes - StartEducation Platform
 * Maneja las rutas relacionadas con el dashboard de estudiantes
 */

const express = require('express');
const router = express.Router();

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

    // Obtener estadísticas básicas del estudiante
    let cursosInscritos = 0;
    let cursosCompletados = 0;
    let horasEstudio = 0;
    let certificados = 0;
    let subscription = { active: false };
    let categorias = [];

    try {
      // Verificar primero qué tablas existen
      const tablesResult = await db.executeQuery(`
        SELECT TABLE_NAME 
        FROM INFORMATION_SCHEMA.TABLES 
        WHERE TABLE_TYPE = 'BASE TABLE' 
        AND TABLE_NAME IN ('inscripciones', 'certificados', 'Inscripciones', 'Certificados', 'Suscripciones', 'Membresias', 'Categorias')
      `);
      
      const existingTables = tablesResult.recordset ? tablesResult.recordset.map(row => row.TABLE_NAME) : [];
      console.log('[USER-DASHBOARD] 📋 Tablas disponibles:', existingTables);

      // Solo hacer consultas si las tablas existen
      if (existingTables.some(table => table.toLowerCase().includes('inscripciones'))) {
        try {
          const cursosResult = await db.executeQuery(`
            SELECT COUNT(*) as total 
            FROM inscripciones i 
            WHERE i.id_usuario = @userId
          `, { userId: user.id });
          
          if (cursosResult && cursosResult.recordset && cursosResult.recordset.length > 0) {
            cursosInscritos = cursosResult.recordset[0].total || 0;
          }

          const completadosResult = await db.executeQuery(`
            SELECT COUNT(*) as total 
            FROM inscripciones i 
            WHERE i.id_usuario = @userId AND i.progreso = 100
          `, { userId: user.id });
          
          if (completadosResult && completadosResult.recordset && completadosResult.recordset.length > 0) {
            cursosCompletados = completadosResult.recordset[0].total || 0;
          }
        } catch (inscripcionesError) {
          console.log('[USER-DASHBOARD] ⚠️ Error consultando inscripciones (tabla posiblemente vacía)');
        }
      }

      if (existingTables.some(table => table.toLowerCase().includes('certificados'))) {
        try {
          const certificadosResult = await db.executeQuery(`
            SELECT COUNT(*) as total 
            FROM certificados c 
            WHERE c.id_usuario = @userId
          `, { userId: user.id });
          
          if (certificadosResult && certificadosResult.recordset && certificadosResult.recordset.length > 0) {
            certificados = certificadosResult.recordset[0].total || 0;
          }
        } catch (certificadosError) {
          console.log('[USER-DASHBOARD] ⚠️ Error consultando certificados (tabla posiblemente vacía)');
        }
      }

      // Verificar suscripción activa
      if (existingTables.some(table => table.toLowerCase().includes('suscripciones'))) {
        try {
          const subscriptionResult = await db.executeQuery(`
            SELECT TOP 1 
              s.id_suscripcion,
              s.estatus,
              s.fecha_compra as fecha_inicio,
              s.fecha_vencimiento,
              m.nombre as planName,
              m.precio
            FROM Suscripciones s
            INNER JOIN Membresias m ON s.id_membresia = m.id_membresia
            WHERE s.id_usuario = @userId 
            AND s.estatus = 'activa'
            AND s.fecha_vencimiento > GETDATE()
            ORDER BY s.fecha_vencimiento DESC
          `, { userId: user.id });
          
          if (subscriptionResult && subscriptionResult.recordset && subscriptionResult.recordset.length > 0) {
            const sub = subscriptionResult.recordset[0];
            subscription = {
              active: true,
              planName: sub.planName,
              price: sub.precio,
              startDate: sub.fecha_compra,
              endDate: sub.fecha_vencimiento
            };
          }
        } catch (subscriptionError) {
          console.log('[USER-DASHBOARD] ⚠️ Error consultando suscripción');
        }
      }

      // Obtener categorías disponibles si no tiene suscripción activa
      if (!subscription.active && existingTables.some(table => table.toLowerCase().includes('categorias'))) {
        try {
          const categoriasResult = await db.executeQuery(`
            SELECT 
              c.id_categoria,
              c.nombre,
              c.descripcion,
              c.imagen_url,
              COALESCE(curso_count.total, 0) as cursos_count,
              COALESCE(estudiantes_count.total, 0) as estudiantes_count,
              COALESCE(m.precio, 29.99) as precio
            FROM Categorias c
            LEFT JOIN (
              SELECT id_categoria, COUNT(*) as total 
              FROM Cursos 
              WHERE estatus = 'activo'
              GROUP BY id_categoria
            ) curso_count ON c.id_categoria = curso_count.id_categoria
            LEFT JOIN (
              SELECT cu.id_categoria, COUNT(DISTINCT i.id_usuario) as total
              FROM Cursos cu
              INNER JOIN inscripciones i ON cu.id_curso = i.id_curso
              GROUP BY cu.id_categoria
            ) estudiantes_count ON c.id_categoria = estudiantes_count.id_categoria
            LEFT JOIN Membresias m ON c.nombre = m.categoria
            ORDER BY c.nombre
          `);
          
          if (categoriasResult && categoriasResult.recordset) {
            categorias = categoriasResult.recordset;
          }
        } catch (categoriasError) {
          console.log('[USER-DASHBOARD] ⚠️ Error consultando categorías');
        }
      }
      
    } catch (dbError) {
      console.error('[USER-DASHBOARD] ❌ Error consultando estadísticas:', dbError.message);
      // Continuar con valores por defecto
    }

    console.log('[USER-DASHBOARD] 📊 Estadísticas del usuario:', {
      cursosInscritos,
      cursosCompletados,
      horasEstudio,
      certificados,
      subscriptionActive: subscription.active,
      categoriasCount: categorias.length
    });

    res.render('estudiante/user-dashboard', {
      title: 'Mi Dashboard - StartEducation',
      user: user,
      stats: {
        cursosInscritos,
        cursosCompletados,
        horasEstudio,
        certificados
      },
      subscription: subscription,
      categorias: categorias,
      layout: false
    });

  } catch (error) {
    console.error('[USER-DASHBOARD] ❌ Error en dashboard:', error);
    res.render('error', {
      title: 'Error',
      message: 'Error al cargar el dashboard',
      error: error
    });
  }
});

module.exports = router;
