var express = require('express');
var router = express.Router();

/* GET - Lista de módulos con filtros y paginación */
router.get('/', async function(req, res, next) {
  try {
    const db = req.app.locals.db;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const search = req.query.search || '';
    const cursoFilter = req.query.curso || '';
    const offset = (page - 1) * limit;

    console.log(`[MODULOS] Consultando módulos - Página: ${page}, Búsqueda: "${search}", Curso: "${cursoFilter}"`);

    // Construir consulta con filtros
    let whereClause = '';
    let params = {};
    let conditions = [];
    
    if (search) {
      conditions.push('(m.titulo LIKE @search)');
      params.search = `%${search}%`;
    }

    if (cursoFilter) {
      conditions.push('m.id_curso = @curso');
      params.curso = cursoFilter;
    }

    if (conditions.length > 0) {
      whereClause = 'WHERE ' + conditions.join(' AND ');
    }

    // Consulta principal con información de cursos y videos
    const query = `
      SELECT 
        m.id_modulo,
        m.titulo,
        m.orden,
        m.fecha_modificacion,
        m.id_curso,
        c.titulo as curso_titulo,
        c.estatus as curso_estatus,
        COUNT(v.id_video) as total_videos,
        COUNT(CASE WHEN v.estatus = 'publicado' THEN 1 END) as videos_publicados,
        COUNT(CASE WHEN v.estatus = 'borrador' THEN 1 END) as videos_borrador,
        COUNT(CASE WHEN v.estatus = 'archivado' THEN 1 END) as videos_archivados,
        COALESCE(SUM(v.duracion_segundos), 0) as duracion_total_segundos,
        FORMAT(m.fecha_modificacion, 'dd/MM/yyyy HH:mm') as fecha_modificacion_formateada
      FROM Modulos m
      INNER JOIN Cursos c ON m.id_curso = c.id_curso
      LEFT JOIN Video v ON m.id_modulo = v.id_modulo
      ${whereClause}
      GROUP BY m.id_modulo, m.titulo, m.orden, m.fecha_modificacion, m.id_curso, c.titulo, c.estatus
      ORDER BY c.titulo, m.orden
      OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY
    `;

    params.offset = offset;
    params.limit = limit;

    const result = await db.executeQuery(query, params);

    // Consulta para contar total de registros
    const countQuery = `
      SELECT COUNT(*) as total
      FROM Modulos m
      INNER JOIN Cursos c ON m.id_curso = c.id_curso
      ${whereClause}
    `;

    const countResult = await db.executeQuery(countQuery, params);
    const totalRecords = countResult.recordset[0].total;
    const totalPages = Math.ceil(totalRecords / limit);

    // Obtener lista de cursos para el filtro
    const cursosResult = await db.executeQuery(`
      SELECT id_curso, titulo
      FROM Cursos
      ORDER BY titulo
    `);

    const modulos = result.recordset.map(modulo => ({
      ...modulo,
      duracion_total_minutos: Math.floor(modulo.duracion_total_segundos / 60),
      duracion_display: formatDuration(modulo.duracion_total_segundos)
    }));

    console.log(`[MODULOS] ✅ Módulos encontrados: ${modulos.length} de ${totalRecords} total`);

    res.render('modulos-admin', {
      title: 'Gestión de Módulos',
      modulos: modulos,
      cursos: cursosResult.recordset,
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
        curso: cursoFilter,
        limit: limit
      }
    });

  } catch (error) {
    console.error('[MODULOS] ❌ Error al obtener módulos:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message
    });
  }
});

