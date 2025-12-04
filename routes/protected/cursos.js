var express = require('express');
var router = express.Router();

// 🗃️ MIGRADO A BASE DE DATOS - DATOS DINÁMICOS
// ============================================
// Todas las rutas ahora consultan la base de datos real
// Eliminados arrays estáticos (cursosEjemplo) para evitar inconsistencias

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
          ISNULL((SELECT COUNT(*) FROM Valoraciones v WHERE v.id_curso = c.id_curso), 0) as total_valoraciones,
          CASE WHEN EXISTS (
            SELECT 1 FROM Carrito_Compras cc 
            WHERE cc.id_curso = c.id_curso 
              AND cc.id_usuario = @userId 
              AND cc.estatus = 'activo'
          ) THEN 1 ELSE 0 END as en_carrito,
          CASE WHEN EXISTS (
            SELECT 1 FROM Favoritos f 
            WHERE f.id_curso = c.id_curso 
              AND f.id_usuario = @userId 
              AND f.estatus IN ('activo', 'guardado', 'comprado')
          ) THEN 1 ELSE 0 END as en_favoritos
        FROM Cursos c
        INNER JOIN Usuarios u ON c.id_usuario = u.id_usuario
        INNER JOIN Categorias cat ON c.id_categoria = cat.id_categoria
        WHERE c.estatus = 'publicado'
        ORDER BY c.fecha_creacion DESC
      `, {
        userId: user.id_usuario || user.id
      });

      if (cursosResult && cursosResult.recordset) {
        cursos = cursosResult.recordset.map(curso => ({
          ...curso,
          precio_formato: curso.precio ? `$${curso.precio.toLocaleString('es-MX')} MXN` : 'Gratis',
          calificacion_promedio: Math.round(curso.calificacion_promedio * 10) / 10,
          fecha_creacion_formato: new Date(curso.fecha_creacion).toLocaleDateString('es-MX'),
          en_carrito: curso.en_carrito === 1,
          en_favoritos: curso.en_favoritos === 1
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

    // Verificar si el usuario tiene suscripción activa
    let tieneSuscripcionActiva = false;
    try {
      const userId = user.id_usuario || user.id;
      console.log('[CURSOS] 🔍 Verificando suscripción para usuario ID:', userId);
      
      const suscripcionResult = await db.executeQuery(`
        SELECT TOP 1 id_suscripcion, fecha_vencimiento, estatus
        FROM Suscripciones
        WHERE id_usuario = @id_usuario
          AND estatus = 'activa'
          AND fecha_vencimiento > GETDATE()
        ORDER BY fecha_vencimiento DESC
      `, {
        id_usuario: userId
      });

      console.log('[CURSOS] 📋 Resultado suscripción:', suscripcionResult?.recordset);

      if (suscripcionResult && suscripcionResult.recordset && suscripcionResult.recordset.length > 0) {
        tieneSuscripcionActiva = true;
        console.log('[CURSOS] 💎 Usuario tiene suscripción activa');
      } else {
        console.log('[CURSOS] ⭕ Usuario NO tiene suscripción activa');
      }
    } catch (subError) {
      console.error('[CURSOS] ⚠️ Error verificando suscripción:', subError.message);
    }

    console.log('[CURSOS] 📊 Estadísticas:', {
      totalCursos,
      cursosBasicos,
      cursosIntermedios,
      cursosAvanzados,
      cursosPublicados,
      tieneSuscripcionActiva
    });

    res.render('estudiante/cursos-estudiante', {
      title: 'Catálogo de Cursos - StartEducation',
      user: user,
      cursos: cursos,
      categorias: categorias,
      tieneSuscripcionActiva: tieneSuscripcionActiva,
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
router.get('/lecciones/:cursoId', async function(req, res, next) {
  const { user, email, rol, id } = req.query;
  const cursoId = parseInt(req.params.cursoId);
  
  if (!user || !email || !rol) {
    return res.redirect('/auth/login');
  }

  try {
    // 🔄 MIGRACIÓN A BASE DE DATOS - DATOS DINÁMICOS
    // ==============================================
    // Verificar que el curso existe en la base de datos
    const cursoQuery = `
      SELECT 
        c.id_curso,
        c.titulo,
        c.descripcion,
        c.precio,
        c.nivel,
        c.duracion_estimada,
        c.estatus,
        u.nombre as instructor_nombre,
        u.apellido as instructor_apellido,
        cat.nombre as categoria_nombre,
        -- Estadísticas del curso
        (SELECT COUNT(*) FROM Modulos m WHERE m.id_curso = c.id_curso) as total_modulos,
        (SELECT COUNT(*) FROM Video v 
         INNER JOIN Modulos m ON v.id_modulo = m.id_modulo 
         WHERE m.id_curso = c.id_curso AND v.estatus = 'publicado') as total_videos
      FROM Cursos c
      INNER JOIN Usuarios u ON c.id_usuario = u.id_usuario
      LEFT JOIN Categorias cat ON c.id_categoria = cat.id_categoria
      WHERE c.id_curso = @cursoId AND c.estatus = 'publicado'
    `;

    const db = req.app.get('db');
    const cursoResult = await db.executeQuery(cursoQuery, { cursoId });

    if (!cursoResult.recordset || cursoResult.recordset.length === 0) {
      console.log(`[LECCIONES] ❌ Curso ID ${cursoId} no encontrado en base de datos`);
      return res.status(404).render('error', {
        title: 'Curso No Encontrado',
        message: 'El curso solicitado no existe o no está disponible',
        error: { status: 404, message: 'Verifica que el curso esté publicado' },
        layout: false
      });
    }

    const curso = cursoResult.recordset[0];
    console.log(`[LECCIONES] ✅ Curso encontrado: "${curso.titulo}" (ID: ${cursoId})`);

    // 🔄 VERIFICACIÓN HÍBRIDA DE ACCESO AL CURSO
    // ==========================================
    // Verificar inscripción Y compra para máxima compatibilidad
    const accesoQuery = `
      SELECT 
        i.id_inscripcion,
        i.estado as estado_inscripcion,
        i.progreso,
        i.fecha_inscripcion,
        i.fecha_finalizacion,
        -- Verificar también si hay compra (respaldo)
        (SELECT COUNT(*) FROM Compras c 
         WHERE c.id_usuario = @userId AND c.id_curso = @cursoId) as tiene_compra
      FROM Inscripciones i
      WHERE i.id_usuario = @userId AND i.id_curso = @cursoId
      
      UNION ALL
      
      -- Si no hay inscripción pero sí compra, crear registro temporal
      SELECT 
        NULL as id_inscripcion,
        'activo' as estado_inscripcion,
        0 as progreso,
        GETDATE() as fecha_inscripcion,
        NULL as fecha_finalizacion,
        1 as tiene_compra
      FROM Compras c
      WHERE c.id_usuario = @userId AND c.id_curso = @cursoId
        AND NOT EXISTS (
          SELECT 1 FROM Inscripciones i2 
          WHERE i2.id_usuario = @userId AND i2.id_curso = @cursoId
        )
    `;

    const accesoResult = await db.executeQuery(accesoQuery, { 
      userId: parseInt(id), 
      cursoId 
    });

    if (!accesoResult.recordset || accesoResult.recordset.length === 0) {
      console.log(`[LECCIONES] ❌ Usuario ${id} sin acceso al curso ${cursoId} (ni inscripción ni compra)`);
      return res.redirect(`/cursos/curso-detalle/${cursoId}?user=${encodeURIComponent(user)}&email=${encodeURIComponent(email)}&rol=${rol}&id=${id}&mensaje=Debes inscribirte al curso primero`);
    }

    const acceso = accesoResult.recordset[0];
    
    // Si tiene compra pero no inscripción, crear inscripción automática
    if (!acceso.id_inscripcion && acceso.tiene_compra > 0) {
      console.log(`[LECCIONES] 🔄 Creando inscripción automática para usuario ${id} en curso ${cursoId}`);
      try {
        await db.executeQuery(`
          INSERT INTO Inscripciones (
            id_usuario, id_curso, estado, progreso, 
            fecha_inscripcion, fecha_modificacion
          ) VALUES (
            @userId, @cursoId, 'activo', 0, 
            GETDATE(), GETDATE()
          )
        `, { userId: parseInt(id), cursoId });
        
        // Actualizar datos de acceso
        acceso.id_inscripcion = 1; // Simular que ya tiene inscripción
        acceso.estado_inscripcion = 'activo';
        acceso.progreso = 0;
        
        console.log(`[LECCIONES] ✅ Inscripción automática creada`);
      } catch (inscripError) {
        console.log(`[LECCIONES] ⚠️ Error creando inscripción automática:`, inscripError.message);
      }
    }

    console.log(`[LECCIONES] 📚 Acceso válido - Estado: ${acceso.estado_inscripcion}, Progreso: ${acceso.progreso}%`);

    // Obtener módulos y lecciones (videos) del curso
    const leccionesQuery = `
      SELECT 
        m.id_modulo,
        m.titulo as modulo_titulo,
        m.descripcion as modulo_descripcion,
        m.orden as modulo_orden,
        v.id_video,
        v.titulo as video_titulo,
        v.descripcion as video_descripcion,
        v.orden as video_orden,
        v.duracion_segundos,
        v.estatus as video_estatus,
        -- Verificar si el usuario ya vio este video
        CASE 
          WHEN vp.id_progreso IS NOT NULL THEN 1 
          ELSE 0 
        END as visto
      FROM Modulos m
      LEFT JOIN Video v ON m.id_modulo = v.id_modulo AND v.estatus = 'publicado'
      LEFT JOIN Video_Progreso vp ON v.id_video = vp.id_video AND vp.id_usuario = @userId
      WHERE m.id_curso = @cursoId
      ORDER BY m.orden ASC, v.orden ASC
    `;

    const leccionesResult = await db.executeQuery(leccionesQuery, { 
      cursoId, 
      userId: parseInt(id) 
    });

    // Estructurar datos para el template
    const modulosConLecciones = {};
    let totalLecciones = 0;
    let leccionesVistas = 0;

    if (leccionesResult.recordset) {
      leccionesResult.recordset.forEach(row => {
        if (!modulosConLecciones[row.id_modulo]) {
          modulosConLecciones[row.id_modulo] = {
            id: row.id_modulo,
            titulo: row.modulo_titulo,
            descripcion: row.modulo_descripcion,
            orden: row.modulo_orden,
            lecciones: []
          };
        }

        if (row.id_video) {
          const leccion = {
            id: row.id_video,
            titulo: row.video_titulo,
            descripcion: row.video_descripcion,
            orden: row.video_orden,
            duracion_segundos: row.duracion_segundos,
            duracion_formateada: formatearDuracion(row.duracion_segundos),
            visto: row.visto === 1,
            estatus: row.video_estatus
          };
          
          modulosConLecciones[row.id_modulo].lecciones.push(leccion);
          totalLecciones++;
          if (leccion.visto) leccionesVistas++;
        }
      });
    }

    const modulos = Object.values(modulosConLecciones).sort((a, b) => a.orden - b.orden);
    
    console.log(`[LECCIONES] 📊 Estadísticas: ${modulos.length} módulos, ${totalLecciones} lecciones, ${leccionesVistas} vistas`);

    // Renderizar vista de lecciones (crear nueva vista)
    res.render('estudiante/lecciones', {
      title: `Lecciones - ${curso.titulo}`,
      curso: {
        id: curso.id_curso,
        titulo: curso.titulo,
        descripcion: curso.descripcion,
        instructor: `${curso.instructor_nombre} ${curso.instructor_apellido}`,
        categoria: curso.categoria_nombre,
        total_modulos: curso.total_modulos,
        total_videos: curso.total_videos
      },
      inscripcion: {
        estado: acceso.estado_inscripcion,
        progreso: Math.round(acceso.progreso),
        fecha_inscripcion: new Date(acceso.fecha_inscripcion).toLocaleDateString('es-MX')
      },
      modulos,
      estadisticas: {
        total_lecciones: totalLecciones,
        lecciones_vistas: leccionesVistas,
        progreso_porcentaje: totalLecciones > 0 ? Math.round((leccionesVistas / totalLecciones) * 100) : 0
      },
      userName: user,
      userEmail: email,
      userRole: rol,
      userId: id,
      layout: false
    });

  } catch (error) {
    console.error('[LECCIONES] ❌ Error consultando lecciones:', error.message);
    res.status(500).render('error', {
      title: 'Error - Lecciones',
      message: 'No se pudieron cargar las lecciones del curso',
      error: req.app.get('env') === 'development' ? error : {},
      layout: false
    });
  }
});

// Función auxiliar para formatear duración en segundos
function formatearDuracion(segundos) {
  if (!segundos) return '0:00';
  const minutos = Math.floor(segundos / 60);
  const segundosRestantes = segundos % 60;
  return `${minutos}:${segundosRestantes.toString().padStart(2, '0')}`;
}

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
    
    // 🎨 CERTIFICADO PROFESIONAL - TEMPLATE SEPARADO
    // ==============================================
    // Preparar datos para el template de certificado
    const certificadoData = {
      usuario: {
        nombre: req.session.user.nombre || user,
        apellido: req.session.user.apellido || ''
      },
      curso: {
        titulo: curso.titulo,
        id: curso.id
      },
      fechas: {
        finalizacion: new Date(inscripcion.fecha_finalizacion).toLocaleDateString('es-MX', {
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        }),
        emision: new Date().toLocaleDateString('es-MX', {
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        })
      }
    };

    // Renderizar template profesional en lugar de HTML hardcodeado
    res.render('estudiante/certificado', certificadoData);
    
  } catch (error) {
    console.error('[CERTIFICADO] ❌ Error al generar certificado:', error.message);
    res.status(500).render('error', {
      title: 'Error - Certificado',
      message: 'No se pudo generar el certificado',
      error: req.app.get('env') === 'development' ? error : {},
      layout: false
    });
  }
});

module.exports = router;
