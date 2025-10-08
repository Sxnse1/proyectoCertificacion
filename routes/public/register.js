var express = require('express');
var router = express.Router();
var db = require('../../config/database');
var bcrypt = require('bcryptjs');

/* GET registro de usuario */
router.get('/', function(req, res, next) {
  res.render('auth/register-bootstrap', { 
    title: 'Registro de Usuario',
    layout: false 
  });
});

/* POST crear cuenta pública */
router.post('/', async function(req, res, next) {
  const { nombre, apellido, email, password } = req.body;

  // Validaciones básicas
  if (!nombre || !apellido || !email || !password) {
    return res.render('auth/register-bootstrap', { 
      title: 'Registro de Usuario', 
      error: 'Todos los campos son requeridos', 
      nombre, 
      apellido,
      email,
      layout: false 
    });
  }

  try {
    const pool = await db.connect();

    // Verificar si el email ya existe (ajustado a esquema real)
    const check = await pool.request()
      .input('email', email)
      .query('SELECT id_usuario FROM Usuarios WHERE email = @email');

    if (check.recordset.length > 0) {
      return res.render('auth/register-bootstrap', { 
        title: 'Registro de Usuario', 
        error: 'El email ya está registrado', 
        nombre, 
        apellido,
        email,
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
    await pool.request()
      .input('nombre', firstName)
      .input('apellido', lastName)
      .input('nombre_usuario', nombreUsuario)
      .input('email', email)
      .input('password', hashed)
      .input('rol', 'user')
      .query(`
        INSERT INTO Usuarios (nombre, apellido, nombre_usuario, email, password, rol, estatus)
        VALUES (@nombre, @apellido, @nombre_usuario, @email, @password, @rol, 'activo')
      `);

    // Redirigir al login con mensaje de éxito
    return res.render('login-bootstrap', { 
      title: 'Iniciar Sesión', 
      success: 'Registro exitoso. Puedes iniciar sesión ahora.', 
      email: email,
      layout: false 
    });

  } catch (err) {
    console.error('[REGISTER] Error al registrar usuario:', err);
    return res.render('auth/register-bootstrap', { 
      title: 'Registro de Usuario', 
      error: 'Error interno del servidor',
      layout: false 
    });
  }
});

module.exports = router;
