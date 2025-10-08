var express = require('express');
var router = express.Router();
var db = require('../../config/database');

/* GET página de gestión de usuarios */
router.get('/', async function(req, res, next) {
  const { user, email, rol, id } = req.query;
  
  // Verificar autenticación
  if (!user || !email || !rol || !id) {
    return res.redirect('/auth/login');
  }
  
  // Solo permitir acceso a instructores
  if (rol !== 'instructor') {
    return res.redirect('/auth/login?error=acceso_denegado');
  }
  
  try {
    // Obtener todos los usuarios
    const pool = await db.connect();
    const result = await pool.request().query(`
      SELECT 
        id_usuario AS Id,
        nombre + ' ' + apellido AS Nombre,
        nombre_usuario AS NombreUsuario,
        email AS Email,
        rol AS Rol,
        CONVERT(varchar, fecha_registro, 103) as FechaCreacion
      FROM Usuarios
      ORDER BY fecha_registro DESC
    `);
    
    const usuarios = result.recordset;
    
    // Calcular estadísticas
    const stats = {
      total: usuarios.length,
      instructores: usuarios.filter(u => u.Rol === 'instructor').length,
      estudiantes: usuarios.filter(u => u.Rol === 'user').length,
      nuevosHoy: usuarios.filter(u => {
        const hoy = new Date().toLocaleDateString('es-MX');
        return u.FechaCreacion === hoy;
      }).length
    };
    
    res.render('admin/gestion-usuarios', {
      title: 'Gestión de Usuarios - StarEducation',
      userName: user,
      userEmail: email,
      userRole: rol,
      userId: id,
      usuarios: usuarios,
      stats: stats
    });
    
  } catch (error) {
    console.error('[USUARIOS] Error al obtener usuarios:', error);
    res.status(500).render('error', {
      message: 'Error al cargar usuarios',
      error: { status: 500, stack: error.message }
    });
  }
});

/* POST crear nuevo usuario */
router.post('/crear', async function(req, res, next) {
  const { user, email, rol, id } = req.query;
  const { nombre, emailNuevo, password, rolNuevo } = req.body;
  
  // Verificar autenticación
  if (!user || !email || !rol || !id) {
    return res.json({ success: false, message: 'No autenticado' });
  }
  
  // Solo permitir acceso a instructores
  if (rol !== 'instructor') {
    return res.json({ success: false, message: 'Sin permisos' });
  }
  
  // Validar datos requeridos
  if (!nombre || !emailNuevo || !password || !rolNuevo) {
    return res.json({ success: false, message: 'Todos los campos son requeridos' });
  }
  
  try {
    // Verificar si el email ya existe
    const pool = await db.connect();
    const checkResult = await pool.request()
      .input('email', emailNuevo)
      .query('SELECT id_usuario FROM Usuarios WHERE email = @email');
    
    if (checkResult.recordset.length > 0) {
      return res.json({ success: false, message: 'El email ya está registrado' });
    }
    
    // Crear el nuevo usuario
    // Separar nombre y apellido (si el campo nombre contiene ambos)
    const fullName = (nombre || '').trim();
    let firstName = fullName;
    let lastName = '';
    if (fullName.includes(' ')) {
      const parts = fullName.split(' ');
      firstName = parts.shift();
      lastName = parts.join(' ');
    }
    // Generar nombre_usuario desde el email local-part si no se proporciona
    const nombreUsuario = emailNuevo.split('@')[0];

    const insertResult = await pool.request()
      .input('nombre', firstName)
      .input('apellido', lastName)
      .input('nombre_usuario', nombreUsuario)
      .input('email', emailNuevo)
      .input('password', password)
      .input('rol', rolNuevo)
      .query(`
        INSERT INTO Usuarios (nombre, apellido, nombre_usuario, email, password, rol, estatus)
        VALUES (@nombre, @apellido, @nombre_usuario, @email, @password, @rol, 'activo')
      `);
    
    console.log(`[USUARIOS] Nuevo usuario creado: ${nombre} (${emailNuevo}) - ${rolNuevo}`);
    
    res.json({
      success: true,
      message: 'Usuario creado exitosamente',
      usuario: {
        nombre: `${firstName} ${lastName}`.trim(),
        email: emailNuevo,
        rol: rolNuevo,
        nombre_usuario: nombreUsuario
      }
    });
    
  } catch (error) {
    console.error('[USUARIOS] Error al crear usuario:', error);
    res.json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message
    });
  }
});

