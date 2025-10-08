var express = require('express');
var router = express.Router();

/* GET - Lista de etiquetas con filtros y paginación */
router.get('/', async function(req, res, next) {
  try {
    const db = req.app.locals.db;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 15;
    const search = req.query.search || '';
    const offset = (page - 1) * limit;

    console.log(`[ETIQUETAS] Consultando etiquetas - Página: ${page}, Búsqueda: "${search}"`);

    // Consulta con búsqueda y paginación
    let whereClause = '';
    let params = {};
    
    if (search) {
      whereClause = 'WHERE e.nombre LIKE @search';
      params.search = `%${search}%`;
    }

    // Consulta principal con información de cursos
    const query = `
      SELECT 
        e.id_etiqueta,
        e.nombre,
        COUNT(ce.id_curso) as total_cursos,
        COUNT(CASE WHEN c.estatus = 'publicado' THEN 1 END) as cursos_publicados,
        COUNT(CASE WHEN c.estatus = 'borrador' THEN 1 END) as cursos_borrador,
        COUNT(CASE WHEN c.estatus = 'inactivo' THEN 1 END) as cursos_inactivos
      FROM Etiquetas e
      LEFT JOIN Curso_Etiqueta ce ON e.id_etiqueta = ce.id_etiqueta
      LEFT JOIN Cursos c ON ce.id_curso = c.id_curso
      ${whereClause}
      GROUP BY e.id_etiqueta, e.nombre
      ORDER BY e.id_etiqueta
      OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY
    `;

    params.offset = offset;
    params.limit = limit;

    const result = await db.executeQuery(query, params);

    // Consulta para contar total de registros
    const countQuery = `
      SELECT COUNT(*) as total
      FROM Etiquetas e
      ${whereClause}
    `;

    const countParams = search ? { search: `%${search}%` } : {};
    const countResult = await db.executeQuery(countQuery, countParams);
    const totalRecords = countResult.recordset[0].total;
    const totalPages = Math.ceil(totalRecords / limit);

    // Estadísticas generales
    const statsQuery = `
      SELECT 
        (SELECT COUNT(*) FROM Etiquetas) as total_etiquetas,
        (SELECT COUNT(DISTINCT e.id_etiqueta) 
         FROM Etiquetas e 
         INNER JOIN Curso_Etiqueta ce ON e.id_etiqueta = ce.id_etiqueta) as etiquetas_en_uso,
        (SELECT COUNT(*) 
         FROM Etiquetas e 
         WHERE NOT EXISTS(SELECT 1 FROM Curso_Etiqueta ce WHERE ce.id_etiqueta = e.id_etiqueta)) as etiquetas_sin_uso,
        (SELECT COUNT(*) FROM Curso_Etiqueta) as total_asignaciones,
        (SELECT COUNT(DISTINCT ce.id_curso) FROM Curso_Etiqueta ce) as cursos_etiquetados
    `;

    const statsResult = await db.executeQuery(statsQuery);
    const stats = statsResult.recordset[0];

    console.log(`[ETIQUETAS] ✅ Consulta exitosa - ${result.recordset.length} etiquetas encontradas`);

    res.render('admin/etiquetas-admin', {
      title: 'Gestión de Etiquetas',
      etiquetas: result.recordset,
      currentPage: page,
      totalPages: totalPages,
      totalRecords: totalRecords,
      search: search,
      limit: limit,
      stats: stats,
      layout: false
    });

  } catch (error) {
    console.error('[ETIQUETAS] ❌ Error consultando etiquetas:', error);
    res.status(500).render('shared/error', {
      message: 'Error al cargar las etiquetas',
      error: req.app.get('env') === 'development' ? error : {}
    });
  }
});

