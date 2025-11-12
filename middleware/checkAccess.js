// middleware/checkAccess.js

const { getPool } = require('../config/database'); // Importa el pool de conexión

/**
 * Middleware para verificar si un usuario tiene acceso a un video.
 * El acceso se concede si:
 * 1. El usuario tiene una suscripción activa (estatus = 'activa').
 * 2. O, el usuario ha comprado el curso individual al que pertenece el video.
 *
 * Este middleware DEBE ir después de ensureAuthenticated.
 */
const checkVideoAccess = async (req, res, next) => {
    try {
        const id_usuario = req.session.user.id; // Obtenido de la sesión después de login
        const id_video = req.params.videoId || req.params.id_video;   // Obtenido de la URL (compatible con ambas rutas)

        if (!id_usuario || !id_video) {
            console.log('[CHECK ACCESS] ❌ Solicitud inválida - Usuario o Video faltante');
            return res.redirect('/?error=' + encodeURIComponent('Solicitud inválida'));
        }

        console.log(`[CHECK ACCESS] 🔍 Verificando acceso - Usuario: ${id_usuario}, Video: ${id_video}`);

        const pool = getPool();
        
        // --- Verificación 1: ¿Tiene suscripción activa? ---
        const subsRequest = pool.request();
        subsRequest.input('id_usuario', id_usuario);
        
        const subsQuery = await subsRequest.query(
            "SELECT COUNT(*) AS count FROM Suscripciones WHERE id_usuario = @id_usuario AND estatus = 'activa'"
        );

        if (subsQuery.recordset[0].count > 0) {
            // ¡Acceso concedido! El usuario tiene una suscripción activa.
            console.log(`[CHECK ACCESS] ✅ Acceso concedido por suscripción activa - Usuario: ${id_usuario}`);
            return next();
        }

        console.log(`[CHECK ACCESS] ⏭️ Sin suscripción activa, verificando compra individual - Usuario: ${id_usuario}`);

        // --- Verificación 2: Si no hay suscripción, ¿Compró el curso? ---
        
        // Primero, encontrar a qué curso pertenece el video
        const videoRequest = pool.request();
        videoRequest.input('id_video', id_video);
        const cursoQuery = await videoRequest.query(`
            SELECT M.id_curso 
            FROM Video V
            JOIN Modulos M ON V.id_modulo = M.id_modulo
            WHERE V.id_video = @id_video
        `);

        if (cursoQuery.recordset.length === 0) {
            console.log(`[CHECK ACCESS] ❌ Video no encontrado - ID: ${id_video}`);
            return res.redirect('/dashboard?error=' + encodeURIComponent('Video no encontrado'));
        }

        const id_curso = cursoQuery.recordset[0].id_curso;
        console.log(`[CHECK ACCESS] 🎯 Video pertenece al curso: ${id_curso}`);

        // Ahora, verificamos si existe una compra para ese usuario y ese curso
        const compraRequest = pool.request();
        compraRequest.input('id_usuario', id_usuario);
        compraRequest.input('id_curso', id_curso);
        
        const compraQuery = await compraRequest.query(
            "SELECT COUNT(*) AS count FROM Compras WHERE id_usuario = @id_usuario AND id_curso = @id_curso"
        );

        if (compraQuery.recordset[0].count > 0) {
            // ¡Acceso concedido! El usuario compró este curso individualmente.
            console.log(`[CHECK ACCESS] ✅ Acceso concedido por compra individual - Usuario: ${id_usuario}, Curso: ${id_curso}`);
            return next();
        }

        // --- Sin Acceso ---
        console.log(`[CHECK ACCESS] 🚫 Acceso denegado - Usuario: ${id_usuario}, Video: ${id_video}, Curso: ${id_curso}`);
        return res.redirect(`/curso/${id_curso}?error=` + encodeURIComponent('No tienes acceso a este contenido. Considera suscribirte o comprar el curso.')); // Redirigir a la página del curso

    } catch (error) {
        console.error('[CHECK ACCESS] ❌ Error en middleware checkVideoAccess:', error);
        return res.redirect('/?error=' + encodeURIComponent('Ocurrió un error al verificar tu acceso'));
    }
};

module.exports = {
    checkVideoAccess
};