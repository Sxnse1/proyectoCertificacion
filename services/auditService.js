/**
 * 🔍 AUDIT SERVICE - STARTEDUCATION
 * ============================================================
 * Servicio centralizado para registrar logs de auditoría
 * de todas las acciones sensibles realizadas en el panel admin
 * ============================================================
 */

/**
 * Registra una acción de auditoría en la base de datos
 * @param {Object} options - Opciones del log de auditoría
 * @param {number} options.usuarioId - ID del usuario que realizó la acción
 * @param {string} options.accion - Descripción de la acción (ej: 'USUARIO_CREADO')
 * @param {string} options.entidad - Tipo de entidad afectada (ej: 'Usuario')
 * @param {number|null} options.entidadId - ID de la entidad afectada (opcional)
 * @param {Object|string|null} options.detalles - Detalles adicionales (se convertirá a JSON)
 * @param {string|null} options.ip - Dirección IP del usuario (opcional)
 * @param {Object} db - Instancia de conexión a la base de datos
 * @returns {Promise<Object>} Resultado de la inserción
 */
async function logAction(options, db) {
    try {
        const {
            usuarioId,
            accion,
            entidad,
            entidadId = null,
            detalles = null,
            ip = null
        } = options;

        // Validaciones básicas
        if (!usuarioId || !accion || !entidad) {
            throw new Error('Los campos usuarioId, accion y entidad son obligatorios');
        }

        // Validar que la acción siga el formato convencional
        if (!accion.match(/^[A-Z_]+$/)) {
            console.warn('[AUDIT] ⚠️ Formato de acción no convencional:', accion);
        }

        // Convertir detalles a JSON string si es un objeto
        let detallesJson = null;
        if (detalles) {
            if (typeof detalles === 'string') {
                detallesJson = detalles;
            } else {
                detallesJson = JSON.stringify(detalles, null, 2);
            }
        }

        // Validar longitud de campos
        if (accion.length > 100) {
            throw new Error('La acción no puede exceder 100 caracteres');
        }
        if (entidad.length > 50) {
            throw new Error('La entidad no puede exceder 50 caracteres');
        }
        if (ip && ip.length > 50) {
            throw new Error('La IP no puede exceder 50 caracteres');
        }

        console.log('[AUDIT] 📝 Registrando acción:', {
            usuarioId,
            accion,
            entidad,
            entidadId,
            ip: ip || 'No disponible',
            detallesLength: detallesJson?.length || 0
        });

        // Insertar en la base de datos
        const query = `
      INSERT INTO AuditLogs (UsuarioID, Accion, Entidad, EntidadID, Detalles, IP)
      OUTPUT INSERTED.LogID, INSERTED.Timestamp
      VALUES (@usuarioId, @accion, @entidad, @entidadId, @detalles, @ip)
    `;

        const params = {
            usuarioId,
            accion,
            entidad,
            entidadId,
            detalles: detallesJson,
            ip
        };

        const result = await db.executeQuery(query, params);

        const insertedLog = result.recordset[0];

        console.log('[AUDIT] ✅ Log de auditoría registrado exitosamente:', {
            logId: insertedLog.LogID,
            timestamp: insertedLog.Timestamp,
            accion,
            entidad
        });

        return {
            success: true,
            logId: insertedLog.LogID,
            timestamp: insertedLog.Timestamp,
            message: 'Log de auditoría registrado exitosamente'
        };

    } catch (error) {
        console.error('[AUDIT] ❌ Error registrando log de auditoría:', error);
        console.error('[AUDIT] 📊 Datos que causaron el error:', {
            usuarioId: options.usuarioId,
            accion: options.accion,
            entidad: options.entidad,
            entidadId: options.entidadId
        });

        // Re-lanzar el error para que el caller pueda manejarlo
        throw error;
    }
}

