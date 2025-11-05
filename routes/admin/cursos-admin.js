var express = require('express');
var router = express.Router();
const auditService = require('../../services/auditService');
const { hasPermission } = require('../../middleware/auth');

/* GET - Lista de cursos con filtros y paginación */
router.get('/', hasPermission('gestionar_cursos'), async function(req, res, next) {
  try {
    const db = req.app.locals.db;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const search = req.query.search || '';
    const categoriaFilter = req.query.categoria || '';
    const nivelFilter = req.query.nivel || '';
    const estatusFilter = req.query.estatus || '';
    const offset = (page - 1) * limit;

    console.log(`[CURSOS] Consultando cursos - Página: ${page}, Búsqueda: "${search}", Categoría: "${categoriaFilter}", Nivel: "${nivelFilter}", Estatus: "${estatusFilter}"`);

    // Construir consulta con filtros
    let whereClause = '';
    let params = {};
    let conditions = [];
    
    if (search) {
      conditions.push('(c.titulo LIKE @search OR c.descripcion LIKE @search)');
      params.search = `%${search}%`;
    }

    if (categoriaFilter) {
      conditions.push('c.id_categoria = @categoria');
      params.categoria = categoriaFilter;
    }

    if (nivelFilter) {
      conditions.push('c.nivel = @nivel');
      params.nivel = nivelFilter;
    }

    if (estatusFilter) {
      conditions.push('c.estatus = @estatus');
      params.estatus = estatusFilter;
    }

    if (conditions.length > 0) {
      whereClause = 'WHERE ' + conditions.join(' AND ');
    }

    // Consulta principal con información completa
    const query = `
      SELECT 
        c.id_curso,
        c.titulo,
        c.descripcion,
        c.miniatura,
        c.precio,
        c.nivel,
        c.estatus,
        c.fecha_creacion,
        c.id_usuario,
        c.id_categoria,
        u.nombre as instructor_nombre,
        u.apellido as instructor_apellido,
        u.email as instructor_email,
        cat.nombre as categoria_nombre,
        COUNT(DISTINCT m.id_modulo) as total_modulos,
        COUNT(DISTINCT v.id_video) as total_videos,
        COUNT(CASE WHEN v.estatus = 'publicado' THEN 1 END) as videos_publicados,
        COUNT(CASE WHEN v.estatus = 'borrador' THEN 1 END) as videos_borrador,
        COUNT(CASE WHEN v.estatus = 'archivado' THEN 1 END) as videos_archivados,
        COALESCE(SUM(v.duracion_segundos), 0) as duracion_total_segundos,
        COUNT(DISTINCT val.id_valoracion) as total_valoraciones,
        COALESCE(AVG(CAST(val.calificacion as FLOAT)), 0) as promedio_valoracion,
        COUNT(DISTINCT comp.id_compra) as total_compras,
        FORMAT(c.fecha_creacion, 'dd/MM/yyyy HH:mm') as fecha_creacion_formateada
      FROM Cursos c
      INNER JOIN Usuarios u ON c.id_usuario = u.id_usuario
      INNER JOIN Categorias cat ON c.id_categoria = cat.id_categoria
      LEFT JOIN Modulos m ON c.id_curso = m.id_curso
      LEFT JOIN Video v ON m.id_modulo = v.id_modulo
      LEFT JOIN Valoraciones val ON c.id_curso = val.id_curso
      LEFT JOIN Compras comp ON c.id_curso = comp.id_curso
      ${whereClause}
      GROUP BY c.id_curso, c.titulo, c.descripcion, c.miniatura, c.precio, c.nivel, c.estatus, c.fecha_creacion, 
               c.id_usuario, c.id_categoria, u.nombre, u.apellido, u.email, cat.nombre
      ORDER BY c.fecha_creacion DESC
      OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY
    `;

    params.offset = offset;
    params.limit = limit;

    const result = await db.executeQuery(query, params);

    // Consulta para contar total de registros
    const countQuery = `
      SELECT COUNT(DISTINCT c.id_curso) as total
      FROM Cursos c
      INNER JOIN Usuarios u ON c.id_usuario = u.id_usuario
      INNER JOIN Categorias cat ON c.id_categoria = cat.id_categoria
      ${whereClause}
    `;

    const countResult = await db.executeQuery(countQuery, params);
    const totalRecords = countResult.recordset[0].total;
    const totalPages = Math.ceil(totalRecords / limit);

    // Obtener categorías para el filtro
    const categoriasResult = await db.executeQuery(`
      SELECT id_categoria, nombre
      FROM Categorias
      ORDER BY nombre
    `);

    // Obtener etiquetas asociadas a cada curso
    const cursosIds = result.recordset.map(c => c.id_curso);
    let etiquetasMap = {};
    
    if (cursosIds.length > 0) {
      const etiquetasResult = await db.executeQuery(`
        SELECT ce.id_curso, e.id_etiqueta, e.nombre
        FROM Curso_Etiqueta ce
        INNER JOIN Etiquetas e ON ce.id_etiqueta = e.id_etiqueta
        WHERE ce.id_curso IN (${cursosIds.join(',')})
        ORDER BY e.nombre
      `);

      etiquetasResult.recordset.forEach(etiqueta => {
        if (!etiquetasMap[etiqueta.id_curso]) {
          etiquetasMap[etiqueta.id_curso] = [];
        }
        etiquetasMap[etiqueta.id_curso].push({
          id: etiqueta.id_etiqueta,
          nombre: etiqueta.nombre
        });
      });
    }

    const cursos = result.recordset.map(curso => ({
      ...curso,
      instructor_completo: `${curso.instructor_nombre} ${curso.instructor_apellido}`,
      duracion_total_minutos: Math.floor(curso.duracion_total_segundos / 60),
      duracion_display: formatDuration(curso.duracion_total_segundos),
      precio_formateado: `$${curso.precio.toFixed(2)}`,
      promedio_valoracion_display: curso.promedio_valoracion.toFixed(1),
      etiquetas: etiquetasMap[curso.id_curso] || []
    }));

    console.log(`[CURSOS] ✅ Cursos encontrados: ${cursos.length} de ${totalRecords} total`);

    res.render('admin/cursos-admin', {
      title: 'Gestión de Cursos',
      cursos: cursos,
      categorias: categoriasResult.recordset,
      pagination: {
        currentPage: page,
        totalPages: totalPages,
        totalRecords: totalRecords,
        hasNext: page < totalPages,
        hasPrev: page > 1,
        nextPage: page + 1,
        prevPage: page - 1
      },
      filters: {
        search: search,
        categoria: categoriaFilter,
        nivel: nivelFilter,
        estatus: estatusFilter,
        limit: limit
      }
    });

  } catch (error) {
    console.error('[CURSOS] ❌ Error al obtener cursos:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message
    });
  }
});

