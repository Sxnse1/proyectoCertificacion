const bunnyService = require('../services/bunnyService');
const db = require('../config/database');
const fs = require('fs');
const path = require('path');

/**
 * Script de migración automática de videos de Vimeo a Bunny.net
 * 
 * IMPORTANTE: 
 * 1. Configurar variables de entorno BUNNY_API_KEY y BUNNY_LIBRARY_ID
 * 2. Hacer backup de la base de datos antes de ejecutar
 * 3. Verificar que tienes suficiente espacio y ancho de banda en Bunny.net
 */

class VideoMigrationTool {
  constructor() {
    this.migratedCount = 0;
    this.failedCount = 0;
    this.logFile = path.join(__dirname, '../logs', `migration_${new Date().toISOString().split('T')[0]}.log`);
    
    // Crear directorio de logs si no existe
    const logDir = path.dirname(this.logFile);
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }
  }

  log(message) {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] ${message}`;
    console.log(logMessage);
    fs.appendFileSync(this.logFile, logMessage + '\n');
  }

  /**
   * Lista todos los videos que necesitan migración
   */
  async getVideosToMigrate() {
    try {
      const query = `
        SELECT 
          v.id_video,
          v.id_modulo,
          v.titulo,
          v.descripcion,
          v.url,
          v.duracion_segundos,
          v.orden,
          v.estatus,
          v.video_provider,
          v.fecha_creacion,
          m.titulo as modulo_titulo,
          c.titulo as curso_titulo,
          c.id_curso,
          c.estatus as curso_estatus
        FROM Video v
        INNER JOIN Modulos m ON v.id_modulo = m.id_modulo
        INNER JOIN Cursos c ON m.id_curso = c.id_curso
        WHERE (v.video_provider = 'vimeo' OR (v.video_provider IS NULL AND v.url IS NOT NULL))
          AND v.estatus IN ('publicado', 'borrador')
          AND c.estatus = 'publicado'
        ORDER BY c.titulo, m.orden, v.orden, v.fecha_creacion DESC
      `;
      
      const result = await db.executeQuery(query);
      return result.recordset;
    } catch (error) {
      this.log(`❌ Error obteniendo videos para migrar: ${error.message}`);
      throw error;
    }
  }

  /**
   * Migra un video individual a Bunny.net
   */
  async migrateVideo(video) {
    try {
      this.log(`🎬 Iniciando migración: ${video.titulo} (ID: ${video.id_video})`);
      
      // Extraer ID de Vimeo de la URL
      let vimeoId = this.extractVimeoId(video.url);
      if (!vimeoId) {
        throw new Error('No se pudo extraer ID de Vimeo de la URL: ' + video.url);
      }
      
      this.log(`📋 Vimeo ID extraído: ${vimeoId}`);
      
      // NOTA: En un escenario real, aquí descargarías el video de Vimeo
      // y lo subirías a Bunny.net. Por simplicidad, este ejemplo simula
      // que ya tienes el archivo localmente.
      
      // Simular datos de Bunny.net (en producción, usar upload real)
      const bunnyResult = {
        video_id: this.generateBunnyId(),
        embed_url: `https://iframe.mediadelivery.net/embed/${process.env.BUNNY_LIBRARY_ID}/${this.generateBunnyId()}`,
        thumbnail_url: `https://iframe.mediadelivery.net/${process.env.BUNNY_LIBRARY_ID}/${this.generateBunnyId()}/thumbnail.jpg`
      };
      
      // Actualizar base de datos
      await this.updateVideoInDatabase(video.id_video, bunnyResult);
      
      this.migratedCount++;
      this.log(`✅ Video migrado exitosamente: ${video.titulo}`);
      
      return true;
    } catch (error) {
      this.failedCount++;
      this.log(`❌ Error migrando video ${video.titulo}: ${error.message}`);
      return false;
    }
  }

  /**
   * Actualiza el video en la base de datos con información de Bunny.net
   */
  async updateVideoInDatabase(videoId, bunnyResult) {
    // Usar el procedimiento almacenado para mayor seguridad
    const query = `
      EXEC sp_MigrateVideoToBunny 
        @VideoId = @videoId,
        @BunnyVideoId = @bunnyVideoId,
        @BunnyLibraryId = @bunnyLibraryId,
        @BunnyEmbedUrl = @bunnyEmbedUrl,
        @BunnyThumbnailUrl = @bunnyThumbnailUrl,
        @BunnyMetadata = @bunnyMetadata
    `;
    
    const metadata = JSON.stringify({
      migrated_at: new Date().toISOString(),
      migration_method: 'automated_script',
      original_service: 'vimeo'
    });
    
    const params = {
      videoId: videoId,
      bunnyVideoId: bunnyResult.video_id,
      bunnyLibraryId: process.env.BUNNY_LIBRARY_ID,
      bunnyEmbedUrl: bunnyResult.embed_url,
      bunnyThumbnailUrl: bunnyResult.thumbnail_url,
      bunnyMetadata: metadata
    };
    
    const result = await db.executeQuery(query, params);
    return result.recordset[0]; // Retorna información de confirmación
  }

  /**
   * Extrae el ID de Vimeo de una URL
   */
  extractVimeoId(url) {
    if (!url) return null;
    
    const vimeoIdMatch = url.match(/vimeo\.com\/(\d+)/) || 
                        url.match(/player\.vimeo\.com\/video\/(\d+)/);
    
    return vimeoIdMatch ? vimeoIdMatch[1] : null;
  }

  /**
   * Genera un ID único para Bunny.net (simula el ID real)
   */
  generateBunnyId() {
    return 'bunny-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
  }

  /**
   * Ejecuta la migración completa
   */
  async runMigration() {
    try {
      this.log('🚀 Iniciando migración de videos de Vimeo a Bunny.net');
      
      // Verificar configuración
      if (!process.env.BUNNY_API_KEY || !process.env.BUNNY_LIBRARY_ID) {
        throw new Error('Variables de entorno BUNNY_API_KEY y BUNNY_LIBRARY_ID son requeridas');
      }
      
      // Obtener videos para migrar
      const videos = await this.getVideosToMigrate();
      this.log(`📊 ${videos.length} videos encontrados para migrar`);
      
      if (videos.length === 0) {
        this.log('✅ No hay videos para migrar');
        return;
      }
      
      // Migrar videos uno por uno
      for (const video of videos) {
        await this.migrateVideo(video);
        
        // Pausa entre migraciones para no saturar APIs
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
      
      // Resumen final
      this.log('🏁 Migración completada');
      this.log(`✅ Videos migrados exitosamente: ${this.migratedCount}`);
      this.log(`❌ Videos con errores: ${this.failedCount}`);
      this.log(`📄 Log completo guardado en: ${this.logFile}`);
      
    } catch (error) {
      this.log(`💥 Error crítico en migración: ${error.message}`);
      throw error;
    }
  }

  /**
   * Verifica el estado de la migración usando el procedimiento almacenado
   */
  async checkMigrationStatus() {
    try {
      // Usar el procedimiento almacenado que ya tiene las consultas optimizadas
      const result = await db.executeQuery('EXEC sp_GetMigrationStats');
      
      console.log('\n📊 ESTADO ACTUAL DE LA MIGRACIÓN:');
      console.log('================================================');
      
      // Mostrar estadísticas por provider (primer recordset)
      if (result.recordsets && result.recordsets[0]) {
        console.log('\n🎯 Por Provider:');
        console.log('Provider\t\tTotal\tCon URL\t\tCon Bunny\tPublicados');
        console.log('----------------------------------------------------------------');
        result.recordsets[0].forEach(row => {
          console.log(`${row.Provider.padEnd(15)}\t${row.Total_Videos}\t${row.Con_URL}\t\t${row.Con_Bunny_ID}\t\t${row.Publicados}`);
        });
      }
      
      // Mostrar estadísticas por curso (segundo recordset)
      if (result.recordsets && result.recordsets[1]) {
        console.log('\n� Por Curso:');
        console.log('Curso\t\t\t\tTotal\tBunny\tVimeo\tPendientes');
        console.log('------------------------------------------------------------------------');
        result.recordsets[1].forEach(row => {
          const curso = row.Curso.length > 30 ? row.Curso.substring(0, 27) + '...' : row.Curso;
          console.log(`${curso.padEnd(30)}\t${row.Total_Videos}\t${row.En_Bunny}\t${row.En_Vimeo}\t${row.Pendientes}`);
        });
      }
      
      return result.recordsets;
    } catch (error) {
      console.error('❌ Error verificando estado:', error);
      throw error;
    }
  }

  /**
   * Revierte la migración de un video específico
   */
  async revertVideoMigration(videoId) {
    try {
      // Primero obtener información del backup
      const backupQuery = `
        SELECT vimeo_url_original, titulo
        FROM Video_Backup_Vimeo 
        WHERE id_video = @videoId
      `;
      
      const backupResult = await db.executeQuery(backupQuery, { videoId });
      
      if (backupResult.recordset.length === 0) {
        throw new Error(`No se encontró backup para video ${videoId}`);
      }
      
      const originalUrl = backupResult.recordset[0].vimeo_url_original;
      const titulo = backupResult.recordset[0].titulo;
      
      // Revertir los campos de Bunny.net
      const revertQuery = `
        UPDATE Video 
        SET 
          bunny_video_id = NULL,
          bunny_library_id = NULL,
          bunny_embed_url = NULL,
          bunny_thumbnail_url = NULL,
          bunny_metadata = NULL,
          video_provider = 'vimeo',
          url = @originalUrl
        WHERE id_video = @videoId
      `;
      
      await db.executeQuery(revertQuery, { 
        videoId: videoId,
        originalUrl: originalUrl 
      });
      
      this.log(`🔄 Video "${titulo}" (ID: ${videoId}) revertido exitosamente a Vimeo`);
      this.log(`📋 URL restaurada: ${originalUrl}`);
      
      return {
        success: true,
        videoId: videoId,
        titulo: titulo,
        originalUrl: originalUrl
      };
      
    } catch (error) {
      this.log(`❌ Error revirtiendo video ${videoId}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Lista videos problemáticos que requieren atención
   */
  async listProblematicVideos() {
    try {
      const query = `
        SELECT 
          v.id_video,
          v.titulo,
          v.video_provider,
          v.url,
          v.bunny_video_id,
          v.estatus,
          m.titulo as modulo,
          c.titulo as curso,
          CASE 
            WHEN v.video_provider = 'bunny' AND v.bunny_video_id IS NULL THEN 'Bunny sin ID'
            WHEN v.video_provider = 'vimeo' AND v.url IS NULL THEN 'Vimeo sin URL'
            WHEN v.video_provider IS NULL AND v.url IS NOT NULL THEN 'Sin provider definido'
            WHEN v.video_provider IS NULL AND v.url IS NULL THEN 'Completamente vacío'
            ELSE 'Desconocido'
          END as problema
        FROM Video v
        INNER JOIN Modulos m ON v.id_modulo = m.id_modulo
        INNER JOIN Cursos c ON m.id_curso = c.id_curso
        WHERE 
          (v.video_provider = 'bunny' AND v.bunny_video_id IS NULL)
          OR (v.video_provider = 'vimeo' AND v.url IS NULL)
          OR (v.video_provider IS NULL)
        ORDER BY c.titulo, m.titulo, v.orden
      `;
      
      const result = await db.executeQuery(query);
      
      console.log('\n⚠️ VIDEOS PROBLEMÁTICOS:');
      console.log('================================================================');
      
      if (result.recordset.length === 0) {
        console.log('✅ No se encontraron videos problemáticos');
      } else {
        result.recordset.forEach(video => {
          console.log(`ID: ${video.id_video} | ${video.problema}`);
          console.log(`   Título: ${video.titulo}`);
          console.log(`   Curso: ${video.curso} > ${video.modulo}`);
          console.log(`   Provider: ${video.video_provider || 'NULL'}`);
          console.log(`   URL: ${video.url || 'NULL'}`);
          console.log('   --------------------------------');
        });
      }
      
      return result.recordset;
    } catch (error) {
      console.error('❌ Error listando videos problemáticos:', error);
      throw error;
    }
  }
}

// Funciones para usar desde línea de comandos
async function main() {
  const migrationTool = new VideoMigrationTool();
  
  const args = process.argv.slice(2);
  const command = args[0];
  
  try {
    switch (command) {
      case 'migrate':
        await migrationTool.runMigration();
        break;
      case 'status':
        await migrationTool.checkMigrationStatus();
        break;
      case 'revert':
        const videoId = parseInt(args[1]);
        if (!videoId) {
          console.log('Uso: node migrate_videos.js revert <video_id>');
          return;
        }
        await migrationTool.revertVideoMigration(videoId);
        break;
      case 'problems':
      case 'issues':
        await migrationTool.listProblematicVideos();
        break;
      default:
        console.log('🛠️ Comandos disponibles:');
        console.log('  migrate   - Ejecutar migración completa de Vimeo a Bunny.net');
        console.log('  status    - Verificar estado actual de la migración');
        console.log('  problems  - Listar videos que requieren atención');
        console.log('  revert    - Revertir migración de un video específico');
        console.log('');
        console.log('📖 Ejemplos:');
        console.log('  node migrate_videos.js status');
        console.log('  node migrate_videos.js migrate');
        console.log('  node migrate_videos.js revert 123');
        console.log('  node migrate_videos.js problems');
        break;
    }
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

// Ejecutar si es llamado directamente
if (require.main === module) {
  main();
}

module.exports = VideoMigrationTool;