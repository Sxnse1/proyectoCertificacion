// Gestor de conexión a MongoDB usando mongoose.
// Se recomienda definir la variable de entorno MONGODB_URI (p. ej. MongoDB Atlas).
// Si no existe, se intentará conectar a un localhost en el puerto 27017.

require('dotenv').config();
const mongoose = require('mongoose');

const uri = process.env.MONGODB_URI || process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/proyectoCertificacion';

// Opciones seguras por defecto; se pueden ajustar mediante variables de entorno si es necesario
const mongooseOptions = {
  // mongoose v6+ ya trae opciones por defecto, pero incluimos algunas por compatibilidad
  serverSelectionTimeoutMS: process.env.MONGODB_SERVER_SELECTION_TIMEOUT ? Number(process.env.MONGODB_SERVER_SELECTION_TIMEOUT) : 5000,
  // otras opciones pueden añadirse aquí si se requiere (poolSize, authSource, ssl, tls, etc.)
};

async function connect() {
  if (mongoose.connection && mongoose.connection.readyState === 1) {
    // ya conectado
    return mongoose.connection;
  }

  try {
    await mongoose.connect(uri, mongooseOptions);
    console.log('[db] Conectado a MongoDB (uri:', uri.replace(/:\/\/.*@|\?[^]*$/g, '') + ')');
    return mongoose.connection;
  } catch (err) {
    console.error('[db] Error conectando a MongoDB:', err && err.message ? err.message : err);
    if (err && err.stack) console.error(err.stack);
    throw err;
  }
}

function getMongoose() {
  return mongoose;
}

async function close() {
  return mongoose.disconnect();
}

module.exports = { connect, getMongoose, close };
