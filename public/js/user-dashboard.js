/**
 * User Dashboard - Funcionalidad del dashboard del estudiante
 * Maneja animaciones, carrito de compras y efectos visuales
 */

class UserDashboard {
    constructor() {
        this.init();
    }

    init() {
        this.setupWelcomeMessage();
        this.setupCartButtons();
        this.setupAnimations();
        this.setupHoverEffects();
        this.updateCartBadge();
        console.log('🎯 Dashboard de estudiante inicializado');
    }

    // Ocultar mensaje de bienvenida después de 4 segundos
    setupWelcomeMessage() {
        setTimeout(() => {
            const welcome = document.getElementById('welcome-message');
            if (welcome) welcome.style.display = 'none';
        }, 4000);
    }

    // Handler para botones 'Agregar al carrito'
    setupCartButtons() {
        const self = this; // Guardar referencia al objeto
        document.querySelectorAll('.agregar-carrito-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const cursoId = btn.dataset.cursoId;
                btn.disabled = true;
                const originalHtml = btn.innerHTML;
                btn.innerHTML = '<i class="bi bi-hourglass-split"></i> Agregando...';

                try {
                    // Obtener token CSRF
                    const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content');
                    
                    const res = await fetch('/carrito/add', {
                        method: 'POST',
                        credentials: 'same-origin',
                        headers: {
                            'Accept': 'application/json',
                            'Content-Type': 'application/json',
                            'csrf-token': csrfToken || '',
                            'x-csrf-token': csrfToken || '',
                            'x-xsrf-token': csrfToken || ''
                        },
                        body: JSON.stringify({
                            id_curso: cursoId
                        })
                    });

                    // If server redirected to login it may return HTML; handle that gracefully
                    const contentType = res.headers.get('content-type') || '';
                    if (!res.ok) {
                        // For non-2xx responses try to parse JSON, otherwise show generic message
                        if (contentType.includes('application/json')) {
                            const errData = await res.json().catch(()=>null);
                            await Swal.fire({
                                icon: 'error',
                                title: 'Error',
                                text: errData?.message || 'No se pudo agregar al carrito',
                                confirmButtonText: 'Entendido',
                                confirmButtonColor: '#ea580c'
                            });
                        } else {
                            // Probably a redirect to login (HTML)
                            await Swal.fire({
                                icon: 'warning',
                                title: 'Sesión Expirada',
                                text: 'Debes iniciar sesión para agregar cursos al carrito',
                                confirmButtonText: 'Ir a Login',
                                confirmButtonColor: '#ea580c'
                            });
                            window.location.href = '/auth/login?error=sesion_expirada';
                        }
                        btn.disabled = false;
                        btn.innerHTML = originalHtml;
                        return;
                    }

                    let data = null;
                    if (contentType.includes('application/json')) {
                        data = await res.json().catch(()=>null);
                    } else {
                        // Not JSON (likely HTML redirect). Treat as failure requiring login.
                        await Swal.fire({
                            icon: 'warning',
                            title: 'Sesión Expirada',
                            text: 'Debes iniciar sesión para agregar cursos al carrito',
                            confirmButtonText: 'Ir a Login',
                            confirmButtonColor: '#ea580c'
                        });
                        window.location.href = '/auth/login?error=sesion_expirada';
                        btn.disabled = false;
                        btn.innerHTML = originalHtml;
                        return;
                    }

                    if (data && data.success) {
                        btn.innerHTML = '<i class="bi bi-check2-circle"></i> Agregado';
                        
                        await Swal.fire({
                            icon: 'success',
                            title: '¡Agregado!',
                            text: 'El curso se ha agregado al carrito exitosamente',
                            showConfirmButton: false,
                            timer: 1500,
                            timerProgressBar: true
                        });
                        
                        setTimeout(() => { btn.style.display = 'none'; }, 1200);
                        
                        // Actualizar badge del carrito
                        self.updateCartBadge();
                    } else {
                        await Swal.fire({
                            icon: 'error',
                            title: 'Error',
                            text: data?.message || 'No se pudo agregar al carrito',
                            confirmButtonText: 'Entendido',
                            confirmButtonColor: '#ea580c'
                        });
                        btn.disabled = false;
                        btn.innerHTML = originalHtml;
                    }
                } catch (err) {
                    console.error(err);
                    await Swal.fire({
                        icon: 'error',
                        title: 'Error de Conexión',
                        text: 'No se pudo conectar con el servidor. Intenta nuevamente.',
                        confirmButtonText: 'Entendido',
                        confirmButtonColor: '#ea580c'
                    });
                    btn.disabled = false;
                    btn.innerHTML = originalHtml;
                }
            });
        });
    }

    // Animaciones de entrada
    setupAnimations() {
        // Animar las estadísticas
        const statCards = document.querySelectorAll('.stat-card');
        statCards.forEach((card, index) => {
            card.style.opacity = '0';
            card.style.transform = 'translateY(20px)';
            setTimeout(() => {
                card.style.transition = 'all 0.6s ease';
                card.style.opacity = '1';
                card.style.transform = 'translateY(0)';
            }, index * 100);
        });

        // Animar la barra de progreso
        setTimeout(() => {
            const progressBar = document.querySelector('.progress-bar');
            if (progressBar) {
                const currentStyle = progressBar.getAttribute('style');
                const widthMatch = currentStyle?.match(/width:\s*(\d+)%/);
                const width = widthMatch ? widthMatch[1] + '%' : '0%';
                progressBar.style.width = width;
            }
        }, 1000);
    }

    // Efecto hover mejorado para las tarjetas de estadísticas
    setupHoverEffects() {
        document.querySelectorAll('.stat-card').forEach(card => {
            card.addEventListener('mouseenter', function () {
                this.style.transform = 'translateY(-8px) scale(1.02)';
            });

            card.addEventListener('mouseleave', function () {
                this.style.transform = 'translateY(0) scale(1)';
            });
        });
    }

    // Actualizar badge del carrito
    async updateCartBadge() {
        try {
            const response = await fetch('/carrito/count', {
                method: 'GET',
                credentials: 'same-origin',
                headers: {
                    'Accept': 'application/json'
                }
            });

            if (response.ok) {
                const data = await response.json();
                const badge = document.getElementById('carrito-badge');
                
                if (badge) {
                    if (data.count > 0) {
                        badge.textContent = data.count;
                        badge.style.display = 'flex';
                        badge.style.alignItems = 'center';
                        badge.style.justifyContent = 'center';
                    } else {
                        badge.style.display = 'none';
                    }
                }
            }
        } catch (error) {
            console.log('No se pudo cargar el contador del carrito:', error);
        }
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    window.userDashboard = new UserDashboard();
});