const userRoutinesFile = 'src/Databases/userRoutinesFile.json';
const RoutinesFile = 'src/Databases/routines.json';
var userRoutines = {}; 

//Funcion para agregar rutinas
async function addRoutine(data){

    const { routineName, muscleGroup, exercises } = data;
    if (!routineName || !muscleGroup || !exercises || typeof exercises !== 'object' || Object.keys(exercises).length === 0) {
        console.error(`Datos inválidos recibidos en 'addRoutine' de ${socket.id}:`, data);
        return {error:'Datos inválidos. Se requiere routineName, muscleGroup y un objeto exercises no vacío.'};
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
             return { error: "Intento de agregar rutina duplicada"};
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
        return { error: "Error general al agregar rutina"};;
    }
}

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
        return{ error: "No se encontraron rutinas para estas preferencias." };
    }
    return selectedRoutines;
    
} catch (error) {
    console.error('Error al obtener las rutinas:', error.message);
    return { error: "Error al cargar las rutinas." };
}
}

// Función para guardar en el JSON file
async function saveUserRoutines(data) {
    userRoutines[data.UserId] = data.routine; // Asignar rutina al usuario
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

        // AGREGAR LÓGICA CON RESPECTO A ANÁLISIS DE OCUPACIÓN DEL GIMNASIO, ¿QUÉ EJERCICIO RECOMENDAR, SI EL SIGUIENTE ESTÁ OCUPADO?

        // Get the next exercise
        const nextExercise = routine.exercises[currentStep];

        // Update current step
        userRoutines[userId].currentStep += 1;
        await fs.writeFile(userRoutinesFile, JSON.stringify(userRoutines, null, 2), 'utf-8');
        return { nextExercise };
    } catch (error) {
        console.error("Error getting next exercise:", error.message);
        return { error: "Error accessing routine data." }
    }
}

//Para ver los ejercicios restantes
async function seeAllExercises(UserId){
    try {
        const data = await fs.readFile(userRoutinesFile, 'utf-8');
        const userRoutines = JSON.parse(data);

        if (!userRoutines[UserId]) {
            return { error: "No routine found for this user." };
        }
        return userRoutines
    } catch (error) {
        console.error("Error getting next exercise:", error.message);
        return { error: "Error accessing routine data." }
    }
}


//En caso que el usuario quiera añadir un ejercicio a la rutina
async function addExercise(data) {

    const userId = data.UserId;
    const exerciseToAdd = data.exercise.trim(); 

    try {
        let userRoutines = {};
        try {
            const fileData = await fs.readFile(userRoutinesFile, 'utf-8');
            // Recomiendan hacer trim
            userRoutines = fileData.trim() ? JSON.parse(fileData) : {};
        } catch (readError) {
            if (readError.code === 'ENOENT') {
                console.log(`Archivo ${userRoutinesFile} no encontrado. No se puede añadir ejercicio.`);
                return { error: `El usuario ${userId} no tiene una rutina definida (archivo no existe).` };
            }
        }
        const userData = userRoutines[userId];

        if (!userData) {
            console.warn(`addExercise: Usuario ${userId} no encontrado en ${userRoutinesFile}.`);
            return { error: `El usuario ${userId} no tiene una rutina definida.` };
        }

        // Revisar la estructura
        if (!userData.routine || !Array.isArray(userData.routine.exercises)) {
            console.error(`addExercise: Estructura de rutina inválida para el usuario ${userId}.`, userData);
            return { error: `Estructura de rutina inválida para el usuario ${userId}. No se pudo añadir el ejercicio.` };
        }

        // Revisar si el ejercicio ya existe
        if (userData.routine.exercises.includes(exerciseToAdd)) {
            console.log(`addExercise: El ejercicio "${exerciseToAdd}" ya existe en la rutina de ${userId}.`);
            return { message: `El ejercicio "${exerciseToAdd}" ya está en la rutina.` };
        }

        // Agregar nuevo ejercicio
        userData.routine.exercises.push(exerciseToAdd);
        console.log(`Ejercicio "${exerciseToAdd}" añadido a la rutina de ${userId}.`);

        await fs.writeFile(userRoutinesFile, JSON.stringify(userRoutines, null, 4), 'utf-8');

        return 1;

    } catch (error) {
        // Error general
        console.error(`Error en addExercise para ${userId}:`, error);
        return { error: "Error interno del servidor al intentar añadir el ejercicio." };
    }
}

//En caso que el usuario quiera eliminar un ejercicio de la rutina
async function deleteExercise(data) {
    
    const userId = data.UserId;
    const exerciseToDelete = data.exercise.trim(); 

    try {
        try {
            const fileData = await fs.readFile(userRoutinesFile, 'utf-8');
            // Recomiendan hacer trim
            userRoutines = fileData.trim() ? JSON.parse(fileData) : {};
        } catch (readError) {
            if (readError.code === 'ENOENT') {
                console.log(`Archivo ${userRoutinesFile} no encontrado. No se puede remover ejercicio.`);
                return { error: `El usuario ${userId} no tiene una rutina definida (archivo no existe).` };
            }
        }
        const userData = userRoutines[userId];

        if (!userData) {
            console.warn(`deleteExercise: Usuario ${userId} no encontrado en ${userRoutinesFile}.`);
            return { error: `El usuario ${userId} no tiene una rutina definida.` };
        }

        // Revisar la estructura
        if (!userData.routine || !Array.isArray(userData.routine.exercises)) {
            console.error(`addExercise: Estructura de rutina inválida para el usuario ${userId}.`, userData);
            return { error: `Estructura de rutina inválida para el usuario ${userId}. No se pudo remover el ejercicio.` };
        }

        // Revisar si el ejercicio existe
        if (!userData.routine.exercises.includes(exerciseToDelete)) {
            console.log(`addExercise: El ejercicio "${exerciseToDelete}" no  çexiste en la rutina de ${userId}.`);
            return { error: `El ejercicio "${exerciseToDelete}" no está en la rutina.` };
        }

        // Eliminar ejercicio
         const updatedExercises = userData.routine.exercises.filter(
            exerciseInList => exerciseInList !== exerciseToDelete
        );

        console.log(`Ejercicio "${exerciseToDelete}" removido a la rutina de ${userId}.`);

        userData.routine.exercises = updatedExercises;
        await fs.writeFile(userRoutinesFile, JSON.stringify(userRoutines, null, 4), 'utf-8');

        return 1;

    } catch (error) {
        // Error general
        console.error(`Error en deleteExercise para ${userId}:`, error);
        return { error: "Error interno del servidor al intentar remover el ejercicio." };
    }
}

//Si el usuario quiere que le recomendemos una rutina en base a sus preferencias
async function recommendRoutine(UserId) {
    
}

//Si el usuario quiere grabar un video
async function recordVideo(UserID) {}

module.exports = { getRoutines,
                getNextExercise,
                addRoutine,
                saveUserRoutines,
                seeAllExercises,
                addExercise,
                deleteExercise,
                recommendRoutine,
                recordVideo };
