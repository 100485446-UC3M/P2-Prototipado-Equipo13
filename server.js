// src/sockets/socketHandler.js
const connectedScreens = new Map(); // Asocia screenId -> socket
const ADMIN_ROOM = 'admin_listeners'; // Nombre constante para la sala de admins

function handleSocketConnection(io) {
  io.on('connection', (socket) => {
    console.log('Cliente conectado:', socket.id);

    // --- Registro de Pantallas (Gym Screens) ---
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

        // Opcional: Enviar estado actual si ya hay alguien asignado
        // checkAndSendCurrentAssignment(screenId);
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

    // Dar opciones de una rutina
    socket.on('routine_selection', async (data) => {
        try{
            const Filedata = await fs.readFile('DataBases/routines.json', 'utf-8');
            const routines = JSON.parse(Filedata);
            let selectedRoutine = {};
            
             // Iterar sobre cada preferencia del usuario (asumimos que la data viene con un campo de preferencias)
             data.preferences.forEach(muscle => {
                if (routines[muscle]) {
                    selectedRoutines[muscle] = routines[muscle]; // Agregar rutina al resultado
                }
            });

            if (Object.keys(selectedRoutines).length === 0) {
                socket.emit('routine_response', { error: "No se encontraron rutinas para estas preferencias." });
                return;
            }

            // Enviar la rutina al cliente
            socket.emit('routine_response', selectedRoutine);

        } catch (error) {
            console.error('Error al obtener la rutina:', error.message);
            socket.emit('routine_response', { error: "Error al cargar las rutinas." });
        }
    })

    // El usuario selecciona una rutina
    socket.on('routine_selected', async (data) => {

    })

    
    //  'exercise_completed' desde pantallas
    socket.on('exercise_completed', async (data) => {
        // data podría contener { completedExerciseOrder: number } o { completedExerciseId: string }
        const completedExerciseOrder = data?.completedExerciseOrder; // Asume que el cliente envía el 'order' del ejercicio que terminó
        console.log(`Cliente ${socket.id} (Pantalla ${socket.screenId || 'desconocida'}) reporta ejercicio completado (orden: ${completedExerciseOrder})`);
    
        if (!screenId) {
            console.error(`Error: No se pudo identificar screenId para el socket ${socket.id} que completó un ejercicio.`);
            // Podrías emitir un error de vuelta al cliente
            socket.emit('error_message', { message: 'No se pudo procesar. Pantalla no registrada correctamente.' });
            return;
        }
    
        try {
            
            // Enviar datos del siguiente ejercicio a la pantalla
            // Asegúrate de que el cliente sepa qué hacer con esta info
            // Puede que necesites enviar el objeto completo 'nextExerciseData' o solo partes
            sendDataToScreen(io, screenId, 'update_routine', {
                // user: { id: currentAssignment.userId, name: '...' }, // Podrías obtener el nombre del usuario si es necesario
                routine: {
                    name: routine.name,
                    currentExercise: nextExerciseData, // Envía el objeto completo del siguiente ejercicio en la rutina
                    nextExercise: sortedExercises[nextIndex + 1] || null, // Opcional: Siguiente-siguiente
                    totalExercises: sortedExercises.length,
                    currentExerciseNumber: nextIndex + 1 // Número basado en 1
                }
            });
            
    
        } catch (error) {
            console.error(`Error procesando 'exercise_completed' para socket ${socket.id}:`, error);
            // Enviar un mensaje de error genérico al cliente
            socket.emit('error_message', { message: 'Ocurrió un error interno al procesar tu progreso.' });
        }
          
      }
      );

  });
}

// Función para enviar datos a una pantalla específica 
function sendDataToScreen(io, screenId, eventName, data) {
  // ¡Enviar directamente a la sala! Es más eficiente.
  io.to(screenId).emit(eventName, data);
  console.log(`Enviando evento '${eventName}' a la pantalla ${screenId}`);
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