require('dotenv').config();
var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');

// Importar configuración de base de datos
var db = require('./config/database');

// Importar configurador centralizado de rutas
const configureRoutes = require('./routes/index.routes');

var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'hbs');

// Configurar helpers de Handlebars
const registerHandlebarsHelpers = require('./config/handlebars-helpers');
registerHandlebarsHelpers();

// Configurar express-session para autenticación segura
var session = require('express-session');

// Configurar proxy de confianza para Heroku
if (process.env.NODE_ENV === 'production') {
  app.set('trust proxy', 1); // Confiar en el primer proxy (Heroku)
}

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

// Fallback route for browsers that request /favicon.ico directly.
// Some browsers still request /favicon.ico even when an <link rel="icon"> is present.
// Serve the SVG favicon from the public/images folder as a fallback.
// Mejor fallback para favicon: servir un SVG optimizado y pequeño como /favicon.ico
app.get('/favicon.ico', function (req, res) {
  const faviconPath = path.join(__dirname, 'public', 'images', 'favicon-32.svg');
  res.type('image/svg+xml');
  res.sendFile(faviconPath);
});

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

// ============================================================
// 🚀 CONFIGURAR TODAS LAS RUTAS DE LA APLICACIÓN
// ============================================================
configureRoutes(app);

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
  res.render('shared/error');
});

module.exports = app;
