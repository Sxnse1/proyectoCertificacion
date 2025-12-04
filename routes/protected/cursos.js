var express = require('express');
var router = express.Router();

// Datos de ejemplo de cursos
const cursosEjemplo = [
  {
    id: 1,
    titulo: "Curso Básico de Barbería",
    descripcion: "Aprende las técnicas fundamentales de barbería desde cero",
    precio: "$2,500 MXN",
    duracion: "8 semanas",
    nivel: "Principiante",
    instructor: "Carlos Mendoza",
    icon: "✂️",
    categoria: "basico",
    modulos: [
      "Introducción a la barbería profesional",
      "Herramientas básicas y mantenimiento",
      "Técnicas de corte fundamentales",
      "Afeitado clásico con navaja",
      "Atención al cliente",
      "Higiene y seguridad",
      "Práctica supervisada",
      "Evaluación final"
    ]
  },
  {
    id: 2,
    titulo: "Técnicas Avanzadas de Corte",
    descripcion: "Perfecciona tus habilidades con técnicas profesionales avanzadas",
    precio: "$3,500 MXN",
    duracion: "12 semanas",
    nivel: "Avanzado",
    instructor: "Miguel Rodriguez",
    icon: "🎯",
    categoria: "avanzado",
    modulos: [
      "Análisis facial y recomendaciones",
      "Cortes de tendencia actuales",
      "Técnicas de degradado avanzado",
      "Uso de herramientas especializadas",
      "Colorimetría básica",
      "Barbería artística",
      "Fotografía de trabajos",
      "Portfolio profesional"
    ]
  },
  {
    id: 3,
    titulo: "Barbería Clásica y Moderna",
    descripcion: "Combina lo mejor de ambos mundos en un curso completo",
    precio: "$4,000 MXN",
    duracion: "16 semanas",
    nivel: "Intermedio",
    instructor: "Juan López",
    icon: "👑",
    categoria: "completo",
    modulos: [
      "Historia de la barbería",
      "Técnicas clásicas tradicionales",
      "Tendencias modernas",
      "Gestión de barbería",
      "Marketing y redes sociales",
      "Servicio al cliente VIP",
      "Certificación profesional",
      "Práctica en barbería real"
    ]
  }
];

// CORREGIDO: Datos ficticios eliminados - ahora se consultan desde la base de datos
// Las inscripciones se almacenan permanentemente en la tabla Inscripciones

