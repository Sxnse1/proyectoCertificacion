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
        if (!confirm('¿Estás seguro de que quieres eliminar este curso de tus favoritos?')) {
            return;
        }

        try {
            const response = await fetch('/favoritos/eliminar', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ cursoId: cursoId })
            });

            const result = await response.json();

            if (result.success) {
                // Mostrar mensaje de éxito
                this.showToast('Curso eliminado de favoritos exitosamente', 'success');
                
                // Recargar la página después de un breve delay
                setTimeout(() => {
                    window.location.reload();
                }, 1500);
            } else {
                this.showToast(result.message || 'Error al eliminar el curso de favoritos', 'error');
            }
        } catch (error) {
            console.error('Error:', error);
            this.showToast('Error de conexión. Inténtalo de nuevo.', 'error');
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