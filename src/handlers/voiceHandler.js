/* ============== Reconociemiento de voz ============== */
const { getNextExercise } = require('./routineHandler');
async function handleVoiceCommand(socket, data) {
    const cmd = data.command;
    if (cmd.includes('siguiente')) {
        const next = await getNextExercise(data);
        socket.emit('response_exercise_complete', { nextExercise: next });
    } else if (cmd.includes('pausar')) {
        socket.emit('session_paused');
    } // …
}
module.exports = { handleVoiceCommand };
