// Theme Toggle Functionality
class ThemeManager {
    constructor() {
        this.toggle = document.getElementById('themeToggle');
        this.html = document.documentElement;
        this.currentTheme = localStorage.getItem('theme') || 'light';
        
        this.init();
    }
    
    init() {
        this.setTheme(this.currentTheme);
        this.toggle.addEventListener('click', () => this.toggleTheme());
    }
    
    setTheme(theme) {
        this.html.setAttribute('data-bs-theme', theme);
        this.toggle.classList.toggle('dark', theme === 'dark');
        localStorage.setItem('theme', theme);
        this.currentTheme = theme;
        
        console.log(`🎨 Tema cambiado a: ${theme}`);
    }
    
    toggleTheme() {
        const newTheme = this.currentTheme === 'light' ? 'dark' : 'light';
        this.setTheme(newTheme);
    }
}

// Scroll Animation
class ScrollAnimations {
    constructor() {
        this.elements = document.querySelectorAll('.fade-in');
        this.init();
    }
    
    init() {
        this.observeElements();
        window.addEventListener('scroll', () => this.handleScroll());
    }
    
    observeElements() {
        const options = {
            threshold: 0.1,
            rootMargin: '0px 0px -50px 0px'
        };
        
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('visible');
                }
            });
        }, options);
        
        this.elements.forEach(el => observer.observe(el));
    }
    
    handleScroll() {
        const navbar = document.querySelector('.glass-navbar');
        if (window.scrollY > 100) {
            navbar.style.background = 'rgba(255, 255, 255, 0.95)';
            navbar.style.backdropFilter = 'blur(20px)';
        } else {
            navbar.style.background = 'var(--glass-bg)';
            navbar.style.backdropFilter = 'blur(20px)';
        }
    }
}

// Smooth Scrolling for Anchor Links
class SmoothScrolling {
    constructor() {
        this.init();
    }
    
    init() {
        document.querySelectorAll('a[href^="#"]').forEach(anchor => {
            anchor.addEventListener('click', (e) => {
                e.preventDefault();
                const target = document.querySelector(anchor.getAttribute('href'));
                if (target) {
                    target.scrollIntoView({
                        behavior: 'smooth',
                        block: 'start'
                    });
                }
            });
        });
    }
}

// Navbar Collapse on Mobile Link Click
class MobileNavigation {
    constructor() {
        this.init();
    }
    
    init() {
        const navLinks = document.querySelectorAll('.navbar-nav .nav-link');
        const navbarCollapse = document.querySelector('.navbar-collapse');
        
        navLinks.forEach(link => {
            link.addEventListener('click', () => {
                if (window.innerWidth < 992) {
                    const collapse = new bootstrap.Collapse(navbarCollapse, {
                        toggle: true
                    });
                }
            });
        });
    }
}

// Contact Form Handler
class ContactFormHandler {
    constructor() {
        this.form = document.getElementById('contactForm');
        this.sendButton = document.getElementById('sendButton');
        this.buttonText = this.sendButton.querySelector('.button-text');
        this.spinner = this.sendButton.querySelector('.spinner-border');
        this.alertContainer = document.getElementById('contactAlert');
        this.modal = document.getElementById('contactModal');
        this.init();
    }
    
    init() {
        this.form.addEventListener('submit', (e) => this.handleSubmit(e));
        
        // Reset form when modal is closed
        this.modal.addEventListener('hidden.bs.modal', () => {
            this.form.reset();
            this.clearAlerts();
            this.setLoadingState(false);
        });
        
        // Add real-time validation
        this.addValidation();
    }
    
    addValidation() {
        const inputs = this.form.querySelectorAll('input, select, textarea');
        inputs.forEach(input => {
            input.addEventListener('blur', () => this.validateField(input));
            input.addEventListener('input', () => {
                if (input.classList.contains('is-invalid')) {
                    this.validateField(input);
                }
            });
        });
    }
    
    validateField(field) {
        const isValid = field.checkValidity();
        
        if (isValid) {
            field.classList.remove('is-invalid');
            field.classList.add('is-valid');
        } else {
            field.classList.remove('is-valid');
            field.classList.add('is-invalid');
        }
        
        return isValid;
    }
    
