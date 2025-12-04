/**
 * Cursos Estudiante - Funcionalidad de la página de cursos para estudiantes
 * Maneja animaciones, búsqueda en tiempo real y carrito
 */

class CursosEstudianteManager {
    constructor() {
        this.init();
    }

    init() {
        this.setupAnimations();
        this.setupSearch();
        console.log('📚 Sistema de cursos estudiante inicializado');
    }

    // Animaciones de entrada
    setupAnimations() {
        // Animar las tarjetas de curso
        const courseCards = document.querySelectorAll('.course-card');
        courseCards.forEach((card, index) => {
            card.style.opacity = '0';
            card.style.transform = 'translateY(20px)';
            setTimeout(() => {
                card.style.transition = 'all 0.6s ease';
                card.style.opacity = '1';
                card.style.transform = 'translateY(0)';
            }, index * 100);
        });

        // Animar las estadísticas
        const statCards = document.querySelectorAll('.stat-card');
        statCards.forEach((card, index) => {
            card.style.opacity = '0';
            card.style.transform = 'translateY(20px)';
            setTimeout(() => {
                card.style.transition = 'all 0.6s ease';
                card.style.opacity = '1';
                card.style.transform = 'translateY(0)';
            }, index * 80);
        });
    }

    // Configurar búsqueda en tiempo real
    setupSearch() {
        const searchInput = document.querySelector('.search-input');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.filtrarCursos(e.target.value);
            });
        }
    }

    // Filtros en tiempo real
    filtrarCursos(searchTerm) {
        const courseCards = document.querySelectorAll('.course-card');
        const searchLower = searchTerm.toLowerCase();

        courseCards.forEach(card => {
            const title = card.querySelector('.course-title').textContent.toLowerCase();
            const description = card.querySelector('.course-description').textContent.toLowerCase();

            if (title.includes(searchLower) || description.includes(searchLower)) {
                card.style.display = 'block';
            } else {
                card.style.display = 'none';
            }
        });
    }

    // Función para agregar al carrito desde la lista
    async agregarAlCarritoLista(cursoId, buttonElement) {
        try {
            // Obtener token CSRF
            const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content');
            
            console.log('[Carrito] 🔑 Token CSRF:', csrfToken ? 'encontrado' : 'NO ENCONTRADO');
            
            const response = await fetch('/carrito/add', {
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

            const data = await response.json();

            if (data.success) {
                // Mostrar notificación de éxito
                const originalHtml = buttonElement.innerHTML;
                buttonElement.innerHTML = '<i class="bi bi-check"></i>';
                buttonElement.classList.remove('btn-success');
                buttonElement.classList.add('btn-outline-success');
                buttonElement.disabled = true;

                await Swal.fire({
                    icon: 'success',
                    title: '¡Agregado!',
                    text: 'El curso se ha agregado al carrito exitosamente',
                    showConfirmButton: false,
                    timer: 1500,
                    timerProgressBar: true
                });

                setTimeout(() => {
                    buttonElement.innerHTML = originalHtml;
                    buttonElement.classList.remove('btn-outline-success');
                    buttonElement.classList.add('btn-success');
                    buttonElement.disabled = false;
                }, 2000);
            } else {
                await Swal.fire({
                    icon: 'error',
                    title: 'Error',
                    text: data.message || 'No se pudo agregar el curso al carrito',
                    confirmButtonText: 'Entendido',
                    confirmButtonColor: '#ea580c'
                });
            }
        } catch (error) {
            console.error('Error:', error);
            await Swal.fire({
                icon: 'error',
                title: 'Error de Conexión',
                text: 'No se pudo conectar con el servidor. Intenta nuevamente.',
                confirmButtonText: 'Entendido',
                confirmButtonColor: '#ea580c'
            });
        }
    }
}

// Global function for onclick handlers
window.agregarAlCarritoLista = function(cursoId) {
    if (window.cursosEstudianteManager) {
        const buttonElement = event.target.closest('button');
        window.cursosEstudianteManager.agregarAlCarritoLista(cursoId, buttonElement);
    }
};

// Global function para agregar a favoritos
window.agregarAFavoritos = async function(cursoId) {
    const buttonElement = event.target.closest('button');
    
    try {
        // Obtener token CSRF
        const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content');
        
        console.log('[Favoritos] 💖 Agregando curso a favoritos:', cursoId);
        
        const response = await fetch('/favoritos/add', {
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

        const data = await response.json();

        if (data.success) {
            // Cambiar el botón a estado "agregado"
            buttonElement.innerHTML = '<i class="bi bi-heart-fill"></i>';
            buttonElement.classList.remove('btn-outline-danger');
            buttonElement.classList.add('btn-outline-danger');
            buttonElement.disabled = true;
            buttonElement.title = 'Ya está en favoritos';

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
                text: data.message || 'Este curso ya está en tus favoritos',
                confirmButtonText: 'Entendido',
                confirmButtonColor: '#ea580c'
            });
        }
    } catch (error) {
        console.error('[Favoritos] ❌ Error:', error);
        await Swal.fire({
            icon: 'error',
            title: 'Error de Conexión',
            text: 'No se pudo conectar con el servidor. Intenta nuevamente.',
            confirmButtonText: 'Entendido',
            confirmButtonColor: '#ea580c'
        });
    }
};

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    window.cursosEstudianteManager = new CursosEstudianteManager();
});