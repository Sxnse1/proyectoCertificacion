const express = require('express');
const router = express.Router();

// GET - Vista principal de analytics
router.get('/', async (req, res) => {
  try {
    const user = req.session.user;
    const db = req.app.locals.db;
    
    if (!db) {
      console.log('[ANALYTICS] Sin conexión a BD - mostrando datos demo');
      return res.render('admin/analytics-admin', {
        title: 'Analytics Dashboard',
        user: user,
        isInstructor: user.tipo_usuario === 'instructor',
        analytics: getDemoAnalytics(user)
      });
    }

    const isInstructor = user.tipo_usuario === 'instructor';
    let analytics = {};

    if (isInstructor) {
      // Analytics específicos para instructor
      const instructorId = user.id_usuario;

      // KPIs principales del instructor (usando datos demo por simplicidad)
      analytics = {
        userName: `${user.nombre} ${user.apellido}`,
        kpis: {
          total_cursos: 5,
          cursos_publicados: 4,
          total_estudiantes: 234,
          estudiantes_mes: 23,
          ingresos_totales: 4567.89,
          ingresos_mes: 789.45,
          calificacion_promedio: 4.7,
          total_valoraciones: 89
        },
        topCourses: [
          {
            titulo: 'JavaScript Avanzado',
            precio: 99.99,
            total_ventas: 45,
            ingresos_curso: 4499.55,
            calificacion_promedio: 4.8,
            total_valoraciones: 23
          },
          {
            titulo: 'React.js Completo',
            precio: 79.99,
            total_ventas: 38,
            ingresos_curso: 3039.62,
            calificacion_promedio: 4.6,
            total_valoraciones: 19
          }
        ],
        monthlyRevenue: [
          { mes: '2024-01', ingresos: 1234.56 },
          { mes: '2024-02', ingresos: 1567.89 },
          { mes: '2024-03', ingresos: 1789.45 }
        ],
        studentProgress: [
          {
            curso: 'JavaScript Avanzado',
            estudiantes_inscritos: 45,
            total_videos: 24,
            videos_completados: 18,
            porcentaje_completado: 75.0
          },
          {
            curso: 'React.js Completo',
            estudiantes_inscritos: 38,
            total_videos: 32,
            videos_completados: 20,
            porcentaje_completado: 62.5
          }
        ]
      };

    } else {
      // Analytics para administradores (vista general)
      analytics = {
        kpis: {
          total_usuarios: 1247,
          total_instructores: 23,
          total_estudiantes: 1224,
          usuarios_mes: 89,
          total_cursos: 156,
          cursos_publicados: 134,
          total_compras: 2345,
          ingresos_totales: 89567.43,
          ingresos_mes: 12345.67,
          calificacion_promedio_plataforma: 4.5
        },
        topInstructors: [
          {
            instructor: 'Juan Pérez',
            total_cursos: 8,
            total_ventas: 234,
            ingresos_totales: 12345.67,
            calificacion_promedio: 4.8
          },
          {
            instructor: 'María García',
            total_cursos: 6,
            total_ventas: 189,
            ingresos_totales: 9876.54,
            calificacion_promedio: 4.7
          }
        ],
        topCategories: [
          {
            categoria: 'Programación',
            total_cursos: 45,
            total_ventas: 867,
            ingresos_categoria: 34567.89,
            calificacion_promedio: 4.6
          },
          {
            categoria: 'Diseño',
            total_cursos: 23,
            total_ventas: 456,
            ingresos_categoria: 23456.78,
            calificacion_promedio: 4.4
          }
        ],
        userGrowth: [
          { mes: '2024-01', nuevos_usuarios: 45 },
          { mes: '2024-02', nuevos_usuarios: 67 },
          { mes: '2024-03', nuevos_usuarios: 89 }
        ]
      };
    }

    res.render('admin/analytics-admin', {
      title: 'Analytics Dashboard',
      user: user,
      isInstructor: isInstructor,
      analytics: analytics
    });

  } catch (error) {
    console.error('[ANALYTICS] Error:', error);
    res.render('admin/analytics-admin', {
      title: 'Analytics Dashboard',
      user: req.session.user,
      isInstructor: req.session.user.tipo_usuario === 'instructor',
      analytics: getDemoAnalytics(req.session.user)
    });
  }
});

