const userRoutinesFile = 'DataBases/userRoutines.json';
const RoutinesFile = 'DataBases/routines.json';

//Funcion para agregar ejercicios
async function addRoutine(data){

    const { routineName, muscleGroup, exercises } = data;
    if (!routineName || !muscleGroup || !exercises || typeof exercises !== 'object' || Object.keys(exercises).length === 0) {
        console.error(`Datos inválidos recibidos en 'addRoutine' de ${socket.id}:`, data);
        socket.emit('addRoutine_response', {
            success: false,
            message: 'Datos inválidos. Se requiere routineName, muscleGroup y un objeto exercises no vacío.'
        });
        return;
    }

    const Filedata = await fs.readFile(RoutinesFile, 'utf-8');
    const definedRoutines = JSON.parse(Filedata);
    try {
        // Crear el objeto de la nueva rutina con metadatos
        const newRoutine = {
            name: routineName.trim(),
            addedBy: socket.id, // Identificador del admin (socket.id es simple, podría ser un ID de usuario si los admins inician sesión)
            addedAt: new Date().toISOString(),
            exercises: exercises // El objeto de ejercicios tal como se recibió
        };

        // Asegurarse de que el grupo muscular exista como array en definedRoutines
        if (!Array.isArray(definedRoutines[muscleGroup])) {
            definedRoutines[muscleGroup] = []; // Crear el array si es la primera rutina para este grupo
        }

        // (Opcional pero recomendado) Verificar si ya existe una rutina con el mismo nombre en ese grupo muscular
        const existingRoutineIndex = definedRoutines[muscleGroup].findIndex(r => r.name.toLowerCase() === newRoutine.name.toLowerCase());
        if (existingRoutineIndex !== -1) {
             console.warn(`Intento de agregar rutina duplicada: "${newRoutine.name}" en grupo "${muscleGroup}" por ${socket.id}`);
             return -2
            }

        // Añadir la nueva rutina al array del grupo muscular correspondiente
        definedRoutines[muscleGroup].push(newRoutine);
        console.log(`Nueva rutina "${newRoutine.name}" añadida al grupo "${muscleGroup}" por ${socket.id}`);

        //  Guardar el objeto `definedRoutines` completo en el archivo JSON
        try {
            await fs.writeFile(RoutinesFile, JSON.stringify(definedRoutines, null, 2), 'utf-8');
        } catch (error) {
            console.error("Error guardando definedRoutines:", error.message);
        } 

        //  Enviar confirmación al admin
        return 1;

    } catch (error) {
        console.error(`Error procesando 'addRoutine' :`, error);
        return -1
    };
};

const fs = require('fs').promises;

//Función para obtener rutinas solicitad con preferencias 
async function getRoutines(preferences) {
    if (!Array.isArray(preferences) || preferences.length === 0) {
        console.warn('getRoutines llamada sin preferencias válidas.');
        return { error: "Debes especificar al menos un grupo muscular." };
    }
    try{
    const Filedata = await fs.readFile(RoutinesFile, 'utf-8');
    const routines = JSON.parse(Filedata);
    let selectedRoutines = {};
     
     // Iterar sobre cada preferencia del usuario (asumimos que la data viene con un campo de preferencias)
     preferences.forEach(muscle => {
        if (routines[muscle]) {
            selectedRoutines[muscle] = routines[muscle]; // Agregar rutina al resultado
        }
    });

    if (Object.keys(selectedRoutines).length === 0) {
        socket.emit('routine_response', { error: "No se encontraron rutinas para estas preferencias." });
        return{ error: "No se encontraron rutinas para estas preferencias." };
    }
    return selectedRoutines;
    
} catch (error) {
    console.error('Error al obtener las rutinas:', error.message);
    return { error: "Error al cargar las rutinas." };
}
}

// Function to save routines to JSON file
async function saveUserRoutines() {
    try {
        await fs.writeFile(userRoutinesFile, JSON.stringify(userRoutines, null, 2), 'utf-8');
    } catch (error) {
        console.error("Error saving user routines:", error.message);
    }
}

// Función para obtener siguiente ejercicio
async function getNextExercise(userId) {
    try {
        const data = await fs.readFile(userRoutinesFile, 'utf-8');
        const userRoutines = JSON.parse(data);

        if (!userRoutines[userId]) {
            return { error: "No routine found for this user." };
        }

        const { routine, currentStep } = userRoutines[userId];

        if (currentStep >= routine.exercises.length) {
            return { message: "Routine completed!" };
        }

        // Get the next exercise
        const nextExercise = routine.exercises[currentStep];

        // Update current step
        userRoutines[userId].currentStep += 1;
        await fs.writeFile(userRoutinesFile, JSON.stringify(userRoutines, null, 2), 'utf-8');

        return { nextExercise };
    } catch (error) {
        console.error("Error getting next exercise:", error.message);
        return { error: "Error accessing routine data." };
    }
}


module.exports = { getRoutines,
                getNextExercise,
                addRoutine,
                saveUserRoutines };
