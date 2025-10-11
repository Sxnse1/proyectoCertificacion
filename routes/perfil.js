const express = require('express');
const router = express.Router();
const sql = require('mssql');
const config = require('../config/database');
const bcrypt = require('bcryptjs');

// GET - Vista del perfil del usuario
router.get('/', async (req, res) => {
  try {
    const user = req.session.user;
    const pool = await sql.connect(config);
    
    // Obtener información completa del usuario
    const userQuery = await pool.request()
      .input('userId', sql.Int, user.id)
      .query(`
        SELECT 
          id_usuario,
          nombre,
          apellido,
          nombre_usuario,
          email,
          rol,
          estatus,
          fecha_registro,
          FORMAT(fecha_registro, 'dd/MM/yyyy HH:mm') as fecha_registro_formateada
        FROM Usuarios 
        WHERE id_usuario = @userId
      `);
    
    if (userQuery.recordset.length === 0) {
      return res.redirect('/auth/login?error=usuario_no_encontrado');
    }
    
    const userData = userQuery.recordset[0];
    
    // Estadísticas según el rol del usuario
    let stats = {};
    
    if (userData.rol === 'instructor') {
      // Estadísticas para instructores
      const instructorStats = await pool.request()
        .input('userId', sql.Int, user.id)
        .query(`
          SELECT 
            COUNT(DISTINCT c.id_curso) as cursos_creados,
            COUNT(DISTINCT comp.id_compra) as ventas_totales,
            ISNULL(SUM(comp.monto), 0) as ingresos_totales,
            COUNT(DISTINCT v.id_valoracion) as valoraciones_recibidas,
            ISNULL(AVG(CAST(v.calificacion as FLOAT)), 0) as calificacion_promedio,
            COUNT(DISTINCT prog.id_usuario) as estudiantes_totales
          FROM Usuarios u
          LEFT JOIN Cursos c ON u.id_usuario = c.id_usuario
          LEFT JOIN Compras comp ON c.id_curso = comp.id_curso
          LEFT JOIN Valoraciones v ON c.id_curso = v.id_curso
          LEFT JOIN Progreso prog ON c.id_curso = prog.id_video AND EXISTS (
            SELECT 1 FROM Video vid WHERE vid.id_video = prog.id_video AND vid.id_modulo IN (
              SELECT m.id_modulo FROM Modulos m WHERE m.id_curso = c.id_curso
            )
          )
          WHERE u.id_usuario = @userId
        `);
      
      stats = instructorStats.recordset[0];
      stats.calificacion_promedio = Math.round(stats.calificacion_promedio * 10) / 10;
      
    } else {
      // Estadísticas para estudiantes
      const studentStats = await pool.request()
        .input('userId', sql.Int, user.id)
        .query(`
          SELECT 
            COUNT(DISTINCT comp.id_curso) as cursos_comprados,
            COUNT(DISTINCT prog.id_video) as videos_completados,
            COUNT(DISTINCT cert.id_certificado) as certificados_obtenidos,
            COUNT(DISTINCT fav.id_curso) as cursos_favoritos,
            ISNULL(SUM(comp.monto), 0) as total_invertido,
            COUNT(DISTINCT v.id_valoracion) as valoraciones_dadas
          FROM Usuarios u
          LEFT JOIN Compras comp ON u.id_usuario = comp.id_usuario
          LEFT JOIN Progreso prog ON u.id_usuario = prog.id_usuario AND prog.completado = 1
          LEFT JOIN Certificados cert ON u.id_usuario = cert.id_usuario
          LEFT JOIN Favoritos fav ON u.id_usuario = fav.id_usuario
          LEFT JOIN Valoraciones v ON u.id_usuario = v.id_usuario
          WHERE u.id_usuario = @userId
        `);
      
      stats = studentStats.recordset[0];
    }
    
    // Actividad reciente
    const activityQuery = await pool.request()
      .input('userId', sql.Int, user.id)
      .query(`
        SELECT TOP 10 
          'Compra' as tipo,
          c.titulo as descripcion,
          comp.fecha_compra as fecha,
          comp.monto as valor
        FROM Compras comp
        INNER JOIN Cursos c ON comp.id_curso = c.id_curso
        WHERE comp.id_usuario = @userId
        
        UNION ALL
        
        SELECT TOP 10
          'Progreso' as tipo,
          'Video completado: ' + v.titulo as descripcion,
          prog.fecha_completado as fecha,
          NULL as valor
        FROM Progreso prog
        INNER JOIN Video v ON prog.id_video = v.id_video
        WHERE prog.id_usuario = @userId AND prog.completado = 1 AND prog.fecha_completado IS NOT NULL
        
        ORDER BY fecha DESC
      `);
    
    const recentActivity = activityQuery.recordset.map(activity => ({
      ...activity,
      fecha_formateada: new Date(activity.fecha).toLocaleDateString('es-ES', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      }),
      tiempo_transcurrido: getTimeAgo(activity.fecha)
    }));
    
    res.render('perfil', {
      title: 'Mi Perfil - StartEducation',
      user: userData,
      stats: stats,
      recentActivity: recentActivity,
      isInstructor: userData.rol === 'instructor',
      isStudent: userData.rol === 'user',
      layout: false
    });
    
  } catch (err) {
    console.error('Error al cargar perfil:', err);
    res.status(500).send('Error al cargar perfil');
  }
});

