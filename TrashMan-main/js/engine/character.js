/* =========================================================================
   TRASH MAN 3D — TACTICAL ECO-WARRIOR CHARACTER v3
   Redesigned to match the reference art: muscular eco-soldier with
   rounded humanoid proportions, tactical vest, gas mask, glowing green
   accents, recycling emblem, bio-vacuum backpack, heavy boots.
   Much more organic/human — NOT blocky Roblox style.
   ========================================================================= */

window.TrashGame = window.TrashGame || {};

TrashGame.CharacterBuilder = {

  build(targetGroup, characterKey, equipped) {
    // Human heroes (roster of 10) use the organic human builder
    if (TrashGame.Humans && TrashGame.Humans.has(characterKey)) {
      return TrashGame.Humans.build(targetGroup, characterKey, equipped);
    }
    while (targetGroup.children.length > 0) {
      targetGroup.remove(targetGroup.children[0]);
    }

    const isAbraham  = characterKey === 'abraham';
    const headItem   = equipped && TrashGame.Items ? TrashGame.Items.find(i => i.id === equipped.head)   : null;
    const torsoItem  = equipped && TrashGame.Items ? TrashGame.Items.find(i => i.id === equipped.torso)  : null;
    const legsItem   = equipped && TrashGame.Items ? TrashGame.Items.find(i => i.id === equipped.legs)   : null;
    const feetItem   = equipped && TrashGame.Items ? TrashGame.Items.find(i => i.id === equipped.feet)   : null;
    const weaponItem = equipped && TrashGame.Items ? TrashGame.Items.find(i => i.id === equipped.weapon) : null;

    // ── Material palette — realistic tactical colors ─────────────────────
    const skinTone = new THREE.MeshStandardMaterial({ color: 0xc68642, roughness: 0.75, metalness: 0.05 });
    
    const headColor = headItem ? headItem.color : 0x1a261a;
    const helmetMat = new THREE.MeshStandardMaterial({ color: headColor, roughness: 0.48, metalness: 0.32 });

    const armorDark = new THREE.MeshStandardMaterial({ color: 0x1a261a, roughness: 0.58, metalness: 0.24 });
    const armorMid  = new THREE.MeshStandardMaterial({ color: 0x2a3d28, roughness: 0.62, metalness: 0.2 });
    const armorLight = new THREE.MeshStandardMaterial({ color: 0x3a5535, roughness: 0.66, metalness: 0.16 });

    const suitColor = torsoItem ? torsoItem.color : 0x354d2e;
    const suitMat   = new THREE.MeshStandardMaterial({ color: suitColor, roughness: 0.55, metalness: 0.25 });

    const pantsColor = legsItem ? legsItem.color : 0x2b3d26;
    const pantsMat   = new THREE.MeshStandardMaterial({ color: pantsColor, roughness: 0.6, metalness: 0.15 });

    const bootsColor = feetItem ? feetItem.color : 0x1a1f18;
    const bootsMat   = new THREE.MeshStandardMaterial({ color: bootsColor, roughness: 0.58, metalness: 0.18 });

    const weaponGlowColor = weaponItem ? weaponItem.color : 0x00ff88;
    const weaponGlow = new THREE.MeshStandardMaterial({
      color: weaponGlowColor, emissive: weaponGlowColor, emissiveIntensity: 0.8, roughness: 0.24
    });

    const glowGreen = new THREE.MeshStandardMaterial({
      color: 0x00ff88, emissive: 0x00ff88, emissiveIntensity: 0.75, roughness: 0.22
    });
    const glowCyan = new THREE.MeshStandardMaterial({
      color: 0x00e5ff, emissive: 0x00e5ff, emissiveIntensity: 0.65, roughness: 0.22
    });
    const metalGunmetal = new THREE.MeshStandardMaterial({ color: 0x4a5a4a, roughness: 0.32, metalness: 0.68 });
    const darkRubber = new THREE.MeshStandardMaterial({ color: 0x0d120d, roughness: 0.7, metalness: 0.05 });
    const leatherBrown = new THREE.MeshStandardMaterial({ color: 0x3d2e1e, roughness: 0.65, metalness: 0.1 });
    const visorMat = new THREE.MeshStandardMaterial({
      color: 0x00ffcc, emissive: 0x00ffaa, emissiveIntensity: 3.5,
      roughness: 0.0, metalness: 0.3, transparent: true, opacity: 0.85
    });

    // ══════════════════════════════════════════════════════════════════════
    // 1. LEGS — MUSCULAR ROUNDED TACTICAL PANTS + HEAVY BOOTS
    // ══════════════════════════════════════════════════════════════════════
    const legDefs = [
      { x: -0.15, side: 'left'  },
      { x:  0.15, side: 'right' }
    ];
    legDefs.forEach(ld => {
      const legGrp = new THREE.Group();
      legGrp.position.set(ld.x, 0.82, 0);

      // Upper thigh — thick, rounded
      const thigh = new THREE.Mesh(
        new THREE.CylinderGeometry(0.12, 0.10, 0.40, 16), pantsMat
      );
      thigh.position.y = -0.15;
      thigh.castShadow = true;
      legGrp.add(thigh);

      // Thigh armor plate (front)
      const thighPlate = new THREE.Mesh(
        new THREE.CylinderGeometry(0.09, 0.08, 0.18, 8, 1, false, -Math.PI/3, Math.PI*2/3),
        armorDark
      );
      thighPlate.position.set(0, -0.12, 0.06);
      legGrp.add(thighPlate);

      // Knee joint sphere
      const kneeBall = new THREE.Mesh(
        new THREE.SphereGeometry(0.09, 12, 12), armorDark
      );
      kneeBall.position.set(0, -0.36, 0.02);
      legGrp.add(kneeBall);

      // Knee pad — rounded armor
      const kneePad = new THREE.Mesh(
        new THREE.SphereGeometry(0.075, 10, 10, 0, Math.PI * 2, 0, Math.PI * 0.55),
        armorMid
      );
      kneePad.rotation.x = -Math.PI * 0.15;
      kneePad.position.set(0, -0.34, 0.09);
      legGrp.add(kneePad);

      // Knee glow line
      const kneeGlow = new THREE.Mesh(
        new THREE.TorusGeometry(0.065, 0.008, 6, 16, Math.PI),
        glowGreen
      );
      kneeGlow.rotation.y = Math.PI / 2;
      kneeGlow.rotation.x = Math.PI / 2;
      kneeGlow.position.set(0, -0.34, 0.1);
      legGrp.add(kneeGlow);

      // Lower shin — tapered
      const shin = new THREE.Mesh(
        new THREE.CylinderGeometry(0.09, 0.085, 0.34, 14), pantsMat
      );
      shin.position.y = -0.55;
      shin.castShadow = true;
      legGrp.add(shin);

      // Shin guard armor (front plate)
      const shinGuard = new THREE.Mesh(
        new THREE.BoxGeometry(0.10, 0.22, 0.04), armorDark
      );
      shinGuard.position.set(0, -0.52, 0.09);
      legGrp.add(shinGuard);

      // Shin glow strip
      const shinGlow = new THREE.Mesh(
        new THREE.BoxGeometry(0.025, 0.16, 0.005), glowGreen
      );
      shinGlow.position.set(0, -0.52, 0.115);
      legGrp.add(shinGlow);

      // Heavy tactical boot — rounded, thick sole
      const bootMain = new THREE.Mesh(
        new THREE.CylinderGeometry(0.10, 0.11, 0.18, 12), bootsMat
      );
      bootMain.position.set(0, -0.81, 0.01);
      bootMain.castShadow = true;
      legGrp.add(bootMain);

      // Boot sole — wide and flat
      const bootSole = new THREE.Mesh(
        new THREE.BoxGeometry(0.22, 0.06, 0.30), darkRubber
      );
      bootSole.position.set(0, -0.92, 0.03);
      bootSole.castShadow = true;
      legGrp.add(bootSole);

      // Boot toe cap
      const toeCap = new THREE.Mesh(
        new THREE.SphereGeometry(0.08, 10, 8, 0, Math.PI*2, 0, Math.PI*0.5),
        metalGunmetal
      );
      toeCap.rotation.x = Math.PI;
      toeCap.position.set(0, -0.89, 0.14);
      legGrp.add(toeCap);

      // Boot ankle strap
      const ankleStrap = new THREE.Mesh(
        new THREE.TorusGeometry(0.105, 0.015, 8, 16), armorDark
      );
      ankleStrap.rotation.x = Math.PI / 2;
      ankleStrap.position.set(0, -0.74, 0.01);
      legGrp.add(ankleStrap);

      targetGroup.add(legGrp);
      if (ld.side === 'left')  targetGroup.userData.leftLeg  = legGrp;
      else                     targetGroup.userData.rightLeg = legGrp;
    });

    // ══════════════════════════════════════════════════════════════════════
    // 2. PELVIS / HIP AREA + UTILITY BELT
    // ══════════════════════════════════════════════════════════════════════
    const pelvis = new THREE.Mesh(
      new THREE.SphereGeometry(0.22, 14, 10, 0, Math.PI*2, 0.2, Math.PI*0.6),
      pantsMat
    );
    pelvis.position.y = 0.92;
    pelvis.scale.set(1, 0.6, 0.85);
    targetGroup.add(pelvis);

    // Tactical utility belt
    const belt = new THREE.Mesh(
      new THREE.TorusGeometry(0.23, 0.04, 8, 20), armorDark
    );
    belt.rotation.x = Math.PI / 2;
    belt.position.y = 1.02;
    targetGroup.add(belt);

    // Belt buckle — recycling logo small
    const buckle = new THREE.Mesh(
      new THREE.CylinderGeometry(0.045, 0.045, 0.02, 16), glowGreen
    );
    buckle.rotation.x = Math.PI / 2;
    buckle.position.set(0, 1.02, 0.24);
    targetGroup.add(buckle);

    // Belt pouches
    [-0.20, 0.20].forEach(bx => {
      const pouch = new THREE.Mesh(
        new THREE.BoxGeometry(0.08, 0.10, 0.07), leatherBrown
      );
      pouch.position.set(bx, 1.0, 0.2);
      targetGroup.add(pouch);

      // Pouch flap
      const flap = new THREE.Mesh(
        new THREE.BoxGeometry(0.08, 0.03, 0.072), armorDark
      );
      flap.position.set(bx, 1.05, 0.2);
      targetGroup.add(flap);
    });

    // Side holster (left hip)
    const holster = new THREE.Mesh(
      new THREE.BoxGeometry(0.06, 0.15, 0.06), leatherBrown
    );
    holster.position.set(-0.26, 0.94, 0.05);
    targetGroup.add(holster);

    // ══════════════════════════════════════════════════════════════════════
    // 3. TORSO — MUSCULAR BUILD + HEAVY TACTICAL VEST
    // ══════════════════════════════════════════════════════════════════════
    const torso = new THREE.Group();
    torso.position.y = 1.38;

    // Core body — barrel chest shape using scaled sphere
    const chestCore = new THREE.Mesh(
      new THREE.SphereGeometry(0.28, 18, 16), suitMat
    );
    chestCore.scale.set(1.0, 1.2, 0.85);
    chestCore.castShadow = true;
    torso.add(chestCore);

    // Upper chest / collarbone area
    const upperChest = new THREE.Mesh(
      new THREE.SphereGeometry(0.24, 14, 12), suitMat
    );
    upperChest.position.y = 0.22;
    upperChest.scale.set(1.1, 0.6, 0.8);
    torso.add(upperChest);

    // Front armor vest plate (thick tactical vest)
    const vestFront = new THREE.Mesh(
      new THREE.BoxGeometry(0.44, 0.42, 0.08), armorDark
    );
    vestFront.position.set(0, 0.04, 0.2);
    vestFront.castShadow = true;
    torso.add(vestFront);

    // Vest edges — rounded side plates
    [-0.22, 0.22].forEach(sx => {
      const sidePlate = new THREE.Mesh(
        new THREE.BoxGeometry(0.06, 0.38, 0.18), armorMid
      );
      sidePlate.position.set(sx, 0.04, 0.12);
      torso.add(sidePlate);
    });

    // Back armor plate
    const vestBack = new THREE.Mesh(
      new THREE.BoxGeometry(0.40, 0.38, 0.06), armorDark
    );
    vestBack.position.set(0, 0.04, -0.2);
    torso.add(vestBack);

    // ♻ RECYCLING EMBLEM on chest — prominent glowing circle + arrows
    const emblemBase = new THREE.Mesh(
      new THREE.CylinderGeometry(0.10, 0.10, 0.015, 32), 
      new THREE.MeshStandardMaterial({ color: 0x0a1a0a, roughness: 0.3, metalness: 0.8 })
    );
    emblemBase.rotation.x = Math.PI / 2;
    emblemBase.position.set(0, 0.08, 0.25);
    torso.add(emblemBase);

    // Recycling ring
    const emblemRing = new THREE.Mesh(
      new THREE.TorusGeometry(0.09, 0.012, 8, 32), glowGreen
    );
    emblemRing.rotation.x = Math.PI / 2;
    emblemRing.position.set(0, 0.08, 0.258);
    torso.add(emblemRing);

    // 3 recycling arrows
    for (let r = 0; r < 3; r++) {
      const angle = (r / 3) * Math.PI * 2 - Math.PI / 2;
      // Arrow shaft
      const arrowShaft = new THREE.Mesh(
        new THREE.BoxGeometry(0.02, 0.055, 0.008), glowGreen
      );
      arrowShaft.position.set(
        Math.cos(angle) * 0.055,
        0.08 + Math.sin(angle) * 0.055,
        0.262
      );
      arrowShaft.rotation.z = angle + Math.PI / 2;
      torso.add(arrowShaft);

      // Arrow tip
      const arrowTip = new THREE.Mesh(
        new THREE.ConeGeometry(0.018, 0.035, 3), glowGreen
      );
      const tipAngle = angle + 0.5;
      arrowTip.position.set(
        Math.cos(tipAngle) * 0.06,
        0.08 + Math.sin(tipAngle) * 0.06,
        0.262
      );
      arrowTip.rotation.z = tipAngle;
      torso.add(arrowTip);
    }

    // Chest straps (cross harness)
    [-1, 1].forEach(side => {
      const strap = new THREE.Mesh(
        new THREE.BoxGeometry(0.04, 0.50, 0.03), armorMid
      );
      strap.position.set(side * 0.12, 0.08, 0.22);
      strap.rotation.z = side * 0.15;
      torso.add(strap);
    });

    // Tactical collar / neck guard
    const collar = new THREE.Mesh(
      new THREE.CylinderGeometry(0.16, 0.20, 0.10, 14), armorDark
    );
    collar.position.y = 0.34;
    torso.add(collar);

    // Collar glow ring
    const collarGlow = new THREE.Mesh(
      new THREE.TorusGeometry(0.17, 0.008, 8, 20), glowGreen
    );
    collarGlow.rotation.x = Math.PI / 2;
    collarGlow.position.y = 0.38;
    torso.add(collarGlow);

    targetGroup.add(torso);
    targetGroup.userData.torso = torso;

    // ══════════════════════════════════════════════════════════════════════
    // 4. ARMS — MUSCULAR WITH ARMORED PAULDRONS + BRACERS
    // ══════════════════════════════════════════════════════════════════════
    const armDefs = [
      { x: -0.38, side: 'left'  },
      { x:  0.38, side: 'right' }
    ];
    armDefs.forEach(ad => {
      const armGrp = new THREE.Group();
      armGrp.position.set(ad.x, 1.60, 0);

      // Large rounded shoulder pauldron (like the art)
      const pauldron = new THREE.Mesh(
        new THREE.SphereGeometry(0.14, 14, 12, 0, Math.PI * 2, 0, Math.PI * 0.6),
        armorDark
      );
      pauldron.rotation.z = ad.x < 0 ? 0.3 : -0.3;
      pauldron.castShadow = true;
      armGrp.add(pauldron);

      // Pauldron edge glow
      const pauGlow = new THREE.Mesh(
        new THREE.TorusGeometry(0.11, 0.008, 6, 16, Math.PI),
        glowGreen
      );
      pauGlow.rotation.x = Math.PI / 4;
      pauGlow.rotation.z = ad.x < 0 ? 0.3 : -0.3;
      pauGlow.position.y = -0.04;
      armGrp.add(pauGlow);

      // Upper arm — muscular cylinder
      const bicep = new THREE.Mesh(
        new THREE.CylinderGeometry(0.09, 0.08, 0.26, 14), suitMat
      );
      bicep.position.y = -0.18;
      bicep.castShadow = true;
      armGrp.add(bicep);

      // Elbow joint
      const elbow = new THREE.Mesh(
        new THREE.SphereGeometry(0.065, 10, 10), armorDark
      );
      elbow.position.y = -0.33;
      armGrp.add(elbow);

      // Forearm — tapered
      const forearm = new THREE.Mesh(
        new THREE.CylinderGeometry(0.075, 0.065, 0.24, 14), suitMat
      );
      forearm.position.y = -0.48;
      forearm.castShadow = true;
      armGrp.add(forearm);

      // Forearm bracer armor
      const bracer = new THREE.Mesh(
        new THREE.CylinderGeometry(0.085, 0.075, 0.16, 10, 1, false, -Math.PI*0.4, Math.PI*0.8),
        armorDark
      );
      bracer.position.set(0, -0.46, 0.025);
      armGrp.add(bracer);

      // Bracer glow strip
      const bracerGlow = new THREE.Mesh(
        new THREE.BoxGeometry(0.015, 0.12, 0.005), glowGreen
      );
      bracerGlow.position.set(0, -0.46, 0.085);
      armGrp.add(bracerGlow);

      // Tactical glove
      const glove = new THREE.Mesh(
        new THREE.SphereGeometry(0.06, 10, 10), armorMid
      );
      glove.scale.set(1, 1.3, 1);
      glove.position.y = -0.66;
      armGrp.add(glove);

      // Finger guard
      const fingers = new THREE.Mesh(
        new THREE.BoxGeometry(0.08, 0.05, 0.06), armorDark
      );
      fingers.position.set(0, -0.72, 0.01);
      armGrp.add(fingers);

      targetGroup.add(armGrp);
      if (ad.side === 'left')  targetGroup.userData.leftArm  = armGrp;
      else                     targetGroup.userData.rightArm = armGrp;
    });

    // ══════════════════════════════════════════════════════════════════════
    // 5. BIO-VACUUM BACKPACK — Eco-Tech Canister System
    // ══════════════════════════════════════════════════════════════════════
    const backpack = new THREE.Group();
    backpack.position.set(0, 1.38, -0.32);

    // Main pack body — rounded
    const packBody = new THREE.Mesh(
      new THREE.BoxGeometry(0.34, 0.46, 0.16), armorDark
    );
    packBody.castShadow = true;
    backpack.add(packBody);

    // Pack frame edges
    const packFrame = new THREE.Mesh(
      new THREE.BoxGeometry(0.36, 0.48, 0.02), metalGunmetal
    );
    packFrame.position.z = 0.08;
    backpack.add(packFrame);

    // Energy canister (center) — glowing green
    const canister = new THREE.Mesh(
      new THREE.CylinderGeometry(0.08, 0.08, 0.36, 16),
      new THREE.MeshStandardMaterial({
        color: 0x00ff88, emissive: 0x00ff66, emissiveIntensity: 2.0,
        roughness: 0.1, transparent: true, opacity: 0.8
      })
    );
    canister.position.set(0, 0.0, 0.02);
    backpack.add(canister);

    // Canister caps
    [-0.19, 0.19].forEach(cy => {
      const cap = new THREE.Mesh(
        new THREE.CylinderGeometry(0.09, 0.09, 0.03, 14), metalGunmetal
      );
      cap.position.y = cy;
      backpack.add(cap);
    });

    // Top exhaust vent
    const exhaust = new THREE.Mesh(
      new THREE.CylinderGeometry(0.10, 0.08, 0.06, 14), armorDark
    );
    exhaust.position.y = 0.26;
    backpack.add(exhaust);

    // Exhaust glow
    const exhaustGlow = new THREE.Mesh(
      new THREE.CylinderGeometry(0.06, 0.06, 0.02, 12), glowGreen
    );
    exhaustGlow.position.y = 0.30;
    backpack.add(exhaustGlow);

    // Hose from pack to right arm (flexible tube)
    const hose = new THREE.Mesh(
      new THREE.CylinderGeometry(0.02, 0.02, 0.50, 8), darkRubber
    );
    hose.rotation.z = Math.PI / 3.5;
    hose.rotation.x = 0.3;
    hose.position.set(0.25, -0.05, 0.08);
    backpack.add(hose);

    // Side tanks (small)
    [-0.18, 0.18].forEach(tx => {
      const sideTank = new THREE.Mesh(
        new THREE.CylinderGeometry(0.04, 0.04, 0.22, 10), armorMid
      );
      sideTank.position.set(tx, -0.04, 0.02);
      backpack.add(sideTank);
    });

    targetGroup.add(backpack);

    // ══════════════════════════════════════════════════════════════════════
    // 6. NECK — short muscular
    // ══════════════════════════════════════════════════════════════════════
    const neck = new THREE.Mesh(
      new THREE.CylinderGeometry(0.09, 0.11, 0.08, 12), suitMat
    );
    neck.position.y = 1.76;
    targetGroup.add(neck);

    // ══════════════════════════════════════════════════════════════════════
    // 7. HEAD — TACTICAL HELMET + GAS MASK RESPIRATOR
    //    Much more detailed and organic to match reference art
    // ══════════════════════════════════════════════════════════════════════
    const headGroup = new THREE.Group();
    headGroup.position.y = 1.92;

    // Base head shape (under helmet)
    const headBase = new THREE.Mesh(
      new THREE.SphereGeometry(0.17, 18, 16), armorDark
    );
    headBase.scale.set(1.0, 1.1, 0.95);
    headBase.castShadow = true;
    headGroup.add(headBase);

    // Helmet shell — military tactical shape
    const helmet = new THREE.Mesh(
      new THREE.SphereGeometry(0.195, 18, 16, 0, Math.PI * 2, 0, Math.PI * 0.65),
      helmetMat
    );
    helmet.scale.set(1.05, 1.0, 1.05);
    helmet.position.y = 0.04;
    helmet.castShadow = true;
    headGroup.add(helmet);

    // Helmet front brim
    const brim = new THREE.Mesh(
      new THREE.BoxGeometry(0.34, 0.03, 0.12), armorDark
    );
    brim.position.set(0, 0.08, 0.14);
    brim.rotation.x = -0.15;
    headGroup.add(brim);

    // Helmet center ridge (mohawk style)
    const ridge = new THREE.Mesh(
      new THREE.BoxGeometry(0.04, 0.06, 0.28), armorMid
    );
    ridge.position.set(0, 0.20, -0.02);
    headGroup.add(ridge);

    // VISOR — wide glowing T-shape or wrap-around
    const visorMain = new THREE.Mesh(
      new THREE.BoxGeometry(0.32, 0.08, 0.04), visorMat
    );
    visorMain.position.set(0, 0.04, 0.19);
    headGroup.add(visorMain);

    // Visor frame
    const visorFrameTop = new THREE.Mesh(
      new THREE.BoxGeometry(0.34, 0.015, 0.045), metalGunmetal
    );
    visorFrameTop.position.set(0, 0.085, 0.19);
    headGroup.add(visorFrameTop);

    const visorFrameBot = new THREE.Mesh(
      new THREE.BoxGeometry(0.34, 0.015, 0.045), metalGunmetal
    );
    visorFrameBot.position.set(0, -0.005, 0.19);
    headGroup.add(visorFrameBot);

    // Gas mask / respirator (lower face)
    const maskBase = new THREE.Mesh(
      new THREE.CylinderGeometry(0.12, 0.10, 0.10, 12), darkRubber
    );
    maskBase.position.set(0, -0.10, 0.10);
    headGroup.add(maskBase);

    // Respirator central vent
    const ventMain = new THREE.Mesh(
      new THREE.CylinderGeometry(0.06, 0.055, 0.08, 10), armorDark
    );
    ventMain.rotation.x = Math.PI / 2;
    ventMain.position.set(0, -0.11, 0.18);
    headGroup.add(ventMain);

    // Respirator vent grill lines
    for (let v = 0; v < 4; v++) {
      const grillLine = new THREE.Mesh(
        new THREE.BoxGeometry(0.08, 0.006, 0.005), metalGunmetal
      );
      grillLine.position.set(0, -0.09 - v * 0.015, 0.22);
      headGroup.add(grillLine);
    }

    // Side filter canisters (round filters on each side of mask)
    [-0.14, 0.14].forEach(fx => {
      const filterBody = new THREE.Mesh(
        new THREE.CylinderGeometry(0.04, 0.04, 0.08, 12), metalGunmetal
      );
      filterBody.rotation.z = Math.PI / 2;
      filterBody.position.set(fx, -0.10, 0.14);
      headGroup.add(filterBody);

      // Filter end cap
      const filterCap = new THREE.Mesh(
        new THREE.CylinderGeometry(0.035, 0.035, 0.01, 10), armorDark
      );
      filterCap.rotation.z = Math.PI / 2;
      filterCap.position.set(fx + (fx > 0 ? 0.04 : -0.04), -0.10, 0.14);
      headGroup.add(filterCap);
    });

    // Helmet side tech panels / ear guards
    [-1, 1].forEach(hx => {
      const earGuard = new THREE.Mesh(
        new THREE.CylinderGeometry(0.06, 0.05, 0.04, 10), armorMid
      );
      earGuard.rotation.z = Math.PI / 2;
      earGuard.position.set(hx * 0.20, 0.02, 0.02);
      headGroup.add(earGuard);

      // Status LED dot
      const led = new THREE.Mesh(
        new THREE.SphereGeometry(0.015, 8, 8), glowGreen
      );
      led.position.set(hx * 0.22, 0.02, 0.06);
      headGroup.add(led);
    });

    // Helmet chin strap
    const chinStrap = new THREE.Mesh(
      new THREE.TorusGeometry(0.16, 0.012, 6, 16, Math.PI),
      armorDark
    );
    chinStrap.rotation.x = Math.PI;
    chinStrap.rotation.y = Math.PI;
    chinStrap.position.set(0, -0.12, 0.06);
    headGroup.add(chinStrap);

    // Antenna on right side
    const antenna = new THREE.Mesh(
      new THREE.CylinderGeometry(0.006, 0.006, 0.18, 6), metalGunmetal
    );
    antenna.position.set(0.18, 0.18, -0.02);
    antenna.rotation.z = -0.15;
    headGroup.add(antenna);

    const antennaTip = new THREE.Mesh(
      new THREE.SphereGeometry(0.012, 6, 6), glowCyan
    );
    antennaTip.position.set(0.19, 0.27, -0.03);
    headGroup.add(antennaTip);

    targetGroup.add(headGroup);
    targetGroup.userData.headGroup = headGroup;

    // ══════════════════════════════════════════════════════════════════════
    // 8. RIGHT-HAND ECO-VACUUM WEAPON
    // ══════════════════════════════════════════════════════════════════════
    const weaponGroup = new THREE.Group();
    weaponGroup.position.set(0.44, 0.92, 0.15);

    // Main shaft
    const shaft = new THREE.Mesh(
      new THREE.CylinderGeometry(0.025, 0.022, 0.95, 10), armorDark
    );
    shaft.rotation.x = Math.PI / 3.8;
    shaft.castShadow = true;
    weaponGroup.add(shaft);

    // Handle grip
    const grip = new THREE.Mesh(
      new THREE.CylinderGeometry(0.04, 0.035, 0.14, 10), leatherBrown
    );
    grip.position.set(0, -0.08, 0.08);
    grip.rotation.x = 0.3;
    weaponGroup.add(grip);

    // Trigger guard
    const trigGuard = new THREE.Mesh(
      new THREE.TorusGeometry(0.035, 0.006, 6, 12, Math.PI),
      metalGunmetal
    );
    trigGuard.position.set(0, -0.04, 0.12);
    trigGuard.rotation.y = Math.PI / 2;
    weaponGroup.add(trigGuard);

    // Barrel / nozzle
    const barrel = new THREE.Mesh(
      new THREE.CylinderGeometry(0.08, 0.05, 0.22, 14), armorDark
    );
    barrel.rotation.x = Math.PI / 3.8;
    barrel.position.set(0, 0.38, 0.40);
    barrel.castShadow = true;
    weaponGroup.add(barrel);

    // Nozzle mouth glow
    const nozzleMouth = new THREE.Mesh(
      new THREE.CylinderGeometry(0.06, 0.06, 0.03, 14), weaponGlow
    );
    nozzleMouth.rotation.x = Math.PI / 3.8;
    nozzleMouth.position.set(0, 0.48, 0.50);
    weaponGroup.add(nozzleMouth);

    // Energy coils along shaft
    [0.06, 0.18, 0.30].forEach(ry => {
      const coil = new THREE.Mesh(
        new THREE.TorusGeometry(0.032, 0.007, 6, 14), weaponGlow
      );
      coil.position.set(0, ry, ry * 0.68);
      coil.rotation.x = Math.PI / 3.8;
      weaponGroup.add(coil);
    });

    // Weapon body mid-section
    const weaponBody = new THREE.Mesh(
      new THREE.BoxGeometry(0.06, 0.08, 0.12), armorMid
    );
    weaponBody.position.set(0, 0.12, 0.18);
    weaponBody.rotation.x = 0.3;
    weaponGroup.add(weaponBody);

    targetGroup.add(weaponGroup);
    targetGroup.userData.weapon = weaponGroup;
  },

  // ══════════════════════════════════════════════════════════════════════
  // PETS — ECO-COMPANIONS 3D ENGINE (4 Unique Species)
  // ══════════════════════════════════════════════════════════════════════
  buildPet(targetGroup, petId = 'ecobot') {
    while (targetGroup.children.length > 0) {
      targetGroup.remove(targetGroup.children[0]);
    }

    targetGroup.userData.petId = petId;

    const glowGreen = new THREE.MeshStandardMaterial({ color: 0x00ff88, emissive: 0x00ff88, emissiveIntensity: 0.75 });
    const glowCyan = new THREE.MeshStandardMaterial({ color: 0x00e5ff, emissive: 0x00e5ff, emissiveIntensity: 0.65 });
    const glowAmber = new THREE.MeshStandardMaterial({ color: 0xf59e0b, emissive: 0xf59e0b, emissiveIntensity: 2.5 });
    const glowRose = new THREE.MeshStandardMaterial({ color: 0xec4899, emissive: 0xec4899, emissiveIntensity: 2.5 });

    const chromeMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, metalness: 0.9, roughness: 0.15 });
    const darkMetal = new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.8, roughness: 0.3 });
    const blackRubber = new THREE.MeshStandardMaterial({ color: 0x09090b, roughness: 0.8 });

    switch (petId) {
      
      // ── 1. ECO-BOT 3000 (Androide giroscópico orbital) ─────────────────
      case 'ecobot':
      default: {
        const core = new THREE.Mesh(new THREE.SphereGeometry(0.16, 20, 20), chromeMat);
        targetGroup.add(core);

        const eye = new THREE.Mesh(new THREE.SphereGeometry(0.07, 14, 14), glowCyan);
        eye.position.set(0, 0.02, 0.13);
        targetGroup.add(eye);

        const ring1 = new THREE.Mesh(new THREE.TorusGeometry(0.24, 0.016, 10, 32), glowGreen);
        ring1.rotation.x = Math.PI / 4;
        targetGroup.add(ring1);
        targetGroup.userData.ring1 = ring1;

        const ring2 = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.012, 10, 32), glowCyan);
        ring2.rotation.y = Math.PI / 3;
        targetGroup.add(ring2);
        targetGroup.userData.ring2 = ring2;

        const ant = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.18, 6), darkMetal);
        ant.position.set(0, 0.22, 0);
        targetGroup.add(ant);

        const antTip = new THREE.Mesh(new THREE.SphereGeometry(0.025, 8, 8), glowGreen);
        antTip.position.set(0, 0.32, 0);
        targetGroup.add(antTip);

        // Micro propulsores laterales
        [-0.17, 0.17].forEach(tx => {
          const thruster = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.02, 0.06, 10), darkMetal);
          thruster.rotation.z = tx > 0 ? -Math.PI / 3 : Math.PI / 3;
          thruster.position.set(tx, -0.06, 0);
          targetGroup.add(thruster);
        });
        break;
      }

      // ── 2. RANITA BIO-LIMPIADORA (Loto aerodeslizador) ─────────────────
      case 'froggy': {
        const frogMat = new THREE.MeshStandardMaterial({ color: 0x4ade80, roughness: 0.4, metalness: 0.1 });
        const bellyMat = new THREE.MeshStandardMaterial({ color: 0xdcfce7, roughness: 0.5 });
        const leafMat = new THREE.MeshStandardMaterial({ color: 0x15803d, roughness: 0.3, emissive: 0x166534, emissiveIntensity: 0.4 });

        // Hoja de loto flotante (plataforma circular con muesca)
        const lilyPad = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.02, 24), leafMat);
        lilyPad.position.y = -0.12;
        targetGroup.add(lilyPad);

        const lilyBorder = new THREE.Mesh(new THREE.TorusGeometry(0.275, 0.012, 8, 32), glowGreen);
        lilyBorder.rotation.x = Math.PI / 2;
        lilyBorder.position.y = -0.11;
        targetGroup.add(lilyBorder);
        targetGroup.userData.ring1 = lilyBorder;

        // Cuerpo redondeado de la ranita
        const body = new THREE.Mesh(new THREE.SphereGeometry(0.14, 16, 14), frogMat);
        body.scale.set(1.1, 0.95, 1.0);
        targetGroup.add(body);

        // Barriga clara
        const belly = new THREE.Mesh(new THREE.SphereGeometry(0.09, 12, 10), bellyMat);
        belly.position.set(0, -0.02, 0.09);
        belly.scale.set(1.0, 0.9, 0.5);
        targetGroup.add(belly);

        // Ojos saltones grandes
        [-0.08, 0.08].forEach(ex => {
          const eyePod = new THREE.Mesh(new THREE.SphereGeometry(0.06, 12, 12), frogMat);
          eyePod.position.set(ex, 0.11, 0.07);
          targetGroup.add(eyePod);

          const eyeBall = new THREE.Mesh(new THREE.SphereGeometry(0.045, 10, 10), glowCyan);
          eyeBall.position.set(ex, 0.11, 0.11);
          targetGroup.add(eyeBall);

          const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.02, 8, 8), blackRubber);
          pupil.position.set(ex, 0.11, 0.145);
          targetGroup.add(pupil);
        });

        // Flor de loto pequeña en la cabeza
        const flower = new THREE.Mesh(new THREE.ConeGeometry(0.04, 0.07, 6), glowRose);
        flower.position.set(0, 0.17, 0);
        targetGroup.add(flower);

        // Patitas
        [-0.12, 0.12].forEach(lx => {
          const leg = new THREE.Mesh(new THREE.SphereGeometry(0.05, 8, 8), frogMat);
          leg.scale.set(1.4, 0.6, 1.2);
          leg.position.set(lx, -0.09, 0.04);
          targetGroup.add(leg);
        });
        break;
      }

      // ── 3. DRON POLINIZADOR (Micro-dron avispa bio-tech) ───────────────
      case 'drone_bee': {
        const beeYellow = new THREE.MeshStandardMaterial({ color: 0xfbbf24, roughness: 0.35, metalness: 0.4 });

        // Cuerpo rayado aerodinámico
        const beeBody = new THREE.Mesh(new THREE.SphereGeometry(0.13, 16, 14), beeYellow);
        beeBody.scale.set(0.9, 0.85, 1.35);
        targetGroup.add(beeBody);

        // Rayas negras cibernéticas
        [-0.03, 0.04].forEach(rz => {
          const stripe = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.03, 16), blackRubber);
          stripe.rotation.x = Math.PI / 2;
          stripe.position.set(0, 0, rz);
          targetGroup.add(stripe);
        });

        // Ojos facetados hexagonales amarillos
        [-0.07, 0.07].forEach(ex => {
          const eye = new THREE.Mesh(new THREE.SphereGeometry(0.045, 10, 10), glowAmber);
          eye.position.set(ex, 0.04, 0.14);
          targetGroup.add(eye);
        });

        // Aguijón láser posterior
        const stinger = new THREE.Mesh(new THREE.ConeGeometry(0.035, 0.12, 8), glowAmber);
        stinger.rotation.x = -Math.PI / 2;
        stinger.position.set(0, -0.02, -0.22);
        targetGroup.add(stinger);

        // 4 Rotores con hélices holográficas giratorias
        const rotorGrp = new THREE.Group();
        [
          { x: -0.18, z: 0.08 },
          { x: 0.18, z: 0.08 },
          { x: -0.16, z: -0.10 },
          { x: 0.16, z: -0.10 }
        ].forEach((pos, idx) => {
          const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, 0.14, 6), darkMetal);
          arm.position.set(pos.x * 0.6, 0.06, pos.z * 0.6);
          rotorGrp.add(arm);

          // Anillo de hélice giratoria
          const prop = new THREE.Mesh(new THREE.TorusGeometry(0.07, 0.008, 6, 20), glowAmber);
          prop.rotation.x = Math.PI / 2;
          prop.position.set(pos.x, 0.10, pos.z);
          rotorGrp.add(prop);
        });

        targetGroup.add(rotorGrp);
        targetGroup.userData.ring1 = rotorGrp; // Rotates fast in animation loop!
        break;
      }

      // ── 4. NUTRIA DE RÍO (Buceadora hidrodinámica) ─────────────────────
      case 'otter_clean': {
        const otterBrown = new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.5, metalness: 0.1 });
        const bellyTan = new THREE.MeshStandardMaterial({ color: 0xfef3c7, roughness: 0.6 });

        // Cuerpo cilíndrico alargado curvado
        const otterBody = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.11, 0.32, 14), otterBrown);
        otterBody.rotation.x = Math.PI / 3;
        targetGroup.add(otterBody);

        // Pecho claro
        const otterChest = new THREE.Mesh(new THREE.SphereGeometry(0.08, 10, 10), bellyTan);
        otterChest.position.set(0, 0.02, 0.08);
        targetGroup.add(otterChest);

        // Cabeza redonda simpática
        const head = new THREE.Mesh(new THREE.SphereGeometry(0.10, 14, 12), otterBrown);
        head.position.set(0, 0.16, 0.14);
        targetGroup.add(head);

        // Hocico
        const snout = new THREE.Mesh(new THREE.SphereGeometry(0.05, 10, 8), bellyTan);
        snout.position.set(0, 0.14, 0.22);
        snout.scale.set(1.2, 0.8, 1.0);
        targetGroup.add(snout);

        const nose = new THREE.Mesh(new THREE.SphereGeometry(0.02, 6, 6), blackRubber);
        nose.position.set(0, 0.16, 0.26);
        targetGroup.add(nose);

        // Gafas de buceo acuáticas cyan holográficas
        const goggles = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.06, 0.05), glowCyan);
        goggles.position.set(0, 0.19, 0.20);
        targetGroup.add(goggles);

        // Cola nadadora posterior
        const tail = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.02, 0.26, 10), otterBrown);
        tail.rotation.x = -Math.PI / 3.5;
        tail.position.set(0, -0.16, -0.16);
        targetGroup.add(tail);

        // Burbujas de energía acuática orbitales
        const bubbleRing = new THREE.Mesh(new THREE.TorusGeometry(0.24, 0.012, 8, 24), glowCyan);
        bubbleRing.rotation.x = Math.PI / 2.5;
        targetGroup.add(bubbleRing);
        targetGroup.userData.ring1 = bubbleRing;
        break;
      }
    }

    targetGroup.position.set(0.72, 1.45, -0.6);
  }
};
