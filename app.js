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
var MSSQLStore = require('connect-mssql-v2');

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

// Configurar store de sesiones con MSSQL para persistencia
let sessionStore;
try {
  console.log('[SESSION STORE] 🔧 Configurando MSSQLStore...');
  sessionStore = new MSSQLStore({
    server: process.env.DB_SERVER,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE,
    port: parseInt(process.env.DB_PORT) || 1433,
    options: {
      encrypt: process.env.DB_ENCRYPT === 'true',
      trustServerCertificate: process.env.DB_TRUST_CERT === 'true',
      enableArithAbort: true,
      requestTimeout: 30000
    },
    table: 'Sessions', // Tabla donde se almacenarán las sesiones
    autoRemove: 'interval', // Limpiar sesiones expiradas automáticamente
    autoRemoveInterval: 300000, // Limpiar cada 5 minutos (5 * 60 * 1000)
    ttl: 24 * 60 * 60 * 1000, // TTL de 24 horas
    autoRemoveCallback: function() {
      console.log('[SESSION STORE] 🧹 Sesiones expiradas limpiadas automáticamente');
    }
  });

  // Manejar eventos del store
  sessionStore.on('connect', function() {
    console.log('[SESSION STORE] ✅ MSSQLStore conectado exitosamente');
  });

  sessionStore.on('disconnect', function() {
    console.log('[SESSION STORE] ⚠️ MSSQLStore desconectado');
  });

  sessionStore.on('error', function(error) {
    console.error('[SESSION STORE] ❌ Error en MSSQLStore:', error.message);
  });

  console.log('[SESSION STORE] ✅ MSSQLStore configurado para usar tabla Sessions');

} catch (error) {
  console.error('[SESSION STORE] ❌ Error configurando MSSQLStore:', error.message);
  console.log('[SESSION STORE] 🔄 Usando MemoryStore como fallback (NO RECOMENDADO PARA PRODUCCIÓN)');
  sessionStore = null; // Usar MemoryStore por defecto
}

app.use(session({
  secret: process.env.SESSION_SECRET || 'fallback-secret-key-change-in-production',
  store: sessionStore, // Usar MSSQLStore si está disponible, sino MemoryStore
  resave: false, // Optimizado: no guardar sesiones no modificadas
  saveUninitialized: false, // Optimizado: no guardar sesiones vacías (evita memory leaks)
  name: 'sessionId', // Nombre personalizado para la cookie
  cookie: {
    secure: isHeroku, // HTTPS en producción, HTTP en desarrollo
    httpOnly: true, // Prevenir acceso desde JavaScript del cliente
    maxAge: 24 * 60 * 60 * 1000, // 24 horas
    sameSite: isHeroku ? 'strict' : 'lax' // Más seguro en producción
  },
  rolling: true // Renovar la cookie en cada request activo (evita logout automático)
}));

console.log('[SESSION CONFIG] ✅ Sesiones configuradas exitosamente');
console.log('[SESSION CONFIG] 🛡️ Store:', sessionStore ? 'MSSQLStore (Persistente)' : 'MemoryStore (Temporal)');
console.log('[SESSION CONFIG] 🔒 Secure cookies:', isHeroku);
console.log('[SESSION CONFIG] 📊 Configuración optimizada: resave=false, saveUninitialized=false');

// Middleware temporal para debug de sesiones
app.use((req, res, next) => {
  if (req.path.includes('/carrito') || req.path.includes('/auth')) {
    console.log('[SESSION DEBUG] 🔍 Request a:', req.method, req.path);
    console.log('[SESSION DEBUG] 🆔 Session ID:', req.sessionID);
    console.log('[SESSION DEBUG] 👤 Usuario:', req.session.user ? req.session.user.email : 'NO LOGUEADO');
    console.log('[SESSION DEBUG] 🍪 Cookies:', req.headers.cookie);
    console.log('[SESSION DEBUG] 📦 Body:', req.body);
    console.log('[SESSION DEBUG] 🎯 Headers Accept:', req.headers.accept);
  }
  next();
});

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

// ============================================================
// 🛡️ PROTECCIÓN CSRF (Cross-Site Request Forgery)
// ============================================================
const csrf = require('csurf');

