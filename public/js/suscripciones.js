/**
 * Suscripciones - Funcionalidad de suscripciones y membresías
 * Maneja la suscripción a planes, modales y animaciones
 */

class SuscripcionesManager {
    constructor() {
        this.selectedMembershipId = null;
        this.selectedPlanName = '';
        this.selectedPrice = '';
        this.init();
    }

    init() {
        this.setupSubscribeButtons();
        this.setupConfirmButton();
        this.setupAnimations();
        console.log('💳 Sistema de suscripciones inicializado');
    }

    // Handle subscribe button clicks
    setupSubscribeButtons() {
        const subscribeButtons = document.querySelectorAll('.subscribe-btn');
        const subscriptionModal = new bootstrap.Modal(document.getElementById('subscriptionModal'));

        subscribeButtons.forEach(button => {
            button.addEventListener('click', () => {
                const membershipId = button.dataset.membershipId;
                const planName = button.dataset.planName;
                const price = button.dataset.price;

                this.selectedMembershipId = membershipId;
                this.selectedPlanName = planName;
                this.selectedPrice = price;

                // Update modal content
                document.getElementById('planName').textContent = planName;
                document.getElementById('modalPlanName').textContent = planName;
                document.getElementById('modalPrice').textContent = `$${price}/mes`;

                subscriptionModal.show();
            });
        });
    }

    // Handle subscription confirmation
    setupConfirmButton() {
        const confirmButton = document.getElementById('confirmSubscription');
        if (!confirmButton) return;

        confirmButton.addEventListener('click', async () => {
            if (!this.selectedMembershipId) return;

            // Show loading state
            confirmButton.innerHTML = '<i class="bi bi-hourglass-split me-2"></i>Procesando...';
            confirmButton.disabled = true;

            try {
                const response = await fetch('/suscripciones/crear-preferencia-membresia', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        id_membresia: this.selectedMembershipId
                    })
                });

                const data = await response.json();

                if (data.success) {
                    // Redirigir directamente a MercadoPago
                    if (data.initPoint) {
                        window.location.href = data.initPoint;
                    } else {
                        this.showSuccessMessage(data);
                    }
                } else {
                    throw new Error(data.message || 'Error en la suscripción');
                }
            } catch (error) {
                console.error('Error:', error);
                this.showErrorMessage(error.message);
            } finally {
                // Reset button state
                confirmButton.innerHTML = '<i class="bi bi-check-circle me-2"></i>Confirmar Suscripción';
                confirmButton.disabled = false;
            }
        });
    }

    showSuccessMessage(data) {
        const subscriptionModal = bootstrap.Modal.getInstance(document.getElementById('subscriptionModal'));
        subscriptionModal.hide();

        // Show success alert
        const alertDiv = document.createElement('div');
        alertDiv.className = 'alert alert-success alert-dismissible fade show';
        alertDiv.innerHTML = `
            <i class="bi bi-check-circle me-2"></i>
            <strong>¡Suscripción exitosa!</strong> ${data.message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        `;

        document.querySelector('.main-container').insertBefore(alertDiv, document.querySelector('.header-section'));

        // Redirect after 3 seconds
        setTimeout(() => {
            if (data.redirectUrl) {
                window.location.href = data.redirectUrl;
            } else {
                window.location.reload();
            }
        }, 3000);
    }

    showErrorMessage(message) {
        // Show error alert
        const alertDiv = document.createElement('div');
        alertDiv.className = 'alert alert-danger alert-dismissible fade show';
        alertDiv.innerHTML = `
            <i class="bi bi-exclamation-triangle me-2"></i>
            <strong>Error:</strong> ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        `;

        document.querySelector('.modal-body').insertBefore(alertDiv, document.querySelector('.modal-body').firstChild);
    }

    // Animate cards on load
    setupAnimations() {
        const planCards = document.querySelectorAll('.plan-card');
        planCards.forEach((card, index) => {
            card.style.opacity = '0';
            card.style.transform = 'translateY(20px)';
            setTimeout(() => {
                card.style.transition = 'all 0.6s ease';
                card.style.opacity = '1';
                card.style.transform = 'translateY(0)';
            }, index * 150);
        });
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    window.suscripcionesManager = new SuscripcionesManager();
});