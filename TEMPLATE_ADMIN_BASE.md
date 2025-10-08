# 📐 Template Base para Módulos Admin - StartEducation

## 🎨 Estructura HTML Estandarizada

Todos los módulos admin deben seguir esta estructura:

```handlebars
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{{title}} - StartEducation</title>
    
    <!-- Favicon -->
    <link rel="icon" type="image/svg+xml" href="/images/favicon.svg">
    
    <!-- Bootstrap 5.3 CSS -->
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/css/bootstrap.min.css" rel="stylesheet">
    <!-- Bootstrap Icons -->
    <link href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.1/font/bootstrap-icons.css" rel="stylesheet">
    <!-- Google Fonts -->
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
    <!-- Admin Base CSS -->
    <link rel="stylesheet" href="/stylesheets/admin-base.css">
</head>
<body>
    <div class="main-container">
        <!-- Header Section -->
        <div class="header-section">
            <div class="header-title">
                <h1>
                    <i class="bi bi-[ICONO]"></i>
                    {{title}}
                </h1>
                <div>
                    <a href="/dashboard" class="btn btn-outline-secondary">
                        <i class="bi bi-arrow-left"></i>
                        Volver al Dashboard
                    </a>
                </div>
            </div>
            
            <!-- Stats Row (opcional) -->
            {{#if stats}}
            <div class="stats-row">
                <div class="stat-card">
                    <i class="bi bi-[ICONO] stat-icon"></i>
                    <span class="stat-number">{{stat1}}</span>
                    <div class="stat-label">Etiqueta 1</div>
                </div>
                <!-- Más stat-cards según necesidad -->
            </div>
            {{/if}}
        </div>

        <!-- Controls Section -->
        <div class="controls-section">
            <div class="controls-row">
                <!-- Search Group -->
                <div class="search-group">
                    <input type="text" 
                           class="form-control search-input" 
                           placeholder="Buscar..."
                           id="searchInput">
                    <button class="btn btn-primary" id="searchBtn">
                        <i class="bi bi-search"></i>
                        Buscar
                    </button>
                </div>
                
                <!-- Filters (opcional) -->
                <div class="filters-group">
                    <select class="form-select filter-select" id="filterSelect">
                        <option value="">Todos</option>
                        <!-- Opciones -->
                    </select>
                </div>
                
                <!-- Actions -->
                <div>
                    <button class="btn btn-success" data-bs-toggle="modal" data-bs-target="#createModal">
                        <i class="bi bi-plus-circle"></i>
                        Crear Nuevo
                    </button>
                </div>
            </div>
        </div>

        <!-- Table Section -->
        <div class="table-section">
            <div class="table-header">
                <h3>
                    <i class="bi bi-list-ul"></i>
                    Lista de Registros
                </h3>
            </div>
            
            <div class="table-responsive">
                <table class="table">
                    <thead>
                        <tr>
                            <th>ID</th>
                            <th>Nombre</th>
                            <th>Descripción</th>
                            <th>Estado</th>
                            <th>Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        {{#if items}}
                            {{#each items}}
                            <tr>
                                <td>{{this.id}}</td>
                                <td class="item-name">{{this.nombre}}</td>
                                <td class="item-description">{{this.descripcion}}</td>
                                <td>
                                    <span class="badge badge-success">Activo</span>
                                </td>
                                <td>
                                    <div class="actions-group">
                                        <button class="btn btn-sm btn-warning" onclick="editItem({{this.id}})">
                                            <i class="bi bi-pencil"></i>
                                            Editar
                                        </button>
                                        <button class="btn btn-sm btn-danger" onclick="deleteItem({{this.id}})">
                                            <i class="bi bi-trash"></i>
                                            Eliminar
                                        </button>
                                    </div>
                                </td>
                            </tr>
                            {{/each}}
                        {{else}}
                            <tr>
                                <td colspan="5">
                                    <div class="empty-state">
                                        <i class="bi bi-inbox"></i>
                                        <h3>No hay registros</h3>
                                        <p>No se encontraron elementos. Crea uno nuevo para comenzar.</p>
                                        <button class="btn btn-primary" data-bs-toggle="modal" data-bs-target="#createModal">
                                            <i class="bi bi-plus-circle"></i>
                                            Crear Primero
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        {{/if}}
                    </tbody>
                </table>
            </div>
        </div>

        <!-- Pagination Section -->
        {{#if pagination}}
        <div class="pagination-section">
            <div class="pagination-info">
                Mostrando {{pagination.from}} a {{pagination.to}} de {{pagination.total}} registros
            </div>
            <nav>
                <ul class="pagination">
                    <li class="page-item {{#unless pagination.hasPrev}}disabled{{/unless}}">
                        <a class="page-link" href="?page={{pagination.prevPage}}">
                            <i class="bi bi-chevron-left"></i>
                        </a>
                    </li>
                    {{#each pagination.pages}}
                    <li class="page-item {{#if this.active}}active{{/if}}">
                        <a class="page-link" href="?page={{this.number}}">{{this.number}}</a>
                    </li>
                    {{/each}}
                    <li class="page-item {{#unless pagination.hasNext}}disabled{{/unless}}">
                        <a class="page-link" href="?page={{pagination.nextPage}}">
                            <i class="bi bi-chevron-right"></i>
                        </a>
                    </li>
                </ul>
            </nav>
        </div>
        {{/if}}
    </div>

    <!-- Modal Create/Edit -->
    <div class="modal fade" id="createModal" tabindex="-1">
        <div class="modal-dialog">
            <div class="modal-content">
                <div class="modal-header">
                    <h5 class="modal-title">
                        <i class="bi bi-plus-circle"></i>
                        Crear Nuevo Registro
                    </h5>
                    <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                </div>
                <div class="modal-body">
                    <form id="createForm">
                        <div class="mb-3">
                            <label class="form-label">Nombre</label>
                            <input type="text" class="form-control" name="nombre" required>
                        </div>
                        <div class="mb-3">
                            <label class="form-label">Descripción</label>
                            <textarea class="form-control" name="descripcion"></textarea>
                        </div>
                    </form>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-outline-secondary" data-bs-dismiss="modal">
                        Cancelar
                    </button>
                    <button type="button" class="btn btn-primary" onclick="saveItem()">
                        <i class="bi bi-check-circle"></i>
                        Guardar
                    </button>
                </div>
            </div>
        </div>
    </div>

    <!-- Bootstrap JS -->
    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/js/bootstrap.bundle.min.js"></script>
    
    <!-- Custom Scripts -->
    <script>
        // Funciones personalizadas aquí
        async function saveItem() {
            // Implementación
        }
        
        async function editItem(id) {
            // Implementación
        }
        
        async function deleteItem(id) {
            // Implementación
        }
    </script>
</body>
</html>
```

