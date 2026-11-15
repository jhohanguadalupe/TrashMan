(function () {
  'use strict';

  window.TrashGame = window.TrashGame || {};

  const gate = () => document.getElementById('fullscreen-gate');
  let dismissed = false;

  function updateButtons() {
    const active = Boolean(document.fullscreenElement || document.webkitFullscreenElement);
    document.documentElement.classList.toggle('fullscreen-active', active);
    document.querySelectorAll('.fullscreen-toggle').forEach((button) => {
      button.textContent = active ? '⤢' : '⛶';
      button.setAttribute('aria-label', active ? 'Salir de pantalla completa' : 'Pantalla completa');
      button.title = active ? 'Salir de pantalla completa' : 'Pantalla completa';
    });
    if (active && gate()) gate().classList.add('hidden');
  }

  async function enter() {
    const root = document.documentElement;
    const request = root.requestFullscreen || root.webkitRequestFullscreen;
    if (!request) {
      const message = document.getElementById('fullscreen-gate-message');
      if (message) message.textContent = 'Este navegador no permite pantalla completa. Puedes seguir jugando en esta ventana.';
      return false;
    }
    try {
      await request.call(root, { navigationUI: 'hide' });
      dismissed = true;
      if (gate()) gate().classList.add('hidden');
      updateButtons();
      return true;
    } catch (_) {
      const message = document.getElementById('fullscreen-gate-message');
      if (message) message.textContent = 'Tu navegador bloqueó el inicio automático. Pulsa el botón para ampliar el juego.';
      if (gate()) gate().classList.remove('hidden');
      return false;
    }
  }

  function dismiss() {
    dismissed = true;
    if (gate()) gate().classList.add('hidden');
  }

  function onSplashFinished() {
    if (document.fullscreenElement || dismissed) return;
    // Browsers reject this without a user gesture; enter() displays the one-tap fallback.
    enter();
  }

  function toggle() {
    if (document.fullscreenElement || document.webkitFullscreenElement) {
      const exit = document.exitFullscreen || document.webkitExitFullscreen;
      if (exit) Promise.resolve(exit.call(document)).catch(() => {});
      return;
    }
    enter();
  }

  document.addEventListener('fullscreenchange', updateButtons);
  document.addEventListener('webkitfullscreenchange', updateButtons);
  window.addEventListener('orientationchange', () => setTimeout(updateButtons, 150));
  window.TrashGame.Fullscreen = { enter, toggle, dismiss, onSplashFinished };
})();
