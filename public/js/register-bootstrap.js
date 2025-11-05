// Toggle password visibility
function togglePassword(fieldId) {
    const passwordInput = document.getElementById(fieldId);
    const toggleIcon = document.getElementById('passwordToggleIcon');
    
    if (passwordInput.type === 'password') {
        passwordInput.type = 'text';
        toggleIcon.className = 'bi bi-eye-slash';
    } else {
        passwordInput.type = 'password';
        toggleIcon.className = 'bi bi-eye';
    }
}

// Form submission with loading state
document.getElementById('registerForm').addEventListener('submit', function(e) {
    const button = document.getElementById('registerButton');
    const buttonText = button.querySelector('.button-text');
    
    // Validate terms checkbox
    const termsCheckbox = document.getElementById('terms');
    if (!termsCheckbox.checked) {
        e.preventDefault();
        alert('Debes aceptar los términos y condiciones para continuar.');
        return;
    }
    
    // Add loading state
    button.disabled = true;
    button.classList.add('btn-loading');
    buttonText.innerHTML = `
        <span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
        Creando cuenta...
    `;
});

// Auto-focus on first field
document.addEventListener('DOMContentLoaded', function() {
    document.getElementById('nombre').focus();
});

// Password strength indicator
document.getElementById('password').addEventListener('input', function(e) {
    const password = e.target.value;
    const strength = calculatePasswordStrength(password);
    // Could add visual indicator here
});

function calculatePasswordStrength(password) {
    let strength = 0;
    if (password.length >= 6) strength++;
    if (password.match(/[a-z]/)) strength++;
    if (password.match(/[A-Z]/)) strength++;
    if (password.match(/[0-9]/)) strength++;
    if (password.match(/[^a-zA-Z0-9]/)) strength++;
    return strength;
}

// Clear error messages after 5 seconds
setTimeout(function() {
    const alerts = document.querySelectorAll('.alert-danger');
    alerts.forEach(function(alert) {
        alert.style.opacity = '0';
        setTimeout(function() {
            alert.remove();
        }, 300);
    });
}, 5000);

console.log('📝 Sistema de Registro StartEducation iniciado');
console.log('🎨 Diseño Bootstrap 5.3 con colores naranja chedron');
console.log('✨ Validaciones y animaciones activas');