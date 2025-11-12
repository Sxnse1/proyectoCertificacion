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
const hbs = require('hbs');
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'hbs');

// Configurar Handlebars para no usar layout por defecto
hbs.registerPartials(__dirname + '/views/partials');

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
// Intentar conectar si tenemos configuración básica de servidor
if (process.env.DB_SERVER || process.env.NODE_ENV === 'production') {
  // Conectar a base de datos 
  db.connect()
    .then(() => {
      console.log('[APP] Base de datos lista');
      // Hacer disponible la conexión en todas las rutas
      app.locals.db = db;
    })
    .catch(err => {
      console.error('[APP] Error iniciando la aplicación:', err.message);
      // En desarrollo, continuar sin base de datos para debugging
      console.log('[APP] Continuando sin base de datos para debugging...');
      app.locals.db = null;
    });
} else {
  // Sin configuración de base de datos
  console.log('[APP] Iniciando sin conexión a base de datos (variables no configuradas)');
  app.locals.db = null;
}

// Importar middleware de autenticación
const { requireAuth, requireRole, injectUserData, injectAdminCounts, logAccess } = require('./middleware/auth');

// Importar dependencias para tareas programadas
const cron = require('node-cron');
const { getPool } = require('./config/database');

// Aplicar middleware global
app.use(injectUserData);
app.use(injectAdminCounts);
app.use(logAccess);

// Tarea programada para actualizar suscripciones vencidas
// Se ejecuta todos los días a las 00:01 (un minuto después de medianoche)
cron.schedule('1 0 * * *', async () => {
    console.log('[CRON] 🕐 Ejecutando tarea programada: Actualizando suscripciones vencidas...');
    try {
        const pool = getPool();
        const request = pool.request();
        const result = await request.query(
            "UPDATE Suscripciones SET estatus = 'expirada' WHERE fecha_vencimiento < GETDATE() AND estatus = 'activa'"
        );
        console.log(`[CRON] ✅ Suscripciones vencidas actualizadas. Filas afectadas: ${result.rowsAffected[0]}`);
    } catch (error) {
        console.error('[CRON] ❌ Error en la tarea programada de suscripciones:', error);
    }
}, {
    scheduled: true,
    timezone: "America/Mexico_City" // Ajusta esto a tu zona horaria local
});

// Proteger todas las rutas /admin/* con autenticación básica (RBAC granular en cada ruta)
app.use('/admin', requireAuth);

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
