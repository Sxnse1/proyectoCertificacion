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
        document.querySelectorAll('.agregar-carrito-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const cursoId = btn.dataset.cursoId;
                btn.disabled = true;
                const originalHtml = btn.innerHTML;
                btn.innerHTML = '<i class="bi bi-hourglass-split"></i> Agregando...';

                try {
                    const res = await fetch(`/carrito/agregar/${cursoId}`, {
                        method: 'POST',
                        credentials: 'same-origin',
                        headers: {
                            'Accept': 'application/json'
                        }
                    });

                    // If server redirected to login it may return HTML; handle that gracefully
                    const contentType = res.headers.get('content-type') || '';
                    if (!res.ok) {
                        // For non-2xx responses try to parse JSON, otherwise show generic message
                        if (contentType.includes('application/json')) {
                            const errData = await res.json().catch(()=>null);
                            alert(errData?.message || 'No se pudo agregar al carrito');
                        } else {
                            // Probably a redirect to login (HTML)
                            alert('Debes iniciar sesión para agregar cursos al carrito');
                            // Optionally redirect to login
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
                        alert('Debes iniciar sesión para agregar cursos al carrito');
                        window.location.href = '/auth/login?error=sesion_expirada';
                        btn.disabled = false;
                        btn.innerHTML = originalHtml;
                        return;
                    }

                    if (data && data.success) {
                        btn.innerHTML = '<i class="bi bi-check2-circle"></i> Agregado';
                        setTimeout(() => { btn.style.display = 'none'; }, 1200);
                    } else {
                        alert(data?.message || 'No se pudo agregar al carrito');
                        btn.disabled = false;
                        btn.innerHTML = originalHtml;
                    }
                } catch (err) {
                    console.error(err);
                    alert('Error al agregar al carrito');
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
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    window.userDashboard = new UserDashboard();
});