// POST - Actualizar información del perfil
router.post('/actualizar', async (req, res) => {
  try {
    const user = req.session.user;
    const { nombre, apellido, nombre_usuario, email } = req.body;
    
    // Validaciones básicas
    if (!nombre || !apellido || !nombre_usuario || !email) {
      return res.status(400).json({ 
        success: false, 
        error: 'Todos los campos son obligatorios' 
      });
    }
    
    const pool = await sql.connect(config);
    
    // Verificar si el nuevo nombre de usuario o email ya existen (excluyendo el usuario actual)
    const checkQuery = await pool.request()
      .input('userId', sql.Int, user.id)
      .input('nombreUsuario', sql.NVarChar, nombre_usuario)
      .input('email', sql.NVarChar, email)
      .query(`
        SELECT 
          COUNT(CASE WHEN nombre_usuario = @nombreUsuario AND id_usuario != @userId THEN 1 END) as nombre_usuario_existe,
          COUNT(CASE WHEN email = @email AND id_usuario != @userId THEN 1 END) as email_existe
        FROM Usuarios
      `);
    
    const check = checkQuery.recordset[0];
    
    if (check.nombre_usuario_existe > 0) {
      return res.status(400).json({ 
        success: false, 
        error: 'El nombre de usuario ya está en uso' 
      });
    }
    
    if (check.email_existe > 0) {
      return res.status(400).json({ 
        success: false, 
        error: 'El email ya está registrado' 
      });
    }
    
    // Actualizar información del usuario
    await pool.request()
      .input('userId', sql.Int, user.id)
      .input('nombre', sql.NVarChar, nombre)
      .input('apellido', sql.NVarChar, apellido)
      .input('nombreUsuario', sql.NVarChar, nombre_usuario)
      .input('email', sql.NVarChar, email)
      .query(`
        UPDATE Usuarios 
        SET 
          nombre = @nombre,
          apellido = @apellido,
          nombre_usuario = @nombreUsuario,
          email = @email
        WHERE id_usuario = @userId
      `);
    
    // Actualizar información en la sesión
    req.session.user.nombre = nombre;
    req.session.user.apellido = apellido;
    req.session.user.nombre_usuario = nombre_usuario;
    req.session.user.email = email;
    
    res.json({ 
      success: true, 
      message: 'Perfil actualizado exitosamente' 
    });
    
  } catch (err) {
    console.error('Error al actualizar perfil:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST - Cambiar contraseña
router.post('/cambiar-password', async (req, res) => {
  try {
    const user = req.session.user;
    const { currentPassword, newPassword, confirmPassword } = req.body;
    
    // Validaciones
    if (!currentPassword || !newPassword || !confirmPassword) {
      return res.status(400).json({ 
        success: false, 
        error: 'Todos los campos son obligatorios' 
      });
    }
    
    if (newPassword !== confirmPassword) {
      return res.status(400).json({ 
        success: false, 
        error: 'Las contraseñas no coinciden' 
      });
    }
    
    if (newPassword.length < 6) {
      return res.status(400).json({ 
        success: false, 
        error: 'La contraseña debe tener al menos 6 caracteres' 
      });
    }
    
    const pool = await sql.connect(config);
    
    // Obtener contraseña actual
    const userQuery = await pool.request()
      .input('userId', sql.Int, user.id)
      .query('SELECT password FROM Usuarios WHERE id_usuario = @userId');
    
    if (userQuery.recordset.length === 0) {
      return res.status(404).json({ 
        success: false, 
        error: 'Usuario no encontrado' 
      });
    }
    
    const userData = userQuery.recordset[0];
    
    // Verificar contraseña actual
    const isCurrentPasswordValid = await bcrypt.compare(currentPassword, userData.password);
    
    if (!isCurrentPasswordValid) {
      return res.status(400).json({ 
        success: false, 
        error: 'La contraseña actual es incorrecta' 
      });
    }
    
    // Hashear nueva contraseña
    const hashedNewPassword = await bcrypt.hash(newPassword, 10);
    
    // Actualizar contraseña
    await pool.request()
      .input('userId', sql.Int, user.id)
      .input('newPassword', sql.NVarChar, hashedNewPassword)
      .query('UPDATE Usuarios SET password = @newPassword WHERE id_usuario = @userId');
    
    res.json({ 
      success: true, 
      message: 'Contraseña actualizada exitosamente' 
    });
    
  } catch (err) {
    console.error('Error al cambiar contraseña:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Función auxiliar para calcular tiempo transcurrido
function getTimeAgo(date) {
  const now = new Date();
  const diff = now - new Date(date);
  const minutes = Math.floor(diff / (1000 * 60));
  
  if (minutes < 1) return 'Ahora';
  if (minutes < 60) return `${minutes} min`;
  
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} h`;
  
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days} días`;
  
  const months = Math.floor(days / 30);
  if (months < 12) return `${months} meses`;
  
  const years = Math.floor(months / 12);
  return `${years} años`;
}

module.exports = router;