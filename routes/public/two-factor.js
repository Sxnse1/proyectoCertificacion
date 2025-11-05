const express = require('express');
const router = express.Router();
const twoFactorService = require('../../services/twoFactorService');
const { requireBasicAuth } = require('../../middleware/auth');

/* GET - Página de configuración de 2FA */
router.get('/setup', requireBasicAuth, async function(req, res, next) {
  try {
    const user = req.session.user;

    // Solo instructores y admins pueden configurar 2FA
    if (!twoFactorService.requires2FA(user.rol)) {
      return res.redirect('/dashboard?error=no_requiere_2fa');
    }

    // Si ya tiene 2FA configurado, redirigir
    if (user.two_factor_enabled && user.two_factor_verified) {
      return res.redirect('/dashboard?message=2fa_ya_configurado');
    }

    // Generar setup para 2FA
    const setup = await twoFactorService.generateSetup(user.email, user.nombre);

    res.render('auth/two-factor-setup', {
      title: 'Configurar Autenticación de Dos Factores',
      user: user,
      qrCode: setup.qrCode,
      manualKey: setup.manualEntryKey,
      backupCodes: setup.backupCodes,
      secret: setup.secret,
      layout: false
    });

  } catch (error) {
    console.error('[2FA-SETUP] Error:', error);
    res.status(500).render('error', {
      message: 'Error al configurar autenticación de dos factores',
      error: error
    });
  }
});