/**
 * Obtiene los logs de auditoría con información del usuario
 * @param {Object} filters - Filtros opcionales
 * @param {number|null} filters.usuarioId - Filtrar por usuario específico
 * @param {string|null} filters.entidad - Filtrar por tipo de entidad
 * @param {string|null} filters.accion - Filtrar por acción específica
 * @param {number} filters.limit - Límite de resultados (default: 100)
 * @param {number} filters.offset - Offset para paginación (default: 0)
 * @param {Object} db - Instancia de conexión a la base de datos
 * @returns {Promise<Array>} Array de logs de auditoría
 */
async function getLogs(filters = {}, db) {
    try {
        const {
            usuarioId = null,
            entidad = null,
            accion = null,
            limit = 100,
            offset = 0
        } = filters;

        console.log('[AUDIT] 🔍 Consultando logs de auditoría:', filters);

        // Construir query con filtros dinámicos
        let whereClause = '1=1';
        const params = {
            limit,
            offset
        };

        if (usuarioId) {
            whereClause += ' AND al.UsuarioID = @usuarioId';
            params.usuarioId = usuarioId;
        }

        if (entidad) {
            whereClause += ' AND al.Entidad = @entidad';
            params.entidad = entidad;
        }

        if (accion) {
            whereClause += ' AND al.Accion = @accion';
            params.accion = accion;
        }

        const query = `
      SELECT 
        al.LogID,
        al.UsuarioID,
        u.nombre as UsuarioNombre,
        u.email as UsuarioEmail,
        al.Accion,
        al.Entidad,
        al.EntidadID,
        al.Detalles,
        al.IP,
        al.Timestamp
      FROM AuditLogs al
      INNER JOIN Usuarios u ON al.UsuarioID = u.id_usuario
      WHERE ${whereClause}
      ORDER BY al.Timestamp DESC
      OFFSET @offset ROWS
      FETCH NEXT @limit ROWS ONLY
    `;

        const result = await db.executeQuery(query, params);

        console.log('[AUDIT] ✅ Logs consultados exitosamente:', result.recordset.length, 'registros');

        return result.recordset.map(log => ({
            ...log,
            // Parsear detalles JSON si existe
            DetallesParsed: log.Detalles ? tryParseJSON(log.Detalles) : null
        }));

    } catch (error) {
        console.error('[AUDIT] ❌ Error consultando logs de auditoría:', error);
        throw error;
    }
}

/**
 * Obtiene estadísticas de auditoría
 * @param {Object} db - Instancia de conexión a la base de datos
 * @returns {Promise<Object>} Estadísticas de auditoría
 */
async function getAuditStats(db) {
    try {
        console.log('[AUDIT] 📊 Consultando estadísticas de auditoría...');

    // Ejecutar consultas por separado para compatibilidad con executeQuery
    const resumenQuery = `
      SELECT 
        COUNT(*) as TotalLogs,
        COUNT(DISTINCT UsuarioID) as UsuariosActivos,
        COUNT(DISTINCT Entidad) as TiposEntidad,
        MIN(Timestamp) as PrimerLog,
        MAX(Timestamp) as UltimoLog
      FROM AuditLogs
    `;

    const usuariosActivosQuery = `
      SELECT TOP 5
        u.nombre as Usuario,
        u.email as Email,
        COUNT(*) as AccionesRealizadas 
      FROM AuditLogs al
      INNER JOIN Usuarios u ON al.UsuarioID = u.id_usuario
      GROUP BY u.nombre, u.email
      ORDER BY COUNT(*) DESC
    `;

    const accionesComunesQuery = `
      SELECT TOP 5
        Accion,
        COUNT(*) as Frecuencia
      FROM AuditLogs
      GROUP BY Accion
      ORDER BY COUNT(*) DESC
    `;

    const logsPorEntidadQuery = `
      SELECT 
        Entidad,
        COUNT(*) as CantidadLogs
      FROM AuditLogs
      GROUP BY Entidad
      ORDER BY COUNT(*) DESC
    `;

    // Ejecutar todas las consultas
    const [resumenResult, usuariosResult, accionesResult, entidadesResult] = await Promise.all([
      db.executeQuery(resumenQuery),
      db.executeQuery(usuariosActivosQuery),
      db.executeQuery(accionesComunesQuery),
      db.executeQuery(logsPorEntidadQuery)
    ]);
    
    const stats = {
      resumen: resumenResult.recordset[0],
      usuariosMasActivos: usuariosResult.recordset,
      accionesMasComunes: accionesResult.recordset,
      logsPorEntidad: entidadesResult.recordset
    };        console.log('[AUDIT] ✅ Estadísticas consultadas exitosamente');
        return stats;

    } catch (error) {
        console.error('[AUDIT] ❌ Error consultando estadísticas:', error);
        throw error;
    }
}

