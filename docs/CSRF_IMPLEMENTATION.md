# 🛡️ Implementación de Protección CSRF

## ¿Qué es CSRF y por qué es importante?

**Cross-Site Request Forgery (CSRF)** es un ataque donde un sitio malicioso engaña al navegador del usuario para que ejecute acciones no deseadas en un sitio donde el usuario está autenticado.

### Ejemplo de ataque CSRF:
1. Usuario inicia sesión en `tuapp.com`
2. Visita un sitio malicioso `evil.com`
3. `evil.com` contiene código que envía una petición POST a `tuapp.com/admin/delete-user`
4. Como el usuario está autenticado, la petición se ejecuta sin su conocimiento

## ✅ Implementación Completada

### 1. Dependencias instaladas
```json
{
  "dependencies": {
    "csurf": "^1.11.0",
    "cookie-parser": "~1.4.4"
  }
}
```

### 2. Configuración en `app.js`
- ✅ Middleware CSRF configurado con cookies
- ✅ Rutas excluidas para webhooks (`/webhook`, `/api/webhook`)
- ✅ Token CSRF disponible globalmente como `res.locals.csrfToken`
- ✅ Manejo de errores en desarrollo y producción
- ✅ Configuración segura (HTTPS en producción)

## 🔧 Cómo usar en tus vistas .hbs

### 1. Formularios básicos

```handlebars
<!-- En cualquier formulario que haga POST, PUT, DELETE -->
<form method="POST" action="/auth/login">
  <!-- Token CSRF requerido -->
  <input type="hidden" name="_csrf" value="{{csrfToken}}">
  
  <input type="email" name="email" placeholder="Email" required>
  <input type="password" name="password" placeholder="Contraseña" required>
  <button type="submit">Iniciar Sesión</button>
</form>
```

### 2. Formularios AJAX

```handlebars
<script>
// En peticiones AJAX, incluir el token en headers o body
fetch('/api/data', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-CSRF-Token': '{{csrfToken}}' // Header approach
  },
  body: JSON.stringify({
    _csrf: '{{csrfToken}}', // Body approach (alternativo)
    data: 'mi-data'
  })
});
</script>
```

### 3. Formularios dinámicos con JavaScript

```handlebars
<script>
// Token disponible globalmente
window.csrfToken = '{{csrfToken}}';

// Función helper para agregar token a formularios
function addCSRFToken(form) {
  if (!form.querySelector('input[name="_csrf"]')) {
    const input = document.createElement('input');
    input.type = 'hidden';
    input.name = '_csrf';
    input.value = window.csrfToken;
    form.appendChild(input);
  }
}

// Uso en formularios dinámicos
document.getElementById('dynamic-form').addEventListener('submit', function(e) {
  addCSRFToken(this);
  // Continuar con el envío
});
</script>
```

### 4. Formularios de eliminación

```handlebars
<!-- Botón de eliminar con confirmación -->
<form method="POST" action="/admin/users/{{id}}/delete" 
      onsubmit="return confirm('¿Seguro que deseas eliminar?')">
  <input type="hidden" name="_csrf" value="{{csrfToken}}">
  <input type="hidden" name="_method" value="DELETE">
  <button type="submit" class="btn btn-danger">
    <i class="fas fa-trash"></i> Eliminar
  </button>
</form>
```

### 5. Modal con formulario

```handlebars
<!-- Modal de confirmación -->
<div class="modal" id="deleteModal">
  <div class="modal-content">
    <form method="POST" action="/admin/delete-course">
      <input type="hidden" name="_csrf" value="{{csrfToken}}">
      <input type="hidden" name="courseId" id="courseToDelete">
      
      <h3>¿Confirmar eliminación?</h3>
      <button type="button" onclick="closeModal()">Cancelar</button>
      <button type="submit" class="btn-danger">Eliminar</button>
    </form>
  </div>
</div>
```

### 6. Actualización de token en SPA

