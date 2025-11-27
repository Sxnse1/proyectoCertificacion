/**
 * Sistema de notificaciones Toast global para StartEducation
 * Reemplaza el uso de alert() con notificaciones más elegantes
 */

// Crear el contenedor de toasts si no existe
function initToastContainer() {
    if (document.querySelector('#toast-container')) return;
    
    const container = document.createElement('div');
    container.id = 'toast-container';
    container.className = 'position-fixed top-0 end-0 p-3';
    container.style.zIndex = '1055';
    document.body.appendChild(container);
}

/**
 * Función principal para mostrar notificaciones toast
 * @param {string} message - Mensaje a mostrar
 * @param {string} type - Tipo de notificación: 'success', 'error', 'warning', 'info'
 * @param {number} duration - Duración en ms (default: 4000)
 */
function showToast(message, type = 'info', duration = 4000) {
    initToastContainer();
    
    const toastId = 'toast-' + Date.now();
    const container = document.querySelector('#toast-container');
    
    // Mapear tipos a clases y iconos de Bootstrap
    const typeConfig = {
        success: { class: 'text-bg-success', icon: 'bi-check-circle-fill' },
        error: { class: 'text-bg-danger', icon: 'bi-exclamation-triangle-fill' },
        warning: { class: 'text-bg-warning', icon: 'bi-exclamation-triangle-fill' },
        info: { class: 'text-bg-primary', icon: 'bi-info-circle-fill' }
    };
    
    const config = typeConfig[type] || typeConfig.info;
    
    const toastHTML = `
        <div id="${toastId}" class="toast ${config.class}" role="alert" aria-live="assertive" aria-atomic="true">
            <div class="toast-body d-flex align-items-center">
                <i class="bi ${config.icon} me-2"></i>
                <div class="flex-grow-1">${message}</div>
                <button type="button" class="btn-close btn-close-white ms-2" data-bs-dismiss="toast" aria-label="Close"></button>
            </div>
        </div>
    `;
    
    container.insertAdjacentHTML('beforeend', toastHTML);
    
    const toastElement = document.getElementById(toastId);
    const bsToast = new bootstrap.Toast(toastElement, {
        autohide: duration > 0,
        delay: duration
    });
    
    // Mostrar toast
    bsToast.show();
    
    // Limpiar el DOM después de que se oculte
    toastElement.addEventListener('hidden.bs.toast', function() {
        toastElement.remove();
    });
    
    return toastElement;
}

/**
 * Funciones de conveniencia para tipos específicos
 */
function showSuccessToast(message, duration = 4000) {
    return showToast(message, 'success', duration);
}

function showErrorToast(message, duration = 5000) {
    return showToast(message, 'error', duration);
}

function showWarningToast(message, duration = 4000) {
    return showToast(message, 'warning', duration);
}

function showInfoToast(message, duration = 4000) {
    return showToast(message, 'info', duration);
}

/**
 * Función que imita alert() pero con toast
 * Para reemplazos directos de alert()
 */
function alertToast(message, type = 'info') {
    return showToast(message, type);
}

// Exponer funciones globalmente
window.showToast = showToast;
window.showSuccessToast = showSuccessToast;
window.showErrorToast = showErrorToast;
window.showWarningToast = showWarningToast;
window.showInfoToast = showInfoToast;
window.alertToast = alertToast;

// Inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', initToastContainer);