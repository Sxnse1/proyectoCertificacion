/**
 * 🛡️ MIDDLEWARE DE AUTENTICACIÓN Y AUTORIZACIÓN RBAC - StartEducation
 * ================================================================
 * Sistema de Control de Acceso Basado en Roles (RBAC) granular
 * Autor: Arquitecto Backend Senior
 * Fecha: 5 de noviembre de 2025
 * ================================================================
 */

const { executeQuery } = require('../config/database');

// Middleware básico de autenticación
const requireAuth = (req, res, next) => {
  // Debug log
  console.log('[AUTH DEBUG] 🔍 Verificando autenticación para:', req.method, req.path);
  console.log('[AUTH DEBUG] 👤 Usuario en sesión:', req.session && req.session.user ? req.session.user.email : 'NO LOGUEADO');
  console.log('[AUTH DEBUG] 🕒 Sesión completa:', JSON.stringify(req.session, null, 2));
  console.log('[AUTH DEBUG] 🆔 Session ID:', req.sessionID);
  console.log('[AUTH DEBUG] 🎯 Headers Accept:', req.headers['accept']);
  console.log('[AUTH DEBUG] 🔗 Headers X-Requested-With:', req.headers['x-requested-with']);
  
  // Verificar si el usuario está autenticado mediante sesión
  if (req.session && req.session.user) {
    console.log('[AUTH DEBUG] ✅ Usuario autenticado:', req.session.user.email);
    
    // SIMPLIFICAR: Solo verificar 2FA para instructores/admin EN PRODUCCIÓN
    const twoFactorService = require('../services/twoFactorService');
    const isProduction = process.env.NODE_ENV === 'production';
    
    // Solo aplicar 2FA en producción para instructores/admin
    if (isProduction && twoFactorService.requires2FA(req.session.user.rol)) {
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
    
    // Usuario autenticado, continuar
    console.log('[AUTH DEBUG] ✅ Permitiendo acceso');
    return next();
  }
  
  // Si no está autenticado, redirigir al login
  console.log('[AUTH MIDDLEWARE] 🚫 Acceso denegado - Usuario no autenticado');
  console.log('[AUTH MIDDLEWARE] 📍 Ruta intentada:', req.originalUrl);
  
  // Guardar la URL original para redirigir después del login
  req.session.redirectTo = req.originalUrl;
  // Si la petición es XHR/Fetch (acepta JSON) devolvemos 401 JSON en lugar de redireccionar
  const acceptsJSON = req.headers['accept'] && req.headers['accept'].includes('application/json');
  const isXHR = req.headers['x-requested-with'] === 'XMLHttpRequest';
  if (acceptsJSON || isXHR) {
    return res.status(401).json({ success: false, message: 'No autenticado' });
  }

  // Debug: Por qué no está autenticado
  console.log('[AUTH DEBUG] ❌ Usuario no autenticado - Redirigiendo al login');
  console.log('[AUTH DEBUG] 📍 Ruta intentada:', req.originalUrl);
  console.log('[AUTH DEBUG] 🍪 Tiene sesión:', !!req.session);
  console.log('[AUTH DEBUG] 👤 Tiene usuario en sesión:', !!(req.session && req.session.user));
  
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

// [ELIMINADO] ensureAdmin - ahora se usa hasPermission() con RBAC

// Middleware para inyectar contadores del sidebar de admin (CON CACHÉ OPTIMIZADO)
const injectAdminCounts = async (req, res, next) => {
  try {
    // OPTIMIZACIÓN 1: Evitar ejecutar en peticiones AJAX/API
    const isAjaxRequest = req.xhr || req.headers['x-requested-with'] === 'XMLHttpRequest';
    const acceptsJson = req.headers.accept && req.headers.accept.includes('application/json');
    
    if (isAjaxRequest || acceptsJson) {
      console.log('[ADMIN COUNTS] ⏭️ Saltando contadores para petición AJAX/API:', req.path);
      res.locals.sidebarCounts = null;
      return next();
    }
    
    // OPTIMIZACIÓN 2: Solo ejecutar para administradores
    if (req.session?.user?.rol !== 'admin') {
      res.locals.sidebarCounts = null;
      return next();
    }
    
    const now = Date.now();
    const CACHE_DURATION = 5 * 60 * 1000; // 5 minutos en millisegundos
    
    // OPTIMIZACIÓN 3: Verificar caché en sesión
    if (req.session.adminCountsCache && 
        req.session.adminCountsCache.timestamp &&
        (now - req.session.adminCountsCache.timestamp) < CACHE_DURATION) {
      
      // Usar datos del caché
      res.locals.sidebarCounts = req.session.adminCountsCache.data;
      console.log('[ADMIN COUNTS] 🚀 Usando caché - Cursos:', 
        req.session.adminCountsCache.data.cursos, 
        'Usuarios:', req.session.adminCountsCache.data.usuarios);
      return next();
    }
    
    // OPTIMIZACIÓN 4: Obtener datos frescos solo si es necesario
    const db = req.app.locals.db;
    if (!db) {
      console.log('[ADMIN COUNTS] ⚠️ Base de datos no disponible');
      res.locals.sidebarCounts = null;
      return next();
    }
    
    console.log('[ADMIN COUNTS] 🔄 Actualizando caché - consultando BD...');
    
    // Ejecutar consultas en paralelo para mejor rendimiento
    const [cursosResult, usuariosResult] = await Promise.all([
      db.request().query('SELECT COUNT(*) as totalCursos FROM Cursos'),
      db.request().query('SELECT COUNT(*) as totalUsuarios FROM Usuarios')
    ]);
    
    // Extraer los resultados
    const totalCursos = cursosResult.recordset[0].totalCursos;
    const totalUsuarios = usuariosResult.recordset[0].totalUsuarios;
    
    const countsData = {
      cursos: totalCursos,
      usuarios: totalUsuarios
    };
    
    // OPTIMIZACIÓN 5: Guardar en caché de sesión
    req.session.adminCountsCache = {
      data: countsData,
      timestamp: now
    };
    
    res.locals.sidebarCounts = countsData;
    
    console.log(`[ADMIN COUNTS] ✅ Caché actualizado - Cursos: ${totalCursos}, Usuarios: ${totalUsuarios}`);
    
  } catch (error) {
    console.error('[ADMIN COUNTS] ❌ Error al obtener contadores:', error.message);
    // En caso de error, inicializar como null para evitar crashes
    res.locals.sidebarCounts = null;
    
    // Limpiar caché corrupto si existe
    if (req.session.adminCountsCache) {
      delete req.session.adminCountsCache;
    }
  }
  
  // Continuar con la siguiente función middleware
  next();
};

/**
 * 🔑 MIDDLEWARE RBAC: hasPermission Factory
 * ========================================
 * Genera middleware para verificar permisos específicos
 */
const hasPermission = (permisoRequerido) => {
  return async (req, res, next) => {
    try {
      // 1. Verificar autenticación básica
      if (!req.session || !req.session.user) {
        console.log('[RBAC MIDDLEWARE] 🚫 Acceso denegado - Usuario no autenticado');
        console.log('[RBAC MIDDLEWARE] 📍 Ruta intentada:', req.originalUrl);
        req.session.redirectTo = req.originalUrl;
        return res.redirect('/auth/login?error=sesion_expirada');
      }

      // 2. Verificar 2FA si es necesario
      const twoFactorService = require('../services/twoFactorService');
      if (twoFactorService.requires2FA(req.session.user.rol)) {
        if (!req.session.user.two_factor_enabled || !req.session.user.two_factor_verified) {
          console.log('[RBAC MIDDLEWARE] 🔐 Usuario requiere completar configuración de 2FA');
          console.log('[RBAC MIDDLEWARE] 👤 Usuario:', req.session.user.email);
          return res.redirect('/two-factor/setup');
        }
      }

      // 3. Verificar permisos desde la sesión
      if (!req.session.user.permisos || !Array.isArray(req.session.user.permisos)) {
        console.log('[RBAC MIDDLEWARE] ⚠️ Usuario sin permisos cargados, recargando...');
        
        // Intentar recargar permisos y rol desde base de datos
        try {
          const db = req.app?.locals?.db;
          const { permisos, rol } = await cargarPermisosUsuario(req.session.user.id, db);
          req.session.user.permisos = permisos;
          
          // Actualizar rol si cambió
          if (rol && rol !== req.session.user.rol) {
            console.log(`[RBAC MIDDLEWARE] 🔄 Actualizando rol de ${req.session.user.rol} a ${rol}`);
            req.session.user.rol = rol;
          }
        } catch (error) {
          console.log('[RBAC MIDDLEWARE] ❌ Error recargando permisos:', error.message);
          return res.status(500).json({ 
            success: false, 
            message: 'Error interno del servidor' 
          });
        }
      }

      // 4. Verificar si el usuario tiene el permiso requerido
      const tienePermiso = req.session.user.permisos.includes(permisoRequerido);
      
      if (!tienePermiso) {
        console.log('[RBAC MIDDLEWARE] 🚫 Acceso denegado - Permiso insuficiente');
        console.log('[RBAC MIDDLEWARE] 👤 Usuario:', req.session.user.email);
        console.log('[RBAC MIDDLEWARE] 🎭 Rol:', req.session.user.rol);
        console.log('[RBAC MIDDLEWARE] 🔑 Permiso requerido:', permisoRequerido);
        console.log('[RBAC MIDDLEWARE] 🔐 Permisos del usuario:', req.session.user.permisos);
        console.log('[RBAC MIDDLEWARE] 📍 Ruta intentada:', req.originalUrl);
        
        // Registrar intento de acceso no autorizado en auditoría
        try {
          const auditService = require('../services/auditService');
          await auditService.logAction({
            usuarioId: req.session.user.id,
            accion: 'ACCESO_DENEGADO',
            entidad: 'Sistema',
            entidadId: null,
            detalles: `Intento de acceso sin permiso: ${permisoRequerido} en ${req.originalUrl}`,
            ip: req.ip
          }, req.app?.locals?.db);
        } catch (auditError) {
          console.log('[RBAC MIDDLEWARE] ⚠️ Error registrando auditoría:', auditError.message);
        }

        // Si es petición AJAX/API, devolver error JSON
        const acceptsJSON = req.headers['accept'] && req.headers['accept'].includes('application/json');
        const isXHR = req.headers['x-requested-with'] === 'XMLHttpRequest';
        if (acceptsJSON || isXHR) {
          return res.status(403).json({ 
            success: false, 
            message: `Acceso denegado. Se requiere el permiso: ${permisoRequerido}`,
            requiredPermission: permisoRequerido
          });
        }

        // Para navegador, redirigir con mensaje de error
        return res.redirect('/auth/login?error=permisos_insuficientes');
      }

      // 5. Acceso autorizado
      console.log('[RBAC MIDDLEWARE] ✅ Acceso autorizado');
      console.log('[RBAC MIDDLEWARE] 👤 Usuario:', req.session.user.email);
      console.log('[RBAC MIDDLEWARE] 🔑 Permiso verificado:', permisoRequerido);
      next();

    } catch (error) {
      console.error('[RBAC MIDDLEWARE] ❌ Error en verificación de permisos:', error);
      return res.status(500).json({ 
        success: false, 
        message: 'Error interno del servidor' 
      });
    }
  };
};

/**
 * 📊 FUNCIÓN AUXILIAR: Cargar permisos de usuario desde base de datos
 * ==================================================================
 */
async function cargarPermisosUsuario(userId, db = null) {
  try {
    // Usar la instancia de base de datos proporcionada o la global
    const dbInstance = db || require('../config/database');
    
    const query = `
      SELECT DISTINCT p.NombrePermiso, r.NombreRol
      FROM Usuarios u
      INNER JOIN Roles r ON u.RolID = r.RolID
      INNER JOIN RolPermiso rp ON r.RolID = rp.RolID
      INNER JOIN Permisos p ON rp.PermisoID = p.PermisoID
      WHERE u.id_usuario = @userId 
        AND r.Activo = 1 
        AND p.Activo = 1
    `;

    const result = await dbInstance.executeQuery(query, { userId: userId });

    const permisos = result.recordset.map(row => row.NombrePermiso);
    const rolActual = result.recordset.length > 0 ? result.recordset[0].NombreRol : null;
    
    console.log(`[RBAC] 🔄 Permisos recargados para usuario ${userId}:`, permisos);
    console.log(`[RBAC] 👑 Rol actual del usuario ${userId}:`, rolActual);
    
    return { permisos, rol: rolActual };
  } catch (error) {
    console.error('[RBAC] ❌ Error cargando permisos:', error);
    throw error;
  }
}

/**
 * 🔧 MIDDLEWARE DE COMPATIBILIDAD: ensureAdmin (ELIMINADO)
 * ========================================================
 * Reemplazado completamente por sistema RBAC granular
 * Las rutas específicas ahora usan hasPermission() directamente
 */

/**
 * 🔄 MIDDLEWARE: Verificar múltiples permisos (OR logic)
 * ======================================================
 */
const hasAnyPermission = (permisosRequeridos) => {
  return async (req, res, next) => {
    // Verificar autenticación básica
    if (!req.session || !req.session.user) {
      console.log('[RBAC MIDDLEWARE] 🚫 Acceso denegado - Usuario no autenticado');
      req.session.redirectTo = req.originalUrl;
      return res.redirect('/auth/login?error=sesion_expirada');
    }

    // Verificar si tiene al menos uno de los permisos
    const userPermisos = req.session.user.permisos || [];
    const tieneAlgunPermiso = permisosRequeridos.some(permiso => userPermisos.includes(permiso));

    if (!tieneAlgunPermiso) {
      console.log('[RBAC MIDDLEWARE] 🚫 Acceso denegado - Sin ningún permiso requerido');
      console.log('[RBAC MIDDLEWARE] 🔑 Permisos requeridos:', permisosRequeridos);
      console.log('[RBAC MIDDLEWARE] 🔐 Permisos del usuario:', userPermisos);
      
      return res.status(403).json({ 
        success: false, 
        message: 'Acceso denegado. Se requiere al menos uno de los permisos especificados.',
        requiredPermissions: permisosRequeridos
      });
    }

    console.log('[RBAC MIDDLEWARE] ✅ Acceso autorizado con permiso múltiple');
    next();
  };
};

/**
 * 🎯 MIDDLEWARE: Verificar todos los permisos (AND logic)
 * =======================================================
 */
const hasAllPermissions = (permisosRequeridos) => {
  return async (req, res, next) => {
    // Verificar autenticación básica
    if (!req.session || !req.session.user) {
      req.session.redirectTo = req.originalUrl;
      return res.redirect('/auth/login?error=sesion_expirada');
    }

    // Verificar si tiene todos los permisos
    const userPermisos = req.session.user.permisos || [];
    const tieneTodosLosPermisos = permisosRequeridos.every(permiso => userPermisos.includes(permiso));

    if (!tieneTodosLosPermisos) {
      console.log('[RBAC MIDDLEWARE] 🚫 Acceso denegado - Faltan permisos requeridos');
      const permisosFaltantes = permisosRequeridos.filter(p => !userPermisos.includes(p));
      console.log('[RBAC MIDDLEWARE] 🔑 Permisos faltantes:', permisosFaltantes);
      
      return res.status(403).json({ 
        success: false, 
        message: 'Acceso denegado. Se requieren todos los permisos especificados.',
        requiredPermissions: permisosRequeridos,
        missingPermissions: permisosFaltantes
      });
    }

    console.log('[RBAC MIDDLEWARE] ✅ Acceso autorizado con todos los permisos');
    next();
  };
};

/**
 * 🧹 FUNCIÓN AUXILIAR: Limpiar caché de contadores de admin
 * ========================================================
 * Usar después de operaciones que modifiquen usuarios o cursos
 */
const clearAdminCountsCache = (req) => {
  if (req.session && req.session.adminCountsCache) {
    delete req.session.adminCountsCache;
    console.log('[ADMIN COUNTS] 🧹 Caché de contadores limpiado');
  }
};

/**
 * 🔄 MIDDLEWARE: Limpiar caché después de operaciones de modificación
 * =================================================================
 * Usar en rutas POST/PUT/DELETE que modifiquen usuarios o cursos
 */
const invalidateAdminCountsCache = (req, res, next) => {
  // Limpiar caché al finalizar la respuesta
  res.on('finish', () => {
    if (res.statusCode >= 200 && res.statusCode < 300) {
      clearAdminCountsCache(req);
    }
  });
  next();
};

module.exports = {
  // Middleware existente (mantener compatibilidad)
  requireAuth,
  requireBasicAuth,
  requireRole,
  injectUserData,
  logAccess,
  injectAdminCounts,
  // ensureAdmin eliminado - usar hasPermission() con permisos específicos
  
  // Nuevo sistema RBAC
  hasPermission,
  hasAnyPermission,
  hasAllPermissions,
  cargarPermisosUsuario,
  
  // Utilidades de caché para admin counts
  clearAdminCountsCache,
  invalidateAdminCountsCache
};