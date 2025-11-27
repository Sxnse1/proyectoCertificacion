/**
 * Routes Manager - StartEducation Platform
 * Centraliza la configuración de todas las rutas de la aplicación
 */

const express = require('express');
const { requireAuth, requireRole } = require('../middleware/auth');

/**
 * Configura todas las rutas de la aplicación
 * @param {express.Application} app - Instancia de Express
 */
function configureRoutes(app) {
  
  // ============================================================
  // 📁 RUTAS PÚBLICAS (sin autenticación)
  // ============================================================
  
  const indexRouter = require('./index');
  const authRouter = require('./public/auth');
  const registerRouter = require('./public/register');
  const twoFactorRouter = require('./public/two-factor');
  const contactRouter = require('./public/contact');
  
  app.use('/', indexRouter);
  app.use('/auth', authRouter);
  app.use('/register', registerRouter);
  app.use('/two-factor', twoFactorRouter);
  app.use('/contact', contactRouter);
  
  // Ruta pública para ver membresías
  const suscripcionesRouter = require('./protected/suscripciones');
  app.use('/membresias', suscripcionesRouter);
  
  // ============================================================
  // 🔒 RUTAS PROTEGIDAS (requieren autenticación)
  // ============================================================
  
  const usersRouter = require('./protected/users');
  const cursosRouter = require('./protected/cursos');
  const cursosDbRouter = require('./protected/cursos-db');
  const dashboardRouter = require('./protected/dashboard');
  const userDashboardRouter = require('./protected/user-dashboard');
  const favoritosRouter = require('./protected/favoritos');
  const videoRouter = require('./protected/video');
  const usuariosRouter = require('./protected/usuarios');
  const perfilRouter = require('./perfil');
  const carritoRouter = require('./protected/carrito');
  const cursoDetalleRouter = require('./protected/curso-detalle');
  const pagosRouter = require('./protected/pagos');
  
  app.use('/users', requireAuth, usersRouter);
  app.use('/cursos', requireAuth, cursosRouter);
  app.use('/cursos-db', requireAuth, cursosDbRouter);
  app.use('/dashboard', requireAuth, dashboardRouter);
  app.use('/user-dashboard', requireAuth, userDashboardRouter);
  app.use('/favoritos', requireAuth, favoritosRouter);
  app.use('/video', requireAuth, videoRouter);
  app.use('/usuarios', requireRole(['instructor', 'admin']), usuariosRouter);
  app.use('/perfil', requireAuth, perfilRouter);
  app.use('/suscripciones', requireAuth, suscripcionesRouter);
  app.use('/carrito', carritoRouter);
  app.use('/curso', requireAuth, cursoDetalleRouter);
  
  // ============================================================
  // 💳 RUTAS DE PAGOS (Mixta: webhooks públicos, otros protegidos)
  // ============================================================
  // IMPORTANTE: Los webhooks deben ser públicos para que MercadoPago pueda acceder
  app.use('/pagos', pagosRouter);
  
  // ============================================================
  // 👨‍🏫 RUTAS DE ADMINISTRADOR
  // ============================================================
  // NOTA: Todas las rutas /admin/* están protegidas por requireAuth + RBAC granular en cada ruta
  
  // Dashboard Principal de Admin
  const dashboardAdminRouter = require('./admin/dashboard-admin');
  app.use('/dashboard', requireAuth, dashboardAdminRouter);
  app.use('/admin/dashboard', requireAuth, dashboardAdminRouter);
  
  // Gestión de Contenido
  const categoriasAdminRouter = require('./admin/categorias-admin');
  const etiquetasAdminRouter = require('./admin/etiquetas-admin');
  const modulosAdminRouter = require('./admin/modulos-admin');
  const cursosAdminRouter = require('./admin/cursos-admin');
  const videosAdminRouter = require('./admin/videos-admin');
  const usuariosAdminRouter = require('./admin/usuarios-admin');
  const rolesAdminRouter = require('./admin/roles-admin');
  
  app.use('/admin/categorias', categoriasAdminRouter);
  app.use('/admin/etiquetas', etiquetasAdminRouter);
  app.use('/admin/modulos', modulosAdminRouter);
  app.use('/admin/cursos', cursosAdminRouter);
  app.use('/admin/videos', videosAdminRouter);
  app.use('/admin/usuarios', usuariosAdminRouter);
  // Gestión de Roles (requiere autenticación)
  app.use('/admin/roles', requireAuth, rolesAdminRouter);
  
  // Analytics y Reportes
  const analyticsAdminRouter = require('./admin/analytics-admin');
  app.use('/admin/analytics', analyticsAdminRouter);
  
  // Monetización y Comercio
  const membresiaAdminRouter = require('./admin/membresias-admin');
  const suscripcionesAdminRouter = require('./admin/suscripciones-admin');
  const carritoAdminRouter = require('./admin/carrito-admin');
  const favoritosAdminRouter = require('./admin/favoritos-admin');
  const comprasAdminRouter = require('./admin/compras-admin');
  
  app.use('/admin/membresias', membresiaAdminRouter);
  app.use('/admin/suscripciones', suscripcionesAdminRouter);
  app.use('/admin/carritos', carritoAdminRouter);
  app.use('/admin/favoritos', favoritosAdminRouter);
  app.use('/admin/compras', comprasAdminRouter);
  
  // Finanzas y Pagos
  const historialPagosAdminRouter = require('./admin/historial-pagos-admin');
  
  app.use('/admin/pagos', historialPagosAdminRouter);
  
  // Certificados y Valoraciones
  const certificadosAdminRouter = require('./admin/certificados-admin');
  const valoracionesAdminRouter = require('./admin/valoraciones-admin');
  
  app.use('/admin/certificados', certificadosAdminRouter);
  app.use('/certificados', requireAuth, certificadosAdminRouter); // Acceso para todos los usuarios autenticados
  app.use('/admin/valoraciones', valoracionesAdminRouter);
  
  // Configuración del Sistema y Auditoría
  const configuracionAdminRouter = require('./admin/configuracion-admin');
  // const logsAdminRouter = require('./admin/logs-admin'); // Temporalmente deshabilitado
  // const securityAlertsRouter = require('./admin/security-alerts'); // Temporalmente deshabilitado
  
  app.use('/admin/configuracion', configuracionAdminRouter);
  // app.use('/admin/logs', logsAdminRouter); // Temporalmente deshabilitado
  // app.use('/admin/security', securityAlertsRouter); // Temporalmente deshabilitado
  
  // ============================================================
  // 🔧 RUTA DE SISTEMA (legacy)
  // ============================================================
  
  const systemRouter = require('./system');
  app.use('/system', requireRole(['instructor', 'admin']), systemRouter);
  
  // ============================================================
  // 🧪 RUTAS DE PRUEBA
  // ============================================================
  
  const logsTestRouter = require('./logs-test');
  app.use('/logs-test', logsTestRouter);
  
  console.log('✅ [ROUTES] Todas las rutas configuradas exitosamente');
}

module.exports = configureRoutes;