/* POST - Verificar y activar 2FA */
router.post('/verify-setup', requireBasicAuth, async function(req, res, next) {
  try {
    const { token, secret, backup_codes } = req.body;
    const user = req.session.user;
    const db = req.app.locals.db;

    console.log('[2FA-VERIFY] Verificando setup para:', user.email);

    // Verificar token
    const isValid = twoFactorService.verifySetup(token, secret);

    if (!isValid) {
      return res.json({
        success: false,
        error: 'Código inválido. Verifica que tu aplicación de autenticación esté sincronizada.'
      });
    }

    // Guardar configuración en base de datos
    await db.executeQuery(`
      UPDATE Usuarios 
      SET 
        two_factor_secret = @secret,
        two_factor_enabled = 1,
        two_factor_verified = 1,
        backup_codes = @backup_codes
      WHERE id_usuario = @user_id
    `, {
      secret: secret,
      backup_codes: JSON.stringify(backup_codes),
      user_id: user.id
    });

    // Actualizar sesión
    req.session.user.two_factor_enabled = true;
    req.session.user.two_factor_verified = true;

    console.log('[2FA-VERIFY] ✅ 2FA configurado exitosamente para:', user.email);

    res.json({
      success: true,
      message: 'Autenticación de dos factores configurada exitosamente'
    });

  } catch (error) {
    console.error('[2FA-VERIFY] Error:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
});

/* GET - Página de verificación 2FA en login */
router.get('/verify', function(req, res, next) {
  console.log('[2FA] 🔍 Verificando sesión pendiente de 2FA');
  console.log('[2FA] 📊 Sesión actual:', {
    hasSession: !!req.session,
    hasPending2FA: !!req.session?.pending2FA,
    sessionKeys: req.session ? Object.keys(req.session) : 'No session'
  });
  
  // Verificar que hay una sesión pendiente de 2FA
  if (!req.session.pending2FA) {
    console.log('[2FA] ❌ No hay sesión pendiente de 2FA, redirigiendo a login');
    return res.redirect('/auth/login?error=sesion_invalida');
  }
  
  console.log('[2FA] ✅ Sesión pendiente encontrada para:', req.session.pending2FA.email);

  res.render('auth/two-factor-verify', {
    title: 'Verificación de Dos Factores',
    userEmail: req.session.pending2FA.email,
    layout: false
  });
});

/* POST - Verificar código 2FA en login */
router.post('/verify', async function(req, res, next) {
  try {
    const { token, backup_code } = req.body;
    const db = req.app.locals.db;

    // Verificar sesión pendiente
    if (!req.session.pending2FA) {
      return res.json({
        success: false,
        error: 'Sesión inválida. Por favor, inicia sesión nuevamente.'
      });
    }

    const userEmail = req.session.pending2FA.email;
    console.log('[2FA-LOGIN] Verificando 2FA para:', userEmail);

    // Obtener datos del usuario
    const userResult = await db.executeQuery(
      'SELECT * FROM Usuarios WHERE email = @email',
      { email: userEmail }
    );

    if (userResult.recordset.length === 0) {
      return res.json({
        success: false,
        error: 'Usuario no encontrado'
      });
    }

    const user = userResult.recordset[0];
    let isValid = false;
    let updatedBackupCodes = user.backup_codes;

    // Verificar código TOTP o código de respaldo
    if (token && token.trim()) {
      isValid = twoFactorService.verifyToken(token, user.two_factor_secret);
      console.log('[2FA-LOGIN] Verificación TOTP:', isValid);
    } else if (backup_code && backup_code.trim()) {
      const backupResult = twoFactorService.verifyBackupCode(backup_code, user.backup_codes);
      isValid = backupResult.valid;
      updatedBackupCodes = backupResult.remainingCodes;
      console.log('[2FA-LOGIN] Verificación código de respaldo:', isValid);

      // Actualizar códigos de respaldo si se usó uno
      if (isValid) {
        await db.executeQuery(
          'UPDATE Usuarios SET backup_codes = @backup_codes WHERE id_usuario = @user_id',
          { backup_codes: updatedBackupCodes, user_id: user.id_usuario }
        );
      }
    }

    if (!isValid) {
      return res.json({
        success: false,
        error: 'Código inválido. Verifica el código e inténtalo nuevamente.'
      });
    }

    // Crear sesión completa con permisos RBAC
    const { cargarPermisosUsuario } = require('../../middleware/auth');
    let permisos = [];
    
    try {
      permisos = await cargarPermisosUsuario(user.id_usuario, db);
      console.log('[2FA-LOGIN] 🔐 Permisos cargados tras 2FA para', user.email, ':', permisos.length, 'permisos');
    } catch (permissionError) {
      console.error('[2FA-LOGIN] ⚠️ Error cargando permisos RBAC:', permissionError.message);
    }
    
    req.session.user = {
      id: user.id_usuario,
      nombre: `${user.nombre} ${user.apellido}`,
      email: user.email,
      rol: user.rol,  
      permisos: permisos,
      two_factor_enabled: user.two_factor_enabled,
      two_factor_verified: user.two_factor_verified,
      loginTime: new Date().toISOString()
    };

    // Limpiar sesión pendiente
    delete req.session.pending2FA;

    console.log('[2FA-LOGIN] ✅ Login completo con 2FA para:', userEmail);

    res.json({
      success: true,
      message: 'Autenticación exitosa',
      redirect: user.rol === 'admin' ? '/dashboard' : '/dashboard'
    });

  } catch (error) {
    console.error('[2FA-LOGIN] Error:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
});

/* GET - Página para regenerar códigos de respaldo */
router.get('/backup-codes', requireBasicAuth, async function(req, res, next) {
  try {
    const user = req.session.user;

    if (!user.two_factor_enabled) {
      return res.redirect('/two-factor/setup');
    }

    res.render('two-factor-backup-codes', {
      title: 'Códigos de Respaldo - 2FA',
      user: user,
      layout: false
    });

  } catch (error) {
    console.error('[2FA-BACKUP] Error:', error);
    res.status(500).render('error', {
      message: 'Error al cargar códigos de respaldo',
      error: error
    });
  }
});

/* POST - Regenerar códigos de respaldo */
router.post('/regenerate-backup-codes', requireBasicAuth, async function(req, res, next) {
  try {
    const { current_password } = req.body;
    const user = req.session.user;
    const db = req.app.locals.db;

    // Verificar contraseña actual por seguridad
    const bcrypt = require('bcrypt');
    const userResult = await db.executeQuery(
      'SELECT password FROM Usuarios WHERE id_usuario = @user_id',
      { user_id: user.id }
    );

    const isValidPassword = await bcrypt.compare(current_password, userResult.recordset[0].password);

    if (!isValidPassword) {
      return res.json({
        success: false,
        error: 'Contraseña incorrecta'
      });
    }

    // Generar nuevos códigos
    const newBackupCodes = twoFactorService.generateBackupCodes();

    // Guardar en base de datos
    await db.executeQuery(
      'UPDATE Usuarios SET backup_codes = @backup_codes WHERE id_usuario = @user_id',
      { backup_codes: JSON.stringify(newBackupCodes), user_id: user.id }
    );

    console.log('[2FA-BACKUP] ✅ Códigos regenerados para:', user.email);

    res.json({
      success: true,
      backupCodes: newBackupCodes,
      message: 'Códigos de respaldo regenerados exitosamente'
    });

  } catch (error) {
    console.error('[2FA-BACKUP] Error:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
});

/* POST - Desactivar 2FA */
router.post('/disable', requireBasicAuth, async function(req, res, next) {
  try {
    const { current_password, token } = req.body;
    const user = req.session.user;
    const db = req.app.locals.db;

    // Verificar contraseña
    const bcrypt = require('bcrypt');
    const userResult = await db.executeQuery(
      'SELECT password, two_factor_secret FROM Usuarios WHERE id_usuario = @user_id',
      { user_id: user.id }
    );

    const userData = userResult.recordset[0];
    const isValidPassword = await bcrypt.compare(current_password, userData.password);

    if (!isValidPassword) {
      return res.json({
        success: false,
        error: 'Contraseña incorrecta'
      });
    }

    // Verificar código 2FA actual
    const isValidToken = twoFactorService.verifyToken(token, userData.two_factor_secret);

    if (!isValidToken) {
      return res.json({
        success: false,
        error: 'Código 2FA inválido'
      });
    }

    // Desactivar 2FA
    await db.executeQuery(`
      UPDATE Usuarios 
      SET 
        two_factor_secret = NULL,
        two_factor_enabled = 0,
        two_factor_verified = 0,
        backup_codes = NULL
      WHERE id_usuario = @user_id
    `, { user_id: user.id });

    // Actualizar sesión
    req.session.user.two_factor_enabled = false;
    req.session.user.two_factor_verified = false;

    console.log('[2FA-DISABLE] ✅ 2FA desactivado para:', user.email);

    res.json({
      success: true,
      message: 'Autenticación de dos factores desactivada exitosamente'
    });

  } catch (error) {
    console.error('[2FA-DISABLE] Error:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
});

/* GET - Página de gestión de 2FA */
router.get('/manage', function(req, res, next) {
  // Verificar que el usuario esté autenticado
  if (!req.session || !req.session.user) {
    return res.redirect('/auth/login?error=sesion_expirada');
  }

  // Verificar que tenga 2FA habilitado
  const twoFactorService = require('../../services/twoFactorService');
  if (!twoFactorService.requires2FA(req.session.user.rol)) {
    return res.redirect('/dashboard?error=acceso_denegado');
  }

  res.render('auth/two-factor-manage', {
    title: 'Gestionar 2FA',
    user: req.session.user,
    layout: false
  });
});

/* POST - Regenerar códigos de respaldo */
router.post('/regenerate-backup-codes', async function(req, res, next) {
  try {
    const db = req.app.locals.db;
    
    // Verificar autenticación
    if (!req.session || !req.session.user) {
      return res.status(401).json({
        success: false,
        error: 'No autenticado'
      });
    }

    const userId = req.session.user.id;
    console.log('[2FA-REGENERATE] Regenerando códigos para usuario:', userId);

    // Verificar que el usuario tenga 2FA habilitado
    const userResult = await db.executeQuery(
      'SELECT two_factor_enabled, two_factor_verified FROM Usuarios WHERE id_usuario = @userId',
      { userId: userId }
    );

    if (userResult.recordset.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Usuario no encontrado'
      });
    }

    const user = userResult.recordset[0];
    if (!user.two_factor_enabled || !user.two_factor_verified) {
      return res.status(400).json({
        success: false,
        error: 'No tienes 2FA habilitado'
      });
    }

    // Generar nuevos códigos de respaldo
    const twoFactorService = require('../../services/twoFactorService');
    const newBackupCodes = twoFactorService.generateBackupCodes();

    // Actualizar en base de dados
    await db.executeQuery(
      'UPDATE Usuarios SET backup_codes = @backupCodes WHERE id_usuario = @userId',
      {
        backupCodes: JSON.stringify(newBackupCodes),
        userId: userId
      }
    );

    console.log('[2FA-REGENERATE] ✅ Códigos regenerados exitosamente para usuario:', userId);

    res.json({
      success: true,
      message: 'Nuevos códigos generados exitosamente',
      backupCodes: newBackupCodes
    });

  } catch (error) {
    console.error('[2FA-REGENERATE] Error:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
});

module.exports = router;
