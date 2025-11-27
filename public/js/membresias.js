function suscribirse(idMembresia, nombre, precio) {
    if (confirm(`¿Confirmar suscripción al plan ${nombre} por $${precio}?`)) {
        
        // Mostrar indicador de carga
        const btn = event.target;
        const originalText = btn.innerHTML;
        btn.innerHTML = '🔄 Procesando...';
        btn.disabled = true;
        
        // Llamar a la nueva ruta que crea preferencia real de Mercado Pago
        fetch('/suscripciones/crear-preferencia-membresia', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ id_membresia: idMembresia })
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                // Redirigir a Mercado Pago usando la initPoint
                console.log('[MEMBRESIAS] Redirigiendo a Mercado Pago:', data.initPoint);
                window.location.href = data.initPoint;
            } else {
                alert('Error: ' + data.message);
                // Restaurar botón
                btn.innerHTML = originalText;
                btn.disabled = false;
            }
        })
        .catch(error => {
            console.error('Error:', error);
            alert('Error al procesar la suscripción. Intenta nuevamente.');
            // Restaurar botón
            btn.innerHTML = originalText;
            btn.disabled = false;
        });
    }
}