/* GET cursos page - Plataforma de cursos para estudiantes */
router.get('/', async function(req, res, next) {
  try {
    // La autenticación ya se verifica en el middleware
    const user = req.session.user;
    
    console.log('[CURSOS] 📚 Acceso a cursos:', user.email, '- Rol:', user.rol);
    
    // Solo permitir acceso a usuarios (estudiantes) - Los instructores también pueden ver cursos
    if (user.rol !== 'user' && user.rol !== 'estudiante' && user.rol !== 'instructor') {
      console.log('[CURSOS] 🚫 Rol no autorizado:', user.rol);
      return res.redirect('/auth/login?error=acceso_denegado');
    }

    const db = req.app.locals.db;
    
    if (!db) {
      console.log('[CURSOS] ⚠️ No hay conexión a base de datos');
      return res.render('error', {
        title: 'Error del Sistema',
        message: 'Sistema en mantenimiento. Intenta más tarde.',
        error: { status: 503, stack: '' }
      });
    }

    // Obtener estadísticas
    let totalCursos = 0;
    let cursosBasicos = 0;
    let cursosIntermedios = 0;
    let cursosAvanzados = 0;
    let cursosPublicados = 0;
    let cursos = [];
    let categorias = [];

    try {
      // Obtener estadísticas de cursos
      const statsResult = await db.executeQuery(`
        SELECT 
          COUNT(*) as total_cursos,
          SUM(CASE WHEN nivel = 'básico' THEN 1 ELSE 0 END) as cursos_basicos,
          SUM(CASE WHEN nivel = 'intermedio' THEN 1 ELSE 0 END) as cursos_intermedios,
          SUM(CASE WHEN nivel = 'avanzado' THEN 1 ELSE 0 END) as cursos_avanzados,
          SUM(CASE WHEN estatus = 'publicado' THEN 1 ELSE 0 END) as cursos_publicados
        FROM Cursos
      `);

      if (statsResult && statsResult.recordset && statsResult.recordset.length > 0) {
        const stats = statsResult.recordset[0];
        totalCursos = stats.total_cursos || 0;
        cursosBasicos = stats.cursos_basicos || 0;
        cursosIntermedios = stats.cursos_intermedios || 0;
        cursosAvanzados = stats.cursos_avanzados || 0;
        cursosPublicados = stats.cursos_publicados || 0;
      }

      // Obtener cursos con información del instructor y categoría
      const cursosResult = await db.executeQuery(`
        SELECT 
          c.id_curso,
          c.titulo,
          c.descripcion,
          c.precio,
          c.nivel,
          c.miniatura,
          c.fecha_creacion,
          c.estatus,
          u.nombre + ' ' + u.apellido as instructor_nombre,
          cat.nombre as categoria_nombre,
          ISNULL((SELECT AVG(CAST(calificacion AS FLOAT)) FROM Valoraciones v WHERE v.id_curso = c.id_curso), 0) as calificacion_promedio,
          ISNULL((SELECT COUNT(*) FROM Valoraciones v WHERE v.id_curso = c.id_curso), 0) as total_valoraciones
        FROM Cursos c
        INNER JOIN Usuarios u ON c.id_usuario = u.id_usuario
        INNER JOIN Categorias cat ON c.id_categoria = cat.id_categoria
        WHERE c.estatus = 'publicado'
        ORDER BY c.fecha_creacion DESC
      `);

      if (cursosResult && cursosResult.recordset) {
        cursos = cursosResult.recordset.map(curso => ({
          ...curso,
          precio_formato: curso.precio ? `$${curso.precio.toLocaleString('es-MX')} MXN` : 'Gratis',
          calificacion_promedio: Math.round(curso.calificacion_promedio * 10) / 10,
          fecha_creacion_formato: new Date(curso.fecha_creacion).toLocaleDateString('es-MX')
        }));
      }

      // Obtener categorías
      const categoriasResult = await db.executeQuery(`
        SELECT id_categoria, nombre, descripcion 
        FROM Categorias 
        ORDER BY nombre
      `);

      if (categoriasResult && categoriasResult.recordset) {
        categorias = categoriasResult.recordset;
      }

    } catch (dbError) {
      console.error('[CURSOS] ❌ Error consultando datos:', dbError.message);
      // Continuar con datos por defecto
    }

    console.log('[CURSOS] 📊 Estadísticas:', {
      totalCursos,
      cursosBasicos,
      cursosIntermedios,
      cursosAvanzados,
      cursosPublicados
    });

    res.render('estudiante/cursos-estudiante', {
      title: 'Catálogo de Cursos - StartEducation',
      user: user,
      cursos: cursos,
      categorias: categorias,
      stats: {
        totalCursos,
        cursosBasicos,
        cursosIntermedios,
        cursosAvanzados,
        cursosPublicados
      },
      layout: false
    });

  } catch (error) {
    console.error('[CURSOS] ❌ Error general:', error);
    res.render('error', {
      title: 'Error',
      message: 'Error al cargar el catálogo de cursos',
      error: error
    });
  }
});

/* GET curso específico - REDIRIGIR A NUEVA RUTA */
router.get('/:cursoId', function(req, res, next) {
  const { cursoId } = req.params;
  
  // Redirigir a la nueva ruta de detalle de curso
  res.redirect(`/curso/${cursoId}`);
});

