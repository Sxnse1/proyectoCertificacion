var express = require('express');
var router = express.Router();

/* GET dashboard - Redirige según el rol del usuario */
router.get('/', function(req, res, next) {
  const { user, email, rol, id } = req.query;
  
  // Verificar autenticación
  if (!user || !email || !rol || !id) {
    return res.redirect('/auth/login');
  }
  
  // Redirigir según el rol
  if (rol === 'instructor') {
    res.render('instructor-dashboard', {
      title: 'Dashboard Instructor - StarEducation',
      userName: user,
      userEmail: email,
      userRole: rol,
      userId: id
    });
  } else if (rol === 'user') {
    res.redirect(`/cursos?user=${user}&email=${email}&rol=${rol}&id=${id}`);
  } else {
    res.redirect('/auth/login?error=rol_invalido');
  }
});

module.exports = router;