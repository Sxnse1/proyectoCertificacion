var express = require('express');
var router = express.Router();
const bcrypt = require('bcryptjs');
const emailService = require('../../services/emailService');
const auditService = require('../../services/auditService');
const { hasPermission } = require('../../middleware/auth');

/* GET - Lista de usuarios con filtros y paginación */
router.get('/', hasPermission('gestionar_usuarios'), async function(req, res, next) {
  try {
    const db = req.app.locals.db;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const search = req.query.search || '';
    const rolFilter = req.query.rolId || req.query.rol || '';
    const estatusFilter = req.query.estatus || '';
    const offset = (page - 1) * limit;

    console.log(`[USUARIOS] Consultando usuarios - Página: ${page}, Búsqueda: "${search}", Rol: "${rolFilter}", Estatus: "${estatusFilter}"`);

    // Construir cláusula WHERE
    let whereConditions = [];
    let params = {};
    
    if (search) {
      whereConditions.push('(u.nombre LIKE @search OR u.apellido LIKE @search OR u.email LIKE @search OR u.nombre_usuario LIKE @search)');
      params.search = `%${search}%`;
    }
    
    if (rolFilter) {
      // Si es un número, filtrar por RolID, si no por el campo rol legacy
      if (!isNaN(rolFilter)) {
        whereConditions.push('u.RolID = @rolId');
        params.rolId = parseInt(rolFilter);
      } else {
        whereConditions.push('u.rol = @rol');
        params.rol = rolFilter;
      }
    }
    
    if (estatusFilter) {
      whereConditions.push('u.estatus = @estatus');
      params.estatus = estatusFilter;
    }

    const whereClause = whereConditions.length > 0 ? 'WHERE ' + whereConditions.join(' AND ') : '';

    // Consulta principal con información relacionada usando RBAC
    const query = `
      SELECT 
        u.id_usuario,
        u.nombre,
        u.apellido,
        u.nombre_usuario,
        u.email,
        u.rol,
        u.RolID,
        r.NombreRol as rolNombre,
        r.Descripcion as rolDescripcion,
        u.estatus,
        u.fecha_registro,
        FORMAT(u.fecha_registro, 'dd/MM/yyyy HH:mm') as fecha_registro_formateada,
        COUNT(CASE WHEN r.NombreRol = 'Instructor' THEN c.id_curso END) as cursos_creados,
        COUNT(CASE WHEN r.NombreRol NOT IN ('Instructor', 'SuperAdmin', 'Admin') THEN p.id_progreso END) as cursos_en_progreso,
        COUNT(comp.id_compra) as compras_realizadas
      FROM Usuarios u
      LEFT JOIN Roles r ON u.RolID = r.RolID
      LEFT JOIN Cursos c ON u.id_usuario = c.id_usuario AND r.NombreRol = 'Instructor'
      LEFT JOIN Progreso p ON u.id_usuario = p.id_usuario AND r.NombreRol NOT IN ('Instructor', 'SuperAdmin', 'Admin')
      LEFT JOIN Compras comp ON u.id_usuario = comp.id_usuario
      ${whereClause}
      GROUP BY u.id_usuario, u.nombre, u.apellido, u.nombre_usuario, u.email, u.rol, u.RolID, r.NombreRol, r.Descripcion, u.estatus, u.fecha_registro
      ORDER BY 
        CASE WHEN r.NombreRol IN ('SuperAdmin', 'Admin') THEN 1 
             WHEN r.NombreRol = 'Instructor' THEN 2 
             ELSE 3 END,
        u.fecha_registro DESC
      OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY
    `;

    params.offset = offset;
    params.limit = limit;

    const result = await db.executeQuery(query, params);

    // Consulta para contar total de registros
    const countQuery = `
      SELECT COUNT(*) as total
      FROM Usuarios u
      ${whereClause}
    `;

    const countParams = { ...params };
    delete countParams.offset;
    delete countParams.limit;
    
    const countResult = await db.executeQuery(countQuery, countParams);
    const totalRecords = countResult.recordset[0].total;
    const totalPages = Math.ceil(totalRecords / limit);

    // Estadísticas generales
    const statsQuery = `
      SELECT 
        (SELECT COUNT(*) FROM Usuarios) as total_usuarios,
        (SELECT COUNT(*) FROM Usuarios WHERE estatus = 'activo') as usuarios_activos,
        (SELECT COUNT(*) FROM Usuarios WHERE estatus = 'inactivo') as usuarios_inactivos,
        (SELECT COUNT(*) FROM Usuarios WHERE estatus = 'baneado') as usuarios_baneados,
        (SELECT COUNT(*) FROM Usuarios u INNER JOIN Roles r ON u.RolID = r.RolID WHERE r.NombreRol = 'Instructor') as total_instructores,
        (SELECT COUNT(*) FROM Usuarios u INNER JOIN Roles r ON u.RolID = r.RolID WHERE r.NombreRol IN ('user', 'User')) as total_estudiantes,
        (SELECT COUNT(*) FROM Usuarios WHERE fecha_registro >= DATEADD(month, -1, GETDATE())) as nuevos_mes_actual
    `;

    const statsResult = await db.executeQuery(statsQuery);
    const stats = statsResult.recordset[0];

    // Obtener roles disponibles para los selectores
    const rolesQuery = `
      SELECT RolID, NombreRol, Descripcion
      FROM Roles 
      WHERE Activo = 1
      ORDER BY 
        CASE 
          WHEN NombreRol = 'SuperAdmin' THEN 1
          WHEN NombreRol = 'Admin' THEN 2
          WHEN NombreRol = 'Instructor' THEN 3
          ELSE 4
        END,
        NombreRol
    `;
    const rolesResult = await db.executeQuery(rolesQuery);
    const rolesDisponibles = rolesResult.recordset;

    console.log(`[USUARIOS] ✅ Consulta exitosa - ${result.recordset.length} usuarios encontrados`);

    res.render('admin/usuarios-admin', {
      title: 'Gestión de Usuarios',
      usuarios: result.recordset,
      rolesDisponibles: rolesDisponibles,
      currentPage: page,
      totalPages: totalPages,
      totalRecords: totalRecords,
      search: search,
      rolFilter: rolFilter,
      estatusFilter: estatusFilter,
      limit: limit,
      stats: stats,
      userName: req.session.user.nombre,
      userRole: req.session.user.rol,
      layout: false
    });

  } catch (error) {
    console.error('[USUARIOS] ❌ Error consultando usuarios:', error);
    res.status(500).render('shared/error', {
      message: 'Error al cargar los usuarios',
      error: req.app.get('env') === 'development' ? error : {}
    });
  }
});

