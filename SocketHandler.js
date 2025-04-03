// src/sockets/socketHandler.js
const connectedScreens = new Map(); // Asocia screenId -> socket
const ADMIN_ROOM = 'admin_listeners'; // Nombre constante para la sala de admins

const fs = require('fs').promises; 
const { getRoutines, getNextExercise, addRoutine, saveUserRoutines } = require('./routines/routineHandler'); // Importar la función para manejar rutinas
const { addAdmin, checkAdmin} = require('./adminHandler');
const {addToStat}  = require('./socialHandler');
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

    // Registro de Administradores 
    // Listener para que los admins se identifiquen 
    socket.on('register_admin', (data) => {
      console.log(`Admin conectado y registrado: ${socket.id}`);
      let success = await addAdmin(data)
      socket.join(ADMIN_ROOM); // Unir al admin a la sala de escucha
      // Enviar al admin recién conectado el estado actual de todas las pantallas
      const currentScreenStatus = Array.from(connectedScreens.keys()).map(id => ({
         screenId: id,
         status: 'connected',
         socketId: connectedScreens.get(id)?.id // Añadir socketId si existe
       }));
      socket.emit('initial_screen_states', currentScreenStatus); // Enviar solo al admin que se acaba de conectar
    });

    //Para agregar rutinas (Asumimos que los valores vienen en formato diccionario de diccionarios, como en el JSON)
    socket.on('addRoutine', async (data) => {
      console.log(`Recibido 'addRoutine' de ${socket.id}. Verificando si es admin.`);
      if (!socket.isAdmin) { 
          console.warn(`Intento no autorizado de 'addRoutine' desde ${socket.id}.`);
          socket.emit('addRoutine_response', {
              success: false,
              message: 'No tienes permisos para realizar esta acción.'
          });
          return;
      }
      console.log(`Socket ${socket.id} es admin. Procesando 'addRoutine'.`);

      let success = await addRoutine(data);
       
      if (success == -1){
        socket.emit('addRoutine_response', {
          success: false,
          message: 'Error interno del servidor al intentar guardar la rutina.'
        })
      }

      else if (success == -2){
        socket.emit('addRoutine_response', {
                      success: false,
                      message: `Ya existe una rutina llamada "${newRoutine.name}" en el grupo "${muscleGroup}".`});
                    }
              
      else if (succes == 1){
        socket.emit('addRoutine_response', {
          success: true,
          message: `Rutina "${newRoutine.name}" añadida correctamente al grupo "${muscleGroup}".`,
        });
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

    socket.on('exercise_completed', async (data) => {
      await addToStat(data.UserId, data.exercise);
      console.log(`Ejercicio ${data.exercise} guardado para el usuario ${data.UserId}`);
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

module.exports = {
  handleSocketConnection,
  sendDataToScreen,
  broadcastToAdmins 
};