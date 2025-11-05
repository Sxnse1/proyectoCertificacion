const express = require('express');
const router = express.Router();
const { requireRole } = require('../../middleware/auth');

// Dashboard principal de administrador
router.get('/', requireRole(['admin']), async (req, res) => {
    try {
        const db = req.app.locals.db;

        // Ejecutar todas las consultas en paralelo para mejor rendimiento
        const [
            estudiantesActivosResult,
            cursosPublicadosResult,
            ingresosMesResult,
            certificadosEmitidosResult,
            actividadRecienteResult,
            cursosPopularesResult
        ] = await Promise.all([
            // 1. Estudiantes activos (usuarios con rol 'user' y estatus 'activo')
            db.request().query(`
                SELECT COUNT(*) as total 
                FROM Usuarios 
                WHERE rol IN ('user', 'estudiante') 
                AND estatus = 'activo'
            `),

            // 2. Cursos publicados
            db.request().query(`
                SELECT COUNT(*) as total 
                FROM Cursos 
                WHERE estatus = 'publicado'
            `),

            // 3. Ingresos del último mes (usando tanto Compras como Historial_Pagos)
            db.request().query(`
                SELECT ISNULL(
                    (SELECT SUM(monto) FROM Compras WHERE fecha_compra >= DATEADD(month, -1, GETDATE())) +
                    (SELECT SUM(monto) FROM Historial_Pagos WHERE fecha_pago >= DATEADD(month, -1, GETDATE()) AND estatus = 'completado'),
                    0
                ) as total
            `),

            // 4. Certificados emitidos
            db.request().query(`
                SELECT COUNT(*) as total 
                FROM Certificados
            `),

            // 5. Actividad reciente (últimas 5 compras)
            db.request().query(`
                SELECT TOP 5 
                    u.nombre, 
                    u.apellido, 
                    c.titulo, 
                    comp.fecha_compra,
                    comp.monto
                FROM Compras comp 
                JOIN Usuarios u ON comp.id_usuario = u.id_usuario 
                JOIN Cursos c ON comp.id_curso = c.id_curso 
                ORDER BY comp.fecha_compra DESC
            `),

            // 6. Cursos más populares (por número de compras)
            db.request().query(`
                SELECT TOP 3 
                    c.titulo, 
                    COUNT(comp.id_compra) as total_compras,
                    c.precio
                FROM Cursos c 
                LEFT JOIN Compras comp ON c.id_curso = comp.id_curso 
                GROUP BY c.titulo, c.precio
                HAVING COUNT(comp.id_compra) > 0
                ORDER BY total_compras DESC
            `)
        ]);

        // Extraer los datos de los resultados
        const stats = {
            estudiantesActivos: estudiantesActivosResult.recordset[0].total,
            cursosPublicados: cursosPublicadosResult.recordset[0].total,
            ingresosMes: parseFloat(ingresosMesResult.recordset[0].total) || 0,
            certificadosEmitidos: certificadosEmitidosResult.recordset[0].total
        };

        const actividadReciente = actividadRecienteResult.recordset;
        const cursosPopulares = cursosPopularesResult.recordset;

        // Renderizar la vista del dashboard
        res.render('admin/admin-dashboard', {
            title: 'Dashboard Administrativo - StartEducation',
            stats: stats,
            actividadReciente: actividadReciente,
            cursosPopulares: cursosPopulares,
            layout: 'layouts/admin',
            user: req.session.user
        });

    } catch (error) {
        console.error('Error al cargar el dashboard de admin:', error);
        res.status(500).render('error', {
            title: 'Error del Servidor',
            message: 'Error al cargar el dashboard administrativo',
            error: process.env.NODE_ENV === 'development' ? error : {}
        });
    }
});

module.exports = router;