/* POST inscribirse a curso - CORREGIDO: Usa base de datos real */
router.post('/inscribir/:cursoId', async function(req, res, next) {
  try {
    const { cursoId } = req.params;
    const user = req.session.user;
    const cursoIdNum = parseInt(cursoId);
    
    if (!user) {
      return res.status(401).json({ success: false, message: 'Usuario no autenticado' });
    }
    
    console.log(`[INSCRIPCIONES] 📝 Procesando inscripción - Usuario: ${user.id || user.id_usuario}, Curso: ${cursoIdNum}`);
    
    const db = req.app.locals.db;
    if (!db) {
      console.error('[INSCRIPCIONES] ❌ Base de datos no disponible');
      return res.status(500).json({ success: false, message: 'Error de conexión a la base de datos' });
    }

    // Iniciar transacción para operación atómica
    const transaction = db.transaction();
    await transaction.begin();
    
    try {
      const userId = user.id || user.id_usuario;
      
      // 1. Verificar que el curso existe y está publicado
      const cursoResult = await transaction.request()
        .input('cursoId', cursoIdNum)
        .query('SELECT id_curso, titulo, precio FROM Cursos WHERE id_curso = @cursoId AND estatus = \'publicado\'');
      
      if (!cursoResult.recordset || cursoResult.recordset.length === 0) {
        await transaction.rollback();
        return res.json({ success: false, message: 'Curso no encontrado o no disponible' });
      }
      
      const curso = cursoResult.recordset[0];
      
      // 2. Verificar si ya está inscrito
      const inscripcionExistente = await transaction.request()
        .input('userId', userId)
        .input('cursoId', cursoIdNum)
        .query('SELECT id_inscripcion FROM Inscripciones WHERE id_usuario = @userId AND id_curso = @cursoId');
      
      if (inscripcionExistente.recordset && inscripcionExistente.recordset.length > 0) {
        await transaction.rollback();
        return res.json({ success: false, message: 'Ya estás inscrito a este curso' });
      }
      
      // 3. Verificar si ya compró el curso
      const compraExistente = await transaction.request()
        .input('userId', userId)
        .input('cursoId', cursoIdNum)
        .query('SELECT id_compra FROM Compras WHERE id_usuario = @userId AND id_curso = @cursoId');
      
      if (compraExistente.recordset && compraExistente.recordset.length > 0) {
        await transaction.rollback();
        return res.json({ success: false, message: 'Ya tienes acceso a este curso por compra previa' });
      }
      
      // 4. Verificar si el curso es gratuito o si el usuario tiene suscripción activa
      let puedeInscribirse = false;
      
      if (curso.precio === 0 || curso.precio === null) {
        // Curso gratuito - permitir inscripción directa
        puedeInscribirse = true;
        console.log(`[INSCRIPCIONES] 🆓 Curso gratuito detectado: ${curso.titulo}`);
      } else {
        // Curso de pago - verificar suscripción activa
        const suscripcionActiva = await transaction.request()
          .input('userId', userId)
          .query("SELECT id_suscripcion FROM Suscripciones WHERE id_usuario = @userId AND estatus = 'activa' AND fecha_vencimiento > GETDATE()");
        
        if (suscripcionActiva.recordset && suscripcionActiva.recordset.length > 0) {
          puedeInscribirse = true;
          console.log(`[INSCRIPCIONES] 🎆 Suscripción activa detectada para usuario ${userId}`);
        }
      }
      
      if (!puedeInscribirse) {
        await transaction.rollback();
        return res.json({ 
          success: false, 
          message: `Este curso cuesta $${curso.precio}. Necesitas comprarlo o tener una suscripción activa.`,
          requiresPayment: true,
          precio: curso.precio
        });
      }
      
      // 5. Crear inscripción en la base de datos
      const inscripcionResult = await transaction.request()
        .input('userId', userId)
        .input('cursoId', cursoIdNum)
        .query(`
          INSERT INTO Inscripciones (id_usuario, id_curso, progreso, fecha_inscripcion)
          OUTPUT INSERTED.id_inscripcion
          VALUES (@userId, @cursoId, 0, GETDATE())
        `);
      
      const nuevaInscripcionId = inscripcionResult.recordset[0].id_inscripcion;
      
      await transaction.commit();
      
      console.log(`[INSCRIPCIONES] ✅ Inscripción exitosa - ID: ${nuevaInscripcionId}, Usuario: ${userId}, Curso: ${curso.titulo}`);
      
      res.json({
        success: true,
        message: `Te has inscrito exitosamente al curso: ${curso.titulo}`,
        inscripcionId: nuevaInscripcionId,
        cursoId: cursoIdNum,
        cursoTitulo: curso.titulo
      });
      
    } catch (dbError) {
      await transaction.rollback();
      console.error('[INSCRIPCIONES] ❌ Error en transacción de base de datos:', dbError.message);
      throw dbError;
    }
    
  } catch (error) {
    console.error('[INSCRIPCIONES] ❌ Error general en inscripción:', error.message);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor durante la inscripción'
    });
  }
});