/* POST - Crear nuevo curso */
router.post('/', hasPermission('crear_cursos'), async function(req, res, next) {
  try {
    const db = req.app.locals.db;
    const { titulo, descripcion, id_categoria, precio, nivel, miniatura } = req.body;
    
    // Validar sesión de usuario
    if (!req.session || !req.session.user || !req.session.user.id) {
      console.log('[CURSOS] ❌ Error: Usuario no autenticado o sesión inválida');
      return res.status(401).json({
        success: false,
        message: 'Usuario no autenticado'
      });
    }
    
    const id_usuario = req.session.user.id; // Instructor actual

    console.log('[CURSOS] 📝 Creando nuevo curso:', { titulo, id_categoria, precio, nivel, id_usuario });

    // Validaciones
    if (!titulo || !id_categoria || precio === undefined || !nivel) {
      return res.status(400).json({
        success: false,
        message: 'El título, categoría, precio y nivel son obligatorios'
      });
    }

    if (precio < 0) {
      return res.status(400).json({
        success: false,
        message: 'El precio no puede ser negativo'
      });
    }

    if (!['básico', 'intermedio', 'avanzado'].includes(nivel)) {
      return res.status(400).json({
        success: false,
        message: 'Nivel inválido. Debe ser: básico, intermedio o avanzado'
      });
    }

    // Verificar que la categoría existe
    const categoriaCheck = await db.executeQuery(
      'SELECT id_categoria FROM Categorias WHERE id_categoria = @id_categoria',
      { id_categoria }
    );

    if (categoriaCheck.recordset.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'La categoría especificada no existe'
      });
    }

    // Insertar nuevo curso
    const insertQuery = `
      INSERT INTO Cursos (id_usuario, id_categoria, titulo, descripcion, miniatura, precio, nivel, fecha_creacion, estatus)
      OUTPUT INSERTED.id_curso
      VALUES (@id_usuario, @id_categoria, @titulo, @descripcion, @miniatura, @precio, @nivel, GETDATE(), 'borrador')
    `;

    const insertResult = await db.executeQuery(insertQuery, {
      id_usuario,
      id_categoria,
      titulo: titulo.trim(),
      descripcion: descripcion ? descripcion.trim() : null,
      miniatura: miniatura ? miniatura.trim() : null,
      precio: parseFloat(precio),
      nivel
    });

    const nuevoCursoId = insertResult.recordset[0].id_curso;

    console.log(`[CURSOS] ✅ Curso creado exitosamente con ID: ${nuevoCursoId}`);

    // 🔍 Registrar acción de auditoría
    try {
      await auditService.logAction({
        usuarioId: id_usuario,
        accion: 'CURSO_CREADO',
        entidad: 'Curso',
        entidadId: nuevoCursoId,
        detalles: {
          titulo: titulo.trim(),
          categoria: id_categoria,
          precio: parseFloat(precio),
          nivel: nivel
        },
        ip: req.ip || req.connection.remoteAddress
      }, db);
      console.log('[CURSOS] 📋 Auditoría registrada: CURSO_CREADO');
    } catch (auditError) {
      console.error('[CURSOS] ⚠️ Error registrando auditoría:', auditError);
      // No fallar la operación principal por errores de auditoría
    }

    res.json({
      success: true,
      message: 'Curso creado exitosamente',
      curso: {
        id_curso: nuevoCursoId,
        titulo: titulo.trim(),
        id_categoria,
        precio: parseFloat(precio),
        nivel
      }
    });

  } catch (error) {
    console.error('[CURSOS] ❌ Error al crear curso:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message
    });
  }
});

