var express = require('express');
var router = express.Router();

/* GET users listing. */
router.get('/', async function(req, res, next) {
  try {
    const db = req.app.locals.db;
    
    // Obtener todos los usuarios con la nueva estructura (sin mostrar contraseñas)
    const result = await db.executeQuery(`
      SELECT 
        id_usuario,
        nombre,
        apellido,
        nombre_usuario,
        email,
        rol,
        fecha_registro,
        estatus
      FROM Usuarios 
      ORDER BY fecha_registro DESC
    `);
    
    res.json({
      success: true,
      data: result.recordset,
      message: 'Usuarios obtenidos correctamente',
      total: result.recordset.length
    });
  } catch (error) {
    console.error('Error obteniendo usuarios:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message
    });
  }
});

/* POST crear usuario */
router.post('/', async function(req, res, next) {
  try {
    const { nombre, apellido, nombre_usuario, email, password, rol } = req.body;
    const db = req.app.locals.db;
    
    // Validación básica
    if (!nombre || !apellido || !nombre_usuario || !email || !password || !rol) {
      return res.status(400).json({
        success: false,
        message: 'Todos los campos son requeridos'
      });
    }
    
    // Validar rol
    if (!['instructor', 'user'].includes(rol)) {
      return res.status(400).json({
        success: false,
        message: 'Rol debe ser "instructor" o "user"'
      });
    }
    
    // Insertar nuevo usuario con la nueva estructura
    const result = await db.executeQuery(`
      INSERT INTO Usuarios (nombre, apellido, nombre_usuario, email, password, rol, estatus) 
      VALUES (@nombre, @apellido, @nombre_usuario, @email, @password, @rol, 'activo');
      SELECT SCOPE_IDENTITY() as id
    `, { 
      nombre, 
      apellido, 
      nombre_usuario, 
      email: email.toLowerCase(), 
      password, 
      rol 
    });
    
    res.json({
      success: true,
      data: { 
        id: result.recordset[0].id, 
        nombre, 
        apellido, 
        nombre_usuario, 
        email, 
        rol,
        estatus: 'activo'
      },
      message: 'Usuario creado correctamente'
    });
  } catch (error) {
    console.error('Error creando usuario:', error);
    
    // Manejar errores específicos de SQL Server
    let errorMessage = 'Error creando usuario';
    if (error.message.includes('UNIQUE')) {
      if (error.message.includes('email')) {
        errorMessage = 'El email ya está registrado';
      } else if (error.message.includes('nombre_usuario')) {
        errorMessage = 'El nombre de usuario ya está en uso';
      }
    }
    
    res.status(500).json({
      success: false,
      message: errorMessage,
      error: error.message
    });
  }
});

/* GET usuario por ID */
router.get('/:id', async function(req, res, next) {
  try {
    const { id } = req.params;
    const db = req.app.locals.db;
    
    const result = await db.executeQuery(`
      SELECT 
        id_usuario,
        nombre,
        apellido,
        nombre_usuario,
        email,
        rol,
        fecha_registro,
        estatus
      FROM Usuarios 
      WHERE id_usuario = @id
    `, { id });
    
    if (result.recordset.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      });
    }
    
    res.json({
      success: true,
      data: result.recordset[0],
      message: 'Usuario obtenido correctamente'
    });
  } catch (error) {
    console.error('Error obteniendo usuario:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message
    });
  }
});

module.exports = router;
