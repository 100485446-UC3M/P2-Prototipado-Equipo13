// filepath: src/public/user/login.js
(() => {
    const socket = io();
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');

    const registerBtn = document.getElementById('register_btn');
    const loginBtn = document.getElementById('login_btn');
    const registerPanel = document.getElementById('register-panel');
    const loginPanel = document.getElementById('login-panel');

    function handleLogin(ev, action){
		if (typeof action !== 'string' || typeof ev !== 'SubmitEvent'){
			console.error("Error al manejar el inicio de sesión: la función recibió argumentos de tipos incorrectos");
			return;
		}
		else if (action !== 'login' && action !== 'register'){
			console.error("Error al manejar el inicio de sesión: la función solo puede recibir 'login' o 'register'");
			return;
		}

		ev.preventDefault();
		const userId = ev.target.user.value.trim();
		const password = ev.target.password.value; 

		if (userId && password) {
			console.log(`User ${userId} attempting login...`);

			const userType = 'Users';
			const msg = { username: userId, password: password, type: userType };
			socket.emit(action, msg);
			// once se asegura de solo crear un listener
			socket.once('successful_' + action, () => {
				// Store user ID in sessionStorage (clears when browser tab closes)
				// Use localStorage for more persistent login
				sessionStorage.setItem('fitGameUserId', userId);
			
				// Redirect to the main routine page after login
				window.location.href = 'routine.html';
			})
			socket.once('failed_' + action, (error) => {
				alert("Error al manejar el inicio de sesión: " + (error.message || "el servidor ha reportado un error"));
				return;
			})
		} else {
			alert('Por favor, introduce un nombre de usuario y contraseña');
		}
		return;
  }
  
    loginForm?.addEventListener('submit', ev => {
      	handleLogin(ev, 'login');
    });

    registerForm?.addEventListener('submit', ev => {
      	handleLogin(ev, 'register');
    });

    registerBtn?.addEventListener('click', ev => {
		ev.preventDefault();
		registerPanel.classList.remove('hidden');
		loginPanel.classList.add('hidden');
    });

    loginBtn?.addEventListener('click', ev => {
		ev.preventDefault();
		registerPanel.classList.add('hidden');
		loginPanel.classList.remove('hidden');
    });
  
    // Optional: Add socket listeners here if the server needs to confirm login
    // socket.on('login_success', (data) => { ... });
    // socket.on('login_fail', (error) => { alert(error.message); });
    // socket.emit('attempt_login', { userId, password });
})();