```handlebars
<script>
// Para aplicaciones de una sola página (SPA)
// Actualizar token cuando expire
async function refreshCSRFToken() {
  try {
    const response = await fetch('/csrf-token');
    const data = await response.json();
    window.csrfToken = data.csrfToken;
    
    // Actualizar todos los campos hidden
    document.querySelectorAll('input[name="_csrf"]').forEach(input => {
      input.value = window.csrfToken;
    });
  } catch (error) {
    console.error('Error actualizando CSRF token:', error);
  }
}

// Actualizar token cada 30 minutos
setInterval(refreshCSRFToken, 30 * 60 * 1000);
</script>
```

## ⚠️ Casos especiales

### 1. Rutas excluidas
Las siguientes rutas NO requieren token CSRF:
- `/webhook/*` - Webhooks de MercadoPago
- `/api/webhook/*` - APIs externas
- `/health` - Health checks
- `/favicon.ico` - Favicon

### 2. APIs externas
Si tienes APIs que consumen servicios externos, agrégalas a la lista de exclusión en `app.js`:

```javascript
const excludedRoutes = [
  '/webhook',
  '/api/webhook',
  '/api/external', // Agregar aquí
  '/health',
  '/favicon.ico'
];
```

### 3. Debugging
En desarrollo, los errores CSRF muestran información detallada:

```json
{
  "error": "CSRF Token inválido o faltante",
  "message": "invalid csrf token",
  "path": "/auth/login",
  "method": "POST",
  "help": "Asegúrate de incluir el token CSRF en tus formularios"
}
```

## 🔒 Configuración de seguridad

### Configuración actual:
- **Cookie name**: `_csrf`
- **HttpOnly**: `true` (no accesible desde JavaScript)
- **Secure**: `true` en producción (HTTPS), `false` en desarrollo
- **SameSite**: `strict` en producción, `lax` en desarrollo
- **MaxAge**: 1 hora (3600000ms)

### Personalización:
```javascript
const csrfProtection = csrf({ 
  cookie: {
    name: '_csrf',
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 3600000 // Cambiar según necesidades
  }
});
```

## 🧪 Testing

### 1. Verificar que funciona:
```bash
# Esta petición debe fallar (sin token)
curl -X POST http://localhost:3000/auth/login \
  -d "email=test@test.com&password=123"

# Respuesta esperada: 403 Forbidden
```

### 2. Verificar exclusiones:
```bash
# Esta petición debe funcionar (ruta excluida)
curl -X POST http://localhost:3000/webhook/mercadopago \
  -H "Content-Type: application/json" \
  -d '{"id": "123"}'
```

## 📋 Checklist de implementación

- [x] ✅ Instalar dependencias (`csurf`, `cookie-parser`)
- [x] ✅ Configurar middleware en `app.js`
- [x] ✅ Excluir rutas de webhooks
- [x] ✅ Hacer token disponible en vistas (`res.locals.csrfToken`)
- [x] ✅ Configurar manejo de errores
- [x] ✅ Documentar uso en formularios
- [ ] ⏳ Actualizar formularios existentes (próximo paso)
- [ ] ⏳ Probar en desarrollo
- [ ] ⏳ Probar en producción

## 🚀 Próximos pasos

1. **Actualizar formularios existentes**: Agregar `<input type="hidden" name="_csrf" value="{{csrfToken}}">` a todos los formularios
2. **Probar en desarrollo**: `npm run dev` y verificar que los formularios funcionan
3. **Instalar dependencias**: `npm install` para instalar `csurf`
4. **Deploy a producción**: Verificar que HTTPS funciona correctamente

## 🆘 Solución de problemas

### Error: "Cannot read property 'csrfToken' of undefined"
**Solución**: El middleware no está cargando. Verificar que el token se excluya de la ruta o que el middleware esté antes de las rutas.

### Error: "Invalid CSRF token"
**Solución**: 
1. Verificar que el formulario incluye `<input type="hidden" name="_csrf" value="{{csrfToken}}">`
2. Verificar que las cookies están habilitadas
3. En AJAX, incluir el token en headers: `'X-CSRF-Token': '{{csrfToken}}'`

### Error en producción: "Secure cookie requires HTTPS"
**Solución**: Verificar que `app.set('trust proxy', 1)` esté configurado para Heroku/producción.