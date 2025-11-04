require('dotenv').config();

console.log('🔍 Diagnóstico de Bunny.net');
console.log('========================');

console.log('Variables de entorno:');
console.log(`BUNNY_API_KEY: ${process.env.BUNNY_API_KEY ? `${process.env.BUNNY_API_KEY.substring(0, 8)}...` : 'NO CONFIGURADO'}`);
console.log(`BUNNY_LIBRARY_ID: ${process.env.BUNNY_LIBRARY_ID || 'NO CONFIGURADO'}`);
console.log(`BUNNY_CDN_HOSTNAME: ${process.env.BUNNY_CDN_HOSTNAME || 'NO CONFIGURADO'}`);

// Probar una request simple
const axios = require('axios');

async function testBunnyConnection() {
  try {
    console.log('\n🧪 Probando conexión...');
    
    const response = await axios.get(`https://video.bunnycdn.com/library/${process.env.BUNNY_LIBRARY_ID}/videos`, {
      headers: {
        'AccessKey': process.env.BUNNY_API_KEY
      },
      params: {
        page: 1,
        itemsPerPage: 1
      }
    });
    
    console.log('✅ Conexión exitosa!');
    console.log(`📊 Total de videos: ${response.data.totalItems || 0}`);
    
  } catch (error) {
    console.log('❌ Error de conexión:');
    console.log(`Status: ${error.response?.status}`);
    console.log(`Message: ${error.response?.data?.Message || error.message}`);
    
    if (error.response?.status === 401) {
      console.log('\n💡 Sugerencias para error 401:');
      console.log('1. Verificar que BUNNY_API_KEY sea correcta');
      console.log('2. Verificar que BUNNY_LIBRARY_ID sea correcto');
      console.log('3. Verificar que la librería exista en tu cuenta');
    }
  }
}

testBunnyConnection();