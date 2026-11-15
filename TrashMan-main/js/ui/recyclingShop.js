/* Recycling station: turns collected waste into coins and permanent upgrades. */
window.TrashGame = window.TrashGame || {};

TrashGame.Shop = {
  opened: false,
  stationRadius: 5.2,
  lastDistanceLabel: '',

  getWeaponPrice(item) {
    const data = window.TM_TOOL_DATA && window.TM_TOOL_DATA.find(tool => tool.id === item.id);
    if (item.id === 'cannon_vacuum') return 1450;
    if (item.id === 'broom_laser') return 950;
    const tier = data ? Number(data.tier) || 1 : item.rarity === 'legendario' ? 3 : item.rarity === 'epico' ? 2 : 1;
    return tier === 3 ? 1050 : tier === 2 ? 650 : 350;
  },

  updateProximity(position, mapId) {
    const button = document.getElementById('recycling-shop-button');
    const label = document.getElementById('recycling-shop-distance');
    if (!button || !label) return;
    const mode = TrashGame.Main && TrashGame.Main.currentMode;
    const active = mode === 'STORY' || mode === 'MULTIPLAYER';
    button.classList.toggle('hidden', !active);
    if (!active) return;
    const station = TrashGame.MapsData[mapId] && TrashGame.MapsData[mapId].recyclingStation;
    if (!station) return;
    const distance = Math.hypot(position.x - station.x, position.z - station.z);
    const near = distance <= this.stationRadius;
    const text = near ? 'TIENDA ABIERTA' : `${Math.ceil(distance)} m`;
    if (this.lastDistanceLabel !== text) {
      label.textContent = text;
      this.lastDistanceLabel = text;
    }
    button.title = near ? 'Abrir tienda y depositar residuos' : `Acércate a la estación de reciclaje (${Math.ceil(distance)} m)`;
    button.classList.toggle('is-shop-near', near);
  },

  open() {
    const main = TrashGame.Main;
    if (!main || !['STORY', 'MULTIPLAYER'].includes(main.currentMode)) return;
    const station = TrashGame.MapsData[main.currentMapId] && TrashGame.MapsData[main.currentMapId].recyclingStation;
    const distance = station ? Math.hypot(main.player.pos.x - station.x, main.player.pos.z - station.z) : Infinity;
    if (distance > this.stationRadius) {
      TrashGame.UI.showToast(`La estación está a ${Math.ceil(distance)} m. Acércate al contenedor verde.`, 'info');
      return;
    }
    if (main.isPaused || main.player.isDead) return;
    this.opened = true;
    main.isPaused = true;
    if (TrashGame.MobileControls) TrashGame.MobileControls.releaseAll();
    TrashGame.UI.openModal('modal-recycling-shop');
    this.render();
  },

  render() {
    this.updateReadout();
    this.renderUpgrades();
    this.renderWeapons();
  },

  updateReadout() {
    const mode = TrashGame.StoryMode;
    const count = document.getElementById('shop-pending-count');
    const capacity = document.getElementById('shop-pending-capacity');
    const value = document.getElementById('shop-pending-value');
    const coins = document.getElementById('shop-coins');
    const deposit = document.getElementById('shop-deposit-button');
    if (count) count.textContent = mode ? mode.pendingTrash : 0;
    if (capacity) capacity.textContent = mode ? mode.pendingCapacity : 0;
    if (value) value.textContent = mode ? mode.pendingValue.toLocaleString() : 0;
    if (coins) coins.textContent = TrashGame.State.coins.toLocaleString();
    if (deposit) deposit.disabled = !mode || mode.pendingTrash <= 0;
  },

  renderUpgrades() {
    const grid = document.getElementById('shop-upgrade-grid');
    if (!grid) return;
    const upgrades = TrashGame.State.player.upgrades;
    const cards = [
      {
        id: 'vacuum', icon: '🌀', title: 'Bioaspirador de alcance',
        description: `Aumenta el radio de succión. Alcance actual: ${(6.2 + upgrades.vacuumLevel * 1.25).toFixed(1)} m.`,
        level: upgrades.vacuumLevel, max: 3, costs: [600, 1000, 1500]
      },
      {
        id: 'backpack', icon: '🎒', title: 'Mochila reforzada',
        description: `Carga más residuos antes de volver a la estación. Capacidad actual: ${TrashGame.StoryMode.pendingCapacity} piezas.`,
        level: upgrades.backpackLevel, max: 4, costs: [450, 700, 950, 1200]
      }
    ];
    grid.replaceChildren(...cards.map(card => {
      const wrapper = document.createElement('article');
      wrapper.className = 'shop-upgrade-card rounded-2xl border border-slate-700 bg-slate-900/75 p-3';
      const heading = document.createElement('div');
      heading.className = 'flex items-center gap-2 text-sm font-black text-white';
      heading.textContent = `${card.icon} ${card.title}`;
      const desc = document.createElement('p');
      desc.className = 'mt-1.5 text-[10px] leading-relaxed text-slate-400';
      desc.textContent = card.description;
      const footer = document.createElement('div');
      footer.className = 'mt-3 flex items-center justify-between gap-2';
      const level = document.createElement('span');
      level.className = 'text-[9px] font-bold uppercase tracking-wider text-emerald-300';
      level.textContent = card.level >= card.max ? 'NIVEL MÁXIMO' : `NIVEL ${card.level}/${card.max}`;
      const button = document.createElement('button');
      button.className = 'rounded-lg bg-amber-400 px-3 py-1.5 text-[10px] font-black text-slate-950 disabled:cursor-not-allowed disabled:opacity-40';
      const price = card.costs[card.level];
      button.textContent = price ? `MEJORAR · ${price} 🪙` : 'COMPLETO';
      button.disabled = !price || TrashGame.State.coins < price;
      button.addEventListener('click', () => this.buyUpgrade(card.id));
      footer.append(level, button);
      wrapper.append(heading, desc, footer);
      return wrapper;
    }));
  },

  renderWeapons() {
    const grid = document.getElementById('shop-weapons-grid');
    if (!grid) return;
    const items = (TrashGame.Items || []).filter(item => item.category === 'weapon');
    grid.replaceChildren(...items.map(item => {
      const owned = (TrashGame.State.player.unlockedWeapons || []).includes(item.id);
      const price = this.getWeaponPrice(item);
      const card = document.createElement('article');
      card.className = 'shop-weapon-card rounded-xl border border-slate-700 bg-slate-900/75 p-2.5 flex items-center gap-2';
      const icon = document.createElement('span');
      icon.className = 'text-xl';
      icon.textContent = item.icon || '🧰';
      const details = document.createElement('div');
      details.className = 'min-w-0 flex-1';
      const name = document.createElement('div');
      name.className = 'truncate text-[10px] font-black text-white';
      name.textContent = item.name;
      const tier = document.createElement('div');
      tier.className = 'text-[8px] uppercase tracking-wider text-slate-400';
      const data = window.TM_TOOL_DATA && window.TM_TOOL_DATA.find(tool => tool.id === item.id);
      tier.textContent = data ? `HERRAMIENTA · TIER ${data.tier}` : item.rarity;
      details.append(name, tier);
      const button = document.createElement('button');
      button.className = 'shrink-0 rounded-lg px-2 py-1.5 text-[8px] font-black uppercase disabled:cursor-not-allowed disabled:opacity-40';
      if (owned) {
        button.textContent = TrashGame.State.equipped.weapon === item.id ? 'EQUIPADA' : 'EQUIPAR';
        button.classList.add('bg-emerald-500/20', 'text-emerald-200', 'border', 'border-emerald-500/40');
        button.disabled = TrashGame.State.equipped.weapon === item.id;
        button.addEventListener('click', () => this.equipWeapon(item.id));
      } else {
        button.textContent = `${price} 🪙`;
        button.classList.add('bg-amber-400', 'text-slate-950');
        button.disabled = TrashGame.State.coins < price;
        button.addEventListener('click', () => this.buyWeapon(item.id));
      }
      card.append(icon, details, button);
      return card;
    }));
  },

  buyUpgrade(id) {
    const upgrades = TrashGame.State.player.upgrades;
    const table = id === 'vacuum' ? { key: 'vacuumLevel', costs: [600, 1000, 1500], max: 3 } : { key: 'backpackLevel', costs: [450, 700, 950, 1200], max: 4 };
    const level = upgrades[table.key] || 0;
    const price = table.costs[level];
    if (!price || level >= table.max || TrashGame.State.coins < price) return;
    TrashGame.State.addCoins(-price);
    upgrades[table.key] = level + 1;
    TrashGame.State.save();
    TrashGame.Sound.playAsset('gameplay/powerup', 0.55);
    if (TrashGame.StoryMode.active) TrashGame.StoryMode.pendingCapacity = TrashGame.Difficulties[TrashGame.Main.difficulty].bagCapacity + upgrades.backpackLevel * 12;
    TrashGame.UI.showToast(id === 'vacuum' ? 'Bioaspirador mejorado: mayor alcance.' : 'Mochila mejorada: más espacio para reciclar.', 'success');
    this.render();
  },

  buyWeapon(id) {
    const item = TrashGame.Items.find(entry => entry.id === id && entry.category === 'weapon');
    if (!item || (TrashGame.State.player.unlockedWeapons || []).includes(id)) return;
    const price = this.getWeaponPrice(item);
    if (TrashGame.State.coins < price) return;
    TrashGame.State.addCoins(-price);
    TrashGame.State.player.unlockedWeapons.push(id);
    this.equipWeapon(id);
    TrashGame.Sound.playAsset('ui/purchase', 0.58);
    TrashGame.State.save();
    TrashGame.UI.showToast(`${item.name} comprada y equipada.`, 'success');
  },

  equipWeapon(id) {
    if (!(TrashGame.State.player.unlockedWeapons || []).includes(id)) return;
    TrashGame.State.equipped.weapon = id;
    TrashGame.State.save();
    TrashGame.CharacterBuilder.build(TrashGame.Main.characterGroup, TrashGame.State.player.character, TrashGame.State.equipped);
    if (TrashGame.MobileControls) TrashGame.MobileControls.updateWeaponDisplay();
    this.renderWeapons();
    this.updateReadout();
    if (TrashGame.Sound) TrashGame.Sound.playEquip();
  },

  deposit() {
    const mode = TrashGame.StoryMode;
    if (!mode || mode.pendingTrash <= 0) return;
    const result = mode.recordDeposit();
    TrashGame.State.addCoins(result.value);
    if (TrashGame.OnlineRoom) TrashGame.OnlineRoom.sendDeposit(result);
    TrashGame.UI.showToast(`Reciclaste ${result.count} piezas y ganaste ${result.value} monedas.`, 'success');
    this.close();
    if (result.finishMission) mode.victory();
  },

  close() {
    const modal = document.getElementById('modal-recycling-shop');
    if (modal && !modal.classList.contains('hidden')) TrashGame.UI.closeModal('modal-recycling-shop');
    else this.onModalClosed();
  },

  onModalClosed() {
    this.opened = false;
    if (TrashGame.Main && TrashGame.Main.currentMode !== 'LOBBY') TrashGame.Main.isPaused = false;
  },

  reset() {
    if (this.opened) this.close();
    this.lastDistanceLabel = '';
    const button = document.getElementById('recycling-shop-button');
    if (button) button.classList.add('hidden');
  }
};
