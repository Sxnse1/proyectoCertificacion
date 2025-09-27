# Despliegue en Heroku - Guía Completa

## 📋 Preparación para Heroku

### 1. Instalar Heroku CLI
```bash
# Windows (usando chocolatey)
choco install heroku-cli

# O descargar desde: https://devcenter.heroku.com/articles/heroku-cli
```

### 2. Login en Heroku
```bash
heroku login
```

### 3. Crear aplicación en Heroku
```bash
heroku create tu-nombre-app
```

## 🔧 Configuración de Variables de Entorno

Configura estas variables en Heroku Dashboard > Settings > Config Vars:

```bash
# Base de datos SQL Server
DB_SERVER=tu-servidor.database.windows.net
DB_DATABASE=nombre-base-datos
DB_USER=tu-usuario
DB_PASSWORD=tu-contraseña
DB_PORT=1433
DB_ENCRYPT=true
DB_TRUST_CERT=false

# Configuración de producción
NODE_ENV=production
```

O usando CLI:
```bash
heroku config:set DB_SERVER=tu-servidor.database.windows.net
heroku config:set DB_DATABASE=nombre-base-datos
heroku config:set DB_USER=tu-usuario
heroku config:set DB_PASSWORD=tu-contraseña
heroku config:set DB_PORT=1433
heroku config:set DB_ENCRYPT=true
heroku config:set DB_TRUST_CERT=false
heroku config:set NODE_ENV=production
```

## 🚀 Despliegue

### 1. Preparar repositorio Git
```bash
git add .
git commit -m "Preparar para Heroku"
```

### 2. Conectar con Heroku
```bash
heroku git:remote -a tu-nombre-app
```

### 3. Desplegar
```bash
git push heroku main
```

## 🔍 Debugging en Heroku

### Ver logs en vivo
```bash
heroku logs --tail
```

### Verificar estado del sistema
```bash
# URL: https://tu-app.herokuapp.com/system/status
curl https://tu-app.herokuapp.com/system/status
```

### Health check
```bash
# URL: https://tu-app.herokuapp.com/system/health
curl https://tu-app.herokuapp.com/system/health
```

## 📊 Monitoreo

### Ver variables de entorno
```bash
heroku config
```

### Ver información de la app
```bash
heroku apps:info
```

### Reiniciar la aplicación
```bash
heroku restart
```

## 🔧 Solución de Problemas Comunes

### Error: "Application error"
1. Revisar logs: `heroku logs --tail`
2. Verificar variables de entorno: `heroku config`
3. Verificar que el Procfile existe y es correcto

### Error de base de datos
1. Verificar configuración de SQL Server en Azure/AWS
2. Asegurarse de que el firewall permite conexiones desde Heroku
3. Verificar credenciales en las config vars

### Error H10 (App crashed)
1. Revisar package.json - engines de Node.js
2. Verificar que todas las dependencias están en "dependencies" no en "devDependencies"
3. Revisar el Procfile

## 📝 Archivos Importantes para Heroku

- `Procfile` - Define cómo iniciar la app
- `package.json` - Dependencias y scripts
- `.gitignore` - Archivos a ignorar
- `.env.heroku` - Ejemplo de variables de entorno

## 🧪 URLs de Prueba

Una vez desplegada, puedes probar:

- **Página principal**: `https://tu-app.herokuapp.com/`
- **Login**: `https://tu-app.herokuapp.com/auth/login`
- **Estado del sistema**: `https://tu-app.herokuapp.com/system/status`
- **Health check**: `https://tu-app.herokuapp.com/system/health`

## 📚 Próximos Pasos

1. Configurar base de datos SQL Server en la nube (Azure SQL Database)
2. Ejecutar script de inicialización de base de datos
3. Probar login con usuarios de prueba
4. Configurar dominio personalizado (opcional)