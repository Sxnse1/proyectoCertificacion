// Inicializar cuando carga la página
document.addEventListener('DOMContentLoaded', function() {
    // Configurar formulario de verificación
    document.getElementById('verificarForm').addEventListener('submit', handleVerificarSubmit);
});

// Manejar envío del formulario de verificación
async function handleVerificarSubmit(e) {
    e.preventDefault();
    
    const codigo = document.getElementById('codigo_verificacion').value.trim().toUpperCase();
    
    if (!codigo) {
        alert('❌ El código de validación es obligatorio');
        return;
    }
    
    try {
        showLoading(true);
        
        const response = await fetch(`/certificados/verificar/${codigo}`);
        const data = await response.json();
        
        const resultadoDiv = document.getElementById('verificacion_resultado');
        
        if (data.valid) {
            const cert = data.certificado;
            resultadoDiv.innerHTML = `
                <div class="alert alert-success">
                    <h6><i class="bi bi-check-circle me-2"></i>Certificado Válido</h6>
                    <p><strong>Usuario:</strong> ${cert.usuario_nombre}</p>
                    <p><strong>Curso:</strong> ${cert.curso_titulo}</p>
                    <p><strong>Instructor:</strong> ${cert.instructor_nombre}</p>
                    <p><strong>Fecha de Emisión:</strong> ${new Date(cert.fecha_emision).toLocaleDateString()}</p>
                </div>
            `;
        } else {
            resultadoDiv.innerHTML = `
                <div class="alert alert-danger">
                    <h6><i class="bi bi-x-circle me-2"></i>Certificado No Válido</h6>
                    <p>${data.message}</p>
                </div>
            `;
        }
        
        resultadoDiv.style.display = 'block';
    } catch (error) {
        console.error('Error:', error);
        alert('❌ Error verificando el certificado');
    } finally {
        showLoading(false);
    }
}

// Ver detalles del certificado
async function verCertificado(id) {
    try {
        showLoading(true);
        
        const response = await fetch(`/certificados/${id}`);
        const data = await response.json();
        
        if (data.error) {
            alert('❌ Error: ' + data.error);
            return;
        }
        
        const info = `
Detalles del Certificado

ID: ${data.id_certificado}
Código: ${data.codigo_validacion}
Curso: ${data.curso_titulo}
Instructor: ${data.instructor_nombre}
Fecha de Emisión: ${new Date(data.fecha_emision).toLocaleDateString()}

Este certificado acredita que has completado exitosamente el curso.
        `;
        
        alert(info);
    } catch (error) {
        console.error('Error:', error);
        alert('❌ Error cargando los detalles del certificado');
    } finally {
        showLoading(false);
    }
}

// Descargar certificado
function descargarCertificado(id) {
    alert('🚧 Descarga de certificados en desarrollo...\n\nPronto podrás descargar tus certificados en formato PDF.');
}

// Copiar código al portapapeles
function copyToClipboard(text) {
    navigator.clipboard.writeText(text).then(() => {
        // Mostrar feedback visual temporal
        const element = event.target;
        const originalText = element.textContent;
        const originalStyle = element.style.cssText;
        
        element.textContent = 'Copiado!';
        element.style.background = 'var(--success-color)';
        element.style.color = 'white';
        
        setTimeout(() => {
            element.textContent = originalText;
            element.style.cssText = originalStyle;
        }, 1000);
    }).catch(() => {
        // Fallback para navegadores que no soportan clipboard API
        const textArea = document.createElement('textarea');
        textArea.value = text;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        
        alert('Código copiado al portapapeles: ' + text);
    });
}

// Mostrar/ocultar loading
function showLoading(show) {
    const overlay = document.getElementById('loadingOverlay');
    overlay.style.display = show ? 'flex' : 'none';
}