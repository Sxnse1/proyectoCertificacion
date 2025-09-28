const multer = require('multer');
const path = require('path');
const fs = require('fs-extra');

// Configuración de almacenamiento temporal
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../uploads/videos/temp');
    
    // Crear directorio si no existe
    await fs.ensureDir(uploadDir);
    
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    // Generar nombre único con timestamp
    const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1E9)}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  }
});

// Filtro de archivos de video
const fileFilter = (req, file, cb) => {
  console.log('[UPLOAD] 📁 Archivo recibido:', file.originalname, 'Tipo:', file.mimetype);
  
  // Tipos de video permitidos
  const allowedTypes = [
    'video/mp4',
    'video/mpeg',
    'video/quicktime',
    'video/x-msvideo', // AVI
    'video/x-ms-wmv',  // WMV
    'video/webm'
  ];
  
  const allowedExtensions = ['.mp4', '.mpeg', '.mpg', '.mov', '.avi', '.wmv', '.webm'];
  const fileExtension = path.extname(file.originalname).toLowerCase();
  
  if (allowedTypes.includes(file.mimetype) || allowedExtensions.includes(fileExtension)) {
    cb(null, true);
  } else {
    cb(new Error(`Tipo de archivo no permitido. Solo se permiten videos: ${allowedExtensions.join(', ')}`), false);
  }
};

// Configuración de multer
const uploadConfig = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 2 * 1024 * 1024 * 1024, // 2GB máximo
    files: 1 // Solo un archivo a la vez
  }
});

// Middleware de manejo de errores de upload
const handleUploadError = (error, req, res, next) => {
  console.error('[UPLOAD] ❌ Error en upload:', error.message);
  
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        error: 'El archivo es demasiado grande. Máximo 2GB permitido.'
      });
    }
    if (error.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({
        success: false,
        error: 'Solo se permite subir un archivo a la vez.'
      });
    }
  }
  
  return res.status(400).json({
    success: false,
    error: error.message
  });
};

// Middleware de limpieza de archivos temporales
const cleanupTempFile = async (filePath) => {
  try {
    if (filePath && await fs.pathExists(filePath)) {
      await fs.remove(filePath);
      console.log('[CLEANUP] 🗑️ Archivo temporal eliminado:', filePath);
    }
  } catch (error) {
    console.error('[CLEANUP] ❌ Error eliminando archivo temporal:', error);
  }
};

// Middleware para validar datos del video
const validateVideoData = (req, res, next) => {
  const { titulo, descripcion, id_modulo } = req.body;
  
  if (!titulo || titulo.trim().length === 0) {
    return res.status(400).json({
      success: false,
      error: 'El título del video es requerido'
    });
  }
  
  if (!id_modulo || isNaN(parseInt(id_modulo))) {
    return res.status(400).json({
      success: false,
      error: 'Debe seleccionar un módulo válido'
    });
  }
  
  // Sanitizar datos
  req.body.titulo = titulo.trim();
  req.body.descripcion = (descripcion || '').trim();
  req.body.id_modulo = parseInt(id_modulo);
  
  next();
};

module.exports = {
  uploadConfig,
  handleUploadError,
  cleanupTempFile,
  validateVideoData
};