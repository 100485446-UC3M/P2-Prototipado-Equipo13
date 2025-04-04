// ... después de que el reconocimiento facial devuelve un ID ...

let identifiedUserId = resultFromFacialRecognition; // Puede ser 'user123' o null/undefined si es nuevo
const currentScreenId = 'screen-lobby-01'; // El ID de esta pantalla específica

socket.emit('user_identified', { userId: identifiedUserId, screenId: currentScreenId });
console.log(`Enviando identificación: Usuario ${identifiedUserId || 'nuevo'}, Pantalla ${currentScreenId}`);