/* PUT editar usuario */
router.put('/editar/:userId', async function(req, res, next) {
  const { user, email, rol, id } = req.query;
  const { userId } = req.params;
  const { nombre, emailNuevo, rolNuevo } = req.body;
  
  // Verificar autenticación
  if (!user || !email || !rol || !id) {
    return res.json({ success: false, message: 'No autenticado' });
  }
  
  // Solo permitir acceso a instructores
  if (rol !== 'instructor') {
    return res.json({ success: false, message: 'Sin permisos' });
  }
  
  try {
  const pool = await db.connect();
    
    // Verificar si el nuevo email ya existe (excepto el usuario actual)
    if (emailNuevo) {
      const checkResult = await pool.request()
        .input('email', emailNuevo)
        .input('userId', userId)
        .query('SELECT id_usuario FROM Usuarios WHERE email = @email AND id_usuario != @userId');
      
      if (checkResult.recordset.length > 0) {
        return res.json({ success: false, message: 'El email ya está registrado' });
      }
    }

    // Separar nombre y apellido para actualizar
    const fullName = (nombre || '').trim();
    let firstName = fullName;
    let lastName = '';
    if (fullName.includes(' ')) {
      const parts = fullName.split(' ');
      firstName = parts.shift();
      lastName = parts.join(' ');
    }
    const nombreUsuario = (emailNuevo || '').includes('@') ? emailNuevo.split('@')[0] : null;

    // Actualizar el usuario
    const updateResult = await pool.request()
      .input('userId', userId)
      .input('nombre', firstName)
      .input('apellido', lastName)
      .input('nombre_usuario', nombreUsuario)
      .input('email', emailNuevo)
      .input('rol', rolNuevo)
      .query(`
        UPDATE Usuarios 
        SET nombre = @nombre, apellido = @apellido, nombre_usuario = COALESCE(@nombre_usuario, nombre_usuario), email = @email, rol = @rol
        WHERE id_usuario = @userId
      `);
    
    if (updateResult.rowsAffected[0] === 0) {
      return res.json({ success: false, message: 'Usuario no encontrado' });
    }
    
    console.log(`[USUARIOS] Usuario actualizado: ${userId}`);
    
    res.json({
      success: true,
      message: 'Usuario actualizado exitosamente'
    });
    
  } catch (error) {
    console.error('[USUARIOS] Error al actualizar usuario:', error);
    res.json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message
    });
  }
});

/* DELETE eliminar usuario */
router.delete('/eliminar/:userId', async function(req, res, next) {
  const { user, email, rol, id } = req.query;
  const { userId } = req.params;
  
  // Verificar autenticación
  if (!user || !email || !rol || !id) {
    return res.json({ success: false, message: 'No autenticado' });
  }
  
  // Solo permitir acceso a instructores
  if (rol !== 'instructor') {
    return res.json({ success: false, message: 'Sin permisos' });
  }
  
  // No permitir eliminar el propio usuario
  if (userId === id) {
    return res.json({ success: false, message: 'No puedes eliminarte a ti mismo' });
  }
  
  try {
  const pool = await db.connect();
    
    // Obtener información del usuario antes de eliminar
    const userResult = await pool.request()
      .input('userId', userId)
      .query("SELECT nombre + ' ' + apellido AS Nombre, email AS Email FROM Usuarios WHERE id_usuario = @userId");
    
    if (userResult.recordset.length === 0) {
      return res.json({ success: false, message: 'Usuario no encontrado' });
    }
    
    const usuarioAEliminar = userResult.recordset[0];
    
    // Eliminar el usuario
    const deleteResult = await pool.request()
      .input('userId', userId)
      .query('DELETE FROM Usuarios WHERE id_usuario = @userId');
    
    if (deleteResult.rowsAffected[0] === 0) {
      return res.json({ success: false, message: 'Error al eliminar usuario' });
    }
    
    console.log(`[USUARIOS] Usuario eliminado: ${usuarioAEliminar.Nombre} (${usuarioAEliminar.Email})`);
    
    res.json({
      success: true,
      message: 'Usuario eliminado exitosamente'
    });
    
  } catch (error) {
    console.error('[USUARIOS] Error al eliminar usuario:', error);
    res.json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message
    });
  }
});

/* GET datos de un usuario específico */
router.get('/:userId', async function(req, res, next) {
  const { user, email, rol, id } = req.query;
  const { userId } = req.params;
  
  // Verificar autenticación
  if (!user || !email || !rol || !id) {
    return res.json({ success: false, message: 'No autenticado' });
  }
  
  // Solo permitir acceso a instructores
  if (rol !== 'instructor') {
    return res.json({ success: false, message: 'Sin permisos' });
  }
  
  try {
  const pool = await db.connect();
    const result = await pool.request()
      .input('userId', userId)
      .query(`
        SELECT id_usuario AS Id, nombre + ' ' + apellido AS Nombre, nombre_usuario AS NombreUsuario, email AS Email, rol AS Rol, 
               CONVERT(varchar, fecha_registro, 103) as FechaCreacion
        FROM Usuarios 
        WHERE id_usuario = @userId
      `);
    
    if (result.recordset.length === 0) {
      return res.json({ success: false, message: 'Usuario no encontrado' });
    }
    
    res.json({
      success: true,
      usuario: result.recordset[0]
    });
    
  } catch (error) {
    console.error('[USUARIOS] Error al obtener usuario:', error);
    res.json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message
    });
  }
});

module.exports = router;
