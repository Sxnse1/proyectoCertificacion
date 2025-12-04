# Seguridad de Webhooks de Mercado Pago

## ✅ Implementación Completada

Se ha implementado la validación criptográfica de firmas HMAC-SHA256 en los webhooks de Mercado Pago para prevenir ataques de falsificación.

## 🔧 Archivos Modificados

- `routes/protected/pagos.js`: Agregada validación de seguridad
- `.env`: Agregada variable `MERCADOPAGO_WEBHOOK_SECRET`

## 🔐 Configuración Requerida

### 1. Obtener el Secreto del Webhook

1. Accede a tu [Dashboard de Mercado Pago](https://www.mercadopago.com.ar/developers/panel)
2. Ve a **Integraciones** > **Webhooks**
3. Selecciona tu aplicación
4. Copia el **Secret Key** que aparece en la configuración

### 2. Configurar la Variable de Entorno

Actualiza el archivo `.env` con el secreto real:

```env
MERCADOPAGO_WEBHOOK_SECRET=tu_secreto_real_aqui
```

**⚠️ IMPORTANTE**: Reemplaza `your_webhook_secret_here` con el secreto real obtenido del dashboard.

### 3. Configurar URLs de Webhook en Mercado Pago

En el dashboard de Mercado Pago, configura estas URLs:

- **Para pagos individuales**: `https://tu-dominio.com/pagos/webhook`
- **Para suscripciones**: `https://tu-dominio.com/pagos/webhook-suscripcion`

## 🛡️ Características de Seguridad Implementadas

### Validación de Firma HMAC-SHA256

- ✅ Verifica headers `x-signature` y `x-request-id`
- ✅ Extrae timestamp y hash de la firma
- ✅ Genera firma esperada usando el secreto
- ✅ Comparación segura usando `crypto.timingSafeEqual()`
- ✅ Logs detallados para debugging y auditoría

### Respuestas de Error

- **401 Unauthorized**: Cuando la firma es inválida
- **Logs de seguridad**: Registra intentos de acceso no autorizados

### Endpoints Protegidos

1. **POST /pagos/webhook**
   - Procesa pagos de cursos individuales
   - Valida firma antes de procesar

2. **POST /pagos/webhook-suscripcion**  
   - Procesa pagos de membresías/suscripciones
   - Valida firma antes de procesar

## 🔍 Función de Validación

```javascript
function validateWebhookSignature(req, body) {
  // Extrae headers x-signature y x-request-id
  // Verifica que el secreto esté configurado
  // Genera HMAC-SHA256 esperado
  // Compara firmas de forma segura
  // Retorna true/false
}
```

## 📋 Testing

### Para Desarrollo Local

Si quieres probar localmente, puedes usar un túnel como ngrok:

```bash
npm install -g ngrok
ngrok http 3000
```

Luego configura la URL pública en Mercado Pago.

### Logs de Seguridad

Los logs mostrarán:

```
[WEBHOOK SECURITY] ✅ Firma válida - webhook auténtico
[WEBHOOK SECURITY] ❌ Firma inválida - posible ataque
[PAGOS] 🛡️ Webhook rechazado: firma inválida
```

## 🚨 Consideraciones de Seguridad

1. **Nunca exponer el secreto**: Manténlo en variables de entorno
2. **Rotar secretos regularmente**: Cambia el secreto periódicamente
3. **Monitorear logs**: Revisa intentos de acceso no autorizados
4. **HTTPS obligatorio**: Usa siempre HTTPS en producción

## 🔄 Próximos Pasos

1. Configura el `MERCADOPAGO_WEBHOOK_SECRET` real
2. Prueba los webhooks en el entorno de sandbox
3. Configura las URLs en producción
4. Monitorea los logs de seguridad

---

**Estado**: ✅ Implementado y listo para configuración
**Fecha**: 4 de diciembre de 2025