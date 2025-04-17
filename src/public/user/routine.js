(() => {
  // --- Autenticación ---
  const currentUserId = sessionStorage.getItem('fitGameUserId');
  if (!currentUserId) {
    // Not logged in, redirect to login page
    window.location.href = 'login.html';
    return; // Stop script execution
  }

  const socket = io();
  const dashboard    = document.getElementById('dashboard');
  const routineSelect= document.getElementById('routine-select');
  const exerciseView = document.getElementById('exercise-view');
  const btnFinish    = document.getElementById('btnFinish');
  const btnContinue  = document.getElementById('btnContinue');
  const btnSelect    = document.getElementById('btnSelectRoutine');
  const btnCompleted = document.getElementById('btnCompleted');

  // --- Mandar identificación de usuario al servidor ---
  socket.on('connection', () => {
      console.log('Socket conectado, identificando usuario:', currentUserId);
      socket.emit('user_identified', { UserId: currentUserId });
  });

  // “Terminar rutina” → elegir nueva
  btnFinish.addEventListener('click', () => {
    dashboard.classList.add('hidden');
    routineSelect.classList.remove('hidden');
  });

  // “Continuar rutina” → ver ejercicio
  btnContinue.addEventListener('click', ev => {
    ev.preventDefault();
    dashboard.classList.add('hidden');
    exerciseView.classList.remove('hidden');
  });

  // Filtrar y solicitar rutinas
  btnSelect?.addEventListener('click', () => {
    const prefs = [...document.querySelectorAll('.pref-muscle:checked')].map(i => i.value);
    socket.emit('routine_selection', { preferences: prefs });
  });
  socket.on('response_routine_selection', renderRoutineOptions);

  // Asignar rutina
  document.addEventListener('click', ev => {
    if (!ev.target.matches('[data-routine]')) return;
    const routine = JSON.parse(ev.target.dataset.routine);
    socket.emit('selected_routine', { UserId: currentUserId, routine });
  });
  socket.on('response_selected_routine', data => paintTodayCard(data.routine));

  // Marcar ejercicio completado
  btnCompleted.addEventListener('click', () => {
    const name = document.getElementById('exerciseName').textContent;
    socket.emit('exercise_completed', { UserId: currentUserId, exercise: name });
  });
  socket.on('response_exercise_complete', data => {
    if (data.nextExercise) loadExercise(data.nextExercise);
  });

  // --- helpers (implement these) ---
  function renderRoutineOptions(list) { /* … */ }
  function paintTodayCard(routine)   { /* … */ }
  function loadExercise(ex)         { /* … */ }
})();