/* PUT - Actualizar curso */
router.put('/:id', hasPermission('editar_cursos'), async function(req, res, next) {
  try {
    const db = req.app.locals.db;
    const cursoId = req.params.id;
    const { titulo, descripcion, id_categoria, precio, nivel, miniatura, estatus } = req.body;
    const usuarioId = req.session.user.id;

    console.log(`[CURSOS] 📝 Actualizando curso ${cursoId}:`, { titulo, id_categoria, precio, nivel, estatus });

    // Validaciones
    if (!titulo || !id_categoria || precio === undefined || !nivel) {
      return res.status(400).json({
        success: false,
        message: 'El título, categoría, precio y nivel son obligatorios'
      });
    }

    if (precio < 0) {
      return res.status(400).json({
        success: false,
        message: 'El precio no puede ser negativo'
      });
    }

    if (!['básico', 'intermedio', 'avanzado'].includes(nivel)) {
      return res.status(400).json({
        success: false,
        message: 'Nivel inválido. Debe ser: básico, intermedio o avanzado'
      });
    }

    if (estatus && !['borrador', 'publicado', 'inactivo'].includes(estatus)) {
      return res.status(400).json({
        success: false,
        message: 'Estatus inválido. Debe ser: borrador, publicado o inactivo'
      });
    }

    // Verificar que el curso existe y pertenece al usuario (o es admin)
    const cursoCheck = await db.executeQuery(
      'SELECT id_curso, id_usuario FROM Cursos WHERE id_curso = @id_curso',
      { id_curso: cursoId }
    );

    if (cursoCheck.recordset.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Curso no encontrado'
      });
    }

    const curso = cursoCheck.recordset[0];
    
    // Solo el propietario o admin puede editar
    if (curso.id_usuario !== usuarioId && req.session.user.rol !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'No tienes permisos para editar este curso'
      });
    }

    // Verificar que la categoría existe
    const categoriaCheck = await db.executeQuery(
      'SELECT id_categoria FROM Categorias WHERE id_categoria = @id_categoria',
      { id_categoria }
    );

    if (categoriaCheck.recordset.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'La categoría especificada no existe'
      });
    }

    // Actualizar curso
    const updateQuery = `
      UPDATE Cursos 
      SET 
        titulo = @titulo,
        descripcion = @descripcion,
        id_categoria = @id_categoria,
        precio = @precio,
        nivel = @nivel,
        miniatura = @miniatura
        ${estatus ? ', estatus = @estatus' : ''}
      WHERE id_curso = @id_curso
    `;

    const updateParams = {
      id_curso: cursoId,
      titulo: titulo.trim(),
      descripcion: descripcion ? descripcion.trim() : null,
      id_categoria,
      precio: parseFloat(precio),
      nivel,
      miniatura: miniatura ? miniatura.trim() : null
    };

    if (estatus) {
      updateParams.estatus = estatus;
    }

    await db.executeQuery(updateQuery, updateParams);

    console.log(`[CURSOS] ✅ Curso ${cursoId} actualizado exitosamente`);

    // 🔍 Registrar acción de auditoría
    try {
      await auditService.logAction({
        usuarioId: req.session.user.id,
        accion: 'CURSO_ACTUALIZADO',
        entidad: 'Curso',
        entidadId: cursoId,
        detalles: {
          titulo: titulo.trim(),
          categoria: id_categoria,
          precio: parseFloat(precio),
          nivel: nivel,
          estatus: estatus || 'sin_cambio'
        },
        ip: req.ip || req.connection.remoteAddress
      }, db);
      console.log('[CURSOS] 📋 Auditoría registrada: CURSO_ACTUALIZADO');
    } catch (auditError) {
      console.error('[CURSOS] ⚠️ Error registrando auditoría:', auditError);
      // No fallar la operación principal por errores de auditoría
    }

    res.json({
      success: true,
      message: 'Curso actualizado exitosamente'
    });

  } catch (error) {
    console.error(`[CURSOS] ❌ Error al actualizar curso ${req.params.id}:`, error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message
    });
  }
});

