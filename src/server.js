const path = require('path'); 

const express = require('express'); // Framework web (Usado para crear 'app')
const http = require('http'); // Módulo HTTP de Node (Usado para crear 'server')
const { Server } = require('socket.io'); // Clase Servidor de Socket.IO (Usado para crear 'io')

const app = express(); // Instancia de Express

// Sirve todos los archivos estáticos (HTML, CSS, JS, imágenes, etc.) 
// que estén dentro de la carpeta `interface` en la ruta raíz.
// Ejemplo: GET /gym.html → src/interface/gym.html
app.use(express.static(path.join(__dirname, 'interface')));  

// Sirve los archivos estáticos de la carpeta `public` 
// bajo el prefijo `/public`.
// Ejemplo: GET /public/gym.js → src/public/gym.js
app.use('/public', express.static(path.join(__dirname, 'public')));

const server = http.createServer(app); // Servidor HTTP basado en Express

const io = new Server(server); // Instancia del servidor Socket.IO
const { handleSocketConnection } = require('./handlers/socketHandler.js');
handleSocketConnection(io); // <--- Pasa 'io' a la función

const PORT = process.env.PORT || 3000;
server.listen(PORT, async () => { 
    console.log(`Servidor corriendo en http://localhost:${PORT}`);
});
