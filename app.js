var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');

// Importar configuración de base de datos
var db = require('./config/database');

var indexRouter = require('./routes/index');
var usersRouter = require('./routes/users');
var authRouter = require('./routes/auth');
var systemRouter = require('./routes/system');
var cursosRouter = require('./routes/cursos');
var usuariosRouter = require('./routes/usuarios');
var dashboardRouter = require('./routes/dashboard');
var registerRouter = require('./routes/register');
var videoRouter = require('./routes/video');
var cursosDbRouter = require('./routes/cursos-db');

var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'hbs');

// Configurar helpers de Handlebars
var hbs = require('hbs');
hbs.registerHelper('eq', function(a, b) {
  return a === b;
});

hbs.registerHelper('formatDate', function(dateString) {
  if (!dateString) return 'N/A';
  const date = new Date(dateString);
  return date.toLocaleDateString('es-ES', { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });
});

hbs.registerHelper('substring', function(str, start, length) {
  if (!str) return '';
  return str.substring(start, length || str.length).toUpperCase();
});

hbs.registerHelper('setVar', function(varName, varValue, options) {
  if (!options.data.root) options.data.root = {};
  if (!options.data.root[varName]) options.data.root[varName] = {};
  options.data.root[varName][varValue] = true;
  return '';
});

hbs.registerHelper('unless', function(conditional, options) {
  if (!conditional) {
    return options.fn(this);
  } else {
    return options.inverse(this);
  }
});

hbs.registerHelper('json', function(context) {
  return JSON.stringify(context);
});

hbs.registerHelper('gt', function(a, b) {
  return a > b;
});

hbs.registerHelper('lt', function(a, b) {
  return a < b;
});

hbs.registerHelper('add', function(a, b) {
  return a + b;
});

hbs.registerHelper('subtract', function(a, b) {
  return a - b;
});

hbs.registerHelper('range', function(start, end) {
  const result = [];
  for (let i = start; i <= end; i++) {
    result.push(i);
  }
  return result;
});

hbs.registerHelper('formatDuration', function(seconds) {
  if (!seconds || isNaN(seconds)) return '0m';
  
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  } else {
    return `${minutes}m`;
  }
});

hbs.registerHelper('for', function(from, to, options) {
  // Si no se pasa el parámetro options, significa que current no fue pasado
  if (typeof options === 'undefined') {
    options = to;
    to = from;
    from = 1;
  }
  
  // Validar que options tenga la función fn
  if (!options || typeof options.fn !== 'function') {
    return '';
  }
  
  let result = '';
  for (let i = from; i <= to; i++) {
    result += options.fn(i);
  }
  return result;
});

// Helper para formatear precios
hbs.registerHelper('formatPrice', function(price) {
  if (!price || isNaN(price)) return '$0.00';
  return '$' + parseFloat(price).toFixed(2);
});

// Helper para formatear rating promedio
hbs.registerHelper('formatRating', function(rating) {
  if (!rating || isNaN(rating)) return '0.0';
  return parseFloat(rating).toFixed(1);
});

// Configurar express-session para autenticación segura
var session = require('express-session');

// Configurar proxy de confianza para Heroku
if (process.env.NODE_ENV === 'production') {
  app.set('trust proxy', 1); // Confiar en el primer proxy (Heroku)
}

// Detectar si estamos en Heroku (tiene PORT definido) y usar configuración apropiada
const isHeroku = process.env.PORT && process.env.NODE_ENV === 'production';
const isLocalDevelopment = !isHeroku;

console.log('[SESSION CONFIG] 🔧 Configurando sesiones...');
console.log('[SESSION CONFIG] 🌍 Entorno:', process.env.NODE_ENV || 'development');
console.log('[SESSION CONFIG] 🏠 Es Heroku:', isHeroku);
console.log('[SESSION CONFIG] 💻 Es desarrollo local:', isLocalDevelopment);

