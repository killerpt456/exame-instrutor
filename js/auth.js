(function(){
  'use strict';

  // Altera estes valores antes de publicar. Esta barreira é apenas client-side.
  const AUTH_CONFIG = {
    username: 'MarroquinoK22',
    passwordSha256: 'b4c65ac0a72f3ba206fc6b601725fbdecea1e07042f7b1c1e174dd1ec140698c',
  };
  const SESSION_KEY = 'instrutor_auth_session_v1';
  const authScreen = document.getElementById('auth-screen');
  const app = document.getElementById('app');
  const form = document.getElementById('login-form');
  const error = document.getElementById('auth-error');
  const userInput = document.getElementById('login-user');
  const passwordInput = document.getElementById('login-password');
  const passwordToggle = document.getElementById('password-toggle');

  function showApp(){
    authScreen.hidden = true;
    app.hidden = false;
  }

  function showLogin(){
    authScreen.hidden = false;
    app.hidden = true;
    userInput.focus();
  }

  async function sha256(value){
    const data = new TextEncoder().encode(value);
    const digest = await crypto.subtle.digest('SHA-256', data);
    return Array.from(new Uint8Array(digest)).map(byte => byte.toString(16).padStart(2, '0')).join('');
  }

  function sessionIsValid(){
    try{
      const session = JSON.parse(localStorage.getItem(SESSION_KEY));
      return session && session.authenticated === true;
    }catch(e){
      return false;
    }
  }

  form.addEventListener('submit', async event => {
    event.preventDefault();
    error.hidden = true;
    const username = userInput.value.trim();
    const passwordHash = await sha256(passwordInput.value);
    if(username !== AUTH_CONFIG.username || passwordHash !== AUTH_CONFIG.passwordSha256){
      error.hidden = false;
      passwordInput.value = '';
      passwordInput.focus();
      return;
    }
    localStorage.setItem(SESSION_KEY, JSON.stringify({ authenticated: true, createdAt: Date.now() }));
    form.reset();
    showApp();
  });

  document.getElementById('logout-btn').addEventListener('click', () => {
    localStorage.removeItem(SESSION_KEY);
    showLogin();
  });

  passwordToggle.addEventListener('click', () => {
    const isVisible = passwordInput.type === 'text';
    passwordInput.type = isVisible ? 'password' : 'text';
    passwordToggle.classList.toggle('is-visible', !isVisible);
    passwordToggle.setAttribute('aria-label', isVisible ? 'Mostrar password' : 'Ocultar password');
    passwordToggle.setAttribute('aria-pressed', String(!isVisible));
  });

  if(sessionIsValid()) showApp();
  else showLogin();
})();