/* POST - Crear nueva etiqueta */
router.post('/', async function(req, res, next) {
  try {
    const db = req.app.locals.db;
    const { nombre } = req.body;

    // Validaciones
    if (!nombre || nombre.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'El nombre de la etiqueta es obligatorio'
      });
    }

    if (nombre.length > 50) {
      return res.status(400).json({
        success: false,
        message: 'El nombre no puede exceder 50 caracteres'
      });
    }

    // Validar formato (solo letras, números, espacios y guiones)
    const formatoValido = /^[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ0-9\s\-]+$/.test(nombre.trim());
    if (!formatoValido) {
      return res.status(400).json({
        success: false,
        message: 'La etiqueta solo puede contener letras, números, espacios y guiones'
      });
    }

    console.log(`[ETIQUETAS] Creando nueva etiqueta: "${nombre}"`);

    // Verificar que no exista una etiqueta con el mismo nombre
    const existingQuery = 'SELECT id_etiqueta FROM Etiquetas WHERE LOWER(nombre) = LOWER(@nombre)';
    const existingResult = await db.executeQuery(existingQuery, { nombre: nombre.trim() });

    if (existingResult.recordset.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Ya existe una etiqueta con ese nombre'
      });
    }

    // Crear la etiqueta
    const insertQuery = `
      INSERT INTO Etiquetas (nombre)
      OUTPUT INSERTED.id_etiqueta, INSERTED.nombre
      VALUES (@nombre)
    `;

    const result = await db.executeQuery(insertQuery, {
      nombre: nombre.trim()
    });

    const newEtiqueta = result.recordset[0];
    console.log(`[ETIQUETAS] ✅ Etiqueta creada exitosamente - ID: ${newEtiqueta.id_etiqueta}`);

    res.json({
      success: true,
      message: 'Etiqueta creada exitosamente',
      etiqueta: newEtiqueta
    });

  } catch (error) {
    console.error('[ETIQUETAS] ❌ Error creando etiqueta:', error);
    
    if (error.number === 2627) { // Duplicate key error
      return res.status(400).json({
        success: false,
        message: 'Ya existe una etiqueta con ese nombre'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

/* GET - Obtener etiqueta específica */
router.get('/:id', async function(req, res, next) {
  try {
    const db = req.app.locals.db;
    const etiquetaId = parseInt(req.params.id);

    if (isNaN(etiquetaId)) {
      return res.status(400).json({
        success: false,
        message: 'ID de etiqueta inválido'
      });
    }

    console.log(`[ETIQUETAS] Consultando etiqueta ID: ${etiquetaId}`);

    const query = `
      SELECT 
        e.id_etiqueta,
        e.nombre,
        COUNT(ce.id_curso) as total_cursos,
        COUNT(CASE WHEN c.estatus = 'publicado' THEN 1 END) as cursos_publicados,
        COUNT(CASE WHEN c.estatus = 'borrador' THEN 1 END) as cursos_borrador
      FROM Etiquetas e
      LEFT JOIN Curso_Etiqueta ce ON e.id_etiqueta = ce.id_etiqueta
      LEFT JOIN Cursos c ON ce.id_curso = c.id_curso
      WHERE e.id_etiqueta = @id
      GROUP BY e.id_etiqueta, e.nombre
    `;

    const result = await db.executeQuery(query, { id: etiquetaId });

    if (result.recordset.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Etiqueta no encontrada'
      });
    }

    const etiqueta = result.recordset[0];
    console.log(`[ETIQUETAS] ✅ Etiqueta encontrada: "${etiqueta.nombre}"`);

    res.json({
      success: true,
      etiqueta: etiqueta
    });

  } catch (error) {
    console.error('[ETIQUETAS] ❌ Error consultando etiqueta:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

/* PUT - Actualizar etiqueta */
router.put('/:id', async function(req, res, next) {
  try {
    const db = req.app.locals.db;
    const etiquetaId = parseInt(req.params.id);
    const { nombre } = req.body;

    if (isNaN(etiquetaId)) {
      return res.status(400).json({
        success: false,
        message: 'ID de etiqueta inválido'
      });
    }

    // Validaciones
    if (!nombre || nombre.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'El nombre de la etiqueta es obligatorio'
      });
    }

    if (nombre.length > 50) {
      return res.status(400).json({
        success: false,
        message: 'El nombre no puede exceder 50 caracteres'
      });
    }

    // Validar formato
    const formatoValido = /^[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ0-9\s\-]+$/.test(nombre.trim());
    if (!formatoValido) {
      return res.status(400).json({
        success: false,
        message: 'La etiqueta solo puede contener letras, números, espacios y guiones'
      });
    }

    console.log(`[ETIQUETAS] Actualizando etiqueta ID: ${etiquetaId}`);

    // Verificar que la etiqueta existe
    const existsQuery = 'SELECT id_etiqueta FROM Etiquetas WHERE id_etiqueta = @id';
    const existsResult = await db.executeQuery(existsQuery, { id: etiquetaId });

    if (existsResult.recordset.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Etiqueta no encontrada'
      });
    }

    // Verificar que no exista otra etiqueta con el mismo nombre
    const duplicateQuery = `
      SELECT id_etiqueta 
      FROM Etiquetas 
      WHERE LOWER(nombre) = LOWER(@nombre) AND id_etiqueta != @id
    `;
    const duplicateResult = await db.executeQuery(duplicateQuery, { 
      nombre: nombre.trim(), 
      id: etiquetaId 
    });

    if (duplicateResult.recordset.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Ya existe otra etiqueta con ese nombre'
      });
    }

    // Actualizar la etiqueta
    const updateQuery = `
      UPDATE Etiquetas 
      SET nombre = @nombre
      OUTPUT INSERTED.id_etiqueta, INSERTED.nombre
      WHERE id_etiqueta = @id
    `;

    const result = await db.executeQuery(updateQuery, {
      id: etiquetaId,
      nombre: nombre.trim()
    });

    const updatedEtiqueta = result.recordset[0];
    console.log(`[ETIQUETAS] ✅ Etiqueta actualizada exitosamente - ID: ${etiquetaId}`);

    res.json({
      success: true,
      message: 'Etiqueta actualizada exitosamente',
      etiqueta: updatedEtiqueta
    });

  } catch (error) {
    console.error('[ETIQUETAS] ❌ Error actualizando etiqueta:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

/* DELETE - Eliminar etiqueta */
router.delete('/:id', async function(req, res, next) {
  try {
    const db = req.app.locals.db;
    const etiquetaId = parseInt(req.params.id);

    if (isNaN(etiquetaId)) {
      return res.status(400).json({
        success: false,
        message: 'ID de etiqueta inválido'
      });
    }

    console.log(`[ETIQUETAS] Eliminando etiqueta ID: ${etiquetaId}`);

    // Verificar que la etiqueta existe y obtener información
    const existsQuery = `
      SELECT 
        e.id_etiqueta,
        e.nombre,
        COUNT(ce.id_curso) as total_cursos
      FROM Etiquetas e
      LEFT JOIN Curso_Etiqueta ce ON e.id_etiqueta = ce.id_etiqueta
      WHERE e.id_etiqueta = @id
      GROUP BY e.id_etiqueta, e.nombre
    `;
    const existsResult = await db.executeQuery(existsQuery, { id: etiquetaId });

    if (existsResult.recordset.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Etiqueta no encontrada'
      });
    }

    const etiqueta = existsResult.recordset[0];

    // Las etiquetas pueden eliminarse aunque tengan cursos (se eliminan las relaciones automáticamente por CASCADE)
    const deleteQuery = 'DELETE FROM Etiquetas WHERE id_etiqueta = @id';
    await db.executeQuery(deleteQuery, { id: etiquetaId });

    console.log(`[ETIQUETAS] ✅ Etiqueta eliminada exitosamente: "${etiqueta.nombre}" (${etiqueta.total_cursos} cursos desvinculados)`);

    res.json({
      success: true,
      message: `Etiqueta "${etiqueta.nombre}" eliminada exitosamente${etiqueta.total_cursos > 0 ? ` (${etiqueta.total_cursos} cursos desvinculados)` : ''}`
    });

  } catch (error) {
    console.error('[ETIQUETAS] ❌ Error eliminando etiqueta:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

/* GET - Obtener todas las etiquetas para selects */
router.get('/api/list', async function(req, res, next) {
  try {
    const db = req.app.locals.db;

    console.log('[ETIQUETAS] Consultando lista de etiquetas para select');

    const query = `
      SELECT 
        e.id_etiqueta,
        e.nombre,
        COUNT(ce.id_curso) as total_cursos
      FROM Etiquetas e
      LEFT JOIN Curso_Etiqueta ce ON e.id_etiqueta = ce.id_etiqueta
      GROUP BY e.id_etiqueta, e.nombre
      ORDER BY e.nombre
    `;

    const result = await db.executeQuery(query);

    console.log(`[ETIQUETAS] ✅ ${result.recordset.length} etiquetas consultadas para lista`);

    res.json({
      success: true,
      etiquetas: result.recordset
    });

  } catch (error) {
    console.error('[ETIQUETAS] ❌ Error consultando lista de etiquetas:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

/* POST - Crear múltiples etiquetas en lote */
router.post('/batch', async function(req, res, next) {
  try {
    const db = req.app.locals.db;
    const { etiquetas } = req.body;

    if (!etiquetas || !Array.isArray(etiquetas) || etiquetas.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Debe proporcionar un array de etiquetas'
      });
    }

    console.log(`[ETIQUETAS] Creando ${etiquetas.length} etiquetas en lote`);

    const resultados = [];
    const errores = [];

    for (const nombreEtiqueta of etiquetas) {
      try {
        const nombre = nombreEtiqueta.trim();
        
        if (!nombre || nombre.length === 0) {
          errores.push(`Etiqueta vacía ignorada`);
          continue;
        }

        if (nombre.length > 50) {
          errores.push(`"${nombre}" excede 50 caracteres`);
          continue;
        }

        const formatoValido = /^[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ0-9\s\-]+$/.test(nombre);
        if (!formatoValido) {
          errores.push(`"${nombre}" contiene caracteres inválidos`);
          continue;
        }

        // Verificar duplicados
        const existingQuery = 'SELECT id_etiqueta FROM Etiquetas WHERE LOWER(nombre) = LOWER(@nombre)';
        const existingResult = await db.executeQuery(existingQuery, { nombre });

        if (existingResult.recordset.length > 0) {
          errores.push(`"${nombre}" ya existe`);
          continue;
        }

        // Crear etiqueta
        const insertQuery = `
          INSERT INTO Etiquetas (nombre)
          OUTPUT INSERTED.id_etiqueta, INSERTED.nombre
          VALUES (@nombre)
        `;

        const result = await db.executeQuery(insertQuery, { nombre });
        resultados.push(result.recordset[0]);

      } catch (error) {
        errores.push(`Error con "${nombreEtiqueta}": ${error.message}`);
      }
    }

    console.log(`[ETIQUETAS] ✅ Lote procesado - ${resultados.length} creadas, ${errores.length} errores`);

    res.json({
      success: true,
      message: `Procesadas ${resultados.length} etiquetas exitosamente`,
      etiquetas_creadas: resultados,
      errores: errores
    });

  } catch (error) {
    console.error('[ETIQUETAS] ❌ Error en creación por lote:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

module.exports = router;