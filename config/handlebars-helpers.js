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
  
  hbs.registerHelper('json', function(context) {
    return JSON.stringify(context);
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
  
  console.log('✅ [HANDLEBARS] Helpers registrados exitosamente');
}

module.exports = registerHandlebarsHelpers;
