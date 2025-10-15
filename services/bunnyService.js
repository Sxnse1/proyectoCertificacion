require('dotenv').config();
const axios = require('axios');
const fs = require('fs');
const FormData = require('form-data');

// Configuración de Bunny.net Stream API
const bunnyConfig = {
  // IMPORTANTE: Reemplaza estos valores con tus credenciales reales de Bunny.net
  apiKey: process.env.BUNNY_API_KEY || 'TU_API_KEY_AQUI',
  libraryId: process.env.BUNNY_LIBRARY_ID || 'TU_LIBRARY_ID_AQUI',
  cdnHostname: process.env.BUNNY_CDN_HOSTNAME || 'iframe.mediadelivery.net', // Hostname de tu zona de CDN
  baseUrl: 'https://video.bunnycdn.com',
  streamBaseUrl: 'https://iframe.mediadelivery.net'
};

class BunnyService {
  constructor() {
    this.apiKey = bunnyConfig.apiKey;
    this.libraryId = bunnyConfig.libraryId;
    this.baseUrl = bunnyConfig.baseUrl;
    this.streamBaseUrl = bunnyConfig.streamBaseUrl;
    this.cdnHostname = bunnyConfig.cdnHostname;
    
    // Configurar axios con headers por defecto
    this.api = axios.create({
      baseURL: this.baseUrl,
      headers: {
        'AccessKey': this.apiKey,
        'Content-Type': 'application/json'
      }
    });
  }

  /**
   * Sube un video a Bunny.net Stream
   * @param {string} filePath - Ruta del archivo de video
   * @param {object} videoData - Datos del video (título, descripción, etc.)
   * @returns {Promise<object>} - Información del video subido
   */
  async uploadVideo(filePath, videoData = {}) {
    try {
      console.log('[BUNNY] 📤 Iniciando upload de video:', videoData.titulo);
      
      // 1. Crear el video en la librería
      const createVideoData = {
        title: videoData.titulo || 'Video sin título',
        collectionId: videoData.collectionId || null // Opcional: para organizar videos
      };

      const createResponse = await this.api.post(
        `/library/${this.libraryId}/videos`,
        createVideoData
      );

      const videoInfo = createResponse.data;
      console.log('[BUNNY] ✅ Video creado en librería:', videoInfo.guid);

      // 2. Subir el archivo de video
      const videoGuid = videoInfo.guid;
      const fileStats = fs.statSync(filePath);
      const fileStream = fs.createReadStream(filePath);

      console.log('[BUNNY] 📊 Subiendo archivo... Tamaño:', (fileStats.size / 1024 / 1024).toFixed(2), 'MB');

      const uploadResponse = await axios.put(
        `${this.baseUrl}/library/${this.libraryId}/videos/${videoGuid}`,
        fileStream,
        {
          headers: {
            'AccessKey': this.apiKey,
            'Content-Type': 'application/octet-stream'
          },
          maxContentLength: Infinity,
          maxBodyLength: Infinity
        }
      );

      console.log('[BUNNY] ✅ Video subido exitosamente:', videoGuid);

      // 3. Actualizar metadatos si es necesario
      if (videoData.descripcion) {
        await this.updateVideo(videoGuid, {
          title: videoData.titulo,
          // Bunny.net no tiene descripción directa, pero podemos usar metadatos
          metaTags: [
            { property: 'description', value: videoData.descripcion }
          ]
        });
      }

      // Retornar información compatible con el sistema actual
      return {
        video_id: videoGuid,
        bunny_id: videoGuid,
        library_id: this.libraryId,
        stream_url: `${this.streamBaseUrl}/embed/${this.libraryId}/${videoGuid}`,
        thumbnail_url: `${this.streamBaseUrl}/${this.libraryId}/${videoGuid}/thumbnail.jpg`,
        direct_play_url: `${this.streamBaseUrl}/${this.libraryId}/${videoGuid}/play_720p.mp4`,
        embed_url: `${this.streamBaseUrl}/embed/${this.libraryId}/${videoGuid}`,
        status: 'uploaded'
      };

    } catch (error) {
      console.error('[BUNNY] ❌ Error en upload:', error.response?.data || error.message);
      throw new Error(`Error subiendo video a Bunny.net: ${error.response?.data?.message || error.message}`);
    }
  }