/* GET mis cursos - CORREGIDO: Usa base de datos real */
router.get('/mis-cursos', async function(req, res, next) {
  try {
    const user = req.session.user;
    
    if (!user) {
      return res.redirect('/auth/login?error=sesion_expirada');
    }
    
    const db = req.app.locals.db;
    let inscripciones = [];
    let cursosStats = { total: 0, completados: 0, activos: 0, certificados: 0 };
    
    if (db) {
      try {
        const userId = user.id || user.id_usuario;
        
        // Obtener inscripciones del usuario desde la base de datos
        const inscripcionesResult = await db.executeQuery(`
          SELECT 
            i.id_inscripcion,
            i.id_curso,
            i.progreso,
            i.fecha_inscripcion,
            c.titulo,
            c.descripcion,
            c.miniatura,
            c.precio,
            c.nivel,
            u.nombre + ' ' + u.apellido as instructor_nombre
          FROM Inscripciones i
          INNER JOIN Cursos c ON i.id_curso = c.id_curso
          LEFT JOIN Usuarios u ON c.id_usuario = u.id_usuario
          WHERE i.id_usuario = @userId
          ORDER BY i.fecha_inscripcion DESC
        `, { userId });
        
        if (inscripcionesResult && inscripcionesResult.recordset) {
          inscripciones = inscripcionesResult.recordset.map(inscripcion => ({
            id: inscripcion.id_curso,
            titulo: inscripcion.titulo,
            instructor: inscripcion.instructor_nombre || 'Instructor',
            icon: '📚', // Icono por defecto
            estado: inscripcion.progreso >= 100 ? 'completado' : 'activo',
            progreso: Math.round(inscripcion.progreso),
            fechaInscripcion: new Date(inscripcion.fecha_inscripcion).toLocaleDateString('es-MX'),
            descripcion: inscripcion.descripcion,
            miniatura: inscripcion.miniatura,
            precio: inscripcion.precio,
            nivel: inscripcion.nivel
          }));
          
          // Calcular estadísticas reales
          cursosStats = {
            total: inscripciones.length,
            completados: inscripciones.filter(c => c.estado === 'completado').length,
            activos: inscripciones.filter(c => c.estado === 'activo').length,
            certificados: inscripciones.filter(c => c.estado === 'completado').length
          };
          
          console.log(`[MIS-CURSOS] 📊 Usuario ${userId} tiene ${cursosStats.total} inscripciones`);
        }
        
      } catch (dbError) {
        console.error('[MIS-CURSOS] ❌ Error consultando inscripciones:', dbError.message);
        // Continuar con datos vacíos
      }
    } else {
      console.log('[MIS-CURSOS] ⚠️ Base de datos no disponible, usando datos vacíos');
    }
    
    res.render('estudiante/mis-cursos', {
      title: 'Mis Cursos - StartEducation',
      userName: user.nombre,
      userEmail: user.email,
      userRole: user.rol,
      userId: user.id || user.id_usuario,
      misCursos: inscripciones,
      cursosStats: cursosStats,
      layout: false
    });
    
  } catch (error) {
    console.error('[MIS-CURSOS] ❌ Error general:', error.message);
    res.render('error', {
      title: 'Error - StartEducation',
      message: 'Error al cargar tus cursos',
      error: req.app.get('env') === 'development' ? error : {},
      layout: false
    });
  }
});

