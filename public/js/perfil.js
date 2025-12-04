// Profile Form Handler
document.getElementById('profile-form').addEventListener('submit', async function(e) {
  e.preventDefault();
  
  const form = this;
  const submitBtn = form.querySelector('button[type="submit"]');
  const btnText = submitBtn.querySelector('.btn-text');
  const spinner = submitBtn.querySelector('.spinner-border');
  
  // Show loading state
  submitBtn.disabled = true;
  btnText.textContent = 'Actualizando...';
  spinner.classList.remove('d-none');
  
  const formData = new FormData(form);
  const data = Object.fromEntries(formData);
  
  try {
    const response = await fetch('/perfil/actualizar', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'csrf-token': window.csrfHelper ? window.csrfHelper.getToken() : ''
      },
      body: JSON.stringify(data)
    });
    
    const result = await response.json();
    
    if (result.success) {
      showAlert('success', result.message);
    } else {
      showAlert('danger', result.error);
    }
  } catch (error) {
    showAlert('danger', 'Error al actualizar perfil');
    console.error('Error:', error);
  } finally {
    // Hide loading state
    submitBtn.disabled = false;
    btnText.textContent = 'Actualizar Información';
    spinner.classList.add('d-none');
  }
});

// Password Form Handler
document.getElementById('password-form').addEventListener('submit', async function(e) {
  e.preventDefault();
  
  const form = this;
  const submitBtn = form.querySelector('button[type="submit"]');
  const btnText = submitBtn.querySelector('.btn-text');
  const spinner = submitBtn.querySelector('.spinner-border');
  
  // Show loading state
  submitBtn.disabled = true;
  btnText.textContent = 'Cambiando...';
  spinner.classList.remove('d-none');
  
  const formData = new FormData(form);
  const data = Object.fromEntries(formData);
  
  try {
    const response = await fetch('/perfil/cambiar-password', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data)
    });
    
    const result = await response.json();
    
    if (result.success) {
      showAlert('success', result.message);
      form.reset();
    } else {
      showAlert('danger', result.error);
    }
  } catch (error) {
    showAlert('danger', 'Error al cambiar contraseña');
    console.error('Error:', error);
  } finally {
    // Hide loading state
    submitBtn.disabled = false;
    btnText.textContent = 'Cambiar Contraseña';
    spinner.classList.add('d-none');
  }
});

// Show Alert Function
function showAlert(type, message) {
  const alertsContainer = document.getElementById('profile-alerts');
  const alert = document.createElement('div');
  alert.className = `alert alert-${type} alert-dismissible fade show`;
  alert.innerHTML = `
    ${message}
    <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
  `;
  
  alertsContainer.innerHTML = '';
  alertsContainer.appendChild(alert);
  
  // Auto dismiss after 5 seconds
  setTimeout(() => {
    if (alert.parentNode) {
      alert.classList.remove('show');
      setTimeout(() => {
        if (alert.parentNode) {
          alert.remove();
        }
      }, 150);
    }
  }, 5000);
}