  /**
   * Obtiene información de un video de Bunny.net
   * @param {string} videoId - GUID del video en Bunny.net
   * @returns {Promise<object>} - Información del video
   */
  async getVideoInfo(videoId) {
    try {
      console.log('[BUNNY] 📋 Obteniendo info del video:', videoId);
      
      const response = await this.api.get(`/library/${this.libraryId}/videos/${videoId}`);
      const videoInfo = response.data;

      return {
        id: videoInfo.guid,
        title: videoInfo.title,
        status: this.mapBunnyStatus(videoInfo.status),
        duration: videoInfo.length || 0,
        views: videoInfo.views || 0,
        created: videoInfo.dateUploaded,
        thumbnailUrl: `${this.streamBaseUrl}/${this.libraryId}/${videoInfo.guid}/thumbnail.jpg`,
        embedUrl: `${this.streamBaseUrl}/embed/${this.libraryId}/${videoInfo.guid}`,
        directPlayUrl: `${this.streamBaseUrl}/${this.libraryId}/${videoInfo.guid}/play_720p.mp4`
      };
    } catch (error) {
      console.error('[BUNNY] ❌ Error obteniendo info:', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Actualiza información de un video en Bunny.net
   * @param {string} videoId - GUID del video
   * @param {object} updateData - Datos a actualizar
   * @returns {Promise<object>} - Respuesta de la API
   */
  async updateVideo(videoId, updateData) {
    try {
      console.log('[BUNNY] ✏️ Actualizando video:', videoId);
      
      const bunnyUpdateData = {
        title: updateData.title || updateData.titulo,
        metaTags: updateData.metaTags || []
      };

      const response = await this.api.post(
        `/library/${this.libraryId}/videos/${videoId}`,
        bunnyUpdateData
      );

      console.log('[BUNNY] ✅ Video actualizado:', videoId);
      return response.data;
    } catch (error) {
      console.error('[BUNNY] ❌ Error actualizando video:', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Elimina un video de Bunny.net
   * @param {string} videoId - GUID del video
   * @returns {Promise<boolean>} - True si se eliminó exitosamente
   */
  async deleteVideo(videoId) {
    try {
      console.log('[BUNNY] 🗑️ Eliminando video:', videoId);
      
      await this.api.delete(`/library/${this.libraryId}/videos/${videoId}`);
      
      console.log('[BUNNY] ✅ Video eliminado exitosamente:', videoId);
      return true;
    } catch (error) {
      console.error('[BUNNY] ❌ Error eliminando video:', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Obtiene el estado de procesamiento de un video
   * @param {string} videoId - GUID del video
   * @returns {Promise<string>} - Estado del video
   */
  async getVideoStatus(videoId) {
    try {
      const videoInfo = await this.getVideoInfo(videoId);
      return videoInfo.status;
    } catch (error) {
      console.error('[BUNNY] ❌ Error obteniendo status:', error);
      return 'error';
    }
  }

  /**
   * Obtiene la URL del reproductor embebido
   * @param {string} videoId - GUID del video
   * @param {object} options - Opciones del reproductor
   * @returns {string} - URL del reproductor
   */
  getEmbedUrl(videoId, options = {}) {
    const params = new URLSearchParams();
    
    // Opciones comunes del reproductor
    if (options.autoplay) params.append('autoplay', 'true');
    if (options.preload) params.append('preload', options.preload);
    if (options.primaryColor) params.append('primaryColor', options.primaryColor);
    
    const queryString = params.toString();
    const baseUrl = `${this.streamBaseUrl}/embed/${this.libraryId}/${videoId}`;
    
    return queryString ? `${baseUrl}?${queryString}` : baseUrl;
  }

  /**
   * Obtiene la URL directa de reproducción
   * @param {string} videoId - GUID del video
   * @param {string} quality - Calidad del video (360p, 480p, 720p, 1080p, etc.)
   * @returns {string} - URL directa de reproducción
   */
  getDirectPlayUrl(videoId, quality = '720p') {
    return `${this.streamBaseUrl}/${this.libraryId}/${videoId}/play_${quality}.mp4`;
  }

  /**
   * Obtiene la URL del thumbnail
   * @param {string} videoId - GUID del video
   * @returns {string} - URL del thumbnail
   */
  getThumbnailUrl(videoId) {
    return `${this.streamBaseUrl}/${this.libraryId}/${videoId}/thumbnail.jpg`;
  }

  /**
   * Construye una URL pública para miniaturas o recursos en Bunny CDN.
   * Acepta tres formatos en `pathOrId`:
   * - URL absoluta (https://...): se devuelve tal cual
   * - GUID/ID de video de Bunny: construye la URL del thumbnail del video
   * - Ruta relativa/clave: la prefixa con el hostname CDN configurado
   * @param {string} pathOrId
   * @returns {string|null}
   */
  getBunnyCdnUrl(pathOrId) {
    if (!pathOrId) return null;
    // Si ya es URL absoluta la devolvemos
    if (/^https?:\/\//i.test(pathOrId)) return pathOrId;
    // Si parece un GUID/ID (alfanumérico con guiones, longitud > 8) asumimos videoId
    if (/^[A-Za-z0-9-]{8,}$/.test(pathOrId)) {
      return `${this.streamBaseUrl}/${this.libraryId}/${pathOrId}/thumbnail.jpg`;
    }
    // En cualquier otro caso, tratamos como ruta relativa dentro del CDN hostname
    const clean = pathOrId.replace(/^\/+/, '');
    return `https://${this.cdnHostname}/${clean}`;
  }

  /**
   * Mapea los estados de Bunny.net a estados más comprensibles
   * @param {number} bunnyStatus - Estado numérico de Bunny.net
   * @returns {string} - Estado mapeado
   */
  mapBunnyStatus(bunnyStatus) {
    const statusMap = {
      0: 'queued',      // En cola
      1: 'processing',  // Procesando
      2: 'encoding',    // Codificando
      3: 'finished',    // Terminado
      4: 'error',       // Error
      5: 'uploading'    // Subiendo
    };
    return statusMap[bunnyStatus] || 'unknown';
  }

  /**
   * Lista todos los videos de la librería
   * @param {object} filters - Filtros opcionales
   * @returns {Promise<Array>} - Lista de videos
   */
  async listVideos(filters = {}) {
    try {
      const params = new URLSearchParams();
      if (filters.page) params.append('page', filters.page);
      if (filters.itemsPerPage) params.append('itemsPerPage', filters.itemsPerPage);
      if (filters.search) params.append('search', filters.search);

      const queryString = params.toString();
      const url = `/library/${this.libraryId}/videos${queryString ? '?' + queryString : ''}`;
      
      const response = await this.api.get(url);
      
      return response.data.items || [];
    } catch (error) {
      console.error('[BUNNY] ❌ Error listando videos:', error.response?.data || error.message);
      throw error;
    }
  }
}

// Exportar la instancia del servicio (patrón singleton)
module.exports = new BunnyService();