var express = require('express');
var router = express.Router();

/* GET dashboard - Redirige según el rol del usuario */
router.get('/', function(req, res, next) {
  // La autenticación ya se verifica en el middleware
  const user = req.session.user;
  
  console.log('[DASHBOARD] 🎯 Acceso al dashboard:', user.email, '- Rol:', user.rol);
  
  // Redirigir según el rol
  if (user.rol === 'instructor') {
    res.render('admin/admin-dashboard', {
      title: 'Dashboard Administrativo - StartEducation',
      userName: user.nombre,
      userEmail: user.email,
      userRole: user.rol,
      userId: user.id,
      layout: false
    });
  } else if (user.rol === 'user' || user.rol === 'estudiante') {
    console.log('[DASHBOARD] 👨‍🎓 Redirigiendo estudiante a cursos');
    res.redirect('/cursos');
  } else {
    console.log('[DASHBOARD] ⚠️ Rol no válido:', user.rol);
    res.redirect('/auth/login?error=rol_invalido');
  }
});

module.exports = router;