/* DELETE - Eliminar curso */
router.delete('/:id', hasPermission('eliminar_cursos'), async function(req, res, next) {
  try {
    const db = req.app.locals.db;
    const cursoId = req.params.id;
    const usuarioId = req.session.user.id;

    console.log(`[CURSOS] 🗑️ Eliminando curso ${cursoId}`);

    // Verificar que el curso existe y obtener información
    const cursoCheck = await db.executeQuery(`
      SELECT 
        c.id_curso,
        c.titulo,
        c.id_usuario,
        COUNT(DISTINCT m.id_modulo) as total_modulos,
        COUNT(DISTINCT v.id_video) as total_videos,
        COUNT(DISTINCT comp.id_compra) as total_compras
      FROM Cursos c
      LEFT JOIN Modulos m ON c.id_curso = m.id_curso
      LEFT JOIN Video v ON m.id_modulo = v.id_modulo
      LEFT JOIN Compras comp ON c.id_curso = comp.id_curso
      WHERE c.id_curso = @id_curso
      GROUP BY c.id_curso, c.titulo, c.id_usuario
    `, { id_curso: cursoId });

    if (cursoCheck.recordset.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Curso no encontrado'
      });
    }

    const curso = cursoCheck.recordset[0];

    // Solo el propietario o admin puede eliminar
    if (curso.id_usuario !== usuarioId && req.session.user.rol !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'No tienes permisos para eliminar este curso'
      });
    }

    // Verificar si tiene compras (no se puede eliminar)
    if (curso.total_compras > 0) {
      return res.status(400).json({
        success: false,
        message: `No se puede eliminar el curso "${curso.titulo}" porque tiene ${curso.total_compras} compra(s) asociada(s).`
      });
    }

    // Si tiene módulos/videos, avisar pero permitir eliminación (CASCADE)
    let warningMessage = '';
    if (curso.total_videos > 0) {
      warningMessage = ` Se eliminarán también ${curso.total_modulos} módulo(s) y ${curso.total_videos} video(s) asociado(s).`;
    }

    // Eliminar curso (CASCADE eliminará módulos y videos)
    await db.executeQuery(
      'DELETE FROM Cursos WHERE id_curso = @id_curso',
      { id_curso: cursoId }
    );

    console.log(`[CURSOS] ✅ Curso "${curso.titulo}" eliminado exitosamente`);

    // 🔍 Registrar acción de auditoría
    try {
      await auditService.logAction({
        usuarioId: usuarioId,
        accion: 'CURSO_ELIMINADO',
        entidad: 'Curso',
        entidadId: cursoId,
        detalles: {
          titulo: curso.titulo,
          modulos_eliminados: curso.total_modulos,
          videos_eliminados: curso.total_videos,
          warning: warningMessage
        },
        ip: req.ip || req.connection.remoteAddress
      }, db);
      console.log('[CURSOS] 📋 Auditoría registrada: CURSO_ELIMINADO');
    } catch (auditError) {
      console.error('[CURSOS] ⚠️ Error registrando auditoría:', auditError);
      // No fallar la operación principal por errores de auditoría
    }

    res.json({
      success: true,
      message: `Curso "${curso.titulo}" eliminado exitosamente.${warningMessage}`
    });

  } catch (error) {
    console.error(`[CURSOS] ❌ Error al eliminar curso ${req.params.id}:`, error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message
    });
  }
});

