var express = require('express');
var router = express.Router();
var db = require('../config/database');
var bcrypt = require('bcryptjs');

/* GET registro de usuario */
router.get('/', function(req, res, next) {
  res.render('register', { title: 'Registro' });
});

/* POST crear cuenta pública */
router.post('/', async function(req, res, next) {
  const { nombre, email, password } = req.body;

  // Validaciones básicas
  if (!nombre || !email || !password) {
    return res.render('register', { title: 'Registro', error: 'Todos los campos son requeridos', nombre, email });
  }

  try {
    const pool = await db.connect();

    // Verificar si el email ya existe (ajustado a esquema real)
    const check = await pool.request()
      .input('email', email)
      .query('SELECT id_usuario FROM Usuarios WHERE email = @email');

    if (check.recordset.length > 0) {
      return res.render('register', { title: 'Registro', error: 'El email ya está registrado', nombre, email });
    }

    // Hashear contraseña
    const hashed = await bcrypt.hash(password, 10);

    // Separar nombre y apellido
    const fullName = (nombre || '').trim();
    let firstName = fullName;
    let lastName = '';
    if (fullName.includes(' ')) {
      const parts = fullName.split(' ');
      firstName = parts.shift();
      lastName = parts.join(' ');
    }

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
    return res.render('login', { title: 'Iniciar Sesión', success: 'Registro exitoso. Puedes iniciar sesión ahora.', email: email });

  } catch (err) {
    console.error('[REGISTER] Error al registrar usuario:', err);
    return res.render('register', { title: 'Registro', error: 'Error interno del servidor' });
  }
});

module.exports = router;
