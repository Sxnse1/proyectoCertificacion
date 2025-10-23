-- Tabla para guardar el progreso de reproducción por usuario y video
IF OBJECT_ID('dbo.Video_Progreso', 'U') IS NOT NULL
  DROP TABLE dbo.Video_Progreso;

CREATE TABLE dbo.Video_Progreso (
  id_video_progreso INT IDENTITY(1,1) PRIMARY KEY,
  id_usuario INT NOT NULL,
  id_video INT NOT NULL,
  segundos INT NOT NULL DEFAULT 0,
  fecha_actualizacion DATETIME NOT NULL DEFAULT GETDATE(),
  CONSTRAINT FK_VP_Usuario FOREIGN KEY (id_usuario) REFERENCES Usuarios(id_usuario),
  CONSTRAINT FK_VP_Video FOREIGN KEY (id_video) REFERENCES Videos(id_video)
);

-- Índice para búsquedas rápidas por usuario/video
CREATE UNIQUE INDEX IX_Video_Progreso_User_Video ON dbo.Video_Progreso (id_usuario, id_video);