// GET - API endpoint para datos en tiempo real
router.get('/api/realtime', async (req, res) => {
  try {
    const user = req.session.user;
    const db = req.app.locals.db;
    
    // Datos demo para tiempo real
    const realtimeData = {
      timestamp: new Date().toISOString(),
      activeUsers: Math.floor(Math.random() * 100) + 1,
      activeInstructors: Math.floor(Math.random() * 20) + 1,
      todaySales: Math.floor(Math.random() * 50) + 1
    };

    res.json({
      success: true,
      timestamp: new Date().toISOString(),
      data: realtimeData
    });

  } catch (error) {
    console.error('[ANALYTICS API] Error:', error);
    res.status(500).json({
      success: false,
      message: 'Error obteniendo datos en tiempo real'
    });
  }
});

// Función para generar datos demo cuando no hay conexión a BD
function getDemoAnalytics(user) {
  const isInstructor = user.tipo_usuario === 'instructor';
  
  if (isInstructor) {
    return {
      userName: `${user.nombre} ${user.apellido}`,
      kpis: {
        total_cursos: 5,
        cursos_publicados: 4,
        total_estudiantes: 234,
        estudiantes_mes: 23,
        ingresos_totales: 4567.89,
        ingresos_mes: 789.45,
        calificacion_promedio: 4.7,
        total_valoraciones: 89
      },
      topCourses: [
        {
          titulo: 'JavaScript Avanzado',
          precio: 99.99,
          total_ventas: 45,
          ingresos_curso: 4499.55,
          calificacion_promedio: 4.8,
          total_valoraciones: 23
        },
        {
          titulo: 'React.js Completo',
          precio: 79.99,
          total_ventas: 38,
          ingresos_curso: 3039.62,
          calificacion_promedio: 4.6,
          total_valoraciones: 19
        }
      ],
      monthlyRevenue: [
        { mes: '2024-01', ingresos: 1234.56 },
        { mes: '2024-02', ingresos: 1567.89 },
        { mes: '2024-03', ingresos: 1789.45 }
      ],
      studentProgress: [
        {
          curso: 'JavaScript Avanzado',
          estudiantes_inscritos: 45,
          total_videos: 24,
          videos_completados: 18,
          porcentaje_completado: 75.0
        },
        {
          curso: 'React.js Completo',
          estudiantes_inscritos: 38,
          total_videos: 32,
          videos_completados: 20,
          porcentaje_completado: 62.5
        }
      ]
    };
  } else {
    return {
      kpis: {
        total_usuarios: 1247,
        total_instructores: 23,
        total_estudiantes: 1224,
        usuarios_mes: 89,
        total_cursos: 156,
        cursos_publicados: 134,
        total_compras: 2345,
        ingresos_totales: 89567.43,
        ingresos_mes: 12345.67,
        calificacion_promedio_plataforma: 4.5
      },
      topInstructors: [
        {
          instructor: 'Juan Pérez',
          total_cursos: 8,
          total_ventas: 234,
          ingresos_totales: 12345.67,
          calificacion_promedio: 4.8
        },
        {
          instructor: 'María García',
          total_cursos: 6,
          total_ventas: 189,
          ingresos_totales: 9876.54,
          calificacion_promedio: 4.7
        }
      ],
      topCategories: [
        {
          categoria: 'Programación',
          total_cursos: 45,
          total_ventas: 867,
          ingresos_categoria: 34567.89,
          calificacion_promedio: 4.6
        },
        {
          categoria: 'Diseño',
          total_cursos: 23,
          total_ventas: 456,
          ingresos_categoria: 23456.78,
          calificacion_promedio: 4.4
        }
      ],
      userGrowth: [
        { mes: '2024-01', nuevos_usuarios: 45 },
        { mes: '2024-02', nuevos_usuarios: 67 },
        { mes: '2024-03', nuevos_usuarios: 89 }
      ]
    };
  }
}

module.exports = router;