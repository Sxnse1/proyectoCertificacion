var express = require('express');
var router = express.Router();

/* GET - Lista de categorías con filtros y paginación */
router.get('/', async function(req, res, next) {
  try {
    const db = req.app.locals.db;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const search = req.query.search || '';
    const offset = (page - 1) * limit;

    console.log(`[CATEGORIAS] Consultando categorías - Página: ${page}, Búsqueda: "${search}"`);

    // Consulta con búsqueda y paginación
    let whereClause = '';
    let params = {};
    
    if (search) {
      whereClause = 'WHERE (nombre LIKE @search OR descripcion LIKE @search)';
      params.search = `%${search}%`;
    }

    // Consulta principal con información de cursos
    const query = `
      SELECT 
        c.id_categoria,
        c.nombre,
        c.descripcion,
        COUNT(cu.id_curso) as total_cursos,
        COUNT(CASE WHEN cu.estatus = 'publicado' THEN 1 END) as cursos_publicados,
        COUNT(CASE WHEN cu.estatus = 'borrador' THEN 1 END) as cursos_borrador,
        COUNT(CASE WHEN cu.estatus = 'inactivo' THEN 1 END) as cursos_inactivos
      FROM Categorias c
      LEFT JOIN Cursos cu ON c.id_categoria = cu.id_categoria
      ${whereClause}
      GROUP BY c.id_categoria, c.nombre, c.descripcion
      ORDER BY c.nombre
      OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY
    `;

    params.offset = offset;
    params.limit = limit;

    const result = await db.executeQuery(query, params);

    // Consulta para contar total de registros
    const countQuery = `
      SELECT COUNT(*) as total
      FROM Categorias c
      ${whereClause}
    `;

    const countParams = search ? { search: `%${search}%` } : {};
    const countResult = await db.executeQuery(countQuery, countParams);
    const totalRecords = countResult.recordset[0].total;
    const totalPages = Math.ceil(totalRecords / limit);

    // Estadísticas generales
    const statsQuery = `
      SELECT 
        (SELECT COUNT(*) FROM Categorias) as total_categorias,
        (SELECT COUNT(DISTINCT c.id_categoria) 
         FROM Categorias c 
         INNER JOIN Cursos cu ON c.id_categoria = cu.id_categoria) as categorias_con_cursos,
        (SELECT COUNT(*) 
         FROM Categorias c 
         WHERE NOT EXISTS(SELECT 1 FROM Cursos cu WHERE cu.id_categoria = c.id_categoria)) as categorias_vacias,
        (SELECT COUNT(*) FROM Cursos WHERE estatus = 'publicado') as total_cursos_publicados,
        (SELECT COUNT(*) FROM Cursos WHERE estatus = 'borrador') as total_cursos_borrador
    `;

    const statsResult = await db.executeQuery(statsQuery);
    const stats = statsResult.recordset[0];

    console.log(`[CATEGORIAS] ✅ Consulta exitosa - ${result.recordset.length} categorías encontradas`);

    res.render('categorias-admin', {
      title: 'Gestión de Categorías',
      categorias: result.recordset,
      currentPage: page,
      totalPages: totalPages,
      totalRecords: totalRecords,
      search: search,
      limit: limit,
      stats: stats,
      layout: false
    });

  } catch (error) {
    console.error('[CATEGORIAS] ❌ Error consultando categorías:', error);
    res.status(500).render('error', {
      message: 'Error al cargar las categorías',
      error: req.app.get('env') === 'development' ? error : {}
    });
  }
});

