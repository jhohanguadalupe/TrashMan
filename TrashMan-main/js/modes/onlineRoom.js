/* One shared invite-only cleanup room. Signalling is provided by server/room-server.js. */
window.TrashGame = window.TrashGame || {};

TrashGame.OnlineRoom = {
  socket: null,
  roomCode: '',
  role: '',
  playerId: '',
  players: new Map(),
  collectedTrash: new Set(),
  isConnected: false,
  sendTimer: 0,
  roomStarted: false,
  createThenPrepare(mapId) {
    if (this.isConnected && this.role === 'host') {
      this.showStatus(`Sala ${this.roomCode} sigue abierta. Espera a tus compañeros y pulsa Iniciar cuando esté listo el equipo.`);
      return;
    }
    if (this.isConnected && this.role === 'guest') {
      this.showStatus('Ya estás en la sala; espera a que el anfitrión inicie.', true);
      return;
    }
    this.create(mapId).then(() => {
      this.showStatus(`Sala ${this.roomCode} lista. Comparte el enlace y espera al equipo antes de iniciar.`);
    }).catch(error => this.showStatus(error.message, true));
  },
  startRoom(mapId) {
    if (this.role !== 'host' || !this.isConnected) {
      this.showStatus('Primero crea la sala; solo su anfitrión puede iniciarla.', true);
      return;
    }
    TrashGame.Main.prepareSession('multiplayer', mapId);
  },
  endpoint() {
    const params = new URLSearchParams(location.search);
    const configured = params.get('ws');
    if (configured) return configured;
    const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
    if (/^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname) && location.port && location.port !== '8080') {
      return `${protocol}//${location.hostname}:8080`;
    }
    return `${protocol}//${location.host}`;
  },
  connect() {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) return Promise.resolve(this.socket);
    if (this._connectPromise) return this._connectPromise;
    this.showStatus('Conectando al servidor de salas…');
    this._connectPromise = new Promise((resolve, reject) => {
      let socket;
      try { socket = new WebSocket(this.endpoint()); }
      catch (error) { this._connectPromise = null; reject(error); return; }
      this.socket = socket;
      const timeout = setTimeout(() => {
        if (socket.readyState !== WebSocket.OPEN) {
          socket.close();
          this._connectPromise = null;
          reject(new Error('No se pudo conectar. Inicia el servidor de salas incluido en la carpeta server.'));
        }
      }, 4500);
      socket.addEventListener('open', () => { clearTimeout(timeout); this.isConnected = true; resolve(socket); }, { once: true });
      socket.addEventListener('message', event => this.handleMessage(event.data));
      socket.addEventListener('close', () => {
        this.isConnected = false;
        this._connectPromise = null;
        if (this.role) {
          this.showStatus('Se perdió la conexión con la sala.');
          if (TrashGame.Main && TrashGame.Main.currentMode === 'MULTIPLAYER' && !TrashGame.Main.isPaused) TrashGame.Main.togglePause();
        }
      });
      socket.addEventListener('error', () => {
        clearTimeout(timeout);
        this._connectPromise = null;
        reject(new Error('Servidor no disponible. Inicia server/room-server.js para abrir la sala online.'));
      }, { once: true });
    });
    return this._connectPromise;
  },
  async create(mapId) {
    const code = `TM-${Math.floor(1000 + Math.random() * 9000)}`;
    this.roomCode = code;
    this.role = 'host';
    await this.connect();
    this.socket.send(JSON.stringify({ type: 'create', code, mapId, name: TrashGame.State.player.name, character: TrashGame.State.player.character }));
    return new Promise((resolve, reject) => {
      this._pendingCreate = { resolve, reject };
      this._createTimeout = setTimeout(() => { if (this._pendingCreate) { this._pendingCreate = null; reject(new Error('No se pudo crear la sala. Comprueba el servidor.')); } }, 3000);
    });
  },
  async join(rawCode) {
    const code = (rawCode || '').trim().toUpperCase();
    if (!/^TM-\d{4}$/.test(code)) { this.showStatus('Escribe un código válido, por ejemplo TM-4821.', true); return; }
    this.roomCode = code;
    this.role = 'guest';
    try {
      await this.connect();
      this.socket.send(JSON.stringify({ type: 'join', code, name: TrashGame.State.player.name, character: TrashGame.State.player.character }));
    } catch (error) { this.role = ''; this.showStatus(error.message, true); }
  },
  handleMessage(raw) {
    let message;
    try { message = JSON.parse(raw); } catch (_) { return; }
    if (message.type === 'created') {
      clearTimeout(this._createTimeout);
      this.playerId = message.id;
      this.players = new Map((message.players || []).map(player => [player.id, player]));
      this.renderPlayers();
      this.showStatus(`Sala ${this.roomCode} creada · ${this.players.size}/16 jugadores`);
      if (this._pendingCreate) { this._pendingCreate.resolve(this.roomCode); this._pendingCreate = null; }
    } else if (message.type === 'joined') {
      this.playerId = message.id;
      this.roomCode = message.code;
      this.players = new Map((message.players || []).map(player => [player.id, player]));
      this.renderPlayers();
      this.showStatus(`Conectado a ${this.roomCode}. Esperando al anfitrión · ${this.players.size}/16 jugadores`);
      this.publishProfile();
      if (message.session) this.startFromHost(message.session);
    } else if (message.type === 'player-joined' || message.type === 'player-state') {
      const player = message.player;
      if (player && player.id !== this.playerId) {
        this.players.set(player.id, player);
        if (TrashGame.MultiplayerMode) TrashGame.MultiplayerMode.setRemotePlayer(player);
        this.renderPlayers();
      }
    } else if (message.type === 'player-left') {
      this.players.delete(message.id);
      if (TrashGame.MultiplayerMode) TrashGame.MultiplayerMode.removeRemotePlayer(message.id);
      this.renderPlayers();
    } else if (message.type === 'room-start') {
      if (this.role !== 'host') this.startFromHost(message.session);
    } else if (message.type === 'room-lobby') {
      if (TrashGame.Main && TrashGame.Main.currentMode !== 'LOBBY') TrashGame.Main.exitToLobby();
    } else if (message.type === 'trash-collected') {
      this.applyRemoteTrash(message.trash);
    } else if (message.type === 'deposit' && message.playerId !== this.playerId) {
      this.applyRemoteDeposit(message.deposit);
    } else if (message.type === 'error') {
      this.showStatus(message.message || 'No se pudo completar la operación de la sala.', true);
      if (this._pendingCreate) {
        clearTimeout(this._createTimeout);
        this._pendingCreate.reject(new Error(message.message));
        this._pendingCreate = null;
        this.role = '';
        this.roomCode = '';
      } else if (this.role === 'guest' && !this.roomStarted) {
        this.role = '';
        this.roomCode = '';
      }
    }
  },
  startAsHost(session) {
    if (this.role === 'guest') {
      this.showStatus('Solo el anfitrión puede iniciar o reiniciar esta partida.', true);
      return false;
    }
    if (!this.isConnected || this.role !== 'host') {
      this.showStatus('Modo de práctica: crea una sala online para invitar a otros jugadores.', true);
      return true;
    }
    this.roomStarted = true;
    this.collectedTrash.clear();
    this.socket.send(JSON.stringify({ type: 'start', session }));
    return true;
  },
  startFromHost(session) {
    if (!session || !TrashGame.Difficulties[session.difficulty]) return;
    this.roomStarted = true;
    this.collectedTrash.clear();
    TrashGame.Main.difficulty = session.difficulty;
    TrashGame.Main.startSession('multiplayer', session.mapId);
  },
  publishProfile() {
    if (!this.isConnected || !this.socket || this.socket.readyState !== WebSocket.OPEN) return;
    this.socket.send(JSON.stringify({ type: 'profile', name: TrashGame.State.player.name, character: TrashGame.State.player.character }));
  },
  update(dt) {
    if (TrashGame.MultiplayerMode) TrashGame.MultiplayerMode.updateRemotePlayers(dt);
    if (!this.isConnected || !this.socket || this.socket.readyState !== WebSocket.OPEN || !this.roomStarted || TrashGame.Main.currentMode !== 'MULTIPLAYER') return;
    this.sendTimer -= dt;
    if (this.sendTimer > 0) return;
    this.sendTimer = 0.055;
    const player = TrashGame.Main.player;
    this.socket.send(JSON.stringify({ type: 'state', x: player.pos.x, y: player.pos.y, z: player.pos.z, yaw: TrashGame.Main.characterGroup.rotation.y, hp: player.hp }));
  },
  sendTrash(trash) {
    if (!this.isConnected || !this.roomStarted || !this.socket || this.socket.readyState !== WebSocket.OPEN) return;
    this.socket.send(JSON.stringify({ type: 'trash', trash }));
  },
  sendDeposit(deposit) {
    if (!this.isConnected || !this.roomStarted || !this.socket || this.socket.readyState !== WebSocket.OPEN) return;
    this.socket.send(JSON.stringify({ type: 'deposit', deposit: { count: deposit.count, value: deposit.value, finishMission: deposit.finishMission } }));
  },
  returnToLobby() {
    if (this.role === 'host' && this.isConnected && this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.roomStarted = false;
      this.socket.send(JSON.stringify({ type: 'lobby' }));
    }
  },
  applyRemoteDeposit(deposit) {
    if (!deposit || !TrashGame.StoryMode.active) return;
    TrashGame.StoryMode.recordDeposit();
    TrashGame.State.addCoins(Math.max(0, Number(deposit.value) || 0));
    if (deposit.finishMission) TrashGame.StoryMode.victory();
  },
  applyRemoteTrash(trash) {
    if (!trash || !TrashGame.StoryMode.active || !TrashGame.Main.trashManager) return;
    const key = `${Math.round(trash.x * 10)}:${Math.round(trash.z * 10)}:${trash.kind}`;
    if (this.collectedTrash.has(key)) return;
    this.collectedTrash.add(key);
    const items = TrashGame.Main.trashManager.items;
    let closest = null, best = 2.2;
    items.forEach(item => {
      if (item.collected || item.type !== trash.kind) return;
      const d = Math.hypot(item.mesh.position.x - trash.x, item.mesh.position.z - trash.z);
      if (d < best) { best = d; closest = item; }
    });
    if (closest) {
      closest.collected = true;
      TrashGame.Main.trashManager.worldGroup.remove(closest.mesh);
    }
    TrashGame.StoryMode.onTrashCollected(trash.bonus || 15, 1);
  },
  inviteLink() {
    return `${location.href.split('#')[0]}#room=${encodeURIComponent(this.roomCode)}`;
  },
  async copyInvite() {
    if (!this.roomCode) return;
    try { await navigator.clipboard.writeText(this.inviteLink()); this.showStatus('Enlace de invitación copiado.'); }
    catch (_) { this.showStatus(`Comparte este enlace: ${this.inviteLink()}`); }
  },
  renderPlayers() {
    const list = document.getElementById('online-room-players');
    const count = document.getElementById('online-room-count');
    const code = document.getElementById('generated-room-code');
    if (count) count.textContent = `${this.players.size}/16 conectados`;
    if (code && this.roomCode) code.textContent = this.roomCode;
    if (list) list.textContent = this.players.size ? Array.from(this.players.values()).map(player => `${player.id === this.playerId ? 'Tú' : player.name || 'Jugador'}${player.id === this.playerId && this.role === 'host' ? ' · anfitrión' : ''}`).join(' · ') : 'Crea una sala para invitar al equipo.';
  },
  showStatus(message, error = false) {
    const node = document.getElementById('online-room-status');
    if (node) { node.textContent = message; node.classList.toggle('text-rose-300', error); node.classList.toggle('text-emerald-300', !error); }
    if (error && TrashGame.UI) TrashGame.UI.showToast(message, 'error');
  },
  close() {
    if (this.socket) this.socket.close();
    this.socket = null;
    this.role = '';
    this.roomCode = '';
    this.roomStarted = false;
    this.players.clear();
  },
  init() {
    const code = new URLSearchParams(location.hash.replace(/^#/, '')).get('room');
    if (code) {
      const input = document.getElementById('input-join-code');
      if (input) input.value = code;
      const modal = document.getElementById('modal-multijugador');
      if (modal) modal.classList.remove('hidden');
    }
  }
};

window.addEventListener('DOMContentLoaded', () => TrashGame.OnlineRoom.init());
