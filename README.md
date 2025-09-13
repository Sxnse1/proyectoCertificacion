# proyectoCertificacion

Este proyecto Express usa MongoDB. Aquí se explica cómo conectar con MongoDB Atlas.

1) Instala dependencias

   npm install

2) Crea un fichero `.env` en la raíz copiando `.env.example` y rellenando `MONGODB_URI` con tu cadena de conexión de Atlas.

3) Inicia la aplicación

   npm start

Notas:
- El código usa `config/database.js` que emplea `mongoose` y `dotenv`.
- Exponemos la conexión en `app.locals.db` y el objeto mongoose en `app.locals.mongoose`.
