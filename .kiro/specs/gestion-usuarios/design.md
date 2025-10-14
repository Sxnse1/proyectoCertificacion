# Documento de Diseño - Gestión de Usuarios

## Resumen

El sistema de gestión de usuarios para StartEducation seguirá exactamente los mismos patrones arquitectónicos y de diseño que los módulos existentes (videos-admin, categorias-admin). Utilizará Bootstrap 5.3, modales para formularios, y el mismo estilo visual con gradientes y cards.

## Arquitectura

### Patrón Existente
Siguiendo el patrón de `categorias-admin.js` y `videos-admin.js`:

- **Ruta Express**: `/routes/usuarios-admin.js`
- **Vista Handlebars**: `/views/usuarios-admin.hbs`
- **Estilo Bootstrap 5.3**: Consistente con módulos existentes
- **Modales**: Para crear/editar usuarios
- **Fetch API**: Para operaciones CRUD asíncronas

### Estructura de Rutas (Basada en categorias-admin.js)
```
/usuarios-admin/
├── GET    /                    # Lista paginada con filtros
├── POST   /                    # Crear usuario (JSON response)
├── GET    /:id                 # Obtener usuario específico (JSON)
├── PUT    /:id                 # Actualizar usuario (JSON)
├── DELETE /:id                 # Eliminar usuario (JSON)
├── POST   /:id/cambiar-estatus # Cambiar estatus (JSON)
└── GET    /exportar            # Exportar datos CSV
```

## Componentes y Interfaces

### 1. Controlador usuarios-admin.js (Basado en categorias-admin.js)
```javascript
// GET / - Lista con paginación, búsqueda y estadísticas
router.get('/', async function(req, res, next) {
  // Paginación: page, limit, search, rol_filter, estatus_filter
  // Estadísticas: total_usuarios, usuarios_activos, instructores, etc.
  // Render: usuarios-admin.hbs
});

// POST / - Crear usuario
router.post('/', async function(req, res, next) {
  // Validaciones, verificar email único
  // Generar contraseña temporal
  // Insertar en BD, enviar email
  // Response: JSON success/error
});

// GET /:id - Obtener usuario específico
router.get('/:id', async function(req, res, next) {
  // Consultar usuario con estadísticas relacionadas
  // Response: JSON con datos del usuario
});

// PUT /:id - Actualizar usuario
router.put('/:id', async function(req, res, next) {
  // Validaciones, verificar email único (excepto el mismo)
  // Actualizar en BD
  // Response: JSON success/error
});

// DELETE /:id - Eliminar usuario
router.delete('/:id', async function(req, res, next) {
  // Verificar dependencias (cursos, progreso, compras)
  // Eliminación lógica o física según dependencias
  // Response: JSON success/error
});
```

### 2. Vista usuarios-admin.hbs (Basada en categorias-admin.hbs)

#### Estructura Visual Idéntica:
- **Header Section**: Título con icono, breadcrumb, estadísticas en cards
- **Controls Section**: Búsqueda y filtros (rol, estatus)
- **Table Section**: Tabla responsiva con datos de usuarios
- **Modal**: Formulario crear/editar usuario
- **Paginación**: Navegación entre páginas

#### Elementos Específicos:
```handlebars
<!-- Stats Cards -->
<div class="stat-card">
  <span class="stat-number">{{stats.total_usuarios}}</span>
  <div class="stat-label">Total Usuarios</div>
</div>
<div class="stat-card">
  <span class="stat-number">{{stats.usuarios_activos}}</span>
  <div class="stat-label">Usuarios Activos</div>
</div>
<div class="stat-card">
  <span class="stat-number">{{stats.instructores}}</span>
  <div class="stat-label">Instructores</div>
</div>

<!-- Filtros -->
<select class="form-select" name="rol">
  <option value="">Todos los roles</option>
  <option value="user">Estudiantes</option>
  <option value="instructor">Instructores</option>
</select>

<select class="form-select" name="estatus">
  <option value="">Todos los estados</option>
  <option value="activo">Activos</option>
  <option value="inactivo">Inactivos</option>
  <option value="baneado">Baneados</option>
</select>

<!-- Tabla de Usuarios -->
<table class="table">
  <thead>
    <tr>
      <th>ID</th>
      <th>Usuario</th>
      <th>Email</th>
      <th>Rol</th>
      <th>Estatus</th>
      <th>Registro</th>
      <th>Acciones</th>
    </tr>
  </thead>
  <tbody>
    {{#each usuarios}}
    <tr>
      <td><span class="badge bg-secondary">#{{id_usuario}}</span></td>
      <td>
        <div class="usuario-name">{{nombre}} {{apellido}}</div>
        <small class="text-muted">@{{nombre_usuario}}</small>
      </td>
      <td>{{email}}</td>
      <td>
        <span class="badge {{#if (eq rol 'instructor')}}bg-primary{{else}}bg-secondary{{/if}}">
          {{#if (eq rol 'instructor')}}👨‍🏫 Instructor{{else}}👨‍🎓 Estudiante{{/if}}
        </span>
      </td>
      <td>
        <span class="badge status-{{estatus}}">{{estatus}}</span>
      </td>
      <td>{{fecha_registro_formateada}}</td>
      <td>
        <button class="btn btn-warning btn-sm" onclick="editUsuario({{id_usuario}})">
          <i class="bi bi-pencil"></i>
        </button>
        <button class="btn btn-danger btn-sm" onclick="deleteUsuario({{id_usuario}}, '{{nombre}} {{apellido}}')">
          <i class="bi bi-trash"></i>
        </button>
      </td>
    </tr>
    {{/each}}
  </tbody>
</table>
```

