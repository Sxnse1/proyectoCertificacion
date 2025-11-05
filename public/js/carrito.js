/**
 * Carrito - Funcionalidad del carrito de compras
 * Maneja eliminación, guardado, cupones y procesamiento de pagos
 */

class CarritoManager {
    constructor() {
        this.init();
    }

    init() {
        this.setupServerMessages();
        console.log('🛒 Carrito de compras inicializado');
    }

    // Función para eliminar item del carrito
    async eliminarDelCarrito(carritoId) {
        if (!confirm('¿Estás seguro de que deseas eliminar este curso del carrito?')) {
            return;
        }

        try {
            const response = await fetch(`/carrito/eliminar/${carritoId}`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                }
            });

            const data = await response.json();

            if (data.success) {
                this.showMessage('Curso eliminado del carrito', 'success');
                setTimeout(() => location.reload(), 1000);
            } else {
                this.showMessage('Error al eliminar el curso: ' + data.message, 'error');
            }
        } catch (error) {
            console.error('Error:', error);
            this.showMessage('Error al comunicarse con el servidor', 'error');
        }
    }

    // Función para guardar para después
    async guardarParaDespues(idCurso) {
        try {
            const response = await fetch(`/carrito/${idCurso}/guardar`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                }
            });

            const data = await response.json();

            if (data.success) {
                this.showMessage('Curso guardado para después', 'success');
                setTimeout(() => location.reload(), 1000);
            } else {
                this.showMessage('Error: ' + data.message, 'error');
            }
        } catch (error) {
            console.error('Error:', error);
            this.showMessage('Error al guardar el curso', 'error');
        }
    }

    // Función para proceder al pago
    procederPago() {
        // Aquí se implementaría la integración con pasarelas de pago
        this.showMessage('Funcionalidad de pago en desarrollo. Próximamente tendrás acceso a diferentes métodos de pago.', 'info');
    }

    // Función para aplicar cupón
    async aplicarCupon() {
        const codigo = document.getElementById('codigoCupon').value.trim();
        if (!codigo) {
            this.showMessage('Por favor ingresa un código de cupón', 'error');
            return;
        }

        try {
            const response = await fetch('/carrito/aplicar-cupon', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ codigo })
            });

            const data = await response.json();

            if (data.success) {
                this.showMessage('Cupón aplicado exitosamente', 'success');
                setTimeout(() => location.reload(), 1000);
            } else {
                this.showMessage('Cupón inválido o expirado', 'error');
            }
        } catch (error) {
            console.error('Error:', error);
            this.showMessage('Error al aplicar el cupón', 'error');
        }
    }

    // Función para mostrar mensajes
    showMessage(message, type) {
        const alertClass = type === 'success' ? 'alert-success' : 
                          type === 'error' ? 'alert-danger' : 'alert-info';
        
        const alertHtml = `
            <div class="alert ${alertClass} alert-dismissible fade show position-fixed" 
                 style="top: 20px; right: 20px; z-index: 9999; min-width: 300px;" role="alert">
                ${message}
                <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
            </div>
        `;
        
        document.body.insertAdjacentHTML('beforeend', alertHtml);
        
        // Auto-hide after 5 seconds
        setTimeout(() => {
            const alert = document.querySelector('.alert');
            if (alert) {
                alert.remove();
            }
        }, 5000);
    }

    // Mostrar mensajes del servidor si existen
    setupServerMessages() {
        // Esta funcionalidad se maneja ahora desde el template con variables globales
        if (window.serverMessage) {
            this.showMessage(window.serverMessage.text, window.serverMessage.type);
        }
    }
}

// Global functions for onclick handlers
window.eliminarDelCarrito = function(carritoId) {
    if (window.carritoManager) {
        window.carritoManager.eliminarDelCarrito(carritoId);
    }
};

window.guardarParaDespues = function(idCurso) {
    if (window.carritoManager) {
        window.carritoManager.guardarParaDespues(idCurso);
    }
};

window.procederPago = function() {
    if (window.carritoManager) {
        window.carritoManager.procederPago();
    }
};

window.aplicarCupon = function() {
    if (window.carritoManager) {
        window.carritoManager.aplicarCupon();
    }
};

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    window.carritoManager = new CarritoManager();
});