/* GET - Dashboard centralizado del curso */
router.get('/:id/dashboard', async function(req, res, next) {
  try {
    const db = req.app.locals.db;
    const cursoId = req.params.id;

    console.log(`[CURSOS] 📊 Obteniendo dashboard para curso ${cursoId}`);

    // Obtener información básica del curso (simplificada para debugging)
    const cursoQuery = `
      SELECT 
        c.id_curso,
        c.titulo,
        c.descripcion,
        c.miniatura,
        c.precio,
        c.nivel,
        c.estatus,
        c.fecha_creacion,
        c.id_usuario,
        c.id_categoria,
        u.nombre as instructor_nombre,
        u.apellido as instructor_apellido,
        u.email as instructor_email,
        cat.nombre as categoria_nombre,
        FORMAT(c.fecha_creacion, 'dd/MM/yyyy HH:mm') as fecha_creacion_formateada
      FROM Cursos c
      INNER JOIN Usuarios u ON c.id_usuario = u.id_usuario
      INNER JOIN Categorias cat ON c.id_categoria = cat.id_categoria
      WHERE c.id_curso = @id_curso
    `;

    console.log(`[CURSOS] 🔍 Ejecutando consulta principal...`);
    const cursoResult = await db.executeQuery(cursoQuery, { id_curso: cursoId });
    
    if (cursoResult.recordset.length === 0) {
      return res.status(404).render('shared/error', {
        message: 'Curso no encontrado',
        title: 'Error 404'
      });
    }

    let curso = cursoResult.recordset[0];
    console.log(`[CURSOS] ✅ Curso encontrado: ${curso.titulo}`);

    // Obtener estadísticas por separado
    console.log(`[CURSOS] 🔍 Obteniendo estadísticas...`);
    const statsQuery = `
      SELECT 
        COUNT(DISTINCT m.id_modulo) as total_modulos,
        COUNT(DISTINCT v.id_video) as total_videos,
        COUNT(CASE WHEN v.estatus = 'publicado' THEN 1 END) as videos_publicados,
        COALESCE(SUM(CASE WHEN ISNUMERIC(CAST(v.duracion_segundos AS VARCHAR)) = 1 THEN v.duracion_segundos ELSE 0 END), 0) as duracion_total_segundos
      FROM Cursos c
      LEFT JOIN Modulos m ON c.id_curso = m.id_curso
      LEFT JOIN Video v ON m.id_modulo = v.id_modulo
      WHERE c.id_curso = @id_curso
    `;

    const statsResult = await db.executeQuery(statsQuery, { id_curso: cursoId });
    
    // Combinar estadísticas con datos del curso
    curso = { ...curso, ...statsResult.recordset[0] };

    // Agregar propiedades calculadas
    curso.instructor_completo = `${curso.instructor_nombre} ${curso.instructor_apellido}`;
    curso.duracion_total_minutos = Math.floor(curso.duracion_total_segundos / 60);
    curso.duracion_display = formatDuration(curso.duracion_total_segundos);
    curso.precio_formateado = `$${curso.precio.toFixed(2)}`;
    curso.promedio_valoracion_display = '0.0'; // Temporal, calcularemos después

    // Obtener módulos con sus videos
    const modulosQuery = `
      SELECT 
        m.id_modulo,
        m.titulo,
        m.orden,
        COUNT(v.id_video) as total_videos,
        COUNT(CASE WHEN v.estatus = 'publicado' THEN 1 END) as videos_publicados,
        COUNT(CASE WHEN v.estatus = 'borrador' THEN 1 END) as videos_borrador,
        COUNT(CASE WHEN v.estatus = 'archivado' THEN 1 END) as videos_archivados,
        COALESCE(SUM(v.duracion_segundos), 0) as duracion_total_segundos
      FROM Modulos m
      LEFT JOIN Video v ON m.id_modulo = v.id_modulo
      WHERE m.id_curso = @id_curso
      GROUP BY m.id_modulo, m.titulo, m.orden
      ORDER BY m.orden, m.titulo
    `;

    const modulosResult = await db.executeQuery(modulosQuery, { id_curso: cursoId });
    const modulos = modulosResult.recordset.map(modulo => ({
      ...modulo,
      duracion_display: formatDuration(modulo.duracion_total_segundos),
      videos: [] // Los llenaremos después
    }));

    // Obtener videos para cada módulo
    if (modulos.length > 0) {
      const modulosIds = modulos.map(m => m.id_modulo);
      
      // Crear parámetros dinámicos para la consulta IN
      const inClause = modulosIds.map((_, index) => `@modulo${index}`).join(',');
      const videosQuery = `
        SELECT 
          v.id_video,
          v.id_modulo,
          v.titulo,
          v.descripcion,
          v.url,
          v.orden,
          v.estatus,
          v.duracion_segundos,
          CASE 
            WHEN v.duracion_segundos IS NOT NULL AND ISNUMERIC(CAST(v.duracion_segundos AS VARCHAR)) = 1 THEN 
              CASE 
                WHEN v.duracion_segundos >= 3600 THEN 
                  CAST(v.duracion_segundos / 3600 AS VARCHAR) + 'h ' + CAST((v.duracion_segundos % 3600) / 60 AS VARCHAR) + 'm'
                ELSE 
                  CAST(v.duracion_segundos / 60 AS VARCHAR) + 'm'
              END
            ELSE '0m'
          END as duracion_display
        FROM Video v
        WHERE v.id_modulo IN (${inClause})
        ORDER BY v.id_modulo, v.orden, v.titulo
      `;

      // Crear objeto de parámetros
      const videosParams = {};
      modulosIds.forEach((id, index) => {
        videosParams[`modulo${index}`] = id;
      });

      const videosResult = await db.executeQuery(videosQuery, videosParams);
      const videosMap = {};
      
      videosResult.recordset.forEach(video => {
        if (!videosMap[video.id_modulo]) {
          videosMap[video.id_modulo] = [];
        }
        videosMap[video.id_modulo].push(video);
      });

      // Asignar videos a módulos
      modulos.forEach(modulo => {
        modulo.videos = videosMap[modulo.id_modulo] || [];
      });
    }

    // Obtener etiquetas del curso
    const etiquetasQuery = `
      SELECT e.id_etiqueta, e.nombre
      FROM Curso_Etiqueta ce
      INNER JOIN Etiquetas e ON ce.id_etiqueta = e.id_etiqueta
      WHERE ce.id_curso = @id_curso
      ORDER BY e.nombre
    `;

    const etiquetasResult = await db.executeQuery(etiquetasQuery, { id_curso: cursoId });
    curso.etiquetas = etiquetasResult.recordset;

    // Obtener categorías para el formulario de edición
    const categoriasResult = await db.executeQuery(`
      SELECT id_categoria, nombre
      FROM Categorias
      ORDER BY nombre
    `);

    // Obtener instructores para el formulario de edición
    const instructoresResult = await db.executeQuery(`
      SELECT id_usuario, nombre, apellido, email
      FROM Usuarios
      WHERE rol IN ('instructor', 'admin')
      ORDER BY nombre, apellido
    `);

    console.log(`[CURSOS] ✅ Dashboard cargado para curso: ${curso.titulo}`);
    console.log(`[CURSOS] 📊 Estadísticas: ${modulos.length} módulos, ${curso.total_videos} videos`);

    res.render('admin/curso-dashboard', {
      title: `Dashboard: ${curso.titulo}`,
      curso: curso,
      modulos: modulos,
      categorias: categoriasResult.recordset,
      instructores: instructoresResult.recordset
    });

  } catch (error) {
    console.error(`[CURSOS] ❌ Error al obtener dashboard del curso ${req.params.id}:`, error);
    res.status(500).render('shared/error', {
      message: 'Error interno del servidor al cargar el dashboard',
      error: error
    });
  }
});

