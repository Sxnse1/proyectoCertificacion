var express = require('express');
var router = express.Router();
var bcrypt = require('bcryptjs');

/* GET registro de usuario */
router.get('/', function(req, res, next) {
  res.render('auth/register-bootstrap', { 
    title: 'Registro de Usuario',
    redirectTo: req.query.redirect || '',
    layout: false 
  });
});

/* POST crear cuenta pública */
router.post('/', async function(req, res, next) {
  const { nombre, apellido, email, password, redirectTo } = req.body;

  // Validaciones básicas
  if (!nombre || !apellido || !email || !password) {
    return res.render('auth/register-bootstrap', { 
      title: 'Registro de Usuario', 
      error: 'Todos los campos son requeridos', 
      nombre, 
      apellido,
      email,
      redirectTo,
      layout: false 
    });
  }

  try {
    const db = req.app.locals.db;

    // Verificar si el email ya existe (ajustado a esquema real)
    const check = await db.executeQuery('SELECT id_usuario FROM Usuarios WHERE email = @email', { email });

    if (check.recordset.length > 0) {
      return res.render('auth/register-bootstrap', { 
        title: 'Registro de Usuario', 
        error: 'El email ya está registrado', 
        nombre, 
        apellido,
        email,
        redirectTo,
        layout: false 
      });
    }

    // Hashear contraseña
    const hashed = await bcrypt.hash(password, 10);

    // Usar nombre y apellido directamente
    const firstName = (nombre || '').trim();
    const lastName = (apellido || '').trim();

    // Generar nombre_usuario desde email local-part
    const nombreUsuario = email.split('@')[0];

    // Insertar usuario con rol por defecto 'user' y estatus 'activo'
    await db.executeQuery(`
        INSERT INTO Usuarios (nombre, apellido, nombre_usuario, email, password, rol, estatus)
        VALUES (@nombre, @apellido, @nombre_usuario, @email, @password, @rol, 'activo')
      `, {
        nombre: firstName,
        apellido: lastName,
        nombre_usuario: nombreUsuario,
        email: email,
        password: hashed,
        rol: 'user'
      });

    // Redirigir al login con mensaje de éxito
    const loginUrl = redirectTo ? `/auth/login?redirect=${encodeURIComponent(redirectTo)}` : '/auth/login';
    return res.redirect(`${loginUrl}&success=${encodeURIComponent('Registro exitoso. Puedes iniciar sesión ahora.')}&email=${encodeURIComponent(email)}`);

  } catch (err) {
    console.error('[REGISTER] Error al registrar usuario:', err);
    return res.render('auth/register-bootstrap', { 
      title: 'Registro de Usuario', 
      error: 'Error interno del servidor',
      nombre,
      apellido,
      email,
      redirectTo,
      layout: false 
    });
  }
});

module.exports = router;
