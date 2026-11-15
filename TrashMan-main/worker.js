const ROOM_MAPS = new Set(['playa', 'bosque', 'rio', 'ciudad', 'manglar', 'puerto']);
const DIFFICULTIES = new Set(['easy', 'medium', 'hard']);
const ROOM_KEY = 'global-room';

function send(socket, message) {
  try {
    if (socket.readyState === 1) socket.send(JSON.stringify(message));
  } catch (_) {
    // A socket may close while the room is broadcasting to its members.
  }
}

function publicPlayer(player) {
  return {
    id: player.id, name: player.name, character: player.character,
    x: player.x, y: player.y, z: player.z, yaw: player.yaw, hp: player.hp
  };
}

function boundedNumber(value, fallback, min, max) {
  return Number.isFinite(value) ? Math.max(min, Math.min(max, value)) : fallback;
}

export class GlobalRoom {
  constructor(ctx, env) {
    this.ctx = ctx;
    this.env = env;
    this.room = null;
    this.loaded = false;
  }

  async loadRoom() {
    if (!this.loaded) {
      this.room = await this.ctx.storage.get(ROOM_KEY) || null;
      this.loaded = true;
    }
    return this.room;
  }

  async saveRoom() {
    if (this.room) await this.ctx.storage.put(ROOM_KEY, this.room);
    else await this.ctx.storage.delete(ROOM_KEY);
  }

  async fetch(request) {
    if (request.headers.get('Upgrade')?.toLowerCase() !== 'websocket') {
      return new Response('WebSocket upgrade required', { status: 426 });
    }
    await this.loadRoom();
    const pair = new WebSocketPair();
    const client = pair[0];
    const server = pair[1];
    this.ctx.acceptWebSocket(server);
    server.serializeAttachment({ playerId: null });
    return new Response(null, { status: 101, webSocket: client });
  }

  webSocketMessage(socket, raw) {
    return this.handleMessage(socket, raw);
  }