/* POST - Crear nueva categoría */
router.post('/', async function(req, res, next) {
  try {
    const db = req.app.locals.db;
    const { nombre, descripcion } = req.body;

    // Validaciones
    if (!nombre || nombre.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'El nombre de la categoría es obligatorio'
      });
    }

    if (nombre.length > 100) {
      return res.status(400).json({
        success: false,
        message: 'El nombre no puede exceder 100 caracteres'
      });
    }

    console.log(`[CATEGORIAS] Creando nueva categoría: "${nombre}"`);

    // Verificar que no exista una categoría con el mismo nombre
    const existingQuery = 'SELECT id_categoria FROM Categorias WHERE LOWER(nombre) = LOWER(@nombre)';
    const existingResult = await db.executeQuery(existingQuery, { nombre: nombre.trim() });

    if (existingResult.recordset.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Ya existe una categoría con ese nombre'
      });
    }

    // Crear la categoría
    const insertQuery = `
      INSERT INTO Categorias (nombre, descripcion)
      OUTPUT INSERTED.id_categoria, INSERTED.nombre, INSERTED.descripcion
      VALUES (@nombre, @descripcion)
    `;

    const result = await db.executeQuery(insertQuery, {
      nombre: nombre.trim(),
      descripcion: descripcion ? descripcion.trim() : null
    });

    const newCategoria = result.recordset[0];
    console.log(`[CATEGORIAS] ✅ Categoría creada exitosamente - ID: ${newCategoria.id_categoria}`);

    res.json({
      success: true,
      message: 'Categoría creada exitosamente',
      categoria: newCategoria
    });

  } catch (error) {
    console.error('[CATEGORIAS] ❌ Error creando categoría:', error);
    
    if (error.number === 2627) { // Duplicate key error
      return res.status(400).json({
        success: false,
        message: 'Ya existe una categoría con ese nombre'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

/* GET - Obtener categoría específica */
router.get('/:id', async function(req, res, next) {
  try {
    const db = req.app.locals.db;
    const categoriaId = parseInt(req.params.id);

    if (isNaN(categoriaId)) {
      return res.status(400).json({
        success: false,
        message: 'ID de categoría inválido'
      });
    }

    console.log(`[CATEGORIAS] Consultando categoría ID: ${categoriaId}`);

    const query = `
      SELECT 
        c.id_categoria,
        c.nombre,
        c.descripcion,
        COUNT(cu.id_curso) as total_cursos,
        COUNT(CASE WHEN cu.estatus = 'publicado' THEN 1 END) as cursos_publicados,
        COUNT(CASE WHEN cu.estatus = 'borrador' THEN 1 END) as cursos_borrador
      FROM Categorias c
      LEFT JOIN Cursos cu ON c.id_categoria = cu.id_categoria
      WHERE c.id_categoria = @id
      GROUP BY c.id_categoria, c.nombre, c.descripcion
    `;

    const result = await db.executeQuery(query, { id: categoriaId });

    if (result.recordset.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Categoría no encontrada'
      });
    }

    const categoria = result.recordset[0];
    console.log(`[CATEGORIAS] ✅ Categoría encontrada: "${categoria.nombre}"`);

    res.json({
      success: true,
      categoria: categoria
    });

  } catch (error) {
    console.error('[CATEGORIAS] ❌ Error consultando categoría:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

/* PUT - Actualizar categoría */
router.put('/:id', async function(req, res, next) {
  try {
    const db = req.app.locals.db;
    const categoriaId = parseInt(req.params.id);
    const { nombre, descripcion } = req.body;

    if (isNaN(categoriaId)) {
      return res.status(400).json({
        success: false,
        message: 'ID de categoría inválido'
      });
    }

    // Validaciones
    if (!nombre || nombre.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'El nombre de la categoría es obligatorio'
      });
    }

    if (nombre.length > 100) {
      return res.status(400).json({
        success: false,
        message: 'El nombre no puede exceder 100 caracteres'
      });
    }

    console.log(`[CATEGORIAS] Actualizando categoría ID: ${categoriaId}`);

    // Verificar que la categoría existe
    const existsQuery = 'SELECT id_categoria FROM Categorias WHERE id_categoria = @id';
    const existsResult = await db.executeQuery(existsQuery, { id: categoriaId });

    if (existsResult.recordset.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Categoría no encontrada'
      });
    }

    // Verificar que no exista otra categoría con el mismo nombre
    const duplicateQuery = `
      SELECT id_categoria 
      FROM Categorias 
      WHERE LOWER(nombre) = LOWER(@nombre) AND id_categoria != @id
    `;
    const duplicateResult = await db.executeQuery(duplicateQuery, { 
      nombre: nombre.trim(), 
      id: categoriaId 
    });

    if (duplicateResult.recordset.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Ya existe otra categoría con ese nombre'
      });
    }

    // Actualizar la categoría
    const updateQuery = `
      UPDATE Categorias 
      SET 
        nombre = @nombre,
        descripcion = @descripcion
      OUTPUT INSERTED.id_categoria, INSERTED.nombre, INSERTED.descripcion
      WHERE id_categoria = @id
    `;

    const result = await db.executeQuery(updateQuery, {
      id: categoriaId,
      nombre: nombre.trim(),
      descripcion: descripcion ? descripcion.trim() : null
    });

    const updatedCategoria = result.recordset[0];
    console.log(`[CATEGORIAS] ✅ Categoría actualizada exitosamente - ID: ${categoriaId}`);

    res.json({
      success: true,
      message: 'Categoría actualizada exitosamente',
      categoria: updatedCategoria
    });

  } catch (error) {
    console.error('[CATEGORIAS] ❌ Error actualizando categoría:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

/* DELETE - Eliminar categoría */
router.delete('/:id', async function(req, res, next) {
  try {
    const db = req.app.locals.db;
    const categoriaId = parseInt(req.params.id);

    if (isNaN(categoriaId)) {
      return res.status(400).json({
        success: false,
        message: 'ID de categoría inválido'
      });
    }

    console.log(`[CATEGORIAS] Eliminando categoría ID: ${categoriaId}`);

    // Verificar que la categoría existe
    const existsQuery = `
      SELECT 
        c.id_categoria,
        c.nombre,
        COUNT(cu.id_curso) as total_cursos
      FROM Categorias c
      LEFT JOIN Cursos cu ON c.id_categoria = cu.id_categoria
      WHERE c.id_categoria = @id
      GROUP BY c.id_categoria, c.nombre
    `;
    const existsResult = await db.executeQuery(existsQuery, { id: categoriaId });

    if (existsResult.recordset.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Categoría no encontrada'
      });
    }

    const categoria = existsResult.recordset[0];

    // Verificar si tiene cursos asociados
    if (categoria.total_cursos > 0) {
      return res.status(400).json({
        success: false,
        message: `No se puede eliminar la categoría "${categoria.nombre}" porque tiene ${categoria.total_cursos} curso(s) asociado(s). Primero mueve los cursos a otra categoría.`
      });
    }

    // Eliminar la categoría
    const deleteQuery = 'DELETE FROM Categorias WHERE id_categoria = @id';
    await db.executeQuery(deleteQuery, { id: categoriaId });

    console.log(`[CATEGORIAS] ✅ Categoría eliminada exitosamente: "${categoria.nombre}"`);

    res.json({
      success: true,
      message: `Categoría "${categoria.nombre}" eliminada exitosamente`
    });

  } catch (error) {
    console.error('[CATEGORIAS] ❌ Error eliminando categoría:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

/* GET - Obtener todas las categorías para selects */
router.get('/api/list', async function(req, res, next) {
  try {
    const db = req.app.locals.db;

    console.log('[CATEGORIAS] Consultando lista de categorías para select');

    const query = `
      SELECT 
        id_categoria,
        nombre,
        COUNT(cu.id_curso) as total_cursos
      FROM Categorias c
      LEFT JOIN Cursos cu ON c.id_categoria = cu.id_categoria
      GROUP BY c.id_categoria, c.nombre
      ORDER BY c.nombre
    `;

    const result = await db.executeQuery(query);

    console.log(`[CATEGORIAS] ✅ ${result.recordset.length} categorías consultadas para lista`);

    res.json({
      success: true,
      categorias: result.recordset
    });

  } catch (error) {
    console.error('[CATEGORIAS] ❌ Error consultando lista de categorías:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

module.exports = router;