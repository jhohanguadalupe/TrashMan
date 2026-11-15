/* =========================================================================
   TRASH MAN 3D - CLEAN, VIBRANT & DELIMITED PROCEDURAL ENVIRONMENTS
   Unified Beach Terrain, Marine Buoy Perimeter, Tropical Ocean & Natural Foliage
   ========================================================================= */

window.TrashGame = window.TrashGame || {};

TrashGame.MapBuilder = {
  activeWaterMesh: null,
  sunMesh: null,
  clouds: [],
  currentMapKey: 'playa',
  colliders: [],

  addCircleCollider(x, z, radius) {
    this.colliders.push({ type: 'circle', x, z, radius });
  },

  addBoxCollider(x, z, halfX, halfZ) {
    this.colliders.push({ type: 'box', x, z, halfX, halfZ });
  },

  signedDistanceToCollider(pos, obstacle) {
    if (obstacle.type === 'box') {
      const qx = Math.abs(pos.x - obstacle.x) - obstacle.halfX;
      const qz = Math.abs(pos.z - obstacle.z) - obstacle.halfZ;
      return Math.hypot(Math.max(qx, 0), Math.max(qz, 0)) + Math.min(Math.max(qx, qz), 0);
    }
    return Math.hypot(pos.x - obstacle.x, pos.z - obstacle.z) - (obstacle.radius || 0.5);
  },

  canMoveTo(from, to, playerRadius, colliders) {
    for (const obstacle of colliders) {
      const fromDistance = this.signedDistanceToCollider(from, obstacle);
      const toDistance = this.signedDistanceToCollider(to, obstacle);
      if (toDistance < playerRadius && !(fromDistance < playerRadius && toDistance > fromDistance)) return false;
    }
    return true;
  },

  resolvePlayerMovement(from, to, playerRadius = 0.42, dynamicColliders = []) {
    const dx = to.x - from.x;
    const dz = to.z - from.z;
    const steps = Math.max(1, Math.ceil(Math.max(Math.abs(dx), Math.abs(dz)) / 0.18));
    const colliders = dynamicColliders.length ? this.colliders.concat(dynamicColliders) : this.colliders;
    const result = from.clone();
    result.y = to.y;
    for (let step = 1; step <= steps; step++) {
      const nextX = from.x + dx * (step / steps);
      const nextZ = from.z + dz * (step / steps);
      const tryX = result.clone();
      tryX.x = nextX;
      if (this.canMoveTo(result, tryX, playerRadius, colliders)) result.x = nextX;
      const tryZ = result.clone();
      tryZ.z = nextZ;
      if (this.canMoveTo(result, tryZ, playerRadius, colliders)) result.z = nextZ;
    }
    return result;
  },

  // Map boundary physics definitions
  bounds: {
    playa: { minX: -44, maxX: 44, minZ: -5, maxZ: 46 },
    bosque: { minX: -46, maxX: 46, minZ: -46, maxZ: 46 },
    rio: { minX: -46, maxX: 46, minZ: -46, maxZ: 46 },
    ciudad: { minX: -44, maxX: 44, minZ: -44, maxZ: 44 },
    boss_arena: { radius: 29.0 }
  },

  clampPlayerPosition(pos) {
    const b = this.bounds[this.currentMapKey] || this.bounds.playa;
    if (b.radius) {
      const d = Math.hypot(pos.x, pos.z);
      if (d > b.radius) {
        const angle = Math.atan2(pos.z, pos.x);
        pos.x = Math.cos(angle) * b.radius;
        pos.z = Math.sin(angle) * b.radius;
        return true;
      }
    } else {
      let hit = false;
      if (pos.x < b.minX) { pos.x = b.minX; hit = true; }
      if (pos.x > b.maxX) { pos.x = b.maxX; hit = true; }
      if (pos.z < b.minZ) { pos.z = b.minZ; hit = true; }
      if (pos.z > b.maxZ) { pos.z = b.maxZ; hit = true; }
      return hit;
    }
    return false;
  },

  build(scene, worldGroup, mapId, trashManager) {
    if (TrashGame.Monsters) TrashGame.Monsters.clear(worldGroup);
    while (worldGroup.children.length > 0) {
      worldGroup.remove(worldGroup.children[0]);
    }
    this.activeWaterMesh = null;
    this.sunMesh = null;
    this.clouds = [];
    this.colliders = [];
    this.currentMapKey = mapId;
    trashManager.clear();

    const data = TrashGame.MapsData[mapId] || TrashGame.MapsData.playa;

    scene.background = new THREE.Color(data.skyColor);
    scene.fog = new THREE.Fog(data.fogColor, data.fogNear || 80, data.fogFar || 260);

    // Atmospheric Sky Dome
    const domeGeo = new THREE.SphereGeometry(220, 64, 32);
    let domeMat = null;
    if (TrashGame.Graphics && TrashGame.Graphics.enabled && TrashGame.Graphics.presets[mapId]) {
      TrashGame.Graphics.skyUniformSets.length = 0;
      TrashGame.Graphics.foamMeshes.length = 0;
      domeMat = TrashGame.Graphics.safe(() => TrashGame.Graphics.createSkyMaterial(mapId), 'sky');
    }
    if (!domeMat) {
      domeMat = new THREE.MeshBasicMaterial({
        color: data.skyColor,
        side: THREE.BackSide,
        fog: false
      });
    }
    const dome = new THREE.Mesh(domeGeo, domeMat);
    dome.renderOrder = -10;
    dome.frustumCulled = false;
    worldGroup.add(dome);

    if (data.hasSun) {
      this.createRadiantSun(worldGroup, data.sunPosition, data.sunColor);
      this.createSkyClouds(worldGroup);
    }

    if (mapId === 'playa') {
      this.buildPlaya(worldGroup, trashManager);
    } else if (mapId === 'bosque') {
      this.buildBosque(worldGroup, trashManager);
    } else if (mapId === 'rio') {
      this.buildRio(worldGroup, trashManager);
    } else if (mapId === 'ciudad') {
      this.buildCiudad(worldGroup, trashManager);
    } else if (mapId === 'boss_arena') {
      this.buildBossArena(worldGroup);
    }

    if (mapId !== 'boss_arena') this.addRecyclingStation(worldGroup, mapId);

    if (TrashGame.Graphics && TrashGame.Graphics.enabled) {
      TrashGame.Graphics.applyMapAtmosphere(scene, mapId);
    }
  },

  addRecyclingStation(group, mapId) {
    if (!window.TM_MODELS || !window.TM || !window.TM.buildStatic) return;
    const stationSpot = TrashGame.MapsData[mapId] && TrashGame.MapsData[mapId].recyclingStation;
    const spot = stationSpot ? [stationSpot.x, stationSpot.z] : null;
    if (!spot) return;
    const station = new THREE.Group();
    station.position.set(spot[0], 0, spot[1]);
    const bin = window.TM.buildStatic(THREE, 'herramienta_contenedor_reciclaje');
    bin.scale.setScalar(1.25);
    station.add(bin);
    const bag = window.TM.buildStatic(THREE, 'herramienta_bolsa_basura');
    bag.scale.setScalar(0.85);
    bag.position.set(0.78, 0, 0.14);
    bag.rotation.y = 0.35;
    station.add(bag);
    station.traverse(node => {
      if (node.isMesh) {
        node.castShadow = false;
        node.receiveShadow = true;
      }
    });
    group.add(station);
    this.addBoxCollider(spot[0], spot[1], 0.95, 0.78);
  },

  createRadiantSun(group, pos = { x: 50, y: 65, z: -60 }, sunColor = 0xfff7ed) {
    const sunGroup = new THREE.Group();
    sunGroup.position.set(pos.x, pos.y, pos.z);

    const sunGeo = new THREE.SphereGeometry(7, 24, 24);
    const sunMat = new THREE.MeshBasicMaterial({ color: 0xffffff, fog: false, toneMapped: false });
    sunMat.color.setRGB(7.0, 6.4, 5.2); // HDR value so the sun blooms naturally
    const sunMesh = new THREE.Mesh(sunGeo, sunMat);
    sunGroup.add(sunMesh);

    const flareGeo = new THREE.SphereGeometry(11, 16, 16);
    const flareMat = new THREE.MeshBasicMaterial({
      color: 0xfef08a,
      transparent: true,
      opacity: 0.5,
      fog: false
    });
    const flare = new THREE.Mesh(flareGeo, flareMat);
    sunGroup.add(flare);

    group.add(sunGroup);
    this.sunMesh = sunGroup;
  },

  createSkyClouds(group) {
    const cloudMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.95,
      transparent: true,
      opacity: 0.88,
      fog: false
    });

    const cloudCoords = [
      { x: -45, y: 48, z: -60, scale: 1.6 },
      { x: 35, y: 52, z: -50, scale: 1.8 },
      { x: -75, y: 50, z: 25, scale: 2.1 },
      { x: 60, y: 46, z: 45, scale: 1.5 }
    ];

    cloudCoords.forEach(c => {
      const cGroup = new THREE.Group();
      cGroup.position.set(c.x, c.y, c.z);
      cGroup.scale.set(c.scale, c.scale * 0.55, c.scale);

      const p1 = new THREE.Mesh(new THREE.SphereGeometry(7, 12, 12), cloudMat);
      const p2 = new THREE.Mesh(new THREE.SphereGeometry(5.5, 12, 12), cloudMat);
      p2.position.set(-6, -1, 0);
      const p3 = new THREE.Mesh(new THREE.SphereGeometry(6, 12, 12), cloudMat);
      p3.position.set(6, -0.5, 1);

      cGroup.add(p1);
      cGroup.add(p2);
      cGroup.add(p3);
      group.add(cGroup);
      this.clouds.push(cGroup);
    });
  },

  // =========================================================================
  // 1. PLAYA CRISTALINA - UNIFIED SEAMLESS BEACH & NATURAL CARIBBEAN SEA
  // =========================================================================
  buildPlaya(worldGroup, trashManager) {
    // 1. Unified Continuous Sand Ground (No disjointed plates!)
    const sandTex = TrashGame.Textures.getSand();
    sandTex.repeat.set(12, 12);

    const sandGeo = new THREE.PlaneGeometry(160, 110, 36, 28);
    const pos = sandGeo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const u = pos.getX(i);
      const v = pos.getY(i);
      // Gentle slope rising toward the back dunes (cliff side, +Z). Local v maps to world z = 22 - v,
      // so the cliff side is v < -22. (Previously inverted: the dune walled off the ocean.)
      const duneElev = Math.max(0, -v - 22) * 0.12;
      const sideElev = Math.max(0, Math.abs(u) - 36) * 0.14;
      pos.setZ(i, duneElev + sideElev);
    }
    sandGeo.computeVertexNormals();

    const sandMat = new THREE.MeshStandardMaterial({
      map: sandTex,
      color: 0xd7c294,
      bumpMap: TrashGame.Textures.getSurfaceBump(),
      bumpScale: 0.018,
      roughness: 0.99,
      metalness: 0.0
    });
    const sand = new THREE.Mesh(sandGeo, sandMat);
    sand.rotation.x = -Math.PI / 2;
    sand.position.set(0, 0, 22);
    sand.receiveShadow = true;
    worldGroup.add(sand);

    // 2. Vast Realistic Caribbean Sea (Extends to horizon)
    const waterNormal = TrashGame.Textures.getWaterNormal();
    waterNormal.repeat.set(24, 18);

    const oceanGeo = new THREE.PlaneGeometry(320, 200, 48, 36);
    const oceanMat = new THREE.MeshPhysicalMaterial({
      color: 0x15586d,
      roughness: 0.48,
      metalness: 0.0,
      clearcoat: 0.24,
      clearcoatRoughness: 0.5,
      normalMap: waterNormal,
      normalScale: new THREE.Vector2(0.48, 0.48),
      transparent: false,
      opacity: 1
    });
    if (TrashGame.Graphics) TrashGame.Graphics.upgradeWaterMaterial(oceanMat);
    const ocean = new THREE.Mesh(oceanGeo, oceanMat);
    ocean.rotation.x = -Math.PI / 2;
    ocean.position.set(0, 0.18, -105);
    ocean.receiveShadow = true;
    worldGroup.add(ocean);
    this.activeWaterMesh = ocean;

    // Broken, curved foam bands replace the flat white shoreline stripe.
    for (let i = 0; i < 8; i++) {
      const length = 13 + Math.random() * 8;
      const points = [];
      for (let j = 0; j < 5; j++) {
        const x = (j / 4 - 0.5) * length;
        const z = Math.sin(j * 0.9 + i) * 0.22;
        const y = Math.sin(j * 1.2 + i * 0.6) * 0.06;
        points.push(new THREE.Vector3(x, y, z));
      }
      const curve = new THREE.CatmullRomCurve3(points);
      const surf = new THREE.Mesh(
        new THREE.TubeGeometry(curve, 28, 0.055 + Math.random() * 0.035, 5, false),
        new THREE.MeshStandardMaterial({ color: 0xcbd8d3, roughness: 0.88, transparent: true, opacity: 0.24, depthWrite: false })
      );
      const baseZ = -5.2 + (Math.random() - 0.5) * 1.2;
      surf.position.set((Math.random() - 0.5) * 82, 0.22, baseZ);
      surf.userData.baseZ = baseZ;
      surf.userData.phase = Math.random() * Math.PI * 2;
      worldGroup.add(surf);
      if (TrashGame.Graphics) TrashGame.Graphics.foamMeshes.push(surf);
    }

    // 3. PHYSICAL & VISUAL BOUNDARIES
    // Marine Buoy Safety Line at shoreline (z = -5.0)
    this.createMarineBuoyLine(worldGroup, -44, 44, -5.2);

    // Coastal Wooden Post Fences at boundaries
    this.createCoastalFence(worldGroup, -44, -44, -5.2, 46, true);
    this.createCoastalFence(worldGroup, 44, 44, -5.2, 46, true);
    this.createCoastalFence(worldGroup, -44, 44, 46, 46, false);

    // 4. REALISTIC PERUVIAN PACIFIC COAST ENVIRONMENT (Costa Verde & Paracas)
    // Towering coastal desert cliffs / bluffs (No jungle palms!)
    this.createPeruvianCliffs(worldGroup);

    // Authentic Beach Umbrellas & Loungers (Sombrillas y toldos de playa)
    this.createBeachUmbrella(worldGroup, -16, 16, 0xef4444);
    this.createBeachUmbrella(worldGroup, 16, 18, 0x0284c7);
    this.createBeachUmbrella(worldGroup, -20, 26, 0xf59e0b);
    this.createBeachUmbrella(worldGroup, 20, 28, 0x10b981);
    this.createBeachUmbrella(worldGroup, 0, 32, 0xec4899);

    // Colorful Peruvian Surfboards planted in the sand (Miraflores / Punta Hermosa surf culture)
    this.createSurfboard(worldGroup, -13, 15, 0xef4444);
    this.createSurfboard(worldGroup, 13, 17, 0x38bdf8);
    this.createSurfboard(worldGroup, -22, 25, 0xfacc15);
    this.createSurfboard(worldGroup, 22, 27, 0x22c55e);

    // Natural Coastal Granite Rocks (Natural size 1.0 - 1.4m, Slate Grey)
    const rockLocations = [
      { x: -36, z: 8 }, { x: -40, z: 22 }, { x: 38, z: 10 }, { x: 41, z: 24 },
      { x: -18, z: 36 }, { x: 20, z: 38 }, { x: -5, z: 42 }, { x: 12, z: 42 }
    ];
    rockLocations.forEach(r => this.createRealisticRock(worldGroup, r.x, r.z, 0x475569, 1.3));

    // Wooden Eco Signs
    this.createWoodenSign(worldGroup, -5, 10, 'PLAYA COSTA PACÍFICO');
    this.createWoodenSign(worldGroup, 5, 24, 'ZONA PROTEGIDA');

    // 5. LIVING ECOSYSTEM (Bañistas paseando, gente tomando sol, gaviotas volando)
    if (TrashGame.WorldLife) {
      TrashGame.WorldLife.spawnForMap('playa', worldGroup);
    }

    // Spawn Beach Trash
    trashManager.spawnCluster('bottle', 14);
    trashManager.spawnCluster('can', 10);
    trashManager.spawnCluster('tire', 6);
    trashManager.spawnCluster('barrel', 4);
  },

  // Acantilados Costeros de la Costa Verde / Paracas (Peru Pacific Bluffs)
  createPeruvianCliffs(group) {
    const cliffMatSandstone = new THREE.MeshStandardMaterial({
      color: 0xba8d5b,
      roughness: 0.95,
      metalness: 0.05
    });
    const cliffMatClay = new THREE.MeshStandardMaterial({
      color: 0x936639,
      roughness: 0.98,
      metalness: 0.02
    });
    const cliffMatDark = new THREE.MeshStandardMaterial({
      color: 0x6f4e37,
      roughness: 0.92,
      metalness: 0.08
    });

    // Acantilados monumentales en el fondo que cierran naturalmente la playa
    for (let x = -48; x <= 48; x += 6.5) {
      const height = 9.5 + Math.sin(x * 0.22) * 3.5;
      const cGeo = new THREE.CylinderGeometry(4.0, 5.0, height, 8);
      const mat = (Math.abs(Math.round(x)) % 3 === 0) ? cliffMatSandstone : (Math.abs(Math.round(x)) % 2 === 0 ? cliffMatClay : cliffMatDark);
      const cliff = new THREE.Mesh(cGeo, mat);
      cliff.position.set(x, height / 2 - 0.5, 48.0 + Math.cos(x * 0.3) * 1.8);
      cliff.rotation.y = Math.sin(x);
      cliff.castShadow = true;
      cliff.receiveShadow = true;
      group.add(cliff);
      this.addCircleCollider(x, cliff.position.z, 3.5);

      // Cornisa / estrato sedimentario inferior
      const ledge = new THREE.Mesh(new THREE.BoxGeometry(6.6, 1.8, 3.8), cliffMatClay);
      ledge.position.set(x, 0.9, 44.5);
      ledge.castShadow = true;
      group.add(ledge);
      this.addBoxCollider(x, 44.5, 3.3, 1.9);
    }

    // Acantilados en los flancos laterales izquierdo y derecho
    [-48, 48].forEach(fx => {
      for (let z = 0; z <= 44; z += 6.8) {
        const height = 8.5 + Math.cos(z * 0.3) * 3.0;
        const cGeo = new THREE.CylinderGeometry(3.8, 4.8, height, 8);
        const cliff = new THREE.Mesh(cGeo, cliffMatClay);
        cliff.position.set(fx, height / 2 - 0.5, z);
        cliff.castShadow = true;
        group.add(cliff);
        this.addCircleCollider(fx, z, 3.7);
      }
    });
  },

  // Marine Buoy Safety Perimeter
  createMarineBuoyLine(group, startX, endX, zPos) {
    const buoyMatRed = new THREE.MeshStandardMaterial({ color: 0xef4444, roughness: 0.3 });
    const buoyMatYellow = new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.3 });
    const ropeMat = new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.8 });

    const cableGeo = new THREE.CylinderGeometry(0.04, 0.04, endX - startX, 8);
    const cable = new THREE.Mesh(cableGeo, ropeMat);
    cable.rotation.z = Math.PI / 2;
    cable.position.set((startX + endX) / 2, 0.42, zPos);
    group.add(cable);

    for (let x = startX; x <= endX; x += 5.5) {
      const isRed = Math.round(x) % 2 === 0;
      const buoy = new THREE.Mesh(new THREE.SphereGeometry(0.4, 14, 14), isRed ? buoyMatRed : buoyMatYellow);
      buoy.position.set(x, 0.42, zPos);
      buoy.castShadow = true;
      group.add(buoy);
    }
  },

  // Coastal Wooden Post Fence
  createCoastalFence(group, x1, x2, z1, z2, isVertical) {
    const woodMat = new THREE.MeshStandardMaterial({ color: 0x5c3d1e, roughness: 0.9 });
    const ropeMat = new THREE.MeshStandardMaterial({ color: 0xb48248, roughness: 0.7 });

    if (isVertical) {
      for (let z = z1; z <= z2; z += 4.5) {
        const post = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.15, 1.8, 8), woodMat);
        post.position.set(x1, 0.9, z);
        post.castShadow = true;
        group.add(post);
      }
      const ropeH = z2 - z1;
      [0.6, 1.2].forEach(y => {
        const rope = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, ropeH, 8), ropeMat);
        rope.position.set(x1, y, (z1 + z2) / 2);
        group.add(rope);
      });
    } else {
      for (let x = x1; x <= x2; x += 4.5) {
        const post = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.15, 1.8, 8), woodMat);
        post.position.set(x, 0.9, z1);
        post.castShadow = true;
        group.add(post);
      }
      const ropeW = x2 - x1;
      [0.6, 1.2].forEach(y => {
        const rope = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, ropeW, 8), ropeMat);
        rope.rotation.z = Math.PI / 2;
        rope.position.set((x1 + x2) / 2, y, z1);
        group.add(rope);
      });
    }
  },

  // Striped Beach Umbrella & Lounger
  createBeachUmbrella(group, x, z, primaryColor = 0xef4444) {
    const umbGroup = new THREE.Group();
    umbGroup.position.set(x, 0, z);

    const pole = new THREE.Mesh(
      new THREE.CylinderGeometry(0.05, 0.05, 3.2, 8),
      new THREE.MeshStandardMaterial({ color: 0xd4d4d8, metalness: 0.8 })
    );
    pole.position.y = 1.6;
    pole.rotation.z = 0.06;
    pole.castShadow = true;
    umbGroup.add(pole);

    const canopyMat = new THREE.MeshStandardMaterial({ color: primaryColor, roughness: 0.6, side: THREE.DoubleSide });
    const canopy = new THREE.Mesh(new THREE.ConeGeometry(2.2, 0.85, 12), canopyMat);
    canopy.position.set(0.1, 3.0, 0);
    canopy.castShadow = true;
    umbGroup.add(canopy);

    const bedMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.5 });
    const lounger = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.22, 1.9), bedMat);
    lounger.position.set(0.8, 0.16, 0);
    lounger.rotation.y = -Math.PI / 6;
    lounger.castShadow = true;
    umbGroup.add(lounger);

    group.add(umbGroup);
    this.addCircleCollider(x, z, 0.48);
  },

  createSurfboard(group, x, z, color = 0xef4444) {
    const boardGroup = new THREE.Group();
    boardGroup.position.set(x, 0.8, z);
    boardGroup.rotation.z = Math.PI / 7;

    const boardMat = new THREE.MeshStandardMaterial({ color, roughness: 0.25, metalness: 0.3 });
    const board = new THREE.Mesh(new THREE.BoxGeometry(0.42, 1.8, 0.08), boardMat);
    board.castShadow = true;
    boardGroup.add(board);

    const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.08, 1.81, 0.085), new THREE.MeshStandardMaterial({ color: 0xffffff }));
    boardGroup.add(stripe);

    group.add(boardGroup);
    this.addCircleCollider(x, z, 0.32);
  },

  createWoodenSign(group, x, z, text) {
    const signGroup = new THREE.Group();
    signGroup.position.set(x, 0, z);

    const postMat = new THREE.MeshStandardMaterial({ color: 0x4a2e12, roughness: 0.9 });
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 1.8, 8), postMat);
    post.position.y = 0.9;
    signGroup.add(post);

    const boardMat = new THREE.MeshStandardMaterial({ color: 0x7c4f24, roughness: 0.8 });
    const board = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.5, 0.08), boardMat);
    board.position.set(0, 1.5, 0);
    board.castShadow = true;
    signGroup.add(board);

    group.add(signGroup);
    this.addCircleCollider(x, z, 0.24);
  },

  // =========================================================================
  // 2. BOSQUE PROFUNDO
  // =========================================================================
  buildBosque(worldGroup, trashManager) {
    const forestTex = TrashGame.Textures.getForestTerrain();
    forestTex.repeat.set(6, 6);

    const groundGeo = new THREE.PlaneGeometry(120, 120, 36, 36);
    const groundPos = groundGeo.attributes.position;
    for (let i = 0; i < groundPos.count; i++) {
      const x = groundPos.getX(i), z = groundPos.getY(i);
      const hills = Math.sin(x * 0.075) * 0.5 + Math.cos(z * 0.065) * 0.38 + Math.sin((x + z) * 0.04) * 0.32;
      const clearing = Math.max(0, 1 - Math.hypot(x, z) / 19);
      groundPos.setZ(i, hills * (1 - clearing * 0.72));
    }
    groundGeo.computeVertexNormals();
    const groundMat = new THREE.MeshStandardMaterial({ map: forestTex, bumpMap: TrashGame.Textures.getSurfaceBump(), bumpScale: 0.075, roughness: 0.96 });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    worldGroup.add(ground);

    this.createStoneWallBoundary(worldGroup, -46, 46, -46, 46);

    for (let i = 0; i < 48; i++) {
      const x = (Math.random() - 0.5) * 85;
      const z = (Math.random() - 0.5) * 85;
      if (Math.hypot(x, z) < 6) continue;
      this.createDetailedPine(worldGroup, x, z);
    }

    for (let i = 0; i < 20; i++) {
      const x = (Math.random() - 0.5) * 82;
      const z = (Math.random() - 0.5) * 82;
      this.createRealisticRock(worldGroup, x, z, 0x334155, 1.4);
    }

    // Ferns and low brush break up the repeated tree silhouettes.
    for (let i = 0; i < 32; i++) {
      const x = (Math.random() - 0.5) * 82;
      const z = (Math.random() - 0.5) * 82;
      if (Math.hypot(x, z) < 7) continue;
      this.createForestUnderstory(worldGroup, x, z, 0.65 + Math.random() * 0.8);
    }

    // Fauna silvestre viva (Ciervos pastando, conejos dando saltos)
    if (TrashGame.WorldLife) {
      TrashGame.WorldLife.spawnForMap('bosque', worldGroup);
    }

    trashManager.spawnCluster('barrel', 14);
    trashManager.spawnCluster('bottle', 16);
    trashManager.spawnCluster('can', 12);
    trashManager.spawnCluster('tire', 8);
  },

  // =========================================================================
  // 3. RÍO TURBIO
  // =========================================================================
  buildRio(worldGroup, trashManager) {
    const mudTex = TrashGame.Textures.getRiverMud();
    mudTex.repeat.set(8, 8);

    const mudGeo = new THREE.PlaneGeometry(120, 120, 32, 32);
    const mudPos = mudGeo.attributes.position;
    for (let i = 0; i < mudPos.count; i++) {
      const x = mudPos.getX(i), z = mudPos.getY(i);
      const bank = Math.max(0, 1 - Math.abs(x) / 20);
      const ripples = Math.sin(z * 0.12 + x * 0.035) * 0.18 + Math.cos(x * 0.13) * 0.1;
      mudPos.setZ(i, ripples + bank * 0.12);
    }
    mudGeo.computeVertexNormals();
    const mudMat = new THREE.MeshStandardMaterial({ map: mudTex, bumpMap: TrashGame.Textures.getSurfaceBump(), bumpScale: 0.06, roughness: 0.98 });
    const mud = new THREE.Mesh(mudGeo, mudMat);
    mud.rotation.x = -Math.PI / 2;
    mud.receiveShadow = true;
    worldGroup.add(mud);

    this.createStoneWallBoundary(worldGroup, -46, 46, -46, 46);

    const waterNormal = TrashGame.Textures.getWaterNormal();
    waterNormal.repeat.set(6, 24);

    const riverWidth = 18;
    const riverCenterX = (z) => Math.sin(((z + 60) / 120) * Math.PI * 2.2) * 8;
    const riverGeo = new THREE.PlaneGeometry(riverWidth, 120, 12, 64);
    const riverPositions = riverGeo.attributes.position;
    for (let row = 0; row <= 64; row++) {
      const localY = riverPositions.getY(row * 13);
      const z = -localY;
      const centerX = riverCenterX(z);
      for (let col = 0; col <= 12; col++) {
        const index = row * 13 + col;
        riverPositions.setX(index, riverPositions.getX(index) + centerX);
      }
    }
    riverPositions.needsUpdate = true;
    riverGeo.computeVertexNormals();
    const riverMat = new THREE.MeshPhysicalMaterial({
      color: 0x246b78,
      roughness: 0.24,
      metalness: 0.08,
      clearcoat: 0.65,
      clearcoatRoughness: 0.18,
      normalMap: waterNormal,
      transparent: true,
      opacity: 0.86
    });
    const river = new THREE.Mesh(riverGeo, riverMat);
    river.rotation.x = -Math.PI / 2;
    river.position.y = 0.12;
    river.userData.noCameraCollision = true;
    worldGroup.add(river);
    if (TrashGame.Graphics) TrashGame.Graphics.upgradeWaterMaterial(riverMat);
    this.activeWaterMesh = river;

    // Thin, rough shore foam follows the same bend as the river instead of making a straight band.
    const foamMat = new THREE.MeshStandardMaterial({ color: 0xbce8e0, transparent: true, opacity: 0.24, roughness: 1, metalness: 0, depthWrite: false });
    [-1, 1].forEach(side => {
      const foamGeo = new THREE.PlaneGeometry(0.55, 120, 1, 64);
      const foamPositions = foamGeo.attributes.position;
      for (let row = 0; row <= 64; row++) {
        const z = -foamPositions.getY(row * 2);
        const centerX = riverCenterX(z) + side * (riverWidth * 0.5 + 0.12);
        for (let col = 0; col <= 1; col++) {
          const index = row * 2 + col;
          foamPositions.setX(index, foamPositions.getX(index) + centerX);
        }
      }
      foamPositions.needsUpdate = true;
      foamGeo.computeVertexNormals();
      const foam = new THREE.Mesh(foamGeo, foamMat);
      foam.rotation.x = -Math.PI / 2;
      foam.position.y = 0.145;
      foam.userData.noCameraCollision = true;
      worldGroup.add(foam);
    });

    // A weathered plank crossing makes the river bank path readable at a glance.
    const bridgeCenter = riverCenterX(0);
    const bridgeDeck = new THREE.Group();
    bridgeDeck.position.set(bridgeCenter, 0.22, 0);
    const bridgeMat = new THREE.MeshStandardMaterial({ color: 0x655243, roughness: 0.93, metalness: 0.02 });
    const railMat = new THREE.MeshStandardMaterial({ color: 0x453b33, roughness: 0.9 });
    for (let plank = 0; plank < 15; plank++) {
      const x = -11.2 + plank * 1.6;
      const board = new THREE.Mesh(new THREE.BoxGeometry(1.48, 0.12, 4.6), bridgeMat);
      board.position.x = x;
      board.rotation.y = (Math.random() - 0.5) * 0.025;
      board.castShadow = true;
      board.receiveShadow = true;
      bridgeDeck.add(board);
    }
    [-2.25, 2.25].forEach(z => {
      const rail = new THREE.Mesh(new THREE.BoxGeometry(24, 0.12, 0.16), railMat);
      rail.position.set(0, 0.78, z);
      bridgeDeck.add(rail);
      for (let x = -11; x <= 11; x += 4) {
        const post = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.9, 0.16), railMat);
        post.position.set(x, 0.4, z);
        bridgeDeck.add(post);
      }
    });
    bridgeDeck.traverse(node => { if (node.isMesh) node.userData.noCameraCollision = true; });
    worldGroup.add(bridgeDeck);

    for (let i = 0; i < 22; i++) {
      const z = (Math.random() - 0.5) * 85;
      const x = riverCenterX(z) + (Math.random() > 0.5 ? 1 : -1) * (14 + Math.random() * 10);
      this.createRealisticRock(worldGroup, x, z, 0x1e293b, 1.4);
    }

    for (let i = 0; i < 24; i++) {
      const z = (Math.random() - 0.5) * 86;
      const x = riverCenterX(z) + (Math.random() > 0.5 ? 1 : -1) * (11 + Math.random() * 2.5);
      this.createRiverReed(worldGroup, x, z, 0.7 + Math.random() * 0.8);
    }
    // Gravel bars and driftwood make the banks read as a changing river edge.
    for (let i = 0; i < 14; i++) {
      const z = (Math.random() - 0.5) * 88;
      const x = riverCenterX(z) + (Math.random() > 0.5 ? 1 : -1) * (14 + Math.random() * 6);
      this.createRealisticRock(worldGroup, x, z, i % 2 ? 0x766d5d : 0x46545b, 0.35 + Math.random() * 0.65);
    }

    // Tráfico urbano real (Taxis, sedanes, patrullas PNP en ambos sentidos) y peatones
    if (TrashGame.WorldLife) {
      TrashGame.WorldLife.spawnForMap('rio', worldGroup);
    }

    trashManager.spawnCluster('barrel', 16);
    trashManager.spawnCluster('tire', 14);
    trashManager.spawnCluster('bottle', 14);
  },

  // =========================================================================
  // 4. CIUDAD VERTEDERO
  // =========================================================================
  buildCiudad(worldGroup, trashManager) {
    const asphaltTex = TrashGame.Textures.getAsphalt();
    asphaltTex.repeat.set(5, 5);

    const streetGeo = new THREE.PlaneGeometry(120, 120);
    const streetMat = new THREE.MeshStandardMaterial({
      map: asphaltTex,
      bumpMap: TrashGame.Textures.getSurfaceBump(),
      bumpScale: 0.025,
      roughness: 0.86,
      metalness: 0.06
    });
    const street = new THREE.Mesh(streetGeo, streetMat);
    street.rotation.x = -Math.PI / 2;
    street.receiveShadow = true;
    worldGroup.add(street);

    this.createConcreteBarrierPerimeter(worldGroup, -44, 44, -44, 44);

    // Worn lane paint and rain-darkened puddles give the open block a street scale.
    const laneMat = new THREE.MeshStandardMaterial({ color: 0xc7b978, roughness: 0.88 });
    for (let z = -38; z <= 38; z += 9) {
      const dash = new THREE.Mesh(new THREE.PlaneGeometry(0.18, 4.2), laneMat);
      dash.rotation.x = -Math.PI / 2;
      dash.position.set(0, 0.018, z);
      worldGroup.add(dash);
    }
    const puddleMat = new THREE.MeshStandardMaterial({ color: 0x26383e, roughness: 0.16, metalness: 0.18, transparent: true, opacity: 0.78 });
    for (let i = 0; i < 14; i++) {
      const puddle = new THREE.Mesh(new THREE.CircleGeometry(1 + Math.random() * 2.4, 20), puddleMat);
      puddle.rotation.x = -Math.PI / 2;
      puddle.rotation.z = Math.random() * Math.PI;
      puddle.scale.set(1.2 + Math.random(), 0.35 + Math.random() * 0.5, 1);
      puddle.position.set((Math.random() - 0.5) * 68, 0.025, (Math.random() - 0.5) * 68);
      worldGroup.add(puddle);
    }

    for (let i = 0; i < 28; i++) {
      const x = (Math.random() - 0.5) * 110;
      const z = (Math.random() - 0.5) * 110;
      if (Math.abs(x) < 20 && Math.abs(z) < 20) continue;
      this.createDetailedBuilding(worldGroup, x, z);
    }

    const lampPositions = [
      { x: -14, z: -18 }, { x: -14, z: 18 },
      { x: 14, z: -18 }, { x: 14, z: 18 }
    ];
    lampPositions.forEach(p => this.createStreetLamp(worldGroup, p.x, p.z));

    trashManager.spawnCluster('can', 18);
    trashManager.spawnCluster('tire', 14);
    // Tráfico urbano real (Taxis, sedanes, patrullas PNP en ambos sentidos) y peatones
    if (TrashGame.WorldLife) {
      TrashGame.WorldLife.spawnForMap('ciudad', worldGroup);
    }

    trashManager.spawnCluster('barrel', 16);
    trashManager.spawnCluster('bottle', 14);
  },

  // =========================================================================
  // 5. BOSS ARENA
  // =========================================================================
  buildBossArena(worldGroup) {
    const arenaTex = TrashGame.Textures.getToxicArena();
    arenaTex.repeat.set(4, 4);

    const arenaGeo = new THREE.CylinderGeometry(33, 36, 2, 48);
    const arenaMat = new THREE.MeshStandardMaterial({
      map: arenaTex,
      roughness: 0.75,
      metalness: 0.4
    });
    const arena = new THREE.Mesh(arenaGeo, arenaMat);
    arena.position.y = -1;
    arena.receiveShadow = true;
    worldGroup.add(arena);

    this.createElectricFenceRing(worldGroup, 29.0, 24);

    const ringMat = new THREE.MeshStandardMaterial({ color: 0x5b3a68, roughness: 0.82, metalness: 0.2 });
    [12, 20, 26].forEach((radius, index) => {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(radius, 0.13 + index * 0.035, 6, 96), ringMat);
      ring.rotation.x = Math.PI / 2;
      ring.position.y = -0.02 + index * 0.01;
      worldGroup.add(ring);
    });

    const scrapTex = TrashGame.Textures.getScrapMetal();
    for (let i = 0; i < 18; i++) {
      const angle = (i / 18) * Math.PI * 2;
      const x = Math.cos(angle) * 31;
      const z = Math.sin(angle) * 31;
      this.createToxicTower(worldGroup, x, z, scrapTex);
    }
  },

  createElectricFenceRing(group, radius, segments) {
    const poleMat = new THREE.MeshStandardMaterial({ color: 0x09090b, metalness: 0.9, roughness: 0.2 });
    const wireMat = new THREE.MeshStandardMaterial({
      color: 0x00ff88,
      emissive: 0x00ff88,
      emissiveIntensity: 2.5
    });

    for (let i = 0; i < segments; i++) {
      const a = (i / segments) * Math.PI * 2;
      const x = Math.cos(a) * radius;
      const z = Math.sin(a) * radius;
      const p = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.22, 3.5, 12), poleMat);
      p.position.set(x, 1.75, z);
      group.add(p);
    }

    [1.2, 2.2, 3.2].forEach(y => {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(radius, 0.04, 8, segments * 2), wireMat);
      ring.rotation.x = Math.PI / 2;
      ring.position.y = y;
      group.add(ring);
    });
  },

  createStoneWallBoundary(group, minX, maxX, minZ, maxZ) {
    for (let x = minX; x <= maxX; x += 6) {
      this.createRealisticRock(group, x, minZ, 0x475569, 2.2);
      this.createRealisticRock(group, x, maxZ, 0x475569, 2.2);
    }
    for (let z = minZ; z <= maxZ; z += 6) {
      this.createRealisticRock(group, minX, z, 0x475569, 2.2);
      this.createRealisticRock(group, maxX, z, 0x475569, 2.2);
    }
  },

  createConcreteBarrierPerimeter(group, minX, maxX, minZ, maxZ) {
    const barrierMat = new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.8 });
    const stripeMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, emissive: 0xf59e0b, emissiveIntensity: 0.6 });

    const createBlock = (x, z, rotY) => {
      const bGroup = new THREE.Group();
      bGroup.position.set(x, 0.5, z);
      bGroup.rotation.y = rotY;
      const body = new THREE.Mesh(new THREE.BoxGeometry(3.6, 1.0, 0.8), barrierMat);
      const stripe = new THREE.Mesh(new THREE.BoxGeometry(3.62, 0.25, 0.82), stripeMat);
      bGroup.add(body);
      bGroup.add(stripe);
      group.add(bGroup);
      const c = Math.abs(Math.cos(rotY));
      const s = Math.abs(Math.sin(rotY));
      this.addBoxCollider(x, z, (3.6 * c + 0.8 * s) / 2, (3.6 * s + 0.8 * c) / 2);
    };

    for (let x = minX; x <= maxX; x += 4.0) {
      createBlock(x, minZ, 0);
      createBlock(x, maxZ, 0);
    }
    for (let z = minZ; z <= maxZ; z += 4.0) {
      createBlock(minX, z, Math.PI / 2);
      createBlock(maxX, z, Math.PI / 2);
    }
  },

  createRealisticPalm(group, x, z, height = 4.8) {
    const palmGroup = new THREE.Group();
    palmGroup.position.set(x, 0, z);

    const trunkMat = new THREE.MeshStandardMaterial({ color: 0x5c3d1e, roughness: 0.85 });
    const segments = 6;
    let currentY = 0;
    let currentX = 0;
    const curveDir = (Math.random() - 0.5) * 0.45;
    const segH = height / segments;

    for (let s = 0; s < segments; s++) {
      const segMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.19 - s * 0.015, 0.26 - s * 0.015, segH, 10), trunkMat);
      segMesh.position.set(currentX, currentY + segH / 2, 0);
      segMesh.rotation.z = curveDir * (s / segments);
      segMesh.castShadow = true;
      palmGroup.add(segMesh);
      currentY += segH * 0.92;
      currentX += curveDir * 0.35;
    }

    const cocoMat = new THREE.MeshStandardMaterial({ color: 0x3e2723, roughness: 0.8 });
    for (let c = 0; c < 3; c++) {
      const coco = new THREE.Mesh(new THREE.SphereGeometry(0.18, 8, 8), cocoMat);
      coco.position.set(currentX + Math.cos(c * 2) * 0.24, currentY - 0.1, Math.sin(c * 2) * 0.24);
      palmGroup.add(coco);
    }

    const frondMat = new THREE.MeshStandardMaterial({ color: 0x15803d, roughness: 0.5, side: THREE.DoubleSide });
    for (let f = 0; f < 8; f++) {
      const angle = (f / 8) * Math.PI * 2;
      const frond = new THREE.Mesh(new THREE.ConeGeometry(0.9, 3.6, 5), frondMat);
      frond.position.set(currentX + Math.cos(angle) * 1.4, currentY + 0.2, Math.sin(angle) * 1.4);
      frond.rotation.x = Math.sin(angle) * (Math.PI / 2.5);
      frond.rotation.z = -Math.cos(angle) * (Math.PI / 2.5);
      frond.castShadow = true;
      palmGroup.add(frond);
    }

    group.add(palmGroup);
    this.addCircleCollider(x, z, 0.42);
  },

  createForestUnderstory(group, x, z, scale = 1) {
    const plant = new THREE.Group();
    plant.position.set(x, 0, z);
    plant.rotation.y = Math.random() * Math.PI * 2;
    plant.scale.setScalar(scale);
    const greens = [0x315b37, 0x426b3c, 0x667c3a, 0x294d3b];
    const leafMat = new THREE.MeshStandardMaterial({ color: greens[Math.floor(Math.random() * greens.length)], roughness: 0.88 });
    const center = new THREE.Mesh(new THREE.SphereGeometry(0.13, 8, 6), leafMat);
    center.position.y = 0.13;
    plant.add(center);
    for (let i = 0; i < 7; i++) {
      const angle = i / 7 * Math.PI * 2;
      const leaf = new THREE.Mesh(new THREE.ConeGeometry(0.11, 0.85 + Math.random() * 0.4, 5), leafMat);
      leaf.position.set(Math.cos(angle) * 0.34, 0.28, Math.sin(angle) * 0.34);
      leaf.rotation.z = Math.cos(angle) * 0.85;
      leaf.rotation.x = Math.sin(angle) * 0.85;
      plant.add(leaf);
    }
    group.add(plant);
  },

  createRiverReed(group, x, z, scale = 1) {
    const reeds = new THREE.Group();
    reeds.position.set(x, 0, z);
    reeds.scale.setScalar(scale);
    const stemMat = new THREE.MeshStandardMaterial({ color: 0x687443, roughness: 0.9 });
    const headMat = new THREE.MeshStandardMaterial({ color: 0x806f49, roughness: 0.95 });
    for (let i = 0; i < 3; i++) {
      const lean = (Math.random() - 0.5) * 0.3;
      const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.04, 1.2 + Math.random() * 0.6, 5), stemMat);
      stem.position.set(lean, 0.65, (i - 1) * 0.13);
      stem.rotation.z = -lean * 0.7;
      reeds.add(stem);
      const head = new THREE.Mesh(new THREE.CapsuleGeometry(0.045, 0.34, 3, 5), headMat);
      head.position.set(lean * 1.5, 1.35 + Math.random() * 0.2, (i - 1) * 0.13);
      reeds.add(head);
    }
    group.add(reeds);
  },

  createDetailedPine(group, x, z) {
    const pineGroup = new THREE.Group();
    pineGroup.position.set(x, 0, z);
    pineGroup.rotation.y = Math.random() * Math.PI * 2;
    const size = 0.78 + Math.random() * 0.52;
    pineGroup.scale.set(size, size * (0.92 + Math.random() * 0.18), size);

    const bark = TrashGame.Textures.getBark();
    bark.repeat.set(1, 2.5);
    const trunkMat = new THREE.MeshStandardMaterial({ map: bark, color: 0xc5a17c, roughness: 0.96 });
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.48, 5.0, 12), trunkMat);
    trunk.position.y = 2.5;
    trunk.castShadow = true;
    pineGroup.add(trunk);

    const leafColors = [0x24452b, 0x315b37, 0x3c6740, 0x527448];
    const leafColor = new THREE.Color(leafColors[Math.floor(Math.random() * leafColors.length)]);
    const leafMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.94 });
    if (!this._pineBranchGeometry) this._pineBranchGeometry = new THREE.ConeGeometry(0.82, 2.05, 7, 2);
    const foliage = new THREE.InstancedMesh(this._pineBranchGeometry, leafMat, 42);
    foliage.castShadow = true;
    foliage.receiveShadow = true;
    const dummy = new THREE.Object3D();
    for (let i = 0; i < 42; i++) {
      const y = 3.0 + Math.random() * 4.4;
      const canopyRadius = Math.max(0.25, 2.5 - (y - 3.0) * 0.46);
      const angle = Math.random() * Math.PI * 2;
      const radius = Math.sqrt(Math.random()) * canopyRadius;
      dummy.position.set(Math.cos(angle) * radius, y, Math.sin(angle) * radius);
      dummy.rotation.set((Math.random() - 0.5) * 0.35, angle, (Math.random() - 0.5) * 0.35);
      const spread = 0.65 + Math.random() * 0.6;
      dummy.scale.set(spread, 0.65 + Math.random() * 0.6, spread);
      dummy.updateMatrix();
      foliage.setMatrixAt(i, dummy.matrix);
      if (foliage.setColorAt) {
        const shade = 0.78 + Math.random() * 0.34;
        foliage.setColorAt(i, leafColor.clone().multiplyScalar(shade));
      }
    }
    foliage.instanceMatrix.needsUpdate = true;
    if (foliage.instanceColor) foliage.instanceColor.needsUpdate = true;
    pineGroup.add(foliage);

    group.add(pineGroup);
    this.addCircleCollider(x, z, 0.44 * size);
  },

  createDetailedBuilding(group, x, z) {
    const h = 16 + Math.random() * 28;
    const w = 7 + Math.random() * 6;
    const d = 7 + Math.random() * 6;

    const bGroup = new THREE.Group();
    bGroup.position.set(x, 0, z);

    const facades = [0x202a35, 0x30333a, 0x34383a, 0x222a30, 0x3a3432];
    const facadeMat = new THREE.MeshStandardMaterial({ color: facades[Math.floor(Math.random() * facades.length)], roughness: 0.78, metalness: 0.12 });
    const block = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), facadeMat);
    block.position.y = h / 2;
    block.castShadow = true;
    bGroup.add(block);

    const winColors = [0xffc56b, 0xffd99b, 0x9cc8d2];
    const winColor = winColors[Math.floor(Math.random() * winColors.length)];
    const litWindow = new THREE.MeshStandardMaterial({ color: winColor, emissive: winColor, emissiveIntensity: 0.65, roughness: 0.42 });
    const darkWindow = new THREE.MeshStandardMaterial({ color: 0x18242a, roughness: 0.32, metalness: 0.25 });
    const trimMat = new THREE.MeshStandardMaterial({ color: 0x11191d, roughness: 0.7, metalness: 0.3 });

    const winGeo = new THREE.BoxGeometry(0.8, 1.2, 0.1);
    for (let wy = 3; wy < h - 2; wy += 3.2) {
      for (let wx = -w / 2 + 1.2; wx < w / 2 - 1.2; wx += 2.2) {
        const frontWindow = new THREE.Mesh(winGeo, Math.random() > 0.58 ? litWindow : darkWindow);
        frontWindow.position.set(wx, wy, d / 2 + 0.05);
        bGroup.add(frontWindow);
        const sideWindow = new THREE.Mesh(winGeo, Math.random() > 0.7 ? litWindow : darkWindow);
        sideWindow.rotation.y = Math.PI / 2;
        sideWindow.position.set(w / 2 + 0.05, wy, wx * 0.45);
        bGroup.add(sideWindow);
      }
    }

    // Simple roof parapet and a service tank break up the flat skyline.
    const parapet = new THREE.Mesh(new THREE.BoxGeometry(w + 0.35, 0.45, d + 0.35), trimMat);
    parapet.position.y = h + 0.18;
    bGroup.add(parapet);
    if (Math.random() > 0.45) {
      const tank = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.75, 1.5, 10), trimMat);
      tank.position.set((Math.random() - 0.5) * w * 0.45, h + 1.0, (Math.random() - 0.5) * d * 0.45);
      tank.castShadow = true;
      bGroup.add(tank);
    }

    group.add(bGroup);
    this.addBoxCollider(x, z, w / 2 + 0.2, d / 2 + 0.2);
  },

  createStreetLamp(group, x, z) {
    const lampGroup = new THREE.Group();
    lampGroup.position.set(x, 0, z);

    const postMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.8, roughness: 0.3 });
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.12, 5.5, 12), postMat);
    post.position.y = 2.75;
    lampGroup.add(post);

    const arm = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.08, 0.08), postMat);
    arm.position.set(0.6, 5.4, 0);
    lampGroup.add(arm);

    const bulb = new THREE.Mesh(
      new THREE.SphereGeometry(0.18, 12, 12),
      new THREE.MeshStandardMaterial({ color: 0xffc078, emissive: 0xffa64d, emissiveIntensity: 1.4, roughness: 0.28 })
    );
    bulb.position.set(1.1, 5.25, 0);
    lampGroup.add(bulb);
    const pool = new THREE.PointLight(0xffb76b, 0.9, 13, 2);
    pool.position.copy(bulb.position);
    lampGroup.add(pool);

    group.add(lampGroup);
    this.addCircleCollider(x, z, 0.24);
  },

  createToxicTower(group, x, z, scrapTex) {
    const tower = new THREE.Group();
    tower.position.set(x, 0, z);

    const vatMat = new THREE.MeshStandardMaterial({ map: scrapTex, metalness: 0.7, roughness: 0.5 });
    const cylinder = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.4, 4.5, 16), vatMat);
    cylinder.position.y = 2.25;
    tower.add(cylinder);

    const fluidMat = new THREE.MeshStandardMaterial({ color: 0x00ff88, emissive: 0x00ff88, emissiveIntensity: 2.2 });
    const band = new THREE.Mesh(new THREE.CylinderGeometry(1.25, 1.25, 0.6, 16), fluidMat);
    band.position.y = 2.25;
    tower.add(band);

    group.add(tower);
    this.addCircleCollider(x, z, 1.45);
  },

  createRealisticRock(group, x, z, color, size = 1.3) {
    const rGeo = new THREE.DodecahedronGeometry(size, 1);
    const rMat = new THREE.MeshStandardMaterial({
      color: color || 0x475569,
      roughness: 0.9,
      metalness: 0.1
    });
    const rock = new THREE.Mesh(rGeo, rMat);
    rock.position.set(x, size * 0.45, z);
    rock.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, 0);
    rock.castShadow = true;
    rock.receiveShadow = true;
    group.add(rock);
    this.addCircleCollider(x, z, Math.max(0.28, size * 0.78));
  }
};
