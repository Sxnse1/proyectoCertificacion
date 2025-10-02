#!/usr/bin/env -S deno run --allow-all --unstable-detect-cjs

// Configurar entorno de producción para Deno Deploy
if (typeof Deno !== 'undefined') {
  // Estamos en Deno
  process = globalThis.process || {
    env: Deno.env.toObject(),
    argv: ['deno', ...Deno.args]
  };
  
  // Configurar NODE_ENV si no está establecido
  if (!process.env.NODE_ENV) {
    process.env.NODE_ENV = 'production';
  }
}

// Importar y ejecutar la aplicación
import('./bin/www');