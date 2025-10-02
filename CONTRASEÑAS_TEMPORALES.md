# 🔐 Sistema de Contraseñas Temporales - StartEducation

## 📋 Funcionalidad Implementada

Se ha implementado un sistema completo de contraseñas temporales que funciona de la siguiente manera:

### ✨ Características Principales

1. **Creación de Usuarios con Contraseña Temporal**
   - Al crear un usuario desde el panel de administrador, se genera automáticamente una contraseña temporal
   - La contraseña se envía por correo electrónico al usuario
   - Se marca en la base de datos que el usuario tiene una contraseña temporal

2. **Envío de Credenciales por Email**
   - Email profesional con diseño responsive
   - Incluye instrucciones paso a paso
   - Contraseña temporal destacada visualmente
   - Si el servicio de email no está configurado, la contraseña se muestra en consola

3. **Login con Contraseña Temporal**
   - Al iniciar sesión con contraseña temporal, el usuario es redirigido automáticamente
   - No puede acceder a la plataforma hasta cambiar la contraseña
   - Sesión temporal hasta completar el cambio

4. **Cambio Obligatorio de Contraseña**
   - Interfaz intuitiva y segura
   - Validaciones en tiempo real
   - Actualización automática en base de datos
   - Notificación por email del cambio exitoso

## 🗃️ Cambios en Base de Datos

Se añadieron las siguientes columnas a la tabla `Usuarios`:

```sql
-- Indica si el usuario tiene contraseña temporal
tiene_password_temporal BIT NOT NULL DEFAULT 0

-- Fecha cuando se asignó la contraseña temporal  
fecha_password_temporal DATETIME2 NULL

-- Índice para optimizar consultas
IX_Usuarios_PasswordTemporal
```

## 📧 Configuración de Email

### Variables de Entorno Requeridas (Opcional)

```env
# Configuración SMTP para Gmail
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=tu_email@gmail.com
SMTP_PASS=tu_contraseña_de_aplicacion
```

### ⚠️ Importante para Gmail
- No uses tu contraseña normal de Gmail
- Debes generar una "Contraseña de aplicación"
- Instrucciones: https://support.google.com/accounts/answer/185833

### Sin Configuración de Email
- Las contraseñas aparecerán en la consola del servidor
- La funcionalidad seguirá funcionando normalmente

## 🔄 Flujo Completo

### 1. Administrador crea usuario
```
Admin Panel → Crear Usuario → Sistema genera contraseña temporal → Email enviado
```

### 2. Usuario recibe credenciales
```
Email recibido → Contraseña temporal → Instrucciones de acceso
```

### 3. Primer login
```
Login con contraseña temporal → Redirección automática → Cambio obligatorio
```

### 4. Cambio de contraseña
```
Formulario seguro → Validaciones → Actualización en BD → Acceso completo
```

## 🚀 Archivos Modificados/Creados

### Archivos Nuevos
- `services/emailService.js` - Servicio de envío de emails
- `views/change-password.hbs` - Interfaz de cambio de contraseña
- `database/update_password_temporal.sql` - Script SQL de actualización
- `scripts/update-database.js` - Script de actualización automatizada
- `.env.example` - Ejemplo de variables de entorno

### Archivos Modificados
- `routes/usuarios-admin.js` - Lógica de creación con email
- `routes/auth.js` - Validación de contraseña temporal y cambio
- `package.json` - Dependencia nodemailer añadida

## 🧪 Pruebas

### Para probar la funcionalidad:

1. **Crear un usuario desde admin:**
   ```
   http://localhost:3000/admin/usuarios
   ```

2. **Verificar en consola:**
   ```
   [USUARIOS] 📧 Contraseña temporal para email@test.com: ABC123de
   ```

3. **Intentar login:**
   ```
   http://localhost:3000/auth/login
   ```

4. **Cambiar contraseña:**
   ```
   Redirección automática → /auth/change-password
   ```

## 📊 Base de Datos - Consultas Útiles

### Ver usuarios con contraseña temporal
```sql
SELECT nombre, apellido, email, fecha_password_temporal
FROM Usuarios 
WHERE tiene_password_temporal = 1;
```

### Estadísticas de contraseñas temporales
```sql
SELECT 
    COUNT(*) as total_temporales,
    COUNT(CASE WHEN fecha_password_temporal > DATEADD(day, -1, GETDATE()) THEN 1 END) as ultimas_24h
FROM Usuarios 
WHERE tiene_password_temporal = 1;
```

## 🔒 Seguridad

### Medidas Implementadas
- ✅ Contraseñas hasheadas con bcrypt
- ✅ Validación de contraseña actual antes del cambio
- ✅ Sesiones temporales para cambio obligatorio
- ✅ Limpieza automática de flags temporales
- ✅ Notificaciones por email de cambios
- ✅ Timeouts y validaciones de formulario

### Recomendaciones
- Configura SMTP para producción
- Monitorea usuarios con contraseñas temporales antiguos
- Considera implementar expiración de contraseñas temporales

## 🛠️ Solución de Problemas

### Email no se envía
```
Verificar variables SMTP → Revisar consola → Contraseña estará ahí
```

### Usuario no puede cambiar contraseña
```
Verificar sesión temporal → Limpiar cookies → Intentar login nuevamente
```

### Error en base de datos
```
Ejecutar: node scripts/update-database.js
```

## 🎯 Próximas Mejoras Sugeridas

1. **Expiración de contraseñas temporales** (ej: 24 horas)
2. **Plantillas de email personalizables**
3. **Historial de cambios de contraseña**
4. **Integración con otros proveedores de email**
5. **Panel admin para gestionar contraseñas temporales**

---

## 📞 Soporte

Si encuentras algún problema o necesitas ayuda:

1. Revisa los logs en consola
2. Verifica las variables de entorno
3. Consulta la base de datos directamente
4. Revisa los archivos de ejemplo proporcionados

¡La funcionalidad está lista para usar! 🚀