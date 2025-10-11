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

// Datos de ejemplo de cursos del usuario
const misCursosEjemplo = [
  {
    id: 1,
    titulo: "Curso Básico de Barbería",
    instructor: "Carlos Mendoza",
    icon: "✂️",
    estado: "activo",
    progreso: 65,
    fechaInscripcion: "2024-01-15"
  },
  {
    id: 2,
    titulo: "Técnicas Avanzadas de Corte",
    instructor: "Miguel Rodriguez",
    icon: "🎯",
    estado: "completado",
    progreso: 100,
    fechaInscripcion: "2023-11-10"
  }
];

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

/* GET curso específico */
router.get('/:cursoId', function(req, res, next) {
  const { cursoId } = req.params;
  const { user, email, rol, id } = req.query;
  
  if (!user || !email || !rol) {
    return res.redirect('/auth/login');
  }
  
  // Buscar el curso por ID
  const curso = cursosEjemplo.find(c => c.id === parseInt(cursoId));
  
  if (!curso) {
    return res.status(404).render('error', {
      message: 'Curso no encontrado',
      error: { status: 404 }
    });
  }
  
  res.render('estudiante/curso-detalle', {
    title: `${curso.titulo} - StartEducation`,
    userName: user,
    userEmail: email,
    userRole: rol,
    userId: id,
    curso: curso
  });
});

/* POST inscribirse a curso */
router.post('/inscribir/:cursoId', async function(req, res, next) {
  try {
    const { cursoId } = req.params;
    const { userId } = req.body;
    const cursoIdNum = parseInt(cursoId);
    
    // Verificar que el curso existe
    const curso = cursosEjemplo.find(c => c.id === cursoIdNum);
    if (!curso) {
      return res.json({ success: false, message: 'Curso no encontrado' });
    }
    
    // Verificar si ya está inscrito
    const yaInscrito = misCursosEjemplo.find(c => c.id === cursoIdNum);
    if (yaInscrito) {
      return res.json({ success: false, message: 'Ya estás inscrito a este curso' });
    }
    
    // Simular inscripción exitosa
    const nuevaInscripcion = {
      id: cursoIdNum,
      titulo: curso.titulo,
      instructor: curso.instructor,
      icon: curso.icon,
      estado: "activo",
      progreso: 0,
      fechaInscripcion: new Date().toISOString().split('T')[0]
    };
    
    misCursosEjemplo.push(nuevaInscripcion);
    console.log(`[CURSOS] Usuario ${userId} se inscribió al curso ${cursoId}`);
    
    res.json({
      success: true,
      message: 'Inscripción exitosa',
      cursoId: cursoId,
      userId: userId
    });
    
  } catch (error) {
    console.error('[CURSOS] Error en inscripción:', error);
    res.status(500).json({
      success: false,
      message: 'Error en la inscripción',
      error: error.message
    });
  }
});

/* GET mis cursos */
router.get('/mis-cursos', function(req, res, next) {
  const { user, email, rol, id } = req.query;
  
  if (!user || !email || !rol) {
    return res.redirect('/auth/login');
  }
  
  // Calcular estadísticas
  const cursosStats = {
    total: misCursosEjemplo.length,
    completados: misCursosEjemplo.filter(c => c.estado === 'completado').length,
    activos: misCursosEjemplo.filter(c => c.estado === 'activo').length,
    certificados: misCursosEjemplo.filter(c => c.estado === 'completado').length
  };
  
  res.render('estudiante/mis-cursos', {
    title: 'Mis Cursos - StartEducation',
    userName: user,
    userEmail: email,
    userRole: rol,
    userId: id,
    misCursos: misCursosEjemplo,
    cursosStats: cursosStats
  });
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
router.get('/certificado/:cursoId', function(req, res, next) {
  const { user, id } = req.query;
  const cursoId = parseInt(req.params.cursoId);
  
  // Buscar el curso
  const curso = cursosEjemplo.find(c => c.id === cursoId);
  if (!curso) {
    return res.status(404).send('Curso no encontrado');
  }
  
  // Verificar que el curso está completado
  const miCurso = misCursosEjemplo.find(c => c.id === cursoId && c.estado === 'completado');
  if (!miCurso) {
    return res.status(403).send('Curso no completado');
  }
  
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
          <p>impartido por ${curso.instructor}</p>
          <br>
          <p><strong>StartEducation - StarEducation</strong></p>
          <p>Fecha: ${new Date().toLocaleDateString('es-MX')}</p>
        </div>
        <script>window.print();</script>
      </body>
    </html>
  `);
});

module.exports = router;
