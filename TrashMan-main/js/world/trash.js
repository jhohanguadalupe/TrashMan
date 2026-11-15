/* =========================================================================
   TRASH MAN 3D - ADVANCED RESIDUE PHYSICS & CYCLONIC SUCTION ENGINE
   PBR Waste Meshes, Swirling Suction Vortex Particles & Dynamic Streak Combos
   ========================================================================= */

window.TrashGame = window.TrashGame || {};

TrashGame.TrashManager = class {
  constructor(worldGroup, particlesGroup) {
    this.worldGroup = worldGroup;
    this.particlesGroup = particlesGroup;
    this.items = [];
    this.comboCount = 0;
    this.comboTimer = 0;
  }

  clear() {
    this.items.forEach(t => this.worldGroup.remove(t.mesh));
    this.items = [];
    this.comboCount = 0;
  }

  spawnCluster(type, count, bounds = 65) {
    const difficulty = TrashGame.Difficulties && TrashGame.Difficulties[TrashGame.Main && TrashGame.Main.difficulty || 'medium'];
    if (difficulty) count = Math.max(1, Math.round(count * difficulty.trashMultiplier));
    for (let i = 0; i < count; i++) {
      const isBeach = TrashGame.MapBuilder && TrashGame.MapBuilder.currentMapKey === 'playa';
      const x = (Math.random() - 0.5) * (isBeach ? 76 : bounds);
      const z = isBeach ? 1 + Math.random() * 39 : (Math.random() - 0.5) * bounds;
      if (Math.hypot(x, z) < 5.0) continue; // Safe spawn clearance

      const wasteGroup = new THREE.Group();
      wasteGroup.position.set(x, 0, z);
      wasteGroup.userData.spawnPosition = { x, z };

      if (type === 'bottle') {
        // Real Photorealistic GLTF Water Bottle if available
        if (TrashGame.AssetLoader && TrashGame.AssetLoader.has('bottle')) {
          const realBottle = TrashGame.AssetLoader.getModel('bottle', 2.6);
          realBottle.rotation.z = Math.PI / 2 + (Math.random() - 0.5) * 0.4;
          realBottle.rotation.y = Math.random() * Math.PI * 2;
          realBottle.position.y = 0.08;
          wasteGroup.add(realBottle);
        } else {
          // High-Quality Translucent Plastic PET Bottle Fallback
          const bottleMat = new THREE.MeshPhysicalMaterial({
            color: 0x38bdf8,
            roughness: 0.15,
            transmission: 0.75,
            thickness: 0.4,
            transparent: true,
            opacity: 0.85
          });
          const bottleBody = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.42, 12), bottleMat);
          const bottleNeck = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.1, 0.14, 12), bottleMat);
          bottleNeck.position.y = 0.28;
          const bottleCap = new THREE.Mesh(
            new THREE.CylinderGeometry(0.055, 0.055, 0.05, 12),
            new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.3 })
          );
          bottleCap.position.y = 0.36;

          wasteGroup.add(bottleBody);
          wasteGroup.add(bottleNeck);
          wasteGroup.add(bottleCap);
          wasteGroup.rotation.z = Math.PI / 2 + (Math.random() - 0.5) * 0.4;
          wasteGroup.position.y = 0.12;
        }

      } else if (type === 'can') {
        if (window.TM_MODELS && window.TM_MODELS.prop_lata && window.TM && window.TM.buildStatic) {
          const canProp = window.TM.buildStatic(THREE, 'prop_lata');
          canProp.scale.setScalar(0.72 + Math.random() * 0.18);
          canProp.rotation.set(Math.PI / 2 + (Math.random() - 0.5) * 0.4, Math.random() * Math.PI * 2, (Math.random() - 0.5) * 0.18);
          canProp.position.y = 0.04;
          wasteGroup.add(canProp);
        // Photorealistic GLB alternatives remain available when the Trash Man can is unavailable.
        } else if (TrashGame.AssetLoader && TrashGame.AssetLoader.has('boombox') && Math.random() > 0.4) {
          const realBoom = TrashGame.AssetLoader.getModel('boombox', 0.007);
          realBoom.position.y = 0.1;
          realBoom.rotation.y = Math.random() * Math.PI * 2;
          wasteGroup.add(realBoom);
        } else if (TrashGame.AssetLoader && TrashGame.AssetLoader.has('mug')) {
          const realMug = TrashGame.AssetLoader.getModel('mug', 0.18);
          realMug.position.y = 0.05;
          realMug.rotation.x = Math.PI / 2.2;
          wasteGroup.add(realMug);
        } else {
          // Crushed Metallic Soda Can Fallback
          const canMat = new THREE.MeshStandardMaterial({
            color: 0xef4444,
            metalness: 0.9,
            roughness: 0.25
          });
          const can = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, 0.34, 16), canMat);
          const rimMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, metalness: 0.95, roughness: 0.1 });
          const topRim = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.02, 16), rimMat);
          topRim.position.y = 0.175;

          wasteGroup.add(can);
          wasteGroup.add(topRim);
          wasteGroup.rotation.x = Math.PI / 2.3;
          wasteGroup.rotation.y = Math.random() * Math.PI;
          wasteGroup.position.y = 0.13;
        }

      } else if (type === 'tire') {
        // Weathered Rubber Tread Tire
        const tireMat = new THREE.MeshStandardMaterial({
          color: 0x09090b,
          roughness: 0.92,
          metalness: 0.08
        });
        const tire = new THREE.Mesh(new THREE.TorusGeometry(0.38, 0.17, 12, 24), tireMat);
        tire.rotation.x = Math.PI / 2;
        tire.position.y = 0.17;
        wasteGroup.add(tire);

      } else {
        // Corroded Toxic Waste Drum
        const barrelMat = new THREE.MeshStandardMaterial({
          color: 0xd97706,
          metalness: 0.6,
          roughness: 0.45
        });
        const drum = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.38, 0.9, 16), barrelMat);
        drum.position.y = 0.45;
        drum.castShadow = true;
        wasteGroup.add(drum);

        // Toxic Sludge Leak
        const leakMat = new THREE.MeshStandardMaterial({
          color: 0x00ff88,
          emissive: 0x00ff88,
          emissiveIntensity: 0.85
        });
        const band1 = new THREE.Mesh(new THREE.TorusGeometry(0.39, 0.025, 8, 24), leakMat);
        band1.rotation.x = Math.PI / 2;
        band1.position.y = 0.45;
        wasteGroup.add(band1);

        if (window.TM_MODELS && window.TM_MODELS.prop_vial_gel && window.TM && window.TM.buildStatic) {
          const gelVial = window.TM.buildStatic(THREE, 'prop_vial_gel');
          gelVial.scale.setScalar(0.34);
          gelVial.position.set(0.16, 0.12, 0.34);
          gelVial.rotation.z = -0.28;
          wasteGroup.add(gelVial);
        }
      }

      this.worldGroup.add(wasteGroup);
      this.items.push({ mesh: wasteGroup, type, collected: false, id: Math.random() });
    }
  }

  update(playerPos, isCleaningTriggered, dt, onCollectedCallback) {
    if (this.comboCount > 0) {
      this.comboTimer -= dt;
      if (this.comboTimer <= 0) {
        this.comboCount = 0;
        const banner = document.getElementById('hud-combo-banner');
        if (banner) banner.classList.add('hidden');
      }
    }

    if (TrashGame.StoryMode && TrashGame.StoryMode.active && TrashGame.StoryMode.isAtCapacity()) {
      TrashGame.StoryMode.notifyFullBag();
      return;
    }

    const vacuumLevel = TrashGame.State && TrashGame.State.player.upgrades
      ? TrashGame.State.player.upgrades.vacuumLevel || 0 : 0;
    const vacuumRadius = 6.2 + vacuumLevel * 1.25;

    this.items.forEach(item => {
      if (TrashGame.StoryMode && TrashGame.StoryMode.active &&
          (TrashGame.StoryMode.isAtCapacity() || TrashGame.StoryMode.waitingForDeposit)) return;
      if (item.collected) return;

      const dist = item.mesh.position.distanceTo(playerPos);

      // Suction vacuum radius: 6.2 meters
      if (dist < vacuumRadius && isCleaningTriggered) {
        this.createCyclonicVortexParticle(item.mesh.position, playerPos);

        // Accelerating pull & spin
        item.mesh.position.lerp(playerPos, 0.12);
        item.mesh.rotation.y += 0.25;
        item.mesh.rotation.x += 0.15;
        item.mesh.scale.multiplyScalar(0.92);

        if (dist < 1.4 || item.mesh.scale.x < 0.15) {
          item.collected = true;
          this.worldGroup.remove(item.mesh);

          this.comboCount++;
          this.comboTimer = 2.8;

          let bonus = 20;
          if (this.comboCount >= 2) bonus += (this.comboCount * 6);

          TrashGame.Sound.playVacuumPop();

          if (onCollectedCallback) {
            onCollectedCallback(bonus, this.comboCount, {
              x: item.mesh.userData.spawnPosition ? item.mesh.userData.spawnPosition.x : item.mesh.position.x,
              z: item.mesh.userData.spawnPosition ? item.mesh.userData.spawnPosition.z : item.mesh.position.z,
              kind: item.type
            });
          }
        }
      }
    });
  }

  createCyclonicVortexParticle(startPos, playerPos) {
    const pGeo = new THREE.SphereGeometry(0.065, 8, 8);
    const pMat = new THREE.MeshBasicMaterial({
      color: Math.random() > 0.5 ? 0x00ff88 : 0x06b6d4,
      transparent: true,
      opacity: 0.95
    });
    const p = new THREE.Mesh(pGeo, pMat);
    p.position.copy(startPos);
    this.particlesGroup.add(p);

    const target = playerPos.clone().add(new THREE.Vector3(0, 1.25, 0));
    let progress = 0;
    const swirlAngle = Math.random() * Math.PI * 2;

    const step = () => {
      progress += 0.1;
      p.position.lerp(target, progress);
      // Spiral cyclone vortex offset
      const spiralRad = (1 - progress) * 0.45;
      p.position.x += Math.cos(swirlAngle + progress * 8) * spiralRad;
      p.position.z += Math.sin(swirlAngle + progress * 8) * spiralRad;

      if (progress < 1) {
        requestAnimationFrame(step);
      } else {
        this.particlesGroup.remove(p);
      }
    };
    step();
  }

  getClosest(pos) {
    let closest = null;
    let minD = 9999;
    this.items.forEach(t => {
      if (!t.collected) {
        const d = t.mesh.position.distanceTo(pos);
        if (d < minD) {
          minD = d;
          closest = t;
        }
      }
    });
    return { item: closest, distance: minD };
  }
};
