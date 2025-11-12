/**
 * Prueba del filtro de notificaciones del webhook
 */

const http = require('http');

console.log('🧪 Probando filtro de notificaciones del webhook...');

const testData = JSON.stringify({
    type: 'merchant_order', // Tipo diferente a 'payment'
    data: { id: 'order_12345' }
});

const options = {
    hostname: 'localhost',
    port: 3000,
    path: '/pagos/webhook-suscripcion',
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(testData)
    }
};

const req = http.request(options, (res) => {
    console.log(`📊 Status Code: ${res.statusCode}`);
    
    let body = '';
    res.on('data', (chunk) => {
        body += chunk;
    });
    
    res.on('end', () => {
        console.log(`📄 Response: ${body}`);
        
        if (body.includes('Evento no procesado')) {
            console.log('✅ Filtro de notificaciones funcionando correctamente');
            console.log('   Solo procesa eventos tipo "payment"');
        } else {
            console.log('⚠️ Respuesta inesperada del filtro');
        }
    });
});

req.on('error', (error) => {
    console.log('❌ Error:', error.message);
});

console.log('📤 Enviando notificación tipo "merchant_order"...');
req.write(testData);
req.end();