/* GET - Obtener curso por ID */
router.get('/:id', async function(req, res, next) {
  try {
    const db = req.app.locals.db;
    const cursoId = req.params.id;

    console.log(`[CURSOS] 📖 Obteniendo curso ${cursoId}`);

    const query = `
      SELECT 
        c.id_curso,
        c.titulo,
        c.descripcion,
        c.miniatura,
        c.precio,
        c.nivel,
        c.estatus,
        c.fecha_creacion,
        c.id_usuario,
        c.id_categoria,
        u.nombre as instructor_nombre,
        u.apellido as instructor_apellido,
        u.email as instructor_email,
        cat.nombre as categoria_nombre,
        COUNT(DISTINCT m.id_modulo) as total_modulos,
        COUNT(DISTINCT v.id_video) as total_videos,
        COUNT(CASE WHEN v.estatus = 'publicado' THEN 1 END) as videos_publicados,
        COALESCE(SUM(v.duracion_segundos), 0) as duracion_total_segundos,
        COUNT(DISTINCT val.id_valoracion) as total_valoraciones,
        COALESCE(AVG(CAST(val.calificacion as FLOAT)), 0) as promedio_valoracion,
        COUNT(DISTINCT comp.id_compra) as total_compras
      FROM Cursos c
      INNER JOIN Usuarios u ON c.id_usuario = u.id_usuario
      INNER JOIN Categorias cat ON c.id_categoria = cat.id_categoria
      LEFT JOIN Modulos m ON c.id_curso = m.id_curso
      LEFT JOIN Video v ON m.id_modulo = v.id_modulo
      LEFT JOIN Valoraciones val ON c.id_curso = val.id_curso
      LEFT JOIN Compras comp ON c.id_curso = comp.id_curso
      WHERE c.id_curso = @id_curso
      GROUP BY c.id_curso, c.titulo, c.descripcion, c.miniatura, c.precio, c.nivel, c.estatus, c.fecha_creacion, 
               c.id_usuario, c.id_categoria, u.nombre, u.apellido, u.email, cat.nombre
    `;

    const result = await db.executeQuery(query, { id_curso: cursoId });

    if (result.recordset.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Curso no encontrado'
      });
    }

    const curso = result.recordset[0];
    curso.instructor_completo = `${curso.instructor_nombre} ${curso.instructor_apellido}`;
    curso.duracion_total_minutos = Math.floor(curso.duracion_total_segundos / 60);
    curso.duracion_display = formatDuration(curso.duracion_total_segundos);
    curso.precio_formateado = `$${curso.precio.toFixed(2)}`;
    curso.promedio_valoracion_display = curso.promedio_valoracion.toFixed(1);

    console.log(`[CURSOS] ✅ Curso encontrado: ${curso.titulo}`);

    res.json({
      success: true,
      curso: curso
    });

  } catch (error) {
    console.error(`[CURSOS] ❌ Error al obtener curso ${req.params.id}:`, error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message
    });
  }
});

