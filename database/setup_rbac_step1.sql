-- Agregar columna RolID a Usuarios
ALTER TABLE Usuarios ADD RolID INT NULL;

-- Crear FK constraint
ALTER TABLE Usuarios ADD CONSTRAINT FK_Usuarios_Roles FOREIGN KEY (RolID) REFERENCES Roles(RolID);

-- Insertar Roles
INSERT INTO Roles (NombreRol, Descripcion) VALUES
('SuperAdmin', 'Administrador con acceso completo al sistema'),
('Admin', 'Administrador general con la mayoría de funciones'),
('Editor', 'Editor de contenido para cursos y videos'),
('Finanzas', 'Acceso a módulos financieros'),
('Soporte', 'Atención al cliente con acceso limitado'),
('Instructor', 'Instructor con permisos básicos');