### 3. Modal de Usuario (Basado en categorias-admin.hbs)
```handlebars
<div class="modal fade" id="usuarioModal" tabindex="-1">
  <div class="modal-dialog modal-lg">
    <div class="modal-content">
      <div class="modal-header">
        <h5 class="modal-title" id="modalTitle">Nuevo Usuario</h5>
        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
      </div>
      <form id="usuarioForm">
        <div class="modal-body">
          <input type="hidden" id="usuarioId">
          
          <div class="row">
            <div class="col-md-6 mb-3">
              <label for="nombre" class="form-label">Nombre *</label>
              <input type="text" class="form-control" id="nombre" required maxlength="150">
            </div>
            <div class="col-md-6 mb-3">
              <label for="apellido" class="form-label">Apellido *</label>
              <input type="text" class="form-control" id="apellido" required maxlength="150">
            </div>
          </div>
          
          <div class="row">
            <div class="col-md-6 mb-3">
              <label for="nombre_usuario" class="form-label">Nombre de Usuario *</label>
              <input type="text" class="form-control" id="nombre_usuario" required maxlength="50">
            </div>
            <div class="col-md-6 mb-3">
              <label for="email" class="form-label">Email *</label>
              <input type="email" class="form-control" id="email" required maxlength="255">
            </div>
          </div>
          
          <div class="row">
            <div class="col-md-6 mb-3">
              <label for="rol" class="form-label">Rol *</label>
              <select class="form-select" id="rol" required>
                <option value="user">👨‍🎓 Estudiante</option>
                <option value="instructor">👨‍🏫 Instructor</option>
              </select>
            </div>
            <div class="col-md-6 mb-3">
              <label for="estatus" class="form-label">Estatus *</label>
              <select class="form-select" id="estatus" required>
                <option value="activo">✅ Activo</option>
                <option value="inactivo">⏸️ Inactivo</option>
                <option value="baneado">🚫 Baneado</option>
              </select>
            </div>
          </div>
          
          <div class="alert alert-info">
            <i class="bi bi-info-circle me-2"></i>
            Se generará una contraseña temporal y se enviará por email al usuario.
          </div>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancelar</button>
          <button type="submit" class="btn btn-primary">
            <i class="bi bi-check-circle me-2"></i>Guardar
          </button>
        </div>
      </form>
    </div>
  </div>
</div>
```

## Modelos de Datos

### Consulta Principal (Basada en categorias-admin.js)
```sql
SELECT 
  u.id_usuario,
  u.nombre,
  u.apellido,
  u.nombre_usuario,
  u.email,
  u.rol,
  u.estatus,
  u.fecha_registro,
  FORMAT(u.fecha_registro, 'dd/MM/yyyy HH:mm') as fecha_registro_formateada,
  -- Estadísticas relacionadas
  COUNT(CASE WHEN u.rol = 'instructor' THEN c.id_curso END) as cursos_creados,
  COUNT(CASE WHEN u.rol = 'user' THEN p.id_progreso END) as cursos_en_progreso,
  COUNT(comp.id_compra) as compras_realizadas
FROM Usuarios u
LEFT JOIN Cursos c ON u.id_usuario = c.id_usuario AND u.rol = 'instructor'
LEFT JOIN Progreso p ON u.id_usuario = p.id_usuario AND u.rol = 'user'
LEFT JOIN Compras comp ON u.id_usuario = comp.id_usuario
WHERE (@search IS NULL OR (
  u.nombre LIKE @search OR 
  u.apellido LIKE @search OR 
  u.email LIKE @search OR 
  u.nombre_usuario LIKE @search
))
AND (@rol IS NULL OR u.rol = @rol)
AND (@estatus IS NULL OR u.estatus = @estatus)
GROUP BY u.id_usuario, u.nombre, u.apellido, u.nombre_usuario, u.email, u.rol, u.estatus, u.fecha_registro
ORDER BY u.fecha_registro DESC
OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY
```

