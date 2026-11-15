/* =========================================================================
   TRASH MAN 3D - MAIN ORCHESTRATOR & ULTRA-REALISTIC GRAPHICS LOOP
   PBR Photorealistic Pipeline, Dynamic Bloom Post-Processing & Cinematic Lighting
   ========================================================================= */

window.TrashGame = window.TrashGame || {};

TrashGame.Main = {
  scene: null,
  camera: null,
  renderer: null,
  composer: null, // EffectComposer with UnrealBloomPass if available
  clock: new THREE.Clock(),

  // Lighting References
  lights: {
    ambient: null,
    sun: null,
    rim: null,
    fill: null
  },

  // Groups
  worldGroup: null,
  characterGroup: null,
  petGroup: null,
  particlesGroup: null,
  pedestalGroup: null,
  lobbyHangarGroup: null,

  // Sub-systems
  cameraController: null,
  trashManager: null,

  currentMode: 'LOBBY', // 'LOBBY', 'STORY', 'BOSS', 'MULTIPLAYER'
  currentMapId: 'playa',
  difficulty: 'medium',
  pendingSession: null,
  isPaused: false,
  deathFall: null,
  footstepTimer: 0,

  // Player physics state
  player: {
    pos: new THREE.Vector3(0, 0, 0),
    vel: new THREE.Vector3(0, 0, 0),
    speed: 8.0,
    isGrounded: true,
    hp: 100,
    maxHp: 100,
    isDead: false,
    isCleaning: false
  },

  // Lobby 360 drag rotation
  lobby: {
    isDragging: false,
    prevX: 0,
    rotY: 0,
    targetRotY: 0,
    particles: []
  },

  // Keyboard keys map
  keys: {
    KeyW: false, KeyS: false, KeyA: false, KeyD: false,
    Space: false, ShiftLeft: false, ShiftRight: false,
    MouseDown: false
  },
  mobileInput: { x: 0, y: 0, sprint: false, clean: false },
  resizeObserver: null,
  damageFlashTimer: null,
  damagedMaterials: [],
  touchLook: null,

  init() {
    const container = document.getElementById('three-container');
    const w = container.clientWidth || window.innerWidth;
    const h = container.clientHeight || window.innerHeight;

    // 1. Scene — NO background, NO fog in lobby (canvas = transparent so lobby_bg image shows)
    this.scene = new THREE.Scene();
    this.scene.background = null;
    this.scene.fog = null;

    // 2. Camera & Controller
    this.camera = new THREE.PerspectiveCamera(45, w / h, 0.1, 400);
    this.cameraController = new TrashGame.CameraController(this.camera);

    // 3. Renderer with ACES Tone Mapping (Standard Neutral 1.0 Exposure)
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance'
    });
    this.renderer.setSize(w, h);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 0.98;
    this.renderer.outputEncoding = THREE.sRGBEncoding;
    container.appendChild(this.renderer.domElement);
    if (TrashGame.Graphics) TrashGame.Graphics.initRenderer(this.renderer);

    // 4. Setup Post-Processing (Carefully calibrated Bloom)
    this.setupPostProcessing(w, h);

    // 5. Dynamic Lighting System
    this.setupLighting();

    // 6. Scene Hierarchy Groups
    this.worldGroup = new THREE.Group();
    this.scene.add(this.worldGroup);

    this.characterGroup = new THREE.Group();
    this.scene.add(this.characterGroup);

    this.petGroup = new THREE.Group();
    this.scene.add(this.petGroup);

    this.particlesGroup = new THREE.Group();
    this.scene.add(this.particlesGroup);

    this.trashManager = new TrashGame.TrashManager(this.worldGroup, this.particlesGroup);

    // 7. Initial High-Tech Lobby Scene
    this.setupLobbyHangar();
    TrashGame.CharacterBuilder.build(this.characterGroup, TrashGame.State.player.character, TrashGame.State.equipped);
    TrashGame.CharacterBuilder.buildPet(this.petGroup, TrashGame.State.equipped.pet);

    // 8. Event Listeners & Controls
    this.setupListeners(container);
    if (window.ResizeObserver) {
      this.resizeObserver = new ResizeObserver(() => this.onResize());
      this.resizeObserver.observe(container);
    }
    if (window.visualViewport) window.visualViewport.addEventListener('resize', () => this.onResize());
    window.addEventListener('orientationchange', () => setTimeout(() => this.onResize(), 120));

    // 9. UI Subsystems
    TrashGame.UI.init();
    if (TrashGame.MobileControls) TrashGame.MobileControls.init();
    TrashGame.Roulette.draw();

    // 10. Start Game Loop
    requestAnimationFrame(this.loop.bind(this));
  },

  setupPostProcessing(w, h) {
    // New HDR + MSAA pipeline (falls back to the original composer if unsupported)
    if (TrashGame.Graphics) {
      const c = TrashGame.Graphics.makeComposer(this.renderer, this.scene, this.camera, w, h);
      if (c) {
        this.composer = c;
        this.hdrPipeline = true;
        TrashGame.Graphics.setSize(w, h);
        return;
      }
    }
    try {
      if (typeof THREE.EffectComposer !== 'undefined' && typeof THREE.UnrealBloomPass !== 'undefined') {
        this.composer = new THREE.EffectComposer(this.renderer);
        const renderPass = new THREE.RenderPass(this.scene, this.camera);
        this.composer.addPass(renderPass);

        // High threshold ensures ONLY pure emissive lights (lasers/reactors) glow, NOT sky or terrain!
        const bloomPass = new THREE.UnrealBloomPass(
          new THREE.Vector2(w, h),
          0.3,   // subtle strength
          0.2,   // radius
          0.94   // high threshold prevents over-glowing terrain & fog
        );
        this.composer.addPass(bloomPass);
      }
    } catch (e) {
      console.warn('EffectComposer bloom fallback to standard renderer:', e);
      this.composer = null;
    }
  },

  setupLighting() {
    // 1. Ambient Light
    this.lights.ambient = new THREE.AmbientLight(0xe6e1d3, 0.5);
    this.scene.add(this.lights.ambient);

    // 2. Directional Sun Key Light with PCF Soft Shadows
    this.lights.sun = new THREE.DirectionalLight(0xffe9cf, 0.95);
    this.lights.sun.position.set(25, 45, 25);
    this.lights.sun.castShadow = true;
    this.lights.sun.shadow.mapSize.width = 2048;
    this.lights.sun.shadow.mapSize.height = 2048;
    this.lights.sun.shadow.camera.near = 1;
    this.lights.sun.shadow.camera.far = 180;
    this.lights.sun.shadow.camera.left = -50;
    this.lights.sun.shadow.camera.right = 50;
    this.lights.sun.shadow.camera.top = 50;
    this.lights.sun.shadow.camera.bottom = -50;
    this.lights.sun.shadow.bias = -0.0003;
    this.lights.sun.shadow.normalBias = 0.04;
    this.scene.add(this.lights.sun);

    // 3. Cyber-Eco Rim Light (Subtle accent)
    this.lights.rim = new THREE.DirectionalLight(0x8cbd87, 0.18);
    this.lights.rim.position.set(-20, 20, -20);
    this.scene.add(this.lights.rim);

    // 4. Fill Cool Light
    this.lights.fill = new THREE.DirectionalLight(0x9ebbc4, 0.2);
    this.lights.fill.position.set(20, 15, -20);
    this.scene.add(this.lights.fill);

    if (TrashGame.Graphics) TrashGame.Graphics.initLights(this.scene, this.lights);
  },

  setupLobbyHangar() {
    this.lobbyHangarGroup = new THREE.Group();

    // 1. Floor removed to let lobby_bg.jpg show through

    // 2. Pedestal removed — character stands directly over lobby_bg.jpg
    this.pedestalGroup = new THREE.Group();
    this.lobbyHangarGroup.add(this.pedestalGroup);

    // Soft contact shadow blends the 3D hero into the painted lobby platform.
    const shadowSize = 96;
    const shadowData = new Uint8Array(shadowSize * shadowSize * 4);
    for (let y = 0; y < shadowSize; y++) {
      for (let x = 0; x < shadowSize; x++) {
        const dx = (x / (shadowSize - 1) - 0.5) * 2;
        const dy = (y / (shadowSize - 1) - 0.5) * 2;
        const falloff = Math.max(0, 1 - dx * dx - dy * dy);
        const i = (y * shadowSize + x) * 4;
        shadowData[i] = 10; shadowData[i + 1] = 15; shadowData[i + 2] = 12;
        shadowData[i + 3] = Math.round(falloff * falloff * 92);
      }
    }
    const shadowTexture = new THREE.DataTexture(shadowData, shadowSize, shadowSize, THREE.RGBAFormat);
    shadowTexture.needsUpdate = true;
    const heroShadow = new THREE.Mesh(
      new THREE.PlaneGeometry(2.2, 1.15),
      new THREE.MeshBasicMaterial({ map: shadowTexture, transparent: true, depthWrite: false, toneMapped: false })
    );
    heroShadow.rotation.x = -Math.PI / 2;
    heroShadow.position.set(0, -0.135, -0.75);
    this.lobbyHangarGroup.add(heroShadow);

    // 3. Pillars removed to let lobby_bg.jpg show through

    // 4. Floating Micro Dust Particles (reduced)
    this.lobby.particles = [];
    const pGeo = new THREE.SphereGeometry(0.03, 6, 6);
    const pMat = new THREE.MeshBasicMaterial({ color: 0x4ade80, transparent: true, opacity: 0.35 });
    for (let i = 0; i < 10; i++) {
      const p = new THREE.Mesh(pGeo, pMat);
      p.position.set(
        (Math.random() - 0.5) * 6,
        0.5 + Math.random() * 3.5,
        (Math.random() - 0.5) * 6
      );
      this.lobbyHangarGroup.add(p);
      this.lobby.particles.push(p);
    }

    this.scene.add(this.lobbyHangarGroup);
  },

  setupListeners(container) {
    window.addEventListener('keydown', (e) => {
      if (this.keys.hasOwnProperty(e.code)) this.keys[e.code] = true;
      if (e.code === 'KeyE') this.keys.MouseDown = true;
      if (e.code === 'KeyF' && !e.repeat && this.currentMode !== 'LOBBY') this.onShootTrigger();
    });

    window.addEventListener('keyup', (e) => {
      if (this.keys.hasOwnProperty(e.code)) this.keys[e.code] = false;
      if (e.code === 'KeyE') this.keys.MouseDown = false;
    });

    container.addEventListener('mousedown', (e) => {
      if (this.currentMode === 'LOBBY') {
        this.lobby.isDragging = true;
        this.lobby.prevX = e.clientX;
      } else if (e.button === 2) {
        e.preventDefault();
        this.onShootTrigger();
      } else if (e.button === 0) {
        this.keys.MouseDown = true;
        this.onActionTrigger();
      } else {
        return;
      }
    });

    container.addEventListener('contextmenu', (e) => e.preventDefault());

    // Drag on the open right side of the screen to look around on touch devices.
    container.addEventListener('pointerdown', (e) => {
      if (e.pointerType !== 'touch' || e.target.closest('#mobile-controls') || this.currentMode === 'LOBBY') return;
      this.touchLook = { id: e.pointerId, x: e.clientX, y: e.clientY };
    });
    container.addEventListener('pointermove', (e) => {
      if (!this.touchLook || e.pointerId !== this.touchLook.id) return;
      const dx = e.clientX - this.touchLook.x;
      const dy = e.clientY - this.touchLook.y;
      this.touchLook.x = e.clientX;
      this.touchLook.y = e.clientY;
      this.cameraController.rotate(dx * 0.006, dy * 0.006);
    });
    ['pointerup', 'pointercancel'].forEach(type => container.addEventListener(type, (e) => {
      if (this.touchLook && e.pointerId === this.touchLook.id) this.touchLook = null;
    }));

    window.addEventListener('mouseup', () => {
      this.lobby.isDragging = false;
      this.keys.MouseDown = false;
    });

    window.addEventListener('mousemove', (e) => {
      if (this.currentMode === 'LOBBY') {
        if (!this.lobby.isDragging) return;
        const dx = e.clientX - this.lobby.prevX;
        this.lobby.targetRotY += dx * 0.012;
        this.lobby.prevX = e.clientX;
      } else {
        if (document.pointerLockElement === container || e.buttons === 1 || e.buttons === 2) {
          this.cameraController.rotate(e.movementX * 0.0035, e.movementY * 0.0035);
        }
      }
    });

    container.addEventListener('wheel', (e) => {
      if (this.currentMode !== 'LOBBY') {
        this.cameraController.zoom(e.deltaY);
      }
    });

    container.addEventListener('click', () => {
      if (this.currentMode !== 'LOBBY' && !this.isPaused) {
        if ((!TrashGame.Gamepad || !TrashGame.Gamepad.connected) && container.requestPointerLock) container.requestPointerLock();
      }
    });

    window.addEventListener('resize', this.onResize.bind(this));
  },

  onActionTrigger() {
    if (this.currentMode === 'BOSS' || this.currentMode === 'MULTIPLAYER' && TrashGame.OnlineRoom && TrashGame.OnlineRoom.gameMode === 'titan') {
      if (TrashGame.Humans) TrashGame.Humans.triggerShoot(this.characterGroup);
      TrashGame.AdventureMode.firePlasma(this.characterGroup.position, this.cameraController.yaw, this.worldGroup);
    }
  },

  onShootTrigger() {
    if (this.isPaused || this.currentMode === 'LOBBY') return;
    if (this.currentMode === 'BOSS' || this.currentMode === 'MULTIPLAYER' && TrashGame.OnlineRoom && TrashGame.OnlineRoom.gameMode === 'titan') {
      this.onActionTrigger();
      return;
    }
    if ((this.currentMode === 'STORY' || this.currentMode === 'MULTIPLAYER') && TrashGame.Monsters) {
      if (TrashGame.Humans) TrashGame.Humans.triggerShoot(this.characterGroup);
      TrashGame.Monsters.fireShot(this.camera, this.player.pos, this.worldGroup);
    }
  },

  showVictory() {
    const modal = document.getElementById('modal-victory');
    if (!modal) return;
    document.querySelectorAll('.modal-backdrop').forEach(item => {
      if (item !== modal) item.classList.add('hidden');
    });
    modal.classList.remove('hidden');
    modal.setAttribute('aria-hidden', 'false');
    modal.style.display = 'flex';
    modal.style.visibility = 'visible';
    modal.style.opacity = '1';
    modal.style.pointerEvents = 'auto';
    modal.style.zIndex = '10020';
    const firstAction = modal.querySelector('button');
    if (firstAction) {
      try { firstAction.focus({ preventScroll: true }); } catch (_) { firstAction.focus(); }
    }
  },

  prepareSession(modeType, mapId) {
    this.pendingSession = { modeType, mapId };
    const modal = document.getElementById('modal-difficulty');
    if (modal) modal.classList.remove('hidden');
    if (TrashGame.Sound) TrashGame.Sound.playClick();
  },

  chooseDifficulty(level) {
    if (!TrashGame.Difficulties[level] || !this.pendingSession) return;
    this.difficulty = level;
    const session = this.pendingSession;
    this.pendingSession = null;
    const modal = document.getElementById('modal-difficulty');
    if (modal) modal.classList.add('hidden');
    if (TrashGame.Sound) TrashGame.Sound.playClick();
    if (session.modeType === 'boss') {
      TrashGame.TitanStory.open();
      return;
    }
    if (session.modeType === 'multiplayer' && TrashGame.OnlineRoom && !TrashGame.OnlineRoom.startAsHost({ mapId: session.mapId, difficulty: level })) return;
    this.startSession(session.modeType, session.mapId);
  },

  cancelDifficulty() {
    this.pendingSession = null;
    const modal = document.getElementById('modal-difficulty');
    if (modal) modal.classList.add('hidden');
  },

  startSession(modeType, mapId) {
    if (!TrashGame.Difficulties[this.difficulty]) this.difficulty = 'medium';
    this.restoreDeathFall();
    TrashGame.Sound.stopDeath();
    TrashGame.Sound.playFanfare();

    document.querySelectorAll('.modal-backdrop').forEach(m => {
      m.classList.add('hidden');
      m.style.removeProperty('display');
      m.style.removeProperty('visibility');
      m.style.removeProperty('opacity');
      m.style.removeProperty('pointer-events');
      m.style.removeProperty('z-index');
      m.setAttribute('aria-hidden', 'true');
    });
    document.getElementById('lobby-ui').classList.add('opacity-0', 'pointer-events-none');
    document.getElementById('game-hud').classList.remove('hidden');

    // Hide lobby background image — reveal 3D canvas for gameplay
    const lobbyBg = document.getElementById('lobby-bg-image');
    if (lobbyBg) lobbyBg.style.opacity = '0';
    // Show the Three.js canvas
    const threeContainer = document.getElementById('three-container');
    if (threeContainer) threeContainer.style.opacity = '1';
    this.currentMode = modeType.toUpperCase();
    const multiplayerTitan = modeType === 'multiplayer' && TrashGame.OnlineRoom && TrashGame.OnlineRoom.gameMode === 'titan';
    if (modeType !== 'boss' && !multiplayerTitan && this.cameraController) this.cameraController.setFocus(null);
    this.currentMapId = multiplayerTitan ? 'boss_arena' : mapId;
    this.isPaused = false;
    this.mobileInput.x = 0;
    this.mobileInput.y = 0;
    this.mobileInput.sprint = false;
    this.mobileInput.clean = false;
    if (TrashGame.MobileControls) TrashGame.MobileControls.updateMode();

    // Hide Lobby Hangar during active matches
    if (this.lobbyHangarGroup) this.lobbyHangarGroup.visible = false;

    // Reset player
    this.player.pos.set(0, 0, 0);
    this.player.vel.set(0, 0, 0);
    this.player.hp = 100;
    this.player.isDead = false;
    this.player.isGrounded = true;

    this.updatePlayerHpBar();
    if (TrashGame.Monsters) TrashGame.Monsters.clear(this.worldGroup);

    const actualMapKey = modeType === 'boss' || multiplayerTitan ? 'boss_arena' : mapId;
    const mapData = TrashGame.MapsData[actualMapKey] || TrashGame.MapsData.playa;
    if (TrashGame.Sound) TrashGame.Sound.setMapAudio(actualMapKey);

    // Adapt Lighting dynamically for the selected environment
    this.lights.ambient.color.setHex(mapData.ambientColor || 0xffedd5);
    this.lights.ambient.intensity = mapData.ambientIntensity || 0.6;

    if (mapData.hasSun && mapData.sunPosition) {
      this.lights.sun.position.set(mapData.sunPosition.x, mapData.sunPosition.y, mapData.sunPosition.z);
      this.lights.sun.color.setHex(mapData.sunColor || 0xfff7ed);
      this.lights.sun.intensity = mapData.sunIntensity || 1.25;
    } else {
      this.lights.sun.position.set(20, 40, 20);
      this.lights.sun.intensity = mapData.sunIntensity || 0.8;
    }

    this.lights.rim.intensity = 0.15; // Clean natural accent
    this.lights.fill.intensity = 0.25;

    // Keep trash placement identical across players in the shared online room.
    const nativeRandom = Math.random;
    if (modeType === 'multiplayer' && TrashGame.OnlineRoom && TrashGame.OnlineRoom.roomStarted) {
      let seed = 2166136261;
      for (const char of `${TrashGame.OnlineRoom.roomCode}:${mapId}`) seed = Math.imul(seed ^ char.charCodeAt(0), 16777619);
      let randomState = seed >>> 0;
      Math.random = () => {
        randomState += 0x6D2B79F5;
        let value = randomState;
        value = Math.imul(value ^ value >>> 15, value | 1);
        value ^= value + Math.imul(value ^ value >>> 7, value | 61);
        return ((value ^ value >>> 14) >>> 0) / 4294967296;
      };
    }
    try {
      if (modeType === 'boss' || multiplayerTitan) {
        TrashGame.MapBuilder.build(this.scene, this.worldGroup, 'boss_arena', this.trashManager);
        TrashGame.AdventureMode.start(this.worldGroup);
        if (TrashGame.Monsters) TrashGame.Monsters.spawnForMap(this.worldGroup, 'boss_arena', TrashGame.State.player.level || 1, this.difficulty);
        if (multiplayerTitan) TrashGame.MultiplayerMode.start(this.worldGroup);
      } else {
        TrashGame.MapBuilder.build(this.scene, this.worldGroup, mapId, this.trashManager);
        if (TrashGame.Monsters) TrashGame.Monsters.spawnForMap(this.worldGroup, mapId, TrashGame.State.player.level || 1, this.difficulty);
        TrashGame.StoryMode.start(mapId, this.trashManager);

        if (modeType === 'multiplayer') TrashGame.MultiplayerMode.start(this.worldGroup);
      }
    } finally {
      Math.random = nativeRandom;
    }

    if (modeType !== 'boss' && mapData.playerSpawn) {
      this.player.pos.set(mapData.playerSpawn.x, 0, mapData.playerSpawn.z);
      this.characterGroup.position.copy(this.player.pos);
    }

    if (this.cameraController) {
      this.cameraController.setCollidables([this.worldGroup]);
      if (this.cameraController.snapBehind) this.cameraController.snapBehind(this.player.pos);
      if (this.cameraController.settings && TrashGame.Gamepad && TrashGame.Gamepad.connected) {
        this.cameraController.settings.shoulderOffset = 0.35;
      }
    }

    TrashGame.UI.showToast(`¡Entrando a ${mapData.title}!`, 'success');
    if (TrashGame.Shop) TrashGame.Shop.updateProximity(this.player.pos, mapId);
  },

  exitToLobby() {
    if (this.currentMode === 'MULTIPLAYER' && TrashGame.OnlineRoom) TrashGame.OnlineRoom.returnToLobby();
    this.restoreDeathFall();
    TrashGame.Sound.stopDeath();
    TrashGame.Sound.playClick();
    if (document.exitPointerLock) document.exitPointerLock();

    document.querySelectorAll('.modal-backdrop').forEach(m => {
      m.classList.add('hidden');
      m.style.removeProperty('display');
      m.style.removeProperty('visibility');
      m.style.removeProperty('opacity');
      m.style.removeProperty('pointer-events');
      m.style.removeProperty('z-index');
      m.setAttribute('aria-hidden', 'true');
    });
    document.getElementById('game-hud').classList.add('hidden');
    document.getElementById('lobby-ui').classList.remove('opacity-0', 'pointer-events-none');

    this.currentMode = 'LOBBY';
    this.isPaused = false;
    if (TrashGame.Sound) TrashGame.Sound.setLobbyAudio();
    this.touchLook = null;
    if (TrashGame.MobileControls) TrashGame.MobileControls.releaseAll();

    TrashGame.StoryMode.active = false;
    TrashGame.AdventureMode.stop(this.worldGroup);
    TrashGame.MultiplayerMode.stop(this.worldGroup);
    if (TrashGame.Shop) TrashGame.Shop.reset();
    if (TrashGame.WorldLife) TrashGame.WorldLife.clear(this.worldGroup);
    if (TrashGame.Monsters) TrashGame.Monsters.clear(this.worldGroup);

    while (this.worldGroup.children.length > 0) this.worldGroup.remove(this.worldGroup.children[0]);
    this.trashManager.clear();

    // Restore Lobby Lights & Fog
    this.scene.background = null;
    this.scene.fog = null;
    if (TrashGame.Graphics) TrashGame.Graphics.applyLobby(this.scene);

    this.lights.ambient.color.setHex(0xe6e1d3);
    this.lights.ambient.intensity = 0.5;
    this.lights.sun.position.set(25, 45, 25);
    this.lights.sun.color.setHex(0xffe9cf);
    this.lights.sun.intensity = 0.95;
    this.lights.rim.intensity = 0.18;
    this.lights.fill.intensity = 0.2;

    // Restore Lobby Hangar
    if (this.lobbyHangarGroup) this.lobbyHangarGroup.visible = true;

    // Show lobby background image again, hide 3D canvas behind it
    const lobbyBg = document.getElementById('lobby-bg-image');
    if (lobbyBg) lobbyBg.style.opacity = '1';

    TrashGame.CharacterBuilder.build(this.characterGroup, TrashGame.State.player.character, TrashGame.State.equipped);
    TrashGame.CharacterBuilder.buildPet(this.petGroup, TrashGame.State.equipped.pet);
    this.cameraController.setLobbyView();
  },

  togglePause() {
    this.isPaused = !this.isPaused;
    if (this.isPaused && TrashGame.MobileControls) TrashGame.MobileControls.releaseAll();
    TrashGame.Sound.playClick();
    const modal = document.getElementById('modal-pause');
    if (this.isPaused) {
      modal.classList.remove('hidden');
      if (document.exitPointerLock) document.exitPointerLock();
    } else {
      modal.classList.add('hidden');
    }
  },

  loop() {
    requestAnimationFrame(this.loop.bind(this));

    const dt = Math.min(this.clock.getDelta(), 0.1);
    const time = this.clock.getElapsedTime();

    if (this.currentMode === 'LOBBY') {
      this.updateLobby(dt, time);
    } else if (this.player.isDead) {
      this.updateDeathFall(dt);
    } else if (!this.isPaused) {
      this.updateGame(dt, time);
    }

    // Dynamic Ocean Water ripple animation
    if (TrashGame.MapBuilder.activeWaterMesh && TrashGame.MapBuilder.activeWaterMesh.material.normalMap) {
      TrashGame.MapBuilder.activeWaterMesh.material.normalMap.offset.x = time * 0.025;
      TrashGame.MapBuilder.activeWaterMesh.material.normalMap.offset.y = time * 0.015;
    }

    // Floating Clouds gentle drifting
    if (TrashGame.MapBuilder.clouds && TrashGame.MapBuilder.clouds.length > 0) {
      TrashGame.MapBuilder.clouds.forEach(c => {
        c.position.x += 0.35 * dt;
        if (c.position.x > 85) c.position.x = -85;
      });
    }

    if (TrashGame.Graphics) TrashGame.Graphics.update(time, dt);

    // Lobby renders directly (keeps the canvas transparent over lobby_bg.jpg);
    // gameplay renders through the HDR composer.
    const useComposer = this.composer && this.currentMode !== 'LOBBY';
    if (this.hdrPipeline) {
      const tm = useComposer ? THREE.NoToneMapping : THREE.ACESFilmicToneMapping;
      if (this.renderer.toneMapping !== tm) this.renderer.toneMapping = tm;
    }
    if (useComposer) {
      this.composer.render();
    } else {
      this.renderer.render(this.scene, this.camera);
    }
  },

  updateLobby(dt, time) {
    this.lobby.rotY += (this.lobby.targetRotY - this.lobby.rotY) * 0.1;
    this.characterGroup.visible = true;
    // Recover once if an asset or browser file permission left the lobby rig empty.
    if (this.characterGroup.children.length === 0 && !this.characterGroup.userData.lobbyRigRecovered) {
      this.characterGroup.userData.lobbyRigRecovered = true;
      TrashGame.CharacterBuilder.build(
        this.characterGroup,
        TrashGame.State.player.character,
        TrashGame.State.equipped
      );
    }
    this.characterGroup.rotation.y = this.lobby.rotY;
    this.characterGroup.position.set(0, -0.15, -0.75);

    if (this.pedestalGroup) {
      this.pedestalGroup.rotation.y = time * 0.12;
      if (this.pedestalGroup.userData.ring2) {
        this.pedestalGroup.userData.ring2.rotation.z = -time * 0.25;
      }
    }

    // Floating Ambient Light Specks in Hangar
    if (this.lobby.particles) {
      this.lobby.particles.forEach((p, idx) => {
        p.position.y += Math.sin(time * 2 + idx) * 0.003;
        p.rotation.y = time * 0.5;
      });
    }

    // Dynamic Free Fire Style Emote Animation OR Idle Organic Breathing
    let isEmoting = false;
    if (TrashGame.Emotes) {
      isEmoting = TrashGame.Emotes.update(this.characterGroup, time, dt);
    }
    const heroRig = this.characterGroup && this.characterGroup.userData;
    if (heroRig && heroRig.gltfMixer && !isEmoting) heroRig.gltfMixer.update(dt);
    if (heroRig && heroRig.tmModel && !isEmoting) {
      TrashGame.Humans.animate(this.characterGroup, time, dt, false, false, true);
    }

    if (!isEmoting) {
      this.characterGroup.position.set(0, -0.15, -0.75);
      const u = this.characterGroup.userData;
      if (u.torso && !u.gltfMixer && !u.tmModel) {
        const b = Math.sin(time * 2.5) * 0.02;
        u.torso.scale.set(1 + b, 1 + b * 0.8, 1 + b);
        this.characterGroup.position.y = -0.15 + Math.sin(time * 2) * 0.015;

        // Recuperación fluida y suave hacia la postura neutral de respiración
        const lerpSpeed = 0.16;
        u.torso.rotation.x += (0 - u.torso.rotation.x) * lerpSpeed;
        u.torso.rotation.y += (0 - u.torso.rotation.y) * lerpSpeed;
        u.torso.rotation.z += (0 - u.torso.rotation.z) * lerpSpeed;

        if (u.headGroup && !u.gltfMixer) {
          u.headGroup.rotation.x += (0 - u.headGroup.rotation.x) * lerpSpeed;
          u.headGroup.rotation.y += (Math.sin(time * 0.8) * 0.05 - u.headGroup.rotation.y) * lerpSpeed;
          u.headGroup.rotation.z += (0 - u.headGroup.rotation.z) * lerpSpeed;
        }

        if (u.leftArm && !u.gltfMixer) {
          const armX = Math.sin(time * 1.5) * 0.03;
          const armZ = 0.06 + Math.cos(time * 1.5) * 0.02;
          u.leftArm.rotation.x += (armX - u.leftArm.rotation.x) * lerpSpeed;
          u.leftArm.rotation.y += (0 - u.leftArm.rotation.y) * lerpSpeed;
          u.leftArm.rotation.z += (armZ - u.leftArm.rotation.z) * lerpSpeed;
        }

        if (u.rightArm && !u.gltfMixer) {
          const armX = -0.1 + Math.sin(time * 1.5) * 0.03;
          const armZ = -0.06 - Math.cos(time * 1.5) * 0.02;
          u.rightArm.rotation.x += (armX - u.rightArm.rotation.x) * lerpSpeed;
          u.rightArm.rotation.y += (0 - u.rightArm.rotation.y) * lerpSpeed;
          u.rightArm.rotation.z += (armZ - u.rightArm.rotation.z) * lerpSpeed;
        }

        if (u.leftLeg) {
          u.leftLeg.rotation.x += (0 - u.leftLeg.rotation.x) * lerpSpeed;
          u.leftLeg.rotation.y += (0 - u.leftLeg.rotation.y) * lerpSpeed;
          u.leftLeg.rotation.z += (0 - u.leftLeg.rotation.z) * lerpSpeed;
        }

        if (u.rightLeg) {
          u.rightLeg.rotation.x += (0 - u.rightLeg.rotation.x) * lerpSpeed;
          u.rightLeg.rotation.y += (0 - u.rightLeg.rotation.y) * lerpSpeed;
          u.rightLeg.rotation.z += (0 - u.rightLeg.rotation.z) * lerpSpeed;
        }
      }
    }

    // Pet idle gyro orbit
    if (this.petGroup) {
      this.petGroup.position.set(0.72, 1.45 + Math.sin(time * 3) * 0.12, -0.6);
      this.petGroup.rotation.y = Math.sin(time * 1.5) * 0.3;
      if (this.petGroup.userData.ring1) {
        this.petGroup.userData.ring1.rotation.y = time * 2;
        this.petGroup.userData.ring1.rotation.z = time * 1.5;
      }
    }

    this.cameraController.setLobbyView();
  },

  updateGame(dt, time) {
    if (TrashGame.OnlineRoom) TrashGame.OnlineRoom.update(dt);
    // 1. Move Player
    const moveDir = new THREE.Vector3();
    const fwd = new THREE.Vector3(-Math.sin(this.cameraController.yaw), 0, -Math.cos(this.cameraController.yaw));
    const right = new THREE.Vector3(Math.cos(this.cameraController.yaw), 0, -Math.sin(this.cameraController.yaw));

    const gamepadState = TrashGame.Gamepad && TrashGame.Gamepad.connected ? TrashGame.Gamepad.state : null;
    const analogStrength = gamepadState ? Math.min(1, Math.hypot(gamepadState.moveX, gamepadState.moveY)) : 0;
    if (gamepadState) {
      moveDir.addScaledVector(fwd, -gamepadState.moveY);
      moveDir.addScaledVector(right, gamepadState.moveX);
    } else {
      if (this.keys.KeyW) moveDir.add(fwd);
      if (this.keys.KeyS) moveDir.sub(fwd);
      if (this.keys.KeyD) moveDir.add(right);
      if (this.keys.KeyA) moveDir.sub(right);
    }
    moveDir.addScaledVector(fwd, -this.mobileInput.y);
    moveDir.addScaledVector(right, this.mobileInput.x);

    const isMoving = moveDir.lengthSq() > 0.01;
    const sprint = (this.keys.ShiftLeft || this.keys.ShiftRight || this.mobileInput.sprint) ? 1.55 : 1.0;
    if (isMoving) {
      this.footstepTimer -= dt;
      if (this.footstepTimer <= 0) {
        const step = { playa: 'paso_arena', bosque: 'paso_pasto', rio: 'paso_agua', ciudad: 'paso_ciudad', manglar: 'paso_agua', puerto: 'paso_ciudad', boss_arena: 'paso_ciudad' }[this.currentMapId] || 'paso_arena';
        TrashGame.Sound.playAsset(`gameplay/pasos/${step}`, 0.2);
        this.footstepTimer = sprint > 1 ? 0.31 : 0.46;
      }
    } else this.footstepTimer = Math.min(this.footstepTimer, 0.12);

    if (isMoving) {
      const analogOnly = !!gamepadState && !this.mobileInput.x && !this.mobileInput.y;
      const moveStrength = analogOnly ? Math.min(1, moveDir.length()) : 1;
      moveDir.normalize();
      this.player.vel.x = moveDir.x * this.player.speed * sprint * moveStrength;
      this.player.vel.z = moveDir.z * this.player.speed * sprint * moveStrength;

      this.characterGroup.rotation.y = Math.atan2(moveDir.x, moveDir.z);

      const walk = time * 14 * sprint;
      if (this.characterGroup.userData.leftLeg && this.characterGroup.userData.rightLeg) {
        this.characterGroup.userData.leftLeg.rotation.x = Math.sin(walk) * 0.65;
        this.characterGroup.userData.rightLeg.rotation.x = -Math.sin(walk) * 0.65;
        this.characterGroup.userData.leftArm.rotation.x = -Math.sin(walk) * 0.65;
        this.characterGroup.userData.rightArm.rotation.x = Math.sin(walk) * 0.65;
      }
    } else {
      this.player.vel.x *= 0.82;
      this.player.vel.z *= 0.82;
      if (this.characterGroup.userData.leftLeg) {
        this.characterGroup.userData.leftLeg.rotation.x *= 0.85;
        this.characterGroup.userData.rightLeg.rotation.x *= 0.85;
        this.characterGroup.userData.leftArm.rotation.x *= 0.85;
        this.characterGroup.userData.rightArm.rotation.x *= 0.85;
      }
    }

    // Smooth human locomotion (walk / run / jump / idle blend)
    if (TrashGame.Humans && !(TrashGame.Emotes && TrashGame.Emotes.activeEmote)) {
      TrashGame.Humans.animate(this.characterGroup, time, dt, isMoving, sprint, this.player.isGrounded);
    }
    if (TrashGame.Humans && !(TrashGame.Emotes && TrashGame.Emotes.activeEmote)) {
      TrashGame.Humans.updateShootPose(this.characterGroup, dt);
    }

    // Jump & Gravity Physics
    if (this.keys.Space && this.player.isGrounded) {
      this.player.vel.y = 8.5;
      this.player.isGrounded = false;
      if (!TrashGame.Sound.playAsset('gameplay/jump', 0.42)) TrashGame.Sound.playClick();
    }
    this.player.vel.y -= 22 * dt;
    const previousPosition = this.player.pos.clone();
    this.player.pos.addScaledVector(this.player.vel, dt);

    if (this.player.pos.y <= 0) {
      this.player.pos.y = 0;
      this.player.vel.y = 0;
      this.player.isGrounded = true;
    }

    // World Boundary Collision & Physics Restraint (No infinite map!)
    const hitBoundary = TrashGame.MapBuilder.clampPlayerPosition(this.player.pos);
    const dynamicColliders = this.getDynamicWorldColliders();
    const resolvedPosition = TrashGame.MapBuilder.resolvePlayerMovement(
      previousPosition,
      this.player.pos,
      0.42,
      dynamicColliders
    );
    if (resolvedPosition.x !== this.player.pos.x) this.player.vel.x = 0;
    if (resolvedPosition.z !== this.player.pos.z) this.player.vel.z = 0;
    this.player.pos.copy(resolvedPosition);
    if (hitBoundary) {
      this.player.vel.x = 0;
      this.player.vel.z = 0;
    }

    this.characterGroup.position.copy(this.player.pos);

    // 2. Companion Pet dynamic smooth follow
    if (this.petGroup) {
      const petTarget = this.player.pos.clone().add(new THREE.Vector3(0.9, 1.6 + Math.sin(time * 3) * 0.15, 0.4));
      this.petGroup.position.lerp(petTarget, 0.1);
      this.petGroup.rotation.y = this.characterGroup.rotation.y;
      if (this.petGroup.userData.ring1) {
        this.petGroup.userData.ring1.rotation.y = time * 2;
      }
    }

    // 3. Update Camera
    this.cameraController.update(this.player.pos, dt);

    // Update Dynamic Living World (Cars, Beachgoers, Animals, Seagulls)
    if (TrashGame.WorldLife) {
      TrashGame.WorldLife.update(dt, time);
      if (this.currentMapId === 'ciudad' || this.currentMapId === 'puerto') {
        TrashGame.WorldLife.handleVehicleCollisions(this.player.pos, this.player.vel, (damage, knockback) => {
          if (knockback) {
            this.player.vel.add(knockback);
            this.player.isGrounded = false;
          }
          this.playerTakeDamage(damage);
        });
      }
    }
    if (TrashGame.Monsters && (TrashGame.Monsters.active.length || TrashGame.Monsters.projectiles.length)) {
      TrashGame.Monsters.update(time, dt, this.player.pos, this.worldGroup, this.camera, (dmg) => this.playerTakeDamage(dmg));
    }
    if (TrashGame.Shop) TrashGame.Shop.updateProximity(this.player.pos, this.currentMapId);

    // 4. Update Modes
    if (this.currentMode === 'MULTIPLAYER' && TrashGame.OnlineRoom && TrashGame.OnlineRoom.gameMode === 'titan') {
      TrashGame.AdventureMode.update(this.player.pos, dt, this.worldGroup, this.camera, (dmg, knockback) => {
        if (knockback) { this.player.vel.add(knockback); this.player.isGrounded = false; }
        this.playerTakeDamage(dmg);
      });
    } else if (this.currentMode === 'STORY' || this.currentMode === 'MULTIPLAYER') {
      const cleaning = this.keys.MouseDown || this.mobileInput.clean;
      this.trashManager.update(this.player.pos, cleaning, dt, (bonus, combo, trash) => {
        if (TrashGame.OnlineRoom && TrashGame.OnlineRoom.isConnected && TrashGame.OnlineRoom.roomStarted) TrashGame.OnlineRoom.sendTrash({ ...trash, bonus });
        else TrashGame.StoryMode.onTrashCollected(bonus, combo);
      });
      TrashGame.StoryMode.updateRadar(this.player.pos, this.trashManager);

      if (this.currentMode === 'MULTIPLAYER') {
        TrashGame.MultiplayerMode.update(dt, this.trashManager, (bonus, combo, trash) => {
          if (TrashGame.OnlineRoom && TrashGame.OnlineRoom.isConnected && TrashGame.OnlineRoom.roomStarted) TrashGame.OnlineRoom.sendTrash({ ...trash, bonus });
          else TrashGame.StoryMode.onTrashCollected(bonus, combo, { bagPickup: false });
        });
      }
    } else if (this.currentMode === 'BOSS') {
      TrashGame.AdventureMode.update(this.player.pos, dt, this.worldGroup, this.camera, (dmg, knockback) => {
        if (knockback) {
          this.player.vel.add(knockback);
          this.player.isGrounded = false;
        }
        this.playerTakeDamage(dmg);
      });
    }
  },

  getDynamicWorldColliders() {
    const colliders = [];
    const addActor = (mesh, radius) => {
      if (!mesh || !mesh.position || mesh.position.y > 0.65) return;
      colliders.push({ type: 'circle', x: mesh.position.x, z: mesh.position.z, radius });
    };

    const life = TrashGame.WorldLife && TrashGame.WorldLife.entities;
    if (life) {
      life.forEach(entity => {
        const radiusByType = {
          walker: 0.36, pedestrian: 0.36, deer: 0.58,
          rabbit: 0.28, duck: 0.3, sunbather: 0.48
        };
        const radius = radiusByType[entity.type];
        if (radius) addActor(entity.mesh, radius);
      });
    }

    if (TrashGame.Monsters && TrashGame.Monsters.active) {
      TrashGame.Monsters.active.forEach(monster => addActor(monster.group, Math.max(0.72, (monster.hitRadius || 1) * 0.72)));
    }
    if (this.trashManager && this.trashManager.items) {
      const radiusByType = { bottle: 0.18, can: 0.17, tire: 0.48, barrel: 0.52 };
      this.trashManager.items.forEach(item => {
        if (!item || item.collected || !item.mesh) return;
        const radius = (radiusByType[item.type] || 0.24) * Math.max(0.22, item.mesh.scale.x || 1);
        colliders.push({ type: 'circle', x: item.mesh.position.x, z: item.mesh.position.z, radius });
      });
    }
    if (TrashGame.MultiplayerMode && TrashGame.MultiplayerMode.teammates) {
      TrashGame.MultiplayerMode.teammates.forEach(teammate => addActor(teammate.group, 0.42));
    }
    if (TrashGame.AdventureMode && TrashGame.AdventureMode.boss && TrashGame.AdventureMode.active) {
      addActor(TrashGame.AdventureMode.boss.group, 2.25);
    }
    return colliders;
  },

  playerTakeDamage(dmg) {
    if (this.player.isDead) return;
    this.player.hp = Math.max(0, this.player.hp - dmg);
    this.flashPlayerRed();
    this.updatePlayerHpBar();
    TrashGame.AdventureMode.spawnFloatingDamage(this.player.pos, `-${dmg} HP`, this.camera, '#ef4444');

    if (this.player.hp <= 0) {
      this.gameOver();
      return;
    }
    TrashGame.Sound.playAsset('gameplay/player_hurt', 0.42);
    TrashGame.Sound.playBossHit();
  },

  flashPlayerRed() {
    if (this.damageFlashTimer) window.clearTimeout(this.damageFlashTimer);
    this.damagedMaterials.forEach(({ mesh, original, flash }) => {
      if (mesh.material === flash) mesh.material = original;
      (Array.isArray(flash) ? flash : [flash]).forEach(material => material && material.dispose && material.dispose());
    });
    this.damagedMaterials = [];
    if (!this.characterGroup) return;

    this.characterGroup.traverse(mesh => {
      if (!mesh.isMesh || !mesh.material) return;
      const original = mesh.material;
      const makeFlash = material => {
        const flash = material.clone();
        if (flash.color) flash.color.lerp(new THREE.Color(0xff1825), 0.72);
        if (flash.emissive) {
          flash.emissive.lerp(new THREE.Color(0xff1010), 0.82);
          flash.emissiveIntensity = Math.max(flash.emissiveIntensity || 0, 0.75);
        }
        return flash;
      };
      const flash = Array.isArray(original) ? original.map(makeFlash) : makeFlash(original);
      mesh.material = flash;
      this.damagedMaterials.push({ mesh, original, flash });
    });

    this.damageFlashTimer = window.setTimeout(() => {
      this.damagedMaterials.forEach(({ mesh, original, flash }) => {
        if (mesh.material === flash) mesh.material = original;
        (Array.isArray(flash) ? flash : [flash]).forEach(material => material && material.dispose && material.dispose());
      });
      this.damagedMaterials = [];
      this.damageFlashTimer = null;
    }, 420);
  },

  updatePlayerHpBar() {
    const bar = document.getElementById('hud-hp-bar');
    if (bar) bar.style.width = `${(this.player.hp / this.player.maxHp) * 100}%`;
    const txt = document.getElementById('hud-hp-text');
    if (txt) txt.textContent = `${this.player.hp}/${this.player.maxHp}`;
  },

  gameOver() {
    if (this.player.isDead) return;
    this.player.isDead = true;
    this.player.vel.set(0, 0, 0);
    this.keys.MouseDown = false;
    Object.keys(this.keys).forEach(key => { this.keys[key] = false; });
    if (document.exitPointerLock) document.exitPointerLock();
    this.deathAudioFinished = false;
    TrashGame.Sound.playDeath().then(() => {
      this.deathAudioFinished = true;
      this.finishDeathSequence();
    });
    this.startDeathFall();
  },

  startDeathFall() {
    const height = 0.88;
    const pivot = new THREE.Group();
    pivot.name = 'player-death-fall-pivot';
    pivot.position.y = height;
    const children = this.characterGroup.children.slice();
    children.forEach(child => {
      this.characterGroup.remove(child);
      child.position.y -= height;
      pivot.add(child);
    });
    this.characterGroup.add(pivot);

    const rig = this.characterGroup.userData;
    if (rig.leftArm) rig.leftArm.rotation.x = -0.45;
    if (rig.rightArm) rig.rightArm.rotation.x = -0.9;
    if (rig.leftLeg) rig.leftLeg.rotation.x = 0.2;
    if (rig.rightLeg) rig.rightLeg.rotation.x = -0.15;
    this.deathFall = {
      pivot,
      elapsed: 0,
      duration: 1.15,
      height,
      direction: Math.random() < 0.5 ? -1 : 1
    };
  },

  updateDeathFall(dt) {
    if (!this.deathFall || this.deathFall.finished) return;
    const fall = this.deathFall;
    fall.elapsed = Math.min(fall.duration, fall.elapsed + dt);
    const t = fall.elapsed / fall.duration;
    const ease = 1 - Math.pow(1 - t, 3);
    const angle = ease * Math.PI * 0.5;
    fall.pivot.rotation.z = fall.direction * angle;
    fall.pivot.position.y = fall.height * Math.cos(angle) + 0.34 * Math.sin(angle);

    if (t >= 1) {
      fall.finished = true;
      this.finishDeathSequence();
    }
  },

  finishDeathSequence() {
    if (!this.deathFall || !this.deathFall.finished || !this.deathAudioFinished || this.deathFall.modalShown) return;
    this.deathFall.modalShown = true;
    const modal = document.getElementById('modal-gameover');
    if (modal) modal.classList.remove('hidden');
  },

  restoreDeathFall() {
    if (!this.deathFall) return;
    const { pivot, height } = this.deathFall;
    if (pivot.parent === this.characterGroup) {
      const children = pivot.children.slice();
      children.forEach(child => {
        pivot.remove(child);
        child.position.y += height;
        this.characterGroup.add(child);
      });
      this.characterGroup.remove(pivot);
    }
    const rig = this.characterGroup.userData;
    ['leftArm', 'rightArm', 'leftLeg', 'rightLeg'].forEach(key => {
      if (rig[key]) rig[key].rotation.set(0, 0, 0);
    });
    this.characterGroup.rotation.set(0, this.characterGroup.rotation.y, 0);
    this.deathFall = null;
    this.deathAudioFinished = false;
  },

  onResize() {
    const container = document.getElementById('three-container');
    if (!container || !this.renderer || !this.camera) return;
    const w = container.clientWidth || window.innerWidth;
    const h = container.clientHeight || window.innerHeight;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
    if (this.composer) {
      this.composer.setSize(w, h);
    }
    if (TrashGame.Graphics) TrashGame.Graphics.setSize(w, h);
  }
};

window.addEventListener('DOMContentLoaded', () => {
  TrashGame.State.load();
  TrashGame.Main.init();

  // Load Real 3D Photorealistic Models (GLTF/GLB)
  if (TrashGame.AssetLoader) {
    TrashGame.AssetLoader.loadAll(
      undefined,
      () => {
        console.log('✅ Photorealistic 3D GLTF models ready in memory!');
        if (TrashGame.Main.currentMode === 'LOBBY') {
          TrashGame.CharacterBuilder.build(
            TrashGame.Main.characterGroup,
            TrashGame.State.player.character,
            TrashGame.State.equipped
          );
        }
      }
    );
  }
});
