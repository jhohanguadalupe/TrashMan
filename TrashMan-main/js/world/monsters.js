/* =========================================================================
   TRASH MAN — MAP MONSTER ROSTER
   Two active models at most; map rank and player level select the encounter tier.
   ========================================================================= */

window.TrashGame = window.TrashGame || {};

TrashGame.Monsters = {
  active: [],
  projectiles: [],
  projectileGeometry: null,
  projectileMaterial: null,
  shotCooldown: 0,
  mapRanks: {
    playa: { rank: 1, ids: ['monstruo_n1_playa_t', 'monstruo_n1_playa_t'] },
    bosque: { rank: 2, ids: ['monstruo_n2_bosque_t', 'monstruo_n2_bosque_t'] },
    rio: { rank: 3, ids: ['monstruo_n3_rio_t', 'monstruo_n3_rio_t'] },
    ciudad: { rank: 4, ids: ['monstruo_n4_ciudad_t', 'monstruo_n4_ciudad_t'] },
    manglar: { rank: 3, ids: ['monstruo_n3_rio_t', 'monstruo_n3_rio_t'] },
    puerto: { rank: 4, ids: ['monstruo_n4_ciudad_t', 'monstruo_n4_ciudad_t'] },
    boss_arena: { rank: 4, ids: ['monstruo_n4_ciudad_t', 'monstruo_n4_ciudad_t'] }
  },
  positions: {
    playa: [[-8, -2], [8, -1.5]],
    bosque: [[13, -12], [-14, -15]],
    rio: [[18, -10], [-19, -13]],
    ciudad: [[14, -12], [-16, -15], [18, 9], [-20, 12]],
    boss_arena: [[-12, -8], [12, -8], [-13, 5], [13, 5]],
    manglar: [[18, -10], [-19, -13], [20, 12], [-18, 18]],
    puerto: [[14, -12], [-16, -15], [18, 9], [-20, 12], [0, -28]]
  },

  clear(worldGroup) {
    this.projectiles.forEach((projectile) => worldGroup && worldGroup.remove(projectile.mesh));
    this.projectiles.length = 0;
    this.shotCooldown = 0;
    this.active.forEach((entry) => {
      if (worldGroup) worldGroup.remove(entry.group);
      entry.group.traverse((node) => {
        if (!node.isMesh) return;
        if (node.geometry) node.geometry.dispose();
        if (node.material) {
          const materials = Array.isArray(node.material) ? node.material : [node.material];
          materials.forEach((material) => material.dispose());
        }
      });
    });
    this.active.length = 0;
  },

  spawnForMap(worldGroup, mapId, playerLevel = 1, difficultyId = 'medium') {
    this.clear(worldGroup);
    if (!window.TM || !window.TM_MONSTER_DATA || !this.mapRanks[mapId]) return;

    const config = this.mapRanks[mapId];
    const effectiveLevel = Math.max(1, playerLevel - (config.rank - 1) * 2);
    const tier = Math.max(1, Math.min(3, Math.ceil(effectiveLevel / 5)));
    const tierPattern = tier === 1 ? [1, 1] : [tier - 1, tier];
    const difficulty = TrashGame.Difficulties[difficultyId] || TrashGame.Difficulties.medium;
    const monsterCount = Math.min(this.positions[mapId].length, difficulty.monsterCount);
    const tiers = Array.from({ length: monsterCount }, (_, index) => tierPattern[index % tierPattern.length]);
    const anchors = this.positions[mapId];

    tiers.forEach((selectedTier, index) => {
      const modelId = config.ids[index % config.ids.length] + selectedTier + '_' + this.speciesSuffix(mapId, selectedTier);
      if (!window.TM_MODELS[modelId]) return;
      const stats = window.TM_MONSTER_DATA.find((entry) => entry.id === modelId);
      const group = window.TM.build(THREE, modelId);
      group.name = modelId;

      let bounds = new THREE.Box3().setFromObject(group);
      const height = bounds.max.y - bounds.min.y;
      const targetHeight = selectedTier === 1 ? 1.2 : selectedTier === 2 ? 1.8 : 2.65;
      if (!Number.isFinite(height) || height <= 0) return;
      group.scale.setScalar(targetHeight / height);
      group.updateMatrixWorld(true);
      bounds = new THREE.Box3().setFromObject(group);
      const size = bounds.getSize(new THREE.Vector3());
      group.position.y -= bounds.min.y;
      group.position.x = anchors[index][0];
      group.position.z = anchors[index][1];
      group.traverse((node) => {
        if (!node.isMesh) return;
        node.castShadow = selectedTier > 1;
        node.receiveShadow = false;
        node.frustumCulled = true;
      });
      const baseStats = stats || { tier: selectedTier, hp: 40 * selectedTier, dano: 5 * selectedTier };
      group.userData.stats = {
        ...baseStats,
        hp: Math.max(1, Math.round((baseStats.hp || 40 * selectedTier) * difficulty.monsterHpMultiplier)),
        dano: Math.max(1, Math.round((baseStats.dano || 5 * selectedTier) * difficulty.monsterDamageMultiplier))
      };
      group.userData.homePosition = group.position.clone();
      worldGroup.add(group);
      this.active.push({
        group,
        modelId,
        phase: Math.random() * Math.PI * 2,
        hp: group.userData.stats.hp,
        maxHp: group.userData.stats.hp,
        hitRadius: Math.max(size.x, size.z) * 0.4,
        bodyHeight: size.y,
        contactDamage: Math.max(1, Math.round(2 * difficulty.monsterDamageMultiplier)),
        attackCooldown: 0.6 + Math.random() * 0.6
      });
    });
  },

  speciesSuffix(mapId, tier) {
    const names = {
      playa: ['cangrejo_lata', 'cangrejo_botella', 'cangrejo_colosal'],
      bosque: ['moho_toxico', 'hongo_mutante', 'ancestro_neumatico'],
      rio: ['pez_lata', 'anguila_petroleo', 'hidra_petroleo'],
      ciudad: ['robot_chatarra', 'mecha_reciclador', 'titan_chatarra']
    };
    const rosterMap = mapId === 'boss_arena' || mapId === 'puerto' ? 'ciudad' : mapId === 'manglar' ? 'rio' : mapId;
    return names[rosterMap][tier - 1];
  },

  fireShot(camera, playerPosition, worldGroup) {
    if (!this.active.length || this.shotCooldown > 0 || !camera) return false;
    this.shotCooldown = 0.28;
    if (!this.projectileGeometry) this.projectileGeometry = new THREE.SphereGeometry(0.085, 10, 8);
    if (!this.projectileMaterial) {
      this.projectileMaterial = new THREE.MeshStandardMaterial({
        color: 0x91ffd0,
        emissive: 0x1ecb8a,
        emissiveIntensity: 1.15,
        roughness: 0.38,
        metalness: 0.08
      });
    }
    const direction = new THREE.Vector3();
    camera.getWorldDirection(direction);
    const origin = playerPosition.clone().add(new THREE.Vector3(0, 1.28, 0)).addScaledVector(direction, 0.72);
    const mesh = new THREE.Mesh(this.projectileGeometry, this.projectileMaterial);
    mesh.position.copy(origin);
    mesh.castShadow = false;
    worldGroup.add(mesh);
    if (this.projectiles.length >= 12) {
      const oldest = this.projectiles.shift();
      worldGroup.remove(oldest.mesh);
    }
    this.projectiles.push({
      mesh,
      direction,
      speed: 34,
      life: 2.4,
      damage: this.getWeaponDamage()
    });
    if (TrashGame.Sound) TrashGame.Sound.playLaserShot();
    return true;
  },

  getWeaponDamage() {
    const weapon = TrashGame.State && TrashGame.State.equipped ? TrashGame.State.equipped.weapon : 'claw_basic';
    if (weapon === 'cannon_vacuum') return 105;
    if (weapon === 'broom_laser') return 80;
    const item = window.TM_TOOL_DATA && window.TM_TOOL_DATA.find(tool => tool.id === weapon);
    const level = TrashGame.State && TrashGame.State.player ? TrashGame.State.player.level || 1 : 1;
    const tier = item ? item.tier : (weapon === 'claw_basic' ? Math.max(1, Math.min(3, Math.ceil(level / 5))) : 3);
    return tier === 3 ? 80 : tier === 2 ? 55 : 30;
  },

  update(time, dt, playerPosition, worldGroup, camera, onPlayerHit) {
    if (!window.TM) return;
    this.shotCooldown = Math.max(0, this.shotCooldown - dt);
    this.updateProjectiles(dt, playerPosition, worldGroup, camera);
    if (TrashGame.Main && TrashGame.Main.player.hp <= 0) return;

    for (let i = this.active.length - 1; i >= 0; i--) {
      const entry = this.active[i];
      const group = entry.group;
      const dx = playerPosition.x - group.position.x;
      const dz = playerPosition.z - group.position.z;
      const distance = Math.hypot(dx, dz);
      const stats = group.userData.stats || {};
      const attackRange = Math.max(1.25, entry.hitRadius + 0.55);
      const targetAngle = Math.atan2(dx, dz);
      let turn = targetAngle - group.rotation.y;
      turn = Math.atan2(Math.sin(turn), Math.cos(turn));
      group.rotation.y += turn * Math.min(1, dt * 2.4);

      entry.attacking = false;
      if (distance > attackRange) {
        const speed = Math.min(2.1, Math.max(0.55, stats.velocidad || 1.2));
        group.position.x += (dx / Math.max(distance, 0.001)) * speed * dt;
        group.position.z += (dz / Math.max(distance, 0.001)) * speed * dt;
        if (TrashGame.MapBuilder) TrashGame.MapBuilder.clampPlayerPosition(group.position);
      } else {
        entry.attackCooldown -= dt;
        if (entry.attackCooldown <= 0) {
          entry.attackCooldown = 1.05;
          entry.attacking = true;
          if (onPlayerHit) onPlayerHit(entry.contactDamage || 2);
        }
      }
      const home = group.userData.homePosition;
      group.position.y = home.y + Math.sin(time * 1.5 + entry.phase) * 0.018;
      window.TM.animate(group, time + entry.phase, { run: distance > attackRange });
    }
  },

  updateProjectiles(dt, playerPosition, worldGroup, camera) {
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const projectile = this.projectiles[i];
      const start = projectile.mesh.position.clone();
      const travel = projectile.direction.clone().multiplyScalar(projectile.speed * dt);
      projectile.mesh.position.add(travel);
      projectile.life -= dt;
      let hit = false;
      for (let j = this.active.length - 1; j >= 0; j--) {
        const entry = this.active[j];
        const center = entry.group.position.clone().add(new THREE.Vector3(0, entry.bodyHeight * 0.46, 0));
        const travelLengthSq = travel.lengthSq();
        const along = travelLengthSq > 0
          ? THREE.MathUtils.clamp(center.clone().sub(start).dot(travel) / travelLengthSq, 0, 1)
          : 0;
        const closest = start.clone().addScaledVector(travel, along);
        if (closest.distanceTo(center) > entry.hitRadius + 0.2) continue;
        entry.hp = Math.max(0, entry.hp - projectile.damage);
        if (TrashGame.Sound) TrashGame.Sound.playBossHit();
        if (TrashGame.AdventureMode) {
          TrashGame.AdventureMode.spawnFloatingDamage(center, `-${projectile.damage}`, camera, '#a7f3d0');
        }
        const away = new THREE.Vector3(entry.group.position.x - playerPosition.x, 0, entry.group.position.z - playerPosition.z).normalize();
        entry.group.position.addScaledVector(away, 0.16);
        if (entry.hp <= 0) {
          const name = entry.group.userData.stats && entry.group.userData.stats.nombre || 'Monstruo';
          worldGroup.remove(entry.group);
          if (window.TM.disposeDynamic) window.TM.disposeDynamic(entry.group);
          this.active.splice(j, 1);
          if (TrashGame.UI) TrashGame.UI.showToast(`${name} neutralizado`, 'success');
          const tier = entry.group.userData.stats && entry.group.userData.stats.tier || 1;
          if (TrashGame.State) {
            TrashGame.State.addCoins(20 * tier);
            TrashGame.State.addXp(12 * tier);
          }
        }
        hit = true;
        break;
      }
      if (hit || projectile.life <= 0) {
        worldGroup.remove(projectile.mesh);
        this.projectiles.splice(i, 1);
      }
    }
  }
};
