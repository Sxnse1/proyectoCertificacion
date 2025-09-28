const speakeasy = require('speakeasy');
const QRCode = require('qrcode');
const crypto = require('crypto');

class TwoFactorService {
  constructor() {
    this.appName = 'StartEducation';
    this.issuer = 'StartEducation Academy';
  }

  /**
   * Generar secret y QR code para configurar 2FA
   * @param {string} userEmail - Email del usuario
   * @param {string} userName - Nombre del usuario
   * @returns {Promise<Object>} Secret y QR code
   */
  async generateSetup(userEmail, userName) {
    try {
      // Generar secret único
      const secret = speakeasy.generateSecret({
        name: `${this.appName} (${userEmail})`,
        issuer: this.issuer,
        length: 32
      });

      // Generar QR code
      const qrCodeUrl = await QRCode.toDataURL(secret.otpauth_url);

      return {
        secret: secret.base32,
        qrCode: qrCodeUrl,
        manualEntryKey: secret.base32,
        backupCodes: this.generateBackupCodes()
      };
    } catch (error) {
      console.error('[2FA] Error generando setup:', error);
      throw new Error('Error al generar configuración de 2FA');
    }
  }

  /**
   * Verificar código TOTP
   * @param {string} token - Código de 6 dígitos
   * @param {string} secret - Secret del usuario
   * @param {number} window - Ventana de tiempo (por defecto 1)
   * @returns {boolean} Es válido el token
   */
  verifyToken(token, secret, window = 1) {
    try {
      if (!token || !secret) {
        return false;
      }

      // Limpiar el token (remover espacios)
      const cleanToken = token.toString().replace(/\s/g, '');

      if (cleanToken.length !== 6) {
        return false;
      }

      return speakeasy.totp.verify({
        secret: secret,
        encoding: 'base32',
        token: cleanToken,
        window: window // Permite +/- 30 segundos de diferencia
      });
    } catch (error) {
      console.error('[2FA] Error verificando token:', error);
      return false;
    }
  }

  /**
   * Verificar código de respaldo
   * @param {string} code - Código de respaldo
   * @param {string} backupCodes - Códigos de respaldo del usuario (JSON string)
   * @returns {Object} {valid: boolean, remainingCodes: string}
   */
  verifyBackupCode(code, backupCodes) {
    try {
      if (!code || !backupCodes) {
        return { valid: false, remainingCodes: backupCodes };
      }

      const codes = JSON.parse(backupCodes);
      const cleanCode = code.replace(/\s/g, '').toLowerCase();

      const index = codes.findIndex(c => c.toLowerCase() === cleanCode);
      
      if (index !== -1) {
        // Remover el código usado
        codes.splice(index, 1);
        return { 
          valid: true, 
          remainingCodes: JSON.stringify(codes)
        };
      }

      return { valid: false, remainingCodes: backupCodes };
    } catch (error) {
      console.error('[2FA] Error verificando código de respaldo:', error);
      return { valid: false, remainingCodes: backupCodes };
    }
  }

  /**
   * Generar códigos de respaldo
   * @param {number} count - Número de códigos (por defecto 10)
   * @returns {Array<string>} Códigos de respaldo
   */
  generateBackupCodes(count = 10) {
    const codes = [];
    for (let i = 0; i < count; i++) {
      // Generar código de 8 caracteres alfanuméricos
      const code = crypto.randomBytes(4).toString('hex').toUpperCase();
      codes.push(code);
    }
    return codes;
  }

  /**
   * Formatear códigos de respaldo para mostrar al usuario
   * @param {Array<string>} codes - Códigos de respaldo
   * @returns {string} Códigos formateados
   */
  formatBackupCodes(codes) {
    return codes.map((code, index) => {
      const formatted = code.match(/.{1,4}/g).join('-');
      return `${(index + 1).toString().padStart(2, '0')}. ${formatted}`;
    }).join('\n');
  }

  /**
   * Validar que el usuario requiere 2FA
   * @param {string} userRole - Rol del usuario
   * @returns {boolean} Requiere 2FA
   */
  requires2FA(userRole) {
    // Solo instructores y admins requieren 2FA por ahora
    return ['instructor', 'admin'].includes(userRole);
  }

  /**
   * Generar URL de respaldo para configuración manual
   * @param {string} secret - Secret del usuario
   * @param {string} userEmail - Email del usuario
   * @returns {string} URL de configuración
   */
  getManualConfigUrl(secret, userEmail) {
    const appName = encodeURIComponent(this.appName);
    const email = encodeURIComponent(userEmail);
    const issuer = encodeURIComponent(this.issuer);
    return `otpauth://totp/${appName}:${email}?secret=${secret}&issuer=${issuer}`;
  }

  /**
   * Verificar si el setup inicial es válido
   * @param {string} token - Token de verificación
   * @param {string} secret - Secret temporal
   * @returns {boolean} Setup válido
   */
  verifySetup(token, secret) {
    return this.verifyToken(token, secret, 2); // Ventana más amplia para setup inicial
  }
}

module.exports = new TwoFactorService();