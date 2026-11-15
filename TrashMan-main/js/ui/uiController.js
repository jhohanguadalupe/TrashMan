/* =========================================================================
   TRASH MAN 3D - UI & MODALS CONTROLLER
   ========================================================================= */

window.TrashGame = window.TrashGame || {};

TrashGame.UI = {
  currentCategory: 'head',
  _tempEquipped: null,
  _originalEquipped: null,

  init() {
    // Backdrop click listeners
    document.querySelectorAll('.modal-backdrop').forEach(modal => {
      modal.addEventListener('click', (e) => {
        if (e.target === modal) this.closeModal(modal.id);
      });
    });

    // Escape listener
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        if (TrashGame.Shop && TrashGame.Shop.opened) {
          this.closeModal('modal-recycling-shop');
          return;
        }
        if (TrashGame.MobileControls && TrashGame.MobileControls.inventoryPaused) {
          this.closeModal('modal-inventario');
          return;
        }
        if (TrashGame.Main && TrashGame.Main.currentMode !== 'LOBBY') {
          TrashGame.Main.togglePause();
        } else {
          document.querySelectorAll('.modal-backdrop:not(.hidden)').forEach(modal => {
            this.closeModal(modal.id);
          });
        }
      }
    });

    TrashGame.State.updateHUD();
  },

  openModal(modalId) {
    TrashGame.Sound.playClick();
    const modal = document.getElementById(modalId);
    if (modal) {
      modal.classList.remove('hidden');
      if (modalId === 'modal-inventario') {
        this._tempEquipped = { ...TrashGame.State.equipped };
        this._originalEquipped = { ...TrashGame.State.equipped };
        this.renderInventory(this.currentCategory || 'head');
        this.updateInventorySummary();
        setTimeout(() => {
          if (TrashGame.InventoryPreview) {
            TrashGame.InventoryPreview.open(this._tempEquipped);
          }
        }, 90);
      }
      else if (modalId === 'modal-mascota') {
        this._selectedPetId = TrashGame.State.equipped.pet || 'ecobot';
        this.renderPetsList();
        this.updatePetDetails(this._selectedPetId);
        setTimeout(() => {
          if (TrashGame.PetPreview) {
            TrashGame.PetPreview.open(this._selectedPetId);
          }
        }, 90);
      }
      else if (modalId === 'modal-ruleta') TrashGame.Roulette.draw();
    }
  },

  closeModal(modalId) {
    TrashGame.Sound.playClick();
    const modal = document.getElementById(modalId);
    if (modal) {
      modal.classList.add('hidden');
      if (modalId === 'modal-inventario') {
        if (TrashGame.InventoryPreview) {
          TrashGame.InventoryPreview.stopLoop();
        }
        // Restaurar modelo del lobby con el equipamiento guardado
        if (TrashGame.Main && TrashGame.CharacterBuilder) {
          TrashGame.CharacterBuilder.build(
            TrashGame.Main.characterGroup,
            TrashGame.State.player.character,
            TrashGame.State.equipped
          );
        }
        if (TrashGame.MobileControls) TrashGame.MobileControls.onInventoryClosed();
      }
      else if (modalId === 'modal-mascota') {
        if (TrashGame.PetPreview) {
          TrashGame.PetPreview.stopLoop();
        }
      }
      else if (modalId === 'modal-recycling-shop') {
        if (TrashGame.Shop) TrashGame.Shop.onModalClosed();
      }
      else if (modalId === 'modal-difficulty') {
        if (TrashGame.Main) TrashGame.Main.pendingSession = null;
      }
    }
  },

  filterInventory(cat) {
    TrashGame.Sound.playClick();
    this.currentCategory = cat;
    const clickedTab = typeof event !== 'undefined' && event && event.currentTarget && event.currentTarget.classList.contains('inv-tab')
      ? event.currentTarget
      : Array.from(document.querySelectorAll('.inv-tab')).find(tab => tab.getAttribute('onclick')?.includes(`'${cat}'`));
    document.querySelectorAll('.inv-tab').forEach(t => {
      t.classList.remove('active', 'bg-emerald-500', 'text-slate-950', 'border-emerald-400');
      t.classList.add('bg-slate-800/80', 'text-slate-300', 'border-transparent');
    });
    if (clickedTab) {
      clickedTab.classList.remove('bg-slate-800/80', 'text-slate-300', 'border-transparent');
      clickedTab.classList.add('active', 'bg-emerald-500', 'text-slate-950', 'border-emerald-400');
    }
    this.renderInventory(cat);
  },

  renderInventory(cat) {
    const container = document.getElementById('inventory-items-grid');
    if (!container) return;
    container.innerHTML = '';

    const equippedMap = this._tempEquipped || TrashGame.State.equipped;
    const items = TrashGame.Items.filter(i => i.category === cat && (
      cat !== 'weapon' || (TrashGame.State.player.unlockedWeapons || []).includes(i.id)
    ));

    items.forEach(item => {
      const isEquipped = equippedMap[cat] === item.id;
      const rarityClasses = {
        comun: 'border-slate-700 hover:border-slate-500',
        raro: 'border-cyan-500/50 hover:border-cyan-400 shadow-cyan-500/10',
        epico: 'border-purple-500/50 hover:border-purple-400 shadow-purple-500/10',
        legendario: 'border-amber-400 hover:border-amber-300 shadow-amber-500/20'
      }[item.rarity] || 'border-slate-700';

      const card = document.createElement('div');
      card.className = `p-3 rounded-2xl bg-slate-900/90 border-2 ${rarityClasses} ${
        isEquipped ? 'ring-2 ring-emerald-400 shadow-lg shadow-emerald-500/20' : ''
      } transition-all flex flex-col justify-between cursor-pointer group hover:scale-[1.02]`;

      card.onclick = () => this.previewItem(item.category, item.id);

      card.innerHTML = `
        <div>
          <div class="flex items-center justify-between mb-1.5">
            <span class="text-[8px] uppercase font-black tracking-widest px-1.5 py-0.5 rounded font-hud ${
              item.rarity === 'legendario' ? 'bg-amber-500/25 text-amber-300 border border-amber-500/40' :
              item.rarity === 'epico' ? 'bg-purple-500/25 text-purple-300 border border-purple-500/40' :
              item.rarity === 'raro' ? 'bg-cyan-500/25 text-cyan-300 border border-cyan-500/40' : 'bg-slate-800 text-slate-400 border border-slate-700'
            }">${item.rarity}</span>
            ${isEquipped ? '<span class="text-[9px] font-black text-emerald-300 bg-emerald-950/90 px-2 py-0.5 rounded-full border border-emerald-400/50 flex items-center gap-1 font-hud"><span>✓</span> EQUIPADO</span>' : ''}
          </div>
          <div class="w-full h-16 rounded-xl bg-slate-950/80 flex items-center justify-center text-3xl mb-2 group-hover:scale-110 transition-transform">${item.icon}</div>
          <h4 class="font-hud text-xs md:text-sm font-black text-white leading-tight tracking-wide">${item.name}</h4>
          <p class="text-[10px] text-slate-400 mt-0.5 line-clamp-2">${item.desc}</p>
        </div>
        <button onclick="event.stopPropagation(); TrashGame.UI.previewItem('${item.category}', '${item.id}')" class="mt-2.5 w-full py-1.5 rounded-xl text-xs font-hud font-black tracking-wider transition-all ${
          isEquipped ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/50 cursor-default' : 'bg-slate-800 hover:bg-emerald-500 hover:text-slate-950 text-slate-200 border border-slate-700'
        }">
          ${isEquipped ? 'EN USO' : 'PROBAR / EQUIPAR'}
        </button>
      `;
      container.appendChild(card);
    });
  },

  previewItem(cat, id) {
    if (cat === 'weapon' && !(TrashGame.State.player.unlockedWeapons || []).includes(id)) {
      this.showToast('Compra esta herramienta en la tienda de reciclaje.', 'info');
      return;
    }
    if (!this._tempEquipped) {
      this._tempEquipped = { ...TrashGame.State.equipped };
    }
    this._tempEquipped[cat] = id;
    TrashGame.Sound.playEquip();

    this.renderInventory(cat);
    this.updateInventorySummary();

    if (TrashGame.InventoryPreview) {
      TrashGame.InventoryPreview.updateModel(this._tempEquipped);
    }
  },

  equipItem(cat, id) {
    this.previewItem(cat, id);
  },

  saveInventoryChanges() {
    if (!this._tempEquipped) return;
    TrashGame.State.equipped = { ...this._tempEquipped };
    TrashGame.State.save();
    this._originalEquipped = { ...this._tempEquipped };

    if (TrashGame.Main && TrashGame.CharacterBuilder) {
      TrashGame.CharacterBuilder.build(
        TrashGame.Main.characterGroup,
        TrashGame.State.player.character,
        TrashGame.State.equipped
      );
    }

    TrashGame.Sound.playFanfare();
    if (typeof confetti === 'function') {
      confetti({
        particleCount: 65,
        spread: 70,
        origin: { y: 0.6 }
      });
    }

    this.showToast('¡Equipamiento guardado y aplicado con éxito a tu héroe!', 'success');
    this.renderInventory(this.currentCategory);
    this.updateInventorySummary();
  },

  undoInventoryChanges() {
    if (!this._originalEquipped) return;
    this._tempEquipped = { ...this._originalEquipped };
    TrashGame.Sound.playClick();

    if (TrashGame.InventoryPreview) {
      TrashGame.InventoryPreview.updateModel(this._tempEquipped);
    }

    this.renderInventory(this.currentCategory);
    this.updateInventorySummary();
    this.showToast('Cambios revertidos al equipamiento anterior.', 'info');
  },

  updateInventorySummary() {
    const el = document.getElementById('inventory-equipped-summary');
    if (!el) return;

    const eq = this._tempEquipped || TrashGame.State.equipped;
    const parts = [];

    ['head', 'torso', 'legs', 'feet', 'weapon'].forEach(c => {
      const it = TrashGame.Items.find(i => i.id === eq[c]);
      if (it) {
        parts.push(`<span class="inline-flex items-center gap-1 bg-slate-900 px-2 py-0.5 rounded-lg border border-slate-700/60 text-slate-300">${it.icon} <b class="text-white">${it.name}</b></span>`);
      }
    });

    el.innerHTML = parts.join(' ');

    // Highlight Save Button if there are unsaved changes
    const btnSave = document.getElementById('btn-save-inventory');
    if (btnSave && this._originalEquipped) {
      const hasChanges = ['head', 'torso', 'legs', 'feet', 'weapon'].some(
        c => this._tempEquipped[c] !== this._originalEquipped[c]
      );
      if (hasChanges) {
        btnSave.classList.add('animate-pulse', 'ring-2', 'ring-amber-400');
      } else {
        btnSave.classList.remove('animate-pulse', 'ring-2', 'ring-amber-400');
      }
    }
  },

  _selectedPetId: 'ecobot',

  renderPetsList() {
    const container = document.getElementById('pets-list-container');
    if (!container) return;
    container.innerHTML = '';

    const activePetId = TrashGame.State.equipped.pet || 'ecobot';
    const previewPetId = this._selectedPetId || activePetId;

    TrashGame.Pets.forEach(p => {
      const isEquipped = activePetId === p.id;
      const isPreviewed = previewPetId === p.id;

      const rarityBadge = {
        comun: 'bg-slate-800 text-slate-300 border-slate-700',
        raro: 'bg-cyan-950/90 text-cyan-300 border-cyan-500/40',
        epico: 'bg-purple-950/90 text-purple-300 border-purple-500/40',
        legendario: 'bg-amber-950/90 text-amber-300 border-amber-500/40'
      }[p.rarity] || 'bg-slate-800 text-slate-300 border-slate-700';

      const card = document.createElement('div');
      card.className = `p-3 rounded-2xl bg-slate-900/90 border-2 ${
        isPreviewed
          ? 'border-purple-400 ring-2 ring-purple-400/50 shadow-lg shadow-purple-500/25 bg-slate-900'
          : 'border-slate-800 hover:border-slate-700'
      } flex items-center gap-3.5 cursor-pointer transition-all hover:scale-[1.02] group`;

      card.onclick = () => this.selectPetPreview(p.id);

      card.innerHTML = `
        <div class="w-14 h-14 rounded-2xl bg-gradient-to-tr from-purple-900 via-slate-900 to-slate-950 flex items-center justify-center text-3xl border border-purple-500/30 flex-shrink-0 group-hover:scale-110 transition-transform shadow-inner">
          ${p.icon}
        </div>
        <div class="flex-1 min-w-0">
          <div class="flex items-center justify-between gap-1 mb-1">
            <h4 class="font-hud text-sm font-black text-white truncate tracking-wide">${p.name}</h4>
            <div class="flex items-center gap-1 flex-shrink-0">
              <span class="text-[8px] font-black uppercase font-hud px-1.5 py-0.5 rounded border ${rarityBadge}">${p.rarity}</span>
              ${isEquipped ? '<span class="text-[9px] font-black text-emerald-400 bg-emerald-950/90 px-1.5 py-0.5 rounded-full border border-emerald-500/40 font-hud">EN USO</span>' : ''}
            </div>
          </div>
          <p class="text-[10px] text-slate-400 line-clamp-1">${p.desc}</p>
          <div class="text-[10px] font-hud font-bold text-emerald-300 mt-1 flex items-center gap-1">
            <span>✨</span> <span>${p.bonus}</span>
          </div>
        </div>
      `;
      container.appendChild(card);
    });
  },

  selectPetPreview(id) {
    this._selectedPetId = id;
    TrashGame.Sound.playClick();
    this.renderPetsList();
    this.updatePetDetails(id);
    if (TrashGame.PetPreview) {
      TrashGame.PetPreview.updateModel(id);
    }
  },

  equipPet(id) {
    this.selectPetPreview(id);
    this.confirmEquipPet();
  },

  confirmEquipPet() {
    const id = this._selectedPetId || TrashGame.State.equipped.pet || 'ecobot';
    TrashGame.State.equipPet(id);
    TrashGame.Sound.playEquip();

    this.renderPetsList();
    this.updatePetDetails(id);

    if (TrashGame.Main) {
      TrashGame.CharacterBuilder.buildPet(TrashGame.Main.petGroup, id);
    }

    if (typeof confetti === 'function') {
      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.6 }
      });
    }

    const pet = TrashGame.Pets.find(p => p.id === id);
    this.showToast(`¡Mascota ${pet ? pet.name : ''} equipada como compañera activa! 🐾`, 'success');
  },

  updatePetDetails(petId) {
    const p = TrashGame.Pets.find(pet => pet.id === petId) || TrashGame.Pets[0];
    if (!p) return;

    const nameEl = document.getElementById('pet-detail-name');
    if (nameEl) nameEl.textContent = p.name;

    const descEl = document.getElementById('pet-detail-desc');
    if (descEl) descEl.textContent = p.desc;

    const bonusEl = document.getElementById('pet-detail-bonus');
    if (bonusEl) bonusEl.textContent = p.bonus;

    const rarityEl = document.getElementById('pet-detail-rarity');
    if (rarityEl) {
      rarityEl.textContent = p.rarity.toUpperCase();
      rarityEl.className = `text-[9px] font-black uppercase font-hud px-2 py-0.5 rounded-full border ${
        p.rarity === 'legendario' ? 'bg-amber-950/90 text-amber-300 border-amber-500/40' :
        p.rarity === 'epico' ? 'bg-purple-950/90 text-purple-300 border-purple-500/40' :
        'bg-cyan-950/90 text-cyan-300 border-cyan-500/40'
      }`;
    }

    const isEquipped = TrashGame.State.equipped.pet === p.id;
    const btnEquip = document.getElementById('btn-equip-pet');
    if (btnEquip) {
      if (isEquipped) {
        btnEquip.innerHTML = '<span>✓</span> MASCOTA EN USO';
        btnEquip.className = 'w-full py-2.5 rounded-xl bg-slate-800 text-slate-400 font-hud font-black text-xs tracking-wider flex items-center justify-center gap-1.5 cursor-default border border-slate-700';
      } else {
        btnEquip.innerHTML = '<span>🐾</span> EQUIPAR ESTA MASCOTA';
        btnEquip.className = 'w-full py-2.5 rounded-xl bg-gradient-to-r from-purple-600 via-fuchsia-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-hud font-black text-xs tracking-wider flex items-center justify-center gap-1.5 shadow-lg shadow-purple-600/30 transition-all hover:scale-[1.02] active:scale-95';
      }
    }
  },

  selectCharacter(key) {
    if (TrashGame.State.player.character === key) return;
    TrashGame.State.selectCharacter(key);
    TrashGame.Sound.playFanfare();

    const btnAbe = document.getElementById('btn-select-abraham');
    const btnSasha = document.getElementById('btn-select-sasha');

    if (key === 'abraham') {
      if (btnAbe) {
        btnAbe.textContent = 'Seleccionado';
        btnAbe.className = 'mt-6 w-full py-2.5 rounded-xl bg-emerald-500 text-slate-950 font-bold text-xs uppercase tracking-wider shadow-md';
      }
      if (btnSasha) {
        btnSasha.textContent = 'Seleccionar a Sasha';
        btnSasha.className = 'mt-6 w-full py-2.5 rounded-xl bg-slate-800 hover:bg-cyan-500 text-white hover:text-slate-950 font-bold text-xs uppercase tracking-wider transition-colors shadow-md';
      }
      const avatar = document.getElementById('hud-player-avatar');
      if (avatar) avatar.textContent = '🦸‍♂️';
    } else {
      if (btnSasha) {
        btnSasha.textContent = 'Seleccionado';
        btnSasha.className = 'mt-6 w-full py-2.5 rounded-xl bg-cyan-400 text-slate-950 font-bold text-xs uppercase tracking-wider shadow-md';
      }
      if (btnAbe) {
        btnAbe.textContent = 'Seleccionar a Abraham';
        btnAbe.className = 'mt-6 w-full py-2.5 rounded-xl bg-slate-800 hover:bg-emerald-500 text-white hover:text-slate-950 font-bold text-xs uppercase tracking-wider transition-colors shadow-md';
      }
      const avatar = document.getElementById('hud-player-avatar');
      if (avatar) avatar.textContent = '🦸‍♀️';
    }

    if (TrashGame.Main) {
      TrashGame.CharacterBuilder.build(
        TrashGame.Main.characterGroup,
        key,
        TrashGame.State.equipped
      );
    }
    this.showToast(`Héroe seleccionado: ${key === 'abraham' ? 'Abraham' : 'Sasha'}`, 'success');
  },

  showComboBanner(text) {
    const banner = document.getElementById('hud-combo-banner');
    if (!banner) return;
    banner.textContent = text;
    banner.classList.remove('hidden');
    banner.classList.remove('combo-banner');
    void banner.offsetWidth; // Trigger reflow
    banner.classList.add('combo-banner');
  },

  showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) return;
    const toast = document.createElement('div');
    const style = {
      success: 'bg-emerald-950/90 text-emerald-300 border-emerald-500/50',
      error: 'bg-red-950/90 text-red-300 border-red-500/50',
      info: 'bg-slate-900/90 text-cyan-300 border-cyan-500/50'
    }[type];
    toast.className = `px-4 py-3 rounded-2xl glass-panel border ${style} shadow-xl text-xs font-semibold flex items-center gap-2 transform translate-y-4 opacity-0 transition-all duration-300 pointer-events-auto`;
    toast.innerHTML = `<span>${type === 'success' ? '✅' : type === 'error' ? '⚠️' : 'ℹ️'}</span> <span>${message}</span>`;
    container.appendChild(toast);
    requestAnimationFrame(() => toast.classList.remove('translate-y-4', 'opacity-0'));
    setTimeout(() => {
      toast.classList.add('translate-y-4', 'opacity-0');
      setTimeout(() => toast.remove(), 300);
    }, 3500);
  },

  // Free Fire Style Dynamic Profile Helpers
  profileLikes: 1482,

  switchProfileTab(tabName) {
    TrashGame.Sound.playClick();
    ['ranks', 'stats', 'medals', 'history'].forEach(t => {
      const content = document.getElementById(`profile-tab-${t}`);
      const btn = document.getElementById(`btn-profile-tab-${t}`);
      if (content) content.classList.add('hidden');
      if (btn) {
        btn.classList.remove('active', 'bg-emerald-500', 'text-slate-950', 'border-emerald-400', 'shadow-emerald-500/30');
        btn.classList.add('bg-slate-800/80', 'text-slate-300', 'border-transparent');
      }
    });

    const activeContent = document.getElementById(`profile-tab-${tabName}`);
    const activeBtn = document.getElementById(`btn-profile-tab-${tabName}`);
    if (activeContent) activeContent.classList.remove('hidden');
    if (activeBtn) {
      activeBtn.classList.remove('bg-slate-800/80', 'text-slate-300', 'border-transparent');
      activeBtn.classList.add('active', 'bg-emerald-500', 'text-slate-950', 'border-emerald-400', 'shadow-emerald-500/30');
    }
  },

  giveProfileLike() {
    this.profileLikes++;
    const countEl = document.getElementById('profile-likes-count');
    if (countEl) countEl.textContent = this.profileLikes.toLocaleString();

    const btn = document.getElementById('btn-profile-like');
    if (btn) {
      btn.classList.add('scale-125', 'text-rose-400');
      setTimeout(() => btn.classList.remove('scale-125', 'text-rose-400'), 250);
    }

    TrashGame.Sound.playCoin();
    if (typeof confetti === 'function') {
      confetti({
        particleCount: 25,
        spread: 45,
        origin: { y: 0.5 },
        colors: ['#f43f5e', '#ec4899', '#fbbf24']
      });
    }
    this.showToast('¡Le diste un Like a tu perfil Free Fire! 👍', 'success');
  },

  copyPlayerId() {
    TrashGame.Sound.playClick();
    navigator.clipboard?.writeText('TM-94285-PE').catch(() => {});
    this.showToast('¡ID de Jugador copiado: TM-94285-PE! 📋', 'success');
  }
};
