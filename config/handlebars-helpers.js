/**
 * Handlebars Helpers - StartEducation Platform
 * Colección de helpers personalizados para las vistas
 */

const hbs = require('hbs');

/**
 * Registra todos los helpers de Handlebars
 */
function registerHandlebarsHelpers() {
  
  // ============================================================
  // 🔄 HELPERS DE COMPARACIÓN
  // ============================================================
  
  hbs.registerHelper('eq', function(a, b) {
    return a === b;
  });
  
  hbs.registerHelper('gt', function(a, b) {
    return a > b;
  });
  
  hbs.registerHelper('lt', function(a, b) {
    return a < b;
  });
  
  hbs.registerHelper('gte', function(a, b) {
    return a >= b;
  });
  
  hbs.registerHelper('lte', function(a, b) {
    return a <= b;
  });
  
  // ============================================================
  // 🧮 HELPERS MATEMÁTICOS
  // ============================================================
  
  hbs.registerHelper('add', function(a, b) {
    return a + b;
  });
  
  hbs.registerHelper('subtract', function(a, b) {
    return a - b;
  });
  
  hbs.registerHelper('math', function(a, operator, b, precision) {
    a = parseFloat(a);
    b = parseFloat(b);
    
    let result;
    switch (operator) {
      case '+':
        result = a + b;
        break;
      case '-':
        result = a - b;
        break;
      case '*':
        result = a * b;
        break;
      case '/':
        result = b !== 0 ? a / b : 0;
        break;
      case '%':
        result = a % b;
        break;
      default:
        result = 0;
    }
    
    if (precision === 'round') {
      return Math.round(result);
    } else if (typeof precision === 'number') {
      return parseFloat(result.toFixed(precision));
    }
    
    return result;
  });
  
  // ============================================================
  // 🔀 HELPERS LÓGICOS
  // ============================================================
  
  hbs.registerHelper('or', function() {
    return Array.prototype.slice.call(arguments, 0, -1).some(Boolean);
  });
  
  hbs.registerHelper('and', function() {
    return Array.prototype.slice.call(arguments, 0, -1).every(Boolean);
  });
  
  hbs.registerHelper('unless', function(conditional, options) {
    if (!conditional) {
      return options.fn(this);
    } else {
      return options.inverse(this);
    }
  });
  
  // ============================================================
  // 📅 HELPERS DE FORMATO DE FECHA
  // ============================================================
  
  hbs.registerHelper('formatDate', function(dateString) {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  });

  hbs.registerHelper('formatNumber', function(number, decimals = 1) {
    if (number === null || number === undefined || isNaN(number)) return '0';
    return parseFloat(number).toFixed(decimals);
  });
  
  // ============================================================
  // ⏱️ HELPERS DE TIEMPO Y DURACIÓN
  // ============================================================
  
  hbs.registerHelper('formatDuration', function(seconds) {
    if (!seconds || isNaN(seconds)) return '0m';
    
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    } else {
      return `${minutes}m`;
    }
  });
  
  // ============================================================
  // 💰 HELPERS DE FORMATO DE PRECIOS
  // ============================================================
  
  hbs.registerHelper('formatPrice', function(price) {
    if (!price || isNaN(price)) return '$0.00';
    return '$' + parseFloat(price).toFixed(2);
  });
  
  // ============================================================
  // ⭐ HELPERS DE VALORACIONES
  // ============================================================
  
  hbs.registerHelper('formatRating', function(rating) {
    if (!rating || isNaN(rating)) return '0.0';
    return parseFloat(rating).toFixed(1);
  });
  
  // ============================================================
  // 📝 HELPERS DE CADENAS DE TEXTO
  // ============================================================
  
  hbs.registerHelper('substring', function(str, start, length) {
    if (!str) return '';
    return str.substring(start, length || str.length).toUpperCase();
  });

  hbs.registerHelper('toLowerCase', function(str) {
    if (!str || typeof str !== 'string') return '';
    return str.toLowerCase();
  });

  hbs.registerHelper('toUpperCase', function(str) {
    if (!str || typeof str !== 'string') return '';
    return str.toUpperCase();
  });

  hbs.registerHelper('capitalize', function(str) {
    if (!str || typeof str !== 'string') return '';
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
  });
  
  // ============================================================
  // 🔁 HELPERS DE ITERACIÓN
  // ============================================================
  
  hbs.registerHelper('range', function(start, end) {
    const result = [];
    for (let i = start; i <= end; i++) {
      result.push(i);
    }
    return result;
  });
  
  hbs.registerHelper('for', function(from, to, options) {
    // Si no se pasa el parámetro options, significa que current no fue pasado
    if (typeof options === 'undefined') {
      options = to;
      to = from;
      from = 1;
    }
    
    // Validar que options tenga la función fn
    if (!options || typeof options.fn !== 'function') {
      return '';
    }
    
    let result = '';
    for (let i = from; i <= to; i++) {
      result += options.fn(i);
    }
    return result;
  });
  
  hbs.registerHelper('repeat', function(n, options) {
    let result = '';
    for (let i = 0; i < n; i++) {
      result += options.fn(this);
    }
    return result;
  });
  
  // ============================================================
  // 🎯 HELPERS DE VARIABLES
  // ============================================================
  
  hbs.registerHelper('setVar', function(varName, varValue, options) {
    if (!options.data.root) options.data.root = {};
    if (!options.data.root[varName]) options.data.root[varName] = {};
    options.data.root[varName][varValue] = true;
    return '';
  });
  
  // ============================================================
  // 👤 HELPERS DE USUARIO
  // ============================================================
  
  hbs.registerHelper('initials', function(nombre, apellido) {
    let result = '';
    if (nombre && typeof nombre === 'string' && nombre.length > 0) {
      result += nombre.charAt(0).toUpperCase();
    }
    if (apellido && typeof apellido === 'string' && apellido.length > 0) {
      result += apellido.charAt(0).toUpperCase();
    }
    return result || '?';
  });

  // ============================================================
  // 🔧 HELPERS ADICIONALES PARA SUSCRIPCIONES
  // ============================================================
  
  hbs.registerHelper('split', function(str, delimiter) {
    if (!str || typeof str !== 'string') return [];
    return str.split(delimiter);
  });

  hbs.registerHelper('eq', function(a, b) {
    return a === b;
  });

  hbs.registerHelper('===', function(a, b) {
    return a === b;
  });

  // ============================================================
  // 🎬 HELPERS PARA REPRODUCTOR DE VIDEO
  // ============================================================
  
  hbs.registerHelper('moduleHasCurrentVideo', function(module) {
    if (!module || !module.videos) return false;
    return module.videos.some(video => video.isCurrentVideo);
  });

  hbs.registerHelper('json', function(context) {
    return JSON.stringify(context);
  });

  // Formatear fecha en español
  hbs.registerHelper('formatDate', function(date) {
    if (!date) return 'Fecha no disponible';
    
    const fechaObj = new Date(date);
    const opciones = {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'America/Mexico_City'
    };
    
    return fechaObj.toLocaleDateString('es-MX', opciones);
  });

  // Formatear número con comas
  hbs.registerHelper('formatNumber', function(number) {
    if (typeof number !== 'number') return '0';
    return number.toLocaleString('es-MX');
  });

  // Formatear dinero
  hbs.registerHelper('formatMoney', function(amount) {
    if (typeof amount !== 'number') return '$0.00';
    return '$' + amount.toLocaleString('es-MX', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  });

  // ============================================================
  // 🔍 HELPERS PARA LOGS DE AUDITORÍA
  // ============================================================
  
  // Formatear solo la hora
  hbs.registerHelper('formatTime', function(date) {
    if (!date) return 'N/A';
    const fechaObj = new Date(date);
    return fechaObj.toLocaleTimeString('es-MX', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      timeZone: 'America/Mexico_City'
    });
  });

  // Truncar texto
  hbs.registerHelper('truncate', function(text, length) {
    if (!text || typeof text !== 'string') return '';
    if (text.length <= length) return text;
    return text.substring(0, length) + '...';
  });

  // Verificar si un string contiene otro
  hbs.registerHelper('includes', function(string, substring) {
    if (!string || !substring) return false;
    return string.includes(substring);
  });

  // Obtener clase CSS para tipo de acción
  hbs.registerHelper('getActionClass', function(action) {
    if (!action) return 'bg-secondary';
    
    if (action.includes('CREADO')) return 'bg-success';
    if (action.includes('ELIMINADO')) return 'bg-danger';
    if (action.includes('ACTUALIZADO')) return 'bg-warning';
    if (action.includes('PUBLICADO')) return 'bg-info';
    if (action.includes('SUSPENDIDO')) return 'bg-danger';
    if (action.includes('REACTIVADO')) return 'bg-success';
    
    return 'bg-primary';
  });

  // Formatear IP para mostrar
  hbs.registerHelper('formatIP', function(ip) {
    if (!ip) return 'No disponible';
    // Ocultar parte de la IP por privacidad (opcional)
    if (ip.includes('.')) {
      const parts = ip.split('.');
      if (parts.length === 4) {
        return `${parts[0]}.${parts[1]}.***.**`;
      }
    }
    return ip;
  });

  // ============================================================
  // 🔑 HELPERS PARA RBAC Y ROLES
  // ============================================================
  
  // Contar módulos de permisos
  hbs.registerHelper('countModulos', function(permisosPorModulo) {
    if (!permisosPorModulo || typeof permisosPorModulo !== 'object') return 0;
    return Object.keys(permisosPorModulo).length;
  });

  // Verificar si usuario tiene permiso específico
  hbs.registerHelper('hasPermission', function(userPermisos, requiredPermission) {
    if (!userPermisos || !Array.isArray(userPermisos)) return false;
    return userPermisos.includes(requiredPermission);
  });

  // Obtener color de badge según número de permisos
  hbs.registerHelper('getPermissionBadgeClass', function(totalPermisos) {
    if (totalPermisos === 0) return 'bg-secondary';
    if (totalPermisos < 5) return 'bg-warning';
    if (totalPermisos < 15) return 'bg-info';
    if (totalPermisos < 25) return 'bg-primary';
    return 'bg-success';
  });

  // Formatear porcentaje de permisos
  hbs.registerHelper('formatPercentage', function(current, total) {
    if (!total || total === 0) return '0%';
    const percentage = Math.round((current / total) * 100);
    return `${percentage}%`;
  });
  
  console.log('✅ [HANDLEBARS] Helpers registrados exitosamente');
}

module.exports = registerHandlebarsHelpers;
