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
    
    // Login exitoso - verificar si necesita 2FA
    console.log('[AUTH] ✅ Login exitoso para:', email, '- Rol:', user.rol);
    
    const twoFactorService = require('../services/twoFactorService');
    
    // Verificar si el usuario requiere 2FA
    if (twoFactorService.requires2FA(user.rol)) {
      // Verificar si las columnas de 2FA existen antes de consultarlas
      let twoFactorData = { two_factor_enabled: false, two_factor_verified: false };
      
      try {
        const twoFactorResult = await db.executeQuery(
          `SELECT two_factor_enabled, two_factor_verified FROM Usuarios WHERE id_usuario = @id`,
          { id: user.id_usuario }
        );
        
        if (twoFactorResult.recordset.length > 0) {
          twoFactorData = twoFactorResult.recordset[0];
        }
      } catch (columnError) {
        // Las columnas de 2FA no existen aún - continuar sin 2FA
        console.log('[AUTH] ⚠️ Columnas de 2FA no encontradas, continuando sin 2FA:', columnError.message);
        
        // Crear sesión normal y continuar
        req.session.userId = user.id_usuario;
        req.session.userRole = user.rol;
        req.session.userName = user.nombre + ' ' + user.apellido;
        req.session.userEmail = user.email;
        
        console.log('[AUTH] ✅ Sesión creada para:', user.email);
        
        // Redirigir según el rol
        if (user.rol === 'instructor' || user.rol === 'admin') {
          return res.redirect('/dashboard');
        } else {
          return res.redirect('/cursos');
        }
      }
      
      if (!twoFactorData.two_factor_enabled || !twoFactorData.two_factor_verified) {
        // Usuario necesita configurar 2FA
        console.log('[AUTH] 🔐 Usuario requiere configurar 2FA:', email);
        
        // Crear sesión temporal para configurar 2FA
        req.session.user = {
          id: user.id_usuario,
          nombre: `${user.nombre} ${user.apellido}`,
          email: user.email,
          rol: user.rol,
          two_factor_enabled: false,
          two_factor_verified: false,
          loginTime: new Date().toISOString()
        };
        
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
          
          console.log('[AUTH] 🔐 Redirigiendo a configuración de 2FA');
          res.redirect('/two-factor/setup');
        });
        return;
      } else {
        // Usuario tiene 2FA configurado - necesita verificarlo
        console.log('[AUTH] 🔐 Usuario requiere verificación 2FA:', email);
        
        // Crear sesión pendiente para verificación 2FA
        req.session.pending2FA = {
          email: user.email,
          userId: user.id_usuario,
          nombre: `${user.nombre} ${user.apellido}`,
          rol: user.rol,
          loginTime: new Date().toISOString()
        };
        
        req.session.save((err) => {
          if (err) {
            console.error('[AUTH] ❌ Error guardando sesión pendiente:', err);
            return res.render('login-bootstrap', {
              title: 'Iniciar Sesión',
              error: 'Error interno. Intenta nuevamente.',
              email: email,
              layout: false
            });
          }
          
          console.log('[AUTH] 🔐 Redirigiendo a verificación 2FA');
          res.redirect('/two-factor/verify');
        });
        return;
      }
    }
    
    // Usuario no requiere 2FA o ya está verificado - crear sesión completa
    const nombreCompleto = `${user.nombre} ${user.apellido}`;
    req.session.user = {
      id: user.id_usuario,
      nombre: nombreCompleto,
      email: user.email,
      rol: user.rol,
      two_factor_enabled: false,
      two_factor_verified: false,
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
