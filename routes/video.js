var express = require('express');
var router = express.Router();

/* GET video player page */
router.get('/', function(req, res, next) {
  const { videoId, title, description, user, email, rol, simple } = req.query;
  
  // Si no hay parámetros de usuario, redirigir al login
  if (!user || !email) {
    return res.redirect('/auth/login');
  }
  
  // Usar versión simple si se especifica
  const template = simple === 'true' ? 'video-player-simple' : 'video-player';
  
  res.render(template, {
    title: title || 'Reproducción de Video',
    videoTitle: title || 'Video del Curso',
    videoDescription: description || 'Contenido educativo del curso de barbería',
    userName: user,
    userEmail: email,
    userRole: rol,
    videoId: videoId || '1122531979' // ID por defecto del video de Vimeo
  });
});

/* GET video simple (sin espacios extra) */
router.get('/simple', function(req, res, next) {
  const { videoId, title, description, user, email, rol } = req.query;
  
  // Si no hay parámetros de usuario, redirigir al login
  if (!user || !email) {
    return res.redirect('/auth/login');
  }
  
  res.render('video-player-simple', {
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
  const { title, description, user, email, rol } = req.query;
  
  // Si no hay parámetros de usuario, redirigir al login
  if (!user || !email) {
    return res.redirect('/auth/login');
  }
  
  res.render('video-player', {
    title: `Video: ${title || 'Contenido del Curso'}`,
    videoTitle: title || 'Video del Curso',
    videoDescription: description || 'Contenido educativo del curso de barbería',
    userName: user,
    userEmail: email,
    userRole: rol,
    videoId: videoId
  });
});

module.exports = router;