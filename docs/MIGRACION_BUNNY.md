# Guía de Migración de Vimeo a Bunny.net Stream

Esta guía te ayudará a migrar completamente tu aplicación de Vimeo a Bunny.net Stream para el almacenamiento y reproducción de videos.

## 📋 Preparativos

### 1. Configurar Cuenta de Bunny.net

1. **Crear cuenta en Bunny.net**
   - Ve a https://bunny.net y crea tu cuenta
   - Accede al dashboard

2. **Crear Video Library**
   - En el dashboard, ve a **Stream** > **Video Libraries**
   - Haz clic en **Create Library**
   - Configura el nombre y región
   - **Guarda el Library ID** (necesario para la configuración)

3. **Obtener API Key**
   - Ve a **Account Settings** > **API**
   - Crea una nueva API Key o usa la existente
   - **Guarda la API Key** de forma segura

### 2. Configurar Variables de Entorno

Copia el archivo `.env.example` a `.env` y configura:

```env
# Configuración de Bunny.net Stream
BUNNY_API_KEY=tu_api_key_real_aqui
BUNNY_LIBRARY_ID=tu_library_id_aqui
BUNNY_CDN_HOSTNAME=iframe.mediadelivery.net
```

## 🗄️ Migración de Base de Datos

### 1. Ejecutar Script SQL

Ejecuta el script de migración en tu base de datos SQL Server:

```sql
-- En SQL Server Management Studio o tu herramienta preferida
-- Ejecutar el archivo: database/migrate_to_bunny.sql
```

Este script:
- ✅ Agrega nuevas columnas para Bunny.net
- ✅ Crea índices para optimización
- ✅ Hace backup de datos existentes
- ✅ Crea vistas y procedimientos de compatibilidad

### 2. Verificar Migración de Estructura

```sql
-- Verificar que las columnas se agregaron correctamente
USE StartEducationDB;
SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COLUMN_DEFAULT
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_NAME = 'Video'
ORDER BY ORDINAL_POSITION;

-- Verificar procedimientos creados
SELECT name, create_date 
FROM sys.procedures 
WHERE name LIKE '%Bunny%' OR name LIKE '%Migration%';

-- Verificar vista de compatibilidad
SELECT name, create_date 
FROM sys.views 
WHERE name = 'vw_Videos_Compatible';
```

## 🎬 Migración de Videos

### Opción A: Migración Manual (Recomendada para pocos videos)

1. **Subir videos uno por uno usando la interfaz web**
   - Accede a `/admin/videos`
   - Usa el formulario de subida normal
   - Los nuevos videos se guardarán automáticamente en Bunny.net

### Opción B: Migración Automatizada (Para muchos videos)

1. **Probar conexión con Bunny.net**:
   ```bash
   # Verificar configuración y conexión
   node scripts/test_bunny_connection.js
   ```

2. **Preparar el script de migración**:
   ```bash
   # Verificar estado actual
   node scripts/migrate_videos.js status
   
   # Verificar videos problemáticos
   node scripts/migrate_videos.js problems
   ```

3. **Ejecutar migración** (⚠️ **HACER BACKUP PRIMERO**):
   ```bash
   # Ejecutar migración completa
   node scripts/migrate_videos.js migrate
   ```

4. **Verificar resultados**:
   ```bash
   # Verificar estado después de migración
   node scripts/migrate_videos.js status
   
   # Usar procedimientos de SQL Server
   # En SQL Server Management Studio:
   EXEC sp_GetMigrationStats;
   ```

## 🔧 Configuración del Código

### 1. Dependencias

Las dependencias necesarias ya están instaladas:
- ✅ `axios` - Para peticiones HTTP
- ✅ `form-data` - Para uploads multipart

### 2. Servicios

- ✅ `services/bunnyService.js` - Nuevo servicio para Bunny.net
- ⚠️ `services/vimeoService.js` - Mantener temporalmente para compatibilidad

### 3. Rutas y Vistas

- ✅ Rutas de administración actualizadas
- ✅ Reproductor de video actualizado
- ✅ Vistas con soporte dual (Bunny.net + Vimeo fallback)

## 🧪 Pruebas

### 1. Probar Subida de Video

1. Accede a `/admin/videos/nuevo`
2. Sube un video de prueba
3. Verifica que:
   - Se sube correctamente a Bunny.net
   - Se guarda en la BD con `video_provider = 'bunny'`
   - El reproductor funciona correctamente

### 2. Probar Reproducción

1. Accede a un video desde la vista de estudiante
2. Verifica que:
   - El reproductor de Bunny.net carga correctamente
   - Los controles funcionan (play/pause/fullscreen)
   - No hay errores en la consola del navegador

### 3. Probar Compatibilidad

1. Verifica que videos antiguos de Vimeo siguen funcionando
2. Comprueba la vista de administración con videos mixtos

## 🔍 Solución de Problemas

