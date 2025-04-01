
const userRoutinesFile = 'DataBases/userRoutines.json';

// Function to get the next exercise for a user
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

module.exports = { getNextExercise };
