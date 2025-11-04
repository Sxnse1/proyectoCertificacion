# Dashboard Centralizado de Cursos - Guía de Uso

## Descripción

Hemos implementado un dashboard centralizado para la administración de cursos que permite gestionar toda la información de un curso desde una sola vista. Este sistema mejora significativamente la experiencia del administrador al permitir editar, agregar y gestionar contenido sin navegar entre múltiples páginas.

## Características Implementadas

### 🎯 Vista Dashboard Principal
- **Ruta**: `/admin/cursos/:id/dashboard`
- **Diseño**: Interfaz moderna y responsiva con Bootstrap 5.3
- **Navegación**: Acceso directo desde la lista de cursos mediante botón "Dashboard"

### 📊 Secciones del Dashboard

#### 1. **Cabecera del Curso**
- Título, descripción e información básica
- Estado del curso (Publicado/Borrador/Inactivo)
- Metadatos: instructor, categoría, precio, nivel
- Botón directo para editar el curso

#### 2. **Tarjetas de Estadísticas**
- **Módulos**: Cantidad total de módulos
- **Videos**: Cantidad total de videos
- **Estudiantes**: Número de estudiantes inscritos
- **Valoración**: Promedio de valoraciones

#### 3. **Gestión de Módulos y Videos**
- Lista expandible de módulos con sus videos
- Drag & drop para reordenar módulos
- Acciones directas: editar, eliminar, agregar contenido
- Estados visuales de videos (publicado/borrador/archivado)

#### 4. **Panel de Información**
- Detalles del curso (fecha, duración, progreso)
- Gestión de categorías y etiquetas
- Indicadores de completitud

### ⚡ Funcionalidades Inline

#### Edición de Curso
- Modal con formulario completo
- Actualización sin recargar página
- Validación en tiempo real

#### Gestión de Módulos
- **Crear**: Modal embebido para nuevos módulos
- **Editar**: Formulario inline con datos precargados
- **Eliminar**: Con validación de dependencias
- **Reordenar**: Drag & drop con actualización automática

#### Gestión de Videos
- **Agregar**: Modal contextual por módulo
- **Editar**: Formulario completo con todos los campos
- **Eliminar**: Con confirmación y limpieza de referencias
- **Estados**: Cambio rápido de estado

#### Gestión de Etiquetas
- Modal dedicado para categorías y etiquetas
- Agregar etiquetas con Enter rápido
- Eliminación individual de etiquetas

### 🔧 Funcionalidades Técnicas

#### AJAX y Sin Recargas
```javascript
// Todas las operaciones CRUD utilizan fetch API
// Actualizaciones visuales inmediatas
// Manejo de errores con alertas contextuales
```

#### Drag & Drop
```javascript
// Implementado con SortableJS
// Actualización automática de orden en BD
// Feedback visual durante el arrastre
```

#### Validaciones
- Formularios con validación HTML5
- Validaciones personalizadas en JavaScript
- Verificación de dependencias antes de eliminar

### 🎨 Diseño y UX

#### Consistencia Visual
- Colores y tipografía coherentes con el sistema existente
- Iconos de Bootstrap Icons
- Gradientes y efectos sutiles

#### Responsive Design
- Adaptable a dispositivos móviles
- Grid flexible que se ajusta a pantallas pequeñas
- Navegación optimizada para touch

#### Feedback Visual
- Alertas de confirmación para acciones importantes
- Estados de carga y procesamiento
- Animaciones suaves para transiciones

## Cómo Usar el Sistema

### 1. **Acceder al Dashboard**
```
1. Ve a /admin/cursos
2. Localiza el curso que deseas gestionar
3. Haz clic en "Dashboard" en la columna de acciones
```

### 2. **Editar Información del Curso**
```
1. En el dashboard, haz clic en "Editar Curso" (esquina superior derecha)
2. Modifica los datos necesarios en el modal
3. Haz clic en "Actualizar Curso"
4. Los cambios se reflejan inmediatamente
```

### 3. **Gestionar Módulos**
```
Crear:
1. Haz clic en "Módulo" en la sección de Módulos y Videos
2. Completa el formulario
3. El nuevo módulo aparece inmediatamente

Reordenar:
1. Arrastra los módulos usando el ícono de grip (⋮⋮)
2. Suelta en la nueva posición
3. El orden se guarda automáticamente

Editar:
1. Haz clic en el ícono de lápiz del módulo
2. Modifica los datos en el modal
3. Confirma los cambios
```

### 4. **Gestionar Videos**
```
Agregar:
1. Haz clic en el ícono "+" del módulo correspondiente
2. Completa la información del video
3. El video se agrega al módulo inmediatamente

Editar:
1. Haz clic en el ícono de lápiz del video
2. Modifica los datos necesarios
3. Los cambios se aplican sin recargar
```

### 5. **Gestionar Etiquetas**
```
1. Haz clic en "Gestionar" en la sección de Categorías y Etiquetas
2. Cambia la categoría principal si es necesario
3. Agrega nuevas etiquetas escribiendo y presionando Enter
4. Elimina etiquetas haciendo clic en la X
5. Guarda todos los cambios
```

## Flujo de Trabajo Recomendado

### Para Crear un Curso Completo:
```
1. Crear curso básico desde /admin/cursos
2. Acceder al dashboard del nuevo curso
3. Editar información detallada del curso
4. Crear módulos en orden lógico
5. Agregar videos a cada módulo
6. Asignar etiquetas relevantes
7. Cambiar estado a "Publicado" cuando esté listo
```

### Para Gestión Diaria:
```
1. Usar el dashboard como punto central de gestión
2. Aprovechar la funcionalidad drag & drop para reorganizar
3. Utilizar los estados de video para control de flujo de trabajo
4. Monitorear las estadísticas desde las tarjetas superiores
```

## Archivos Implementados

### Nuevos Archivos:
- `views/admin/curso-dashboard.hbs` - Vista principal del dashboard

### Archivos Modificados:
- `routes/admin/cursos-admin.js` - Nueva ruta `/dashboard`
- `routes/admin/videos-admin.js` - Ruta GET para videos individuales
- `views/admin/cursos-admin.hbs` - Botón de acceso al dashboard

## Beneficios del Sistema

### Para Administradores:
- **Eficiencia**: Todo en una sola vista
- **Velocidad**: Sin recargas de página
- **Intuitividad**: Drag & drop y modales contextuales
- **Control**: Estados visuales claros

### Para el Flujo de Trabajo:
- **Centralizización**: Punto único de gestión
- **Consistencia**: Interfaz coherente
- **Escalabilidad**: Fácil agregar nuevas funcionalidades
- **Mantenibilidad**: Código modular y bien estructurado

Este sistema transforma la gestión de cursos de un proceso fragmentado en múltiples páginas a una experiencia fluida y centralizada que respeta los patrones de diseño existentes y mejora significativamente la productividad del administrador.