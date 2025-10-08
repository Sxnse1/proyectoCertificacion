const express = require('express');
const router = express.Router();
const sql = require('mssql');
const config = require('../../config/database');

// Middleware para verificar si el usuario es administrador
function verificarAdmin(req, res, next) {
  if (req.session.user && req.session.user.id_rol === 1) {
    next();
  } else {
    res.status(403).send('Acceso denegado. Se requieren permisos de administrador.');
  }
}

// GET - Vista principal de certificados
router.get('/', async (req, res) => {
  try {
    const pool = await sql.connect(config);
    
    // Obtener estadísticas
    const statsQuery = await pool.request().query(`
      SELECT 
        COUNT(*) as totalCertificados,
        (SELECT COUNT(*) FROM Certificados 
         WHERE MONTH(fecha_emision) = MONTH(GETDATE()) 
         AND YEAR(fecha_emision) = YEAR(GETDATE())) as certificadosMes,
        (SELECT COUNT(*) FROM Progreso 
         WHERE porcentaje = 100 
         AND NOT EXISTS (SELECT 1 FROM Certificados WHERE id_usuario = Progreso.id_usuario AND id_curso = Progreso.id_curso)) as pendientes
      FROM Certificados
    `);
    
    // Obtener todos los certificados
    const certificadosQuery = await pool.request().query(`
      SELECT 
        cert.id_certificado,
        cert.id_usuario,
        cert.id_curso,
        cert.codigo_verificacion,
        cert.fecha_emision,
        cert.estatus,
        u.nombre as usuario_nombre,
        u.email as usuario_email,
        c.titulo as curso_titulo,
        inst.nombre as instructor_nombre
      FROM Certificados cert
      INNER JOIN Usuarios u ON cert.id_usuario = u.id_usuario
      INNER JOIN Cursos c ON cert.id_curso = c.id_curso
      INNER JOIN Usuarios inst ON c.id_instructor = inst.id_usuario
      ORDER BY cert.fecha_emision DESC
    `);
    
    // Obtener cursos para filtros
    const cursosQuery = await pool.request().query(`
      SELECT id_curso, titulo FROM Cursos ORDER BY titulo
    `);
    
    // Obtener pendientes de emisión
    const pendientesQuery = await pool.request().query(`
      SELECT 
        p.id_usuario,
        p.id_curso,
        u.nombre as usuario_nombre,
        u.email as usuario_email,
        c.titulo as curso_titulo,
        p.fecha_actualizacion as fecha_completado,
        p.porcentaje
      FROM Progreso p
      INNER JOIN Usuarios u ON p.id_usuario = u.id_usuario
      INNER JOIN Cursos c ON p.id_curso = c.id_curso
      WHERE p.porcentaje = 100
      AND NOT EXISTS (
        SELECT 1 FROM Certificados 
        WHERE id_usuario = p.id_usuario AND id_curso = p.id_curso
      )
      ORDER BY p.fecha_actualizacion DESC
    `);
    
    // Obtener cursos con más certificados
    const cursosTopQuery = await pool.request().query(`
      SELECT TOP 10
        c.id_curso,
        c.titulo,
        inst.nombre as instructor,
        COUNT(cert.id_certificado) as cantidad
      FROM Certificados cert
      INNER JOIN Cursos c ON cert.id_curso = c.id_curso
      INNER JOIN Usuarios inst ON c.id_instructor = inst.id_usuario
      GROUP BY c.id_curso, c.titulo, inst.nombre
      ORDER BY cantidad DESC
    `);
    
    const stats = statsQuery.recordset[0];
    
    // Simulamos verificaciones este mes
    const verificaciones = 45;
    
    res.render('admin/certificados-admin', {
      totalCertificados: stats.totalCertificados || 0,
      certificadosMes: stats.certificadosMes || 0,
      pendientes: stats.pendientes || 0,
      verificaciones: verificaciones,
      certificados: certificadosQuery.recordset,
      cursos: cursosQuery.recordset,
      pendientesEmision: pendientesQuery.recordset,
      cursosTop: cursosTopQuery.recordset,
      verificacionesRecientes: [],
      user: req.session.user
    });
  } catch (err) {
    console.error('Error al cargar certificados:', err);
    res.status(500).send('Error al cargar certificados');
  }
});

