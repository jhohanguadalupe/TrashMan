/* Touch-first controls shared by cleaning, Titan and co-op gameplay. */
window.TrashGame = window.TrashGame || {};

TrashGame.MobileControls = {
  joystick: null,
  thumb: null,
  movePointerId: null,
  repeatTimer: null,
  inventoryPaused: false,
  forcedPreview: false,
  weapons: [],

  init() {
    this.joystick = document.getElementById('mobile-joystick');
    this.thumb = document.getElementById('mobile-joystick-thumb');
    this.registerModelTools();
    this.weapons = (TrashGame.Items || []).filter(item => item.category === 'weapon' &&
      (TrashGame.State.player.unlockedWeapons || []).includes(item.id));
    if (this.joystick) {
      this.joystick.addEventListener('pointerdown', event => this.startMove(event));
      this.joystick.addEventListener('pointermove', event => this.updateMove(event));
      ['pointerup', 'pointercancel', 'lostpointercapture'].forEach(type => {
        this.joystick.addEventListener(type, event => this.stopMove(event));
      });
    }

    document.querySelectorAll('[data-mobile-hold]').forEach(button => {
      button.addEventListener('pointerdown', event => this.startAction(event, button.dataset.mobileHold));
      ['pointerup', 'pointercancel', 'lostpointercapture'].forEach(type => {
        button.addEventListener(type, event => this.stopAction(event, button.dataset.mobileHold));
      });
    });
    this.updateWeaponDisplay();
    this.updateMode();
  },

  registerModelTools() {
    if (!Array.isArray(window.TM_TOOL_DATA) || !Array.isArray(TrashGame.Items)) return;
    const existing = new Set(TrashGame.Items.map(item => item.id));
    const icons = [
      [/pala|excavadora/, '⛏️'], [/rastrillo|escoba|barredora/, '🧹'], [/pinza|garra|grua/, '🗜️'],
      [/red|barrera|bote|skimmer/, '🥅'], [/iman/, '🧲'], [/dron/, '🛸'], [/soplador/, '💨'],
      [/criba/, '🧺'], [/camion|carretilla|carro/, '🚛'], [/aspiradora|canon|cañon|final/, '🌀'],
      [/trituradora|prensa|aplastalatas/, '⚙️'], [/rueda/, '♻️']
    ];
    window.TM_TOOL_DATA.forEach(tool => {
      if (!tool || !tool.id || existing.has(tool.id)) return;
      const tier = Math.max(1, Math.min(3, Number(tool.tier) || 1));
      const icon = (icons.find(([pattern]) => pattern.test(tool.id)) || [null, '🧰'])[1];
      TrashGame.Items.push({
        id: tool.id,
        category: 'weapon',
        name: tool.nombre || tool.id.replace(/_/g, ' '),
        rarity: tier === 3 ? 'epico' : tier === 2 ? 'raro' : 'comun',
        icon,
        desc: tool.uso || `Herramienta de nivel ${tier} para operaciones de limpieza.`,
        color: tier === 3 ? 0x4fc3f7 : tier === 2 ? 0x4ade80 : 0x9ca3af
      });
      existing.add(tool.id);
    });
  },

  canControl() {
    const main = TrashGame.Main;
    return !!main && main.currentMode !== 'LOBBY' && !main.isPaused && !main.player.isDead;
  },

  startMove(event) {
    if (!this.canControl()) return;
    event.preventDefault();
    this.movePointerId = event.pointerId;
    this.joystick.setPointerCapture(event.pointerId);
    this.updateMove(event);
  },

  updateMove(event) {
    if (event.pointerId !== this.movePointerId || !this.joystick) return;
    event.preventDefault();
    const rect = this.joystick.getBoundingClientRect();
    const radius = rect.width * 0.34;
    let dx = event.clientX - (rect.left + rect.width / 2);
    let dy = event.clientY - (rect.top + rect.height / 2);
    const length = Math.hypot(dx, dy);
    if (length > radius) { dx = dx / length * radius; dy = dy / length * radius; }
    if (this.thumb) this.thumb.style.transform = `translate(${dx}px, ${dy}px)`;
    const main = TrashGame.Main;
    main.mobileInput.x = dx / radius;
    main.mobileInput.y = dy / radius;
  },

  stopMove(event) {
    if (this.movePointerId !== null && event.pointerId !== this.movePointerId) return;
    this.movePointerId = null;
    if (this.thumb) this.thumb.style.transform = 'translate(0, 0)';
    if (TrashGame.Main) {
      TrashGame.Main.mobileInput.x = 0;
      TrashGame.Main.mobileInput.y = 0;
    }
  },

  startAction(event, action) {
    if (!this.canControl()) return;
    event.preventDefault();
    event.stopPropagation();
    const button = event.currentTarget;
    if (button.setPointerCapture) button.setPointerCapture(event.pointerId);
    button.classList.add('is-pressed');
    const main = TrashGame.Main;
    if (action === 'jump') main.keys.Space = true;
    if (action === 'run') main.mobileInput.sprint = true;
    if (action === 'clean') main.keys.MouseDown = true;
    if (action === 'shoot') {
      main.onShootTrigger();
      this.repeatTimer = window.setInterval(() => {
        if (this.canControl()) main.onShootTrigger();
      }, main.currentMode === 'BOSS' ? 420 : 320);
    }
  },

  stopAction(event, action) {
    const button = event.currentTarget;
    if (button) button.classList.remove('is-pressed');
    if (action === 'shoot' && this.repeatTimer) {
      window.clearInterval(this.repeatTimer);
      this.repeatTimer = null;
    }
    if (!TrashGame.Main) return;
    if (action === 'jump') TrashGame.Main.keys.Space = false;
    if (action === 'run') TrashGame.Main.mobileInput.sprint = false;
    if (action === 'clean') TrashGame.Main.keys.MouseDown = false;
  },

  releaseAll() {
    if (this.repeatTimer) window.clearInterval(this.repeatTimer);
    this.repeatTimer = null;
    this.movePointerId = null;
    if (this.thumb) this.thumb.style.transform = 'translate(0, 0)';
    const main = TrashGame.Main;
    if (main) {
      main.mobileInput.x = 0;
      main.mobileInput.y = 0;
      main.mobileInput.sprint = false;
      main.keys.Space = false;
      main.keys.MouseDown = false;
    }
    document.querySelectorAll('.mobile-action.is-pressed').forEach(button => button.classList.remove('is-pressed'));
  },

  updateMode() {
    const main = TrashGame.Main;
    const cleaning = document.getElementById('mobile-clean-label');
    const cleanButton = document.querySelector('.mobile-action--clean');
    if (!main || !cleaning || !cleanButton) return;
    const isBoss = main.currentMode === 'BOSS';
    cleanButton.classList.toggle('hidden', isBoss);
    cleaning.textContent = main.currentMode === 'MULTIPLAYER' ? 'LIMPIAR' : 'LIMPIAR';
    this.updateWeaponDisplay();
  },

  togglePreview() {
    this.forcedPreview = !this.forcedPreview;
    const controls = document.getElementById('mobile-controls');
    const hud = document.getElementById('game-hud');
    const button = document.getElementById('mobile-controls-toggle');
    if (controls) controls.classList.toggle('is-forced', this.forcedPreview);
    if (hud) hud.classList.toggle('show-touch-preview', this.forcedPreview);
    if (button) {
      button.setAttribute('aria-pressed', String(this.forcedPreview));
      button.title = this.forcedPreview ? 'Ocultar controles táctiles' : 'Mostrar controles táctiles';
      button.classList.toggle('text-cyan-100', this.forcedPreview);
    }
    if (!this.forcedPreview) this.releaseAll();
  },

  updateWeaponDisplay() {
    if (!this.weapons.length) return;
    this.weapons = (TrashGame.Items || []).filter(item => item.category === 'weapon' &&
      (TrashGame.State.player.unlockedWeapons || []).includes(item.id));
    const equipped = TrashGame.State && TrashGame.State.equipped && TrashGame.State.equipped.weapon;
    let index = this.weapons.findIndex(item => item.id === equipped);
    if (index < 0) index = 0;
    const weapon = this.weapons[index];
    const icon = document.getElementById('mobile-weapon-icon');
    const name = document.getElementById('mobile-weapon-name');
    const count = document.getElementById('mobile-weapon-count');
    if (icon) icon.textContent = weapon.icon || '🧰';
    if (name) name.textContent = weapon.name;
    if (count) count.textContent = `${index + 1}/${this.weapons.length}`;
  },

  cycleWeapon(step) {
    if (!this.weapons.length || !TrashGame.State) return;
    const current = this.weapons.findIndex(item => item.id === TrashGame.State.equipped.weapon);
    const next = (Math.max(0, current) + step + this.weapons.length) % this.weapons.length;
    const weapon = this.weapons[next];
    TrashGame.State.equipped.weapon = weapon.id;
    TrashGame.State.save();
    if (TrashGame.Main && TrashGame.CharacterBuilder) {
      TrashGame.CharacterBuilder.build(TrashGame.Main.characterGroup, TrashGame.State.player.character, TrashGame.State.equipped);
    }
    this.updateWeaponDisplay();
    if (TrashGame.Sound) TrashGame.Sound.playEquip();
  },

  openBackpack() {
    const main = TrashGame.Main;
    if (!main || main.currentMode === 'LOBBY' || main.player.isDead || this.inventoryPaused) return;
    this.releaseAll();
    this.inventoryPaused = true;
    main.isPaused = true;
    TrashGame.UI.openModal('modal-inventario');
    TrashGame.UI.filterInventory('weapon');
  },

  onInventoryClosed() {
    if (!this.inventoryPaused) return;
    this.inventoryPaused = false;
    if (TrashGame.Main) TrashGame.Main.isPaused = false;
    this.updateWeaponDisplay();
  }
};
