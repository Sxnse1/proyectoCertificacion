const express = require('express');
const router = express.Router();
const sql = require('mssql');
const { connect } = require('../../config/database');
const crypto = require('crypto');

// GET - Vista principal de certificados
router.get('/', async (req, res) => {
  try {
    const pool = await connect();
    const { search, curso } = req.query;
    const userRole = req.session.user.rol;
    const userId = req.session.user.id;
    
    // Si es usuario regular, mostrar solo sus certificados
    if (userRole === 'user') {
      // Obtener certificados del usuario
      const misCertificadosQuery = await pool.request()
        .input('userId', sql.Int, userId)
        .query(`
          SELECT 
            cert.id_certificado,
            cert.codigo_validacion,
            cert.fecha_emision,
            c.titulo as curso_titulo,
            inst.nombre + ' ' + inst.apellido as instructor_nombre
          FROM Certificados cert
          INNER JOIN Cursos c ON cert.id_curso = c.id_curso
          INNER JOIN Usuarios inst ON c.id_usuario = inst.id_usuario
          WHERE cert.id_usuario = @userId
          ORDER BY cert.fecha_emision DESC
        `);
      
      // Obtener estadísticas del usuario
      const statsUserQuery = await pool.request()
        .input('userId', sql.Int, userId)
        .query(`
          SELECT 
            (SELECT COUNT(*) FROM Certificados WHERE id_usuario = @userId) as mis_certificados,
            (SELECT COUNT(DISTINCT id_curso) FROM Progreso p 
             INNER JOIN Video v ON p.id_video = v.id_video 
             INNER JOIN Modulos m ON v.id_modulo = m.id_modulo
             WHERE p.id_usuario = @userId AND p.completado = 1) as cursos_completados,
            (SELECT ISNULL(SUM(v.duracion_segundos), 0) / 3600 FROM Progreso p 
             INNER JOIN Video v ON p.id_video = v.id_video 
             WHERE p.id_usuario = @userId AND p.completado = 1) as horas_estudio
        `);
      
      const userStats = statsUserQuery.recordset[0];
      
      return res.render('user/certificados-user', {
        title: 'Mis Certificados',
        misCertificados: misCertificadosQuery.recordset,
        cursosCompletados: userStats.cursos_completados || 0,
        horasEstudio: Math.round(userStats.horas_estudio || 0),
        progreso: userStats.cursos_completados > 0 ? Math.round((userStats.mis_certificados / userStats.cursos_completados) * 100) : 0,
        user: req.session.user
      });
    }
    
    // Para admin/instructor - Vista administrativa completa
    // Construir query base para certificados
    let certificadosQuery = `
      SELECT 
        cert.id_certificado,
        cert.id_usuario,
        cert.id_curso,
        cert.codigo_validacion,
        cert.fecha_emision,
        u.nombre + ' ' + u.apellido as usuario_nombre,
        u.email as usuario_email,
        c.titulo as curso_titulo,
        inst.nombre + ' ' + inst.apellido as instructor_nombre
      FROM Certificados cert
      INNER JOIN Usuarios u ON cert.id_usuario = u.id_usuario
      INNER JOIN Cursos c ON cert.id_curso = c.id_curso
      INNER JOIN Usuarios inst ON c.id_usuario = inst.id_usuario
      WHERE 1=1
    `;
    
    // Filtro por búsqueda
    if (search) {
      certificadosQuery += ` AND (
        u.nombre LIKE '%${search}%' OR 
        u.apellido LIKE '%${search}%' OR 
        u.email LIKE '%${search}%' OR 
        c.titulo LIKE '%${search}%' OR 
        cert.codigo_validacion LIKE '%${search}%'
      )`;
    }
    
    // Filtro por curso
    if (curso) {
      certificadosQuery += ` AND c.id_curso = ${curso}`;
    }
    
    certificadosQuery += ` ORDER BY cert.fecha_emision DESC`;
    
    // Obtener estadísticas
    const statsQuery = await pool.request().query(`
      SELECT 
        COUNT(*) as total_certificados,
        (SELECT COUNT(*) FROM Certificados 
         WHERE MONTH(fecha_emision) = MONTH(GETDATE()) 
         AND YEAR(fecha_emision) = YEAR(GETDATE())) as certificados_mes,
        (SELECT COUNT(DISTINCT CONCAT(p.id_usuario, '-', p.id_video)) FROM Progreso p
         INNER JOIN Video v ON p.id_video = v.id_video
         WHERE p.completado = 1) as progresos_completados
      FROM Certificados
    `);
    
    // Ejecutar consulta de certificados
    const certificadosResult = await pool.request().query(certificadosQuery);
    
    // Obtener cursos para filtros
    const cursosQuery = await pool.request().query(`
      SELECT id_curso, titulo FROM Cursos ORDER BY titulo
    `);
    
    // Obtener cursos con más certificados
    const cursosTopQuery = await pool.request().query(`
      SELECT TOP 10
        c.id_curso,
        c.titulo,
        COUNT(cert.id_certificado) as cantidad_certificados
      FROM Cursos c
      INNER JOIN Certificados cert ON c.id_curso = cert.id_curso
      GROUP BY c.id_curso, c.titulo
      ORDER BY cantidad_certificados DESC
    `);
    
    const stats = statsQuery.recordset[0];
    
    res.render('admin/certificados-admin', {
      title: 'Gestión de Certificados',
      totalCertificados: stats.total_certificados || 0,
      certificadosMes: stats.certificados_mes || 0,
      progresosCompletados: stats.progresos_completados || 0,
      certificados: certificadosResult.recordset,
      cursos: cursosQuery.recordset,
      cursosTop: cursosTopQuery.recordset,
      search: search,
      filtro_curso: curso,
      user: req.session.user
    });
  } catch (err) {
    console.error('Error al cargar certificados:', err);
    
    // Vista de error según el rol
    const userRole = req.session.user.rol;
    
    if (userRole === 'user') {
      return res.render('user/certificados-user', {
        title: 'Mis Certificados',
        misCertificados: [],
        cursosCompletados: 0,
        horasEstudio: 0,
        progreso: 0,
        user: req.session.user,
        error: 'Error al cargar certificados: ' + err.message
      });
    }
    
    // Renderizar vista de error con datos por defecto para admin/instructor
    res.render('admin/certificados-admin', {
      title: 'Gestión de Certificados',
      totalCertificados: 0,
      certificadosMes: 0,
      progresosCompletados: 0,
      certificados: [],
      cursos: [],
      cursosTop: [],
      search: req.query.search || '',
      filtro_curso: req.query.curso || '',
      user: req.session.user,
      error: 'Error al cargar certificados: ' + err.message
    });
  }
});