/**
 * Función helper para parsear JSON de forma segura
 * @param {string} jsonString - String JSON a parsear
 * @returns {Object|null} Objeto parseado o null si falla
 */
function tryParseJSON(jsonString) {
    try {
        return JSON.parse(jsonString);
    } catch (error) {
        console.warn('[AUDIT] ⚠️ Error parseando JSON:', error.message);
        return null;
    }
}

/**
 * Constantes para acciones de auditoría estandarizadas
 */
const AUDIT_ACTIONS = {
    // Acciones de Usuario
    USUARIO_CREADO: 'USUARIO_CREADO',
    USUARIO_ACTUALIZADO: 'USUARIO_ACTUALIZADO',
    USUARIO_ELIMINADO: 'USUARIO_ELIMINADO',
    USUARIO_SUSPENDIDO: 'USUARIO_SUSPENDIDO',
    USUARIO_REACTIVADO: 'USUARIO_REACTIVADO',

    // Acciones de Curso
    CURSO_CREADO: 'CURSO_CREADO',
    CURSO_ACTUALIZADO: 'CURSO_ACTUALIZADO',
    CURSO_ELIMINADO: 'CURSO_ELIMINADO',
    CURSO_PUBLICADO: 'CURSO_PUBLICADO',
    CURSO_DESPUBLICADO: 'CURSO_DESPUBLICADO',

    // Acciones de Membresía
    MEMBRESIA_CREADA: 'MEMBRESIA_CREADA',
    MEMBRESIA_ACTUALIZADA: 'MEMBRESIA_ACTUALIZADA',
    MEMBRESIA_ELIMINADA: 'MEMBRESIA_ELIMINADA',
    MEMBRESIA_PRECIO_CAMBIADO: 'MEMBRESIA_PRECIO_CAMBIADO',

    // Acciones de Video
    VIDEO_CREADO: 'VIDEO_CREADO',
    VIDEO_ACTUALIZADO: 'VIDEO_ACTUALIZADO',
    VIDEO_ELIMINADO: 'VIDEO_ELIMINADO',
    VIDEO_PUBLICADO: 'VIDEO_PUBLICADO',

    // Acciones de Módulo
    MODULO_CREADO: 'MODULO_CREADO',
    MODULO_ACTUALIZADO: 'MODULO_ACTUALIZADO',
    MODULO_ELIMINADO: 'MODULO_ELIMINADO',

    // Acciones de Sistema
    CONFIGURACION_ACTUALIZADA: 'CONFIGURACION_ACTUALIZADA',
    BACKUP_REALIZADO: 'BACKUP_REALIZADO',
    SISTEMA_REINICIADO: 'SISTEMA_REINICIADO'
};

/**
 * Constantes para tipos de entidad
 */
const AUDIT_ENTITIES = {
    USUARIO: 'Usuario',
    CURSO: 'Curso',
    MEMBRESIA: 'Membresia',
    VIDEO: 'Video',
    MODULO: 'Modulo',
    CATEGORIA: 'Categoria',
    ETIQUETA: 'Etiqueta',
    COMPRA: 'Compra',
    CERTIFICADO: 'Certificado',
    SISTEMA: 'Sistema'
};

module.exports = {
    logAction,
    getLogs,
    getAuditStats,
    AUDIT_ACTIONS,
    AUDIT_ENTITIES
};