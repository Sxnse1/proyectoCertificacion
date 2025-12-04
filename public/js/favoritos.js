/**
 * Favoritos - Funcionalidad de cursos favoritos
 * Maneja búsqueda, filtros, eliminación y animaciones
 */

class FavoritosManager {
    constructor() {
        this.init();
    }

    init() {
        this.setupAnimations();
        this.setupSearch();
        this.setupFilters();
        console.log('⭐ Sistema de favoritos inicializado');
    }

    // Animaciones de entrada
    setupAnimations() {
        // Animar las tarjetas de favoritos
        const favoriteCards = document.querySelectorAll('.favorite-card');
        favoriteCards.forEach((card, index) => {
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

    // Configurar búsqueda
    setupSearch() {
        const searchInput = document.getElementById('searchInput');
        if (searchInput) {
            searchInput.addEventListener('input', () => this.buscarFavoritos());
        }
    }

    // Configurar filtros
    setupFilters() {
        // Los filtros se manejan a través de la función global filtrarPorNivel
        // que se llama desde los elementos del DOM
    }

    // Función para buscar favoritos
    buscarFavoritos() {
        const searchTerm = document.getElementById('searchInput').value.toLowerCase();
        const favoriteCards = document.querySelectorAll('.favorite-card');
        
        favoriteCards.forEach(card => {
            const title = card.getAttribute('data-titulo').toLowerCase();
            const description = card.getAttribute('data-descripcion').toLowerCase();
            
            if (title.includes(searchTerm) || description.includes(searchTerm)) {
                card.style.display = 'block';
            } else {
                card.style.display = 'none';
            }
        });
    }

    // Función para filtrar por nivel
    filtrarPorNivel(nivel, event) {
        const favoriteCards = document.querySelectorAll('.favorite-card');
        const filterTabs = document.querySelectorAll('.filter-tab');
        
        // Actualizar tabs activos
        filterTabs.forEach(tab => tab.classList.remove('active'));
        if (event && event.target) {
            event.target.classList.add('active');
        }
        
        favoriteCards.forEach(card => {
            const cardNivel = card.getAttribute('data-nivel');
            
            if (nivel === '' || cardNivel === nivel) {
                card.style.display = 'block';
            } else {
                card.style.display = 'none';
            }
        });
    }

    // Función para eliminar favorito
    async eliminarFavorito(cursoId) {
        // Usar SweetAlert2 para confirmación moderna
        const result = await Swal.fire({
            title: '¿Eliminar de favoritos?',
            text: '¿Estás seguro de que quieres eliminar este curso de tus favoritos?',
            icon: 'question',
            showCancelButton: true,
            confirmButtonColor: '#ea580c',
            cancelButtonColor: '#6b7280',
            confirmButtonText: '<i class="fas fa-heart-broken"></i> Sí, eliminar',
            cancelButtonText: '<i class="fas fa-times"></i> Cancelar',
            reverseButtons: true
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
            const response = await fetch('/favoritos/eliminar', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'csrf-token': window.csrfHelper ? window.csrfHelper.getToken() : ''
                },
                body: JSON.stringify({ cursoId: cursoId })
            });

            const result = await response.json();

            if (result.success) {
                await Swal.fire({
                    icon: 'success',
                    title: '¡Eliminado!',
                    text: 'El curso ha sido eliminado de tus favoritos',
                    timer: 1500,
                    showConfirmButton: false
                });
                window.location.reload();
            } else {
                Swal.fire({
                    icon: 'error',
                    title: 'Error',
                    text: result.message || 'Error al eliminar el curso de favoritos',
                    confirmButtonColor: '#ea580c'
                });
            }
        } catch (error) {
            console.error('Error:', error);
            Swal.fire({
                icon: 'error',
                title: 'Error de conexión',
                text: 'Inténtalo de nuevo más tarde',
                confirmButtonColor: '#ea580c'
            });
        }
    }

    // Función para mostrar notificaciones
    showToast(message, type) {
        // Crear elemento de notificación
        const toast = document.createElement('div');
        toast.className = `alert alert-${type === 'success' ? 'success' : 'danger'} position-fixed`;
        toast.style.cssText = 'top: 20px; right: 20px; z-index: 1050; min-width: 300px;';
        toast.innerHTML = `
            <div class="d-flex align-items-center">
                <i class="bi bi-${type === 'success' ? 'check-circle' : 'exclamation-triangle'} me-2"></i>
                ${message}
            </div>
        `;
        
        document.body.appendChild(toast);
        
        // Remover después de 3 segundos
        setTimeout(() => {
            if (toast.parentNode) {
                toast.parentNode.removeChild(toast);
            }
        }, 3000);
    }
}

// Global functions for onclick handlers
window.filtrarPorNivel = function(nivel) {
    if (window.favoritosManager) {
        window.favoritosManager.filtrarPorNivel(nivel, event);
    }
};

window.eliminarFavorito = function(cursoId) {
    if (window.favoritosManager) {
        return window.favoritosManager.eliminarFavorito(cursoId);
    }
};

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    window.favoritosManager = new FavoritosManager();
});