# Documentación del Proyecto

## Estructura Organizada

### Directorios Principales

- **`/bin`** - Scripts ejecutables del servidor
- **`/config`** - Configuración de la aplicación y base de datos
- **`/database`** - Scripts SQL, migraciones y actualizaciones de BD
- **`/docs`** - Documentación del proyecto
- **`/middleware`** - Middlewares de autenticación y validación
- **`/public`** - Archivos estáticos (CSS, JS, imágenes)
- **`/routes`** - Controladores organizados por tipo de usuario
  - `/admin` - Rutas para administradores
  - `/protected` - Rutas para usuarios autenticados
  - `/public` - Rutas públicas
- **`/scripts`** - Scripts de utilidad y migración
- **`/services`** - Servicios externos (Bunny, Email, 2FA, Vimeo)
- **`/templates`** - Plantillas HTML y vistas experimentales
- **`/uploads`** - Archivos subidos por usuarios
- **`/views`** - Vistas Handlebars organizadas por tipo de usuario

### Archivos Eliminados Durante la Limpieza

- Archivos `.backup` duplicados
- Scripts PowerShell de actualización temporal
- Archivos de testing (`test-*.js`, `test-*.ps1`)
- Archivos debug (`debug_upload.js`)
- Scripts de verificación que ya cumplieron su propósito
- Archivos temporales en `/routes/admin` (`favoritos-admin-temp.js`)

### Archivos Reorganizados

- `MIGRACION_BUNNY.md` → `/docs/`
- `update_database.sql` → `/database/`
- `update_db.js` → `/scripts/`
- `modal-edit-video-clean.html` → `/templates/`
- `video-player-redesigned.hbs` → `/templates/`

## Notas de Desarrollo

- Todos los archivos de configuración permanecen en el directorio raíz
- La estructura sigue el patrón MVC con separación clara de responsabilidades
- Los scripts de utilidad están centralizados en `/scripts`
- La documentación se mantiene en `/docs`