/* GET - Obtener módulos de un curso (API usada por el frontend) */
router.get('/:id/modulos', async function(req, res, next) {
  try {
    const db = req.app.locals.db;
    const cursoId = req.params.id;

    console.log(`[CURSOS] 📦 Obteniendo módulos para curso ${cursoId}`);

    const modulosResult = await db.executeQuery(`
      SELECT id_modulo, titulo, orden
      FROM Modulos
      WHERE id_curso = @id_curso
      ORDER BY orden, titulo
    `, { id_curso: cursoId });

    const modulos = modulosResult.recordset || [];

    res.json({ success: true, modulos });
  } catch (error) {
    console.error(`[CURSOS] ❌ Error al obtener módulos para curso ${req.params.id}:`, error);
    res.status(500).json({ success: false, message: 'Error al obtener módulos', error: error.message });
  }
});

/* POST - Crear módulo en un curso (API usada por el frontend inline) */
router.post('/:id/modulos', async function(req, res, next) {
  try {
    const db = req.app.locals.db;
    const cursoId = req.params.id;
    let { titulo, orden } = req.body;

    console.log(`[CURSOS] 📝 Creando módulo en curso ${cursoId}:`, { titulo, orden });

    if (!titulo) {
      // calcular orden provisional para generar nombre si es necesario
      const maxOrdenResult = await db.executeQuery(
        'SELECT ISNULL(MAX(orden), 0) + 1 as siguiente_orden FROM Modulos WHERE id_curso = @id_curso',
        { id_curso: cursoId }
      );
      const siguiente = maxOrdenResult.recordset[0].siguiente_orden;
      titulo = `Módulo ${siguiente}`;
    }

    // Si no se pasa orden, calcular siguiente
    let ordenFinal = orden;
    if (!ordenFinal) {
      const maxOrdenResult2 = await db.executeQuery(
        'SELECT ISNULL(MAX(orden), 0) + 1 as siguiente_orden FROM Modulos WHERE id_curso = @id_curso',
        { id_curso: cursoId }
      );
      ordenFinal = maxOrdenResult2.recordset[0].siguiente_orden;
    }

    // Evitar conflicto de orden
    const ordenCheck = await db.executeQuery(
      'SELECT id_modulo FROM Modulos WHERE id_curso = @id_curso AND orden = @orden',
      { id_curso: cursoId, orden: ordenFinal }
    );
    if (ordenCheck.recordset.length > 0) {
      return res.status(400).json({ success: false, message: 'Ya existe un módulo con ese orden en este curso' });
    }

    const insertResult = await db.executeQuery(`
      INSERT INTO Modulos (id_curso, titulo, orden, fecha_modificacion)
      OUTPUT INSERTED.id_modulo, INSERTED.titulo, INSERTED.orden
      VALUES (@id_curso, @titulo, @orden, GETDATE())
    `, { id_curso: cursoId, titulo: titulo.trim(), orden: ordenFinal });

    const nuevo = insertResult.recordset[0];

    res.json({ success: true, modulo: { id_modulo: nuevo.id_modulo, titulo: nuevo.titulo, orden: nuevo.orden } });
  } catch (error) {
    console.error(`[CURSOS] ❌ Error creando módulo para curso ${req.params.id}:`, error);
    res.status(500).json({ success: false, message: 'Error al crear módulo', error: error.message });
  }
});

