// Función para comprar curso
function comprarCurso(cursoId) {
    // Implementar lógica de compra o redireccionar al carrito
    window.location.href = `/carrito/agregar/${cursoId}`;
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