// src/sockets/socketHandler.js
const connectedScreens = new Map(); // Asocia screenId -> socket
const ADMIN_ROOM = 'admin_listeners'; // Nombre constante para la sala de admins

const fs = require('fs').promises; 

// Importar las funciones necesarias de otros ficheros
const { getRoutines, getNextExercise, addRoutine, saveUserRoutines,
      seeAllExercises, addExercise, deleteExericse, recommendRoutine,
      recordVideo} = require('./routineHandler'); 
const { addCredentials, checkCredentials} = require('./credentialHandler');
const {addToStat, seeStats, addFriend, deleteFriend,
      sendMessage}  = require('./socialHandler');

const userStateFile = 'src/Databases/userStateFile.json'; // Persiste info temporal de la conexión
let userStates = {}; // Clave: socket.id, Valor: { id: socket.id, screenId: null }
loadUserStates()

function handleSocketConnection(io) {
  io.on('connection', (socket) => {

    console.log(`Cliente conectado inicialmente con socket.id: ${socket.id}`);

    // Asocia propiedades al socket para uso posterior en ESTA conexión
    socket.currentUserId = null;
    socket.currentScreenId = null;

    //  Listener para el mensaje de identificación del cliente 
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
        console.log(`Estado inicial para ${data.UserId} guardado.`);
      } else {
        console.log(`Estado existente encontrado para ${data.UserId}.`);
      }
      console.log('Cliente conectado:', data.UserId);
    })

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

    // Registro de usuarios / admins
    socket.on('register', async (data) => {
      console.log(`${socket.id} quiere registrarse`);
      let success = await addCredentials(data.username, data.password, data.type)
      if (success == 1){
        if (data.type === "Admin"){  
          socket.join(ADMIN_ROOM); // Unir al admin a la sala de escucha
          // Enviar al admin recién conectado el estado actual de todas las pantallas
          const currentScreenStatus = Array.from(connectedScreens.keys()).map(id => ({
            screenId: id,
            status: 'connected',
            socketId: connectedScreens.get(id)?.id // Añadir socketId si existe
          }));
          socket.emit('initial_screen_states', currentScreenStatus); // Enviar solo al admin que se acaba de conectar
          
        }
        socket.emit('successful_register');
      } else {
        socket.emit('failed_register');
      }
    });

    // Inicio de sesión de usuarios / admins
    socket.on('login', async (data) => {
      console.log(`${socket.id} quiere iniciar sesión`);
      let success = await checkCredentials(data.username, data.password, data.type)
      if (success == 1){
        if (data.type === "Admin"){  
          socket.join(ADMIN_ROOM); // Unir al admin a la sala de escucha
          // Enviar al admin recién conectado el estado actual de todas las pantallas
          const currentScreenStatus = Array.from(connectedScreens.keys()).map(id => ({
            screenId: id,
            status: 'connected',
            socketId: connectedScreens.get(id)?.id // Añadir socketId si existe
          }));
          socket.emit('initial_screen_states', currentScreenStatus); // Enviar solo al admin que se acaba de conectar
          
        }
        socket.emit('successful_login');
      } else {
        socket.emit('failed_login');
      }
    });

    //Para agregar rutinas (Asumimos que los valores vienen en formato diccionario de diccionarios, como en el JSON)
    socket.on('add_routine', async (data) => {
      console.log(`Recibido 'addRoutine' de ${socket.id}. Verificando si es admin.`);
      let admin_identifier = await checkCredentials(data.username, data.password);
      if (admin_identifier != 1) { 
          console.warn(admin_identifier);
          socket.emit('response_add_routine', {
              success: false,
              message: 'No tienes permisos para realizar esta acción.'
          });
          return;
      }
      console.log(`Socket ${socket.id} es admin. Procesando 'addRoutine'.`);

      let result = await addRoutine(data);
      
      socket.emit('response_add_routine', result);
    });

    // Dar opciones de una rutina (asumimos que en data vienen los músculos de los que quiere hacer una rutina)
    socket.on('routine_selection', async (data) => {
        const selectedRoutines = await getRoutines(data.preferences);
        socket.emit('response_routine_selection', selectedRoutines);
    });


    // El usuario selecciona una rutina (en data vienen las rutinas seleccionadas)
    socket.on('selected_routine', async (data) => { //Asumamos que en la parte del cliente se concadenaron las rutinas
        await saveUserRoutines(data);
        console.log(`Rutina asignada a ${data.UserId}:`, data.routine);
        // Enviar confirmación al usuario
        socket.emit('response_selected_routine', { message: "Rutina asignada correctamente", routine: data.routine });
    });

    socket.on('exercise_completed', async (data) => {
      await addToStat(data.UserId, data.exercise);
      console.log(`Ejercicio ${data.exercise} guardado para el usuario ${data.UserId}`);
      const nextExercise = await getNextExercise(data.UserId);
      socket.emit('response_exercise_complete', nextExercise);

    });

    //Mensajes relacionados a rutina
    
    //Para ver los ejercicios restantes
    socket.on('see_all_exercises', async (data) => {
      let full_routine = seeAllExercises(data);
      socket.emit("response_see_all_exercises", full_routine); //full_routine puede contener la rutina o el error
    });

    //En caso que el usuario quiera añadir un ejercicio a la rutina
    socket.on('add_exercise', async (data) => {
      let updated_routine = addExercise(data);
      socket.emit("response_add_exercise", updated_routine); //updated_routine puede contener la rutina o el error
    });

    //En caso que el usuario quiera eliminar un ejercicio de la rutina
    socket.on('delete_exercise', async (data) => {
      let updated_routine = deleteExercise(data);
      socket.emit("response_delete_exercise", updated_routine); //updated_routine puede contener la rutina o el error
    });

    //Si el usuario quiere que le recomendemos una rutina en base a sus preferencias
    socket.on('recommend_routine', async (data) => {
      let recommended_routine = recommendRoutine(data);
      socket.emit("response_recommend_routine", recommended_routine); //recommended_routine puede contener la rutina o el error
    });

    //Si el usuario quiere grabar un video
    socket.on('record_video', async (data) => {
      let video_result = recordVideo(data);
      socket.emit("response_record_video", video_result); //video_result puede contener la rutina o el error
    });

    //Mensajes relacionados a la red social
    
    //En caso que un usuario quisiese ver sus estadísticas
    socket.on('see_stats', async (data) => {
      const exercises_completed = await seeStats(data)
      socket.emit("completed_exercises", exercises_completed)
    }); 

    //Para agregar un usuario a la red de amigos
    socket.on('add_friend', async (data) => {
      const result = await addFriend(data)
      if (result == 1){
        socket.emit('friend_added');
      }
      socket.emit("error_adding_friend", result)
    });

    //Para borrar un amigo
    socket.on('delete_friend', async (data) => {
    const result = await deleteFriend(data)
      socket.emit('friend_deleted_result', result);
    });

    //Para mandar un mensaje a un amigo (puede ser un video)
    socket.on('send_message', async (data) => {

    });
    
  })
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
  // sendDataToScreen,
  broadcastToAdmins 
};