/* POST - Crear nuevo usuario */
router.post('/', hasPermission('crear_usuarios'), async function(req, res, next) {
  try {
    const db = req.app.locals.db;
    const { nombre, apellido, nombre_usuario, email, rolId, rolNombre, estatus } = req.body;

    // Validaciones
    if (!nombre || nombre.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'El nombre es obligatorio'
      });
    }

    if (!apellido || apellido.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'El apellido es obligatorio'
      });
    }

    if (!nombre_usuario || nombre_usuario.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'El nombre de usuario es obligatorio'
      });
    }

    if (!email || email.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'El email es obligatorio'
      });
    }

    if (nombre.length > 150) {
      return res.status(400).json({
        success: false,
        message: 'El nombre no puede exceder 150 caracteres'
      });
    }

    if (apellido.length > 150) {
      return res.status(400).json({
        success: false,
        message: 'El apellido no puede exceder 150 caracteres'
      });
    }

    if (nombre_usuario.length > 50) {
      return res.status(400).json({
        success: false,
        message: 'El nombre de usuario no puede exceder 50 caracteres'
      });
    }

    if (email.length > 255) {
      return res.status(400).json({
        success: false,
        message: 'El email no puede exceder 255 caracteres'
      });
    }

    // Validar formato de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: 'El formato del email no es válido'
      });
    }

    // Validar rolId
    if (!rolId || isNaN(parseInt(rolId))) {
      return res.status(400).json({
        success: false,
        message: 'Debe seleccionar un rol válido'
      });
    }

    // Verificar que el rol existe y está activo
    const rolExistsQuery = 'SELECT RolID, NombreRol FROM Roles WHERE RolID = @rolId AND Activo = 1';
    const rolExistsResult = await db.executeQuery(rolExistsQuery, { rolId: parseInt(rolId) });
    
    if (rolExistsResult.recordset.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'El rol seleccionado no es válido'
      });
    }

    const rolSeleccionado = rolExistsResult.recordset[0];

    // Validar estatus
    if (!['activo', 'inactivo', 'baneado'].includes(estatus)) {
      return res.status(400).json({
        success: false,
        message: 'El estatus debe ser "activo", "inactivo" o "baneado"'
      });
    }

    console.log(`[USUARIOS] Creando nuevo usuario: "${nombre} ${apellido}" (${email})`);

    // Verificar que no exista un usuario con el mismo email
    const existingEmailQuery = 'SELECT id_usuario FROM Usuarios WHERE LOWER(email) = LOWER(@email)';
    const existingEmailResult = await db.executeQuery(existingEmailQuery, { email: email.trim() });

    if (existingEmailResult.recordset.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Ya existe un usuario con ese email'
      });
    }

    // Verificar que no exista un usuario con el mismo nombre_usuario
    const existingUserQuery = 'SELECT id_usuario FROM Usuarios WHERE LOWER(nombre_usuario) = LOWER(@nombre_usuario)';
    const existingUserResult = await db.executeQuery(existingUserQuery, { nombre_usuario: nombre_usuario.trim() });

    if (existingUserResult.recordset.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Ya existe un usuario con ese nombre de usuario'
      });
    }

    // Generar contraseña temporal
    const passwordTemporal = generarPasswordTemporal();
    const hashedPassword = await bcrypt.hash(passwordTemporal, 10);

    // 🔒 TRANSACCIÓN SQL - Asegurar integridad de datos
    let newUsuario;
    
    try {
      // Ejecutar creación de usuario y auditoría en transacción atómica
      newUsuario = await db.executeTransaction(async (txn) => {
        
        // 1. Crear el usuario con contraseña temporal y RBAC
        const insertQuery = `
          INSERT INTO Usuarios (nombre, apellido, nombre_usuario, email, password, rol, RolID, estatus, fecha_registro, tiene_password_temporal, fecha_password_temporal)
          OUTPUT INSERTED.id_usuario, INSERTED.nombre, INSERTED.apellido, INSERTED.nombre_usuario, INSERTED.email, INSERTED.rol, INSERTED.RolID, INSERTED.estatus, INSERTED.fecha_registro
          VALUES (@nombre, @apellido, @nombre_usuario, @email, @password, @rolNombre, @rolId, @estatus, GETDATE(), 1, GETDATE())
        `;
        
        const result = await txn.executeQuery(insertQuery, {
          nombre: nombre.trim(),
          apellido: apellido.trim(),
          nombre_usuario: nombre_usuario.trim(),
          email: email.trim(),
          password: hashedPassword,
          rolNombre: rolSeleccionado.NombreRol,
          rolId: parseInt(rolId),
          estatus: estatus
        });
        
        const usuario = result.recordset[0];
        console.log(`[USUARIOS] ✅ Usuario creado exitosamente - ID: ${usuario.id_usuario}`);
        
        // 2. Registrar auditoría en la misma transacción
        const auditQuery = `
          INSERT INTO AuditLogs (UsuarioID, Accion, Entidad, EntidadID, Detalles, IP)
          VALUES (@usuarioId, @accion, @entidad, @entidadId, @detalles, @ip)
        `;
        
        const auditDetalles = JSON.stringify({
          usuario_creado: {
            nombre: usuario.nombre,
            apellido: usuario.apellido,
            email: usuario.email,
            rol: usuario.rol,
            rolId: usuario.RolID,
            estatus: usuario.estatus
          },
          admin_creador: req.session.user.email,
          password_temporal_generada: true,
          timestamp: new Date().toISOString()
        });
        
        await txn.executeQuery(auditQuery, {
          usuarioId: req.session.user.id_usuario,
          accion: 'USUARIO_CREADO',
          entidad: 'Usuario',
          entidadId: usuario.id_usuario,
          detalles: auditDetalles,
          ip: req.ip || 'IP no disponible'
        });
        
        console.log('[USUARIOS] ✅ Auditoría registrada en transacción');
        
        // Retornar usuario para uso posterior
        return usuario;
      });
      
      console.log('[TRANSACTION] 🎉 Transacción de creación completada exitosamente');
      
    } catch (transactionError) {
      console.error('[TRANSACTION] ❌ Error en transacción - datos revertidos:', transactionError.message);
      
      return res.status(500).json({
        success: false,
        message: 'Error en la creación del usuario. No se realizaron cambios en la base de datos.',
        error: process.env.NODE_ENV === 'development' ? transactionError.message : 'Error interno del servidor'
      });
    }

    // 📧 ENVÍO DE EMAIL CON MANEJO DE FALLOS CRÍTICOS
    console.log(`[USUARIOS] 📧 Iniciando envío de contraseña temporal por email a: ${email}`);
    
    // Respuesta inmediata al administrador
    res.json({
      success: true,
      message: 'Usuario creado exitosamente. Se ha generado una contraseña temporal.',
      warning: 'Se está enviando el email con las credenciales. Si no llega en 5 minutos, revisa los logs.',
      usuario: {
        id_usuario: newUsuario.id_usuario,
        nombre: newUsuario.nombre,
        apellido: newUsuario.apellido,
        nombre_usuario: newUsuario.nombre_usuario,
        email: newUsuario.email,
        rol: newUsuario.rol,
        rolId: newUsuario.RolID,
        estatus: newUsuario.estatus
      }
    });
    
    // 🚨 MANEJO CRÍTICO: Email asíncrono con notificación de fallos
    setImmediate(async () => {
      try {
        const emailResult = await emailService.enviarPasswordTemporal(
          email.trim(),
          nombre.trim(),
          apellido.trim(),
          passwordTemporal
        );
        
        if (emailResult.success) {
          console.log(`[USUARIOS] ✅ Email enviado correctamente - MessageID: ${emailResult.messageId}`);
          
          // Registrar envío exitoso en auditoría
          try {
            await auditService.logAction({
              usuarioId: req.session.user.id_usuario,
              accion: 'EMAIL_PASSWORD_ENVIADO',
              entidad: 'Usuario',
              entidadId: newUsuario.id_usuario,
              detalles: {
                destinatario: email,
                messageId: emailResult.messageId,
                timestamp: new Date().toISOString()
              },
              ip: req.ip
            }, db);
          } catch (auditError) {
            console.error('[USUARIOS] ⚠️ Error registrando envío de email:', auditError.message);
          }
          
        } else {
          console.error(`[USUARIOS] ⚠️ Email fallido: ${emailResult.message}`);
          await this.handleEmailFailure(newUsuario, passwordTemporal, req.session.user, req.ip);
        }
        
      } catch (emailError) {
        console.error(`[USUARIOS] ❌ Error crítico enviando email:`, emailError.message);
        await this.handleEmailFailure(newUsuario, passwordTemporal, req.session.user, req.ip);
      }
    });

  } catch (error) {
    console.error('[USUARIOS] ❌ Error creando usuario:', error);
    
    if (error.number === 2627) { // Duplicate key error
      return res.status(400).json({
        success: false,
        message: 'Ya existe un usuario con esos datos'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

/* GET - Obtener usuario específico */
router.get('/:id', hasPermission('ver_usuarios'), async function(req, res, next) {
  try {
    const db = req.app.locals.db;
    const usuarioId = parseInt(req.params.id);

    if (isNaN(usuarioId)) {
      return res.status(400).json({
        success: false,
        message: 'ID de usuario inválido'
      });
    }

    console.log(`[USUARIOS] Consultando usuario ID: ${usuarioId}`);

    const query = `
      SELECT 
        u.id_usuario,
        u.nombre,
        u.apellido,
        u.nombre_usuario,
        u.email,
        u.rol,
        u.RolID,
        r.NombreRol as rolNombre,
        r.Descripcion as rolDescripcion,
        u.estatus,
        u.fecha_registro,
        COUNT(CASE WHEN r.NombreRol = 'Instructor' THEN c.id_curso END) as cursos_creados,
        COUNT(CASE WHEN r.NombreRol NOT IN ('Instructor', 'SuperAdmin', 'Admin') THEN p.id_progreso END) as cursos_en_progreso,
        COUNT(comp.id_compra) as compras_realizadas,
        COUNT(cert.id_certificado) as certificados_obtenidos
      FROM Usuarios u
      LEFT JOIN Roles r ON u.RolID = r.RolID
      LEFT JOIN Cursos c ON u.id_usuario = c.id_usuario AND r.NombreRol = 'Instructor'
      LEFT JOIN Progreso p ON u.id_usuario = p.id_usuario AND r.NombreRol NOT IN ('Instructor', 'SuperAdmin', 'Admin')
      LEFT JOIN Compras comp ON u.id_usuario = comp.id_usuario
      LEFT JOIN Certificados cert ON u.id_usuario = cert.id_usuario
      WHERE u.id_usuario = @id
      GROUP BY u.id_usuario, u.nombre, u.apellido, u.nombre_usuario, u.email, u.rol, u.RolID, r.NombreRol, r.Descripcion, u.estatus, u.fecha_registro
    `;

    const result = await db.executeQuery(query, { id: usuarioId });

    if (result.recordset.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      });
    }

    const usuario = result.recordset[0];
    console.log(`[USUARIOS] ✅ Usuario encontrado: "${usuario.nombre} ${usuario.apellido}"`);

    res.json({
      success: true,
      usuario: usuario
    });

  } catch (error) {
    console.error('[USUARIOS] ❌ Error consultando usuario:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

/* PUT - Actualizar usuario */
router.put('/:id', hasPermission('editar_usuarios'), async function(req, res, next) {
  try {
    const db = req.app.locals.db;
    const usuarioId = parseInt(req.params.id);
    const { nombre, apellido, nombre_usuario, email, rolId, rolNombre, estatus } = req.body;

    if (isNaN(usuarioId)) {
      return res.status(400).json({
        success: false,
        message: 'ID de usuario inválido'
      });
    }

    // Validaciones (mismas que en POST)
    if (!nombre || nombre.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'El nombre es obligatorio'
      });
    }

    if (!apellido || apellido.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'El apellido es obligatorio'
      });
    }

    if (!nombre_usuario || nombre_usuario.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'El nombre de usuario es obligatorio'
      });
    }

    if (!email || email.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'El email es obligatorio'
      });
    }

    if (nombre.length > 150 || apellido.length > 150) {
      return res.status(400).json({
        success: false,
        message: 'El nombre y apellido no pueden exceder 150 caracteres'
      });
    }

    if (nombre_usuario.length > 50) {
      return res.status(400).json({
        success: false,
        message: 'El nombre de usuario no puede exceder 50 caracteres'
      });
    }

    if (email.length > 255) {
      return res.status(400).json({
        success: false,
        message: 'El email no puede exceder 255 caracteres'
      });
    }

    // Validar formato de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: 'El formato del email no es válido'
      });
    }

    // Validar rol y estatus
    if (!rolId || isNaN(parseInt(rolId))) {
      return res.status(400).json({
        success: false,
        message: 'Debe seleccionar un rol válido'
      });
    }

    // Verificar que el rol existe y está activo
    const rolExistsQuery = 'SELECT RolID, NombreRol FROM Roles WHERE RolID = @rolId AND Activo = 1';
    const rolExistsResult = await db.executeQuery(rolExistsQuery, { rolId: parseInt(rolId) });
    
    if (rolExistsResult.recordset.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'El rol seleccionado no es válido'
      });
    }

    const rolSeleccionado = rolExistsResult.recordset[0];

    if (!['activo', 'inactivo', 'baneado'].includes(estatus)) {
      return res.status(400).json({
        success: false,
        message: 'El estatus debe ser "activo", "inactivo" o "baneado"'
      });
    }

    console.log(`[USUARIOS] Actualizando usuario ID: ${usuarioId}`);

    // Verificar que el usuario existe
    const existsQuery = 'SELECT id_usuario FROM Usuarios WHERE id_usuario = @id';
    const existsResult = await db.executeQuery(existsQuery, { id: usuarioId });

    if (existsResult.recordset.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      });
    }

    // Verificar que no exista otro usuario con el mismo email
    const duplicateEmailQuery = `
      SELECT id_usuario 
      FROM Usuarios 
      WHERE LOWER(email) = LOWER(@email) AND id_usuario != @id
    `;
    const duplicateEmailResult = await db.executeQuery(duplicateEmailQuery, { 
      email: email.trim(), 
      id: usuarioId 
    });

    if (duplicateEmailResult.recordset.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Ya existe otro usuario con ese email'
      });
    }

    // Verificar que no exista otro usuario con el mismo nombre_usuario
    const duplicateUserQuery = `
      SELECT id_usuario 
      FROM Usuarios 
      WHERE LOWER(nombre_usuario) = LOWER(@nombre_usuario) AND id_usuario != @id
    `;
    const duplicateUserResult = await db.executeQuery(duplicateUserQuery, { 
      nombre_usuario: nombre_usuario.trim(), 
      id: usuarioId 
    });

    if (duplicateUserResult.recordset.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Ya existe otro usuario con ese nombre de usuario'
      });
    }

    // Actualizar el usuario
    const updateQuery = `
      UPDATE Usuarios 
      SET 
        nombre = @nombre,
        apellido = @apellido,
        nombre_usuario = @nombre_usuario,
        email = @email,
        rol = @rolNombre,
        RolID = @rolId,
        estatus = @estatus
      OUTPUT INSERTED.id_usuario, INSERTED.nombre, INSERTED.apellido, INSERTED.nombre_usuario, INSERTED.email, INSERTED.rol, INSERTED.RolID, INSERTED.estatus
      WHERE id_usuario = @id
    `;

    const result = await db.executeQuery(updateQuery, {
      id: usuarioId,
      nombre: nombre.trim(),
      apellido: apellido.trim(),
      nombre_usuario: nombre_usuario.trim(),
      email: email.trim(),
      rolNombre: rolSeleccionado.NombreRol,
      rolId: parseInt(rolId),
      estatus: estatus
    });

    const updatedUsuario = result.recordset[0];
    console.log(`[USUARIOS] ✅ Usuario actualizado exitosamente - ID: ${usuarioId}`);

    res.json({
      success: true,
      message: 'Usuario actualizado exitosamente',
      usuario: updatedUsuario
    });

  } catch (error) {
    console.error('[USUARIOS] ❌ Error actualizando usuario:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

/* POST - Cambiar estado de usuario */
router.post('/:id/status', hasPermission('cambiar_estado_usuarios'), async function(req, res, next) {
  try {
    const db = req.app.locals.db;
    const usuarioId = parseInt(req.params.id);
    const { estatus } = req.body;

    if (isNaN(usuarioId)) {
      return res.status(400).json({
        success: false,
        message: 'ID de usuario inválido'
      });
    }

    // Validar estatus
    if (!['activo', 'inactivo', 'baneado'].includes(estatus)) {
      return res.status(400).json({
        success: false,
        message: 'El estatus debe ser "activo", "inactivo" o "baneado"'
      });
    }

    console.log(`[USUARIOS] Cambiando estado del usuario ID: ${usuarioId} a: ${estatus}`);

    // Verificar que el usuario existe y obtener datos actuales
    const existsQuery = `
      SELECT id_usuario, nombre, apellido, estatus 
      FROM Usuarios 
      WHERE id_usuario = @id
    `;
    const existsResult = await db.executeQuery(existsQuery, { id: usuarioId });

    if (existsResult.recordset.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      });
    }

    const usuario = existsResult.recordset[0];

    // Actualizar solo el estatus
    const updateQuery = `
      UPDATE Usuarios 
      SET estatus = @estatus
      WHERE id_usuario = @id
    `;

    await db.executeQuery(updateQuery, {
      id: usuarioId,
      estatus: estatus
    });

    const statusNames = {
      'activo': 'activado',
      'inactivo': 'desactivado',
      'baneado': 'baneado'
    };

    console.log(`[USUARIOS] ✅ Estado del usuario "${usuario.nombre} ${usuario.apellido}" cambiado a: ${estatus}`);

    res.json({
      success: true,
      message: `Usuario "${usuario.nombre} ${usuario.apellido}" ${statusNames[estatus]} exitosamente`
    });

  } catch (error) {
    console.error('[USUARIOS] ❌ Error cambiando estado del usuario:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

/* POST - Cambiar rol de usuario */
router.post('/:id/role', hasPermission('cambiar_roles_usuarios'), async function(req, res, next) {
  try {
    const db = req.app.locals.db;
    const usuarioId = parseInt(req.params.id);
    const { newRoleId, newRoleName, currentRoleId, reason } = req.body;

    if (isNaN(usuarioId)) {
      return res.status(400).json({
        success: false,
        message: 'ID de usuario inválido'
      });
    }

    if (!newRoleId || isNaN(parseInt(newRoleId))) {
      return res.status(400).json({
        success: false,
        message: 'Debe seleccionar un rol válido'
      });
    }

    console.log(`[USUARIOS] Cambiando rol del usuario ID: ${usuarioId} a RolID: ${newRoleId}`);

    // Verificar que el usuario existe
    const userQuery = `
      SELECT u.id_usuario, u.nombre, u.apellido, u.email, u.RolID, r.NombreRol as rolActual
      FROM Usuarios u
      LEFT JOIN Roles r ON u.RolID = r.RolID
      WHERE u.id_usuario = @id
    `;
    const userResult = await db.executeQuery(userQuery, { id: usuarioId });

    if (userResult.recordset.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      });
    }

    const usuario = userResult.recordset[0];

    // Verificar que el rol nuevo existe y está activo
    const roleQuery = 'SELECT RolID, NombreRol, Descripcion FROM Roles WHERE RolID = @roleId AND Activo = 1';
    const roleResult = await db.executeQuery(roleQuery, { roleId: parseInt(newRoleId) });

    if (roleResult.recordset.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'El rol seleccionado no es válido'
      });
    }

    const nuevoRol = roleResult.recordset[0];

    // Verificar que no sea el mismo rol
    if (parseInt(newRoleId) === usuario.RolID) {
      return res.status(400).json({
        success: false,
        message: 'El usuario ya tiene ese rol asignado'
      });
    }

    // Actualizar el rol del usuario
    const updateQuery = `
      UPDATE Usuarios 
      SET RolID = @newRoleId, rol = @newRoleName
      WHERE id_usuario = @id
    `;

    await db.executeQuery(updateQuery, {
      id: usuarioId,
      newRoleId: parseInt(newRoleId),
      newRoleName: nuevoRol.NombreRol
    });

    console.log(`[USUARIOS] ✅ Rol del usuario "${usuario.nombre} ${usuario.apellido}" cambiado de "${usuario.rolActual}" a "${nuevoRol.NombreRol}"`);

    // 🔍 REGISTRAR AUDITORÍA - Cambio de rol
    try {
      await auditService.logAction({
        usuarioId: req.session.user.id_usuario,
        accion: auditService.AUDIT_ACTIONS.USUARIO_ACTUALIZADO,
        entidad: auditService.AUDIT_ENTITIES.USUARIO,
        entidadId: usuarioId,
        detalles: {
          tipo_actualizacion: 'cambio_rol',
          usuario_afectado: {
            id: usuario.id_usuario,
            nombre: usuario.nombre,
            apellido: usuario.apellido,
            email: usuario.email
          },
          cambio_rol: {
            rol_anterior: {
              id: usuario.RolID,
              nombre: usuario.rolActual
            },
            rol_nuevo: {
              id: parseInt(newRoleId),
              nombre: nuevoRol.NombreRol
            }
          },
          motivo: reason || 'Sin motivo especificado',
          admin_responsable: req.session.user.email
        },
        ip: req.ip
      }, db);
      console.log('[USUARIOS] ✅ Auditoría registrada para cambio de rol');
    } catch (auditError) {
      console.error('[USUARIOS] ⚠️ Error registrando auditoría:', auditError.message);
      // No fallar la operación principal si falla la auditoría
    }

    res.json({
      success: true,
      message: `Rol del usuario "${usuario.nombre} ${usuario.apellido}" cambiado exitosamente de "${usuario.rolActual}" a "${nuevoRol.NombreRol}"`
    });

  } catch (error) {
    console.error('[USUARIOS] ❌ Error cambiando rol del usuario:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

/* DELETE - Eliminar usuario */
router.delete('/:id', hasPermission('eliminar_usuarios'), async function(req, res, next) {
  try {
    const db = req.app.locals.db;
    const usuarioId = parseInt(req.params.id);

    if (isNaN(usuarioId)) {
      return res.status(400).json({
        success: false,
        message: 'ID de usuario inválido'
      });
    }

    console.log(`[USUARIOS] Eliminando usuario ID: ${usuarioId}`);

    // Verificar que el usuario existe y obtener dependencias
    const existsQuery = `
      SELECT 
        u.id_usuario,
        u.nombre,
        u.apellido,
        u.email,
        u.rol,
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
      GROUP BY u.id_usuario, u.nombre, u.apellido, u.email, u.rol
    `;
    const existsResult = await db.executeQuery(existsQuery, { id: usuarioId });

    if (existsResult.recordset.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      });
    }

    const usuario = existsResult.recordset[0];
    const totalDependencias = usuario.cursos_creados + usuario.progreso_cursos + usuario.compras_realizadas + usuario.certificados_emitidos;

    // Si tiene dependencias, mostrar advertencia
    if (totalDependencias > 0) {
      let dependenciasMsg = [];
      if (usuario.cursos_creados > 0) dependenciasMsg.push(`${usuario.cursos_creados} curso(s) creado(s)`);
      if (usuario.progreso_cursos > 0) dependenciasMsg.push(`${usuario.progreso_cursos} progreso(s) de curso(s)`);
      if (usuario.compras_realizadas > 0) dependenciasMsg.push(`${usuario.compras_realizadas} compra(s) realizada(s)`);
      if (usuario.certificados_emitidos > 0) dependenciasMsg.push(`${usuario.certificados_emitidos} certificado(s) emitido(s)`);

      return res.status(400).json({
        success: false,
        message: `No se puede eliminar al usuario "${usuario.nombre} ${usuario.apellido}" porque tiene datos relacionados: ${dependenciasMsg.join(', ')}. Considera cambiar su estatus a "inactivo" en su lugar.`
      });
    }

    // Eliminar el usuario (solo si no tiene dependencias)
    const deleteQuery = 'DELETE FROM Usuarios WHERE id_usuario = @id';
    await db.executeQuery(deleteQuery, { id: usuarioId });

    console.log(`[USUARIOS] ✅ Usuario eliminado exitosamente: "${usuario.nombre} ${usuario.apellido}"`);

    // 🔍 REGISTRAR AUDITORÍA - Usuario eliminado
    try {
      await auditService.logAction({
        usuarioId: req.session.user.id_usuario,
        accion: auditService.AUDIT_ACTIONS.USUARIO_ELIMINADO,
        entidad: auditService.AUDIT_ENTITIES.USUARIO,
        entidadId: usuarioId,
        detalles: {
          usuario_eliminado: {
            id: usuario.id_usuario,
            nombre: usuario.nombre,
            apellido: usuario.apellido,
            email: usuario.email,
            rol: usuario.rol
          },
          admin_eliminador: req.session.user.email,
          dependencias_verificadas: {
            cursos_creados: usuario.cursos_creados,
            progreso_cursos: usuario.progreso_cursos,
            compras_realizadas: usuario.compras_realizadas,
            certificados_emitidos: usuario.certificados_emitidos
          }
        },
        ip: req.ip
      }, db);
      console.log('[USUARIOS] ✅ Auditoría registrada para eliminación de usuario');
    } catch (auditError) {
      console.error('[USUARIOS] ⚠️ Error registrando auditoría:', auditError.message);
      // No fallar la operación principal si falla la auditoría
    }

    res.json({
      success: true,
      message: `Usuario "${usuario.nombre} ${usuario.apellido}" eliminado exitosamente`
    });

  } catch (error) {
    console.error('[USUARIOS] ❌ Error eliminando usuario:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

// Función auxiliar para generar contraseña temporal
function generarPasswordTemporal() {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
  let password = '';
  for (let i = 0; i < 8; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
}

/**
 * 🚨 MANEJO CRÍTICO DE FALLOS DE EMAIL
 * ===================================
 * Cuando el email falla, registra el evento y ofrece alternativas
 */
async function handleEmailFailure(usuario, passwordTemporal, admin, adminIP) {
  try {
    console.error(`[USUARIOS] 🚨 FALLO CRÍTICO: Email no enviado para usuario ${usuario.email}`);
    console.error(`[USUARIOS] 💡 SOLUCIÓN: Contraseña temporal: ${passwordTemporal}`);
    
    // Registrar el fallo en auditoría para seguimiento
    await auditService.logAction({
      usuarioId: admin.id_usuario,
      accion: 'EMAIL_PASSWORD_FALLIDO',
      entidad: 'Usuario',
      entidadId: usuario.id_usuario,
      detalles: {
        destinatario: usuario.email,
        usuario_afectado: {
          id: usuario.id_usuario,
          nombre: usuario.nombre,
          apellido: usuario.apellido,
          email: usuario.email
        },
        password_temporal_perdida: true,
        admin_responsable: admin.email,
        timestamp: new Date().toISOString(),
        acciones_requeridas: [
          'Revisar configuración SMTP',
          'Contactar al usuario manualmente',
          'Considerar reset manual de contraseña'
        ]
      },
      ip: adminIP
    }, db);
    
    // TODO: Implementar notificación al administrador
    // - Email de alerta al admin
    // - Webhook a sistema de monitoreo
    // - Slack/Teams notification
    console.log(`[USUARIOS] 📝 Fallo registrado en auditoría para seguimiento`);
    
  } catch (auditError) {
    console.error('[USUARIOS] ❌ Error registrando fallo de email en auditoría:', auditError.message);
  }
}

// Agregar el método al objeto router para acceso interno
router.handleEmailFailure = handleEmailFailure;

module.exports = router;