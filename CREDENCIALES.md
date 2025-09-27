# 🔐 CREDENCIALES DE PRUEBA - Sistema de Login

## ✅ Credenciales Confirmadas (Contraseñas Hasheadas)

### 👨‍🏫 INSTRUCTORES (Redirigen al Dashboard)
```
Email: cesardavila1937@gmail.com
Contraseña: pass123
Rol: instructor
Estatus: activo
```

```
Email: ericka@gmail.com
Contraseña: pass123
Rol: instructor
Estatus: activo
```

### 👨‍🎓 USUARIOS REGULARES (Redirigen a Cursos)
```
Email: carlos.garcia@example.com
Contraseña: HASHED_PASSWORD_AQUI
Rol: user
Estatus: activo
```

## ⚠️ Usuarios con Contraseñas Desconocidas
```
Email: juanpi@gmail.com
Contraseña: [Desconocida - ya estaba hasheada]
Rol: user
Estatus: activo
```

```
Email: rosa@gmail.com
Contraseña: [Desconocida - ya estaba hasheada]
Rol: user
Estatus: activo
```

## 🧪 Cómo Probar el Login

1. **Ir a la página de login:**
   ```
   http://localhost:3000/auth/login
   ```

2. **Usar las credenciales de arriba**
   - Los instructores serán redirigidos al dashboard
   - Los usuarios regulares serán redirigidos a la sección de cursos

## 🔧 Solución Implementada

✅ **Problema resuelto:** Las contraseñas que estaban en texto plano han sido hasheadas automáticamente

✅ **Migración automática:** El sistema ahora hashea automáticamente cualquier contraseña en texto plano durante el login

✅ **Compatibilidad:** El sistema maneja tanto contraseñas hasheadas como texto plano (para casos de transición)

## 📋 Archivos Modificados

- `routes/auth.js` - Mejorado el sistema de verificación de contraseñas
- `migrate-passwords.js` - Script para hashear contraseñas existentes
- `verify-login.js` - Script para verificar que el login funcione
- `CREDENCIALES.md` - Este archivo de referencia

## 🛡️ Seguridad

- Todas las contraseñas nuevas se hashean automáticamente con bcrypt
- Las contraseñas existentes en texto plano se hashean automáticamente al hacer login
- Se utiliza bcrypt con factor de complejidad 10
- El sistema detecta automáticamente si una contraseña ya está hasheada

## 🚀 Estado Actual

✅ Sistema de login funcionando correctamente
✅ Todas las contraseñas están hasheadas
✅ Compatibilidad con contraseñas legacy
✅ Migración automática implementada