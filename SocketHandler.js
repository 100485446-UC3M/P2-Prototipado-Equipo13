// src/sockets/socketHandler.js
const connectedScreens = new Map(); // Asocia screenId -> socket
const ADMIN_ROOM = 'admin_listeners'; // Nombre constante para la sala de admins

const fs = require('fs').promises; 
const { getRoutines } = require('./routines/routineSelector'); // Importar la función para manejar rutinas
const { getNextExercise } = require('./routines/routineHandler');
const userRoutinesFile = 'DataBases/userRoutines.json';
var userRoutines = {}; 

const userStateFile = 'DataBases/userStateFile.json'; // Persiste info temporal de la conexión
var userStates = {}; // Clave: socket.id, Valor: { id: socket.id, screenId: null }
loadUserStates()

function handleSocketConnection(io) {
  io.on('connection', (socket) => {

    console.log(`Cliente conectado inicialmente con socket.id: ${socket.id}`);

    // Asocia propiedades al socket para uso posterior en ESTA conexión
    socket.currentUserId = null;
    socket.currentScreenId = null;

    // --- Listener para el mensaje de identificación del cliente ---
    socket.on('user_identified', async (data) => {
      console.log(`Verificando estado para nueva conexión: ${data.UserId}`);
      if (!userStates[data.UserId]) {
        console.log(`No existe estado para ${data.UserId}. Creando entrada.`);
        userStates[data.UserId] = {
          id: data.UserId, // Identificador de la conexión actual
          screenId: data.screenId, // la pantalla
          socket: socket.id //Socket actual
        };
        // Guarda el nuevo estado en el archivo JSON
        saveUserStates();
        console.log(`Estado inicial para ${socket.UserId} guardado.`);
      } else {
        console.log(`Estado existente encontrado para ${socket.UserId}.`);
      }
      console.log('Cliente conectado:', data.UserId);
  });

    //Mantenemos esta relación porque queremos que cuando un usuario con un SocketId se mueva a otra pantalla
    //Pueda retomar su rutina desde la misma

    //Queremos que en cada mensaje se mande el UserID

    // Registro de Pantallas (Gym Screens) 
    socket.on('register_screen', (data) => {
      const screenId = data.screenId;
      if (screenId) {
        console.log(`Pantalla registrada: ${screenId} con socket ${socket.id}`);
        socket.join(screenId); // Unirse a una sala con su propio ID
        connectedScreens.set(screenId, socket); // Guardar referencia

        //  Notificar a los admins que la pantalla se conectó 
        io.to(ADMIN_ROOM).emit('screen_status_update', {
          screenId: screenId,
          socketId: socket.id, 
          status: 'connected'
        });

      } else {
        console.warn(`Intento de registro de pantalla sin screenId desde socket ${socket.id}`);
      }
    });

    // --- Registro de Administradores ---
    // Listener para que los admins se identifiquen 
    socket.on('register_admin', () => {
      console.log(`Admin conectado y registrado: ${socket.id}`);
      socket.join(ADMIN_ROOM); // Unir al admin a la sala de escucha
      // Opcional: Enviar al admin recién conectado el estado actual de todas las pantallas
      const currentScreenStatus = Array.from(connectedScreens.keys()).map(id => ({
         screenId: id,
         status: 'connected',
         socketId: connectedScreens.get(id)?.id // Añadir socketId si existe
       }));
      socket.emit('initial_screen_states', currentScreenStatus); // Enviar solo al admin que se acaba de conectar
    });


    // --- Manejo de Desconexión (Aplica a Pantallas Y Admins) ---
    socket.on('disconnect', () => {
      console.log(`Cliente desconectado: ${socket.id}`);

      let disconnectedScreenId = null;

      // Limpiar registro y salas si era una PANTALLA
      for (const [screenId, screenSocket] of connectedScreens.entries()) {
        if (screenSocket.id === socket.id) {
          disconnectedScreenId = screenId; // Guarda el ID de la pantalla desconectada
          connectedScreens.delete(screenId);
          console.log(`Pantalla ${screenId} desconectada.`);
          // Nota: Socket.IO maneja automáticamente la salida de las salas al desconectar.
          break; // Salir del bucle una vez encontrado
        }
      }

      //  Si se desconectó una PANTALLA, notificar a los admins 
      if (disconnectedScreenId) {
        io.to(ADMIN_ROOM).emit('screen_status_update', {
          screenId: disconnectedScreenId,
          status: 'disconnected'
        });
      } else {
         // Si no era una pantalla, pudo ser un admin. No necesitamos acción específica
         // para la desconexión del admin aquí, a menos que queramos rastrearlos.
         console.log(`Admin u otro cliente (${socket.id}) desconectado.`);
      }

    });   


    // Dar opciones de una rutina (asumimos que en data vienen los músculos de los que quiere hacer una rutina)
    socket.on('routine_selection', async (data) => {
        const selectedRoutines = await getRoutines(data.preferences);
        socket.emit('routine_response', selectedRoutines);
    });


    // El usuario selecciona una rutina (en data vienen las rutinas seleccionadas)
    socket.on('selected_routine', async (data) => { //Asumamos que en la parte del cliente se concadenaron las rutinas
        userRoutines[data.UserId] = data.routine; // Asignar rutina al usuario
        console.log(`Rutina asignada a ${data.UserId}:`, data.routine);
        await saveUserRoutines();
        // Enviar confirmación al usuario
        socket.emit('routine_assigned', { message: "Rutina asignada correctamente", routine: data.routine });
    });

    socket.on('next_exercise', async (data) => {
      const nextExercise = await getNextExercise(data.UserId);
      socket.emit('exercise_response', nextExercise);
    });
    
  });

}


//  Función para cargar estados de conexión 
async function loadUserStates() {
  try {
      // Comprueba si el archivo existe primero
      await fs.access(userStateFile);
      const data = await fs.readFile(userStateFile, 'utf-8');
      // Evita Parse Error en archivo vacío
      if (data.trim() === '') {
          userStates = {};
      } else {
          userStates = JSON.parse(data);
      }
      console.log('Estados de conexión (userStates) cargados.');
  } catch (error) {
      if (error.code === 'ENOENT') {
          // El archivo no existe, inicializa vacío y crea el archivo
          console.log('userStateFile.json no encontrado, inicializando vacío.');
          userStates = {};
          await saveUserStates(); // Crea el archivo vacío
      } else {
          console.error("Error cargando userStates:", error.message);
          userStates = {}; // Default a vacío en otros errores
      }
  }
}

//  Función para guardar estados de conexión 
async function saveUserStates() {
  try {
      await fs.writeFile(userStateFile, JSON.stringify(userStates, null, 2), 'utf-8');
  } catch (error) {
      console.error("Error guardando userStates:", error.message);
  }
}


//  Función para emitir a todos los admins
function broadcastToAdmins(io, eventName, data) {
  io.to(ADMIN_ROOM).emit(eventName, data);
  console.log(`Emitiendo evento '${eventName}' a la sala de admins.`);
}


// Function to save routines to JSON file
async function saveUserRoutines() {
    try {
        await fs.writeFile(userRoutinesFile, JSON.stringify(userRoutines, null, 2), 'utf-8');
    } catch (error) {
        console.error("Error saving user routines:", error.message);
    }
}

module.exports = {
  handleSocketConnection,
  sendDataToScreen,
  broadcastToAdmins 
};