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
        // Usar SweetAlert2 para confirmación moderna
        const result = await Swal.fire({
            title: '¿Eliminar curso?',
            text: '¿Estás seguro de que deseas eliminar este curso del carrito?',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#ea580c',
            cancelButtonColor: '#6b7280',
            confirmButtonText: '<i class="fas fa-trash-alt"></i> Sí, eliminar',
            cancelButtonText: '<i class="fas fa-times"></i> Cancelar',
            reverseButtons: true,
            customClass: {
                popup: 'swal2-modern',
                confirmButton: 'btn-modern-confirm',
                cancelButton: 'btn-modern-cancel'
            }
        });

        if (!result.isConfirmed) {
            return;
        }

        // Mostrar loading
        Swal.fire({
            title: 'Eliminando...',
            text: 'Por favor espera',
            allowOutsideClick: false,
            allowEscapeKey: false,
            didOpen: () => {
                Swal.showLoading();
            }
        });

        try {
            const response = await fetch(`/carrito/eliminar/${carritoId}`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                    'csrf-token': window.csrfHelper ? window.csrfHelper.getToken() : ''
                }
            });

            const data = await response.json();

            if (data.success) {
                await Swal.fire({
                    icon: 'success',
                    title: '¡Eliminado!',
                    text: 'El curso ha sido eliminado del carrito',
                    timer: 1500,
                    showConfirmButton: false
                });
                location.reload();
            } else {
                Swal.fire({
                    icon: 'error',
                    title: 'Error',
                    text: data.message || 'No se pudo eliminar el curso',
                    confirmButtonColor: '#ea580c'
                });
            }
        } catch (error) {
            console.error('Error:', error);
            Swal.fire({
                icon: 'error',
                title: 'Error de conexión',
                text: 'No se pudo comunicar con el servidor',
                confirmButtonColor: '#ea580c'
            });
        }
    }

    // Función para guardar para después
    async guardarParaDespues(idCurso) {
        // Mostrar loading
        Swal.fire({
            title: 'Guardando...',
            text: 'Moviendo curso a guardados',
            allowOutsideClick: false,
            allowEscapeKey: false,
            didOpen: () => {
                Swal.showLoading();
            }
        });

        try {
            const response = await fetch(`/carrito/${idCurso}/guardar`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'csrf-token': window.csrfHelper ? window.csrfHelper.getToken() : ''
                }
            });

            const data = await response.json();

            if (data.success) {
                await Swal.fire({
                    icon: 'success',
                    title: '¡Guardado!',
                    text: 'El curso se ha guardado para después',
                    timer: 1500,
                    showConfirmButton: false
                });
                location.reload();
            } else {
                Swal.fire({
                    icon: 'error',
                    title: 'Error',
                    text: data.message || 'No se pudo guardar el curso',
                    confirmButtonColor: '#ea580c'
                });
            }
        } catch (error) {
            console.error('Error:', error);
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: 'No se pudo guardar el curso',
                confirmButtonColor: '#ea580c'
            });
        }
    }

    // Función para proceder al pago con Mercado Pago
    async procederPago() {
        const btnPagar = document.querySelector('[onclick*="procederPago"]');
        if (btnPagar) {
            btnPagar.disabled = true;
            btnPagar.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Procesando...';
        }

        try {
            console.log('🛒 Iniciando proceso de pago...');
            
            // Crear preferencia de pago
            const response = await fetch('/pagos/crear-preferencia', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'csrf-token': window.csrfHelper ? window.csrfHelper.getToken() : ''
                }
            });

            const data = await response.json();

            if (!data.success) {
                throw new Error(data.message || 'Error creando preferencia de pago');
            }

            console.log('✅ Preferencia creada:', data.preferenceId);
            console.log('🔗 Init Point:', data.initPoint);
            this.showMessage('Redirigiendo a Mercado Pago...', 'info');

            // Usar el init_point proporcionado por MercadoPago
            const checkoutUrl = data.initPoint;
            console.log('🔗 Redirigiendo a:', checkoutUrl);
            
            // Esperar un momento para que el usuario vea el mensaje
            setTimeout(() => {
                window.location.href = checkoutUrl;
            }, 1500);

        } catch (error) {
            console.error('❌ Error en proceso de pago:', error);
            this.showMessage('Error al procesar el pago: ' + error.message, 'error');
            
            if (btnPagar) {
                btnPagar.disabled = false;
                btnPagar.innerHTML = '<i class="fas fa-credit-card"></i> Proceder al Pago';
            }
        }
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