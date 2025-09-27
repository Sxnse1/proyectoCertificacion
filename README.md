# proyectoCertificacion - SQL Server

Este proyecto Express.js está configurado para conectarse a SQL Server.

## Configuración inicial

### 1. Instalar dependencias
```powershell
npm install
```

### 2. Configurar variables de entorno
Copia el archivo `.env.example` a `.env` y ajusta los valores:

```powershell
Copy-Item .env.example .env
```

Edita `.env` con tu configuración de SQL Server:
```env
DB_SERVER=localhost
DB_DATABASE=proyectoCertificacion
DB_USER=sa
DB_PASSWORD=tu_password
DB_PORT=1433
DB_ENCRYPT=false
DB_TRUST_CERT=true
```

### 3. Crear base de datos
1. Abre SQL Server Management Studio (SSMS)
2. Conecta a tu servidor
3. Crea la base de datos: `CREATE DATABASE proyectoCertificacion`
4. Ejecuta el script `database/init.sql` para crear la tabla de ejemplo

### 4. Iniciar aplicación
```powershell
npm start
```

## API Endpoints

### Autenticación
- `GET /auth/login` - Mostrar página de login
- `POST /auth/login` - Procesar login
- `GET /auth/dashboard` - Dashboard después del login
- `POST /auth/logout` - Cerrar sesión

### Usuarios
- `GET /users` - Obtener todos los usuarios
- `GET /users/:id` - Obtener usuario por ID
- `POST /users` - Crear nuevo usuario
  ```json
  {
    "nombre": "Nombre Usuario",
    "email": "email@example.com"
  }
  ```

## Sistema de Login con Roles

### 👨‍🏫 Instructores (van al Dashboard):
- **juan@instructor.com** / 123456
- **maria@instructor.com** / password  
- **carlos@instructor.com** / 123456
- **ana@instructor.com** / instructor123

### 👨‍🎓 Usuarios/Estudiantes (redirigen a UNE):
- **pedro@student.com** / student123
- **laura@student.com** / user123
- **diego@student.com** / password123

### 🧪 Usuarios de prueba (diferentes estatus):
- **test@inactive.com** / test123 (inactivo)
- **test@banned.com** / test123 (baneado)

### Cómo funciona el login:
1. Ve a la página principal (`http://localhost:3000`)
2. Haz clic en "🔐 Iniciar Sesión" en la navegación
3. **Si eres instructor**: serás redirigido al dashboard de gestión
4. **Si eres usuario/estudiante**: serás redirigido automáticamente a `https://une.edu.mx`
5. Los usuarios inactivos o baneados no podrán acceder

## Estructura del proyecto

```
├── config/
│   └── database.js      # Configuración de SQL Server
├── database/
│   └── init.sql         # Script de inicialización
├── routes/
│   ├── index.js
│   └── users.js         # Rutas de usuarios con ejemplos SQL
├── .env.example         # Variables de entorno ejemplo
└── app.js              # Aplicación principal
```

## Configuraciones especiales

### Para Azure SQL Database
```env
DB_ENCRYPT=true
DB_TRUST_CERT=false
```

### Para SQL Server local con certificados autofirmados
```env
DB_ENCRYPT=false
DB_TRUST_CERT=true
```

## Uso de la conexión en rutas

```javascript
// En cualquier ruta
const db = req.app.locals.db;

// Ejecutar consulta
const result = await db.executeQuery('SELECT * FROM tabla');

// Con parámetros seguros
const result = await db.executeQuery(
  'SELECT * FROM usuarios WHERE id = @id',
  { id: userId }
);
```