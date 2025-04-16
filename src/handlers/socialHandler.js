const socialCompetitionFile = 'DataBases/socialCompetition.json';
const friendsFile = 'DataBases/userFriends.json';
let friendList = {}

async function addToStat(data){
    try {
        const Filedata = await fs.readFile(socialCompetitionFile, 'utf-8');
        const completedExercises = JSON.parse(Filedata);
       //Si el usuario no existe, inicializar su lista
        if (!completedExercises[data.UserId]) {
            completedExercises[data.UserId] = [];
        }

    completedExercises[data.UserId].push(exercise);
    await fs.writeFile(socialCompetitionFile, JSON.stringify(completedExercises, null, 4));
    }

    catch (error) {
        console.error('Error al marcar ejercicio como completado:', error);
        return { error: "Error al actualizar los ejercicios completados." };
        }
}

//En caso que un usuario quiesese ver sus estadísticas
async function seeStats(data){
    try {
    const Filedata = await fs.readFile(socialCompetitionFile, 'utf-8');
    const completedExercises = JSON.parse(Filedata);
    if (!completedExercises[data.UserId]) {
        return { error: "No se encontro el usuario" };}
    return completedExercises;
    } catch (error){
        console.error('Error al encontrar estadísticas', error);
        return { error: "Error al encontrar estadísticas" };
    }
}

//Para agregar un usuario a la red de amigos
async function addFriend(data){
    try{
    const Filedata = await fs.readFile(friendFile, 'utf-8');
    const friendList = JSON.parse(Filedata);
    if (!friendList[data.UserId]) {
        friendList[data.UserId] = [];
    }
    // Evitar añadir duplicados
    if (!friendList[data.UserId].includes(data.FriendId)) {
        friendList[data.UserId].push(data.FriendId);

        // Tambien añadir al otro usuario
        if (!friendList[data.FriendId]) {
            friendList[data.FriendId] = [];
        }
        if (!friendList[data.FriendId].includes(data.UserId)) {
             friendList[data.FriendId].push(data.UserId);
        }
        await fs.writeFile(friendFile, JSON.stringify(friendList, null, 4)); 
        return 1; 
    } else {
        console.log(`El usuario ${data.FriendId} ya es amigo de ${data.UserId}`);
        return { message: "Ya son amigos." }; // Indicar que ya existe
    }
} catch (error){
    console.error('Error al agregar amigo:', error);
    return { error: "Error interno al agregar amigo" };
}
}

//Para borrar un amigo
async function deleteFriend(data){
    try {
        const Filedata = await fs.readFile(friendFile, 'utf-8');
        friendList = JSON.parse(Filedata);


    // Verificar si el usuario principal (UserId) existe en la lista
    if (!friendList[data.UserId] || !Array.isArray(friendList[data.UserId])) {
        console.warn(`Usuario ${data.UserId} no encontrado o sin lista de amigos para borrar.`);
        return { error: "Usuario no encontrado o sin amigos." };
    }

    const originalFriendCount = friendList[data.UserId].length;

    const updatedFriends = friendList[data.UserId].filter(
        friendIdInList => friendIdInList !== data.FriendId
    );

    //  Verificar si algún amigo fue realmente eliminado
    //  Si la longitud del array no cambió, significa que FriendId no estaba en la lista.
    if (updatedFriends.length === originalFriendCount) {
        console.warn(`Amigo ${data.FriendId} no encontrado en la lista de ${data.UserId}.`);
        return { error: "Amigo no encontrado en la lista para borrar." };
    }

    friendList[data.UserId] = updatedFriends;

    // Si la amistad es mutua, también debes eliminar al UserId de la lista del FriendId
    if (friendList[data.FriendId] && Array.isArray(friendList[data.FriendId])) {
        friendList[data.FriendId] = friendList[data.FriendId].filter(
            userIdInList => userIdInList !== data.UserId
        );
    }

    // Escribir el objeto friendList modificado de vuelta al archivo
    await fs.writeFile(friendFile, JSON.stringify(friendList, null, 4)); 
    console.log(`Amigo ${data.FriendId} borrado de la lista de ${data.UserId}`);
    return 1; 

} catch (error) {
    console.error('Error al borrar amigo:', error);
    return { error: "Error interno al borrar amigo" }; 
}
}

//Para mandar un mensaje a un amigo (puede ser un video)
async function sendMessage(data){
    
}


module.exports = {
    addToStat,
    seeStats,
    addFriend,
    deleteFriend,
    sendMessage
  };