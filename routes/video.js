var express = require('express');
var router = express.Router();

/* GET video player page */
router.get('/', function(req, res, next) {
  const { videoId, title, description, simple, duration, order, status, module, createdAt } = req.query;
  
  // La autenticación ya se verifica en el middleware
  const user = req.session.user;
  
  console.log('[VIDEO] 🎬 Acceso a video:', user.email, '- Video ID:', videoId);
  
  // Usar la vista de video-player disponible
  let template = 'video-player';
  
  res.render(template, {
    title: title || 'Reproducción de Video',
    videoTitle: title || 'Video del Curso',
    videoDescription: description || 'Contenido educativo del curso de barbería',
    userName: user.nombre,
    userEmail: user.email,
    userRole: user.rol,
    videoId: videoId || '1122531979', // ID por defecto del video de Vimeo
    videoDuration: duration || null,
    videoOrder: order || 1,
    videoStatus: status || 'publicado',
    moduleId: module || null,
    videoCreatedAt: createdAt || new Date().toISOString()
  });
});

/* GET video simple (sin espacios extra) */
router.get('/simple', function(req, res, next) {
  const { videoId, title, description, user, email, rol } = req.query;
  
  // Si no hay parámetros de usuario, redirigir al login
  if (!user || !email) {
    return res.redirect('/auth/login');
  }
  
  res.render('video-player', {
    title: title || 'Reproducción de Video',
    videoTitle: title || 'Video del Curso',
    videoDescription: description || 'Contenido educativo del curso de barbería',
    userName: user,
    userEmail: email,
    userRole: rol,
    videoId: videoId || '1122531979' // ID por defecto del video de Vimeo
  });
});

/* GET video específico por ID */
router.get('/:videoId', function(req, res, next) {
  const { videoId } = req.params;
  const { title, description, duration, order, status, module, createdAt } = req.query;
  
  // La autenticación ya se verifica en el middleware
  const user = req.session.user;
  
  console.log('[VIDEO] 🎬 Acceso a video específico:', user.email, '- Video ID:', videoId);
  
  res.render('video-player', {
    title: `Video: ${title || 'Contenido del Curso'}`,
    videoTitle: title || 'Video del Curso',
    videoDescription: description || 'Contenido educativo del curso de barbería',
    userName: user.nombre,
    userEmail: user.email,
    userRole: user.rol,
    videoId: videoId,
    videoDuration: duration || null,
    videoOrder: order || 1,
    videoStatus: status || 'publicado',
    moduleId: module || null,
    videoCreatedAt: createdAt || new Date().toISOString()
  });
});

module.exports = router;