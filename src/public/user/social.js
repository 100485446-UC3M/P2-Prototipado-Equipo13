(() => {
  // --- Autenticación ---
  const currentUserId = sessionStorage.getItem('fitGameUserId');
  if (!currentUserId) {
    // Not logged in, redirect to login page
    window.location.href = 'login.html';
    return; // Stop script execution
  }

  const socket      = io();

  const friendsDiv  = document.getElementById('friendList');
  const btnAddFriend= document.getElementById('btnAddFriend');

  const chatBox     = document.getElementById('chatBox');
  const chatInput   = document.getElementById('chatInput');

  // --- Mandar identificación de usuario al servidor ---
  socket.on('connection', () => {
      console.log('Socket conectado, identificando usuario:', currentUserId);
      socket.emit('user_identified', { UserId: currentUserId });
  });

  // Add friend
  btnAddFriend.addEventListener('click', () => {
    const fid = prompt('ID de tu amigo');
    socket.emit('add_friend', { UserId: currentUserId, FriendId: fid });
  });
  socket.on('friend_added', () => alert('¡Amigo añadido!'));
  socket.on('error_adding_friend', e => e.message && alert(e.message));

  // Chat
  chatInput.addEventListener('keypress', ev => {
    if (ev.key === 'Enter' && ev.target.value.trim()) {
      socket.emit('chat_message', { UserId: currentUserId, text: ev.target.value });
      ev.target.value = '';
    }
  });
  socket.on('chat_message', msg => {
    const p = document.createElement('p');
    p.textContent = `${msg.from}: ${msg.text}`;
    chatBox.appendChild(p);
  });

  // Server pushes friend list
  socket.on('friend_list', list => {
    friendsDiv.innerHTML = list.map(u => `<div>${u}</div>`).join('');
  });
})();