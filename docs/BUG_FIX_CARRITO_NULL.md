# 🐛 Error Corregido: NULL en id_usuario del Carrito

## ❌ **Error Original:**
```
Cannot insert the value NULL into column 'id_usuario', table 'StartEducationDB.dbo.Carrito_Compras'; column does not allow nulls. INSERT fails.
```

## 🔍 **Causa del Problema:**
El error ocurría porque había una **inconsistencia en el acceso a la propiedad del usuario** en la sesión:

### En `routes/public/auth.js` (Login) se guardaba como:
```javascript
req.session.user = {
  id: user.id_usuario,  // ← Aquí se guarda con 'id'
  nombre: `${user.nombre} ${user.apellido}`,
  email: user.email,
  // ...
};
```

### En `routes/protected/carrito.js` se intentaba acceder como:
```javascript
const carritoResult = await db.executeQuery(carritoQuery, { 
  userId: user.id_usuario  // ← ERROR: Intenta acceder 'id_usuario' pero no existe
});
```

## ✅ **Solución Aplicada:**

### 1. **Corregido en `routes/protected/carrito.js`:**
Cambiar todas las referencias de `user.id_usuario` → `user.id`

```javascript
// ANTES (incorrecto)
userId: user.id_usuario

// DESPUÉS (correcto)
userId: user.id
```

### 2. **Corregido en `routes/protected/pagos.js`:**
Mismo cambio para mantener consistencia:

```javascript
// ANTES
external_reference: user.id_usuario.toString(),
userId: user.id_usuario

// DESPUÉS  
external_reference: user.id.toString(),
userId: user.id
```

### 3. **Corregida consulta de pagos:**
Actualizada la consulta SQL para que coincida con la estructura real de la tabla:

```sql
-- ANTES (campos incorrectos)
SELECT cc.id_carrito_compra, cc.cantidad

-- DESPUÉS (campos correctos)  
SELECT cc.id_carrito, 1 as cantidad
```

### 4. **Creada tabla Compras:**
Ejecutado script `database/create_compras_table.sql` para crear la tabla de transacciones completadas.

## 🎯 **Resultado:**
- ✅ **Carrito funcional**: Los cursos se pueden agregar correctamente
- ✅ **Sesión consistente**: Acceso uniforme a `user.id` en toda la aplicación  
- ✅ **Base de datos preparada**: Tabla Compras lista para MercadoPago
- ✅ **Pagos listos**: Endpoints de pago funcionando correctamente

## 🧪 **Testing:**
1. **Iniciar sesión**: `http://localhost:3000/auth/login`
2. **Agregar al carrito**: Desde cualquier curso
3. **Ver carrito**: `http://localhost:3000/carrito`
4. **Proceder al pago**: Funcionalidad MercadoPago lista

## 📝 **Lección Aprendida:**
**Siempre mantener consistencia en las propiedades de sesión** entre el momento de creación (login) y uso (rutas protegidas). 

Una pequeña inconsistencia en el nombre de las propiedades puede causar errores de NULL que son difíciles de detectar sin logs detallados.

---
**Estado: ✅ RESUELTO** - Carrito y pagos funcionando correctamente.