/* POST - Cambiar estatus del curso */
router.post('/:id/status', async function(req, res, next) {
  try {
    const db = req.app.locals.db;
    const cursoId = req.params.id;
    const { estatus } = req.body;
    const usuarioId = req.session.user.id;

    console.log(`[CURSOS] 🔄 Cambiando estatus del curso ${cursoId} a: ${estatus}`);

    if (!['borrador', 'publicado', 'inactivo'].includes(estatus)) {
      return res.status(400).json({
        success: false,
        message: 'Estatus inválido'
      });
    }

    // Verificar permisos
    const cursoCheck = await db.executeQuery(
      'SELECT id_curso, id_usuario, titulo FROM Cursos WHERE id_curso = @id_curso',
      { id_curso: cursoId }
    );

    if (cursoCheck.recordset.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Curso no encontrado'
      });
    }

    const curso = cursoCheck.recordset[0];
    
    if (curso.id_usuario !== usuarioId && req.session.user.rol !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'No tienes permisos para cambiar el estatus de este curso'
      });
    }

    // Actualizar estatus
    await db.executeQuery(
      'UPDATE Cursos SET estatus = @estatus WHERE id_curso = @id_curso',
      { id_curso: cursoId, estatus }
    );

    console.log(`[CURSOS] ✅ Estatus del curso "${curso.titulo}" cambiado a: ${estatus}`);

    res.json({
      success: true,
      message: `Curso "${curso.titulo}" marcado como ${estatus}`
    });

  } catch (error) {
    console.error(`[CURSOS] ❌ Error al cambiar estatus del curso ${req.params.id}:`, error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message
    });
  }
});

// Función auxiliar para formatear duración
function formatDuration(seconds) {
  if (!seconds || seconds === 0) return '0m';
  
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  } else {
    return `${minutes}m`;
  }
}

module.exports = router;