# Plan de Implementación - Gestión de Usuarios

- [x] 1. Crear estructura base del módulo de usuarios



  - Crear archivo de rutas `/routes/usuarios-admin.js` siguiendo el patrón de `categorias-admin.js`
  - Configurar middleware de autenticación y autorización
  - Implementar ruta GET principal con paginación, filtros y estadísticas
  - _Requisitos: 1.1, 1.2, 1.4, 1.5, 7.1, 7.2, 7.3_

- [ ] 2. Implementar operaciones CRUD básicas
  - [ ] 2.1 Implementar creación de usuarios (POST /)
    - Validar datos de entrada (nombre, apellido, email, nombre_usuario)
    - Verificar unicidad de email y nombre_usuario
    - Generar contraseña temporal segura
    - Insertar usuario en base de datos
    - _Requisitos: 2.1, 2.2, 2.3, 2.4, 2.5_
  
  - [ ] 2.2 Implementar consulta de usuario específico (GET /:id)
    - Obtener datos completos del usuario con estadísticas relacionadas
    - Incluir conteo de cursos creados (si es instructor) o progreso (si es user)
    - Manejar casos de usuario no encontrado
    - _Requisitos: 4.1, 4.2_
  
  - [ ] 2.3 Implementar actualización de usuarios (PUT /:id)
    - Validar datos de entrada y verificar unicidad (excluyendo el mismo usuario)
    - Actualizar información del usuario en base de datos
    - Registrar cambios en log de auditoría
    - _Requisitos: 4.1, 4.2, 4.3, 4.4, 4.5_

- [ ] 3. Implementar gestión de roles y estatus
  - [ ] 3.1 Crear funcionalidad de cambio de roles
    - Implementar validación de cambio de rol entre 'user' e 'instructor'
    - Verificar permisos del administrador para cambios críticos
    - Registrar cambios de rol en auditoría
    - _Requisitos: 3.1, 3.2, 3.3, 3.4, 3.5_
  
  - [ ] 3.2 Implementar gestión de estatus de usuarios
    - Crear ruta para cambiar estatus entre 'activo', 'inactivo', 'baneado'
    - Mantener historial de cursos y progreso al cambiar estatus
    - Mostrar estatus claramente en la interfaz
    - _Requisitos: 5.1, 5.2, 5.5_

- [ ] 4. Crear vista principal usuarios-admin.hbs
  - [ ] 4.1 Implementar estructura base de la vista
    - Crear header section con título, breadcrumb y botones de acción
    - Implementar stats cards con estadísticas de usuarios
    - Crear controls section con búsqueda y filtros
    - Usar mismo diseño y estilos que `categorias-admin.hbs`
    - _Requisitos: 1.1, 1.2, 7.1, 7.2, 7.3_
  
  - [ ] 4.2 Implementar tabla de usuarios con paginación
    - Crear tabla responsiva con datos de usuarios (nombre, apellido, email, rol, estatus)
    - Implementar paginación siguiendo el patrón existente
    - Agregar filtros por rol y estatus
    - Incluir búsqueda por nombre, apellido, email
    - _Requisitos: 1.1, 1.2, 1.3, 1.4, 1.5_
  
  - [ ] 4.3 Crear modal de usuario para crear/editar
    - Implementar formulario con campos: nombre, apellido, nombre_usuario, email, rol, estatus
    - Agregar validaciones en tiempo real
    - Incluir mensaje informativo sobre contraseña temporal
    - Usar mismo estilo de modal que otros módulos
    - _Requisitos: 2.1, 2.2, 2.3, 4.1, 4.2_

- [ ] 5. Implementar funcionalidad JavaScript del cliente
  - [ ] 5.1 Crear funciones de gestión de modal
    - Implementar `showCreateModal()` para nuevo usuario
    - Crear `editUsuario(id)` para cargar datos en modal de edición
    - Configurar manejo de eventos del formulario
    - _Requisitos: 2.1, 4.1_
  
  - [ ] 5.2 Implementar operaciones CRUD via fetch API
    - Crear `handleFormSubmit()` para crear/actualizar usuarios
    - Implementar `deleteUsuario(id, nombre)` con confirmación
    - Agregar manejo de errores y mensajes de éxito
    - Incluir loading overlay durante operaciones
    - _Requisitos: 2.4, 2.5, 4.4, 4.5, 5.3, 5.4_

- [ ] 6. Implementar eliminación segura de usuarios
  - [ ] 6.1 Crear verificación de dependencias
    - Consultar cursos creados, progreso, compras y certificados relacionados
    - Mostrar advertencias sobre datos relacionados
    - Ofrecer opciones para manejar dependencias
    - _Requisitos: 5.3, 5.4_
  
  - [ ] 6.2 Implementar eliminación con manejo de dependencias
    - Permitir eliminación solo si no hay dependencias críticas
    - Ofrecer eliminación lógica vs física según el caso
    - Mantener historial de cursos y progreso cuando sea posible
    - _Requisitos: 5.1, 5.2, 5.3, 5.4_

- [ ] 7. Implementar funcionalidades avanzadas
  - [ ] 7.1 Crear sistema de generación de contraseñas temporales
    - Implementar función para generar contraseñas seguras
    - Crear hash de contraseña usando bcryptjs
    - Almacenar contraseña hasheada en base de datos
    - _Requisitos: 2.4_
  
  - [ ]* 7.2 Implementar envío de credenciales por email
    - Configurar servicio de email para envío de credenciales
    - Crear plantilla de email con credenciales temporales
    - Manejar errores de envío de email
    - _Requisitos: 2.4, 3.5_
  
  - [ ] 7.3 Crear funcionalidad de exportación de datos
    - Implementar ruta GET /exportar para generar CSV
    - Incluir filtros aplicados en la exportación
    - Agregar botón de exportar en la interfaz
    - _Requisitos: 7.5_

- [ ] 8. Implementar acciones masivas
  - [ ] 8.1 Crear selección múltiple en tabla
    - Agregar checkboxes para selección de usuarios
    - Implementar seleccionar/deseleccionar todos
    - Mostrar contador de usuarios seleccionados
    - _Requisitos: 8.1_
  
  - [ ] 8.2 Implementar operaciones masivas
    - Crear ruta POST /acciones-masivas para operaciones en lote
    - Implementar cambio masivo de estatus
    - Agregar confirmación antes de aplicar cambios masivos
    - Mostrar progreso y resultados de operaciones masivas
    - _Requisitos: 8.1, 8.2, 8.3, 8.4, 8.5_

- [ ] 9. Configurar rutas en la aplicación principal
  - Registrar rutas de usuarios-admin en app.js
  - Verificar que el middleware de autenticación esté configurado
  - Probar acceso desde el dashboard administrativo
  - _Requisitos: Todos los requisitos del sistema_

- [ ]* 10. Crear pruebas del módulo
  - [ ]* 10.1 Escribir pruebas unitarias
    - Probar validaciones de datos de entrada
    - Verificar generación de contraseñas temporales
    - Probar funciones de filtrado y búsqueda
    - _Requisitos: Validación de funcionalidad_
  
  - [ ]* 10.2 Escribir pruebas de integración
    - Probar operaciones CRUD completas
    - Verificar interacción con base de datos
    - Probar manejo de dependencias al eliminar
    - _Requisitos: Validación de integración_