/* POST - Crear nuevo módulo */
router.post('/', async function(req, res, next) {
  try {
    const db = req.app.locals.db;
    const { titulo, id_curso, orden } = req.body;

    console.log('[MODULOS] 📝 Creando nuevo módulo:', { titulo, id_curso, orden });

    // Validaciones
    if (!titulo || !id_curso) {
      return res.status(400).json({
        success: false,
        message: 'El título y el curso son obligatorios'
      });
    }

    // Verificar que el curso existe
    const cursoCheck = await db.executeQuery(
      'SELECT id_curso FROM Cursos WHERE id_curso = @id_curso',
      { id_curso }
    );

    if (cursoCheck.recordset.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'El curso especificado no existe'
      });
    }

    // Si no se especifica orden, obtener el siguiente disponible
    let ordenFinal = orden;
    if (!ordenFinal) {
      const maxOrdenResult = await db.executeQuery(
        'SELECT ISNULL(MAX(orden), 0) + 1 as siguiente_orden FROM Modulos WHERE id_curso = @id_curso',
        { id_curso }
      );
      ordenFinal = maxOrdenResult.recordset[0].siguiente_orden;
    }

    // Verificar que no existe otro módulo con el mismo orden en el mismo curso
    const ordenCheck = await db.executeQuery(
      'SELECT id_modulo FROM Modulos WHERE id_curso = @id_curso AND orden = @orden',
      { id_curso, orden: ordenFinal }
    );

    if (ordenCheck.recordset.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Ya existe un módulo con ese orden en este curso'
      });
    }

    // Insertar nuevo módulo
    const insertQuery = `
      INSERT INTO Modulos (id_curso, titulo, orden, fecha_modificacion)
      OUTPUT INSERTED.id_modulo
      VALUES (@id_curso, @titulo, @orden, GETDATE())
    `;

    const insertResult = await db.executeQuery(insertQuery, {
      id_curso,
      titulo: titulo.trim(),
      orden: ordenFinal
    });

    const nuevoModuloId = insertResult.recordset[0].id_modulo;

    console.log(`[MODULOS] ✅ Módulo creado exitosamente con ID: ${nuevoModuloId}`);

    res.json({
      success: true,
      message: 'Módulo creado exitosamente',
      modulo: {
        id_modulo: nuevoModuloId,
        titulo: titulo.trim(),
        id_curso,
        orden: ordenFinal
      }
    });

  } catch (error) {
    console.error('[MODULOS] ❌ Error al crear módulo:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message
    });
  }
});

/* PUT - Actualizar módulo */
router.put('/:id', async function(req, res, next) {
  try {
    const db = req.app.locals.db;
    const moduloId = req.params.id;
    const { titulo, orden } = req.body;

    console.log(`[MODULOS] 📝 Actualizando módulo ${moduloId}:`, { titulo, orden });

    // Validaciones
    if (!titulo) {
      return res.status(400).json({
        success: false,
        message: 'El título es obligatorio'
      });
    }

    // Verificar que el módulo existe
    const moduloCheck = await db.executeQuery(
      'SELECT id_modulo, id_curso FROM Modulos WHERE id_modulo = @id_modulo',
      { id_modulo: moduloId }
    );

    if (moduloCheck.recordset.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Módulo no encontrado'
      });
    }

    const modulo = moduloCheck.recordset[0];

    // Si se especifica orden, verificar que no esté ocupado por otro módulo
    if (orden && orden !== modulo.orden) {
      const ordenCheck = await db.executeQuery(
        'SELECT id_modulo FROM Modulos WHERE id_curso = @id_curso AND orden = @orden AND id_modulo != @id_modulo',
        { 
          id_curso: modulo.id_curso, 
          orden: orden,
          id_modulo: moduloId
        }
      );

      if (ordenCheck.recordset.length > 0) {
        return res.status(400).json({
          success: false,
          message: 'Ya existe un módulo con ese orden en este curso'
        });
      }
    }

    // Actualizar módulo
    const updateQuery = `
      UPDATE Modulos 
      SET 
        titulo = @titulo,
        orden = @orden,
        fecha_modificacion = GETDATE()
      WHERE id_modulo = @id_modulo
    `;

    await db.executeQuery(updateQuery, {
      id_modulo: moduloId,
      titulo: titulo.trim(),
      orden: orden || modulo.orden
    });

    console.log(`[MODULOS] ✅ Módulo ${moduloId} actualizado exitosamente`);

    res.json({
      success: true,
      message: 'Módulo actualizado exitosamente'
    });

  } catch (error) {
    console.error(`[MODULOS] ❌ Error al actualizar módulo ${req.params.id}:`, error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message
    });
  }
});

