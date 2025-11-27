// Función para mostrar notificaciones suaves
function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) return;
    
    const bgClass = type === 'success' ? 'bg-success' : 
                   type === 'error' ? 'bg-danger' : 
                   type === 'warning' ? 'bg-warning' : 'bg-info';
    
    const toast = document.createElement('div');
    toast.className = `toast align-items-center text-white ${bgClass}`;
    toast.setAttribute('role', 'alert');
    toast.setAttribute('aria-live', 'assertive');
    toast.setAttribute('aria-atomic', 'true');
    toast.style.minWidth = '280px';
    toast.style.marginBottom = '8px';
    
    toast.innerHTML = `
        <div class="d-flex">
            <div class="toast-body">
                ${message}
            </div>
            <button type="button" class="btn-close btn-close-white me-2 m-auto" onclick="this.parentElement.parentElement.remove()" aria-label="Cerrar"></button>
        </div>
    `;
    
    container.appendChild(toast);
    
    // Auto-remover después de 4 segundos
    setTimeout(() => {
        toast.style.transition = 'opacity 0.3s';
        toast.style.opacity = '0';
        setTimeout(() => toast.remove(), 300);
    }, 4000);
}

// Función para agregar al carrito (alias de comprarCurso)
async function agregarAlCarrito(cursoId) {
    return await comprarCurso(cursoId);
}

// Función para comprar curso (agregar al carrito)
async function comprarCurso(cursoId) {
    const btnComprar = document.getElementById('btnComprarCurso');
    const btnIrCarrito = document.getElementById('btnIrCarrito');
    
    // Mostrar estado de carga
    if (btnComprar) {
        btnComprar.disabled = true;
        btnComprar.innerHTML = '<i class="bi bi-arrow-clockwise me-2 spinner-border spinner-border-sm"></i>Agregando...';
    }
    
    try {
        const response = await fetch('/carrito/add', {
            method: 'POST',
            credentials: 'same-origin',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                id_curso: cursoId
            })
        });

        if (response.ok) {
            const data = await response.json();
            if (data.success) {
                showToast('✅ Curso agregado al carrito exitosamente', 'success');
                
                // Cambiar la apariencia del botón
                if (btnComprar && btnIrCarrito) {
                    btnComprar.style.display = 'none';
                    btnIrCarrito.style.display = 'inline-block';
                }
            } else {
                showToast('❌ ' + (data.message || 'No se pudo agregar al carrito'), 'error');
                // Restaurar botón
                if (btnComprar) {
                    btnComprar.disabled = false;
                    btnComprar.innerHTML = '<i class="bi bi-cart-plus me-2"></i>Agregar al Carrito';
                }
            }
        } else {
            const contentType = response.headers.get('content-type') || '';
            if (contentType.includes('application/json')) {
                const errData = await response.json().catch(()=>null);
                showToast('❌ ' + (errData?.message || 'Error al agregar al carrito'), 'error');
            } else {
                showToast('❌ Debes iniciar sesión para agregar cursos al carrito', 'warning');
                setTimeout(() => {
                    window.location.href = '/auth/login?error=sesion_expirada';
                }, 2000);
            }
            
            // Restaurar botón
            if (btnComprar) {
                btnComprar.disabled = false;
                btnComprar.innerHTML = '<i class="bi bi-cart-plus me-2"></i>Agregar al Carrito';
            }
        }
    } catch (error) {
        console.error('Error:', error);
        showToast('❌ Error de conexión. Intenta nuevamente.', 'error');
        
        // Restaurar botón
        if (btnComprar) {
            btnComprar.disabled = false;
            btnComprar.innerHTML = '<i class="bi bi-cart-plus me-2"></i>Agregar al Carrito';
        }
    }
}

// Función para quitar del carrito
async function quitarDelCarrito(cursoId) {
    if (!confirm('¿Estás seguro de que quieres quitar este curso del carrito?')) {
        return;
    }
    
    try {
        const response = await fetch(`/carrito/eliminar/curso/${cursoId}`, {
            method: 'DELETE',
            credentials: 'same-origin',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            }
        });

        if (response.ok) {
            const data = await response.json();
            if (data.success) {
                showToast('✅ Curso quitado del carrito', 'success');
                // Recargar la página para actualizar el estado
                setTimeout(() => location.reload(), 1000);
            } else {
                showToast('❌ ' + (data.message || 'No se pudo quitar del carrito'), 'error');
            }
        } else {
            showToast('❌ Error al quitar del carrito', 'error');
        }
    } catch (error) {
        console.error('Error:', error);
        showToast('❌ Error de conexión', 'error');
    }
}

// Mejorar la experiencia de los acordeones de módulos
document.addEventListener('DOMContentLoaded', function () {
    const moduleHeaders = document.querySelectorAll('.module-header');

    moduleHeaders.forEach(header => {
        header.addEventListener('click', function () {
            const chevron = this.querySelector('.bi-chevron-down, .bi-chevron-up');
            if (chevron) {
                chevron.classList.toggle('bi-chevron-down');
                chevron.classList.toggle('bi-chevron-up');
            }
        });
    });
});

// Animaciones suaves para las tarjetas
const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px'
};

const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.style.opacity = '1';
            entry.target.style.transform = 'translateY(0)';
        }
    });
}, observerOptions);

document.querySelectorAll('.module-card').forEach(card => {
    card.style.opacity = '0';
    card.style.transform = 'translateY(20px)';
    card.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
    observer.observe(card);
});