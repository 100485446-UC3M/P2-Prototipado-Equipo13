(() => {
    // --- Autenticación ---
    const currentUserId = sessionStorage.getItem('fitGameUserId');
    if (!currentUserId) {
      // Not logged in, redirect to login page
      window.location.href = 'login.html';
      return; // Stop script execution
    }

  const socket      = io();
  const dashboard   = document.getElementById('dashboard');
  const progressSec = document.getElementById('progress');
  const logList     = document.getElementById('activityLog');

  // --- Mandar identificación de usuario al servidor ---
    socket.on('connection', () => {
      console.log('Socket conectado, identificando usuario:', currentUserId);
      socket.emit('user_identified', { UserId: currentUserId });
  });

  // Server sends stats data
  socket.on('response_user_stats', data => {
    renderCharts(data.weeklyCounts);
    logList.innerHTML = data.activities.map(a => `<li>${a}</li>`).join('');
  });

  // --- helpers (implement these) ---
  function renderCharts(counts) { /* … draw D3/Chart.js */ }
})();