/* DELETE - Eliminar módulo */
router.delete('/:id', async function(req, res, next) {
  try {
    const db = req.app.locals.db;
    const moduloId = req.params.id;

    console.log(`[MODULOS] 🗑️ Eliminando módulo ${moduloId}`);

    // Verificar que el módulo existe y obtener información
    const moduloCheck = await db.executeQuery(`
      SELECT 
        m.id_modulo,
        m.titulo,
        COUNT(v.id_video) as total_videos
      FROM Modulos m
      LEFT JOIN Video v ON m.id_modulo = v.id_modulo
      WHERE m.id_modulo = @id_modulo
      GROUP BY m.id_modulo, m.titulo
    `, { id_modulo: moduloId });

    if (moduloCheck.recordset.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Módulo no encontrado'
      });
    }

    const modulo = moduloCheck.recordset[0];

    // Verificar si tiene videos asociados
    if (modulo.total_videos > 0) {
      return res.status(400).json({
        success: false,
        message: `No se puede eliminar el módulo "${modulo.titulo}" porque tiene ${modulo.total_videos} video(s) asociado(s). Elimine primero los videos.`
      });
    }

    // Eliminar módulo
    await db.executeQuery(
      'DELETE FROM Modulos WHERE id_modulo = @id_modulo',
      { id_modulo: moduloId }
    );

    console.log(`[MODULOS] ✅ Módulo "${modulo.titulo}" eliminado exitosamente`);

    res.json({
      success: true,
      message: `Módulo "${modulo.titulo}" eliminado exitosamente`
    });

  } catch (error) {
    console.error(`[MODULOS] ❌ Error al eliminar módulo ${req.params.id}:`, error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message
    });
  }
});

/* GET - Obtener módulo por ID */
router.get('/:id', async function(req, res, next) {
  try {
    const db = req.app.locals.db;
    const moduloId = req.params.id;

    console.log(`[MODULOS] 📖 Obteniendo módulo ${moduloId}`);

    const query = `
      SELECT 
        m.id_modulo,
        m.titulo,
        m.orden,
        m.fecha_modificacion,
        m.id_curso,
        c.titulo as curso_titulo,
        c.estatus as curso_estatus,
        COUNT(v.id_video) as total_videos,
        COUNT(CASE WHEN v.estatus = 'publicado' THEN 1 END) as videos_publicados,
        COUNT(CASE WHEN v.estatus = 'borrador' THEN 1 END) as videos_borrador,
        COUNT(CASE WHEN v.estatus = 'archivado' THEN 1 END) as videos_archivados,
        COALESCE(SUM(v.duracion_segundos), 0) as duracion_total_segundos
      FROM Modulos m
      INNER JOIN Cursos c ON m.id_curso = c.id_curso
      LEFT JOIN Video v ON m.id_modulo = v.id_modulo
      WHERE m.id_modulo = @id_modulo
      GROUP BY m.id_modulo, m.titulo, m.orden, m.fecha_modificacion, m.id_curso, c.titulo, c.estatus
    `;

    const result = await db.executeQuery(query, { id_modulo: moduloId });

    if (result.recordset.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Módulo no encontrado'
      });
    }

    const modulo = result.recordset[0];
    modulo.duracion_total_minutos = Math.floor(modulo.duracion_total_segundos / 60);
    modulo.duracion_display = formatDuration(modulo.duracion_total_segundos);

    console.log(`[MODULOS] ✅ Módulo encontrado: ${modulo.titulo}`);

    res.json({
      success: true,
      modulo: modulo
    });

  } catch (error) {
    console.error(`[MODULOS] ❌ Error al obtener módulo ${req.params.id}:`, error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message
    });
  }
});

/* POST - Reordenar módulos */
router.post('/reorder', async function(req, res, next) {
  try {
    const db = req.app.locals.db;
    const { modulos } = req.body; // Array de { id_modulo, nuevo_orden }

    console.log('[MODULOS] 🔄 Reordenando módulos:', modulos);

    if (!modulos || !Array.isArray(modulos)) {
      return res.status(400).json({
        success: false,
        message: 'Se requiere un array de módulos para reordenar'
      });
    }

    // Iniciar transacción
    await db.executeQuery('BEGIN TRANSACTION');

    try {
      // Actualizar orden de cada módulo
      for (const item of modulos) {
        await db.executeQuery(`
          UPDATE Modulos 
          SET orden = @orden, fecha_modificacion = GETDATE()
          WHERE id_modulo = @id_modulo
        `, {
          id_modulo: item.id_modulo,
          orden: item.nuevo_orden
        });
      }

      // Confirmar transacción
      await db.executeQuery('COMMIT TRANSACTION');

      console.log('[MODULOS] ✅ Módulos reordenados exitosamente');

      res.json({
        success: true,
        message: 'Módulos reordenados exitosamente'
      });

    } catch (error) {
      // Rollback en caso de error
      await db.executeQuery('ROLLBACK TRANSACTION');
      throw error;
    }

  } catch (error) {
    console.error('[MODULOS] ❌ Error al reordenar módulos:', error);
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