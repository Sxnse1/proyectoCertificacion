var express = require('express');
var router = express.Router();

/* GET users listing. */
router.get('/', async function(req, res, next) {
  try {
    const db = req.app.locals.db;
    
    // Ejemplo de consulta: obtener todos los usuarios
    const result = await db.executeQuery('SELECT * FROM usuarios');
    
    res.json({
      success: true,
      data: result.recordset,
      message: 'Usuarios obtenidos correctamente'
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
    const { nombre, email } = req.body;
    const db = req.app.locals.db;
    
    // Ejemplo de inserción con parámetros seguros
    const result = await db.executeQuery(
      'INSERT INTO usuarios (nombre, email) VALUES (@nombre, @email); SELECT SCOPE_IDENTITY() as id',
      { nombre, email }
    );
    
    res.json({
      success: true,
      data: { id: result.recordset[0].id, nombre, email },
      message: 'Usuario creado correctamente'
    });
  } catch (error) {
    console.error('Error creando usuario:', error);
    res.status(500).json({
      success: false,
      message: 'Error creando usuario',
      error: error.message
    });
  }
});

/* GET usuario por ID */
router.get('/:id', async function(req, res, next) {
  try {
    const { id } = req.params;
    const db = req.app.locals.db;
    
    const result = await db.executeQuery(
      'SELECT * FROM usuarios WHERE id = @id',
      { id }
    );
    
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
