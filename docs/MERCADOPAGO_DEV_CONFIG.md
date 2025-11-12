# 🔧 Configuración MercadoPago - Modo Desarrollo

## 🚨 **Problema Identificado:**
MercadoPago rechaza las preferencias con `auto_return` cuando las `back_urls` apuntan a `localhost` porque no son accesibles desde internet.

## ✅ **Solución Temporal - Desarrollo:**

### 1. **Configuración Básica** (Sin back_urls):
```javascript
const preferenceData = {
  items: mpItems,
  payer: {
    name: user.nombre.split(' ')[0] || 'Usuario',
    surname: user.nombre.split(' ').slice(1).join(' ') || 'StartEducation', 
    email: user.email,
  },
  external_reference: user.id.toString(),
  statement_descriptor: 'StartEducation'
  // SIN back_urls ni auto_return para desarrollo local
};
```

### 2. **Flujo Simplificado:**
1. Usuario hace clic en "Proceder al Pago"
2. Se crea preferencia básica
3. Redirección a MercadoPago 
4. Usuario completa pago
5. **Webhook procesa el pago** automáticamente
6. Usuario debe regresar manualmente a la aplicación

### 3. **Verificación Manual:**
- El webhook procesará los pagos exitosos
- El usuario puede verificar en `/user-dashboard` sus cursos comprados
- Los logs mostrarán el procesamiento del webhook

## 🌐 **Para Producción:**

### URLs Públicas Válidas:
```javascript
// Solo usar back_urls en producción con dominio real
if (process.env.NODE_ENV === 'production') {
  preferenceData.back_urls = {
    success: `https://tu-dominio.com/carrito?pago=success`,
    failure: `https://tu-dominio.com/carrito?pago=failure`,
    pending: `https://tu-dominio.com/carrito?pago=pending`
  };
  preferenceData.auto_return = 'approved';
}
```

## 🧪 **Testing en Desarrollo:**

### Datos de Prueba MercadoPago:
- **Tarjeta de Crédito**: 4509 9535 6623 3704
- **Código de Seguridad**: 123
- **Fecha de Vencimiento**: 11/25
- **Nombre**: APRO (para aprobado)

### Webhook Testing:
```bash
# El webhook seguirá funcionando:
POST http://localhost:3000/pagos/webhook
```

## 📋 **Estado Actual:**
- ✅ **Preferencias básicas**: Funcionando sin back_urls
- ✅ **Webhook**: Procesamiento automático
- ✅ **Redirección**: A MercadoPago funcional
- ⚠️ **Retorno**: Manual por parte del usuario
- 🔄 **Producción**: Requerirá dominio público

---
**Configuración optimizada para desarrollo local** 🚀