// GET - Detalles de un certificado
router.get('/:id', async (req, res) => {
  try {
    const pool = await connect();
    const { id } = req.params;
    
    const certificadoQuery = await pool.request()
      .input('id', sql.Int, id)
      .query(`
        SELECT 
          cert.*,
          u.nombre + ' ' + u.apellido as usuario_nombre,
          u.email as usuario_email,
          c.titulo as curso_titulo,
          c.descripcion as curso_descripcion,
          inst.nombre + ' ' + inst.apellido as instructor_nombre
        FROM Certificados cert
        INNER JOIN Usuarios u ON cert.id_usuario = u.id_usuario
        INNER JOIN Cursos c ON cert.id_curso = c.id_curso
        INNER JOIN Usuarios inst ON c.id_usuario = inst.id_usuario
        WHERE cert.id_certificado = @id
      `);
    
    if (certificadoQuery.recordset.length === 0) {
      return res.status(404).json({ error: 'Certificado no encontrado' });
    }
    
    res.json(certificadoQuery.recordset[0]);
  } catch (err) {
    console.error('Error al obtener certificado:', err);
    res.status(500).json({ error: err.message });
  }
});

// POST - Emitir nuevo certificado
router.post('/', async (req, res) => {
  try {
    const pool = await connect();
    const { id_usuario, id_curso } = req.body;
    
    // Generar código único de validación
    const codigo_validacion = crypto.randomBytes(16).toString('hex').toUpperCase();
    
    // Verificar si ya existe un certificado
    const existeQuery = await pool.request()
      .input('id_usuario', sql.Int, id_usuario)
      .input('id_curso', sql.Int, id_curso)
      .query(`
        SELECT COUNT(*) as count 
        FROM Certificados 
        WHERE id_usuario = @id_usuario AND id_curso = @id_curso
      `);
    
    if (existeQuery.recordset[0].count > 0) {
      return res.status(400).json({ error: 'El usuario ya tiene un certificado para este curso' });
    }
    
    // Insertar el certificado
    await pool.request()
      .input('id_usuario', sql.Int, id_usuario)
      .input('id_curso', sql.Int, id_curso)
      .input('codigo_validacion', sql.NVarChar, codigo_validacion)
      .input('fecha_emision', sql.Date, new Date())
      .query(`
        INSERT INTO Certificados (id_usuario, id_curso, fecha_emision, codigo_validacion)
        VALUES (@id_usuario, @id_curso, @fecha_emision, @codigo_validacion)
      `);
    
    res.json({ success: true, message: 'Certificado emitido exitosamente', codigo: codigo_validacion });
  } catch (err) {
    console.error('Error al emitir certificado:', err);
    res.status(500).json({ error: err.message });
  }
});

