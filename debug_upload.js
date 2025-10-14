// debug_upload.js
// Script para debuggear problemas de upload
require('dotenv').config();
const bunnyService = require('./services/bunnyService');

async function debugUpload() {
    console.log('🔍 DEBUGGING UPLOAD PROCESS');
    console.log('=========================');
    
    // 1. Verificar variables de entorno
    console.log('1. Variables de entorno:');
    console.log('   BUNNY_API_KEY:', process.env.BUNNY_API_KEY ? 'SET' : 'NOT SET');
    console.log('   BUNNY_LIBRARY_ID:', process.env.BUNNY_LIBRARY_ID);
    console.log('   BUNNY_CDN_HOSTNAME:', process.env.BUNNY_CDN_HOSTNAME);
    
    // 2. Probar instanciación del servicio
    console.log('\n2. Probando instancia de BunnyService...');
    try {
        const service = require('./services/bunnyService');
        console.log('   ✅ BunnyService instanciado correctamente');
        console.log('   API Key:', service.apiKey ? service.apiKey.substring(0, 10) + '...' : 'NO SET');
        console.log('   Library ID:', service.libraryId);
    } catch (error) {
        console.log('   ❌ Error instanciando BunnyService:', error.message);
    }
    
    // 3. Probar conexión básica
    console.log('\n3. Probando conexión a API...');
    try {
        const result = await bunnyService.listVideos();
        console.log('   ✅ Conexión exitosa, videos encontrados:', result.length);
    } catch (error) {
        console.log('   ❌ Error de conexión:', error.message);
        if (error.response) {
            console.log('   Status:', error.response.status);
            console.log('   Data:', error.response.data);
        }
    }
    
    // 4. Probar creación de video (sin archivo)
    console.log('\n4. Probando creación de video test...');
    try {
        const testVideo = {
            titulo: 'Test Debug Video'
        };
        
        // Simulamos solo la parte de creación, no el upload de archivo
        const axios = require('axios');
        const api = axios.create({
            baseURL: 'https://video.bunnycdn.com',
            headers: {
                'AccessKey': process.env.BUNNY_API_KEY,
                'Content-Type': 'application/json'
            }
        });
        
        const response = await api.post(`/library/${process.env.BUNNY_LIBRARY_ID}/videos`, {
            title: testVideo.titulo
        });
        
        console.log('   ✅ Video test creado:', response.data.guid);
        
        // Eliminar el video test
        await api.delete(`/library/${process.env.BUNNY_LIBRARY_ID}/videos/${response.data.guid}`);
        console.log('   ✅ Video test eliminado');
        
    } catch (error) {
        console.log('   ❌ Error creando video test:', error.message);
        if (error.response) {
            console.log('   Status:', error.response.status);
            console.log('   Data:', error.response.data);
        }
    }
}

debugUpload().catch(console.error);