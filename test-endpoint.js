/**
 * Prueba real del endpoint de pagos
 */

const http = require('http');

// Simular datos de sesión para usuario 2
const testData = JSON.stringify({
    test: true
});

const options = {
    hostname: 'localhost',
    port: 3000,
    path: '/pagos/crear-preferencia',
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(testData),
        // Simular que hay sesión activa (en un caso real vendría de la cookie)
        'Authorization': 'Bearer test'
    }
};

console.log('🧪 Probando endpoint real de pagos...\n');

const req = http.request(options, (res) => {
    console.log(`📊 Status Code: ${res.statusCode}`);
    console.log(`📋 Headers:`, res.headers);
    
    let data = '';
    
    res.on('data', (chunk) => {
        data += chunk;
    });
    
    res.on('end', () => {
        console.log('\n📄 Respuesta del servidor:');
        try {
            const jsonResponse = JSON.parse(data);
            console.log(JSON.stringify(jsonResponse, null, 2));
        } catch (e) {
            console.log(data);
        }
        
        console.log('\n🎯 Análisis de la respuesta:');
        if (res.statusCode === 401) {
            console.log('   ✅ Autenticación requerida - Comportamiento correcto');
            console.log('   ℹ️  El endpoint está funcionando y valida sesiones');
        } else if (res.statusCode === 200) {
            console.log('   ✅ Preferencia creada exitosamente');
        } else {
            console.log(`   ⚠️  Status inesperado: ${res.statusCode}`);
        }
    });
});

req.on('error', (error) => {
    console.error('❌ Error en la solicitud:', error.message);
});

req.write(testData);
req.end();