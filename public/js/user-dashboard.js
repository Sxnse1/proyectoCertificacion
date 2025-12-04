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
        this.setupFavoritosButtons();
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

                    // Manejar respuesta del servidor
                    const contentType = res.headers.get('content-type') || '';
                    
                    // Si es 401 Unauthorized, entonces sí es sesión expirada
                    if (res.status === 401) {
                        await Swal.fire({
                            icon: 'warning',
                            title: 'Sesión Expirada',
                            text: 'Tu sesión ha expirado. Por favor, inicia sesión nuevamente.',
                            confirmButtonText: 'Ir a Login',
                            confirmButtonColor: '#ea580c'
                        });
                        window.location.href = '/auth/login?error=sesion_expirada';
                        return;
                    }
                    
                    // Para otros errores, intentar parsear JSON
                    if (!res.ok) {
                        let errorMessage = 'No se pudo agregar al carrito';
                        
                        if (contentType.includes('application/json')) {
                            const errData = await res.json().catch(()=>null);
                            errorMessage = errData?.message || errorMessage;
                        }
                        
                        await Swal.fire({
                            icon: 'error',
                            title: 'Error',
                            text: errorMessage,
                            confirmButtonText: 'Entendido',
                            confirmButtonColor: '#ea580c'
                        });
                        
                        btn.disabled = false;
                        btn.innerHTML = originalHtml;
                        return;
                    }

                    // Respuesta exitosa - parsear JSON
                    let data = null;
                    if (contentType.includes('application/json')) {
                        data = await res.json().catch(()=>null);
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

    // Handler para botones 'Agregar a favoritos'
    setupFavoritosButtons() {
        document.querySelectorAll('.agregar-favorito-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const cursoId = btn.dataset.cursoId;
                btn.disabled = true;
                const originalHtml = btn.innerHTML;
                btn.innerHTML = '<i class="bi bi-hourglass-split"></i> Agregando...';

                try {
                    // Obtener token CSRF
                    const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content');
                    
                    const res = await fetch('/favoritos/add', {
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

                    const contentType = res.headers.get('content-type') || '';
                    
                    // Si es 401 Unauthorized, entonces sí es sesión expirada
                    if (res.status === 401) {
                        await Swal.fire({
                            icon: 'warning',
                            title: 'Sesión Expirada',
                            text: 'Tu sesión ha expirado. Por favor, inicia sesión nuevamente.',
                            confirmButtonText: 'Ir a Login',
                            confirmButtonColor: '#ea580c'
                        });
                        window.location.href = '/auth/login?error=sesion_expirada';
                        return;
                    }
                    
                    // Para otros errores, intentar parsear JSON
                    if (!res.ok) {
                        let errorMessage = 'No se pudo agregar a favoritos';
                        
                        if (contentType.includes('application/json')) {
                            const errData = await res.json().catch(()=>null);
                            errorMessage = errData?.message || errorMessage;
                        }
                        
                        await Swal.fire({
                            icon: 'error',
                            title: 'Error',
                            text: errorMessage,
                            confirmButtonText: 'Entendido',
                            confirmButtonColor: '#ea580c'
                        });
                        
                        btn.disabled = false;
                        btn.innerHTML = originalHtml;
                        return;
                    }

                    // Respuesta exitosa - parsear JSON
                    let data = null;
                    if (contentType.includes('application/json')) {
                        data = await res.json().catch(()=>null);
                    }

                    if (data && data.success) {
                        btn.innerHTML = '<i class="bi bi-heart-fill"></i> Favorito';
                        btn.classList.remove('btn-outline-danger');
                        btn.classList.add('btn-outline-danger');
                        btn.title = 'Ya está en favoritos';
                        
                        await Swal.fire({
                            icon: 'success',
                            title: '¡Agregado a Favoritos!',
                            text: 'El curso se ha agregado a tus favoritos exitosamente',
                            showConfirmButton: false,
                            timer: 1500,
                            timerProgressBar: true
                        });
                    } else {
                        await Swal.fire({
                            icon: 'info',
                            title: 'Ya en Favoritos',
                            text: data?.message || 'Este curso ya está en tus favoritos',
                            confirmButtonText: 'Entendido',
                            confirmButtonColor: '#ea580c'
                        });
                        btn.disabled = false;
                        btn.innerHTML = originalHtml;
                    }
                } catch (err) {
                    console.error('[Favoritos] ❌ Error:', err);
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