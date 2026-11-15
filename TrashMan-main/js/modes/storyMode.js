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
  completed: false,

  start(mapId, trashManager) {
    if (TrashGame.Shop) TrashGame.Shop.autoOpenedForFullBag = false;
    this.active = true;
    this.mapId = mapId;
    this.trashCollected = 0;
    this.coinsGained = 0;
    this.pendingTrash = 0;
    this.pendingValue = 0;
    this.waitingForDeposit = false;
    this.capacityToastShown = false;
    this.completed = false;

    const data = TrashGame.MapsData[mapId] || TrashGame.MapsData.playa;
    const difficulty = TrashGame.Difficulties[TrashGame.Main.difficulty] || TrashGame.Difficulties.medium;
    const configuredGoal = Math.max(1, Math.round(data.totalTrash * difficulty.trashMultiplier));
    const availableTrash = trashManager && Array.isArray(trashManager.items) ? trashManager.items.length : configuredGoal;
    this.totalTrash = Math.min(configuredGoal, availableTrash);
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

  onTrashCollected(coinsBonus, comboCount, options = {}) {
    if (!this.active || this.completed) return;
    this.trashCollected++;
    const addToLocalBag = options.bagPickup !== false && this.pendingTrash < this.pendingCapacity;
    if (addToLocalBag) {
      this.pendingTrash++;
      this.pendingValue += coinsBonus;
      this.capacityToastShown = false;
    }

    this.updateHUD();

    // Show Combo Banner
    if (addToLocalBag && comboCount >= 2) {
      TrashGame.UI.showComboBanner(`¡COMBO LIMPIEZA x${comboCount}!`);
    }

    // Check Level Victory
    if (this.trashCollected >= this.totalTrash) {
      // Sell the final backpack automatically, so finishing the last pickup always reaches victory.
      const finalSale = this.pendingValue;
      this.coinsGained += finalSale;
      this.pendingTrash = 0;
      this.pendingValue = 0;
      this.waitingForDeposit = false;
      if (finalSale > 0) TrashGame.State.addCoins(finalSale);
      this.updateHUD();
      this.victory();
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
    const needsDeposit = this.isAtCapacity() || this.waitingForDeposit;
    const closest = trashManager.getClosest(playerPos);
    const radarArrow = document.getElementById('radar-arrow-icon');
    const radarDist = document.getElementById('radar-distance-text');
    if (!radarArrow || !radarDist) return;

    if (needsDeposit) {
      const map = TrashGame.MapsData[this.mapId];
      const station = map && map.recyclingStation;
      if (station) {
        const dx = station.x - playerPos.x;
        const dz = station.z - playerPos.z;
        radarArrow.style.transform = `rotate(${Math.atan2(dx, dz) * (180 / Math.PI)}deg)`;
        radarDist.textContent = `TIENDA ${Math.round(Math.hypot(dx, dz))}m`;
        return;
      }
    }

    if (closest.item) {
      const angle = Math.atan2(closest.item.mesh.position.x - playerPos.x, closest.item.mesh.position.z - playerPos.z);
      radarArrow.style.transform = `rotate(${angle * (180 / Math.PI)}deg)`;
      radarDist.textContent = `${Math.round(closest.distance)}m`;
    } else {
      radarDist.textContent = 'Limpio';
    }
  },

  victory() {
    if (this.completed) return;
    this.completed = true;
    this.active = false;
    this.waitingForDeposit = false;
    const shopModal = document.getElementById('modal-recycling-shop');
    if (TrashGame.Shop && (TrashGame.Shop.opened || shopModal && !shopModal.classList.contains('hidden'))) TrashGame.Shop.close();
    if (TrashGame.MobileControls) TrashGame.MobileControls.releaseAll();
    if (TrashGame.Main) TrashGame.Main.isPaused = true;
    ['modal-pause', 'modal-gameover'].forEach(id => {
      const modal = document.getElementById(id);
      if (modal) modal.classList.add('hidden');
    });
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

    TrashGame.Main.showVictory();
  }
};
