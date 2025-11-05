/**
 * Login Bootstrap - Funcionalidad de inicio de sesión
 * Maneja toggle de contraseña, estados de carga y validaciones
 */

class LoginManager {
    constructor() {
        this.init();
    }

    init() {
        this.setupFormSubmission();
        this.setupPasswordField();
        this.setupAutoFocus();
        this.setupErrorMessages();
        console.log('🔐 Sistema de Login StartEducation iniciado');
        console.log('🎨 Diseño Bootstrap 5.3 cargado');
        console.log('✨ Componentes interactivos listos');
    }

    // Toggle password visibility
    togglePassword() {
        const passwordInput = document.getElementById('password');
        const toggleIcon = document.getElementById('passwordToggleIcon');
        
        if (passwordInput.type === 'password') {
            passwordInput.type = 'text';
            toggleIcon.className = 'bi bi-eye-slash';
        } else {
            passwordInput.type = 'password';
            toggleIcon.className = 'bi bi-eye';
        }
    }

    // Form submission with loading state
    setupFormSubmission() {
        const loginForm = document.getElementById('loginForm');
        if (loginForm) {
            loginForm.addEventListener('submit', (e) => {
                const button = document.getElementById('loginButton');
                const buttonText = button.querySelector('.button-text');
                
                // Add loading state
                button.disabled = true;
                button.classList.add('btn-loading');
                buttonText.innerHTML = `
                    <span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                    Iniciando sesión...
                `;
            });
        }
    }

    // Handle password field functionality
    setupPasswordField() {
        const passwordField = document.getElementById('password');
        if (passwordField) {
            passwordField.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    document.getElementById('loginForm').submit();
                }
            });
        }
    }

    // Auto-focus on email field
    setupAutoFocus() {
        const emailField = document.getElementById('email');
        if (emailField) {
            emailField.focus();
        }
    }

    // Clear error messages after 5 seconds
    setupErrorMessages() {
        setTimeout(() => {
            const alerts = document.querySelectorAll('.alert');
            alerts.forEach((alert) => {
                if (alert.classList.contains('alert-danger')) {
                    alert.style.opacity = '0';
                    setTimeout(() => {
                        alert.remove();
                    }, 300);
                }
            });
        }, 5000);
    }
}

// Global function for onclick handler
window.togglePassword = function() {
    if (window.loginManager) {
        window.loginManager.togglePassword();
    }
};

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    window.loginManager = new LoginManager();
});