/* GET lecciones de un curso */
router.get('/lecciones/:cursoId', function(req, res, next) {
  const { user, email, rol, id } = req.query;
  const cursoId = parseInt(req.params.cursoId);
  
  if (!user || !email || !rol) {
    return res.redirect('/auth/login');
  }
  
  // Buscar el curso
  const curso = cursosEjemplo.find(c => c.id === cursoId);
  if (!curso) {
    return res.status(404).render('error', {
      message: 'Curso no encontrado',
      error: { status: 404 }
    });
  }
  
  // Redirigir a mis cursos con mensaje (función en desarrollo)
  res.redirect(`/cursos/mis-cursos?user=${user}&email=${email}&rol=${rol}&id=${id}&mensaje=Función en desarrollo`);
});

/* GET certificado de un curso */
router.get('/certificado/:cursoId', async function(req, res, next) {
  const { user, id } = req.query;
  const cursoId = parseInt(req.params.cursoId);
  
  try {
    // Buscar el curso en la base de datos
    const cursoQuery = `
      SELECT id, titulo, precio 
      FROM Cursos 
      WHERE id = @cursoId AND activo = 1
    `;
    
    const cursoResult = await sql.query(cursoQuery, {
      cursoId: { value: cursoId, type: sql.Int }
    });
    
    if (cursoResult.recordset.length === 0) {
      return res.status(404).send('Curso no encontrado');
    }
    
    const curso = cursoResult.recordset[0];
    
    // Verificar que el usuario está inscrito y el curso está completado
    const inscripcionQuery = `
      SELECT i.estado, i.fecha_inscripcion, i.fecha_finalizacion
      FROM Inscripciones i
      WHERE i.usuario_id = @usuarioId AND i.curso_id = @cursoId AND i.estado = 'completado'
    `;
    
    const inscripcionResult = await sql.query(inscripcionQuery, {
      usuarioId: { value: req.session.user.id, type: sql.Int },
      cursoId: { value: cursoId, type: sql.Int }
    });
    
    if (inscripcionResult.recordset.length === 0) {
      return res.status(403).send('Curso no completado o no inscrito');
    }
    
    const inscripcion = inscripcionResult.recordset[0];
    // Generar certificado (simulado)
    res.setHeader('Content-Type', 'text/html');
    res.send(`
      <html>
        <head>
          <title>Certificado - ${curso.titulo}</title>
          <style>
            body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
            .certificado { border: 5px solid #2c5aa0; padding: 40px; margin: 20px; }
            h1 { color: #2c5aa0; font-size: 2.5rem; }
            .nombre { font-size: 2rem; color: #e67e22; margin: 20px 0; }
            .curso { font-size: 1.5rem; margin: 20px 0; }
          </style>
        </head>
        <body>
          <div class="certificado">
            <h1>🏆 CERTIFICADO DE FINALIZACIÓN</h1>
            <p>Se certifica que</p>
            <div class="nombre">${user}</div>
            <p>ha completado satisfactoriamente el curso</p>
            <div class="curso">"${curso.titulo}"</div>
            <p>Fecha de finalización: ${new Date(inscripcion.fecha_finalizacion).toLocaleDateString('es-MX')}</p>
            <br>
            <p><strong>StartEducation - StarEducation</strong></p>
            <p>Fecha de emisión: ${new Date().toLocaleDateString('es-MX')}</p>
          </div>
          <script>window.print();</script>
        </body>
      </html>
    `);
    
  } catch (error) {
    console.error('Error al generar certificado:', error);
    res.status(500).send('Error interno del servidor');
  }
});

module.exports = router;
