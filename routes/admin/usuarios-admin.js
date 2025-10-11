var express = require('express');
var router = express.Router();
const bcrypt = require('bcryptjs');
const emailService = require('../../services/emailService');

/* GET - Lista de usuarios con filtros y paginación */
router.get('/', async function(req, res, next) {
  try {
    const db = req.app.locals.db;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const search = req.query.search || '';
    const rolFilter = req.query.rol || '';
    const estatusFilter = req.query.estatus || '';
    const offset = (page - 1) * limit;

    console.log(`[USUARIOS] Consultando usuarios - Página: ${page}, Búsqueda: "${search}", Rol: "${rolFilter}", Estatus: "${estatusFilter}"`);

    // Construir cláusula WHERE
    let whereConditions = [];
    let params = {};
    
    if (search) {
      whereConditions.push('(u.nombre LIKE @search OR u.apellido LIKE @search OR u.email LIKE @search OR u.nombre_usuario LIKE @search)');
      params.search = `%${search}%`;
    }
    
    if (rolFilter) {
      whereConditions.push('u.rol = @rol');
      params.rol = rolFilter;
    }
    
    if (estatusFilter) {
      whereConditions.push('u.estatus = @estatus');
      params.estatus = estatusFilter;
    }

    const whereClause = whereConditions.length > 0 ? 'WHERE ' + whereConditions.join(' AND ') : '';

    // Consulta principal con información relacionada
    const query = `
      SELECT 
        u.id_usuario,
        u.nombre,
        u.apellido,
        u.nombre_usuario,
        u.email,
        u.rol,
        u.estatus,
        u.fecha_registro,
        FORMAT(u.fecha_registro, 'dd/MM/yyyy HH:mm') as fecha_registro_formateada,
        COUNT(CASE WHEN u.rol = 'instructor' THEN c.id_curso END) as cursos_creados,
        COUNT(CASE WHEN u.rol = 'user' THEN p.id_progreso END) as cursos_en_progreso,
        COUNT(comp.id_compra) as compras_realizadas
      FROM Usuarios u
      LEFT JOIN Cursos c ON u.id_usuario = c.id_usuario AND u.rol = 'instructor'
      LEFT JOIN Progreso p ON u.id_usuario = p.id_usuario AND u.rol = 'user'
      LEFT JOIN Compras comp ON u.id_usuario = comp.id_usuario
      ${whereClause}
      GROUP BY u.id_usuario, u.nombre, u.apellido, u.nombre_usuario, u.email, u.rol, u.estatus, u.fecha_registro
      ORDER BY 
        CASE WHEN u.rol = 'instructor' THEN 1 ELSE 2 END,
        u.fecha_registro DESC
      OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY
    `;

    params.offset = offset;
    params.limit = limit;

    const result = await db.executeQuery(query, params);

    // Consulta para contar total de registros
    const countQuery = `
      SELECT COUNT(*) as total
      FROM Usuarios u
      ${whereClause}
    `;

    const countParams = { ...params };
    delete countParams.offset;
    delete countParams.limit;
    
    const countResult = await db.executeQuery(countQuery, countParams);
    const totalRecords = countResult.recordset[0].total;
    const totalPages = Math.ceil(totalRecords / limit);

    // Estadísticas generales
    const statsQuery = `
      SELECT 
        (SELECT COUNT(*) FROM Usuarios) as total_usuarios,
        (SELECT COUNT(*) FROM Usuarios WHERE estatus = 'activo') as usuarios_activos,
        (SELECT COUNT(*) FROM Usuarios WHERE estatus = 'inactivo') as usuarios_inactivos,
        (SELECT COUNT(*) FROM Usuarios WHERE estatus = 'baneado') as usuarios_baneados,
        (SELECT COUNT(*) FROM Usuarios WHERE rol = 'instructor') as total_instructores,
        (SELECT COUNT(*) FROM Usuarios WHERE rol = 'user') as total_estudiantes,
        (SELECT COUNT(*) FROM Usuarios WHERE fecha_registro >= DATEADD(month, -1, GETDATE())) as nuevos_mes_actual
    `;

    const statsResult = await db.executeQuery(statsQuery);
    const stats = statsResult.recordset[0];

    console.log(`[USUARIOS] ✅ Consulta exitosa - ${result.recordset.length} usuarios encontrados`);

    res.render('admin/usuarios-admin', {
      title: 'Gestión de Usuarios',
      usuarios: result.recordset,
      currentPage: page,
      totalPages: totalPages,
      totalRecords: totalRecords,
      search: search,
      rolFilter: rolFilter,
      estatusFilter: estatusFilter,
      limit: limit,
      stats: stats,
      userName: req.session.user.nombre,
      userRole: req.session.user.rol,
      layout: false
    });

  } catch (error) {
    console.error('[USUARIOS] ❌ Error consultando usuarios:', error);
    res.status(500).render('shared/error', {
      message: 'Error al cargar los usuarios',
      error: req.app.get('env') === 'development' ? error : {}
    });
  }
});

