var express = require('express');
var router = express.Router();
var bcrypt = require('bcryptjs');

/* GET login page */
router.get('/login', function(req, res, next) {
  res.render('login-bootstrap', { 
    title: 'Iniciar Sesión',
    email: req.query.email || '',
    error: req.query.error ? decodeURIComponent(req.query.error) : null,
    success: req.query.success ? decodeURIComponent(req.query.success) : null,
    layout: false
  });
});

/* POST login - Procesar login */
router.post('/login', async function(req, res, next) {
  try {
    const { email, password } = req.body;
    
    // Validación básica
    if (!email || !password) {
      return res.render('login-bootstrap', {
        title: 'Iniciar Sesión',
        error: 'Por favor ingresa email y contraseña',
        email: email,
        layout: false
      });
    }

    const db = req.app.locals.db;
    
    // Verificar si hay conexión a base de datos
    if (!db) {
      console.log('[AUTH] ⚠️ No hay conexión a base de datos');
      return res.render('login-bootstrap', {
        title: 'Iniciar Sesión',
        error: 'Sistema en mantenimiento. Intenta más tarde.',
        email: email,
        layout: false
      });
    }
    
    console.log('[AUTH] 🔐 Intento de login para:', email);
    
    // Buscar usuario en la base de datos con la nueva estructura
    const result = await db.executeQuery(
      `SELECT id_usuario, nombre, apellido, nombre_usuario, email, password, rol, estatus 
       FROM Usuarios WHERE email = @email`,
      { email: email.toLowerCase() }
    );
    
    console.log('[AUTH] 📊 Consulta ejecutada, resultados encontrados:', result.recordset.length);
    
    if (result.recordset.length === 0) {
      console.log('[AUTH] ❌ Usuario no encontrado:', email);
      return res.render('login-bootstrap', {
        title: 'Iniciar Sesión',
        error: 'Email o contraseña incorrectos',
        email: email,
        layout: false
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
      
      return res.render('login-bootstrap', {
        title: 'Iniciar Sesión',
        error: errorMessage,
        email: email,
        layout: false
      });
    }
    
    // Verificar contraseña (primero intentar con bcrypt, luego comparación directa)
    let passwordMatch = false;
    
    try {
      // Verificar si la contraseña almacenada es un hash de bcrypt
      const isBcryptHash = /^\$2[abxy]\$/.test(user.password);
      
      if (isBcryptHash) {
        // Contraseña hasheada - usar bcrypt.compare
        passwordMatch = await bcrypt.compare(password, user.password);
        console.log('[AUTH] 🔐 Verificando contraseña hasheada para:', email);
      } else {
        // Contraseña en texto plano (para migración) - comparación directa
        console.log('[AUTH] ⚠️ ADVERTENCIA: Contraseña en texto plano detectada para:', email);
        passwordMatch = (password === user.password);
        
        // Si la contraseña coincide, hashearla automáticamente
        if (passwordMatch) {
          console.log('[AUTH] 🔄 Hasheando contraseña automáticamente para:', email);
          const hashedPassword = await bcrypt.hash(password, 10);
          
          // Actualizar en la base de datos
          await db.executeQuery(
            'UPDATE Usuarios SET password = @hashedPassword WHERE id_usuario = @id',
            { hashedPassword: hashedPassword, id: user.id_usuario }
          );
          
          console.log('[AUTH] ✅ Contraseña actualizada y hasheada para:', email);
        }
      }
    } catch (bcryptError) {
      console.log('[AUTH] ⚠️ Error en verificación bcrypt, intentando comparación directa:', bcryptError.message);
      // Si bcrypt falla, intentar comparación directa
      passwordMatch = (password === user.password);
    }
    
    if (!passwordMatch) {
      console.log('[AUTH] ❌ Contraseña incorrecta para:', email);
      return res.render('login-bootstrap', {
        title: 'Iniciar Sesión',
        error: 'Email o contraseña incorrectos',
        email: email,
        layout: false
      });
    }
    
    // Login exitoso
    console.log('[AUTH] ✅ Login exitoso para:', email, '- Rol:', user.rol);
    
    // Crear sesión segura
    const nombreCompleto = `${user.nombre} ${user.apellido}`;
    req.session.user = {
      id: user.id_usuario,
      nombre: nombreCompleto,
      email: user.email,
      rol: user.rol,
      loginTime: new Date().toISOString()
    };
    
    // Guardar sesión antes de redirigir
    req.session.save((err) => {
      if (err) {
        console.error('[AUTH] ❌ Error guardando sesión:', err);
        return res.render('login-bootstrap', {
          title: 'Iniciar Sesión',
          error: 'Error interno. Intenta nuevamente.',
          email: email,
          layout: false
        });
      }
      
      console.log('[AUTH] 💾 Sesión creada exitosamente para:', email);
      
      // Verificar si hay una URL de redirección guardada
      const redirectTo = req.session.redirectTo || null;
      delete req.session.redirectTo;
      
      // Redirigir según el rol del usuario
      if (user.rol === 'instructor') {
        console.log('[AUTH] 📚 Redirigiendo instructor al dashboard');
        res.redirect(redirectTo || '/dashboard');
      } else if (user.rol === 'user' || user.rol === 'estudiante') {
        console.log('[AUTH] 👨‍🎓 Redirigiendo estudiante a plataforma de cursos');
        res.redirect(redirectTo || '/cursos');
      } else {
        console.log('[AUTH] ⚠️ Rol no reconocido:', user.rol);
        return res.render('login-bootstrap', {
          title: 'Iniciar Sesión',
          error: 'Rol de usuario no válido. Contacta al administrador.',
          email: email,
          layout: false
        });
      }
    });
    
  } catch (error) {
    console.error('[AUTH] ❌ Error en login:', error.message);
    res.render('login-bootstrap', {
      title: 'Iniciar Sesión',
      error: 'Error interno del servidor. Intenta nuevamente.',
      email: req.body.email || '',
      layout: false
    });
  }
});

/* GET dashboard - Página después del login (solo para instructores) */
router.get('/dashboard', function(req, res, next) {
  // Esta ruta ya no es necesaria ya que el dashboard está protegido por middleware
  // Redirigir al dashboard principal
  res.redirect('/dashboard');
});

/* POST logout */
router.post('/logout', function(req, res, next) {
  const userEmail = req.session?.user?.email || 'Usuario desconocido';
  
  req.session.destroy((err) => {
    if (err) {
      console.error('[AUTH] ❌ Error destruyendo sesión:', err);
      return res.redirect('/?error=Error cerrando sesión');
    }
    
    console.log('[AUTH] 👋 Sesión cerrada exitosamente para:', userEmail);
    res.clearCookie('connect.sid'); // Limpiar cookie de sesión
    res.redirect('/?message=Sesión cerrada correctamente');
  });
});

/* GET logout - También permitir logout por GET */
router.get('/logout', function(req, res, next) {
  const userEmail = req.session?.user?.email || 'Usuario desconocido';
  
  req.session.destroy((err) => {
    if (err) {
      console.error('[AUTH] ❌ Error destruyendo sesión:', err);
      return res.redirect('/?error=Error cerrando sesión');
    }
    
    console.log('[AUTH] 👋 Sesión cerrada exitosamente para:', userEmail);
    res.clearCookie('connect.sid');
    res.redirect('/?message=Sesión cerrada correctamente');
  });
});

module.exports = router;
