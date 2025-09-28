const { Vimeo } = require('@vimeo/vimeo');

// Configuración de Vimeo API
const vimeoConfig = {
  client_id: 'd29839450c90db59fe871f11ec287c75098a4490',
  client_secret: 'Bqj/qvGKJZK3TtgwZccMH6MKLN2Rtmo97TAgjV8GlqPai0H9ypFtKE0jEB1aibwVK/xMApdmnBmPGzoQ7Nv0ShjPH06VtYLZAVdezN/seQ8x7xIeSKZWlMLMEexn1Tx3',
  access_token: '7e7375d04b21e4849bf8acc52e14b7ef'
};

// Crear instancia de cliente Vimeo
const vimeo = new Vimeo(
  vimeoConfig.client_id,
  vimeoConfig.client_secret,
  vimeoConfig.access_token
);

class VimeoService {
  constructor() {
    this.client = vimeo;
  }

  /**
   * Sube un video a Vimeo
   * @param {string} filePath - Ruta del archivo de video
   * @param {object} videoData - Datos del video (título, descripción, etc.)
   * @returns {Promise<object>} - Información del video subido
   */
  async uploadVideo(filePath, videoData = {}) {
    return new Promise((resolve, reject) => {
      const uploadData = {
        name: videoData.titulo || 'Video sin título',
        description: videoData.descripcion || '',
        privacy: {
          view: videoData.privacidad || 'unlisted', // 'public', 'private', 'unlisted'
          embed: 'public'
        },
        embed: {
          color: '#ea580c', // Color naranja de tu marca
          title: {
            name: 'hide'
          },
          portrait: {
            name: 'hide'
          },
          byline: {
            name: 'hide'
          }
        }
      };

      console.log('[VIMEO] 📤 Iniciando upload de video:', videoData.titulo);
      
      this.client.upload(
        filePath,
        uploadData,
        (uri) => {
          console.log('[VIMEO] ✅ Video subido exitosamente:', uri);
          
          // Extraer ID del video de la URI
          const videoId = uri.split('/').pop();
          
          resolve({
            uri: uri,
            video_id: videoId,
            vimeo_url: `https://vimeo.com/${videoId}`,
            embed_url: `https://player.vimeo.com/video/${videoId}`,
            status: 'uploaded'
          });
        },
        (bytesUploaded, bytesTotal) => {
          const percentage = (bytesUploaded / bytesTotal * 100).toFixed(2);
          console.log('[VIMEO] 📊 Progreso:', `${percentage}%`);
        },
        (error) => {
          console.error('[VIMEO] ❌ Error en upload:', error);
          reject(error);
        }
      );
    });
  }

  /**
   * Obtiene información de un video de Vimeo
   * @param {string} videoId - ID del video en Vimeo
   * @returns {Promise<object>} - Información del video
   */
  async getVideoInfo(videoId) {
    return new Promise((resolve, reject) => {
      this.client.request({
        method: 'GET',
        path: `/videos/${videoId}`
      }, (error, body, statusCode, headers) => {
        if (error) {
          console.error('[VIMEO] ❌ Error obteniendo info:', error);
          reject(error);
        } else {
          resolve(body);
        }
      });
    });
  }

  /**
   * Actualiza información de un video en Vimeo
   * @param {string} videoId - ID del video
   * @param {object} updateData - Datos a actualizar
   * @returns {Promise<object>} - Respuesta de la API
   */
  async updateVideo(videoId, updateData) {
    return new Promise((resolve, reject) => {
      this.client.request({
        method: 'PATCH',
        path: `/videos/${videoId}`,
        query: updateData
      }, (error, body, statusCode, headers) => {
        if (error) {
          console.error('[VIMEO] ❌ Error actualizando video:', error);
          reject(error);
        } else {
          console.log('[VIMEO] ✅ Video actualizado:', videoId);
          resolve(body);
        }
      });
    });
  }

  /**
   * Elimina un video de Vimeo
   * @param {string} videoId - ID del video
   * @returns {Promise<boolean>} - True si se eliminó exitosamente
   */
  async deleteVideo(videoId) {
    return new Promise((resolve, reject) => {
      this.client.request({
        method: 'DELETE',
        path: `/videos/${videoId}`
      }, (error, body, statusCode, headers) => {
        if (error) {
          console.error('[VIMEO] ❌ Error eliminando video:', error);
          reject(error);
        } else {
          console.log('[VIMEO] 🗑️ Video eliminado:', videoId);
          resolve(true);
        }
      });
    });
  }

  /**
   * Obtiene el estado de procesamiento de un video
   * @param {string} videoId - ID del video
   * @returns {Promise<string>} - Estado del video ('uploading', 'available', 'quota_exceeded', etc.)
   */
  async getVideoStatus(videoId) {
    try {
      const videoInfo = await this.getVideoInfo(videoId);
      return videoInfo.status;
    } catch (error) {
      console.error('[VIMEO] ❌ Error obteniendo status:', error);
      return 'error';
    }
  }
}

module.exports = new VimeoService();