/**
 * 📅 PROGRAMADOR DE TAREAS - StartEducation
 * =========================================
 * Configuración centralizada de tareas programadas (cron jobs)
 * Para evitar duplicación en múltiples instancias del servidor
 */

const cron = require('node-cron');
const { getPool } = require('./database');

/**
 * 🔄 Tarea: Actualizar suscripciones vencidas
 * ==========================================
 * Se ejecuta todos los días a las 00:01 (un minuto después de medianoche)
 */
function scheduleSubscriptionCleanup() {
  return cron.schedule('1 0 * * *', async () => {
    console.log('[CRON] 🕐 Ejecutando tarea programada: Actualizando suscripciones vencidas...');
    try {
      const pool = getPool();
      if (!pool) {
        console.error('[CRON] ❌ No hay conexión a la base de datos disponible');
        return;
      }

      const request = pool.request();
      const result = await request.query(
        "UPDATE Suscripciones SET estatus = 'expirada' WHERE fecha_vencimiento < GETDATE() AND estatus = 'activa'"
      );
      
      console.log(`[CRON] ✅ Suscripciones vencidas actualizadas. Filas afectadas: ${result.rowsAffected[0]}`);
      
      // Log adicional para auditoría
      if (result.rowsAffected[0] > 0) {
        console.log(`[CRON] 📊 Se expiraron ${result.rowsAffected[0]} suscripciones en esta ejecución`);
      }
      
    } catch (error) {
      console.error('[CRON] ❌ Error en la tarea programada de suscripciones:', error.message);
      console.error('[CRON] 🔍 Stack trace:', error.stack);
    }
  }, {
    scheduled: true,
    timezone: "America/Mexico_City" // Zona horaria de México
  });
}

/**
 * 🧹 Tarea: Limpiar sesiones expiradas (opcional - adicional)
 * ===========================================================
 * Se ejecuta cada 6 horas para mantener la tabla Sessions limpia
 */
function scheduleSessionCleanup() {
  return cron.schedule('0 */6 * * *', async () => {
    console.log('[CRON] 🧹 Ejecutando limpieza de sesiones expiradas...');
    try {
      const pool = getPool();
      if (!pool) {
        console.error('[CRON] ❌ No hay conexión a la base de datos disponible para limpieza de sesiones');
        return;
      }

      const request = pool.request();
      const result = await request.query(
        "DELETE FROM Sessions WHERE expires < GETDATE()"
      );
      
      console.log(`[CRON] ✅ Sesiones expiradas eliminadas. Filas afectadas: ${result.rowsAffected[0]}`);
      
    } catch (error) {
      console.error('[CRON] ❌ Error en la limpieza de sesiones:', error.message);
    }
  }, {
    scheduled: true,
    timezone: "America/Mexico_City"
  });
}

/**
 * 🚀 Inicializar todas las tareas programadas
 * ============================================
 * Función principal para iniciar todos los cron jobs
 */
function initializeScheduler() {
  console.log('[SCHEDULER] 📅 Inicializando tareas programadas...');
  
  const jobs = [];
  
  try {
    // Tarea principal: Limpiar suscripciones vencidas
    const subscriptionJob = scheduleSubscriptionCleanup();
    jobs.push({ name: 'Subscription Cleanup', job: subscriptionJob });
    console.log('[SCHEDULER] ✅ Tarea "Subscription Cleanup" programada para ejecutarse diariamente a las 00:01');
    
    // Tarea adicional: Limpiar sesiones expiradas
    const sessionJob = scheduleSessionCleanup();
    jobs.push({ name: 'Session Cleanup', job: sessionJob });
    console.log('[SCHEDULER] ✅ Tarea "Session Cleanup" programada para ejecutarse cada 6 horas');
    
    console.log(`[SCHEDULER] 🎯 Total de tareas programadas: ${jobs.length}`);
    console.log('[SCHEDULER] 🌍 Zona horaria configurada: America/Mexico_City');
    
    return jobs;
    
  } catch (error) {
    console.error('[SCHEDULER] ❌ Error inicializando tareas programadas:', error.message);
    return [];
  }
}

/**
 * 🛑 Detener todas las tareas programadas
 * =======================================
 * Para usar durante el shutdown graceful de la aplicación
 */
function stopScheduler(jobs) {
  console.log('[SCHEDULER] 🛑 Deteniendo tareas programadas...');
  
  if (!jobs || jobs.length === 0) {
    console.log('[SCHEDULER] ℹ️ No hay tareas activas para detener');
    return;
  }
  
  jobs.forEach(({ name, job }) => {
    try {
      if (job && typeof job.destroy === 'function') {
        job.destroy();
        console.log(`[SCHEDULER] ✅ Tarea "${name}" detenida correctamente`);
      }
    } catch (error) {
      console.error(`[SCHEDULER] ❌ Error deteniendo tarea "${name}":`, error.message);
    }
  });
  
  console.log('[SCHEDULER] 🏁 Todas las tareas programadas han sido detenidas');
}

/**
 * 📊 Obtener estado de las tareas programadas
 * ==========================================
 * Para debugging y monitoreo
 */
function getSchedulerStatus(jobs) {
  if (!jobs || jobs.length === 0) {
    return { active: false, jobCount: 0, jobs: [] };
  }
  
  const status = {
    active: true,
    jobCount: jobs.length,
    jobs: jobs.map(({ name, job }) => ({
      name,
      running: job ? job.running : false,
      scheduled: job ? job.scheduled : false
    }))
  };
  
  return status;
}

module.exports = {
  initializeScheduler,
  stopScheduler,
  getSchedulerStatus,
  // Exportar funciones individuales para testing
  scheduleSubscriptionCleanup,
  scheduleSessionCleanup
};