### Error: "Variables de entorno no configuradas"

**Solución**: Verifica que `BUNNY_API_KEY` y `BUNNY_LIBRARY_ID` estén en tu archivo `.env`

### Error: "Failed to upload to Bunny.net"

**Posibles causas**:
1. API Key incorrecta
2. Library ID incorrecto
3. Límites de ancho de banda alcanzados
4. Archivo muy grande

**Verificar**:
```javascript
// Probar conexión manualmente
const bunnyService = require('./services/bunnyService');
bunnyService.listVideos().then(console.log).catch(console.error);
```

### Videos no se reproducen

**Verificar**:
1. Library ID correcto en las variables de entorno
2. URLs generadas correctamente
3. Configuración de CORS en Bunny.net

### Migración parcial

**Revertir video específico**:
```bash
node scripts/migrate_videos.js revert <video_id>
```

## 📊 Monitoreo Post-Migración

### 1. Consultas Útiles

```sql
-- Estado completo de la migración (usando procedimiento almacenado)
USE StartEducationDB;
EXEC sp_GetMigrationStats;

-- Vista de compatibilidad para desarrollo
SELECT TOP 10 * FROM vw_Videos_Compatible 
ORDER BY video_provider, titulo;

-- Videos problemáticos detallados
SELECT 
    v.id_video,
    v.titulo,
    v.video_provider,
    v.url,
    v.bunny_video_id,
    v.estatus,
    m.titulo as modulo,
    c.titulo as curso,
    CASE 
        WHEN v.video_provider = 'bunny' AND v.bunny_video_id IS NULL THEN 'Bunny sin ID'
        WHEN v.video_provider = 'vimeo' AND v.url IS NULL THEN 'Vimeo sin URL'
        WHEN v.video_provider IS NULL AND v.url IS NOT NULL THEN 'Sin provider definido'
        ELSE 'OK'
    END as estado
FROM Video v
INNER JOIN Modulos m ON v.id_modulo = m.id_modulo
INNER JOIN Cursos c ON m.id_curso = c.id_curso
WHERE v.video_provider IS NULL 
   OR (v.video_provider = 'bunny' AND v.bunny_video_id IS NULL)
   OR (v.video_provider = 'vimeo' AND v.url IS NULL);

-- Migrar video individual
EXEC sp_MigrateVideoToBunny 
    @VideoId = 123,
    @BunnyVideoId = 'nuevo-bunny-id',
    @BunnyLibraryId = 'tu-library-id',
    @BunnyEmbedUrl = 'https://iframe.mediadelivery.net/embed/library/video';
```

### 2. Logs

Revisar logs de migración en:
- `logs/migration_YYYY-MM-DD.log`
- Logs de la aplicación para errores de reproducción

## 🎯 Próximos Pasos

### 1. Limpieza (Después de verificar que todo funciona)

1. **Remover dependencia de Vimeo**:
   ```bash
   npm uninstall @vimeo/vimeo
   ```

2. **Limpiar código**:
   - Eliminar `services/vimeoService.js`
   - Remover referencias de Vimeo en vistas
   - Actualizar rutas para usar solo Bunny.net

3. **Optimizar base de datos**:
   ```sql
   -- Después de verificar migración completa
   ALTER TABLE Video DROP COLUMN url; -- Solo si ya no se necesita
   ```

### 2. Optimizaciones

1. **Configurar CDN**: Optimizar configuración de Pull Zone en Bunny.net
2. **Thumbnails automáticos**: Implementar generación automática de miniaturas
3. **Calidades múltiples**: Configurar diferentes calidades de video
4. **Analytics**: Implementar seguimiento de visualizaciones

## 💰 Costos

### Comparación Vimeo vs Bunny.net

**Bunny.net Stream** (aproximado):
- Storage: $0.01/GB/mes
- Bandwidth: $0.01-0.05/GB (según región)
- Encoding: $0.006/minuto

**Ventajas de Bunny.net**:
- ✅ Mucho más económico para alto volumen
- ✅ Control total del reproductor
- ✅ Sin límites de reproducciones
- ✅ CDN global incluido
- ✅ API más flexible

## 📞 Soporte

Si encuentras problemas durante la migración:

1. **Revisar logs** de la aplicación y migración
2. **Consultar documentación** de Bunny.net API
3. **Verificar configuración** de variables de entorno
4. **Probar con un video pequeño** primero

## ✅ Checklist Final

- [ ] Variables de entorno configuradas
- [ ] Script SQL ejecutado exitosamente
- [ ] Backup de base de datos realizado
- [ ] Video de prueba subido y reproducido correctamente
- [ ] Videos existentes siguen funcionando
- [ ] Logs revisados sin errores críticos
- [ ] Equipo informado sobre la migración
- [ ] Plan de rollback documentado

---

**¡Migración completada!** 🎉 Tu aplicación ahora usa Bunny.net Stream para un mejor rendimiento y menores costos.