/* POST - Crear nuevo usuario */
router.post('/', async function(req, res, next) {
  try {
    const db = req.app.locals.db;
    const { nombre, apellido, nombre_usuario, email, rol, estatus } = req.body;

    // Validaciones
    if (!nombre || nombre.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'El nombre es obligatorio'
      });
    }

    if (!apellido || apellido.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'El apellido es obligatorio'
      });
    }

    if (!nombre_usuario || nombre_usuario.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'El nombre de usuario es obligatorio'
      });
    }

    if (!email || email.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'El email es obligatorio'
      });
    }

    if (nombre.length > 150) {
      return res.status(400).json({
        success: false,
        message: 'El nombre no puede exceder 150 caracteres'
      });
    }

    if (apellido.length > 150) {
      return res.status(400).json({
        success: false,
        message: 'El apellido no puede exceder 150 caracteres'
      });
    }

    if (nombre_usuario.length > 50) {
      return res.status(400).json({
        success: false,
        message: 'El nombre de usuario no puede exceder 50 caracteres'
      });
    }

    if (email.length > 255) {
      return res.status(400).json({
        success: false,
        message: 'El email no puede exceder 255 caracteres'
      });
    }

    // Validar formato de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: 'El formato del email no es válido'
      });
    }

    // Validar rol
    if (!['user', 'instructor'].includes(rol)) {
      return res.status(400).json({
        success: false,
        message: 'El rol debe ser "user" o "instructor"'
      });
    }

    // Validar estatus
    if (!['activo', 'inactivo', 'baneado'].includes(estatus)) {
      return res.status(400).json({
        success: false,
        message: 'El estatus debe ser "activo", "inactivo" o "baneado"'
      });
    }

    console.log(`[USUARIOS] Creando nuevo usuario: "${nombre} ${apellido}" (${email})`);

    // Verificar que no exista un usuario con el mismo email
    const existingEmailQuery = 'SELECT id_usuario FROM Usuarios WHERE LOWER(email) = LOWER(@email)';
    const existingEmailResult = await db.executeQuery(existingEmailQuery, { email: email.trim() });

    if (existingEmailResult.recordset.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Ya existe un usuario con ese email'
      });
    }

    // Verificar que no exista un usuario con el mismo nombre_usuario
    const existingUserQuery = 'SELECT id_usuario FROM Usuarios WHERE LOWER(nombre_usuario) = LOWER(@nombre_usuario)';
    const existingUserResult = await db.executeQuery(existingUserQuery, { nombre_usuario: nombre_usuario.trim() });

    if (existingUserResult.recordset.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Ya existe un usuario con ese nombre de usuario'
      });
    }

    // Generar contraseña temporal
    const passwordTemporal = generarPasswordTemporal();
    const hashedPassword = await bcrypt.hash(passwordTemporal, 10);

    // Crear el usuario con contraseña temporal
    const insertQuery = `
      INSERT INTO Usuarios (nombre, apellido, nombre_usuario, email, password, rol, estatus, fecha_registro, tiene_password_temporal, fecha_password_temporal)
      OUTPUT INSERTED.id_usuario, INSERTED.nombre, INSERTED.apellido, INSERTED.nombre_usuario, INSERTED.email, INSERTED.rol, INSERTED.estatus, INSERTED.fecha_registro
      VALUES (@nombre, @apellido, @nombre_usuario, @email, @password, @rol, @estatus, GETDATE(), 1, GETDATE())
    `;

    const result = await db.executeQuery(insertQuery, {
      nombre: nombre.trim(),
      apellido: apellido.trim(),
      nombre_usuario: nombre_usuario.trim(),
      email: email.trim(),
      password: hashedPassword,
      rol: rol,
      estatus: estatus
    });

    const newUsuario = result.recordset[0];
    console.log(`[USUARIOS] ✅ Usuario creado exitosamente - ID: ${newUsuario.id_usuario}`);

    // Enviar contraseña temporal por email
    console.log(`[USUARIOS] 📧 Enviando contraseña temporal por email a: ${email}`);
    
    try {
      const emailResult = await emailService.enviarPasswordTemporal(
        email.trim(),
        nombre.trim(),
        apellido.trim(),
        passwordTemporal
      );
      
      if (emailResult.success) {
        console.log(`[USUARIOS] ✅ Email enviado correctamente - MessageID: ${emailResult.messageId}`);
      } else {
        console.log(`[USUARIOS] ⚠️ ${emailResult.message}`);
      }
    } catch (emailError) {
      console.error(`[USUARIOS] ❌ Error enviando email:`, emailError.message);
      // No fallar la creación del usuario si el email falla
    }

    res.json({
      success: true,
      message: 'Usuario creado exitosamente. Se ha generado una contraseña temporal.',
      usuario: {
        id_usuario: newUsuario.id_usuario,
        nombre: newUsuario.nombre,
        apellido: newUsuario.apellido,
        nombre_usuario: newUsuario.nombre_usuario,
        email: newUsuario.email,
        rol: newUsuario.rol,
        estatus: newUsuario.estatus
      }
    });

  } catch (error) {
    console.error('[USUARIOS] ❌ Error creando usuario:', error);
    
    if (error.number === 2627) { // Duplicate key error
      return res.status(400).json({
        success: false,
        message: 'Ya existe un usuario con esos datos'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

/* GET - Obtener usuario específico */
router.get('/:id', async function(req, res, next) {
  try {
    const db = req.app.locals.db;
    const usuarioId = parseInt(req.params.id);

    if (isNaN(usuarioId)) {
      return res.status(400).json({
        success: false,
        message: 'ID de usuario inválido'
      });
    }

    console.log(`[USUARIOS] Consultando usuario ID: ${usuarioId}`);

    const query = `
      SELECT 
        u.id_usuario,
        u.nombre,
        u.apellido,
        u.nombre_usuario,
        u.email,
        u.rol,
        u.estatus,
        u.fecha_registro,
        COUNT(CASE WHEN u.rol = 'instructor' THEN c.id_curso END) as cursos_creados,
        COUNT(CASE WHEN u.rol = 'user' THEN p.id_progreso END) as cursos_en_progreso,
        COUNT(comp.id_compra) as compras_realizadas,
        COUNT(cert.id_certificado) as certificados_obtenidos
      FROM Usuarios u
      LEFT JOIN Cursos c ON u.id_usuario = c.id_usuario AND u.rol = 'instructor'
      LEFT JOIN Progreso p ON u.id_usuario = p.id_usuario AND u.rol = 'user'
      LEFT JOIN Compras comp ON u.id_usuario = comp.id_usuario
      LEFT JOIN Certificados cert ON u.id_usuario = cert.id_usuario
      WHERE u.id_usuario = @id
      GROUP BY u.id_usuario, u.nombre, u.apellido, u.nombre_usuario, u.email, u.rol, u.estatus, u.fecha_registro
    `;

    const result = await db.executeQuery(query, { id: usuarioId });

    if (result.recordset.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      });
    }

    const usuario = result.recordset[0];
    console.log(`[USUARIOS] ✅ Usuario encontrado: "${usuario.nombre} ${usuario.apellido}"`);

    res.json({
      success: true,
      usuario: usuario
    });

  } catch (error) {
    console.error('[USUARIOS] ❌ Error consultando usuario:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

/* PUT - Actualizar usuario */
router.put('/:id', async function(req, res, next) {
  try {
    const db = req.app.locals.db;
    const usuarioId = parseInt(req.params.id);
    const { nombre, apellido, nombre_usuario, email, rol, estatus } = req.body;

    if (isNaN(usuarioId)) {
      return res.status(400).json({
        success: false,
        message: 'ID de usuario inválido'
      });
    }

    // Validaciones (mismas que en POST)
    if (!nombre || nombre.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'El nombre es obligatorio'
      });
    }

    if (!apellido || apellido.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'El apellido es obligatorio'
      });
    }

    if (!nombre_usuario || nombre_usuario.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'El nombre de usuario es obligatorio'
      });
    }

    if (!email || email.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'El email es obligatorio'
      });
    }

    if (nombre.length > 150 || apellido.length > 150) {
      return res.status(400).json({
        success: false,
        message: 'El nombre y apellido no pueden exceder 150 caracteres'
      });
    }

    if (nombre_usuario.length > 50) {
      return res.status(400).json({
        success: false,
        message: 'El nombre de usuario no puede exceder 50 caracteres'
      });
    }

    if (email.length > 255) {
      return res.status(400).json({
        success: false,
        message: 'El email no puede exceder 255 caracteres'
      });
    }

    // Validar formato de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: 'El formato del email no es válido'
      });
    }

    // Validar rol y estatus
    if (!['user', 'instructor'].includes(rol)) {
      return res.status(400).json({
        success: false,
        message: 'El rol debe ser "user" o "instructor"'
      });
    }

    if (!['activo', 'inactivo', 'baneado'].includes(estatus)) {
      return res.status(400).json({
        success: false,
        message: 'El estatus debe ser "activo", "inactivo" o "baneado"'
      });
    }

    console.log(`[USUARIOS] Actualizando usuario ID: ${usuarioId}`);

    // Verificar que el usuario existe
    const existsQuery = 'SELECT id_usuario FROM Usuarios WHERE id_usuario = @id';
    const existsResult = await db.executeQuery(existsQuery, { id: usuarioId });

    if (existsResult.recordset.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      });
    }

    // Verificar que no exista otro usuario con el mismo email
    const duplicateEmailQuery = `
      SELECT id_usuario 
      FROM Usuarios 
      WHERE LOWER(email) = LOWER(@email) AND id_usuario != @id
    `;
    const duplicateEmailResult = await db.executeQuery(duplicateEmailQuery, { 
      email: email.trim(), 
      id: usuarioId 
    });

    if (duplicateEmailResult.recordset.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Ya existe otro usuario con ese email'
      });
    }

    // Verificar que no exista otro usuario con el mismo nombre_usuario
    const duplicateUserQuery = `
      SELECT id_usuario 
      FROM Usuarios 
      WHERE LOWER(nombre_usuario) = LOWER(@nombre_usuario) AND id_usuario != @id
    `;
    const duplicateUserResult = await db.executeQuery(duplicateUserQuery, { 
      nombre_usuario: nombre_usuario.trim(), 
      id: usuarioId 
    });

    if (duplicateUserResult.recordset.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Ya existe otro usuario con ese nombre de usuario'
      });
    }

    // Actualizar el usuario
    const updateQuery = `
      UPDATE Usuarios 
      SET 
        nombre = @nombre,
        apellido = @apellido,
        nombre_usuario = @nombre_usuario,
        email = @email,
        rol = @rol,
        estatus = @estatus
      OUTPUT INSERTED.id_usuario, INSERTED.nombre, INSERTED.apellido, INSERTED.nombre_usuario, INSERTED.email, INSERTED.rol, INSERTED.estatus
      WHERE id_usuario = @id
    `;

    const result = await db.executeQuery(updateQuery, {
      id: usuarioId,
      nombre: nombre.trim(),
      apellido: apellido.trim(),
      nombre_usuario: nombre_usuario.trim(),
      email: email.trim(),
      rol: rol,
      estatus: estatus
    });

    const updatedUsuario = result.recordset[0];
    console.log(`[USUARIOS] ✅ Usuario actualizado exitosamente - ID: ${usuarioId}`);

    res.json({
      success: true,
      message: 'Usuario actualizado exitosamente',
      usuario: updatedUsuario
    });

  } catch (error) {
    console.error('[USUARIOS] ❌ Error actualizando usuario:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

/* POST - Cambiar estado de usuario */
router.post('/:id/status', async function(req, res, next) {
  try {
    const db = req.app.locals.db;
    const usuarioId = parseInt(req.params.id);
    const { estatus } = req.body;

    if (isNaN(usuarioId)) {
      return res.status(400).json({
        success: false,
        message: 'ID de usuario inválido'
      });
    }

    // Validar estatus
    if (!['activo', 'inactivo', 'baneado'].includes(estatus)) {
      return res.status(400).json({
        success: false,
        message: 'El estatus debe ser "activo", "inactivo" o "baneado"'
      });
    }

    console.log(`[USUARIOS] Cambiando estado del usuario ID: ${usuarioId} a: ${estatus}`);

    // Verificar que el usuario existe y obtener datos actuales
    const existsQuery = `
      SELECT id_usuario, nombre, apellido, estatus 
      FROM Usuarios 
      WHERE id_usuario = @id
    `;
    const existsResult = await db.executeQuery(existsQuery, { id: usuarioId });

    if (existsResult.recordset.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      });
    }

    const usuario = existsResult.recordset[0];

    // Actualizar solo el estatus
    const updateQuery = `
      UPDATE Usuarios 
      SET estatus = @estatus
      WHERE id_usuario = @id
    `;

    await db.executeQuery(updateQuery, {
      id: usuarioId,
      estatus: estatus
    });

    const statusNames = {
      'activo': 'activado',
      'inactivo': 'desactivado',
      'baneado': 'baneado'
    };

    console.log(`[USUARIOS] ✅ Estado del usuario "${usuario.nombre} ${usuario.apellido}" cambiado a: ${estatus}`);

    res.json({
      success: true,
      message: `Usuario "${usuario.nombre} ${usuario.apellido}" ${statusNames[estatus]} exitosamente`
    });

  } catch (error) {
    console.error('[USUARIOS] ❌ Error cambiando estado del usuario:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

/* DELETE - Eliminar usuario */
router.delete('/:id', async function(req, res, next) {
  try {
    const db = req.app.locals.db;
    const usuarioId = parseInt(req.params.id);

    if (isNaN(usuarioId)) {
      return res.status(400).json({
        success: false,
        message: 'ID de usuario inválido'
      });
    }

    console.log(`[USUARIOS] Eliminando usuario ID: ${usuarioId}`);

    // Verificar que el usuario existe y obtener dependencias
    const existsQuery = `
      SELECT 
        u.id_usuario,
        u.nombre,
        u.apellido,
        u.email,
        u.rol,
        COUNT(c.id_curso) as cursos_creados,
        COUNT(p.id_progreso) as progreso_cursos,
        COUNT(comp.id_compra) as compras_realizadas,
        COUNT(cert.id_certificado) as certificados_emitidos
      FROM Usuarios u
      LEFT JOIN Cursos c ON u.id_usuario = c.id_usuario
      LEFT JOIN Progreso p ON u.id_usuario = p.id_usuario
      LEFT JOIN Compras comp ON u.id_usuario = comp.id_usuario
      LEFT JOIN Certificados cert ON u.id_usuario = cert.id_usuario
      WHERE u.id_usuario = @id
      GROUP BY u.id_usuario, u.nombre, u.apellido, u.email, u.rol
    `;
    const existsResult = await db.executeQuery(existsQuery, { id: usuarioId });

    if (existsResult.recordset.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      });
    }

    const usuario = existsResult.recordset[0];
    const totalDependencias = usuario.cursos_creados + usuario.progreso_cursos + usuario.compras_realizadas + usuario.certificados_emitidos;

    // Si tiene dependencias, mostrar advertencia
    if (totalDependencias > 0) {
      let dependenciasMsg = [];
      if (usuario.cursos_creados > 0) dependenciasMsg.push(`${usuario.cursos_creados} curso(s) creado(s)`);
      if (usuario.progreso_cursos > 0) dependenciasMsg.push(`${usuario.progreso_cursos} progreso(s) de curso(s)`);
      if (usuario.compras_realizadas > 0) dependenciasMsg.push(`${usuario.compras_realizadas} compra(s) realizada(s)`);
      if (usuario.certificados_emitidos > 0) dependenciasMsg.push(`${usuario.certificados_emitidos} certificado(s) emitido(s)`);

      return res.status(400).json({
        success: false,
        message: `No se puede eliminar al usuario "${usuario.nombre} ${usuario.apellido}" porque tiene datos relacionados: ${dependenciasMsg.join(', ')}. Considera cambiar su estatus a "inactivo" en su lugar.`
      });
    }

    // Eliminar el usuario (solo si no tiene dependencias)
    const deleteQuery = 'DELETE FROM Usuarios WHERE id_usuario = @id';
    await db.executeQuery(deleteQuery, { id: usuarioId });

    console.log(`[USUARIOS] ✅ Usuario eliminado exitosamente: "${usuario.nombre} ${usuario.apellido}"`);

    res.json({
      success: true,
      message: `Usuario "${usuario.nombre} ${usuario.apellido}" eliminado exitosamente`
    });

  } catch (error) {
    console.error('[USUARIOS] ❌ Error eliminando usuario:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

// Función auxiliar para generar contraseña temporal
function generarPasswordTemporal() {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
  let password = '';
  for (let i = 0; i < 8; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
}

module.exports = router;