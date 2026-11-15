/* =========================================================================
   TRASH MAN 3D - SOPORTE DE MANDO (Gamepad API)
   Archivo independiente: js/engine/gamepad.js
   - Funciona con Xbox, PlayStation, Switch Pro y mandos genericos (mapeo "standard").
   - Se conecta al juego SIN modificar otros archivos: usa TrashGame.Main.keys,
     TrashGame.Main.cameraController, togglePause(), Emotes, Sound, etc.
   - Si algo del juego no existe, simplemente se salta (no rompe nada).
   - Expone TrashGame.Gamepad.state (analogico) para que la IA/dev lo integre mejor.

   CONTROLES
     Stick izq.      mover                    Stick der.   camara (en lobby: girar personaje)
     A  / Cruz       saltar                   B / Circulo  atras / cerrar menu
     X  / Cuadrado   limpiar / aspirar        Y / Triangulo siguiente emote
     RT / R2         accion (limpiar/disparar)LT / L2      correr
     LB / RB         zoom camara -/+          L3           alternar correr
     Start           pausa                    Select       mute
     Menus: D-pad o stick izq. navegan, A pulsa, B cierra.
   ========================================================================= */

window.TrashGame = window.TrashGame || {};

TrashGame.Gamepad = {
  // ---------- configuracion (editable) ----------
  enabled: true,
  deadzone: 0.18,          // zona muerta de los sticks
  lookSpeed: 2.8,          // rad/s de la camara con el stick derecho
  invertY: false,
  moveThreshold: 0.38,     // cuanto hay que inclinar el stick para simular WASD
  zoomSpeed: 420,          // velocidad del zoom con LB/RB
  rumbleEnabled: true,
  showToasts: true,

  // ---------- estado publico (solo lectura) ----------
  connected: false,
  index: -1,
  type: 'generic',         // 'xbox' | 'playstation' | 'switch' | 'generic'
  state: {
    moveX: 0, moveY: 0,    // stick izq. (-1..1)  moveY: -1 = adelante
    lookX: 0, lookY: 0,    // stick der.
    jump: false, action: false, sprint: false, emote: false, pause: false, back: false,
    zoomIn: false, zoomOut: false
  },

  // ---------- internos ----------
  _prev: [],               // botones del frame anterior
  _sprintToggle: false,
  _emoteIdx: 0,
  _focusEl: null,
  _navDir: { x: 0, y: 0 }, _navTimer: 0, _navHeld: false,
  _fireTimer: 0,
  _lastTime: 0,
  _toastEl: null,
  _initialized: false,

  BTN: { A: 0, B: 1, X: 2, Y: 3, LB: 4, RB: 5, LT: 6, RT: 7, SELECT: 8, START: 9, L3: 10, R3: 11,
         UP: 12, DOWN: 13, LEFT: 14, RIGHT: 15 },

  // =====================================================================
  init() {
    if (this._initialized) return;
    this._initialized = true;
    try {
      const saved = JSON.parse(localStorage.getItem('trashman_gamepad_settings') || '{}');
      if (Number.isFinite(saved.lookSpeed)) this.lookSpeed = Math.max(1, Math.min(5, saved.lookSpeed));
      if (typeof saved.invertY === 'boolean') this.invertY = saved.invertY;
      if (typeof saved.rumbleEnabled === 'boolean') this.rumbleEnabled = saved.rumbleEnabled;
    } catch (_) {}
    this.syncSettingsUI();
    this._injectStyle();

    window.addEventListener('gamepadconnected', (e) => this._onConnect(e.gamepad));
    window.addEventListener('gamepaddisconnected', (e) => this._onDisconnect(e.gamepad));
    // Si el mando ya estaba conectado al cargar la pagina
    const pads = navigator.getGamepads ? navigator.getGamepads() : [];
    for (const p of pads) if (p) { this._onConnect(p); break; }

    this._hookRumble();
    this._lastTime = performance.now();
    requestAnimationFrame(this._tick.bind(this));
  },

  setOption(key, value) {
    if (!['lookSpeed', 'invertY', 'rumbleEnabled'].includes(key)) return;
    this[key] = value;
    try { localStorage.setItem('trashman_gamepad_settings', JSON.stringify({ lookSpeed: this.lookSpeed, invertY: this.invertY, rumbleEnabled: this.rumbleEnabled })); } catch (_) {}
  },
  syncSettingsUI() {
    const invert = document.getElementById('gamepad-invert-y');
    const sensitivity = document.getElementById('gamepad-look-speed');
    const rumble = document.getElementById('gamepad-rumble');
    if (invert) invert.checked = this.invertY;
    if (sensitivity) sensitivity.value = this.lookSpeed;
    if (rumble) rumble.checked = this.rumbleEnabled;
  },

  // ---------- conexion ----------
  _detectType(id) {
    id = (id || '').toLowerCase();
    if (/xbox|xinput|microsoft|045e/.test(id)) return 'xbox';
    if (/playstation|dualshock|dualsense|054c|sony|ps4|ps5/.test(id)) return 'playstation';
    if (/nintendo|switch|057e|pro controller/.test(id)) return 'switch';
    return 'generic';
  },
  _onConnect(pad) {
    if (this.connected && this.index !== pad.index) return;   // un solo mando activo
    this.connected = true; this.index = pad.index; this.type = this._detectType(pad.id);
    this._prev = [];
    document.body.classList.add('gp-active');
    this._toast('🎮 Mando conectado (' + this.type + ')');
    this.rumble(0.4, 0.4, 180);
  },
  _onDisconnect(pad) {
    if (pad.index !== this.index) return;
    this.connected = false; this.index = -1;
    this._clearKeys();
    this._setFocus(null);
    document.body.classList.remove('gp-active');
    this._toast('🎮 Mando desconectado');
    const M = TrashGame.Main;
    if (M && M.currentMode !== 'LOBBY' && !M.isPaused && M.togglePause) M.togglePause(); // pausa de seguridad
  },

  // ---------- bucle ----------
  _tick(now) {
    requestAnimationFrame(this._tick.bind(this));
    if (!this.enabled || !this.connected) return;
    const pad = (navigator.getGamepads ? navigator.getGamepads() : [])[this.index];
    if (!pad) return;
    const dt = Math.min((now - this._lastTime) / 1000, 0.1);
    this._lastTime = now;

    const b = (i) => !!(pad.buttons[i] && pad.buttons[i].pressed);
    const v = (i) => (pad.buttons[i] ? pad.buttons[i].value : 0);
    const edge = (i) => b(i) && !this._prev[i];

    // sticks con zona muerta radial
    const L = this._stick(pad.axes[0] || 0, pad.axes[1] || 0);
    const R = this._stick(pad.axes[2] || 0, pad.axes[3] || 0);

    const s = this.state;
    s.moveX = L.x; s.moveY = L.y; s.lookX = R.x; s.lookY = R.y;
    s.jump = b(this.BTN.A);
    s.action = b(this.BTN.RT) || v(this.BTN.RT) > 0.35 || b(this.BTN.X);
    if (edge(this.BTN.L3)) this._sprintToggle = !this._sprintToggle;
    s.sprint = b(this.BTN.LT) || v(this.BTN.LT) > 0.35 || this._sprintToggle;
    s.zoomIn = b(this.BTN.RB); s.zoomOut = b(this.BTN.LB);
    s.emote = edge(this.BTN.Y); s.pause = edge(this.BTN.START); s.back = edge(this.BTN.B);
    s.weaponPrev = edge(this.BTN.LEFT); s.weaponNext = edge(this.BTN.RIGHT); s.backpack = edge(this.BTN.UP);

    const M = TrashGame.Main;
    const modalOpen = this._openModal() !== null;
    const inGame = M && M.currentMode && M.currentMode !== 'LOBBY' && !M.isPaused && !modalOpen;

    if (edge(this.BTN.SELECT) && TrashGame.Sound && TrashGame.Sound.toggleMute) TrashGame.Sound.toggleMute();

    if (inGame) {
      this._gameFrame(M, dt, s);
      if (s.pause && M.togglePause) M.togglePause();
    } else {
      this._clearKeys();
      this._menuFrame(M, dt, pad, edge, L, R, modalOpen);
      // Start en pausa = reanudar
      if (M && M.isPaused && s.pause && M.togglePause) M.togglePause();
    }

    for (let i = 0; i < pad.buttons.length; i++) this._prev[i] = b(i);
  },

  _stick(x, y) {
    const m = Math.hypot(x, y);
    if (m < this.deadzone) return { x: 0, y: 0 };
    const k = (m - this.deadzone) / (1 - this.deadzone) / m;       // reescala 0..1
    return { x: Math.max(-1, Math.min(1, x * k)), y: Math.max(-1, Math.min(1, y * k)) };
  },

  // ---------- gameplay ----------
  _gameFrame(M, dt, s) {
    const k = M.keys; if (!k) return;
    const th = this.moveThreshold;
    k.KeyW = s.moveY < -th; k.KeyS = s.moveY > th;
    k.KeyA = s.moveX < -th; k.KeyD = s.moveX > th;
    k.ShiftLeft = s.sprint;
    k.Space = s.jump;
    // 'MouseDown' = limpiar/aspirar. Solo lo tocamos mientras el mando lo controla.
    this._padActionHeld = s.action;
    k.MouseDown = s.action;
    if (s.weaponPrev && TrashGame.MobileControls) TrashGame.MobileControls.cycleWeapon(-1);
    if (s.weaponNext && TrashGame.MobileControls) TrashGame.MobileControls.cycleWeapon(1);
    if (s.backpack && TrashGame.MobileControls) TrashGame.MobileControls.openBackpack();

    // disparo en el jefe: mismo efecto que un click (con auto-repeticion)
    if (s.action) {
      this._fireTimer -= dt;
      if (this._fireTimer <= 0) {
        this._fireTimer = 0.28;
        if ((M.currentMode === 'BOSS' || M.currentMode === 'MULTIPLAYER' && TrashGame.OnlineRoom && TrashGame.OnlineRoom.gameMode === 'titan') && M.onActionTrigger) M.onActionTrigger();
      }
    } else this._fireTimer = 0;

    // camara
    const cc = M.cameraController;
    if (cc) {
      const iy = this.invertY ? -1 : 1;
      if (s.lookX || s.lookY) cc.rotate(s.lookX * this.lookSpeed * dt, s.lookY * this.lookSpeed * dt * iy);
      if (s.zoomIn) cc.zoom(-this.zoomSpeed * dt);
      if (s.zoomOut) cc.zoom(this.zoomSpeed * dt);
    }

    // emotes: Y recorre la lista
    if (s.emote && TrashGame.Emotes && TrashGame.Emotes.list && TrashGame.Emotes.trigger) {
      const list = TrashGame.Emotes.list;
      if (list.length) {
        TrashGame.Emotes.trigger(list[this._emoteIdx % list.length].id);
        this._emoteIdx++;
      }
    }
  },

  _clearKeys() {
    const M = TrashGame.Main;
    if (!M || !M.keys || !this._keysDirty) { this._keysDirty = false; return; }
    const k = M.keys;
    k.KeyW = k.KeyS = k.KeyA = k.KeyD = k.Space = k.ShiftLeft = k.MouseDown = false;
    this._keysDirty = false;
  },

  // ---------- menus ----------
  _menuFrame(M, dt, pad, edge, L, R, modalOpen) {
    const B = this.BTN;
    // girar personaje en el lobby con el stick derecho
    if (M && M.currentMode === 'LOBBY' && !modalOpen && M.lobby && R.x) M.lobby.targetRotY += R.x * 3.0 * dt;

    // direccion: d-pad o stick izq., con repeticion
    let dx = 0, dy = 0;
    if (pad.buttons[B.LEFT] && pad.buttons[B.LEFT].pressed) dx = -1;
    else if (pad.buttons[B.RIGHT] && pad.buttons[B.RIGHT].pressed) dx = 1;
    else if (L.x < -0.6) dx = -1; else if (L.x > 0.6) dx = 1;
    if (pad.buttons[B.UP] && pad.buttons[B.UP].pressed) dy = -1;
    else if (pad.buttons[B.DOWN] && pad.buttons[B.DOWN].pressed) dy = 1;
    else if (L.y < -0.6) dy = -1; else if (L.y > 0.6) dy = 1;

    if (dx || dy) {
      this._navTimer -= dt;
      if (!this._navHeld || this._navTimer <= 0) {
        this._navTimer = this._navHeld ? 0.12 : 0.38;
        this._navHeld = true;
        this._navigate(dx, dy);
      }
    } else { this._navHeld = false; this._navTimer = 0; }

    if (edge(B.A)) {
      if (!this._focusEl || !document.body.contains(this._focusEl)) this._navigate(0, 1);
      else this._activate(this._focusEl);
    }
    if (edge(B.B)) this._goBack(M);
  },

  _openModal() {
    const modals = Array.from(document.querySelectorAll('.modal-backdrop:not(.hidden)'));
    if (!modals.length) return null;
    return modals.reduce((top, modal) => {
      const z = Number.parseInt(getComputedStyle(modal).zIndex, 10) || 0;
      const topZ = Number.parseInt(getComputedStyle(top).zIndex, 10) || 0;
      return z >= topZ ? modal : top;
    });
  },
  _menuRoot() {
    const m = this._openModal();
    if (m) return m;
    return document.getElementById('lobby-ui') || document.body;
  },
  _candidates() {
    const root = this._menuRoot();
    const sel = 'button, a[href], input, select, textarea, [onclick], [role="button"], .cursor-pointer';
    return Array.from(root.querySelectorAll(sel)).filter((el) => {
      if (el.disabled) return false;
      const r = el.getBoundingClientRect();
      if (r.width < 4 || r.height < 4) return false;
      if (r.bottom < 0 || r.top > innerHeight || r.right < 0 || r.left > innerWidth) return false;
      const cs = getComputedStyle(el);
      return cs.visibility !== 'hidden' && cs.display !== 'none' && cs.pointerEvents !== 'none';
    });
  },
  _navigate(dx, dy) {
    const list = this._candidates();
    if (!list.length) return;
    if (!this._focusEl || !list.includes(this._focusEl)) {
      // primer foco: el elemento mas arriba-izquierda
      list.sort((a, b) => {
        const ra = a.getBoundingClientRect(), rb = b.getBoundingClientRect();
        return (ra.top - rb.top) || (ra.left - rb.left);
      });
      this._setFocus(list[0]); return;
    }
    const c = this._center(this._focusEl);
    let best = null, bestScore = Infinity;
    for (const el of list) {
      if (el === this._focusEl) continue;
      const p = this._center(el);
      const ddx = p.x - c.x, ddy = p.y - c.y;
      const along = dx ? ddx * dx : ddy * dy;          // distancia en la direccion pedida
      if (along <= 4) continue;
      const across = dx ? Math.abs(ddy) : Math.abs(ddx);
      const score = along + across * 2.2;
      if (score < bestScore) { bestScore = score; best = el; }
    }
    if (best) { this._setFocus(best); TrashGame.Sound && TrashGame.Sound.playWheelTick && TrashGame.Sound.playWheelTick(760); }
    else if (this._focusEl && this._focusEl.type === 'range' && dx) this._stepRange(this._focusEl, dx);
  },
  _center(el) { const r = el.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; },
  _setFocus(el) {
    if (this._focusEl) this._focusEl.classList.remove('gp-focus');
    this._focusEl = el;
    if (el) { el.classList.add('gp-focus'); el.scrollIntoView({ block: 'nearest', inline: 'nearest' }); }
  },
  _stepRange(el, dir) {
    const step = parseFloat(el.step) || 1;
    el.value = String(parseFloat(el.value) + dir * step);
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
  },
  _activate(el) {
    if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') el.focus(); else el.click();
    this.rumble(0.15, 0.1, 40);
  },
  _goBack(M) {
    const m = this._openModal();
    if (m) {
      if (M && M.isPaused && M.togglePause) { M.togglePause(); return; }
      if (TrashGame.UI && TrashGame.UI.closeModal) TrashGame.UI.closeModal(m.id);
      else window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', code: 'Escape' }));
      this._setFocus(null);
    }
  },

  // ---------- vibracion ----------
  rumble(strong = 0.5, weak = 0.5, ms = 120) {
    if (!this.rumbleEnabled || !this.connected) return;
    const pad = (navigator.getGamepads ? navigator.getGamepads() : [])[this.index];
    if (!pad) return;
    try {
      const act = pad.vibrationActuator;
      if (act && act.playEffect) act.playEffect('dual-rumble', { startDelay: 0, duration: ms, weakMagnitude: weak, strongMagnitude: strong });
      else if (pad.hapticActuators && pad.hapticActuators[0]) pad.hapticActuators[0].pulse(Math.max(strong, weak), ms);
    } catch (e) { /* algunos navegadores no soportan vibracion */ }
  },
  // Vibra automaticamente cuando suenan ciertos sonidos del juego (sin editar sound.js)
  _hookRumble() {
    const S = TrashGame.Sound; if (!S || S._gpHooked) return;
    const wrap = (name, strong, weak, ms) => {
      const fn = S[name]; if (typeof fn !== 'function') return;
      S[name] = (...a) => { TrashGame.Gamepad.rumble(strong, weak, ms); return fn.apply(S, a); };
    };
    wrap('playBossHit', 0.7, 0.4, 160); wrap('playBossSlam', 1.0, 0.8, 380);
    wrap('playLaserShot', 0.15, 0.35, 60); wrap('playCoin', 0.1, 0.25, 70);
    wrap('playVacuumPop', 0.12, 0.2, 50); wrap('playFanfare', 0.5, 0.6, 300);
    S._gpHooked = true;
  },

  // ---------- UI auxiliar ----------
  _toast(msg) {
    if (!this.showToasts) return;
    if (!this._toastEl) {
      const t = document.createElement('div');
      t.style.cssText = 'position:fixed;left:50%;top:18px;transform:translate(-50%,-30px);z-index:99999;padding:8px 16px;border-radius:999px;background:rgba(15,23,42,.92);color:#e2e8f0;font:600 13px system-ui,sans-serif;border:1px solid rgba(74,222,128,.5);box-shadow:0 6px 24px rgba(0,0,0,.4);opacity:0;transition:all .3s;pointer-events:none;';
      document.body.appendChild(t); this._toastEl = t;
    }
    const t = this._toastEl; t.textContent = msg;
    t.style.opacity = '1'; t.style.transform = 'translate(-50%,0)';
    clearTimeout(this._toastT);
    this._toastT = setTimeout(() => { t.style.opacity = '0'; t.style.transform = 'translate(-50%,-30px)'; }, 2200);
  },
  _injectStyle() {
    if (document.getElementById('gp-style')) return;
    const st = document.createElement('style'); st.id = 'gp-style';
    st.textContent = '.gp-focus{outline:3px solid #4ade80 !important;outline-offset:3px;box-shadow:0 0 0 6px rgba(74,222,128,.25),0 0 24px rgba(74,222,128,.55) !important;transform:scale(1.03);transition:transform .08s;z-index:5;position:relative;}';
    document.head.appendChild(st);
  }
};

// Marca "ensuciadas" las teclas cuando el mando las toca (para limpiarlas al salir a un menu)
(function () {
  const G = TrashGame.Gamepad, orig = G._gameFrame;
  G._gameFrame = function (...a) { this._keysDirty = true; return orig.apply(this, a); };
})();

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => TrashGame.Gamepad.init());
else TrashGame.Gamepad.init();
