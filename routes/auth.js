var express = require('express');
var router = express.Router();

/* GET login page */
router.get('/login', function(req, res, next) {
  res.render('login', { 
    title: 'Proyecto Certificación',
    email: req.query.email || ''
  });
});

/* POST login - Procesar login */
router.post('/login', async function(req, res, next) {
  try {
    const { email, password } = req.body;
    
    // Validación básica
    if (!email || !password) {
      return res.render('login', {
        title: 'Proyecto Certificación',
        error: 'Por favor ingresa email y contraseña',
        email: email
      });
    }

    const db = req.app.locals.db;
    
    // Verificar si hay conexión a base de datos
    if (!db) {
      console.log('[AUTH] ⚠️ No hay conexión a base de datos');
      return res.render('login', {
        title: 'Proyecto Certificación',
        error: 'Sistema en mantenimiento. Intenta más tarde.',
        email: email
      });
    }
    
    console.log('[AUTH] 🔐 Intento de login para:', email);
    
    // Buscar usuario en la base de datos con la nueva estructura
    const result = await db.executeQuery(
      `SELECT id_usuario, nombre, apellido, nombre_usuario, email, password, rol, estatus 
       FROM Usuarios WHERE email = @email`,
      { email: email.toLowerCase() }
    );
    
    if (result.recordset.length === 0) {
      console.log('[AUTH] ❌ Usuario no encontrado:', email);
      return res.render('login', {
        title: 'Proyecto Certificación',
        error: 'Email o contraseña incorrectos',
        email: email
      });
    }
    
    const user = result.recordset[0];
    
    // Verificar el estatus del usuario
    if (user.estatus !== 'activo') {
      console.log('[AUTH] ❌ Usuario con estatus:', user.estatus, '- Email:', email);
      let errorMessage = 'Tu cuenta no está disponible.';
      if (user.estatus === 'inactivo') {
        errorMessage = 'Tu cuenta está inactiva. Contacta al administrador.';
      } else if (user.estatus === 'baneado') {
        errorMessage = 'Tu cuenta ha sido suspendida. Contacta al administrador.';
      }
      
      return res.render('login', {
        title: 'Proyecto Certificación',
        error: errorMessage,
        email: email
      });
    }
    
    // Verificar contraseña (simple comparación - en producción usar bcrypt)
    if (user.password !== password) {
      console.log('[AUTH] ❌ Contraseña incorrecta para:', email);
      return res.render('login', {
        title: 'Proyecto Certificación',
        error: 'Email o contraseña incorrectos',
        email: email
      });
    }
    
    // Login exitoso
    console.log('[AUTH] ✅ Login exitoso para:', email, '- Rol:', user.rol);
    
    // Crear nombre completo
    const nombreCompleto = `${user.nombre} ${user.apellido}`;
    
    // Redirigir según el rol del usuario
    if (user.rol === 'instructor') {
      console.log('[AUTH] 📚 Redirigiendo instructor al dashboard');
      res.redirect(`/auth/dashboard?user=${encodeURIComponent(nombreCompleto)}&email=${encodeURIComponent(user.email)}&rol=${user.rol}&id=${user.id_usuario}`);
    } else if (user.rol === 'user') {
      console.log('[AUTH] 🌐 Redirigiendo usuario a UNE');
      // Redirigir a une.edu.mx
      res.redirect('https://une.edu.mx');
    } else {
      console.log('[AUTH] ⚠️ Rol no reconocido:', user.rol);
      return res.render('login', {
        title: 'Proyecto Certificación',
        error: 'Rol de usuario no válido. Contacta al administrador.',
        email: email
      });
    }
    
  } catch (error) {
    console.error('[AUTH] ❌ Error en login:', error.message);
    res.render('login', {
      title: 'Proyecto Certificación',
      error: 'Error interno del servidor. Intenta nuevamente.',
      email: req.body.email || ''
    });
  }
});

/* GET dashboard - Página después del login (solo para instructores) */
router.get('/dashboard', function(req, res, next) {
  const { user, email, rol, id } = req.query;
  
  if (!user || !email || !rol) {
    return res.redirect('/auth/login');
  }
  
  // Solo permitir acceso a instructores
  if (rol !== 'instructor') {
    return res.redirect('/auth/login?error=acceso_denegado');
  }
  
  res.render('instructor-dashboard', {
    title: 'Dashboard de Instructor',
    userName: user,
    userEmail: email,
    userRole: rol,
    userId: id
  });
});

/* POST logout */
router.post('/logout', function(req, res, next) {
  console.log('[AUTH] 👋 Usuario cerró sesión');
  res.redirect('/?message=Sesión cerrada correctamente');
});

module.exports = router;