// Global utility functions
window.showNotification = function(message, type = 'success') {
    const toast = document.createElement('div');
    toast.className = `alert alert-${type} position-fixed top-0 end-0 m-3`;
    toast.style.zIndex = '9999';
    toast.innerHTML = `
        <div class="d-flex align-items-center">
            <i class="bi bi-${type === 'success' ? 'check-circle' : 'exclamation-triangle'} me-2"></i>
            ${message}
            <button type="button" class="btn-close ms-auto" onclick="this.parentElement.parentElement.remove()"></button>
        </div>
    `;
    document.body.appendChild(toast);
    
    setTimeout(() => {
        if (toast && toast.parentNode) {
            toast.remove();
        }
    }, 5000);
};

// Global loading state
window.setLoading = function(element, loading = true) {
    if (loading) {
        element.disabled = true;
        element.innerHTML = '<span class="loading-spinner me-2"></span>Cargando...';
    } else {
        element.disabled = false;
        element.innerHTML = element.getAttribute('data-original-text') || 'Enviar';
    }
};

// Global error handler
window.handleApiError = function(error, defaultMessage = 'Ha ocurrido un error') {
    console.error('API Error:', error);
    let message = defaultMessage;
    
    if (error.response && error.response.data && error.response.data.message) {
        message = error.response.data.message;
    } else if (error.message) {
        message = error.message;
    }
    
    showNotification(message, 'danger');
};

// Smooth scroll for anchor links
document.addEventListener('DOMContentLoaded', function() {
    const anchorLinks = document.querySelectorAll('a[href^="#"]');
    anchorLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const targetId = this.getAttribute('href').substring(1);
            const targetElement = document.getElementById(targetId);
            if (targetElement) {
                targetElement.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });
    });
});