  async handleMessage(socket, raw) {
    await this.loadRoom();
    const text = typeof raw === 'string' ? raw : new TextDecoder().decode(raw);
    if (text.length > 16 * 1024) {
      send(socket, { type: 'error', message: 'El mensaje de sala supera el límite permitido.' });
      return;
    }

    let message;
    try { message = JSON.parse(text); }
    catch (_) { send(socket, { type: 'error', message: 'Mensaje de sala inválido.' }); return; }

    const attachment = socket.deserializeAttachment() || { playerId: null };
    if (message.type === 'create') {
      const code = String(message.code || '').toUpperCase();
      if (!/^TM-\d{4}$/.test(code)) return send(socket, { type: 'error', message: 'Código de sala inválido.' });
      if (this.room) return send(socket, { type: 'error', message: 'Ya hay una sala global abierta. Únete con su código.' });

      const id = crypto.randomUUID();
      const player = this.makePlayer(id, message);
      this.room = { code, mapId: ROOM_MAPS.has(message.mapId) ? message.mapId : 'playa', hostId: id, session: null, players: { [id]: player }, collected: [] };
      attachment.playerId = id;
      socket.serializeAttachment(attachment);
      await this.saveRoom();
      send(socket, { type: 'created', id, code, players: [publicPlayer(player)] });
      return;
    }

    if (message.type === 'join') {
      const code = String(message.code || '').toUpperCase();
      if (!this.room || this.room.code !== code) return send(socket, { type: 'error', message: 'No existe una sala global con ese código.' });
      if (this.room.session) return send(socket, { type: 'error', message: 'La partida ya comenzó. Espera a que el anfitrión vuelva al lobby para unirte.' });
      if (Object.keys(this.room.players).length >= 16) return send(socket, { type: 'error', message: 'La sala está llena (16 jugadores).' });

      const id = crypto.randomUUID();
      const player = this.makePlayer(id, message);
      this.room.players[id] = player;
      attachment.playerId = id;
      socket.serializeAttachment(attachment);
      await this.saveRoom();
      send(socket, { type: 'joined', id, code, players: Object.values(this.room.players).map(publicPlayer), session: this.room.session });
      this.broadcast(socket, { type: 'player-joined', player: publicPlayer(player) });
      return;
    }

    if (!this.room || !attachment.playerId || !this.room.players[attachment.playerId]) {
      send(socket, { type: 'error', message: 'Primero debes unirte a la sala.' });
      return;
    }
    const player = this.room.players[attachment.playerId];

    if (message.type === 'profile') {
      player.name = String(message.name || player.name).slice(0, 24);
      player.character = message.character === 'sasha' ? 'sasha' : 'abraham';
      await this.saveRoom();
      this.broadcast(socket, { type: 'player-state', player: publicPlayer(player) });
    } else if (message.type === 'start') {
      if (player.id !== this.room.hostId) return send(socket, { type: 'error', message: 'Solo el anfitrión puede iniciar la partida.' });
      const session = message.session || {};
      this.room.session = {
        mapId: ROOM_MAPS.has(session.mapId) ? session.mapId : 'playa',
        difficulty: DIFFICULTIES.has(session.difficulty) ? session.difficulty : 'medium',
        seed: crypto.getRandomValues(new Uint32Array(1))[0] & 0x7fffffff
      };
      this.room.collected = [];
      await this.saveRoom();
      this.broadcast(null, { type: 'room-start', session: this.room.session });
    } else if (message.type === 'lobby') {
      if (player.id !== this.room.hostId) return send(socket, { type: 'error', message: 'Solo el anfitrión puede cerrar la partida.' });
      this.room.session = null;
      this.room.collected = [];
      await this.saveRoom();
      this.broadcast(socket, { type: 'room-lobby' });
    } else if (message.type === 'state') {
      player.x = boundedNumber(message.x, player.x, -50, 50);
      player.y = boundedNumber(message.y, player.y, 0, 15);
      player.z = boundedNumber(message.z, player.z, -50, 50);
      player.yaw = boundedNumber(message.yaw, player.yaw, -Math.PI * 4, Math.PI * 4);
      player.hp = boundedNumber(message.hp, player.hp, 0, 100);
      await this.saveRoom();
      this.broadcast(socket, { type: 'player-state', player: publicPlayer(player) });
    } else if (message.type === 'trash' && this.room.session) {
      const trash = message.trash || {};
      if (!Number.isFinite(trash.x) || !Number.isFinite(trash.z)) return;
      const cleanTrash = {
        x: boundedNumber(trash.x, 0, -50, 50),
        z: boundedNumber(trash.z, 0, -50, 50),
        kind: String(trash.kind || 'bottle').slice(0, 12),
        bonus: boundedNumber(Number(trash.bonus), 15, 0, 100)
      };
      const key = `${Math.round(cleanTrash.x * 10)}:${Math.round(cleanTrash.z * 10)}:${cleanTrash.kind}`;
      if (this.room.collected.includes(key)) return;
      this.room.collected.push(key);
      await this.saveRoom();
      this.broadcast(null, { type: 'trash-collected', playerId: player.id, trash: cleanTrash });
    } else if (message.type === 'deposit' && this.room.session) {
      const deposit = message.deposit || {};
      this.broadcast(socket, {
        type: 'deposit', playerId: player.id,
        deposit: {
          count: boundedNumber(Number(deposit.count), 0, 0, 1000),
          value: boundedNumber(Number(deposit.value), 0, 0, 100000),
          finishMission: !!deposit.finishMission
        }
      });
    }
  }

  makePlayer(id, message) {
    return {
      id,
      name: String(message.name || 'EcoGuardián').slice(0, 24),
      character: message.character === 'sasha' ? 'sasha' : 'abraham',
      x: 0, y: 0, z: 0, yaw: 0, hp: 100
    };
  }

  broadcast(except, message) {
    for (const socket of this.ctx.getWebSockets()) {
      if (socket !== except) send(socket, message);
    }
  }

  async webSocketClose(socket) {
    await this.removePlayer(socket);
  }

  async webSocketError(socket) {
    await this.removePlayer(socket);
  }

  async removePlayer(socket) {
    await this.loadRoom();
    const attachment = socket.deserializeAttachment() || {};
    const id = attachment.playerId;
    if (!this.room || !id || !this.room.players[id]) return;
    delete this.room.players[id];
    this.broadcast(socket, { type: 'player-left', id });
    if (id === this.room.hostId || Object.keys(this.room.players).length === 0) {
      const sockets = this.ctx.getWebSockets();
      this.room = null;
      await this.saveRoom();
      sockets.forEach(peer => {
        try { peer.close(1000, 'La sala se cerró'); } catch (_) { /* already disconnected */ }
      });
      return;
    }
    await this.saveRoom();
  }
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === '/api/room') {
      if (request.headers.get('Upgrade')?.toLowerCase() !== 'websocket') {
        return new Response('WebSocket upgrade required', { status: 426 });
      }
      const id = env.ROOM.idFromName('trashman-global-room');
      return env.ROOM.get(id).fetch(request);
    }
    return env.ASSETS.fetch(request);
  }
};
