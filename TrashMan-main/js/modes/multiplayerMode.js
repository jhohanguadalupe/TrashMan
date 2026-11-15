/* =========================================================================
   TRASH MAN 3D - MULTIPLAYER CO-OP MODE (SIMULATED ROOMS & AI TEAMMATES)
   ========================================================================= */

window.TrashGame = window.TrashGame || {};

TrashGame.MultiplayerMode = {
  active: false,
  teammates: [],
  remotePlayers: new Map(),
  remoteTargetState: new Map(),

  start(worldGroup) {
    this.active = true;
    this.teammates = [];
    this.remotePlayers.forEach(group => worldGroup.remove(group));
    this.remotePlayers.clear();
    this.remoteTargetState.clear();

    if (TrashGame.OnlineRoom && TrashGame.OnlineRoom.isConnected && TrashGame.OnlineRoom.roomStarted) {
      TrashGame.OnlineRoom.players.forEach(player => { if (player.id !== TrashGame.OnlineRoom.playerId) this.setRemotePlayer(player, worldGroup); });
      return;
    }

    const teammateConfigs = [
      { name: 'Sasha', char: 'sasha', x: -3.5, z: 2.5 },
      { name: 'Maya (Eco-Ranger)', char: 'sasha', x: 3.5, z: 2.5 },
      { name: 'Leo (Bio-Tech)', char: 'abraham', x: 0, z: -3.5 }
    ];

    teammateConfigs.forEach(cfg => {
      const group = new THREE.Group();
      group.position.set(cfg.x, 0, cfg.z);

      TrashGame.CharacterBuilder.build(group, cfg.char, {
        head: 'cap_green',
        torso: 'jacket_eco',
        legs: 'pants_camo',
        feet: 'boots_orange',
        weapon: 'claw_basic'
      });

      worldGroup.add(group);

      this.teammates.push({
        name: cfg.name,
        group,
        speed: 4.8,
        targetTrash: null,
        cleanTimer: 0
      });
    });

    this.showChatToast('¡Sasha, Maya y Leo se han conectado a la sala!');
  },

  update(dt, trashManager, onTrashCollected) {
    if (!this.active) return;

    this.teammates.forEach(tm => {
      if (!tm.targetTrash || tm.targetTrash.collected) {
        tm.targetTrash = trashManager.getClosest(tm.group.position).item;
      }

      const rig = tm.group.userData;
      if (rig && rig.gltfMixer && !(TrashGame.Emotes && TrashGame.Emotes.activeEmote)) {
        const moving = !!tm.targetTrash && tm.group.position.distanceTo(tm.targetTrash.mesh.position) > 1.3;
        const desired = moving ? (rig.gltfActions.walk || rig.gltfActions.run) : rig.gltfActions.idle;
        if (desired && desired !== rig.gltfCurrentAction) {
          if (rig.gltfCurrentAction) rig.gltfCurrentAction.fadeOut(0.2);
          desired.reset().fadeIn(0.2).play();
          rig.gltfCurrentAction = desired;
        }
        rig.gltfMixer.update(dt);
      }

      if (tm.targetTrash && !tm.targetTrash.collected) {
        const toTrash = tm.targetTrash.mesh.position.clone().sub(tm.group.position);
        toTrash.y = 0;
        const dist = toTrash.length();

        if (dist > 1.3) {
          toTrash.normalize();
          tm.group.position.addScaledVector(toTrash, tm.speed * dt);
          tm.group.rotation.y = Math.atan2(toTrash.x, toTrash.z);
        } else {
          // Clean it
          tm.cleanTimer += dt;
          if (tm.cleanTimer > 0.8) {
            tm.targetTrash.collected = true;
            trashManager.worldGroup.remove(tm.targetTrash.mesh);
            tm.cleanTimer = 0;
            tm.targetTrash = null;

            TrashGame.Sound.playVacuumPop();
            if (onTrashCollected) onTrashCollected(15, 1);

            if (Math.random() < 0.35) {
              const quotes = [
                '¡Residuo plástico asegurado!',
                '¡La playa va quedando impecable!',
                '¡Buen ritmo, equipo!',
                '¡Detecté más chatarra al norte!'
              ];
              this.showChatToast(`${tm.name}: "${quotes[Math.floor(Math.random() * quotes.length)]}"`);
            }
          }
        }
      }
    });
  },

  setRemotePlayer(player, worldGroup = TrashGame.Main && TrashGame.Main.worldGroup) {
    if (!player || !player.id) return;
    this.remoteTargetState.set(player.id, player);
    if (!this.active || !worldGroup || this.remotePlayers.has(player.id)) return;
    const group = new THREE.Group();
    group.name = `online-player-${player.id}`;
    TrashGame.CharacterBuilder.build(group, player.character === 'sasha' ? 'sasha' : 'abraham', {
      head: 'cap_green', torso: 'jacket_eco', legs: 'pants_camo', feet: 'boots_orange', weapon: 'claw_basic'
    });
    group.position.set(player.x || 0, player.y || 0, player.z || 0);
    worldGroup.add(group);
    this.remotePlayers.set(player.id, group);
  },

  removeRemotePlayer(id) {
    const group = this.remotePlayers.get(id);
    if (group && TrashGame.Main && TrashGame.Main.worldGroup) TrashGame.Main.worldGroup.remove(group);
    this.remotePlayers.delete(id);
    this.remoteTargetState.delete(id);
  },

  updateRemotePlayers(dt) {
    this.remoteTargetState.forEach((state, id) => {
      let group = this.remotePlayers.get(id);
      if (!group) { this.setRemotePlayer(state); group = this.remotePlayers.get(id); }
      if (!group) return;
      const alpha = 1 - Math.exp(-Math.min(dt, 0.1) * 14);
      group.position.x += ((state.x || 0) - group.position.x) * alpha;
      group.position.y += ((state.y || 0) - group.position.y) * alpha;
      group.position.z += ((state.z || 0) - group.position.z) * alpha;
      let delta = (state.yaw || 0) - group.rotation.y;
      delta = Math.atan2(Math.sin(delta), Math.cos(delta));
      group.rotation.y += delta * alpha;
    });
  },

  showChatToast(msg) {
    const feed = document.getElementById('hud-coop-feed');
    if (!feed) return;
    const pill = document.createElement('div');
    pill.className = "px-3 py-1.5 rounded-xl glass-panel text-[11px] font-bold text-cyan-300 border border-cyan-500/40 shadow-lg animate-fade-in";
    pill.innerHTML = `<span>💬</span> ${msg}`;
    feed.appendChild(pill);
    setTimeout(() => pill.remove(), 4000);
  },

  stop(worldGroup) {
    this.active = false;
    this.teammates.forEach(tm => worldGroup.remove(tm.group));
    this.teammates = [];
    this.remotePlayers.forEach(group => worldGroup.remove(group));
    this.remotePlayers.clear();
  }
};
