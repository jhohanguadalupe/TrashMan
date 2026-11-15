/* =========================================================================
   TRASH MAN 3D - COLOSSAL TITAN GOLEM BOSS ENGINE
   High-Fidelity Cyber-Scrap Mech, Hydraulic Pistons, Shockwaves & Toxic Core
   ========================================================================= */

window.TrashGame = window.TrashGame || {};

TrashGame.Boss = class {
  constructor(worldGroup, difficultyId = 'medium') {
    this.worldGroup = worldGroup;
    this.group = new THREE.Group();
    const difficulty = TrashGame.Difficulties[difficultyId] || TrashGame.Difficulties.medium;
    const baseHp = (TrashGame.MapsData.boss_arena && TrashGame.MapsData.boss_arena.bossHp) || 2500;
    this.hp = Math.round(baseHp * difficulty.bossHpMultiplier);
    this.maxHp = this.hp;
    this.damageMultiplier = difficulty.bossDamageMultiplier;
    this.speed = 3.4;
    this.state = 'CHASE'; // 'CHASE', 'SLAM', 'COOLDOWN', 'ENRAGED', 'DEFEATED'
    this.timer = 0;
    this.isEnraged = false;

    this.shockwaves = [];
    this.trashProjectiles = [];
    this.trashThrowInterval = ({ easy: 7.2, medium: 5.1, hard: 3.5 }[difficultyId] || 5.1);
    this.trashThrowTimer = 2.8;
    this.trashProjectileGravity = 7.5;
    this.trashProjectileGeometry = new THREE.IcosahedronGeometry(0.55, 1);
    this.trashProjectileShardGeometry = new THREE.BoxGeometry(0.28, 0.16, 0.38);
    this.trashProjectileMaterial = new THREE.MeshStandardMaterial({ color: 0x394044, roughness: 0.93, metalness: 0.28 });
    this.trashProjectileGlowMaterial = new THREE.MeshStandardMaterial({ color: 0x78c84b, emissive: 0x4e9a35, emissiveIntensity: 1.5, roughness: 0.48 });
    this.leftArm = null;
    this.rightArm = null;
    this.core = null;
    this.jaw = null;
    this.exhaustTubes = [];
    this.trashBossModel = null;
    this.rightArmHomeY = 4.0;

    this.buildModel();
    this.worldGroup.add(this.group);
  }

  buildModel() {
    this.group.position.set(0, 0, -16);
    if (window.TM_MODELS && window.TM_MODELS.boss_final_rey_vertedero && this.installTrashBossModel('boss_final_rey_vertedero')) return;

    const scrapTex = TrashGame.Textures.getScrapMetal();
    scrapTex.repeat.set(2, 2);

    const heavyArmorMat = new THREE.MeshStandardMaterial({
      map: scrapTex,
      metalness: 0.8,
      roughness: 0.35
    });

    const darkIronMat = new THREE.MeshStandardMaterial({
      color: 0x09090b,
      metalness: 0.9,
      roughness: 0.4
    });

    const tireMat = new THREE.MeshStandardMaterial({
      color: 0x18181b,
      roughness: 0.9
    });

    const toxicMat = new THREE.MeshStandardMaterial({
      color: 0x00ff88,
      emissive: 0x00ff88,
      emissiveIntensity: 2.2,
      roughness: 0.1
    });

    // 1. Massive Armored Chassis / Torso
    const chestGroup = new THREE.Group();
    chestGroup.position.y = 3.8;

    const chestBody = new THREE.Mesh(new THREE.BoxGeometry(2.8, 2.6, 2.2), heavyArmorMat);
    chestBody.castShadow = true;
    chestGroup.add(chestBody);

    // Hydraulic Pistons on sides
    [-1.2, 1.2].forEach(x => {
      const piston = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 2.2, 12), darkIronMat);
      piston.position.set(x, 0, 0.9);
      chestGroup.add(piston);
    });

    // Glowing Toxic Bio-Reactor Core in center of chest
    this.core = new THREE.Mesh(new THREE.SphereGeometry(0.75, 24, 24), toxicMat);
    this.core.position.set(0, 0, 0.95);
    chestGroup.add(this.core);

    // Protective Reinforced Iron Grille over Core
    const cageBar1 = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.1, 0.1), darkIronMat);
    cageBar1.position.set(0, 0.3, 1.35);
    const cageBar2 = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.1, 0.1), darkIronMat);
    cageBar2.position.set(0, -0.3, 1.35);
    chestGroup.add(cageBar1);
    chestGroup.add(cageBar2);

    // Twin Exhaust Smokestacks on Back
    [-0.7, 0.7].forEach(x => {
      const exhaust = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.28, 2.2, 12), darkIronMat);
      exhaust.position.set(x, 1.4, -0.9);
      exhaust.rotation.x = -Math.PI / 8;
      chestGroup.add(exhaust);
      this.exhaustTubes.push(exhaust);
    });

    this.group.add(chestGroup);

    // 2. Colossal Crushing Head & Optical Sensor
    const headGroup = new THREE.Group();
    headGroup.position.y = 5.6;

    const skull = new THREE.Mesh(new THREE.BoxGeometry(1.6, 1.2, 1.4), heavyArmorMat);
    skull.castShadow = true;
    headGroup.add(skull);

    // Menacing Cyclops Optical Visor
    const eye = new THREE.Mesh(
      new THREE.BoxGeometry(1.1, 0.22, 0.2),
      new THREE.MeshStandardMaterial({
        color: 0xef4444,
        emissive: 0xef4444,
        emissiveIntensity: 3.5
      })
    );
    eye.position.set(0, 0.15, 0.72);
    headGroup.add(eye);

    // Hydraulic Shredder Jaw
    this.jaw = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.4, 1.3), darkIronMat);
    this.jaw.position.set(0, -0.65, 0.1);
    headGroup.add(this.jaw);

    this.group.add(headGroup);

    // 3. Heavy Armored Shoulders & Hydraulic Crusher Arms
    [-2.2, 2.2].forEach((x, idx) => {
      // Giant Mining Wheel / Track Shoulder
      const shoulderWheel = new THREE.Mesh(new THREE.TorusGeometry(1.1, 0.5, 12, 24), tireMat);
      shoulderWheel.position.set(x, 4.2, 0);
      shoulderWheel.rotation.y = Math.PI / 2;
      this.group.add(shoulderWheel);

      const armGroup = new THREE.Group();
      armGroup.position.set(x, 4.0, 0);

      // Arm Shaft with Hydraulic Ram
      const armShaft = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.75, 2.8, 12), heavyArmorMat);
      armShaft.position.y = -1.4;
      armShaft.castShadow = true;
      armGroup.add(armShaft);

      // Massive Crusher Fist
      const fist = new THREE.Mesh(new THREE.BoxGeometry(1.3, 1.4, 1.3), darkIronMat);
      fist.position.y = -2.8;
      fist.castShadow = true;
      armGroup.add(fist);

      this.group.add(armGroup);

      if (idx === 0) this.leftArm = armGroup;
      else this.rightArm = armGroup;
    });

    // 4. Massive Tank Pillar Legs
    [-1.0, 1.0].forEach(x => {
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.95, 2.6, 16), tireMat);
      leg.position.set(x, 1.3, 0);
      leg.castShadow = true;
      this.group.add(leg);

      const foot = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.5, 1.8), darkIronMat);
      foot.position.set(x, 0.25, 0.2);
      foot.castShadow = true;
      this.group.add(foot);
    });
    this.rightArmHomeY = this.rightArm ? this.rightArm.position.y : 4.0;
  }

  installTrashBossModel(modelId) {
    try {
      const model = window.TM.build(THREE, modelId);
      let bounds = new THREE.Box3().setFromObject(model);
      const height = bounds.max.y - bounds.min.y;
      if (!Number.isFinite(height) || height < 1) return false;
      model.scale.setScalar(6.4 / height);
      model.updateMatrixWorld(true);
      bounds = new THREE.Box3().setFromObject(model);
      model.position.y -= bounds.min.y;
      model.traverse(node => {
        if (!node.isMesh) return;
        node.castShadow = true;
        node.receiveShadow = false;
      });

      if (this.trashBossModel) {
        this.group.remove(this.trashBossModel);
        this.trashBossModel.traverse(node => {
          if (node.isMesh && node.geometry) node.geometry.dispose();
          if (node.isMesh && node.material) node.material.dispose();
        });
      }
      this.trashBossModel = model;
      this.group.add(model);
      const parts = model.userData.parts || {};
      this.leftArm = parts.armL || null;
      this.rightArm = parts.armR || null;
      this.jaw = parts.jaw || null;
      this.core = null;
      this.rightArmHomeY = this.rightArm ? this.rightArm.position.y : 0;
      return true;
    } catch (error) {
      console.warn('[Boss] Could not build supplied boss model.', error);
      return false;
    }
  }

  update(playerPos, dt, onPlayerHit) {
    if (this.hp <= 0) return;

    // Check enrage state (< 50% HP)
    if (!this.isEnraged && this.hp < this.maxHp * 0.5) {
      this.isEnraged = true;
      this.speed = 4.6;
      if (this.core) {
        this.core.material.color.setHex(0xef4444);
        this.core.material.emissive.setHex(0xef4444);
        this.core.material.emissiveIntensity = 3.5;
      }
      TrashGame.Sound.playFanfare();
      if (this.trashBossModel) this.installTrashBossModel('boss_final_rey_vertedero_furioso');
      if (TrashGame.UI) TrashGame.UI.showToast('⚠️ ¡EL TITÁN ENTRA EN SOBRECARGA RADIACTIVA!', 'error');
    }

    const bossPos = this.group.position;
    const toPlayer = playerPos.clone().sub(bossPos);
    toPlayer.y = 0;
    const dist = toPlayer.length();

    // Smooth rotational tracking
    const targetAngle = Math.atan2(toPlayer.x, toPlayer.z);
    this.group.rotation.y = targetAngle;

    this.timer += dt;
    if (this.trashBossModel && window.TM) window.TM.animate(this.trashBossModel, this.timer, { run: dist > 4.2 });

    // Core pulsing & idle breathing
    if (this.core) {
      const pulse = 1 + Math.sin(this.timer * (this.isEnraged ? 8 : 4)) * 0.12;
      this.core.scale.set(pulse, pulse, pulse);
    }

    if (this.state === 'CHASE') {
      if (dist > 4.2) {
        toPlayer.normalize();
        bossPos.addScaledVector(toPlayer, this.speed * dt);

        // Walking leg swing & arm sway
        const walk = this.timer * 6;
        if (this.leftArm) this.leftArm.rotation.x = Math.sin(walk) * 0.4;
        if (this.rightArm) this.rightArm.rotation.x = -Math.sin(walk) * 0.4;
      } else {
        // Trigger Ground Slam
        this.state = 'SLAM';
        this.timer = 0;
      }
    } else if (this.state === 'SLAM') {
      // Wind up right arm high into the air
      if (this.timer < 0.65) {
        this.rightArm.rotation.x = -Math.PI / 1.8;
        this.rightArm.position.y = this.rightArmHomeY + 0.8;
      } else if (this.timer < 1.05) {
        // Ground impact smash
        this.rightArm.rotation.x = Math.PI / 8;
        this.rightArm.position.y = this.rightArmHomeY - 0.8;
        TrashGame.Sound.playBossSlam();
        this.triggerScreenShake();
        this.spawnShockwave(bossPos);

        // Check if player gets hit (must jump to dodge)
        if (dist < 7.5 && playerPos.y < 0.45) {
          if (onPlayerHit) onPlayerHit(Math.round((this.isEnraged ? 40 : 25) * this.damageMultiplier));
        }

        this.state = 'COOLDOWN';
        this.timer = 0;
      }
    } else if (this.state === 'COOLDOWN') {
      // Recover arm to neutral position
      this.rightArm.rotation.x *= 0.9;
      this.rightArm.position.y = this.rightArmHomeY;

      if (this.timer > (this.isEnraged ? 0.9 : 1.6)) {
        this.state = 'CHASE';
        this.timer = 0;
      }
    }

    this.updateTrashThrow(playerPos, dist, dt, onPlayerHit);

    // Update Expanding Ground Shockwaves
    for (let i = this.shockwaves.length - 1; i >= 0; i--) {
      const sw = this.shockwaves[i];
      sw.mesh.scale.x += 18 * dt;
      sw.mesh.scale.z += 18 * dt;
      sw.life -= dt;
      sw.mesh.material.opacity = (sw.life / sw.maxLife) * 0.9;

      if (sw.life <= 0) {
        this.worldGroup.remove(sw.mesh);
        this.shockwaves.splice(i, 1);
      }
    }

    this.updateTrashProjectiles(playerPos, dt, onPlayerHit);
  }

  updateTrashThrow(playerPos, distance, dt, onPlayerHit) {
    if (this.hp <= 0 || this.state !== 'CHASE' || distance < 9 || distance > 38) return;
    this.trashThrowTimer -= dt;
    if (this.trashThrowTimer > 0) return;

    this.trashThrowTimer = this.trashThrowInterval;
    this.group.updateMatrixWorld(true);
    const start = this.group.localToWorld(new THREE.Vector3(0, 3.9, 1.8));
    const target = playerPos.clone().add(new THREE.Vector3(0, 0.85, 0));
    const dx = target.x - start.x;
    const dz = target.z - start.z;
    const horizontalDistance = Math.hypot(dx, dz);
    const flightTime = THREE.MathUtils.clamp(horizontalDistance / 16, 0.78, 1.65);
    const velocity = new THREE.Vector3(
      dx / flightTime,
      (target.y - start.y + 0.5 * this.trashProjectileGravity * flightTime * flightTime) / flightTime,
      dz / flightTime
    );

    const scrap = new THREE.Group();
    const body = new THREE.Mesh(this.trashProjectileGeometry, this.trashProjectileMaterial);
    body.castShadow = true;
    scrap.add(body);
    const glow = new THREE.Mesh(new THREE.SphereGeometry(0.16, 8, 6), this.trashProjectileGlowMaterial);
    glow.position.set(0.1, 0.08, 0.12);
    scrap.add(glow);
    for (let i = 0; i < 3; i++) {
      const shard = new THREE.Mesh(this.trashProjectileShardGeometry, this.trashProjectileMaterial);
      const angle = i * Math.PI * 2 / 3;
      shard.position.set(Math.cos(angle) * 0.42, Math.sin(angle * 2) * 0.2, Math.sin(angle) * 0.42);
      shard.rotation.set(angle * 0.6, angle, angle * 0.4);
      scrap.add(shard);
    }
    scrap.position.copy(start);
    this.worldGroup.add(scrap);
    this.trashProjectiles.push({ mesh: scrap, velocity, life: flightTime + 0.8, radius: 0.95 });
  }

  updateTrashProjectiles(playerPos, dt, onPlayerHit) {
    const targetY = playerPos.y + 0.9;
    for (let i = this.trashProjectiles.length - 1; i >= 0; i--) {
      const projectile = this.trashProjectiles[i];
      projectile.velocity.y -= this.trashProjectileGravity * dt;
      projectile.mesh.position.addScaledVector(projectile.velocity, dt);
      projectile.mesh.rotation.x += dt * 4.2;
      projectile.mesh.rotation.y += dt * 5.1;
      projectile.life -= dt;

      const dx = projectile.mesh.position.x - playerPos.x;
      const dy = projectile.mesh.position.y - targetY;
      const dz = projectile.mesh.position.z - playerPos.z;
      if (dx * dx + dy * dy + dz * dz < projectile.radius * projectile.radius) {
        const horizontal = new THREE.Vector3(-dx, 0, -dz);
        if (horizontal.lengthSq() < 0.01) horizontal.set(-projectile.velocity.x, 0, -projectile.velocity.z);
        horizontal.normalize().multiplyScalar(6.8);
        horizontal.y = 3.4;
        const damage = Math.max(6, Math.round(12 * this.damageMultiplier));
        if (onPlayerHit) onPlayerHit(damage, horizontal);
        this.worldGroup.remove(projectile.mesh);
        this.trashProjectiles.splice(i, 1);
        continue;
      }

      if (projectile.life <= 0 || projectile.mesh.position.y < -0.25) {
        this.worldGroup.remove(projectile.mesh);
        this.trashProjectiles.splice(i, 1);
      }
    }
  }

  spawnShockwave(center) {
    const geo = new THREE.RingGeometry(0.6, 1.6, 48);
    const mat = new THREE.MeshBasicMaterial({
      color: this.isEnraged ? 0xef4444 : 0x00ff88,
      transparent: true,
      opacity: 0.95,
      side: THREE.DoubleSide
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.copy(center).add(new THREE.Vector3(0, 0.08, 0));
    this.worldGroup.add(mesh);

    this.shockwaves.push({ mesh, life: 1.3, maxLife: 1.3 });
  }

  takeDamage(amount) {
    this.hp = Math.max(0, this.hp - amount);
    TrashGame.Sound.playBossHit();

    // Damage Flash
    if (this.core) {
      this.core.scale.set(1.5, 1.5, 1.5);
      setTimeout(() => {
        if (this.core) this.core.scale.set(1, 1, 1);
      }, 150);
    }

    return this.hp;
  }

  triggerScreenShake() {
    const container = document.getElementById('three-container');
    if (!container) return;
    container.classList.add('animate-bounce');
    setTimeout(() => container.classList.remove('animate-bounce'), 380);
  }

  destroy() {
    this.trashProjectiles.forEach(projectile => this.worldGroup.remove(projectile.mesh));
    this.trashProjectiles = [];
    this.trashProjectileGeometry.dispose();
    this.trashProjectileShardGeometry.dispose();
    this.trashProjectileMaterial.dispose();
    this.trashProjectileGlowMaterial.dispose();
    this.shockwaves.forEach(sw => {
      this.worldGroup.remove(sw.mesh);
      if (sw.mesh.geometry) sw.mesh.geometry.dispose();
      if (sw.mesh.material) sw.mesh.material.dispose();
    });
    this.shockwaves = [];
    this.worldGroup.remove(this.group);
    this.group.traverse(node => {
      if (!node.isMesh) return;
      if (node.geometry) node.geometry.dispose();
      if (node.material) {
        const materials = Array.isArray(node.material) ? node.material : [node.material];
        materials.forEach(material => material.dispose());
      }
    });
  }
};
