var express = require('express');
var router = express.Router();
const emailService = require('../../services/emailService');

/* POST contact form */
router.post('/', async function(req, res, next) {
  try {
    console.log('[CONTACT] 📨 Nueva solicitud de contacto recibida');
    
    const { nombre, email, asunto, mensaje } = req.body;
    
    // Logging detallado para debugging
    console.log('[CONTACT] 📋 Datos recibidos:', {
      nombre: nombre ? 'Presente' : 'Faltante',
      email: email ? 'Presente' : 'Faltante', 
      asunto: asunto ? 'Presente' : 'Faltante',
      mensaje: mensaje ? `${mensaje.length} caracteres` : 'Faltante'
    });
    
    // Validación básica
    if (!nombre || !email || !asunto || !mensaje) {
      console.log('[CONTACT] ❌ Validación fallida: campos faltantes');
      return res.status(400).json({ 
        error: 'Todos los campos son requeridos' 
      });
    }
    
    // Sanitizar datos
    const nombreClean = nombre.trim();
    const emailClean = email.trim().toLowerCase();
    const asuntoClean = asunto.trim();
    const mensajeClean = mensaje.trim();
    
    // Validaciones adicionales
    if (nombreClean.length < 2) {
      return res.status(400).json({ 
        error: 'El nombre debe tener al menos 2 caracteres' 
      });
    }
    
    if (mensajeClean.length < 10) {
      return res.status(400).json({ 
        error: 'El mensaje debe tener al menos 10 caracteres' 
      });
    }
    
    // Validar email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(emailClean)) {
      console.log('[CONTACT] ❌ Email no válido:', emailClean);
      return res.status(400).json({ 
        error: 'Por favor ingresa un email válido' 
      });
    }
    
    // Mapear asuntos para el email
    const asuntoMap = {
      'consulta-curso': '📚 Información sobre cursos',
      'problemas-acceso': '🔐 Problemas de acceso o login',
      'soporte-tecnico': '🛠️ Soporte técnico',
      'certificacion': '🏆 Certificaciones y diplomas',
      'membresia': '💳 Membresías y pagos',
      'sugerencia': '💡 Sugerencias y feedback',
      'colaboracion': '🤝 Oportunidades de colaboración',
      'otro': '❓ Otro tema'
    };
    
    const asuntoFinal = asuntoMap[asuntoClean] || asuntoClean;
    
    console.log('[CONTACT] 📧 Preparando envío de email para:', {
      nombre: nombreClean,
      email: emailClean,
      asunto: asuntoFinal
    });
    
    // Preparar el contenido del email
    const emailContent = {
      from: process.env.SMTP_USER || 'noreply@starteducation.com',
      to: process.env.CONTACT_EMAIL || process.env.SMTP_USER || 'cesardavila1937@gmail.com',
      replyTo: emailClean,
      subject: `[StartEducation] ${asuntoFinal} - ${nombreClean}`,
      html: `
        <div style="font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif; max-width: 600px; margin: 0 auto; background: #f8fafc;">
          <!-- Header -->
          <div style="background: linear-gradient(135deg, #ea580c 0%, #c2410c 100%); padding: 30px; text-align: center; border-radius: 12px 12px 0 0;">
            <div style="background: rgba(255,255,255,0.1); border-radius: 50%; width: 60px; height: 60px; margin: 0 auto 15px; display: flex; align-items: center; justify-content: center;">
              <span style="font-size: 24px;">📧</span>
            </div>
            <h1 style="color: white; margin: 0; font-size: 24px; font-weight: 700;">StartEducation</h1>
            <p style="color: rgba(255,255,255,0.9); margin: 5px 0 0 0; font-size: 16px;">Nuevo mensaje de contacto</p>
          </div>
          
          <!-- Body -->
          <div style="padding: 30px; background: white;">
            <div style="background: #f1f5f9; padding: 20px; border-radius: 8px; border-left: 4px solid #ea580c; margin-bottom: 25px;">
              <h2 style="color: #1f2937; margin: 0 0 15px 0; font-size: 18px; font-weight: 600;">📋 Información del contacto</h2>
              <div style="display: grid; gap: 8px;">
                <div><strong style="color: #374151;">👤 Nombre:</strong> <span style="color: #1f2937;">${nombreClean}</span></div>
                <div><strong style="color: #374151;">📧 Email:</strong> <span style="color: #1f2937;">${emailClean}</span></div>
                <div><strong style="color: #374151;">🏷️ Categoría:</strong> <span style="color: #1f2937;">${asuntoFinal}</span></div>
                <div><strong style="color: #374151;">📅 Fecha:</strong> <span style="color: #1f2937;">${new Date().toLocaleString('es-ES', { 
                  timeZone: 'America/Mexico_City',
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}</span></div>
              </div>
            </div>
            
            <div style="background: #f8fafc; padding: 20px; border-radius: 8px; border: 1px solid #e5e7eb;">
              <h3 style="color: #1f2937; margin: 0 0 15px 0; font-size: 16px; font-weight: 600;">💬 Mensaje:</h3>
              <div style="background: white; padding: 15px; border-radius: 6px; border-left: 3px solid #ea580c;">
                <p style="line-height: 1.6; color: #374151; margin: 0; white-space: pre-wrap;">${mensajeClean}</p>
              </div>
            </div>
            
            <div style="margin-top: 25px; padding: 15px; background: linear-gradient(135deg, #dbeafe 0%, #e0f2fe 100%); border-radius: 8px; border: 1px solid #bfdbfe;">
              <p style="margin: 0; color: #1e40af; font-size: 14px;">
                <strong>💡 Acción requerida:</strong> Responde directamente a este email o contacta al usuario en: 
                <a href="mailto:${emailClean}" style="color: #ea580c; text-decoration: none; font-weight: 600;">${emailClean}</a>
              </p>
            </div>
          </div>
          
          <!-- Footer -->
          <div style="background: #1f2937; padding: 20px; text-align: center; border-radius: 0 0 12px 12px;">
            <p style="color: #9ca3af; margin: 0; font-size: 14px;">
              © 2025 StartEducation - Academia de Barbería Profesional<br>
              <span style="font-size: 12px; opacity: 0.7;">Este mensaje fue enviado desde el formulario de contacto del sitio web</span>
            </p>
          </div>
        </div>
      `
    };
    
    console.log('[CONTACT] 📤 Programando envío de email...');
    
    // OPTIMIZACIÓN: Envío asíncrono sin bloquear respuesta HTTP
    setImmediate(async () => {
      try {
        await emailService.sendEmail(emailContent);
        console.log('[CONTACT] ✅ Email enviado exitosamente a:', emailContent.to);
      } catch (emailError) {
        console.error('[CONTACT] ❌ Error enviando email:', emailError.message);
        // Email falla en background, pero respuesta ya fue enviada al usuario
      }
    });
    
    // Respuesta inmediata al usuario
    res.json({ 
      success: true,
      message: 'Mensaje enviado exitosamente. Te contactaremos pronto.' 
    });
    
  } catch (error) {
    console.error('[CONTACT] ❌ Error completo:', {
      message: error.message,
      stack: error.stack,
      code: error.code
    });
    
    // Determinar tipo de error para mensaje más específico
    let errorMessage = 'Error interno del servidor. Intenta más tarde.';
    
    if (error.code === 'EAUTH' || error.code === 'ENOTFOUND') {
      errorMessage = 'Error de configuración del servidor de email. Contacta al administrador.';
    } else if (error.code === 'ETIMEDOUT' || error.code === 'ECONNRESET') {
      errorMessage = 'Error de conexión. Verifica tu conexión a internet e intenta nuevamente.';
    }
    
    res.status(500).json({ 
      error: errorMessage,
      code: error.code || 'UNKNOWN'
    });
  }
});

module.exports = router;