### Estadísticas (Basada en categorias-admin.js)
```sql
SELECT 
  (SELECT COUNT(*) FROM Usuarios) as total_usuarios,
  (SELECT COUNT(*) FROM Usuarios WHERE estatus = 'activo') as usuarios_activos,
  (SELECT COUNT(*) FROM Usuarios WHERE estatus = 'inactivo') as usuarios_inactivos,
  (SELECT COUNT(*) FROM Usuarios WHERE estatus = 'baneado') as usuarios_baneados,
  (SELECT COUNT(*) FROM Usuarios WHERE rol = 'instructor') as total_instructores,
  (SELECT COUNT(*) FROM Usuarios WHERE rol = 'user') as total_estudiantes,
  (SELECT COUNT(*) FROM Usuarios WHERE fecha_registro >= DATEADD(month, -1, GETDATE())) as nuevos_mes_actual
```

## Validaciones y Reglas de Negocio

### Validaciones del Controlador (Basadas en categorias-admin.js)
```javascript
// Validación crear/actualizar usuario
if (!nombre || nombre.trim().length === 0) {
  return res.status(400).json({
    success: false,
    message: 'El nombre es obligatorio'
  });
}

if (nombre.length > 150) {
  return res.status(400).json({
    success: false,
    message: 'El nombre no puede exceder 150 caracteres'
  });
}

// Verificar email único
const existingQuery = `
  SELECT id_usuario FROM Usuarios 
  WHERE LOWER(email) = LOWER(@email) 
  ${isUpdate ? 'AND id_usuario != @id' : ''}
`;

// Verificar nombre_usuario único
const existingUserQuery = `
  SELECT id_usuario FROM Usuarios 
  WHERE LOWER(nombre_usuario) = LOWER(@nombre_usuario) 
  ${isUpdate ? 'AND id_usuario != @id' : ''}
`;
```

### Generación de Contraseña Temporal
```javascript
function generarPasswordTemporal() {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
  let password = '';
  for (let i = 0; i < 8; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
}
```

### Manejo de Dependencias para Eliminación
```javascript
// Verificar dependencias antes de eliminar
const dependenciasQuery = `
  SELECT 
    COUNT(c.id_curso) as cursos_creados,
    COUNT(p.id_progreso) as progreso_cursos,
    COUNT(comp.id_compra) as compras_realizadas,
    COUNT(cert.id_certificado) as certificados_emitidos
  FROM Usuarios u
  LEFT JOIN Cursos c ON u.id_usuario = c.id_usuario
  LEFT JOIN Progreso p ON u.id_usuario = p.id_usuario
  LEFT JOIN Compras comp ON u.id_usuario = comp.id_usuario
  LEFT JOIN Certificados cert ON u.id_usuario = cert.id_usuario
  WHERE u.id_usuario = @id
  GROUP BY u.id_usuario
`;
```

## JavaScript del Cliente (Basado en categorias-admin.hbs)

