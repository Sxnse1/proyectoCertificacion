function suscribirse(idMembresia, nombre, precio) {
    if (confirm(`¿Confirmar suscripción al plan ${nombre} por $${precio}?`)) {
        fetch('/membresias/suscribirse', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ id_membresia: idMembresia })
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                alert('¡Suscripción exitosa! Redirigiendo a pasarela de pago...');
                window.location.href = '/pagos/procesar';
            } else {
                alert('Error: ' + data.message);
            }
        })
        .catch(error => {
            console.error('Error:', error);
            alert('Error al procesar la suscripción');
        });
    }
}