app.use(session({
  secret: process.env.SESSION_SECRET || 'fallback-secret-key-change-in-production',
  resave: false,
  saveUninitialized: false,
  name: 'sessionId', // Nombre personalizado para la cookie
  cookie: {
    secure: isHeroku, // true solo en Heroku con HTTPS
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000, // 24 horas
    sameSite: isHeroku ? 'none' : 'lax' // Para funcionar con HTTPS en Heroku
  }
}));

console.log('[SESSION CONFIG] ✅ Sesiones configuradas - secure:', isHeroku);

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

// Conectar a la base de datos al iniciar la aplicación
if (process.env.DB_SERVER && process.env.DB_SERVER !== 'localhost') {
  // Solo conectar a base de datos si está configurada (producción)
  db.connect()
    .then(() => {
      console.log('[APP] Base de datos lista');
      // Hacer disponible la conexión en todas las rutas
      app.locals.db = db;
    })
    .catch(err => {
      console.error('[APP] Error iniciando la aplicación:', err.message);
      // En producción, continuar sin base de datos para debugging
      if (process.env.NODE_ENV === 'production') {
        console.log('[APP] Continuando sin base de datos para debugging...');
        app.locals.db = null;
      } else {
        process.exit(1);
      }
    });
} else {
  // Desarrollo local o sin base de datos configurada
  console.log('[APP] Iniciando sin conexión a base de datos (desarrollo)');
  app.locals.db = null;
}

// Importar middleware de autenticación
const { requireAuth, requireRole, injectUserData, logAccess } = require('./middleware/auth');

// Aplicar middleware global
app.use(injectUserData);
app.use(logAccess);

// Rutas públicas (sin autenticación)
app.use('/', indexRouter);
app.use('/auth', authRouter);
app.use('/register', registerRouter);

// Rutas protegidas (requieren autenticación)
app.use('/users', requireAuth, usersRouter);
app.use('/system', requireRole(['instructor', 'admin']), systemRouter);
app.use('/cursos', requireAuth, cursosRouter);
app.use('/usuarios', requireRole(['instructor', 'admin']), usuariosRouter);
app.use('/dashboard', requireAuth, dashboardRouter);
app.use('/video', requireAuth, videoRouter);
app.use('/cursos-db', requireAuth, cursosDbRouter);

// Importar rutas de administración de videos
const videosAdminRouter = require('./routes/videos-admin');
app.use('/videos-admin', requireRole(['admin', 'instructor']), videosAdminRouter);

// Ruta temporal eliminada - funcionalidad movida a videos-admin

// Rutas de autenticación de dos factores
const twoFactorRouter = require('./routes/two-factor');
app.use('/two-factor', twoFactorRouter);

// Ruta de administración de categorías
const categoriasAdminRouter = require('./routes/categorias-admin');
app.use('/categorias-admin', requireRole(['admin', 'instructor']), categoriasAdminRouter);

// Ruta de administración de etiquetas
const etiquetasAdminRouter = require('./routes/etiquetas-admin');
app.use('/etiquetas-admin', requireRole(['admin', 'instructor']), etiquetasAdminRouter);

// Ruta de administración de módulos
const modulosAdminRouter = require('./routes/modulos-admin');
app.use('/modulos-admin', requireRole(['admin', 'instructor']), modulosAdminRouter);

// Ruta de administración de cursos
const cursosAdminRouter = require('./routes/cursos-admin');
app.use('/cursos-admin', requireRole(['admin', 'instructor']), cursosAdminRouter);

// Ruta de administración de usuarios
const usuariosAdminRouter = require('./routes/usuarios-admin');
app.use('/usuarios-admin', requireRole(['admin', 'instructor']), usuariosAdminRouter);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // Log errors in production
  if (req.app.get('env') === 'production') {
    console.error('[ERROR]', new Date().toISOString(), err.message);
    console.error('[ERROR STACK]', err.stack);
  }

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;