### Funciones Principales
```javascript
// Variables globales
let usuarioModal;

// Inicializar cuando carga la página
document.addEventListener('DOMContentLoaded', function() {
    usuarioModal = new bootstrap.Modal(document.getElementById('usuarioModal'));
    document.getElementById('usuarioForm').addEventListener('submit', handleFormSubmit);
});

// Mostrar modal para crear usuario
function showCreateModal() {
    document.getElementById('modalTitle').textContent = 'Nuevo Usuario';
    document.getElementById('usuarioForm').reset();
    document.getElementById('usuarioId').value = '';
    usuarioModal.show();
}

// Editar usuario
async function editUsuario(id) {
    try {
        showLoading(true);
        const response = await fetch(`/usuarios-admin/${id}`);
        const data = await response.json();
        
        if (data.success) {
            document.getElementById('modalTitle').textContent = 'Editar Usuario';
            document.getElementById('usuarioId').value = data.usuario.id_usuario;
            document.getElementById('nombre').value = data.usuario.nombre;
            document.getElementById('apellido').value = data.usuario.apellido;
            document.getElementById('nombre_usuario').value = data.usuario.nombre_usuario;
            document.getElementById('email').value = data.usuario.email;
            document.getElementById('rol').value = data.usuario.rol;
            document.getElementById('estatus').value = data.usuario.estatus;
            
            usuarioModal.show();
        } else {
            alert('❌ Error: ' + data.message);
        }
    } catch (error) {
        console.error('Error:', error);
        alert('❌ Error cargando los datos del usuario');
    } finally {
        showLoading(false);
    }
}

// Eliminar usuario
async function deleteUsuario(id, nombre) {
    if (!confirm(`⚠️ ¿Estás seguro de que quieres eliminar al usuario "${nombre}"?\n\nEsta acción no se puede deshacer.`)) {
        return;
    }
    
    try {
        showLoading(true);
        const response = await fetch(`/usuarios-admin/${id}`, {
            method: 'DELETE'
        });
        
        const data = await response.json();
        
        if (data.success) {
            alert('✅ ' + data.message);
            window.location.reload();
        } else {
            alert('❌ Error: ' + data.message);
        }
    } catch (error) {
        console.error('Error:', error);
        alert('❌ Error eliminando el usuario');
    } finally {
        showLoading(false);
    }
}

// Manejar envío del formulario
async function handleFormSubmit(e) {
    e.preventDefault();
    
    const id = document.getElementById('usuarioId').value;
    const formData = {
        nombre: document.getElementById('nombre').value.trim(),
        apellido: document.getElementById('apellido').value.trim(),
        nombre_usuario: document.getElementById('nombre_usuario').value.trim(),
        email: document.getElementById('email').value.trim(),
        rol: document.getElementById('rol').value,
        estatus: document.getElementById('estatus').value
    };
    
    // Validaciones básicas
    if (!formData.nombre || !formData.apellido || !formData.email) {
        alert('❌ Todos los campos marcados con * son obligatorios');
        return;
    }
    
    try {
        showLoading(true);
        
        const url = id ? `/usuarios-admin/${id}` : '/usuarios-admin';
        const method = id ? 'PUT' : 'POST';
        
        const response = await fetch(url, {
            method: method,
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(formData)
        });
        
        const data = await response.json();
        
        if (data.success) {
            alert('✅ ' + data.message);
            usuarioModal.hide();
            window.location.reload();
        } else {
            alert('❌ Error: ' + data.message);
        }
    } catch (error) {
        console.error('Error:', error);
        alert('❌ Error guardando el usuario');
    } finally {
        showLoading(false);
    }
}

// Mostrar/ocultar loading
function showLoading(show) {
    const overlay = document.getElementById('loadingOverlay');
    overlay.style.display = show ? 'flex' : 'none';
}
```

## Estilos CSS (Basados en categorias-admin.hbs)

### Variables y Clases Específicas
```css
:root {
    --primary-color: #ea580c;
    --primary-hover: #c2410c;
    --success-color: #10b981;
    --warning-color: #f59e0b;
    --danger-color: #ef4444;
    --text-dark: #1f2937;
    --text-muted: #6b7280;
    --border-color: #e5e7eb;
    --bg-light: #f8fafc;
}

.usuario-name {
    font-weight: 600;
    color: var(--text-dark);
}

.status-activo {
    background: rgba(16, 185, 129, 0.1);
    color: var(--success-color);
    border: 1px solid rgba(16, 185, 129, 0.2);
}

.status-inactivo {
    background: rgba(245, 158, 11, 0.1);
    color: var(--warning-color);
    border: 1px solid rgba(245, 158, 11, 0.2);
}

.status-baneado {
    background: rgba(239, 68, 68, 0.1);
    color: var(--danger-color);
    border: 1px solid rgba(239, 68, 68, 0.2);
}
```

## Consideraciones de Seguridad

### Middleware de Autenticación (Basado en videos-admin.js)
```javascript
const requireAuth = require('../middleware/auth').requireAuth;
const requireRole = require('../middleware/auth').requireRole;

// Middleware de autenticación para todas las rutas
router.use(requireAuth);
router.use(requireRole(['instructor', 'admin'])); // Solo instructores y admins
```

### Validación y Sanitización
- Usar `bcryptjs` para hash de contraseñas temporales
- Sanitizar entrada de datos con `validator.js`
- Protección CSRF con tokens
- Rate limiting para prevenir ataques de fuerza bruta

## Optimización y Rendimiento

### Índices de Base de Datos Recomendados
```sql
-- Índices para búsqueda eficiente
CREATE INDEX IX_Usuarios_Email ON Usuarios(email);
CREATE INDEX IX_Usuarios_NombreUsuario ON Usuarios(nombre_usuario);
CREATE INDEX IX_Usuarios_Rol_Estatus ON Usuarios(rol, estatus);
CREATE INDEX IX_Usuarios_FechaRegistro ON Usuarios(fecha_registro DESC);
```

### Paginación Eficiente
- Usar `OFFSET/FETCH NEXT` para SQL Server
- Límite máximo de 100 registros por página
- Caché de conteos totales para mejorar rendimiento