const express = require('express');
const router = express.Router();
const emailService = require('../../services/emailService');

/**
 * POST /contacto - Enviar mensaje de contacto
 */
router.post('/', async (req, res) => {
    try {
        const { nombre, email, asunto, mensaje } = req.body;

        // Validar campos requeridos
        if (!nombre || !email || !asunto || !mensaje) {
            return res.status(400).json({
                success: false,
                message: 'Todos los campos son requeridos'
            });
        }

        // Validar email
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({
                success: false,
                message: 'El correo electrónico no es válido'
            });
        }

        console.log('[CONTACTO] 📧 Nuevo mensaje de contacto:', { nombre, email, asunto });

        // Mapear asuntos a texto legible
        const asuntosMap = {
            'consulta-curso': '📚 Información sobre cursos',
            'problemas-acceso': '🔐 Problemas de acceso o login',
            'soporte-tecnico': '🛠️ Soporte técnico',
            'certificacion': '🏆 Certificaciones y diplomas',
            'membresia': '💳 Membresías y pagos',
            'sugerencia': '💡 Sugerencias y feedback',
            'colaboracion': '🤝 Oportunidades de colaboración',
            'otro': '❓ Otro tema'
        };

        const asuntoTexto = asuntosMap[asunto] || asunto;

        // Enviar email al administrador
        const adminEmail = process.env.ADMIN_EMAIL || 'soporte@starteducation.com';
        
        const emailContent = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <div style="background: linear-gradient(135deg, #ea580c 0%, #c2410c 100%); color: white; padding: 20px; border-radius: 10px 10px 0 0;">
                    <h2 style="margin: 0;">📬 Nuevo Mensaje de Contacto</h2>
                </div>
                
                <div style="background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px;">
                    <div style="background: white; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
                        <h3 style="color: #1f2937; margin-top: 0;">Datos del Contacto</h3>
                        <p><strong>Nombre:</strong> ${nombre}</p>
                        <p><strong>Email:</strong> <a href="mailto:${email}">${email}</a></p>
                        <p><strong>Asunto:</strong> ${asuntoTexto}</p>
                    </div>
                    
                    <div style="background: white; padding: 20px; border-radius: 8px;">
                        <h3 style="color: #1f2937; margin-top: 0;">Mensaje</h3>
                        <p style="white-space: pre-wrap;">${mensaje}</p>
                    </div>
                    
                    <div style="margin-top: 20px; padding: 15px; background: #e0f2fe; border-left: 4px solid #0284c7; border-radius: 4px;">
                        <p style="margin: 0; color: #0c4a6e;">
                            <strong>💡 Responde directamente a este email para contactar al usuario.</strong>
                        </p>
                    </div>
                </div>
                
                <div style="text-align: center; padding: 20px; color: #6b7280;">
                    <p style="margin: 0;">StartEducation - Plataforma de Cursos Online</p>
                </div>
            </div>
        `;

        await emailService.sendEmail(
            adminEmail,
            `📬 Nuevo Contacto: ${asuntoTexto}`,
            emailContent,
            email // Reply-to del usuario
        );

        // Enviar email de confirmación al usuario
        const confirmacionContent = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 20px; border-radius: 10px 10px 0 0;">
                    <h2 style="margin: 0;">✅ Mensaje Recibido</h2>
                </div>
                
                <div style="background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px;">
                    <div style="background: white; padding: 20px; border-radius: 8px;">
                        <p>Hola <strong>${nombre}</strong>,</p>
                        
                        <p>Gracias por contactarnos. Hemos recibido tu mensaje y nuestro equipo lo revisará pronto.</p>
                        
                        <p><strong>Resumen de tu consulta:</strong></p>
                        <ul>
                            <li><strong>Asunto:</strong> ${asuntoTexto}</li>
                            <li><strong>Fecha:</strong> ${new Date().toLocaleString('es-MX')}</li>
                        </ul>
                        
                        <div style="margin: 20px 0; padding: 15px; background: #fef3c7; border-left: 4px solid #f59e0b; border-radius: 4px;">
                            <p style="margin: 0; color: #92400e;">
                                <strong>⏱️ Tiempo de respuesta:</strong> Normalmente respondemos en menos de 24 horas.
                            </p>
                        </div>
                        
                        <p>Mientras tanto, puedes explorar nuestros cursos o visitar nuestra sección de ayuda.</p>
                        
                        <div style="text-align: center; margin: 30px 0;">
                            <a href="${process.env.APP_URL || 'http://localhost:3000'}" style="display: inline-block; background: #ea580c; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: bold;">
                                Volver a StartEducation
                            </a>
                        </div>
                        
                        <p style="color: #6b7280; font-size: 0.9em;">Saludos,<br><strong>El equipo de StartEducation</strong></p>
                    </div>
                </div>
            </div>
        `;

        await emailService.sendEmail(
            email,
            '✅ Hemos recibido tu mensaje - StartEducation',
            confirmacionContent
        );

        console.log('[CONTACTO] ✅ Emails enviados correctamente');

        res.json({
            success: true,
            message: 'Tu mensaje ha sido enviado exitosamente. Te responderemos pronto.'
        });

    } catch (error) {
        console.error('[CONTACTO] ❌ Error enviando mensaje:', error);
        res.status(500).json({
            success: false,
            message: 'Ocurrió un error al enviar tu mensaje. Por favor, intenta nuevamente.'
        });
    }
});

module.exports = router;