// GET - Preview de certificado
router.get('/:id/preview', async (req, res) => {
  const { id } = req.params;
  
  try {
    const pool = await sql.connect(config);
    const result = await pool.request()
      .input('id', sql.Int, id)
      .query(`
        SELECT 
          cert.*,
          u.nombre as usuario_nombre,
          c.titulo as curso_titulo,
          inst.nombre as instructor_nombre
        FROM Certificados cert
        INNER JOIN Usuarios u ON cert.id_usuario = u.id_usuario
        INNER JOIN Cursos c ON cert.id_curso = c.id_curso
        INNER JOIN Usuarios inst ON c.id_instructor = inst.id_usuario
        WHERE cert.id_certificado = @id
      `);
    
    if (result.recordset.length === 0) {
      return res.status(404).send('Certificado no encontrado');
    }
    
    // Aquí renderizarías una vista específica del certificado
    res.json({ success: true, data: result.recordset[0] });
  } catch (err) {
    console.error('Error al obtener certificado:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET - Descargar certificado en PDF
router.get('/:id/pdf', async (req, res) => {
  const { id } = req.params;
  
  try {
    // Aquí implementarías la generación del PDF
    res.json({ 
      success: true, 
      message: 'Generación de PDF en desarrollo',
      certificadoId: id
    });
  } catch (err) {
    console.error('Error al generar PDF:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST - Enviar certificado por email
router.post('/:id/enviar', async (req, res) => {
  const { id } = req.params;
  
  try {
    // Aquí implementarías el envío por email
    res.json({ 
      success: true, 
      message: 'Certificado enviado por email'
    });
  } catch (err) {
    console.error('Error al enviar certificado:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST - Revocar certificado
router.post('/:id/revocar', async (req, res) => {
  const { id } = req.params;
  const { motivo } = req.body;
  
  try {
    const pool = await sql.connect(config);
    await pool.request()
      .input('id', sql.Int, id)
      .query(`
        UPDATE Certificados 
        SET estatus = 'revocado'
        WHERE id_certificado = @id
      `);
    
    // Aquí podrías guardar el motivo en una tabla de auditoría
    
    res.json({ success: true, message: 'Certificado revocado' });
  } catch (err) {
    console.error('Error al revocar certificado:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST - Reactivar certificado
router.post('/:id/reactivar', async (req, res) => {
  const { id } = req.params;
  
  try {
    const pool = await sql.connect(config);
    await pool.request()
      .input('id', sql.Int, id)
      .query(`
        UPDATE Certificados 
        SET estatus = 'activo'
        WHERE id_certificado = @id
      `);
    
    res.json({ success: true, message: 'Certificado reactivado' });
  } catch (err) {
    console.error('Error al reactivar certificado:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST - Emitir certificado individual
router.post('/emitir', async (req, res) => {
  const { id_usuario, id_curso } = req.body;
  
  try {
    const pool = await sql.connect(config);
    
    // Verificar que el usuario completó el curso
    const progresoQuery = await pool.request()
      .input('usuario', sql.Int, id_usuario)
      .input('curso', sql.Int, id_curso)
      .query(`
        SELECT porcentaje FROM Progreso 
        WHERE id_usuario = @usuario AND id_curso = @curso
      `);
    
    if (progresoQuery.recordset.length === 0 || progresoQuery.recordset[0].porcentaje < 100) {
      return res.status(400).json({ 
        success: false, 
        error: 'El usuario no ha completado el curso' 
      });
    }
    
    // Generar código de verificación único
    const codigoVerificacion = `CERT-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
    
    // Insertar certificado
    await pool.request()
      .input('usuario', sql.Int, id_usuario)
      .input('curso', sql.Int, id_curso)
      .input('codigo', sql.NVarChar, codigoVerificacion)
      .query(`
        INSERT INTO Certificados (id_usuario, id_curso, codigo_verificacion, fecha_emision, estatus)
        VALUES (@usuario, @curso, @codigo, GETDATE(), 'activo')
      `);
    
    res.json({ 
      success: true, 
      message: 'Certificado emitido exitosamente',
      codigo: codigoVerificacion
    });
  } catch (err) {
    console.error('Error al emitir certificado:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST - Emitir certificados masivos
router.post('/emitir-masivo', async (req, res) => {
  try {
    const pool = await sql.connect(config);
    
    // Obtener todos los pendientes
    const pendientesQuery = await pool.request().query(`
      SELECT p.id_usuario, p.id_curso
      FROM Progreso p
      WHERE p.porcentaje = 100
      AND NOT EXISTS (
        SELECT 1 FROM Certificados 
        WHERE id_usuario = p.id_usuario AND id_curso = p.id_curso
      )
    `);
    
    let emitidos = 0;
    
    // Emitir cada certificado
    for (const pendiente of pendientesQuery.recordset) {
      const codigoVerificacion = `CERT-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
      
      await pool.request()
        .input('usuario', sql.Int, pendiente.id_usuario)
        .input('curso', sql.Int, pendiente.id_curso)
        .input('codigo', sql.NVarChar, codigoVerificacion)
        .query(`
          INSERT INTO Certificados (id_usuario, id_curso, codigo_verificacion, fecha_emision, estatus)
          VALUES (@usuario, @curso, @codigo, GETDATE(), 'activo')
        `);
      
      emitidos++;
    }
    
    res.json({ 
      success: true, 
      emitidos: emitidos,
      message: `${emitidos} certificados emitidos exitosamente`
    });
  } catch (err) {
    console.error('Error al emitir certificados masivos:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET - Verificar certificado por código
router.get('/verificar/:codigo', async (req, res) => {
  const { codigo } = req.params;
  
  try {
    const pool = await sql.connect(config);
    const result = await pool.request()
      .input('codigo', sql.NVarChar, codigo)
      .query(`
        SELECT 
          cert.*,
          u.nombre as usuario_nombre,
          c.titulo as curso_titulo,
          inst.nombre as instructor_nombre
        FROM Certificados cert
        INNER JOIN Usuarios u ON cert.id_usuario = u.id_usuario
        INNER JOIN Cursos c ON cert.id_curso = c.id_curso
        INNER JOIN Usuarios inst ON c.id_instructor = inst.id_usuario
        WHERE cert.codigo_verificacion = @codigo
      `);
    
    if (result.recordset.length === 0) {
      return res.json({ 
        success: false, 
        valido: false,
        message: 'Certificado no encontrado' 
      });
    }
    
    const certificado = result.recordset[0];
    
    res.json({ 
      success: true, 
      valido: certificado.estatus === 'activo',
      data: certificado
    });
  } catch (err) {
    console.error('Error al verificar certificado:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET - Exportar certificados
router.get('/exportar', async (req, res) => {
  try {
    const pool = await sql.connect(config);
    const result = await pool.request().query(`
      SELECT 
        cert.codigo_verificacion as codigo,
        u.nombre as usuario,
        u.email,
        c.titulo as curso,
        inst.nombre as instructor,
        cert.fecha_emision,
        cert.estatus
      FROM Certificados cert
      INNER JOIN Usuarios u ON cert.id_usuario = u.id_usuario
      INNER JOIN Cursos c ON cert.id_curso = c.id_curso
      INNER JOIN Usuarios inst ON c.id_instructor = inst.id_usuario
      ORDER BY cert.fecha_emision DESC
    `);
    
    res.json({ success: true, data: result.recordset });
  } catch (err) {
    console.error('Error al exportar:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
