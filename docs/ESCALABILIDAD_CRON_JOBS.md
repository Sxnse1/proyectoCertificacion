# Escalabilidad de Cron Jobs - Implementación Completada

## ✅ Problema Solucionado

**Antes**: Tarea programada directamente en `app.js` que se duplicaría en múltiples instancias.

**Después**: Sistema de scheduler centralizado con control granular por variable de entorno.

## 🔧 Refactorización Realizada

### 1. Archivo Creado: `config/scheduler.js`
```javascript
// Configuración centralizada de todas las tareas programadas
const { initializeScheduler, stopScheduler } = require('./config/scheduler');
```

### 2. Control por Variable de Entorno
```bash
# En .env
RUN_CRON_JOBS=true  # Solo en la instancia designada
RUN_CRON_JOBS=false # En las demás instancias
```

### 3. Graceful Shutdown
```javascript
// Detener tareas programadas al cerrar la aplicación
process.on('SIGTERM', () => stopScheduler(schedulerJobs));
process.on('SIGINT', () => stopScheduler(schedulerJobs));
```

## 📋 Tareas Programadas Configuradas

### 1. Limpieza de Suscripciones Vencidas
- **Horario**: Diariamente a las 00:01
- **Función**: Actualizar suscripciones expiradas
- **Query**: `UPDATE Suscripciones SET estatus = 'expirada' WHERE fecha_vencimiento < GETDATE()`

### 2. Limpieza de Sesiones Expiradas (Bonus)
- **Horario**: Cada 6 horas
- **Función**: Limpiar tabla Sessions
- **Query**: `DELETE FROM Sessions WHERE expires < GETDATE()`

## 🚀 Configuración para Múltiples Instancias

### Instancia Principal (Scheduler)
```env
RUN_CRON_JOBS=true
```

**Logs:**
```
[APP] 📅 Inicializando tareas programadas en esta instancia...
[SCHEDULER] ✅ Tarea "Subscription Cleanup" programada
[SCHEDULER] ✅ Tarea "Session Cleanup" programada
[SCHEDULER] 🎯 Total de tareas programadas: 2
```

### Instancias Secundarias (Sin Scheduler)
```env
RUN_CRON_JOBS=false
```

**Logs:**
```
[APP] ⏭️ Tareas programadas deshabilitadas en esta instancia (RUN_CRON_JOBS != true)
```

## 🛠️ Funciones Disponibles

### Inicializar Scheduler
```javascript
const { initializeScheduler } = require('./config/scheduler');
const jobs = initializeScheduler();
```

### Detener Scheduler
```javascript
const { stopScheduler } = require('./config/scheduler');
stopScheduler(jobs);
```

### Estado del Scheduler
```javascript
const { getSchedulerStatus } = require('./config/scheduler');
const status = getSchedulerStatus(jobs);
console.log(status);
// { active: true, jobCount: 2, jobs: [...] }
```

## 📊 Beneficios de la Refactorización

| Aspecto | Antes | Después |
|---------|--------|---------|
| **Duplicación** | ❌ Se ejecuta en todas las instancias | ✅ Solo en instancia designada |
| **Control** | ❌ Sin control granular | ✅ Variable de entorno |
| **Organización** | ❌ Mezclado con lógica de app | ✅ Archivo separado |
| **Escalabilidad** | ❌ No preparado para múltiples instancias | ✅ Listo para escalar |
| **Mantenimiento** | ❌ Tareas dispersas | ✅ Centralizadas |
| **Debugging** | ❌ Logs mezclados | ✅ Logs específicos |

## 🎯 Casos de Uso de Despliegue

### 1. Desarrollo Local
```bash
# Solo una instancia
RUN_CRON_JOBS=true
```

### 2. Producción con Load Balancer
```bash
# Instancia 1 (Master)
RUN_CRON_JOBS=true

# Instancia 2-N (Workers)
RUN_CRON_JOBS=false
```

### 3. Kubernetes/Docker
```yaml
# Pod dedicado para cron jobs
env:
  - name: RUN_CRON_JOBS
    value: "true"

# Pods de aplicación
env:
  - name: RUN_CRON_JOBS
    value: "false"
```

## 🔍 Monitoreo y Debugging

### Logs de Scheduler
```bash
[SCHEDULER] 📅 Inicializando tareas programadas...
[SCHEDULER] ✅ Tarea programada para ejecutarse diariamente
[SCHEDULER] 🌍 Zona horaria configurada: America/Mexico_City
[CRON] 🕐 Ejecutando tarea programada: Actualizando suscripciones...
[CRON] ✅ Suscripciones vencidas actualizadas. Filas afectadas: 5
```

### Estado de Tareas
```javascript
// Para endpoints de health check
app.get('/health/scheduler', (req, res) => {
  const status = getSchedulerStatus(schedulerJobs);
  res.json(status);
});
```

## 🚦 Próximos Pasos

1. **Configurar en producción**: Designar instancia master
2. **Monitoring**: Implementar alertas para fallos de cron jobs
3. **Métricas**: Agregar logging de rendimiento
4. **Backup**: Considerar instancia de respaldo para tareas críticas

---

**Estado**: ✅ Implementado y listo para escalabilidad  
**Duplicación**: ❌ Eliminada  
**Control**: ✅ Por variable de entorno  
**Fecha**: 4 de diciembre de 2025