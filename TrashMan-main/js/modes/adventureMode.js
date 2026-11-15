/* =========================================================================
   TRASH MAN 3D - ADVANCED ADVENTURE MODE (TITAN BOSS ENCOUNTER)
   Plasma Ballistics, Particle Shrapnel Bursts & Cinematic Combat Feedback
   ========================================================================= */

window.TrashGame = window.TrashGame || {};

TrashGame.AdventureMode = {
  active: false,
  boss: null,
  completed: false,
  projectiles: [],
  impactParticles: [],
  trophies: [],

  start(worldGroup) {
    this.active = true;
    this.completed = false;
    this.projectiles = [];
    this.impactParticles = [];

    // Setup HUD for Boss Fight
    document.getElementById('hud-objective-panel').classList.remove('hidden');
    document.getElementById('hud-trash-progress-container').classList.add('hidden');
    document.getElementById('hud-carry-status').classList.add('hidden');
    document.getElementById('hud-boss-hp-container').classList.remove('hidden');
    const difficulty = TrashGame.Difficulties[TrashGame.Main.difficulty] || TrashGame.Difficulties.medium;
    document.getElementById('hud-badge-mode').textContent = `Titán · ${difficulty.name}`;
    document.getElementById('hud-tool-hint').textContent = 'Disparar Plasma Ecológico (Click Izq)';
    document.getElementById('hud-map-icon').textContent = '👹';
    document.getElementById('hud-map-title').textContent = 'Arena del Titán';

    this.boss = new TrashGame.Boss(worldGroup, TrashGame.Main.difficulty);
    this.updateBossHUD();
  },

  firePlasma(origin, camYaw, worldGroup) {
    if (!this.active || !this.boss) return;

    TrashGame.Sound.playLaserShot();

    const projGroup = new THREE.Group();

    // High-Intensity Glowing Plasma Orb Core
    const orb = new THREE.Mesh(
      new THREE.SphereGeometry(0.24, 16, 16),
      new THREE.MeshStandardMaterial({
        color: 0x00ff88,
        emissive: 0x00ff88,
        emissiveIntensity: 3.5,
        roughness: 0.1
      })
    );
    projGroup.add(orb);

    // Cyan Ion Outer Halo
    const halo = new THREE.Mesh(
      new THREE.SphereGeometry(0.32, 12, 12),
      new THREE.MeshBasicMaterial({
        color: 0x06b6d4,
        transparent: true,
        opacity: 0.55
      })
    );
    projGroup.add(halo);

    const dir = new THREE.Vector3(-Math.sin(camYaw), 0.08, -Math.cos(camYaw)).normalize();
    projGroup.position.copy(origin).add(new THREE.Vector3(0, 1.45, 0)).addScaledVector(dir, 0.9);

    worldGroup.add(projGroup);
    this.projectiles.push({ mesh: projGroup, dir, speed: 36, life: 2.2 });
  },

  update(playerPos, dt, worldGroup, camera, onPlayerHit) {
    if (!this.active || !this.boss) return;

    // 1. Update Boss AI & Attacks
    this.boss.update(playerPos, dt, onPlayerHit);

    // 2. Update Projectiles
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const p = this.projectiles[i];
      p.mesh.position.addScaledVector(p.dir, p.speed * dt);
      p.life -= dt;

      let hitMinion = false;
      if (TrashGame.Monsters && TrashGame.Monsters.active.length) {
        for (let j = TrashGame.Monsters.active.length - 1; j >= 0; j--) {
          const enemy = TrashGame.Monsters.active[j];
          const center = enemy.group.position.clone().add(new THREE.Vector3(0, enemy.bodyHeight * 0.46, 0));
          if (p.mesh.position.distanceTo(center) > enemy.hitRadius + 0.38) continue;
          const damage = TrashGame.Monsters.getWeaponDamage();
          enemy.hp = Math.max(0, enemy.hp - damage);
          this.spawnImpactParticles(p.mesh.position, worldGroup, 0x38bdf8);
          this.spawnFloatingDamage(center, `-${damage}`, camera, '#7dd3fc');
          if (enemy.hp <= 0) {
            const tier = enemy.group.userData.stats && enemy.group.userData.stats.tier || 1;
            worldGroup.remove(enemy.group);
            if (window.TM.disposeDynamic) window.TM.disposeDynamic(enemy.group);
            TrashGame.Monsters.active.splice(j, 1);
            TrashGame.State.addCoins(20 * tier);
            TrashGame.State.addXp(12 * tier);
            TrashGame.UI.showToast(`${enemy.group.userData.stats && enemy.group.userData.stats.nombre || 'Monstruo'} neutralizado`, 'success');
          }
          worldGroup.remove(p.mesh);
          this.projectiles.splice(i, 1);
          hitMinion = true;
          break;
        }
      }
      if (hitMinion) continue;

      // Boss Collision Check
      const bossCenter = this.boss.group.position.clone().add(new THREE.Vector3(0, 3.4, 0));
      if (p.mesh.position.distanceTo(bossCenter) < 2.8) {
        const isCrit = Math.random() < 0.28;
        const equippedWeapon = TrashGame.State && TrashGame.State.equipped && TrashGame.State.equipped.weapon;
        const toolData = window.TM_TOOL_DATA && window.TM_TOOL_DATA.find(tool => tool.id === equippedWeapon);
        const weaponMultiplier = equippedWeapon === 'cannon_vacuum' ? 1.2
          : equippedWeapon === 'broom_laser' ? 1.12
            : toolData ? 1 + Math.max(0, (toolData.tier || 1) - 1) * 0.06 : 1;
        const dmg = Math.round(((isCrit ? 160 : 95) + Math.floor(Math.random() * 35)) * weaponMultiplier);

        const currentHp = this.boss.takeDamage(dmg);
        this.spawnImpactParticles(p.mesh.position, worldGroup, isCrit ? 0xf59e0b : 0x00ff88);
        this.spawnFloatingDamage(p.mesh.position, isCrit ? `⚡ CRÍTICO -${dmg}` : `-${dmg}`, camera, isCrit ? '#f59e0b' : '#38bdf8');
        this.updateBossHUD();

        worldGroup.remove(p.mesh);
        this.projectiles.splice(i, 1);

        if (currentHp <= 0) {
          this.victory();
        }
        continue;
      }

      if (p.life <= 0) {
        worldGroup.remove(p.mesh);
        this.projectiles.splice(i, 1);
      }
    }

    // 3. Update Impact Sparks
    for (let i = this.impactParticles.length - 1; i >= 0; i--) {
      const ip = this.impactParticles[i];
      ip.mesh.position.addScaledVector(ip.vel, dt);
      ip.life -= dt;
      ip.mesh.scale.multiplyScalar(0.92);
      if (ip.life <= 0) {
        worldGroup.remove(ip.mesh);
        this.impactParticles.splice(i, 1);
      }
    }
  },

  spawnImpactParticles(pos, worldGroup, colorHex) {
    const pGeo = new THREE.SphereGeometry(0.08, 6, 6);
    const pMat = new THREE.MeshBasicMaterial({ color: colorHex });

    for (let i = 0; i < 8; i++) {
      const spark = new THREE.Mesh(pGeo, pMat);
      spark.position.copy(pos);
      worldGroup.add(spark);

      const vel = new THREE.Vector3(
        (Math.random() - 0.5) * 12,
        Math.random() * 10 + 2,
        (Math.random() - 0.5) * 12
      );
      this.impactParticles.push({ mesh: spark, vel, life: 0.65 });
    }
  },

  spawnFloatingDamage(worldPos, text, camera, color) {
    const screenPos = worldPos.clone().project(camera);
    const x = (screenPos.x * 0.5 + 0.5) * window.innerWidth;
    const y = (-(screenPos.y * 0.5) + 0.5) * window.innerHeight;

    const el = document.createElement('div');
    el.className = 'damage-number';
    el.style.left = `${x}px`;
    el.style.top = `${y}px`;
    el.style.color = color;
    el.textContent = text;
    document.body.appendChild(el);

    setTimeout(() => el.remove(), 1100);
  },

  updateBossHUD() {
    if (!this.boss) return;
    const pct = Math.max(0, (this.boss.hp / this.boss.maxHp) * 100);
    const bar = document.getElementById('hud-boss-bar');
    if (bar) bar.style.width = `${pct}%`;

    const txt = document.getElementById('hud-boss-hp-text');
    if (txt) txt.textContent = `${this.boss.hp} / ${this.boss.maxHp} HP`;
  },

  victory() {
    if (this.completed) return;
    this.completed = true;
    this.active = false;
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
    TrashGame.Sound.playAsset('jefe/boss_defeat', 0.65);
    TrashGame.Sound.playAsset('musica/musica_victoria', 0.35);
    this.spawnBossTrophies();
    if (typeof confetti === 'function') {
      confetti({ particleCount: 180, spread: 100, origin: { y: 0.6 } });
    }

    TrashGame.State.addCoins(1000);
    TrashGame.State.addXp(2000);

    document.getElementById('victory-title').textContent = '¡Titán Desmantelado!';
    document.getElementById('victory-subtitle').textContent = 'El Colosal Gólem de Residuos Tóxicos ha sido neutralizado.';
    document.getElementById('victory-coins').textContent = '+1,000 🪙';
    document.getElementById('victory-xp').textContent = '+2,000 XP';

    document.getElementById('modal-victory').classList.remove('hidden');
  },

  spawnBossTrophies() {
    this.trophies = [];
    const parent = this.boss && this.boss.group && this.boss.group.parent;
    if (!parent || !window.TM || !window.TM_MODELS.prop_diente_monstruo) return;
    for (let i = 0; i < 3; i++) {
      const tooth = window.TM.buildStatic(THREE, 'prop_diente_monstruo');
      tooth.scale.setScalar(2.6);
      tooth.position.set(
        this.boss.group.position.x + (i - 1) * 0.42,
        0.08,
        this.boss.group.position.z + 2.5 + (i % 2) * 0.28
      );
      tooth.rotation.y = i * 1.7;
      parent.add(tooth);
      this.trophies.push(tooth);
    }
  },

  stop(worldGroup) {
    this.active = false;
    this.trophies.forEach(tooth => worldGroup.remove(tooth));
    this.trophies = [];
    this.projectiles.forEach(p => worldGroup.remove(p.mesh));
    this.projectiles = [];
    this.impactParticles.forEach(ip => worldGroup.remove(ip.mesh));
    this.impactParticles = [];
    if (this.boss) {
      this.boss.destroy();
      this.boss = null;
    }
  }
};
