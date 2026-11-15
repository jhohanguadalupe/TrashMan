/* =========================================================================
   TRASH MAN 3D - STORY MODE ENGINE (CLEANING 3D)
   ========================================================================= */

window.TrashGame = window.TrashGame || {};

TrashGame.StoryMode = {
  active: false,
  mapId: 'playa',
  trashCollected: 0,
  totalTrash: 25,
  coinsGained: 0,
  pendingTrash: 0,
  pendingValue: 0,
  pendingCapacity: 16,
  waitingForDeposit: false,
  capacityToastShown: false,

  start(mapId, trashManager) {
    this.active = true;
    this.mapId = mapId;
    this.trashCollected = 0;
    this.coinsGained = 0;
    this.pendingTrash = 0;
    this.pendingValue = 0;
    this.waitingForDeposit = false;
    this.capacityToastShown = false;

    const data = TrashGame.MapsData[mapId] || TrashGame.MapsData.playa;
    const difficulty = TrashGame.Difficulties[TrashGame.Main.difficulty] || TrashGame.Difficulties.medium;
    this.totalTrash = Math.max(1, Math.round(data.totalTrash * difficulty.trashMultiplier));
    const upgrades = TrashGame.State.player.upgrades || {};
    this.pendingCapacity = difficulty.bagCapacity + (upgrades.backpackLevel || 0) * 12;

    // Setup HUD for story mode
    document.getElementById('hud-objective-panel').classList.remove('hidden');
    document.getElementById('hud-trash-progress-container').classList.remove('hidden');
    document.getElementById('hud-boss-hp-container').classList.add('hidden');
    document.getElementById('hud-badge-mode').textContent = `${TrashGame.Main.currentMode === 'MULTIPLAYER' ? 'Cooperativo' : 'Limpieza'} · ${difficulty.name}`;
    document.getElementById('hud-tool-hint').textContent = 'Limpiar basura (Click izq. / E)';
    document.getElementById('hud-map-icon').textContent = data.icon;
    document.getElementById('hud-map-title').textContent = data.title;

    this.updateHUD();
  },

  onTrashCollected(coinsBonus, comboCount) {
    if (this.pendingTrash >= this.pendingCapacity || this.waitingForDeposit) return;
    this.trashCollected++;
    this.pendingTrash++;
    this.pendingValue += coinsBonus;
    this.capacityToastShown = false;

    this.updateHUD();

    // Show Combo Banner
    if (comboCount >= 2) {
      TrashGame.UI.showComboBanner(`¡COMBO LIMPIEZA x${comboCount}!`);
    }

    // Check Level Victory
    if (this.trashCollected >= this.totalTrash) {
      this.waitingForDeposit = this.pendingTrash > 0;
      if (this.waitingForDeposit) {
        TrashGame.UI.showToast('Objetivo completo. Lleva la basura a la estación de reciclaje para cobrar.', 'success');
      } else this.victory();
    }
  },

  isAtCapacity() { return this.pendingTrash >= this.pendingCapacity; },

  notifyFullBag() {
    if (this.capacityToastShown) return;
    this.capacityToastShown = true;
    TrashGame.UI.showToast('Mochila llena. Regresa a la estación para reciclar y seguir recogiendo.', 'info');
  },

  recordDeposit() {
    const deposit = { count: this.pendingTrash, value: this.pendingValue, finishMission: this.waitingForDeposit };
    this.coinsGained += deposit.value;
    this.pendingTrash = 0;
    this.pendingValue = 0;
    this.waitingForDeposit = false;
    this.capacityToastShown = false;
    this.updateHUD();
    return deposit;
  },

  updateHUD() {
    const pct = Math.min(100, Math.round((this.trashCollected / this.totalTrash) * 100));
    const bar = document.getElementById('hud-trash-bar');
    if (bar) bar.style.width = `${pct}%`;

    const txt = document.getElementById('hud-trash-counter');
    if (txt) txt.textContent = `${this.trashCollected} / ${this.totalTrash} Limpio (${pct}%)`;

    const coinsTxt = document.getElementById('hud-coins-gained');
    if (coinsTxt) coinsTxt.textContent = `+${this.coinsGained}`;

    const carry = document.getElementById('hud-carry-status');
    if (carry) {
      carry.classList.toggle('hidden', !this.active);
      carry.textContent = `🎒 Mochila: ${this.pendingTrash}/${this.pendingCapacity} · Deposita en la estación ♻️`;
      if (this.pendingTrash >= this.pendingCapacity) carry.classList.add('text-rose-300');
      else carry.classList.remove('text-rose-300');
    }

    if (TrashGame.Shop) TrashGame.Shop.updateReadout();
  },

  updateRadar(playerPos, trashManager) {
    const closest = trashManager.getClosest(playerPos);
    const radarArrow = document.getElementById('radar-arrow-icon');
    const radarDist = document.getElementById('radar-distance-text');
    if (!radarArrow || !radarDist) return;

    if (closest.item) {
      const angle = Math.atan2(closest.item.mesh.position.x - playerPos.x, closest.item.mesh.position.z - playerPos.z);
      radarArrow.style.transform = `rotate(${angle * (180 / Math.PI)}deg)`;
      radarDist.textContent = `${Math.round(closest.distance)}m`;
    } else {
      radarDist.textContent = 'Limpio';
    }
  },

  victory() {
    this.active = false;
    TrashGame.Sound.stopLoopAudio('music');
    TrashGame.Sound.playFanfare();
    TrashGame.Sound.playAsset('musica/musica_victoria', 0.35);
    if (typeof confetti === 'function') confetti({ particleCount: 120, spread: 80 });

    const data = TrashGame.MapsData[this.mapId] || TrashGame.MapsData.playa;
    TrashGame.State.addCoins(data.rewardCoins);
    TrashGame.State.addXp(data.rewardXp);

    document.getElementById('victory-title').textContent = '¡Ecosistema Purificado!';
    document.getElementById('victory-subtitle').textContent = `Has limpiado el 100% de ${data.title}.`;
    document.getElementById('victory-coins').textContent = `+${this.coinsGained + data.rewardCoins} 🪙`;
    document.getElementById('victory-xp').textContent = `+${data.rewardXp} XP`;

    document.getElementById('modal-victory').classList.remove('hidden');
  }
};
