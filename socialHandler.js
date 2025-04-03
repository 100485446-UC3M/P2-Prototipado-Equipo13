const socialCompetitionFile = 'DataBases/socialCompetition.json';

async function addToStat(UserId, exercise ){
    try {
        const Filedata = await fs.readFile(socialCompetitionFile, 'utf-8');
        const completedExercises = JSON.parse(Filedata);
       //Si el usuario no existe, inicializar su lista
        if (!completedExercises[UserId]) {
            completedExercises[UserId] = [];
        }

    completedExercises[userId].push(exercise);
    await fs.writeFile(socialCompetitionFile, JSON.stringify(completedExercises, null, 4));
    }

    catch (error) {
        console.error('Error al marcar ejercicio como completado:', error);
        return { error: "Error al actualizar los ejercicios completados." };
        }
}
