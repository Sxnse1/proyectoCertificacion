/**
 * Helper para manejar tokens CSRF en peticiones AJAX
 */

/**
 * Obtiene el token CSRF de la cookie _csrf
 * @returns {string|null} Token CSRF o null si no existe
 */
function getCsrfToken() {
    const name = '_csrf=';
    const decodedCookie = decodeURIComponent(document.cookie);
    const cookieArray = decodedCookie.split(';');
    
    for (let i = 0; i < cookieArray.length; i++) {
        let cookie = cookieArray[i].trim();
        if (cookie.indexOf(name) === 0) {
            return cookie.substring(name.length, cookie.length);
        }
    }
    
    return null;
}

/**
 * Obtiene el token CSRF desde el meta tag (alternativo)
 * @returns {string|null} Token CSRF o null si no existe
 */
function getCsrfTokenFromMeta() {
    try {
        const metaTag = document.querySelector('meta[name="csrf-token"]');
        const token = metaTag ? metaTag.getAttribute('content') : null;
        
        if (!token || token === 'null' || token === 'undefined' || token.trim() === '') {
            console.warn('[CSRF Helper] ⚠️ Meta tag encontrado pero sin token válido');
            return null;
        }
        
        return token;
    } catch (error) {
        console.error('[CSRF Helper] ❌ Error obteniendo token desde meta tag:', error);
        return null;
    }
}

/**
 * Obtiene el token CSRF (intenta primero meta tag, luego cookie)
 * @returns {string|null} Token CSRF o null si no existe
 */
function getToken() {
    // 1. Intentar desde meta tag (método preferido - es donde el servidor lo pone)
    let token = getCsrfTokenFromMeta();
    if (token) {
        console.log('[CSRF Helper] ✅ Token obtenido desde meta tag:', token.substring(0, 20) + '...');
        return token;
    }
    
    // 2. Intentar desde cookie (fallback)
    token = getCsrfToken();
    if (token) {
        console.log('[CSRF Helper] ✅ Token obtenido desde cookie:', token.substring(0, 20) + '...');
        return token;
    }
    
    console.warn('[CSRF Helper] ⚠️ No se encontró token CSRF en meta tag ni cookie');
    return null;
}

/**
 * Agrega el token CSRF a los headers de fetch
 * @param {object} headers - Headers existentes (opcional)
 * @returns {object} Headers con token CSRF incluido
 */
function addCsrfHeader(headers = {}) {
    const token = getToken();
    if (token) {
        headers['csrf-token'] = token;
    }
    return headers;
}

/**
 * Crea un objeto de configuración para fetch con CSRF token
 * @param {string} method - Método HTTP (POST, PUT, DELETE, etc.)
 * @param {object} body - Cuerpo de la petición
 * @param {object} additionalHeaders - Headers adicionales
 * @returns {object} Configuración completa para fetch
 */
function createFetchConfig(method = 'POST', body = null, additionalHeaders = {}) {
    const token = getToken();
    
    const config = {
        method: method,
        headers: {
            'Content-Type': 'application/json',
            ...additionalHeaders
        },
        credentials: 'same-origin'
    };
    
    // Agregar token CSRF al header
    if (token) {
        config.headers['csrf-token'] = token;
    }
    
    // Agregar body si existe
    if (body) {
        if (body instanceof FormData) {
            // Para FormData, no establecer Content-Type (el navegador lo hace automáticamente)
            delete config.headers['Content-Type'];
            config.body = body;
        } else if (typeof body === 'object') {
            // Para objetos JSON
            config.body = JSON.stringify(body);
        } else {
            // Para strings u otros tipos
            config.body = body;
        }
    }
    
    return config;
}

/**
 * Realiza una petición POST con CSRF token incluido
 * @param {string} url - URL de la petición
 * @param {object} data - Datos a enviar
 * @param {object} additionalHeaders - Headers adicionales
 * @returns {Promise} Promesa con la respuesta
 */
async function fetchWithCsrf(url, data = null, additionalHeaders = {}) {
    const config = createFetchConfig('POST', data, additionalHeaders);
    
    try {
        const response = await fetch(url, config);
        return response;
    } catch (error) {
        console.error('[CSRF] Error en petición:', error);
        throw error;
    }
}

/**
 * Agrega el token CSRF a un FormData
 * @param {FormData} formData - FormData existente
 * @returns {FormData} FormData con token CSRF incluido
 */
function addCsrfToFormData(formData) {
    const token = getToken();
    if (token) {
        formData.append('_csrf', token);
    }
    return formData;
}

/**
 * Intercepta todos los formularios y agrega el token CSRF automáticamente
 * (solo para formularios que no tengan el campo _csrf)
 */
function autoAddCsrfToForms() {
    document.addEventListener('submit', function(e) {
        const form = e.target;
        
        // Solo para formularios POST
        if (form.method.toUpperCase() !== 'POST') {
            return;
        }
        
        // Verificar si ya tiene el campo _csrf
        if (form.querySelector('input[name="_csrf"]')) {
            return;
        }
        
        // Agregar el token CSRF
        const token = getToken();
        if (token) {
            const input = document.createElement('input');
            input.type = 'hidden';
            input.name = '_csrf';
            input.value = token;
            form.appendChild(input);
        }
    });
}

/**
 * Intercepta todas las peticiones fetch y agrega el token CSRF automáticamente
 */
function interceptFetch() {
    const originalFetch = window.fetch;
    
    window.fetch = function(...args) {
        let [url, options = {}] = args;
        
        // Solo agregar CSRF token a peticiones mutantes (POST, PUT, DELETE, PATCH)
        const method = (options.method || 'GET').toUpperCase();
        if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(method)) {
            console.log(`[CSRF Helper] 📡 Interceptando ${method} request a:`, url);
            
            const token = getToken();
            
            if (token) {
                console.log('[CSRF Helper] 🔑 Token encontrado, añadiendo a headers...');
                
                // Inicializar headers si no existen
                options.headers = options.headers || {};
                
                // Si es Headers object, usar set()
                if (options.headers instanceof Headers) {
                    if (!options.headers.has('csrf-token')) {
                        // Agregar en múltiples formatos que csurf reconoce
                        options.headers.set('csrf-token', token);
                        options.headers.set('x-csrf-token', token);
                        options.headers.set('x-xsrf-token', token);
                    }
                } else {
                    // Si es objeto plano, agregar directamente
                    if (!options.headers['csrf-token'] && !options.headers['CSRF-Token']) {
                        options.headers['csrf-token'] = token;
                        options.headers['x-csrf-token'] = token;
                        options.headers['x-xsrf-token'] = token;
                    }
                }
                
                console.log('[CSRF Helper] ✅ Headers actualizados con token CSRF');
            } else {
                console.error('[CSRF Helper] ❌ No se pudo obtener el token CSRF!');
            }
        }
        
        return originalFetch.apply(this, [url, options]);
    };
    
    console.log('[CSRF Helper] ✅ Interceptor de fetch activado - Todas las peticiones POST/PUT/DELETE/PATCH incluirán el token CSRF automáticamente');
}

// Exportar funciones para uso global
if (typeof window !== 'undefined') {
    window.csrfHelper = {
        getToken,
        getCsrfToken,
        getCsrfTokenFromMeta,
        addCsrfHeader,
        createFetchConfig,
        fetchWithCsrf,
        addCsrfToFormData,
        autoAddCsrfToForms,
        interceptFetch
    };
    
    // Activar interceptor automáticamente cuando se carga el script
    interceptFetch();
}
