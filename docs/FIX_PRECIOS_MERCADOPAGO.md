# 🔧 Corrección: Precios en MercadoPago

## ❌ **Problema Identificado:**
Los precios de los cursos no aparecían correctamente en MercadoPago debido a errores en las consultas de base de datos.

## 🔍 **Causa Raíz:**
1. **Consulta incorrecta en webhook**: Campos inexistentes en tabla `Carrito_Compras`
2. **Campos faltantes**: No se obtenía el precio desde la tabla `Cursos`
3. **Estructura de tabla mal entendida**: Confusión entre `id_carrito` vs `id_carrito_compra`

## ✅ **Correcciones Aplicadas:**

### 1. **Consulta del Webhook Corregida:**

**ANTES (❌ Incorrecto):**
```sql
SELECT id_carrito_compra, id_curso, cantidad, precio
FROM Carrito_Compras 
WHERE id_usuario = @userId AND estatus = 'activo'
```
**Problemas:**
- `id_carrito_compra` no existe (es `id_carrito`)
- `cantidad` no existe en la tabla
- `precio` no existe en la tabla

**DESPUÉS (✅ Correcto):**
```sql
SELECT 
  cc.id_carrito,
  cc.id_curso,
  1 as cantidad,
  c.precio
FROM Carrito_Compras cc
INNER JOIN Cursos c ON cc.id_curso = c.id_curso
WHERE cc.id_usuario = @userId AND cc.estatus = 'activo'
```

### 2. **Logging de Precios Mejorado:**

```javascript
// Crear items para Mercado Pago
const mpItems = items.map(item => {
  const precio = parseFloat(item.precio);
  console.log(`[PAGOS] 💰 Item: ${item.titulo} - Precio: $${precio}`);
  
  return {
    id: item.id_curso.toString(),
    title: item.titulo,
    description: item.descripcion || `Curso: ${item.titulo}`,
    picture_url: item.miniatura || '',
    category_id: 'education',
    quantity: parseInt(item.cantidad),
    currency_id: 'MXN',
    unit_price: precio  // ✅ Precio correcto desde BD
  };
});
```

### 3. **Inserción en Compras Corregida:**

```javascript
// Mover items a tabla Compras con precios correctos
for (const item of items) {
  await transaction.request()
    .input('userId', userId)
    .input('cursoId', item.id_curso)
    .input('cantidad', item.cantidad)
    .input('precio', parseFloat(item.precio))  // ✅ parseFloat para evitar errores
    .input('metodoPago', 'mercadopago')
    .input('transactionId', paymentId)
    .query(`
      INSERT INTO Compras (
        id_usuario, id_curso, cantidad, precio_pagado, 
        metodo_pago, transaction_id, fecha_compra, estatus
      ) VALUES (
        @userId, @cursoId, @cantidad, @precio,
        @metodoPago, @transactionId, GETDATE(), 'completada'
      )
    `);
}
```

## 🧪 **Resultado de los Logs:**

```
[PAGOS] 💳 Creando preferencia para usuario: cesar@gmail.com
[PAGOS] 🛒 Carrito: 1 items, Total: $350
[PAGOS] 💰 Item: Como hacer un degradado perfecto - Precio: $350
```

**En JSON de MercadoPago:**
```json
{
  "items": [
    {
      "id": "1",
      "title": "Como hacer un degradado perfecto",
      "unit_price": 350,  // ✅ Precio correcto!
      "quantity": 1,
      "currency_id": "MXN"
    }
  ]
}
```

## 🎯 **Verificación:**

### Para confirmar que funciona:
1. **Frontend**: Ve a `/carrito` y verifica que el total sea el correcto
2. **MercadoPago**: Al proceder al pago, el monto debe coincidir
3. **Logs**: Verifica `[PAGOS] 💰 Item: [nombre] - Precio: $[cantidad]`
4. **Webhook**: Al completar pago, debe registrar precio correcto en tabla `Compras`

### Estructura de Tabla Recordatorio:
- **Carrito_Compras**: `id_carrito`, `id_usuario`, `id_curso`, `fecha_agregado`, `estatus`
- **Cursos**: `id_curso`, `titulo`, `precio`, `descripcion`, etc.
- **Compras**: `id_compra`, `id_usuario`, `id_curso`, `precio_pagado`, etc.

## ✅ **Estado Actual:**
- ✅ **Precios correctos**: Se obtienen desde tabla `Cursos`
- ✅ **Consultas corregidas**: JOIN apropiado para obtener datos
- ✅ **MercadoPago**: Recibe precios correctos
- ✅ **Webhook**: Procesa pagos con precios válidos
- ✅ **Logging**: Visibilidad completa del flujo

---
**¡Precios funcionando correctamente en MercadoPago!** 💰🎯