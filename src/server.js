const express = require('express'); // Framework web (Usado para crear 'app')
const http = require('http'); // Módulo HTTP de Node (Usado para crear 'server')
const { Server } = require('socket.io'); // Clase Servidor de Socket.IO (Usado para crear 'io')
const app = express(); // Instancia de Express
const server = http.createServer(app); // Servidor HTTP basado en Express
const io = new Server(server); // Instancia del servidor Socket.IO
const { handleSocketConnection} = require('./src/handlers/SocketHandler');

handleSocketConnection(io); // <--- Pasa 'io' a la función

const PORT = process.env.PORT || 3000;
server.listen(PORT, async () => { 
    console.log(`Servidor corriendo en http://localhost:${PORT}`);
});