// Configurar CSRF protection
// Nota: El token se enviará en el body (_csrf) o en headers (x-csrf-token, csrf-token)
const csrfProtection = csrf({ 
  cookie: true // Usar cookies para almacenar el secret, pero el token se envía en headers/body
});

// Aplicar protección CSRF solo a rutas que lo necesiten
// Excluyendo webhooks y APIs externas que no pueden enviar tokens CSRF
app.use((req, res, next) => {
  // Lista de rutas excluidas de la protección CSRF
  const excludedRoutes = [
    '/webhook', // Webhooks de MercadoPago
    '/api/webhook', // APIs externas
    '/health', // Health checks
    '/favicon.ico' // Favicon
  ];
  
  // Verificar si la ruta debe ser excluida
  const shouldExclude = excludedRoutes.some(route => req.path.startsWith(route));
  
  if (shouldExclude) {
    console.log('[CSRF] ⏭️ Ruta excluida de protección CSRF:', req.path);
    return next();
  }
  
  // Aplicar protección CSRF
  csrfProtection(req, res, (err) => {
    if (err) {
      console.error('[CSRF] ❌ Error de protección CSRF:', err.message);
      console.log('[CSRF] 📍 Ruta afectada:', req.method, req.path);
      console.log('[CSRF] 🔍 Headers:', req.headers);
      
      // En desarrollo, mostrar error detallado
      if (req.app.get('env') === 'development') {
        return res.status(403).json({
          error: 'CSRF Token inválido o faltante',
          message: err.message,
          path: req.path,
          method: req.method,
          help: 'Asegúrate de incluir el token CSRF en tus formularios'
        });
      }
      
      // En producción, error genérico
      return res.status(403).render('shared/error', {
        title: 'Error de Seguridad',
        message: 'Solicitud no válida. Por favor, actualiza la página e intenta nuevamente.',
        error: { status: 403 }
      });
    }
    
    // Si no hay error, continuar
    next();
  });
});

// Middleware global para hacer disponible el token CSRF en todas las vistas
app.use((req, res, next) => {
  // Solo generar token si la protección CSRF está activa
  try {
    if (req.csrfToken) {
      res.locals.csrfToken = req.csrfToken();
      console.log('[CSRF] 🔑 Token CSRF generado para:', req.method, req.path);
    }
  } catch (err) {
    // Si hay error generando el token, continuar sin él
    console.log('[CSRF] ⚠️ No se pudo generar token CSRF para:', req.path);
    res.locals.csrfToken = null;
  }
  next();
});

console.log('[CSRF] ✅ Protección CSRF configurada exitosamente');
console.log('[CSRF] 🛡️ Modo seguro:', isHeroku ? 'HTTPS' : 'HTTP');
console.log('[CSRF] 🍪 Usando cookies para almacenar tokens');

// Ruta auxiliar para obtener token CSRF (útil para SPAs)
app.get('/csrf-token', (req, res) => {
  try {
    res.json({ 
      csrfToken: req.csrfToken(),
      success: true,
      message: 'Token CSRF generado exitosamente'
    });
  } catch (error) {
    console.error('[CSRF] ❌ Error generando token CSRF:', error.message);
    res.status(500).json({
      error: 'No se pudo generar token CSRF',
      success: false
    });
  }
});

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

// Aplicar middleware global
app.use(injectUserData);
app.use(injectAdminCounts);
app.use(logAccess);

// Inicializar tareas programadas (solo en instancia designada)
let schedulerJobs = [];
if (process.env.RUN_CRON_JOBS === 'true') {
  console.log('[APP] 📅 Inicializando tareas programadas en esta instancia...');
  const { initializeScheduler, stopScheduler } = require('./config/scheduler');
  schedulerJobs = initializeScheduler();
  
  // Graceful shutdown para detener tareas programadas
  process.on('SIGTERM', () => {
    console.log('[APP] 🛈 Señal SIGTERM recibida. Deteniendo tareas programadas...');
    stopScheduler(schedulerJobs);
    process.exit(0);
  });
  
  process.on('SIGINT', () => {
    console.log('[APP] 🛈 Señal SIGINT recibida. Deteniendo tareas programadas...');
    stopScheduler(schedulerJobs);
    process.exit(0);
  });
} else {
  console.log('[APP] ⏭️ Tareas programadas deshabilitadas en esta instancia (RUN_CRON_JOBS != true)');
}

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
