var express = require('express');
var router = express.Router();
var bcrypt = require('bcryptjs');

/* GET login page */
router.get('/login', function(req, res, next) {
  res.render('auth/login-bootstrap', { 
    title: 'Iniciar Sesión',
    email: req.query.email || '',
    error: req.query.error ? decodeURIComponent(req.query.error) : null,
    success: req.query.success ? decodeURIComponent(req.query.success) : null,
    redirectTo: req.query.redirect || '',
    layout: false
  });
});

/* POST login - Procesar login */
router.post('/login', async function(req, res, next) {
  try {
    const { email, password, redirectTo } = req.body;
    
    // Validación básica
    if (!email || !password) {
      return res.render('auth/login-bootstrap', {
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
      return res.render('auth/login-bootstrap', {
        title: 'Iniciar Sesión',
        error: 'Sistema en mantenimiento. Intenta más tarde.',
        email: email,
        layout: false
      });
    }
    
    console.log('[AUTH] 🔐 Intento de login para:', email);
    
    // Buscar usuario en la base de datos incluyendo información de contraseña temporal
    const result = await db.executeQuery(
      `SELECT id_usuario, nombre, apellido, nombre_usuario, email, password, rol, estatus, 
              ISNULL(tiene_password_temporal, 0) as tiene_password_temporal, 
              fecha_password_temporal
       FROM Usuarios WHERE email = @email`,
      { email: email.toLowerCase() }
    );
    
    console.log('[AUTH] 📊 Consulta ejecutada, resultados encontrados:', result.recordset.length);
    
    if (result.recordset.length === 0) {
      console.log('[AUTH] ❌ Usuario no encontrado:', email);
      return res.render('auth/login-bootstrap', {
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
      
      return res.render('auth/login-bootstrap', {
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
      return res.render('auth/login-bootstrap', {
        title: 'Iniciar Sesión',
        error: 'Email o contraseña incorrectos',
        email: email,
        layout: false
      });
    }
    
    // Login exitoso - verificar si tiene contraseña temporal
    console.log('[AUTH] ✅ Login exitoso para:', email, '- Rol:', user.rol);
    
    // Verificar si el usuario tiene contraseña temporal
    if (user.tiene_password_temporal) {
      console.log('[AUTH] 🔐 Usuario tiene contraseña temporal, requiere cambio');
      
      // Crear sesión temporal para el cambio de contraseña
      req.session.tempUser = {
        id: user.id_usuario,
        nombre: `${user.nombre} ${user.apellido}`,
        email: user.email,
        rol: user.rol,
        requirePasswordChange: true,
        fecha_password_temporal: user.fecha_password_temporal
      };
      
      req.session.save((err) => {
        if (err) {
          console.error('[AUTH] ❌ Error guardando sesión temporal:', err);
          return res.render('auth/login-bootstrap', {
            title: 'Iniciar Sesión',
            error: 'Error interno. Intenta nuevamente.',
            email: email,
            layout: false
          });
        }
        
        console.log('[AUTH] 🔄 Redirigiendo a cambio de contraseña obligatorio');
        res.redirect('/auth/change-password');
      });
      return;
    }
    
        // Importar el servicio de two-factor auth
    const twoFactorService = require('../../services/twoFactorService');
    
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
        
        // Crear sesión normal con permisos RBAC
        const { cargarPermisosUsuario } = require('../../middleware/auth');
        let permisos = [];
        
        try {
          permisos = await cargarPermisosUsuario(user.id_usuario, db);
          console.log('[AUTH] 🔐 Permisos cargados para', user.email, ':', permisos.length, 'permisos');
        } catch (permissionError) {
          console.error('[AUTH] ⚠️ Error cargando permisos RBAC:', permissionError.message);
        }
        
        req.session.user = {
          id: user.id_usuario,
          nombre: `${user.nombre} ${user.apellido}`,
          email: user.email,
          rol: user.rol,
          permisos: permisos,
          two_factor_enabled: false,
          two_factor_verified: false,
          loginTime: new Date().toISOString()
        };
        
        console.log('[AUTH] ✅ Sesión creada para:', user.email);
        
        // Redirigir según el rol
        if (user.rol === 'instructor' || user.rol === 'admin') {
          return res.redirect('/dashboard');
        } else {
          return res.redirect('/user-dashboard');
        }
      }
      
      if (!twoFactorData.two_factor_enabled || !twoFactorData.two_factor_verified) {
        // Usuario necesita configurar 2FA
        console.log('[AUTH] 🔐 Usuario requiere configurar 2FA:', email);
        
        // Crear sesión temporal para configurar 2FA (sin permisos aún)
        req.session.user = {
          id: user.id_usuario,
          nombre: `${user.nombre} ${user.apellido}`,
          email: user.email,
          rol: user.rol,
          permisos: [], // Sin permisos hasta completar 2FA
          two_factor_enabled: false,
          two_factor_verified: false,
          loginTime: new Date().toISOString()
        };
        
        req.session.save((err) => {
          if (err) {
            console.error('[AUTH] ❌ Error guardando sesión:', err);
            return res.render('auth/login-bootstrap', {
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
        
        console.log('[AUTH] 💾 Guardando sesión pendiente de 2FA para:', email);
        
        req.session.save((err) => {
          if (err) {
            console.error('[AUTH] ❌ Error guardando sesión pendiente:', err);
            return res.render('auth/login-bootstrap', {
              title: 'Iniciar Sesión',
              error: 'Error interno. Intenta nuevamente.',
              email: email,
              layout: false
            });
          }
          
          console.log('[AUTH] ✅ Sesión pendiente guardada exitosamente');
          console.log('[AUTH] 🔐 Redirigiendo a verificación 2FA');
          
          // Añadir un pequeño delay para asegurar que la sesión se guarde
          setTimeout(() => {
            res.redirect('/two-factor/verify');
          }, 100);
        });
        return;
      }
    }
    
    // Usuario no requiere 2FA o ya está verificado - crear sesión completa con permisos RBAC
    const nombreCompleto = `${user.nombre} ${user.apellido}`;
    
    // Cargar permisos del usuario desde RBAC
    const { cargarPermisosUsuario } = require('../../middleware/auth');
    let permisos = [];
    
    try {
      permisos = await cargarPermisosUsuario(user.id_usuario, db);
      console.log('[AUTH] 🔐 Permisos cargados para', user.email, ':', permisos.length, 'permisos');
    } catch (permissionError) {
      console.error('[AUTH] ⚠️ Error cargando permisos RBAC:', permissionError.message);
      // Continuar sin permisos - para compatibilidad con sistema anterior
    }
    
    req.session.user = {
      id: user.id_usuario,
      nombre: nombreCompleto,
      email: user.email,
      rol: user.rol,
      permisos: permisos, // 🆕 Agregamos los permisos al objeto de sesión
      two_factor_enabled: false,
      two_factor_verified: false,
      loginTime: new Date().toISOString()
    };
    
    // Guardar sesión antes de redirigir
    req.session.save((err) => {
      if (err) {
        console.error('[AUTH] ❌ Error guardando sesión:', err);
        return res.render('auth/login-bootstrap', {
          title: 'Iniciar Sesión',
          error: 'Error interno. Intenta nuevamente.',
          email: email,
          layout: false
        });
      }
      
      console.log('[AUTH] 💾 Sesión creada exitosamente para:', email);
      console.log('[AUTH] 👤 Usuario en sesión:', req.session.user);
      console.log('[AUTH] 🎯 Redirigiendo a:', redirectTo || '/user-dashboard');
      
      // Redirigir según el rol del usuario
      if (user.rol === 'instructor') {
        console.log('[AUTH] 📚 Redirigiendo instructor al dashboard');
        res.redirect(redirectTo || '/dashboard');
      } else if (user.rol === 'user' || user.rol === 'estudiante') {
        console.log('[AUTH] 👨‍🎓 Redirigiendo estudiante al dashboard de usuario');
        res.redirect(redirectTo || '/user-dashboard');
      } else {
        console.log('[AUTH] ⚠️ Rol no reconocido:', user.rol);
        return res.render('auth/login-bootstrap', {
          title: 'Iniciar Sesión',
          error: 'Rol de usuario no válido. Contacta al administrador.',
          email: email,
          layout: false
        });
      }
    });
    
  } catch (error) {
    console.error('[AUTH] ❌ Error en login:', error.message);
    res.render('auth/login-bootstrap', {
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

/* GET - Formulario de cambio de contraseña obligatorio */
router.get('/change-password', function(req, res, next) {
  // Verificar que el usuario tenga una sesión temporal válida
  if (!req.session.tempUser || !req.session.tempUser.requirePasswordChange) {
    console.log('[AUTH] ⚠️ Intento de acceso a cambio de contraseña sin sesión válida');
    return res.redirect('/auth/login?error=Sesión no válida');
  }
  
  const tempUser = req.session.tempUser;
  console.log('[AUTH] 📄 Mostrando formulario de cambio de contraseña para:', tempUser.email);
  
  res.render('auth/change-password', {
    title: 'Cambiar Contraseña',
    userName: tempUser.nombre,
    email: tempUser.email,
    error: req.query.error ? decodeURIComponent(req.query.error) : null,
    success: req.query.success ? decodeURIComponent(req.query.success) : null,
    layout: false
  });
});

/* POST - Procesar cambio de contraseña obligatorio */
router.post('/change-password', async function(req, res, next) {
  try {
    // Verificar sesión temporal
    if (!req.session.tempUser || !req.session.tempUser.requirePasswordChange) {
      return res.redirect('/auth/login?error=Sesión no válida');
    }
    
    const { currentPassword, newPassword, confirmPassword } = req.body;
    const tempUser = req.session.tempUser;
    
    // Validaciones
    if (!currentPassword || !newPassword || !confirmPassword) {
      return res.render('auth/change-password', {
        title: 'Cambiar Contraseña',
        userName: tempUser.nombre,
        email: tempUser.email,
        error: 'Todos los campos son obligatorios',
        layout: false
      });
    }
    
    if (newPassword !== confirmPassword) {
      return res.render('auth/change-password', {
        title: 'Cambiar Contraseña',
        userName: tempUser.nombre,
        email: tempUser.email,
        error: 'Las contraseñas nuevas no coinciden',
        layout: false
      });
    }
    
    if (newPassword.length < 6) {
      return res.render('auth/change-password', {
        title: 'Cambiar Contraseña',
        userName: tempUser.nombre,
        email: tempUser.email,
        error: 'La nueva contraseña debe tener al menos 6 caracteres',
        layout: false
      });
    }
    
    const db = req.app.locals.db;
    
    // Verificar contraseña actual
    const userResult = await db.executeQuery(
      'SELECT password FROM Usuarios WHERE id_usuario = @id',
      { id: tempUser.id }
    );
    
    if (userResult.recordset.length === 0) {
      return res.render('auth/change-password', {
        title: 'Cambiar Contraseña',
        userName: tempUser.nombre,
        email: tempUser.email,
        error: 'Usuario no encontrado',
        layout: false
      });
    }
    
    const user = userResult.recordset[0];
    const passwordMatch = await bcrypt.compare(currentPassword, user.password);
    
    if (!passwordMatch) {
      console.log('[AUTH] ❌ Contraseña actual incorrecta para:', tempUser.email);
      return res.render('auth/change-password', {
        title: 'Cambiar Contraseña',
        userName: tempUser.nombre,
        email: tempUser.email,
        error: 'La contraseña actual es incorrecta',
        layout: false
      });
    }
    
    // Hashear nueva contraseña
    const hashedNewPassword = await bcrypt.hash(newPassword, 10);
    
    // Actualizar contraseña y quitar el flag de contraseña temporal
    await db.executeQuery(
      `UPDATE Usuarios 
       SET password = @newPassword, 
           tiene_password_temporal = 0, 
           fecha_password_temporal = NULL 
       WHERE id_usuario = @id`,
      { 
        newPassword: hashedNewPassword, 
        id: tempUser.id 
      }
    );
    
    console.log('[AUTH] ✅ Contraseña actualizada exitosamente para:', tempUser.email);
    
    // Enviar notificación por email
    const emailService = require('../../services/emailService');
    try {
      await emailService.enviarNotificacionCambioPassword(
        tempUser.email,
        tempUser.nombre.split(' ')[0], // Primer nombre
        tempUser.nombre.split(' ').slice(1).join(' ') // Apellidos
      );
    } catch (emailError) {
      console.error('[AUTH] ⚠️ Error enviando notificación de cambio:', emailError.message);
    }
    
    // Crear sesión completa del usuario con permisos RBAC
    const { cargarPermisosUsuario } = require('../../middleware/auth');
    let permisos = [];
    
    try {
      permisos = await cargarPermisosUsuario(tempUser.id, db);
      console.log('[AUTH] 🔐 Permisos cargados tras cambio de contraseña para', tempUser.email, ':', permisos.length, 'permisos');
    } catch (permissionError) {
      console.error('[AUTH] ⚠️ Error cargando permisos RBAC:', permissionError.message);
    }
    
    req.session.user = {
      id: tempUser.id,
      nombre: tempUser.nombre,
      email: tempUser.email,
      rol: tempUser.rol,
      permisos: permisos,
      two_factor_enabled: false,
      two_factor_verified: false,
      loginTime: new Date().toISOString()
    };
    
    // Limpiar sesión temporal
    delete req.session.tempUser;
    
    req.session.save((err) => {
      if (err) {
        console.error('[AUTH] ❌ Error guardando sesión completa:', err);
        return res.render('auth/change-password', {
          title: 'Cambiar Contraseña',
          userName: tempUser.nombre,
          email: tempUser.email,
          error: 'Error interno. Contacta al administrador.',
          layout: false
        });
      }
      
      console.log('[AUTH] 💾 Sesión completa creada para:', tempUser.email);
      
      // Redirigir según el rol
      if (tempUser.rol === 'instructor') {
        res.redirect('/dashboard?success=Contraseña actualizada correctamente');
      } else {
        res.redirect('/cursos?success=Contraseña actualizada correctamente');
      }
    });
    
  } catch (error) {
    console.error('[AUTH] ❌ Error en cambio de contraseña:', error.message);
    
    const tempUser = req.session.tempUser;
    if (tempUser) {
      res.render('auth/change-password', {
        title: 'Cambiar Contraseña',
        userName: tempUser.nombre,
        email: tempUser.email,
        error: 'Error interno del servidor. Intenta nuevamente.',
        layout: false
      });
    } else {
      res.redirect('/auth/login?error=Error interno del servidor');
    }
  }
});

/* GET forgot password page */
router.get('/forgot-password', function(req, res, next) {
  res.render('auth/forgot-password', { 
    title: 'Plataforma de Barbería',
    email: req.query.email || '',
    error: req.query.error ? decodeURIComponent(req.query.error) : null,
    success: req.query.success ? decodeURIComponent(req.query.success) : null,
    info: req.query.info ? decodeURIComponent(req.query.info) : null,
    layout: false
  });
});

/* POST forgot password - Enviar email de recuperación */
router.post('/forgot-password', async function(req, res, next) {
  try {
    const { email } = req.body;
    
    // Validación básica
    if (!email) {
      return res.render('auth/forgot-password', {
        title: 'Plataforma de Barbería',
        error: 'Por favor ingresa tu email',
        email: email,
        layout: false
      });
    }

    // Validar formato de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.render('auth/forgot-password', {
        title: 'Plataforma de Barbería',
        error: 'Por favor ingresa un email válido',
        email: email,
        layout: false
      });
    }

    const db = req.app.locals.db;
    
    // Verificar si hay conexión a base de datos
    if (!db) {
      console.log('[AUTH] ⚠️ No hay conexión a base de datos');
      return res.render('auth/forgot-password', {
        title: 'Plataforma de Barbería',
        error: 'Sistema en mantenimiento. Intenta más tarde.',
        email: email,
        layout: false
      });
    }
    
    console.log('[AUTH] 🔄 Solicitud de recuperación de contraseña para:', email);
    
    // Buscar usuario en la base de datos
    const result = await db.executeQuery(
      'SELECT id_usuario, nombre, apellido, email FROM Usuarios WHERE email = @email AND estatus = @estatus',
      { email: email, estatus: 'activo' }
    );
    
    // Por seguridad, siempre mostramos el mismo mensaje aunque el usuario no exista
    const successMessage = 'Si el email existe en nuestro sistema, recibirás las instrucciones para restablecer tu contraseña en los próximos minutos.';
    
    if (result.recordset && result.recordset.length > 0) {
      const usuario = result.recordset[0];
      
      // Generar token único para reseteo
      const crypto = require('crypto');
      const resetToken = crypto.randomBytes(32).toString('hex');
      const resetTokenExpiry = new Date(Date.now() + 3600000); // 1 hora
      
      // Guardar token en la base de datos
      await db.executeQuery(
        `UPDATE Usuarios 
         SET reset_token = @token, reset_token_expiry = @expiry 
         WHERE id_usuario = @userId`,
        { token: resetToken, expiry: resetTokenExpiry, userId: usuario.id_usuario }
      );
      
      // Enviar email con instrucciones
      const emailService = require('../../services/emailService');
      
      const resetUrl = `${req.protocol}://${req.get('host')}/auth/reset-password?token=${resetToken}`;
      
      try {
        await emailService.enviarRecuperacionPassword(
          usuario.email,
          usuario.nombre,
          usuario.apellido,
          resetUrl
        );
        console.log('[AUTH] ✅ Email de recuperación enviado a:', email);
      } catch (emailError) {
        console.error('[AUTH] ❌ Error enviando email:', emailError.message);
        // No revelamos el error de email al usuario por seguridad
      }
    } else {
      console.log('[AUTH] ⚠️ Intento de recuperación para email no existente:', email);
    }
    
    // Siempre mostrar mensaje de éxito por seguridad
    res.render('auth/forgot-password', {
      title: 'Plataforma de Barbería',
      success: successMessage,
      email: '',
      layout: false
    });
    
  } catch (error) {
    console.error('[AUTH] ❌ Error en forgot-password:', error);
    res.render('auth/forgot-password', {
      title: 'Plataforma de Barbería',
      error: 'Ocurrió un error interno. Intenta más tarde.',
      email: req.body.email || '',
      layout: false
    });
  }
});

/* GET reset password page */
router.get('/reset-password', async function(req, res, next) {
  try {
    const { token } = req.query;
    
    if (!token) {
      return res.redirect('/auth/forgot-password?error=' + encodeURIComponent('Token no válido'));
    }
    
    const db = req.app.locals.db;
    
    if (!db) {
      return res.redirect('/auth/forgot-password?error=' + encodeURIComponent('Sistema en mantenimiento'));
    }
    
    // Verificar token y que no haya expirado
    const result = await db.executeQuery(
      'SELECT id_usuario, nombre, apellido, email FROM Usuarios WHERE reset_token = @token AND reset_token_expiry > @now AND estatus = @estatus',
      { token: token, now: new Date(), estatus: 'activo' }
    );
    
    if (!result.recordset || result.recordset.length === 0) {
      return res.redirect('/auth/forgot-password?error=' + encodeURIComponent('El enlace ha expirado o no es válido. Solicita uno nuevo.'));
    }

    res.render('auth/reset-password', {
      title: 'Plataforma de Barbería',
      token: token,
      layout: false
    });  } catch (error) {
    console.error('[AUTH] ❌ Error en reset-password GET:', error);
    res.redirect('/auth/forgot-password?error=' + encodeURIComponent('Ocurrió un error. Intenta más tarde.'));
  }
});

/* POST reset password - Cambiar contraseña */
router.post('/reset-password', async function(req, res, next) {
  try {
    const { token, password, confirmPassword } = req.body;
    
    // Validaciones básicas
    if (!token || !password || !confirmPassword) {
      return res.render('auth/reset-password', {
        title: 'Plataforma de Barbería',
        error: 'Todos los campos son obligatorios',
        token: token,
        layout: false
      });
    }
    
    if (password !== confirmPassword) {
      return res.render('auth/reset-password', {
        title: 'Plataforma de Barbería',
        error: 'Las contraseñas no coinciden',
        token: token,
        layout: false
      });
    }
    
    // Validar fortaleza de contraseña
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*])[A-Za-z\d!@#$%^&*]{8,}$/;
    if (!passwordRegex.test(password)) {
      return res.render('auth/reset-password', {
        title: 'Plataforma de Barbería',
        error: 'La contraseña debe tener al menos 8 caracteres, incluyendo mayúsculas, minúsculas, números y símbolos',
        token: token,
        layout: false
      });
    }
    
    const db = req.app.locals.db;
    
    if (!db) {
      return res.render('auth/reset-password', {
        title: 'Plataforma de Barbería',
        error: 'Sistema en mantenimiento. Intenta más tarde.',
        token: token,
        layout: false
      });
    }
    
    // Verificar token y que no haya expirado
    const result = await db.executeQuery(
      'SELECT id_usuario, nombre, apellido, email FROM Usuarios WHERE reset_token = @token AND reset_token_expiry > @now AND estatus = @estatus',
      { token: token, now: new Date(), estatus: 'activo' }
    );
    
    if (!result.recordset || result.recordset.length === 0) {
      return res.render('auth/reset-password', {
        title: 'Plataforma de Barbería',
        error: 'El enlace ha expirado o no es válido. Solicita uno nuevo.',
        token: token,
        layout: false
      });
    }
    
    const usuario = result.recordset[0];
    
    // Encriptar nueva contraseña
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(password, saltRounds);
    
    // Actualizar contraseña y limpiar token
    await db.executeQuery(
      `UPDATE Usuarios 
       SET password = @password, reset_token = NULL, reset_token_expiry = NULL, 
           tiene_password_temporal = 0, fecha_password_temporal = NULL
       WHERE id_usuario = @userId`,
      { password: hashedPassword, userId: usuario.id_usuario }
    );
    
    console.log('[AUTH] ✅ Contraseña restablecida para usuario:', usuario.email);
    
    // Enviar email de confirmación (opcional)
    try {
      const emailService = require('../../services/emailService');
      await emailService.enviarConfirmacionCambioPassword(
        usuario.email,
        usuario.nombre,
        usuario.apellido
      );
    } catch (emailError) {
      console.error('[AUTH] ⚠️ Error enviando email de confirmación:', emailError.message);
    }
    
    // Redirigir al login con mensaje de éxito
    res.redirect('/auth/login?success=' + encodeURIComponent('Tu contraseña ha sido cambiada exitosamente. Ya puedes iniciar sesión.'));
    
  } catch (error) {
    console.error('[AUTH] ❌ Error en reset-password POST:', error);
    res.render('auth/reset-password', {
      title: 'Plataforma de Barbería',
      error: 'Ocurrió un error interno. Intenta más tarde.',
      token: req.body.token,
      layout: false
    });
  }
});

module.exports = router;
