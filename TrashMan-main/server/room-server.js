const { WebSocketServer } = require('ws');

const port = Number(process.env.PORT || 8080);
const wss = new WebSocketServer({ port, maxPayload: 16 * 1024 });
let room = null;

function send(socket, message) {
  if (socket.readyState === 1) socket.send(JSON.stringify(message));
}
function publicPlayer(player) {
  return { id: player.id, name: player.name, character: player.character, x: player.x, y: player.y, z: player.z, yaw: player.yaw, hp: player.hp };
}
function relay(except, message) {
  if (!room) return;
  room.players.forEach(player => { if (player.socket !== except) send(player.socket, message); });
}
function removePlayer(socket) {
  if (!room || !socket.playerId) return;
  const id = socket.playerId;
  room.players.delete(id);
  relay(socket, { type: 'player-left', id });
  if (id === room.hostId || room.players.size === 0) {
    room.players.forEach(player => player.socket.close(1000, 'La sala se cerró'));
    room = null;
  }
}

wss.on('connection', socket => {
  socket.on('message', raw => {
    let message;
    try { message = JSON.parse(raw.toString()); } catch (_) { return send(socket, { type: 'error', message: 'Mensaje de sala inválido.' }); }

    if (message.type === 'create') {
      const code = String(message.code || '').toUpperCase();
      if (!/^TM-\d{4}$/.test(code)) return send(socket, { type: 'error', message: 'Código de sala inválido.' });
      if (room) return send(socket, { type: 'error', message: 'Ya hay una sala global abierta. Únete con su código.' });
      const id = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
      room = { code, mapId: message.mapId || 'playa', hostId: id, session: null, players: new Map(), collected: new Set() };
      const player = { id, name: String(message.name || 'EcoGuardián').slice(0, 24), character: message.character === 'sasha' ? 'sasha' : 'abraham', x: 0, y: 0, z: 0, yaw: 0, hp: 100, socket };
      room.players.set(id, player);
      socket.playerId = id;
      socket.roomCode = code;
      send(socket, { type: 'created', id, code, players: [publicPlayer(player)] });
      return;
    }

    if (message.type === 'join') {
      const code = String(message.code || '').toUpperCase();
      if (!room || room.code !== code) return send(socket, { type: 'error', message: 'No existe una sala global con ese código.' });
      if (room.session) return send(socket, { type: 'error', message: 'La partida ya comenzó. Espera a que el anfitrión vuelva al lobby para unirte.' });
      if (room.players.size >= 16) return send(socket, { type: 'error', message: 'La sala está llena (16 jugadores).' });
      const id = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
      const player = { id, name: String(message.name || 'EcoGuardián').slice(0, 24), character: message.character === 'sasha' ? 'sasha' : 'abraham', x: 0, y: 0, z: 0, yaw: 0, hp: 100, socket };
      room.players.set(id, player);
      socket.playerId = id;
      socket.roomCode = code;
      send(socket, { type: 'joined', id, code, players: Array.from(room.players.values(), publicPlayer), session: room.session });
      relay(socket, { type: 'player-joined', player: publicPlayer(player) });
      return;
    }

    if (!room || socket.roomCode !== room.code || !room.players.has(socket.playerId)) return send(socket, { type: 'error', message: 'Primero debes unirte a la sala.' });
    const player = room.players.get(socket.playerId);

    if (message.type === 'profile') {
      player.name = String(message.name || player.name).slice(0, 24);
      player.character = message.character === 'sasha' ? 'sasha' : 'abraham';
      relay(socket, { type: 'player-state', player: publicPlayer(player) });
    } else if (message.type === 'start') {
      if (player.id !== room.hostId) return send(socket, { type: 'error', message: 'Solo el anfitrión puede iniciar la partida.' });
      const mapId = ['playa', 'bosque', 'rio', 'ciudad'].includes(message.session && message.session.mapId) ? message.session.mapId : 'playa';
      const difficulty = ['easy', 'medium', 'hard'].includes(message.session && message.session.difficulty) ? message.session.difficulty : 'medium';
      room.session = { mapId, difficulty, seed: Math.floor(Math.random() * 2147483646) + 1 };
      room.collected.clear();
      relay(null, { type: 'room-start', session: room.session });
    } else if (message.type === 'lobby') {
      if (player.id !== room.hostId) return send(socket, { type: 'error', message: 'Solo el anfitrión puede cerrar la partida.' });
      room.session = null;
      room.collected.clear();
      relay(socket, { type: 'room-lobby' });
    } else if (message.type === 'state') {
      player.x = Number.isFinite(message.x) ? Math.max(-50, Math.min(50, message.x)) : player.x;
      player.y = Number.isFinite(message.y) ? Math.max(0, Math.min(15, message.y)) : player.y;
      player.z = Number.isFinite(message.z) ? Math.max(-50, Math.min(50, message.z)) : player.z;
      player.yaw = Number.isFinite(message.yaw) ? message.yaw : player.yaw;
      player.hp = Number.isFinite(message.hp) ? Math.max(0, Math.min(100, message.hp)) : player.hp;
      relay(socket, { type: 'player-state', player: publicPlayer(player) });
    } else if (message.type === 'trash' && room.session) {
      const trash = message.trash || {};
      if (!Number.isFinite(trash.x) || !Number.isFinite(trash.z)) return;
      const cleanTrash = { x: Math.max(-50, Math.min(50, trash.x)), z: Math.max(-50, Math.min(50, trash.z)), kind: String(trash.kind || 'bottle').slice(0, 12), bonus: Math.max(0, Math.min(100, Number(trash.bonus) || 15)) };
      const key = `${Math.round(cleanTrash.x * 10)}:${Math.round(cleanTrash.z * 10)}:${cleanTrash.kind}`;
      if (room.collected.has(key)) return;
      room.collected.add(key);
      relay(null, { type: 'trash-collected', trash: cleanTrash });
    } else if (message.type === 'deposit' && room.session) {
      const deposit = message.deposit || {};
      relay(socket, { type: 'deposit', playerId: player.id, deposit: { count: Math.max(0, Math.min(1000, Number(deposit.count) || 0)), value: Math.max(0, Math.min(100000, Number(deposit.value) || 0)), finishMission: !!deposit.finishMission } });
    }
  });
  socket.on('close', () => removePlayer(socket));
});

console.log(`Trash Man room server ready on ws://0.0.0.0:${port}`);
