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
  
  app.use('/', indexRouter);
  app.use('/auth', authRouter);
  app.use('/register', registerRouter);
  app.use('/two-factor', twoFactorRouter);
  
  // ============================================================
  // 🔒 RUTAS PROTEGIDAS (requieren autenticación)
  // ============================================================
  
  const usersRouter = require('./protected/users');
  const cursosRouter = require('./protected/cursos');
  const cursosDbRouter = require('./protected/cursos-db');
  const dashboardRouter = require('./protected/dashboard');
  const videoRouter = require('./protected/video');
  const usuariosRouter = require('./protected/usuarios');
  
  app.use('/users', requireAuth, usersRouter);
  app.use('/cursos', requireAuth, cursosRouter);
  app.use('/cursos-db', requireAuth, cursosDbRouter);
  app.use('/dashboard', requireAuth, dashboardRouter);
  app.use('/video', requireAuth, videoRouter);
  app.use('/usuarios', requireRole(['instructor', 'admin']), usuariosRouter);
  
  // ============================================================
  // 👨‍🏫 RUTAS DE ADMINISTRADOR
  // ============================================================
  
  // Gestión de Contenido
  const categoriasAdminRouter = require('./admin/categorias-admin');
  const etiquetasAdminRouter = require('./admin/etiquetas-admin');
  const modulosAdminRouter = require('./admin/modulos-admin');
  const cursosAdminRouter = require('./admin/cursos-admin');
  const videosAdminRouter = require('./admin/videos-admin');
  const usuariosAdminRouter = require('./admin/usuarios-admin');
  
  app.use('/admin/categorias', requireRole(['admin', 'instructor']), categoriasAdminRouter);
  app.use('/admin/etiquetas', requireRole(['admin', 'instructor']), etiquetasAdminRouter);
  app.use('/admin/modulos', requireRole(['admin', 'instructor']), modulosAdminRouter);
  app.use('/admin/cursos', requireRole(['admin', 'instructor']), cursosAdminRouter);
  app.use('/admin/videos', requireRole(['admin', 'instructor']), videosAdminRouter);
  app.use('/admin/usuarios', requireRole(['admin', 'instructor']), usuariosAdminRouter);
  
  // Monetización y Comercio
  const membresiaAdminRouter = require('./admin/membresias-admin');
  const suscripcionesAdminRouter = require('./admin/suscripciones-admin');
  const carritoAdminRouter = require('./admin/carrito-admin');
  const favoritosAdminRouter = require('./admin/favoritos-admin');
  const comprasAdminRouter = require('./admin/compras-admin');
  
  app.use('/admin/membresias', requireRole(['admin', 'instructor']), membresiaAdminRouter);
  app.use('/admin/suscripciones', requireRole(['admin', 'instructor']), suscripcionesAdminRouter);
  app.use('/admin/carritos', requireRole(['admin', 'instructor']), carritoAdminRouter);
  app.use('/admin/favoritos', requireRole(['admin', 'instructor']), favoritosAdminRouter);
  app.use('/admin/compras', requireRole(['admin', 'instructor']), comprasAdminRouter);
  
  // Finanzas y Pagos
  const historialPagosAdminRouter = require('./admin/historial-pagos-admin');
  
  app.use('/admin/pagos', requireRole(['admin', 'instructor']), historialPagosAdminRouter);
  
  // Certificados y Valoraciones
  const certificadosAdminRouter = require('./admin/certificados-admin');
  const valoracionesAdminRouter = require('./admin/valoraciones-admin');
  
  app.use('/admin/certificados', requireRole(['admin', 'instructor']), certificadosAdminRouter);
  app.use('/admin/valoraciones', requireRole(['admin', 'instructor']), valoracionesAdminRouter);
  
  // ============================================================
  // 🔧 RUTA DE SISTEMA (legacy)
  // ============================================================
  
  const systemRouter = require('./system');
  app.use('/system', requireRole(['instructor', 'admin']), systemRouter);
  
  console.log('✅ [ROUTES] Todas las rutas configuradas exitosamente');
}

module.exports = configureRoutes;