// DELETE - Revocar certificado
router.delete('/:id', async (req, res) => {
  try {
    const pool = await connect();
    const { id } = req.params;
    
    await pool.request()
      .input('id', sql.Int, id)
      .query('DELETE FROM Certificados WHERE id_certificado = @id');
    
    res.json({ success: true, message: 'Certificado revocado exitosamente' });
  } catch (err) {
    console.error('Error al revocar certificado:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET - Verificar certificado por código
router.get('/verificar/:codigo', async (req, res) => {
  try {
    const pool = await connect();
    const { codigo } = req.params;
    
    const certificadoQuery = await pool.request()
      .input('codigo', sql.NVarChar, codigo)
      .query(`
        SELECT 
          cert.*,
          u.nombre + ' ' + u.apellido as usuario_nombre,
          c.titulo as curso_titulo,
          inst.nombre + ' ' + inst.apellido as instructor_nombre
        FROM Certificados cert
        INNER JOIN Usuarios u ON cert.id_usuario = u.id_usuario
        INNER JOIN Cursos c ON cert.id_curso = c.id_curso
        INNER JOIN Usuarios inst ON c.id_usuario = inst.id_usuario
        WHERE cert.codigo_validacion = @codigo
      `);
    
    if (certificadoQuery.recordset.length === 0) {
      return res.status(404).json({ valid: false, message: 'Certificado no encontrado' });
    }
    
    res.json({ valid: true, certificado: certificadoQuery.recordset[0] });
  } catch (err) {
    console.error('Error al verificar certificado:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET - API para obtener usuarios activos (para el modal de emisión)
router.get('/api/usuarios', async (req, res) => {
  try {
    const pool = await connect();
    
    const usuariosQuery = await pool.request().query(`
      SELECT 
        id_usuario,
        nombre,
        apellido,
        email
      FROM Usuarios
      WHERE activo = 1
      ORDER BY nombre, apellido
    `);
    
    res.json({ 
      success: true, 
      usuarios: usuariosQuery.recordset 
    });
  } catch (err) {
    console.error('Error al obtener usuarios:', err);
    res.status(500).json({ 
      success: false, 
      error: err.message 
    });
  }
});

module.exports = router;
