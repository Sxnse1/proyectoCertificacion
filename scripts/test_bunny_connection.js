require('dotenv').config();
const bunnyService = require('../services/bunnyService');

/**
 * Script de prueba para verificar la conexión y configuración de Bunny.net
 * Ejecutar: node scripts/test_bunny_connection.js
 */

async function testBunnyConnection() {
  console.log('🧪 Probando conexión con Bunny.net Stream...');
  console.log('===============================================');

  try {
    // 1. Verificar variables de entorno
    console.log('🔑 1. Verificando configuración...');
    
    const apiKey = process.env.BUNNY_API_KEY;
    const libraryId = process.env.BUNNY_LIBRARY_ID;
    const cdnHostname = process.env.BUNNY_CDN_HOSTNAME;

    if (!apiKey) {
      throw new Error('❌ BUNNY_API_KEY no configurado en variables de entorno');
    }
    
    if (!libraryId) {
      throw new Error('❌ BUNNY_LIBRARY_ID no configurado en variables de entorno');
    }

    console.log(`✅ API Key: ${apiKey.substring(0, 10)}****** (configurado)`);
    console.log(`✅ Library ID: ${libraryId}`);
    console.log(`✅ CDN Hostname: ${cdnHostname || 'iframe.mediadelivery.net (default)'}`);

    // 2. Probar conexión listando videos
    console.log('\n📋 2. Probando conexión API...');
    
    const videos = await bunnyService.listVideos({ itemsPerPage: 5 });
    console.log(`✅ Conexión exitosa - ${videos.length} videos encontrados en la librería`);
    
    if (videos.length > 0) {
      console.log('\n📹 Primeros videos en la librería:');
      videos.slice(0, 3).forEach((video, index) => {
        console.log(`   ${index + 1}. ${video.title || 'Sin título'} (ID: ${video.guid})`);
      });
    } else {
      console.log('ℹ️ La librería está vacía (esto es normal si es nueva)');
    }

    // 3. Probar generación de URLs
    console.log('\n🔗 3. Probando generación de URLs...');
    
    const testVideoId = 'test-video-id-123';
    const embedUrl = bunnyService.getEmbedUrl(testVideoId);
    const thumbnailUrl = bunnyService.getThumbnailUrl(testVideoId);
    const directPlayUrl = bunnyService.getDirectPlayUrl(testVideoId, '720p');

    console.log(`✅ Embed URL: ${embedUrl}`);
    console.log(`✅ Thumbnail URL: ${thumbnailUrl}`);
    console.log(`✅ Direct Play URL: ${directPlayUrl}`);

    // 4. Mostrar información del servicio
    console.log('\n📊 4. Información del servicio:');
    console.log(`   Base URL: ${bunnyService.baseUrl || 'https://video.bunnycdn.com'}`);
    console.log(`   Stream Base URL: ${bunnyService.streamBaseUrl || 'https://iframe.mediadelivery.net'}`);

    console.log('\n🎉 ¡Todas las pruebas pasaron exitosamente!');
    console.log('Tu configuración de Bunny.net está lista para usar.');

  } catch (error) {
    console.error('\n💥 Error en la prueba de conexión:');
    console.error(`❌ ${error.message}`);
    
    if (error.response) {
      console.error(`📡 Estado HTTP: ${error.response.status}`);
      console.error(`📄 Respuesta: ${JSON.stringify(error.response.data, null, 2)}`);
    }

    console.log('\n🔧 Posibles soluciones:');
    console.log('1. Verificar que BUNNY_API_KEY sea correcta');
    console.log('2. Verificar que BUNNY_LIBRARY_ID sea correcto');
    console.log('3. Verificar conexión a internet');
    console.log('4. Verificar que la librería existe en tu cuenta de Bunny.net');
    
    process.exit(1);
  }
}

// Función para mostrar información de ayuda
function showHelp() {
  console.log('🛠️ Test de Conexión Bunny.net Stream');
  console.log('=====================================');
  console.log('');
  console.log('Este script verifica que tu configuración de Bunny.net esté correcta.');
  console.log('');
  console.log('📋 Requisitos previos:');
  console.log('1. Cuenta en Bunny.net creada');
  console.log('2. Video Library creada en el dashboard');
  console.log('3. Variables de entorno configuradas en .env:');
  console.log('   BUNNY_API_KEY=tu_api_key_aqui');
  console.log('   BUNNY_LIBRARY_ID=tu_library_id_aqui');
  console.log('');
  console.log('🚀 Ejecución:');
  console.log('   node scripts/test_bunny_connection.js');
  console.log('');
}

// Ejecutar si es llamado directamente
if (require.main === module) {
  const args = process.argv.slice(2);
  
  if (args.includes('--help') || args.includes('-h')) {
    showHelp();
  } else {
    testBunnyConnection();
  }
}

module.exports = { testBunnyConnection };