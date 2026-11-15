/* =========================================================================
   TRASH MAN 3D - PERSISTENT GAME STATE & STORE
   ========================================================================= */

window.TrashGame = window.TrashGame || {};

TrashGame.Difficulties = {
  easy: {
    id: 'easy', name: 'Fácil', trashMultiplier: 0.68, monsterCount: 1,
    monsterHpMultiplier: 0.78, monsterDamageMultiplier: 0.7, bossHpMultiplier: 0.72,
    bossDamageMultiplier: 0.72, bagCapacity: 24, description: 'Menos residuos, enemigos ligeros y un Titán con menos vida.'
  },
  medium: {
    id: 'medium', name: 'Medio', trashMultiplier: 1, monsterCount: 2,
    monsterHpMultiplier: 1, monsterDamageMultiplier: 1, bossHpMultiplier: 1,
    bossDamageMultiplier: 1, bagCapacity: 16, description: 'La experiencia equilibrada de Trash Man.'
  },
  hard: {
    id: 'hard', name: 'Difícil', trashMultiplier: 1.5, monsterCount: 4,
    monsterHpMultiplier: 1.35, monsterDamageMultiplier: 1.35, bossHpMultiplier: 1.75,
    bossDamageMultiplier: 1.4, bagCapacity: 10, description: 'Más basura, más enemigos y combates mucho más duros.'
  }
};

TrashGame.State = {
  coins: 1500,
  player: {
    name: 'EcoGuardián',
    level: 12,
    xp: 2450,
    maxXp: 3000,
    title: 'Recolector Profesional',
    character: 'abraham', // 'abraham' or 'sasha'
    storyRank: 'Guardián de Plata II',
    storyRankPts: 1850,
    adventureRank: 'Exterminador III',
    titansDefeated: 14,
    stats: {
      matchesPlayed: 48,
      matchesWon: 39,
      trashRecycledKg: 12450
    },
    unlockedWeapons: ['claw_basic'],
    upgrades: { vacuumLevel: 0, backpackLevel: 0 }
  },
  equipped: {
    head: 'cap_green',
    torso: 'jacket_eco',
    legs: 'pants_camo',
    feet: 'boots_orange',
    weapon: 'claw_basic',
    pet: 'ecobot',
  },

  addCoins(amount) {
    this.coins += amount;
    const el = document.getElementById('coin-counter');
    if (el) {
      el.textContent = this.coins.toLocaleString();
      el.classList.add('scale-125', 'text-yellow-200');
      setTimeout(() => el.classList.remove('scale-125', 'text-yellow-200'), 300);
    }
    if (amount > 0 && TrashGame.Sound) {
      TrashGame.Sound.playCoin();
    }
    this.save();
  },

  addXp(amount) {
    this.player.xp += amount;
    if (this.player.xp >= this.player.maxXp) {
      this.player.xp -= this.player.maxXp;
      this.player.level++;
      this.player.maxXp = Math.floor(this.player.maxXp * 1.25);
      if (TrashGame.Sound) TrashGame.Sound.playFanfare();
      if (TrashGame.UI) TrashGame.UI.showToast(`¡Subiste a Nivel ${this.player.level}!`, 'success');
    }
    this.updateHUD();
    this.save();
  },

  equipItem(category, itemId) {
    this.equipped[category] = itemId;
    this.save();
  },

  equipPet(petId) {
    this.equipped.pet = petId;
    this.save();
  },

  selectCharacter(charKey) {
    this.player.character = charKey;
    this.save();
  },

  changeTitle(newTitle) {
    this.player.title = newTitle;
    const el = document.getElementById('top-player-title');
    if (el) el.textContent = newTitle;
    this.save();
  },

  updateHUD() {
    const lvlEl = document.getElementById('top-level-display');
    if (lvlEl) lvlEl.textContent = this.player.level;

    const nameEl = document.getElementById('top-player-name');
    if (nameEl) nameEl.textContent = this.player.name;

    const titleEl = document.getElementById('top-player-title');
    if (titleEl) titleEl.textContent = this.player.title;

    const xpBar = document.getElementById('top-xp-bar');
    if (xpBar) {
      const pct = Math.min(100, (this.player.xp / this.player.maxXp) * 100);
      xpBar.style.width = `${pct}%`;
    }

    const coinEl = document.getElementById('coin-counter');
    if (coinEl) coinEl.textContent = this.coins.toLocaleString();
  },

  save() {
    try {
      localStorage.setItem('trashman_save_v2', JSON.stringify({
        coins: this.coins,
        player: this.player,
        equipped: this.equipped
      }));
    } catch (e) {
      // Local storage may be restricted in sandboxes
    }
  },

  load() {
    try {
      const data = localStorage.getItem('trashman_save_v2');
      if (data) {
        const parsed = JSON.parse(data);
        if (parsed.coins !== undefined) this.coins = parsed.coins;
        if (parsed.player) Object.assign(this.player, parsed.player);
        if (parsed.equipped) Object.assign(this.equipped, parsed.equipped);
      }
    } catch (e) {}
    if (!Array.isArray(this.player.unlockedWeapons)) this.player.unlockedWeapons = [this.equipped.weapon || 'claw_basic'];
    if (this.equipped.weapon && !this.player.unlockedWeapons.includes(this.equipped.weapon)) this.player.unlockedWeapons.push(this.equipped.weapon);
    this.player.upgrades = Object.assign({ vacuumLevel: 0, backpackLevel: 0 }, this.player.upgrades || {});
    this.updateHUD();
  }
};