## 🎨 Paleta de Colores

### Colores Principales:
- **Primary**: `#ea580c` (Naranja StartEducation)
- **Primary Hover**: `#c2410c`
- **Primary Light**: `rgba(234, 88, 12, 0.1)`

### Colores de Estado:
- **Success**: `#10b981` (Verde)
- **Warning**: `#f59e0b` (Amarillo)
- **Danger**: `#ef4444` (Rojo)
- **Info**: `#3b82f6` (Azul)

### Colores de Texto:
- **Dark**: `#1f2937`
- **Muted**: `#6b7280`
- **Light**: `#9ca3af`

### Colores de Fondo:
- **Light**: `#f8fafc`
- **Gray**: `#e2e8f0`
- **Border**: `#e5e7eb`

## 📋 Componentes Comunes

### 1. Header Section
```html
<div class="header-section">
    <div class="header-title">
        <h1><i class="bi bi-icon"></i> Título</h1>
        <div><!-- Botones --></div>
    </div>
</div>
```

### 2. Stat Cards
```html
<div class="stats-row">
    <div class="stat-card">
        <i class="bi bi-icon stat-icon"></i>
        <span class="stat-number">100</span>
        <div class="stat-label">Descripción</div>
    </div>
</div>
```

### 3. Controls Section
```html
<div class="controls-section">
    <div class="controls-row">
        <div class="search-group"><!-- Búsqueda --></div>
        <div class="filters-group"><!-- Filtros --></div>
        <div><!-- Acciones --></div>
    </div>
</div>
```

### 4. Table Section
```html
<div class="table-section">
    <div class="table-header"><h3>Título</h3></div>
    <div class="table-responsive">
        <table class="table"><!-- Contenido --></table>
    </div>
</div>
```

### 5. Badges
```html
<span class="badge badge-success">Activo</span>
<span class="badge badge-warning">Pendiente</span>
<span class="badge badge-danger">Inactivo</span>
<span class="badge badge-info">Info</span>
```

### 6. Buttons
```html
<button class="btn btn-primary">Primario</button>
<button class="btn btn-success">Éxito</button>
<button class="btn btn-warning">Advertencia</button>
<button class="btn btn-danger">Peligro</button>
<button class="btn btn-info">Info</button>
<button class="btn btn-outline-secondary">Secundario</button>
```

## 🔤 Iconos Bootstrap Icons

### Iconos Comunes por Módulo:
- **Categorías**: `bi-tags`
- **Cursos**: `bi-book`
- **Módulos**: `bi-collection`
- **Videos**: `bi-play-circle`
- **Etiquetas**: `bi-bookmark`
- **Usuarios**: `bi-people`
- **Membresías**: `bi-award`
- **Suscripciones**: `bi-calendar-check`
- **Compras**: `bi-cart-check`
- **Pagos**: `bi-credit-card`
- **Certificados**: `bi-file-earmark-check`
- **Valoraciones**: `bi-star`
- **Favoritos**: `bi-heart`
- **Carrito**: `bi-cart`

### Iconos de Acción:
- **Crear**: `bi-plus-circle`
- **Editar**: `bi-pencil`
- **Eliminar**: `bi-trash`
- **Ver**: `bi-eye`
- **Buscar**: `bi-search`
- **Filtrar**: `bi-funnel`
- **Descargar**: `bi-download`
- **Subir**: `bi-upload`
- **Guardar**: `bi-check-circle`
- **Cancelar**: `bi-x-circle`
- **Volver**: `bi-arrow-left`

## 📱 Responsive

El diseño es completamente responsive:
- **Desktop**: 3-4 columnas en stats
- **Tablet**: 2 columnas
- **Mobile**: 1 columna, layout vertical

## ✅ Checklist de Implementación

Para cada módulo admin, verificar:
- [ ] Usa `admin-base.css`
- [ ] Tiene header-section con título e icono
- [ ] Incluye stats-row (si aplica)
- [ ] Tiene controls-section con búsqueda
- [ ] Usa table-section para listados
- [ ] Implementa paginación
- [ ] Usa badges para estados
- [ ] Botones con iconos de Bootstrap Icons
- [ ] Modal para crear/editar
- [ ] Empty state cuando no hay datos
- [ ] Responsive en móviles

---

**Última Actualización**: 7 de octubre de 2025
**Versión**: 1.0.0
