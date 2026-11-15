/* =========================================================================
   TRASH MAN 3D - WORLD LIFE & REALISTIC LIVING ECOSYSTEM ENGINE
   - Playa Peruana: Bañistas caminando por la orilla, gente descansando, gaviotas
   - Ciudad: Tráfico vehicular real en ambos sentidos (taxis, sedanes, patrullas) + peatones
   - Bosque: Ciervos pastando, conejos saltarines, aves
   - Río: Patos nadando, peces saltando sobre el agua, ranas
   ========================================================================= */

window.TrashGame = window.TrashGame || {};

TrashGame.WorldLife = {
  currentMapKey: null,
  entities: [],

  clear(worldGroup) {
    this.entities.forEach(e => {
      if (e.mesh && worldGroup) {
        worldGroup.remove(e.mesh);
      }
    });
    this.entities = [];
  },

  spawnForMap(mapId, worldGroup) {
    this.clear(worldGroup);
    this.currentMapKey = mapId;

    if (mapId === 'playa') {
      this.spawnBeachLife(worldGroup);
    } else if (mapId === 'ciudad') {
      this.spawnCityTrafficAndPedestrians(worldGroup);
    } else if (mapId === 'bosque') {
      this.spawnForestFauna(worldGroup);
    } else if (mapId === 'rio') {
      this.spawnRiverFauna(worldGroup);
    }
  },

  // =========================================================================
  // 1. PLAYA (COSTA PACÍFICO PERUANA): BAÑISTAS, VERANEANTES Y GAVIOTAS
  // =========================================================================
  spawnBeachLife(worldGroup) {
    const skinTones = [0xe0a97a, 0xc68a5c, 0xf2bb88, 0x9e6840, 0xd49b6a];
    const swimsuitColors = [0xef4444, 0x0284c7, 0xf59e0b, 0x10b981, 0xec4899, 0x8b5cf6, 0x06b6d4, 0xffffff];

    // Personas caminando paseando a lo largo de la costa y la arena
    const walkerConfigs = [
      { startX: -34, z: 3, dir: 1, speed: 1.7, isFemale: true, hat: true },
      { startX: 30, z: 7, dir: -1, speed: 1.9, isFemale: false, hat: false },
      { startX: -22, z: 12, dir: 1, speed: 1.5, isFemale: false, hat: true },
      { startX: 16, z: 16, dir: -1, speed: 1.8, isFemale: true, hat: true },
      { startX: -28, z: 22, dir: 1, speed: 1.6, isFemale: false, hat: false },
      { startX: 24, z: 27, dir: -1, speed: 1.4, isFemale: true, hat: false },
      { startX: -8, z: 33, dir: 1, speed: 1.6, isFemale: false, hat: true },
      { startX: 12, z: 38, dir: -1, speed: 1.5, isFemale: true, hat: true }
    ];

    walkerConfigs.forEach((cfg, idx) => {
      const personGroup = new THREE.Group();
      personGroup.position.set(cfg.startX, 0, cfg.z);

      const skinMat = new THREE.MeshStandardMaterial({
        color: skinTones[idx % skinTones.length],
        roughness: 0.55
      });
      const suitMat = new THREE.MeshStandardMaterial({
        color: swimsuitColors[idx % swimsuitColors.length],
        roughness: 0.5
      });
      const darkMat = new THREE.MeshStandardMaterial({ color: 0x18181b, roughness: 0.7 });

      // Torso
      const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.17, 0.48, 12), cfg.isFemale ? suitMat : skinMat);
      torso.position.y = 1.22;
      torso.castShadow = true;
      personGroup.add(torso);

      // Shorts / Swimsuit bottom
      const shorts = new THREE.Mesh(new THREE.CylinderGeometry(0.19, 0.18, 0.22, 12), suitMat);
      shorts.position.y = 0.94;
      personGroup.add(shorts);

      // Head
      const head = new THREE.Mesh(new THREE.SphereGeometry(0.16, 12, 12), skinMat);
      head.position.y = 1.6;
      head.castShadow = true;
      personGroup.add(head);

      // Sunglasses
      const sunglasses = new THREE.Mesh(new THREE.BoxGeometry(0.17, 0.05, 0.05), darkMat);
      sunglasses.position.set(0, 1.61, 0.14);
      personGroup.add(sunglasses);

      // Straw sun hat (sombrero de paja típico de playa)
      if (cfg.hat) {
        const hatMat = new THREE.MeshStandardMaterial({ color: 0xfef08a, roughness: 0.85 });
        const hatBrim = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.4, 0.03, 16), hatMat);
        hatBrim.position.y = 1.73;
        const hatTop = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.2, 0.12, 16), hatMat);
        hatTop.position.y = 1.8;
        personGroup.add(hatBrim);
        personGroup.add(hatTop);
      }

      // Legs
      const leftLeg = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.055, 0.54, 8), skinMat);
      leftLeg.position.set(-0.09, 0.54, 0);
      leftLeg.castShadow = true;
      personGroup.add(leftLeg);

      const rightLeg = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.055, 0.54, 8), skinMat);
      rightLeg.position.set(0.09, 0.54, 0);
      rightLeg.castShadow = true;
      personGroup.add(rightLeg);

      // Arms
      const leftArm = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.045, 0.44, 8), skinMat);
      leftArm.position.set(-0.26, 1.12, 0);
      leftArm.castShadow = true;
      personGroup.add(leftArm);

      const rightArm = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.045, 0.44, 8), skinMat);
      rightArm.position.set(0.26, 1.12, 0);
      rightArm.castShadow = true;
      personGroup.add(rightArm);

      worldGroup.add(personGroup);

      this.entities.push({
        type: 'walker',
        mesh: personGroup,
        dir: cfg.dir,
        speed: cfg.speed,
        minX: -40,
        maxX: 40,
        leftLeg,
        rightLeg,
        leftArm,
        rightArm
      });
    });

    // Bañistas descansando en toallas de playa (Sunbathers relaxing on towels)
    const sunbatherSpots = [
      { x: -14, z: 18, color: 0x38bdf8, angle: 0.2 },
      { x: 18, z: 20, color: 0xf43f5e, angle: -0.3 },
      { x: -18, z: 30, color: 0xfbbf24, angle: 0.1 },
      { x: 14, z: 32, color: 0x34d399, angle: -0.15 }
    ];

    sunbatherSpots.forEach((spot, sIdx) => {
      const restGroup = new THREE.Group();
      restGroup.position.set(spot.x, 0.02, spot.z);
      restGroup.rotation.y = spot.angle;

      // Beach Towel (Toalla extendida)
      const towel = new THREE.Mesh(
        new THREE.PlaneGeometry(1.2, 2.2),
        new THREE.MeshStandardMaterial({ color: spot.color, roughness: 0.9 })
      );
      towel.rotation.x = -Math.PI / 2;
      restGroup.add(towel);

      // Resting Person (Acostado tomando sol)
      const skinMat = new THREE.MeshStandardMaterial({ color: skinTones[sIdx % skinTones.length], roughness: 0.5 });
      const pBody = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.14, 1.5), skinMat);
      pBody.position.set(0, 0.1, 0);
      restGroup.add(pBody);

      const pHead = new THREE.Mesh(new THREE.SphereGeometry(0.14, 10, 10), skinMat);
      pHead.position.set(0, 0.15, -0.85);
      restGroup.add(pHead);

      // Beach Cooler (Conservadora de bebidas)
      const cooler = new THREE.Mesh(
        new THREE.BoxGeometry(0.45, 0.35, 0.3),
        new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.3 })
      );
      cooler.position.set(0.85, 0.18, 0.4);
      cooler.castShadow = true;
      restGroup.add(cooler);

      worldGroup.add(restGroup);
    });

    // Gaviotas de la Costa Pacífica volando en círculos reales (Coastal Seagulls)
    for (let g = 0; g < 5; g++) {
      const gGroup = new THREE.Group();
      const whiteMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.3 });
      const beakMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b });
      const greyMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8 });

      const body = new THREE.Mesh(new THREE.ConeGeometry(0.18, 0.7, 8), whiteMat);
      body.rotation.x = Math.PI / 2;
      gGroup.add(body);

      const beak = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.24, 6), beakMat);
      beak.rotation.x = -Math.PI / 2;
      beak.position.z = 0.45;
      gGroup.add(beak);

      const wingL = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.025, 0.24), greyMat);
      wingL.position.set(-0.46, 0.02, 0);
      gGroup.add(wingL);

      const wingR = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.025, 0.24), greyMat);
      wingR.position.set(0.46, 0.02, 0);
      gGroup.add(wingR);

      gGroup.position.set((Math.random() - 0.5) * 60, 8.5 + Math.random() * 5, -15 - Math.random() * 30);
      worldGroup.add(gGroup);

      this.entities.push({
        type: 'bird',
        mesh: gGroup,
        angle: Math.random() * Math.PI * 2,
        radius: 16 + Math.random() * 18,
        speed: 1.1 + Math.random() * 0.7,
        wingL,
        wingR
      });
    }
  },

  // =========================================================================
  // 2. CIUDAD: TRÁFICO VEHICULAR REAL EN AMBOS SENTIDOS Y PEATONES
  // =========================================================================
  spawnCityTrafficAndPedestrians(worldGroup) {
    const carModels = [
      { type: 'taxi', color: 0xfacc15, name: 'Taxi Clásico', hasRoof: true },
      { type: 'sedan', color: 0x0284c7, name: 'Sedán Azul', hasRoof: false },
      { type: 'sedan', color: 0xef4444, name: 'Sedán Rojo', hasRoof: false },
      { type: 'police', color: 0x0f172a, name: 'Patrulla PNP', hasPoliceSiren: true },
      { type: 'suv', color: 0xf8fafc, name: 'SUV Blanca', hasRoof: false },
      { type: 'taxi', color: 0xfacc15, name: 'Taxi Moderno', hasRoof: true },
      { type: 'truck', color: 0x059669, name: 'Camioneta Verde', hasRoof: false },
      { type: 'sedan', color: 0x7c3aed, name: 'Sedán Violeta', hasRoof: false }
    ];

    // 4 Carriles de tránsito (2 en dirección Este, 2 en dirección Oeste)
    const lanes = [
      { z: -14, dir: 1, speed: 20 },
      { z: -8, dir: 1, speed: 17 },
      { z: 8, dir: -1, speed: 18 },
      { z: 14, dir: -1, speed: 21 }
    ];

    carModels.forEach((carCfg, idx) => {
      const lane = lanes[idx % lanes.length];
      const carGroup = new THREE.Group();
      // Distribuir espaciado para que no se choquen
      const initialX = -50 + (idx * 28) % 100;
      carGroup.position.set(initialX, 0, lane.z);

      const paintMat = new THREE.MeshStandardMaterial({
        color: carCfg.color,
        roughness: 0.25,
        metalness: 0.8
      });
      const glassMat = new THREE.MeshStandardMaterial({
        color: 0x0f172a,
        roughness: 0.1,
        metalness: 0.95
      });
      const rubberMat = new THREE.MeshStandardMaterial({ color: 0x09090b, roughness: 0.9 });
      const chromeMat = new THREE.MeshStandardMaterial({ color: 0xd4d4d8, metalness: 0.95, roughness: 0.1 });

      // Chasis del auto
      const body = new THREE.Mesh(new THREE.BoxGeometry(4.2, 0.85, 1.9), paintMat);
      body.position.y = 0.65;
      body.castShadow = true;
      carGroup.add(body);

      // Cabina con lunas polarizadas
      const cabin = new THREE.Mesh(new THREE.BoxGeometry(2.3, 0.72, 1.7), glassMat);
      cabin.position.set(-0.2, 1.42, 0);
      cabin.castShadow = true;
      carGroup.add(cabin);

      // Paragolpes delantero y trasero
      const bFront = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.3, 1.8), chromeMat);
      bFront.position.set(2.15, 0.45, 0);
      carGroup.add(bFront);

      const bBack = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.3, 1.8), chromeMat);
      bBack.position.set(-2.15, 0.45, 0);
      carGroup.add(bBack);

      // Faros delanteros brillantes
      [-0.65, 0.65].forEach(wz => {
        const headlight = new THREE.Mesh(
          new THREE.BoxGeometry(0.1, 0.22, 0.35),
          new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xffffff, emissiveIntensity: 2.5 })
        );
        headlight.position.set(2.12, 0.68, wz);
        carGroup.add(headlight);
      });

      // Luces traseras rojas
      [-0.65, 0.65].forEach(wz => {
        const taillight = new THREE.Mesh(
          new THREE.BoxGeometry(0.1, 0.22, 0.35),
          new THREE.MeshStandardMaterial({ color: 0xef4444, emissive: 0xef4444, emissiveIntensity: 2.2 })
        );
        taillight.position.set(-2.12, 0.68, wz);
        carGroup.add(taillight);
      });

      // Cartel de TAXI en el techo
      if (carCfg.hasRoof) {
        const signMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, emissive: 0xf59e0b, emissiveIntensity: 1.8 });
        const sign = new THREE.Mesh(new THREE.BoxGeometry(0.75, 0.22, 0.36), signMat);
        sign.position.set(-0.2, 1.9, 0);
        carGroup.add(sign);
      }

      // Sirena de patrulla con destellos
      let sirenMesh = null;
      if (carCfg.hasPoliceSiren) {
        sirenMesh = new THREE.Mesh(
          new THREE.BoxGeometry(0.8, 0.2, 0.3),
          new THREE.MeshStandardMaterial({ color: 0x3b82f6, emissive: 0x3b82f6, emissiveIntensity: 2.5 })
        );
        sirenMesh.position.set(-0.2, 1.9, 0);
        carGroup.add(sirenMesh);
      }

      // 4 Ruedas giratorias
      const wheels = [];
      [-1.25, 1.25].forEach(wx => {
        [-1.02, 1.02].forEach(wz => {
          const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.36, 0.24, 16), rubberMat);
          wheel.rotation.x = Math.PI / 2;
          wheel.position.set(wx, 0.36, wz);
          wheel.castShadow = true;
          carGroup.add(wheel);
          wheels.push(wheel);
        });
      });

      if (lane.dir < 0) {
        carGroup.rotation.y = Math.PI; // Invertir hacia la izquierda
      }

      worldGroup.add(carGroup);

      this.entities.push({
        type: 'car',
        mesh: carGroup,
        dir: lane.dir,
        speed: lane.speed,
        minX: -60,
        maxX: 60,
        wheels,
        sirenMesh
      });
    });

    // Peatones en las veredas de la ciudad (Pedestrians on sidewalks)
    const pedSpots = [
      { startX: -25, z: -22, dir: 1, speed: 1.6, color: 0x0284c7 },
      { startX: 20, z: -22, dir: -1, speed: 1.4, color: 0xef4444 },
      { startX: -18, z: 22, dir: 1, speed: 1.5, color: 0x10b981 },
      { startX: 24, z: 22, dir: -1, speed: 1.7, color: 0xf59e0b }
    ];

    pedSpots.forEach(cfg => {
      const ped = new THREE.Group();
      ped.position.set(cfg.startX, 0, cfg.z);

      const skinMat = new THREE.MeshStandardMaterial({ color: 0xe0a97a, roughness: 0.6 });
      const clothMat = new THREE.MeshStandardMaterial({ color: cfg.color, roughness: 0.5 });
      const pantsMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.8 });

      const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.17, 0.5, 10), clothMat);
      torso.position.y = 1.25;
      ped.add(torso);

      const head = new THREE.Mesh(new THREE.SphereGeometry(0.16, 10, 10), skinMat);
      head.position.y = 1.65;
      ped.add(head);

      const lLeg = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.055, 0.55, 8), pantsMat);
      lLeg.position.set(-0.09, 0.55, 0);
      ped.add(lLeg);

      const rLeg = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.055, 0.55, 8), pantsMat);
      rLeg.position.set(0.09, 0.55, 0);
      ped.add(rLeg);

      worldGroup.add(ped);

      this.entities.push({
        type: 'pedestrian',
        mesh: ped,
        dir: cfg.dir,
        speed: cfg.speed,
        minX: -38,
        maxX: 38,
        lLeg,
        rLeg
      });
    });
  },

  // =========================================================================
  // 3. BOSQUE PROFUNDO: ANIMALES SILVESTRES (CIERVOS PASTANDO Y CONEJOS)
  // =========================================================================
  spawnForestFauna(worldGroup) {
    // Ciervos pastando pacíficamente (Deer grazing)
    const deerLocations = [
      { x: -18, z: 12 }, { x: 24, z: -16 }, { x: -28, z: -22 }, { x: 19, z: 25 }, { x: 0, z: -32 }
    ];

    deerLocations.forEach(loc => {
      const deerGroup = new THREE.Group();
      deerGroup.position.set(loc.x, 0, loc.z);
      deerGroup.rotation.y = Math.random() * Math.PI * 2;

      const furMat = new THREE.MeshStandardMaterial({ color: 0x92400e, roughness: 0.85 });
      const bellyMat = new THREE.MeshStandardMaterial({ color: 0xfef08a, roughness: 0.9 });
      const hornMat = new THREE.MeshStandardMaterial({ color: 0x451a03, roughness: 0.7 });

      // Cuerpo
      const body = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.28, 1.1, 12), furMat);
      body.rotation.z = Math.PI / 2;
      body.position.y = 0.95;
      body.castShadow = true;
      deerGroup.add(body);

      // Cuello y Cabeza articulada
      const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.17, 0.58, 10), furMat);
      neck.position.set(0.5, 1.35, 0);
      neck.rotation.z = -Math.PI / 4;
      deerGroup.add(neck);

      const head = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.2, 0.2), furMat);
      head.position.set(0.74, 1.6, 0);
      deerGroup.add(head);

      // Cornamenta realista
      [-0.1, 0.1].forEach(hz => {
        const horn = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.035, 0.52, 6), hornMat);
        horn.position.set(0.7, 1.9, hz);
        horn.rotation.z = -Math.PI / 6;
        deerGroup.add(horn);
      });

      // 4 Patas delgadas
      [-0.38, 0.38].forEach(lx => {
        [-0.16, 0.16].forEach(lz => {
          const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.04, 0.85, 8), furMat);
          leg.position.set(lx, 0.42, lz);
          leg.castShadow = true;
          deerGroup.add(leg);
        });
      });

      worldGroup.add(deerGroup);

      this.entities.push({
        type: 'deer',
        mesh: deerGroup,
        head,
        baseY: head.position.y,
        timer: Math.random() * 5
      });
    });

    // Conejos dando saltos en la hierba (Rabbits hopping)
    for (let r = 0; r < 6; r++) {
      const rabbitGroup = new THREE.Group();
      rabbitGroup.position.set((Math.random() - 0.5) * 60, 0, (Math.random() - 0.5) * 60);

      const rabbitMat = new THREE.MeshStandardMaterial({ color: 0xe4e4e7, roughness: 0.85 });
      const body = new THREE.Mesh(new THREE.SphereGeometry(0.2, 10, 10), rabbitMat);
      body.position.y = 0.2;
      body.scale.set(1.2, 1, 0.9);
      rabbitGroup.add(body);

      const rHead = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 8), rabbitMat);
      rHead.position.set(0.18, 0.28, 0);
      rabbitGroup.add(rHead);

      // Orejas largas
      [-0.05, 0.05].forEach(ez => {
        const ear = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.03, 0.22, 6), rabbitMat);
        ear.position.set(0.15, 0.42, ez);
        rabbitGroup.add(ear);
      });

      worldGroup.add(rabbitGroup);

      this.entities.push({
        type: 'rabbit',
        mesh: rabbitGroup,
        jumpTimer: Math.random() * 3,
        isJumping: false
      });
    }
  },

  // =========================================================================
  // 4. RÍO TURBIO: PATOS NADANDO EN EL AGUA Y PECES SALTANDO
  // =========================================================================
  spawnRiverFauna(worldGroup) {
    // Patos nadando en la corriente del río (Swimming ducks)
    for (let d = 0; d < 5; d++) {
      const duckGroup = new THREE.Group();
      duckGroup.position.set(-5 + Math.random() * 10, 0.16, -38 + d * 18);

      const duckBodyMat = new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.6 });
      const duckHeadMat = new THREE.MeshStandardMaterial({ color: 0x15803d, roughness: 0.4 }); // Cabeza verde azulado
      const billMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b });

      const dBody = new THREE.Mesh(new THREE.SphereGeometry(0.24, 10, 10), duckBodyMat);
      dBody.scale.set(1.4, 0.8, 1);
      duckGroup.add(dBody);

      const dHead = new THREE.Mesh(new THREE.SphereGeometry(0.13, 8, 8), duckHeadMat);
      dHead.position.set(0.26, 0.2, 0);
      duckGroup.add(dHead);

      const bill = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.04, 0.08), billMat);
      bill.position.set(0.4, 0.18, 0);
      duckGroup.add(bill);

      worldGroup.add(duckGroup);

      this.entities.push({
        type: 'duck',
        mesh: duckGroup,
        speed: 0.85 + Math.random() * 0.45,
        dirZ: Math.random() > 0.5 ? 1 : -1,
        initialY: 0.16
      });
    }

    // Peces saltando sobre el agua (Jumping fish)
    for (let f = 0; f < 6; f++) {
      const fish = new THREE.Mesh(
        new THREE.ConeGeometry(0.12, 0.42, 6),
        new THREE.MeshStandardMaterial({ color: 0x06b6d4, roughness: 0.2, metalness: 0.85 })
      );
      fish.rotation.z = Math.PI / 2;
      fish.position.set(-6 + Math.random() * 12, -0.05, -42 + f * 15);
      worldGroup.add(fish);

      this.entities.push({
        type: 'fish',
        mesh: fish,
        speed: 2.2 + Math.random() * 1.5,
        swimTimer: Math.random() * 5
      });
    }
  },

  // =========================================================================
  // BUCLE DE ACTUALIZACIÓN DINÁMICO (EJECUTADO EN CADA FRAME)
  // =========================================================================
  update(dt, time) {
    this.entities.forEach(e => {
      if (e.type === 'walker') {
        // Mover bañistas a lo largo de la arena
        e.mesh.position.x += e.dir * e.speed * dt;
        e.mesh.rotation.y = e.dir > 0 ? Math.PI / 2 : -Math.PI / 2;

        if (e.mesh.position.x > e.maxX) e.dir = -1;
        if (e.mesh.position.x < e.minX) e.dir = 1;

        // Animar brazos y piernas caminando
        const walk = time * 7 * (e.speed / 1.5);
        if (e.leftLeg) e.leftLeg.rotation.x = Math.sin(walk) * 0.55;
        if (e.rightLeg) e.rightLeg.rotation.x = -Math.sin(walk) * 0.55;
        if (e.leftArm) e.leftArm.rotation.x = -Math.sin(walk) * 0.45;
        if (e.rightArm) e.rightArm.rotation.x = Math.sin(walk) * 0.45;

      } else if (e.type === 'bird') {
        // Gaviotas planeando en círculos elegantes sobre el mar
        e.angle += e.speed * 0.45 * dt;
        e.mesh.position.x = Math.cos(e.angle) * e.radius;
        e.mesh.position.z = -18 + Math.sin(e.angle) * (e.radius * 0.7);
        e.mesh.rotation.y = -e.angle + Math.PI / 2;

        // Aleteo de alas
        const flap = Math.sin(time * 10) * 0.38;
        if (e.wingL) e.wingL.rotation.z = flap;
        if (e.wingR) e.wingR.rotation.z = -flap;

      } else if (e.type === 'car') {
        // Autos circulando en carriles continuous wrap
        e.mesh.position.x += e.dir * e.speed * dt;
        if (e.dir > 0 && e.mesh.position.x > e.maxX) {
          e.mesh.position.x = e.minX;
        } else if (e.dir < 0 && e.mesh.position.x < e.minX) {
          e.mesh.position.x = e.maxX;
        }

        // Rotar ruedas con la velocidad
        if (e.wheels) {
          const wRot = time * e.speed * 0.8;
          e.wheels.forEach(w => {
            w.rotation.z = e.dir > 0 ? -wRot : wRot;
          });
        }

        // Sirena parpadeante de patrulla
        if (e.sirenMesh) {
          const isBlue = Math.sin(time * 12) > 0;
          e.sirenMesh.material.color.setHex(isBlue ? 0x3b82f6 : 0xef4444);
          e.sirenMesh.material.emissive.setHex(isBlue ? 0x3b82f6 : 0xef4444);
        }

      } else if (e.type === 'pedestrian') {
        e.mesh.position.x += e.dir * e.speed * dt;
        e.mesh.rotation.y = e.dir > 0 ? Math.PI / 2 : -Math.PI / 2;

        if (e.mesh.position.x > e.maxX) e.dir = -1;
        if (e.mesh.position.x < e.minX) e.dir = 1;

        const w = time * 7 * (e.speed / 1.5);
        if (e.lLeg) e.lLeg.rotation.x = Math.sin(w) * 0.5;
        if (e.rLeg) e.rLeg.rotation.x = -Math.sin(w) * 0.5;

      } else if (e.type === 'deer') {
        // Ciervos bajando la cabeza a pastar
        e.timer += dt;
        if (e.head) {
          const graze = Math.sin(e.timer * 0.7);
          e.head.position.y = e.baseY + (graze > 0.2 ? -0.42 : 0);
          e.head.rotation.x = graze > 0.2 ? Math.PI / 4 : 0;
        }

      } else if (e.type === 'rabbit') {
        // Conejos dando saltitos
        e.jumpTimer += dt;
        if (e.jumpTimer > 2.8) {
          e.mesh.position.y = Math.sin((e.jumpTimer - 2.8) * Math.PI * 4) * 0.28;
          e.mesh.position.x += 0.35 * dt;
          if (e.jumpTimer > 3.3) {
            e.jumpTimer = 0;
            e.mesh.position.y = 0;
            e.mesh.rotation.y = Math.random() * Math.PI * 2;
          }
        }

      } else if (e.type === 'duck') {
        // Patos navegando suavemente en el agua
        e.mesh.position.z += e.dirZ * e.speed * dt;
        e.mesh.position.y = e.initialY + Math.sin(time * 3 + e.mesh.position.z) * 0.025;
        e.mesh.rotation.y = e.dirZ > 0 ? 0 : Math.PI;
        if (e.mesh.position.z > 44) e.dirZ = -1;
        if (e.mesh.position.z < -44) e.dirZ = 1;

      } else if (e.type === 'fish') {
        // Peces nadando y saltando fuera del agua
        e.swimTimer += dt;
        e.mesh.position.x += Math.sin(time * 2.5) * 0.04;
        if (Math.sin(e.swimTimer) > 0.94) {
          e.mesh.position.y = 0.35; // Salto
          e.mesh.rotation.x = Math.sin(time * 8) * 0.5;
        } else {
          e.mesh.position.y = -0.05;
        }
      }
    });
  }
};
