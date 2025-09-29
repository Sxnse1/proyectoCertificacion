// Middleware de autenticación para StartEducation
// Este middleware protege rutas que requieren autenticación

const requireAuth = (req, res, next) => {
  // Verificar si el usuario está autenticado mediante sesión
  if (req.session && req.session.user) {
    const twoFactorService = require('../services/twoFactorService');
    
    // Verificar si es instructor/admin y necesita 2FA
    if (twoFactorService.requires2FA(req.session.user.rol)) {
      // Verificar si tiene 2FA configurado y verificado
      if (!req.session.user.two_factor_enabled || !req.session.user.two_factor_verified) {
        // Permitir acceso a rutas de configuración de 2FA
        if (req.path.startsWith('/two-factor/')) {
          console.log('[AUTH MIDDLEWARE] 🔐 Permitiendo acceso a configuración de 2FA');
          return next();
        }
        
        console.log('[AUTH MIDDLEWARE] 🔐 Usuario requiere completar configuración de 2FA');
        console.log('[AUTH MIDDLEWARE] 👤 Usuario:', req.session.user.email);
        console.log('[AUTH MIDDLEWARE] 🎭 Rol:', req.session.user.rol);
        
        // Redirigir a configuración de 2FA
        return res.redirect('/two-factor/setup');
      }
    }
    
    // Usuario autenticado y con 2FA completo (si es necesario), continuar
    return next();
  }
  
  // Si no está autenticado, redirigir al login
  console.log('[AUTH MIDDLEWARE] 🚫 Acceso denegado - Usuario no autenticado');
  console.log('[AUTH MIDDLEWARE] 📍 Ruta intentada:', req.originalUrl);
  
  // Guardar la URL original para redirigir después del login
  req.session.redirectTo = req.originalUrl;
  
  return res.redirect('/auth/login?error=sesion_expirada');
};

// Middleware específico para autenticación básica (sin verificar 2FA)
const requireBasicAuth = (req, res, next) => {
  // Solo verificar si el usuario está autenticado
  if (req.session && req.session.user) {
    return next();
  }
  
  // Si no está autenticado, redirigir al login
  console.log('[AUTH MIDDLEWARE] 🚫 Acceso denegado - Usuario no autenticado');
  console.log('[AUTH MIDDLEWARE] 📍 Ruta intentada:', req.originalUrl);
  
  return res.redirect('/auth/login?error=sesion_expirada');
};

const requireRole = (allowedRoles) => {
  return (req, res, next) => {
    // Verificar autenticación primero
    if (!req.session || !req.session.user) {
      console.log('[AUTH MIDDLEWARE] 🚫 Acceso denegado - Usuario no autenticado');
      return res.redirect('/auth/login?error=sesion_expirada');
    }
    
    // Verificar 2FA si es necesario
    const twoFactorService = require('../services/twoFactorService');
    if (twoFactorService.requires2FA(req.session.user.rol)) {
      if (!req.session.user.two_factor_enabled || !req.session.user.two_factor_verified) {
        console.log('[AUTH MIDDLEWARE] 🔐 Usuario requiere completar configuración de 2FA');
        console.log('[AUTH MIDDLEWARE] 👤 Usuario:', req.session.user.email);
        return res.redirect('/two-factor/setup');
      }
    }
    
    // Verificar rol
    const userRole = req.session.user.rol;
    if (!allowedRoles.includes(userRole)) {
      console.log('[AUTH MIDDLEWARE] 🚫 Acceso denegado - Rol insuficiente');
      console.log('[AUTH MIDDLEWARE] 👤 Usuario:', req.session.user.email);
      console.log('[AUTH MIDDLEWARE] 🎭 Rol actual:', userRole);
      console.log('[AUTH MIDDLEWARE] 🎯 Roles permitidos:', allowedRoles);
      
      return res.redirect('/auth/login?error=acceso_denegado');
    }
    
    // Usuario autorizado
    return next();
  };
};

// Middleware para inyectar datos del usuario en las vistas
const injectUserData = (req, res, next) => {
  if (req.session && req.session.user) {
    res.locals.currentUser = req.session.user;
    res.locals.isAuthenticated = true;
  } else {
    res.locals.currentUser = null;
    res.locals.isAuthenticated = false;
  }
  next();
};

// Middleware para logging de accesos
const logAccess = (req, res, next) => {
  const timestamp = new Date().toISOString();
  const user = req.session?.user?.email || 'Anónimo';
  const userAgent = req.get('User-Agent');
  const ip = req.ip || req.connection.remoteAddress;
  
  console.log(`[ACCESS LOG] ${timestamp} | ${user} | ${req.method} ${req.originalUrl} | IP: ${ip}`);
  
  next();
};

module.exports = {
  requireAuth,
  requireBasicAuth,
  requireRole,
  injectUserData,
  logAccess
};