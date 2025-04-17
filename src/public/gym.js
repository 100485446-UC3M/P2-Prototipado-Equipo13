/*  Client‑side logic for the big screen (gym.html)  */
(() => {
    // 1) Conexión Socket.IO
    const socket = io();                                // ⇒ http://hostname:3000 por defecto
  
    // 2) Identificar la pantalla cuando el socket se abra
    const SCREEN_ID = 'GYM01';                          // TODO: generar dinámicamente
    socket.emit('register_screen', { screenId: SCREEN_ID });
  
    /* 3) Recibir actualizaciones —–––––––––––––––––––––––––––– */
    // Cuando un usuario termina un ejercicio y pide el siguiente
    socket.on('response_exercise_complete', data => {
      if (data.nextExercise) {
        renderExercise(data.nextExercise);
      } else if (data.message) {
        showToast(data.message);
      }
    });
  
    /* 4) Lógica de UI muy básica —–––––––––––––––––––––––––––– */
    const $video    = document.querySelector('#exerciseVideo');
    const $name     = document.querySelector('#exerciseName');
    const $timer    = document.querySelector('#exerciseTimer');
    const $nextName = document.querySelector('#nextExerciseName');
  
    function renderExercise({ name, videoUrl, duration }) {
      // Carga vídeo + texto
      $video.src = videoUrl;
      $name.textContent = name;
      $timer.textContent = duration ?? '—';
    }
  
    function showToast(msg, ok = true) {
      const div = Object.assign(document.createElement('div'), {
        className: 'toast',
        textContent: msg
      });
      if (!ok) div.style.background = '#e53935';
      document.body.append(div);
      setTimeout(() => div.remove(), 4_000);
    }
  
    /* 5) Controles Start / Pause / Stop */
    document.querySelector('#startBtn') ?.addEventListener('click', () => socket.emit('start_session', { screenId: SCREEN_ID }));
    document.querySelector('#pauseBtn') ?.addEventListener('click', () => socket.emit('pause_session', { screenId: SCREEN_ID }));
    document.querySelector('#stopBtn')  ?.addEventListener('click', ()  => socket.emit('stop_session',  { screenId: SCREEN_ID }));
  })();