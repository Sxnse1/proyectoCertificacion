// Mostrar fecha y hora actual
document.getElementById('currentDate').textContent = new Date().toLocaleString('es-ES');

// Confirmación antes de cerrar sesión
document.querySelector('form[action="/auth/logout"]').addEventListener('submit', function(e) {
    if (!confirm('¿Estás seguro de que quieres cerrar sesión?')) {
        e.preventDefault();
    }
});

// Animación de entrada para las tarjetas
const cards = document.querySelectorAll('.action-card');
cards.forEach((card, index) => {
    card.style.opacity = '0';
    card.style.transform = 'translateY(20px)';
    setTimeout(() => {
        card.style.transition = 'all 0.5s ease';
        card.style.opacity = '1';
        card.style.transform = 'translateY(0)';
    }, index * 100);
});