    validateForm() {
        const inputs = this.form.querySelectorAll('input, select, textarea');
        let isValid = true;
        
        inputs.forEach(input => {
            if (!this.validateField(input)) {
                isValid = false;
            }
        });
        
        return isValid;
    }
    
    async handleSubmit(e) {
        e.preventDefault();
        
        // Clear previous alerts
        this.clearAlerts();
        
        // Validate form
        if (!this.validateForm()) {
            this.showError('Por favor, completa todos los campos correctamente.');
            return;
        }
        
        // Show loading state
        this.setLoadingState(true);
        
        const formData = new FormData(this.form);
        const data = {
            nombre: formData.get('nombre').trim(),
            email: formData.get('email').trim(),
            asunto: formData.get('asunto'),
            mensaje: formData.get('mensaje').trim()
        };
        
        try {
            console.log('📧 Enviando mensaje de contacto...', data);
            
            const response = await fetch('/contact', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(data)
            });
            
            const result = await response.json();
            
            if (response.ok) {
                this.showSuccess();
                this.form.reset();
                this.clearValidation();
                
                // Close modal after delay
                setTimeout(() => {
                    const modalInstance = bootstrap.Modal.getInstance(this.modal);
                    if (modalInstance) {
                        modalInstance.hide();
                    }
                }, 3000);
            } else {
                this.showError(result.error || 'Error al enviar el mensaje. Intenta nuevamente.');
            }
        } catch (error) {
            console.error('❌ Error al enviar contacto:', error);
            this.showError('Error de conexión. Verifica tu conexión a internet e intenta nuevamente.');
        } finally {
            this.setLoadingState(false);
        }
    }
    
    setLoadingState(loading) {
        this.sendButton.disabled = loading;
        const otherInputs = this.form.querySelectorAll('input, select, textarea, button:not(#sendButton)');
        
        if (loading) {
            this.buttonText.textContent = 'Enviando...';
            this.spinner.classList.remove('d-none');
            otherInputs.forEach(input => input.disabled = true);
        } else {
            this.buttonText.innerHTML = '<i class="bi bi-send me-2"></i>Enviar Mensaje';
            this.spinner.classList.add('d-none');
            otherInputs.forEach(input => input.disabled = false);
        }
    }
    
    clearAlerts() {
        this.alertContainer.innerHTML = '';
    }
    
    clearValidation() {
        const inputs = this.form.querySelectorAll('input, select, textarea');
        inputs.forEach(input => {
            input.classList.remove('is-valid', 'is-invalid');
        });
    }
    
    showSuccess() {
        this.alertContainer.innerHTML = `
            <div class="alert alert-success alert-dismissible fade show border-0 shadow-sm" role="alert">
                <div class="d-flex align-items-center">
                    <i class="bi bi-check-circle-fill text-success me-3" style="font-size: 1.5rem;"></i>
                    <div>
                        <h6 class="mb-1 fw-bold">¡Mensaje enviado exitosamente!</h6>
                        <small class="text-muted">Te contactaremos en las próximas 24 horas.</small>
                    </div>
                </div>
                <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Cerrar"></button>
            </div>
        `;
    }
    
    showError(message) {
        this.alertContainer.innerHTML = `
            <div class="alert alert-danger alert-dismissible fade show border-0 shadow-sm" role="alert">
                <div class="d-flex align-items-center">
                    <i class="bi bi-exclamation-triangle-fill text-danger me-3" style="font-size: 1.5rem;"></i>
                    <div>
                        <h6 class="mb-1 fw-bold">Error al enviar mensaje</h6>
                        <small class="text-muted">${message}</small>
                    </div>
                </div>
                <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Cerrar"></button>
            </div>
        `;
    }
}

// Initialize all components when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    new ThemeManager();
    new ScrollAnimations();
    new SmoothScrolling();
    new MobileNavigation();
    new ContactFormHandler();
    
    console.log('✨ StartEducation Homepage iniciada');
    console.log('🎨 Modo oscuro/claro disponible');
    console.log('💫 Animaciones de scroll activas');
    console.log('📱 Navegación móvil optimizada');
    console.log('📧 Formulario de contacto activo');
});