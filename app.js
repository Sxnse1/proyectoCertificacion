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

// Configurar express-session para autenticación segura
var session = require('express-session');

app.use(session({
  secret: 'starteducation-barberia-academy-2025-secure-key',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: false, // Cambiar a true en producción con HTTPS
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000 // 24 horas
  }
}));

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

// Ruta temporal para agregar video de Vimeo existente
const addVimeoTempRouter = require('./routes/add-vimeo-temp');
app.use('/temp', requireRole(['admin', 'instructor']), addVimeoTempRouter);

// Rutas de autenticación de dos factores
const twoFactorRouter = require('./routes/two-factor');
app.use('/two-factor', twoFactorRouter);

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
