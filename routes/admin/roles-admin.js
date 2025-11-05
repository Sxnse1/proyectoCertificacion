var express = require('express');
var router = express.Router();
const auditService = require('../../services/auditService');
const { hasPermission, hasAnyPermission } = require('../../middleware/auth');

/* GET - Lista de roles con permisos asignados */
router.get('/', hasPermission('gestionar_roles'), async function(req, res, next) {
  try {
    const db = req.app.locals.db;
    
    console.log('[ROLES] Consultando lista de roles y permisos');
    
    // Obtener todos los roles con sus permisos
    const rolesQuery = `
      SELECT 
        r.RolID,
        r.NombreRol,
        r.Descripcion,
        r.Activo,
        COUNT(rp.PermisoID) as TotalPermisos
      FROM Roles r
      LEFT JOIN RolPermiso rp ON r.RolID = rp.RolID
      GROUP BY r.RolID, r.NombreRol, r.Descripcion, r.Activo
      ORDER BY r.NombreRol
    `;
    
    const rolesResult = await db.executeQuery(rolesQuery);
    const roles = rolesResult.recordset;
    
    // Obtener todos los permisos disponibles para el formulario
    const permisosQuery = `
      SELECT 
        PermisoID,
        NombrePermiso,
        Descripcion,
        Modulo
      FROM Permisos 
      ORDER BY Modulo, NombrePermiso
    `;
    
    const permisosResult = await db.executeQuery(permisosQuery);
    const permisos = permisosResult.recordset;
    
    // Agrupar permisos por módulo
    const permisosPorModulo = {};
    permisos.forEach(permiso => {
      if (!permisosPorModulo[permiso.Modulo]) {
        permisosPorModulo[permiso.Modulo] = [];
      }
      permisosPorModulo[permiso.Modulo].push(permiso);
    });
    
    console.log(`[ROLES] ✅ Consultados ${roles.length} roles y ${permisos.length} permisos`);
    
    res.render('admin/roles-admin', {
      title: 'Gestión de Roles y Permisos',
      roles: roles,
      permisos: permisos,
      permisosPorModulo: permisosPorModulo,
      user: req.session.user,
      activeTab: 'roles'
    });
    
  } catch (error) {
    console.error('[ROLES] ❌ Error consultando roles:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

/* GET - Obtener permisos de un rol específico */
router.get('/:id/permisos', hasPermission('ver_roles'), async function(req, res, next) {
  try {
    const db = req.app.locals.db;
    const rolId = parseInt(req.params.id);
    
    console.log(`[ROLES] Consultando permisos del rol ${rolId}`);
    
    const query = `
      SELECT 
        p.PermisoID,
        p.NombrePermiso,
        p.Descripcion,
        p.Modulo,
        CASE WHEN rp.RolID IS NOT NULL THEN 1 ELSE 0 END as Asignado
      FROM Permisos p
      LEFT JOIN RolPermiso rp ON p.PermisoID = rp.PermisoID AND rp.RolID = @rolId
      ORDER BY p.Modulo, p.NombrePermiso
    `;
    
    const result = await db.executeQuery(query, { rolId: rolId });
    const permisos = result.recordset;
    
    console.log(`[ROLES] ✅ Consultados ${permisos.length} permisos para rol ${rolId}`);
    
    res.json({
      success: true,
      permisos: permisos
    });
    
  } catch (error) {
    console.error('[ROLES] ❌ Error consultando permisos del rol:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

/* POST - Crear nuevo rol */
router.post('/', hasPermission('crear_roles'), async function(req, res, next) {
  try {
    const db = req.app.locals.db;
    const { nombreRol, descripcion, permisos } = req.body;
    const usuarioActual = req.session.user;
    
    console.log(`[ROLES] Creando nuevo rol: ${nombreRol}`);
    
    // Validaciones
    if (!nombreRol || nombreRol.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'El nombre del rol es obligatorio'
      });
    }
    
    // Verificar que el rol no exista
    const existeRol = await db.executeQuery(
      'SELECT RolID FROM Roles WHERE NombreRol = @nombreRol',
      { nombreRol: nombreRol.trim() }
    );
    
    if (existeRol.recordset.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Ya existe un rol con ese nombre'
      });
    }
    
    // Crear el rol
    const insertRolQuery = `
      INSERT INTO Roles (NombreRol, Descripcion, Activo)
      OUTPUT INSERTED.RolID
      VALUES (@nombreRol, @descripcion, 1)
    `;
    
    const rolResult = await db.executeQuery(insertRolQuery, {
      nombreRol: nombreRol.trim(),
      descripcion: descripcion || ''
    });
    
    const nuevoRolId = rolResult.recordset[0].RolID;
    
    // Asignar permisos si se proporcionaron
    if (permisos && Array.isArray(permisos) && permisos.length > 0) {
      const permisosValidos = permisos.filter(p => p && parseInt(p) > 0);
      
      if (permisosValidos.length > 0) {
        const insertPermisosQueries = permisosValidos.map(permisoId => {
          return db.executeQuery(
            'INSERT INTO RolPermiso (RolID, PermisoID) VALUES (@rolId, @permisoId)',
            { rolId: nuevoRolId, permisoId: parseInt(permisoId) }
          );
        });
        
        await Promise.all(insertPermisosQueries);
        console.log(`[ROLES] ✅ Asignados ${permisosValidos.length} permisos al rol ${nombreRol}`);
      }
    }
    
    // Registrar auditoría
    await auditService.logAction(
      usuarioActual.id,
      'CREAR_ROL',
      'Roles',
      nuevoRolId,
      `Rol "${nombreRol}" creado con ${permisos?.length || 0} permisos`,
      req.ip,
      req.get('User-Agent')
    );
    
    console.log(`[ROLES] ✅ Rol "${nombreRol}" creado exitosamente con ID ${nuevoRolId}`);
    
    res.json({
      success: true,
      message: 'Rol creado exitosamente',
      rolId: nuevoRolId
    });
    
  } catch (error) {
    console.error('[ROLES] ❌ Error creando rol:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

/* PUT - Actualizar rol */
router.put('/:id', hasPermission('editar_roles'), async function(req, res, next) {
  try {
    const db = req.app.locals.db;
    const rolId = parseInt(req.params.id);
    const { nombreRol, descripcion, permisos, activo } = req.body;
    const usuarioActual = req.session.user;
    
    console.log(`[ROLES] Actualizando rol ${rolId}: ${nombreRol}`);
    
    // Validaciones
    if (!nombreRol || nombreRol.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'El nombre del rol es obligatorio'
      });
    }
    
    // Verificar que el rol existe
    const rolActual = await db.executeQuery(
      'SELECT NombreRol FROM Roles WHERE RolID = @rolId',
      { rolId: rolId }
    );
    
    if (rolActual.recordset.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Rol no encontrado'
      });
    }
    
    // Verificar que no haya otro rol con el mismo nombre (si cambió)
    if (rolActual.recordset[0].NombreRol !== nombreRol.trim()) {
      const existeOtroRol = await db.executeQuery(
        'SELECT RolID FROM Roles WHERE NombreRol = @nombreRol AND RolID != @rolId',
        { nombreRol: nombreRol.trim(), rolId: rolId }
      );
      
      if (existeOtroRol.recordset.length > 0) {
        return res.status(400).json({
          success: false,
          message: 'Ya existe otro rol con ese nombre'
        });
      }
    }
    
    // Actualizar información del rol
    await db.executeQuery(`
      UPDATE Roles 
      SET NombreRol = @nombreRol, 
          Descripcion = @descripcion, 
          Activo = @activo
      WHERE RolID = @rolId
    `, {
      nombreRol: nombreRol.trim(),
      descripcion: descripcion || '',
      activo: activo ? 1 : 0,
      rolId: rolId
    });
    
    // Actualizar permisos: eliminar todos y reasignar
    await db.executeQuery('DELETE FROM RolPermiso WHERE RolID = @rolId', { rolId: rolId });
    
    if (permisos && Array.isArray(permisos) && permisos.length > 0) {
      const permisosValidos = permisos.filter(p => p && parseInt(p) > 0);
      
      if (permisosValidos.length > 0) {
        const insertPermisosQueries = permisosValidos.map(permisoId => {
          return db.executeQuery(
            'INSERT INTO RolPermiso (RolID, PermisoID) VALUES (@rolId, @permisoId)',
            { rolId: rolId, permisoId: parseInt(permisoId) }
          );
        });
        
        await Promise.all(insertPermisosQueries);
        console.log(`[ROLES] ✅ Reasignados ${permisosValidos.length} permisos al rol ${nombreRol}`);
      }
    }
    
    // Registrar auditoría
    await auditService.logAction(
      usuarioActual.id,
      'ACTUALIZAR_ROL',
      'Roles',
      rolId,
      `Rol "${nombreRol}" actualizado con ${permisos?.length || 0} permisos`,
      req.ip,
      req.get('User-Agent')
    );
    
    console.log(`[ROLES] ✅ Rol "${nombreRol}" actualizado exitosamente`);
    
    res.json({
      success: true,
      message: 'Rol actualizado exitosamente'
    });
    
  } catch (error) {
    console.error('[ROLES] ❌ Error actualizando rol:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

/* DELETE - Eliminar rol */
router.delete('/:id', hasPermission('eliminar_roles'), async function(req, res, next) {
  try {
    const db = req.app.locals.db;
    const rolId = parseInt(req.params.id);
    const usuarioActual = req.session.user;
    
    console.log(`[ROLES] Eliminando rol ${rolId}`);
    
    // Verificar que el rol existe
    const rolResult = await db.executeQuery(
      'SELECT NombreRol FROM Roles WHERE RolID = @rolId',
      { rolId: rolId }
    );
    
    if (rolResult.recordset.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Rol no encontrado'
      });
    }
    
    const nombreRol = rolResult.recordset[0].NombreRol;
    
    // Verificar que no hay usuarios asignados a este rol
    const usuariosConRol = await db.executeQuery(
      'SELECT COUNT(*) as Total FROM Usuarios WHERE RolID = @rolId',
      { rolId: rolId }
    );
    
    if (usuariosConRol.recordset[0].Total > 0) {
      return res.status(400).json({
        success: false,
        message: `No se puede eliminar el rol "${nombreRol}" porque tiene ${usuariosConRol.recordset[0].Total} usuario(s) asignado(s)`
      });
    }
    
    // Eliminar permisos del rol
    await db.executeQuery('DELETE FROM RolPermiso WHERE RolID = @rolId', { rolId: rolId });
    
    // Eliminar el rol
    await db.executeQuery('DELETE FROM Roles WHERE RolID = @rolId', { rolId: rolId });
    
    // Registrar auditoría
    await auditService.logAction(
      usuarioActual.id,
      'ELIMINAR_ROL',
      'Roles',
      rolId,
      `Rol "${nombreRol}" eliminado`,
      req.ip,
      req.get('User-Agent')
    );
    
    console.log(`[ROLES] ✅ Rol "${nombreRol}" eliminado exitosamente`);
    
    res.json({
      success: true,
      message: `Rol "${nombreRol}" eliminado exitosamente`
    });
    
  } catch (error) {
    console.error('[ROLES] ❌ Error eliminando rol:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

/* POST - Asignar rol a usuario */
router.post('/asignar-usuario', hasPermission('asignar_roles'), async function(req, res, next) {
  try {
    const db = req.app.locals.db;
    const { usuarioId, rolId } = req.body;
    const usuarioActual = req.session.user;
    
    console.log(`[ROLES] Asignando rol ${rolId} a usuario ${usuarioId}`);
    
    // Validaciones
    if (!usuarioId || !rolId) {
      return res.status(400).json({
        success: false,
        message: 'Usuario y rol son obligatorios'
      });
    }
    
    // Verificar que el usuario existe
    const usuarioResult = await db.executeQuery(
      'SELECT nombre, apellido, email FROM Usuarios WHERE id_usuario = @usuarioId',
      { usuarioId: parseInt(usuarioId) }
    );
    
    if (usuarioResult.recordset.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      });
    }
    
    // Verificar que el rol existe
    const rolResult = await db.executeQuery(
      'SELECT NombreRol FROM Roles WHERE RolID = @rolId AND Activo = 1',
      { rolId: parseInt(rolId) }
    );
    
    if (rolResult.recordset.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Rol no encontrado o inactivo'
      });
    }
    
    const usuario = usuarioResult.recordset[0];
    const rol = rolResult.recordset[0];
    
    // Actualizar el rol del usuario
    await db.executeQuery(
      'UPDATE Usuarios SET RolID = @rolId WHERE id_usuario = @usuarioId',
      { rolId: parseInt(rolId), usuarioId: parseInt(usuarioId) }
    );
    
    // Registrar auditoría
    await auditService.logAction(
      usuarioActual.id,
      'ASIGNAR_ROL',
      'Usuarios',
      usuarioId,
      `Rol "${rol.NombreRol}" asignado a usuario "${usuario.nombre} ${usuario.apellido}" (${usuario.email})`,
      req.ip,
      req.get('User-Agent')
    );
    
    console.log(`[ROLES] ✅ Rol "${rol.NombreRol}" asignado a usuario "${usuario.email}"`);
    
    res.json({
      success: true,
      message: `Rol "${rol.NombreRol}" asignado exitosamente a ${usuario.nombre} ${usuario.apellido}`
    });
    
  } catch (error) {
    console.error('[ROLES] ❌ Error asignando rol a usuario:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

/* GET - Dashboard de roles con estadísticas */
router.get('/dashboard', hasAnyPermission(['ver_roles', 'gestionar_roles']), async function(req, res, next) {
  try {
    const db = req.app.locals.db;
    
    console.log('[ROLES] Consultando dashboard de roles');
    
    // Estadísticas generales
    const estadisticasQuery = `
      SELECT 
        (SELECT COUNT(*) FROM Roles WHERE Activo = 1) as RolesActivos,
        (SELECT COUNT(*) FROM Roles WHERE Activo = 0) as RolesInactivos,
        (SELECT COUNT(*) FROM Permisos) as TotalPermisos,
        (SELECT COUNT(DISTINCT Modulo) FROM Permisos) as ModulosPermisos
    `;
    
    const estadisticasResult = await db.executeQuery(estadisticasQuery);
    const estadisticas = estadisticasResult.recordset[0];
    
    // Distribución de usuarios por rol
    const distribucionQuery = `
      SELECT 
        r.NombreRol,
        COUNT(u.id_usuario) as TotalUsuarios
      FROM Roles r
      LEFT JOIN Usuarios u ON r.RolID = u.RolID
      WHERE r.Activo = 1
      GROUP BY r.RolID, r.NombreRol
      ORDER BY TotalUsuarios DESC
    `;
    
    const distribucionResult = await db.executeQuery(distribucionQuery);
    const distribucionRoles = distribucionResult.recordset;
    
    // Permisos más utilizados
    const permisosPopularesQuery = `
      SELECT TOP 10
        p.NombrePermiso,
        p.Modulo,
        COUNT(rp.RolID) as RolesConPermiso
      FROM Permisos p
      LEFT JOIN RolPermiso rp ON p.PermisoID = rp.PermisoID
      GROUP BY p.PermisoID, p.NombrePermiso, p.Modulo
      ORDER BY RolesConPermiso DESC
    `;
    
    const permisosPopularesResult = await db.executeQuery(permisosPopularesQuery);
    const permisosPopulares = permisosPopularesResult.recordset;
    
    console.log('[ROLES] ✅ Dashboard consultado exitosamente');
    
    res.render('admin/roles-dashboard', {
      title: 'Dashboard de Roles y Permisos',
      estadisticas: estadisticas,
      distribucionRoles: distribucionRoles,
      permisosPopulares: permisosPopulares,
      user: req.session.user,
      activeTab: 'roles'
    });
    
  } catch (error) {
    console.error('[ROLES] ❌ Error consultando dashboard:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

module.exports = router;