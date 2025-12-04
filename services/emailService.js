const nodemailer = require('nodemailer');
const hbs = require('hbs');
const fs = require('fs');
const path = require('path');

class EmailService {
  constructor() {
    this.transporter = null;
    this.init();
  }

  async init() {
    try {
      // Configuración del transportador SMTP
      // En producción deberías usar variables de entorno
      this.transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST || 'smtp.gmail.com',
        port: process.env.SMTP_PORT || 587,
        secure: false, // true para 465, false para otros puertos
        auth: {
          user: process.env.SMTP_USER || '', // Tu email
          pass: process.env.SMTP_PASS || ''  // Tu contraseña de aplicación
        }
      });

      // Verificar la configuración
      if (process.env.SMTP_USER && process.env.SMTP_PASS) {
        await this.transporter.verify();
        console.log('[EMAIL] ✅ Servicio de email configurado correctamente');
      } else {
        console.log('[EMAIL] ⚠️ Variables de entorno SMTP no configuradas');
      }
    } catch (error) {
      console.error('[EMAIL] ❌ Error configurando servicio de email:', error.message);
    }
  }

  /**
   * 🎨 OPTIMIZACIÓN: Renderiza templates de email usando Handlebars
   * @param {string} templateName - Nombre del template (sin .hbs)
   * @param {Object} data - Datos para inyectar en el template
   * @returns {Promise<string>} HTML renderizado
   */
  async renderEmailTemplate(templateName, data) {
    try {
      const templatePath = path.join(__dirname, '..', 'views', 'emails', `${templateName}.hbs`);
      
      // Verificar que el archivo existe
      if (!fs.existsSync(templatePath)) {
        throw new Error(`Template no encontrado: ${templatePath}`);
      }
      
      // Leer el archivo del template
      const templateSource = fs.readFileSync(templatePath, 'utf8');
      
      // Compilar el template con Handlebars
      const template = hbs.compile(templateSource);
      
      // Renderizar con los datos
      return template(data);
      
    } catch (error) {
      console.error(`[EMAIL] ❌ Error renderizando template ${templateName}:`, error.message);
      throw error;
    }
  }

  /**
   * Envía email con contraseña temporal a nuevo usuario
   */
  async enviarPasswordTemporal(email, nombre, apellido, passwordTemporal) {
    try {
      if (!this.transporter || !process.env.SMTP_USER) {
        console.log('[EMAIL] ⚠️ Servicio de email no configurado, mostrando contraseña en consola');
        console.log(`[EMAIL] 📧 Contraseña temporal para ${email}: ${passwordTemporal}`);
        return { success: false, message: 'Servicio de email no configurado' };
      }

      const nombreCompleto = `${nombre} ${apellido}`;
      
      // 🎨 OPTIMIZACIÓN: Usar template Handlebars externo
      const templateHtml = await this.renderEmailTemplate('password-temporal', {
        nombreCompleto,
        email,
        passwordTemporal,
        siteUrl: process.env.SITE_URL || 'http://localhost:3000',
        currentYear: new Date().getFullYear()
      });
      
      const mailOptions = {
        from: {
          name: 'StartEducation - Plataforma de Cursos',
          address: process.env.SMTP_USER
        },
        to: email,
        subject: '🎨 Bienvenido a StartEducation - Tu contraseña temporal',
        html: templateHtml
      };

      const info = await this.transporter.sendMail(mailOptions);
      
      console.log('[EMAIL] ✅ Email enviado exitosamente:', info.messageId);
      console.log('[EMAIL] 📧 Contraseña temporal para', email, ':', passwordTemporal);
      
      return { 
        success: true, 
        message: 'Email enviado correctamente',
        messageId: info.messageId 
      };

    } catch (error) {
      console.error('[EMAIL] ❌ Error enviando email:', error.message);
      console.log(`[EMAIL] 📧 Contraseña temporal para ${email}: ${passwordTemporal}`);
      
      return { 
        success: false, 
        message: 'Error enviando email, contraseña mostrada en consola',
        error: error.message 
      };
    }
  }

  /**
   * Genera el template HTML para el email de contraseña temporal
   */
  generarTemplatePasswordTemporal(nombreCompleto, email, passwordTemporal) {
    return `
    <!DOCTYPE html>
    <html lang="es">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Bienvenido a StartEducation</title>
        <style>
            body { 
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
                margin: 0; 
                padding: 0; 
                background-color: #f5f5f5; 
            }
            .container { 
                max-width: 600px; 
                margin: 20px auto; 
                background-color: #ffffff; 
                border-radius: 10px; 
                box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); 
                overflow: hidden; 
            }
            .header { 
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
                color: white; 
                padding: 30px; 
                text-align: center; 
            }
            .header h1 { 
                margin: 0; 
                font-size: 28px; 
                font-weight: 300; 
            }
            .content { 
                padding: 30px; 
            }
            .welcome-message { 
                font-size: 18px; 
                color: #333; 
                margin-bottom: 20px; 
            }
            .credentials-box { 
                background-color: #f8f9fa; 
                border-left: 4px solid #667eea; 
                padding: 20px; 
                margin: 20px 0; 
                border-radius: 5px; 
            }
            .credential-item { 
                margin: 10px 0; 
                font-size: 16px; 
            }
            .credential-label { 
                font-weight: bold; 
                color: #495057; 
            }
            .credential-value { 
                color: #212529; 
                font-family: 'Courier New', monospace; 
                background-color: #e9ecef; 
                padding: 5px 10px; 
                border-radius: 3px; 
                display: inline-block; 
                margin-left: 10px; 
            }
            .password-highlight { 
                background-color: #fff3cd; 
                border: 1px solid #ffeaa7; 
                color: #856404; 
                font-weight: bold; 
            }
            .warning-box { 
                background-color: #fff3cd; 
                border: 1px solid #ffeaa7; 
                color: #856404; 
                padding: 15px; 
                border-radius: 5px; 
                margin: 20px 0; 
            }
            .warning-icon { 
                font-size: 20px; 
                margin-right: 10px; 
            }
            .steps { 
                background-color: #e7f3ff; 
                border: 1px solid #b3d9ff; 
                padding: 20px; 
                border-radius: 5px; 
                margin: 20px 0; 
            }
            .step { 
                margin: 10px 0; 
                padding-left: 25px; 
                position: relative; 
            }
            .step::before { 
                content: "→"; 
                position: absolute; 
                left: 0; 
                color: #667eea; 
                font-weight: bold; 
            }
            .footer { 
                background-color: #f8f9fa; 
                padding: 20px; 
                text-align: center; 
                color: #6c757d; 
                font-size: 14px; 
            }
            .button { 
                display: inline-block; 
                padding: 12px 30px; 
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
                color: white; 
                text-decoration: none; 
                border-radius: 5px; 
                font-weight: bold; 
                margin: 15px 0; 
            }
            .button:hover { 
                opacity: 0.9; 
            }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>🎓 StartEducation</h1>
                <p>Bienvenido a nuestra plataforma de cursos en línea</p>
            </div>
            
            <div class="content">
                <div class="welcome-message">
                    <strong>¡Hola ${nombreCompleto}!</strong>
                </div>
                
                <p>Tu cuenta ha sido creada exitosamente en StartEducation. Para acceder a la plataforma, utiliza las siguientes credenciales:</p>
                
                <div class="credentials-box">
                    <div class="credential-item">
                        <span class="credential-label">📧 Email:</span>
                        <span class="credential-value">${email}</span>
                    </div>
                    <div class="credential-item">
                        <span class="credential-label">🔑 Contraseña temporal:</span>
                        <span class="credential-value password-highlight">${passwordTemporal}</span>
                    </div>
                </div>
                
                <div class="warning-box">
                    <span class="warning-icon">⚠️</span>
                    <strong>¡IMPORTANTE!</strong> Esta es una contraseña temporal. Por seguridad, deberás cambiarla en tu primer inicio de sesión.
                </div>
                
                <div class="steps">
                    <h3>📋 Pasos para acceder:</h3>
                    <div class="step">Visita nuestra plataforma</div>
                    <div class="step">Inicia sesión con tu email y contraseña temporal</div>
                    <div class="step">El sistema te pedirá crear una nueva contraseña</div>
                    <div class="step">¡Comienza a explorar nuestros cursos!</div>
                </div>
                
                <div style="text-align: center;">
                    <a href="https://starteducation.page" class="button">🚀 Acceder a la Plataforma</a>
                </div>
                
                <p><strong>Recuerda:</strong></p>
                <ul>
                    <li>Mantén tus credenciales seguras</li>
                    <li>No compartas tu contraseña con nadie</li>
                    <li>Si tienes problemas para acceder, contacta al administrador</li>
                </ul>
            </div>
            
            <div class="footer">
                <p>Este email fue enviado automáticamente desde StartEducation.</p>
                <p>Si no solicitaste esta cuenta, puedes ignorar este mensaje.</p>
                <p>© ${new Date().getFullYear()} StartEducation - Todos los derechos reservados</p>
            </div>
        </div>
    </body>
    </html>
    `;
  }

  /**
   * Envía email de notificación de cambio de contraseña
   */
  async enviarNotificacionCambioPassword(email, nombre, apellido) {
    try {
      if (!this.transporter || !process.env.SMTP_USER) {
        console.log('[EMAIL] ⚠️ Servicio de email no configurado para notificación');
        return { success: false, message: 'Servicio de email no configurado' };
      }

      const nombreCompleto = `${nombre} ${apellido}`;
      
      // 🎨 OPTIMIZACIÓN: Usar template Handlebars externo
      const templateHtml = await this.renderEmailTemplate('cambio-password', {
        nombreCompleto,
        email,
        timestamp: new Date().toLocaleString('es-MX'),
        ip: 'IP no disponible', // Se puede pasar desde el controller
        currentYear: new Date().getFullYear()
      });
      
      const mailOptions = {
        from: {
          name: 'StartEducation - Plataforma de Cursos',
          address: process.env.SMTP_USER
        },
        to: email,
        subject: '🔐 Contraseña actualizada exitosamente - StartEducation',
        html: templateHtml
      };

      const info = await this.transporter.sendMail(mailOptions);
      console.log('[EMAIL] ✅ Notificación de cambio de contraseña enviada:', info.messageId);
      
      return { success: true, messageId: info.messageId };

    } catch (error) {
      console.error('[EMAIL] ❌ Error enviando notificación:', error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Envía email con enlace para recuperar contraseña
   */
  async enviarRecuperacionPassword(email, nombre, apellido, resetUrl) {
    try {
      if (!this.transporter || !process.env.SMTP_USER) {
        console.log('[EMAIL] ⚠️ Servicio de email no configurado, mostrando enlace en consola');
        console.log(`[EMAIL] 🔗 Enlace de recuperación para ${email}: ${resetUrl}`);
        return { success: false, message: 'Servicio de email no configurado' };
      }

      const nombreCompleto = `${nombre} ${apellido}`;
      
      // 🎨 OPTIMIZACIÓN: Usar template Handlebars externo
      const templateHtml = await this.renderEmailTemplate('recuperacion-password', {
        nombreCompleto,
        email,
        resetUrl,
        currentYear: new Date().getFullYear()
      });
      
      const mailOptions = {
        from: {
          name: 'StartEducation - Plataforma de Cursos',
          address: process.env.SMTP_USER
        },
        to: email,
        subject: '🔐 Recuperar tu contraseña - StartEducation',
        html: templateHtml
      };

      const info = await this.transporter.sendMail(mailOptions);
      console.log('[EMAIL] ✅ Email de recuperación enviado:', info.messageId);
      
      return { success: true, messageId: info.messageId };

    } catch (error) {
      console.error('[EMAIL] ❌ Error enviando recuperación:', error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Envía email de confirmación de cambio de contraseña
   */
  async enviarConfirmacionCambioPassword(email, nombre, apellido) {
    try {
      if (!this.transporter || !process.env.SMTP_USER) {
        console.log('[EMAIL] ⚠️ Servicio de email no configurado para confirmación');
        return { success: false, message: 'Servicio de email no configurado' };
      }

      const nombreCompleto = `${nombre} ${apellido}`;
      const fechaActual = new Date().toLocaleString('es-ES', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'America/Mexico_City'
      });
      
      // 🎨 OPTIMIZACIÓN: Usar template Handlebars externo
      const templateHtml = await this.renderEmailTemplate('confirmacion-cambio-password', {
        nombreCompleto,
        email,
        timestamp: fechaActual,
        ip: 'IP no disponible', // Se puede pasar desde el controller
        currentYear: new Date().getFullYear()
      });
      
      const mailOptions = {
        from: {
          name: 'StartEducation - Plataforma de Cursos',
          address: process.env.SMTP_USER
        },
        to: email,
        subject: '✅ Contraseña restablecida exitosamente - StartEducation',
        html: templateHtml
      };

      const info = await this.transporter.sendMail(mailOptions);
      console.log('[EMAIL] ✅ Confirmación de cambio de contraseña enviada:', info.messageId);
      
      return { success: true, messageId: info.messageId };

    } catch (error) {
      console.error('[EMAIL] ❌ Error enviando confirmación:', error.message);
      return { success: false, error: error.message };
    }
  }
}

// Exportar instancia singleton
module.exports = new EmailService();