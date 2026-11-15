/* =========================================================================
   TRASH MAN 3D - HUMAN CHARACTER SYSTEM
   Organic procedural humans (no more robot look):
   - Torso built from an anatomical lathe profile (waist, chest, hips)
   - Muscle masses (deltoids, biceps, quads, calves, pecs, glutes) as
     ellipsoids, tapered limbs, real joints with knee/elbow hinges
   - Faces with eyes, brows, nose, lips, ears, jaw; hair styles; beards
   - 10 heroes (5 men, 5 women) with different heights, builds, ages,
     skin tones and hairstyles
   - Smooth procedural locomotion (walk, run, jump, idle breathing) that
     blends in and out of motion instead of snapping
   It keeps the same rig names the rest of the game uses:
   torso, headGroup, leftArm, rightArm, leftLeg, rightLeg, weapon
   ========================================================================= */

window.TrashGame = window.TrashGame || {};

TrashGame.Humans = {
  _geo: {},

  // -----------------------------------------------------------------------
  // ROSTER — 10 heroes. Multipliers are relative to an average adult.
  //   g: gender  h: height  fr: frame width  sh: shoulders  ch: chest depth
  //   wa: waist  hi: hips   ar: arm thickness lg: leg thickness  fw: foot/hand size
  // -----------------------------------------------------------------------
  roster: [
    { key: 'abraham', name: 'Abraham', role: 'El Guardián Urbano', g: 'm',
      h: 1.00, fr: 1.04, sh: 1.10, ch: 1.10, wa: 1.00, hi: 0.98, ar: 1.12, lg: 1.06, fw: 1.0,
      skin: 0xc68642, eyes: 0x3b2a1a, lip: 0x8a5a3a,
      hair: { style: 'short', color: 0x1c1410, beard: 'stubble' },
      outfit: { shirt: 0x354d2e, vest: 0x1a261a, pants: 0x2b3d26, boots: 0x1a1f18 } },

    { key: 'sasha', name: 'Sasha', role: 'La Exploradora Silvestre', g: 'f',
      h: 0.97, fr: 1.00, sh: 0.92, ch: 0.96, wa: 0.90, hi: 1.05, ar: 0.92, lg: 1.00, fw: 0.92,
      skin: 0xd8a07a, eyes: 0x4a3420, lip: 0xa84a5a,
      hair: { style: 'ponytail', color: 0x3b2516, beard: null },
      outfit: { shirt: 0x0f766e, vest: 0x134e4a, pants: 0x1e293b, boots: 0x0f172a } },

    { key: 'marcus', name: 'Marcus', role: 'El Bloque de Acero', g: 'm',
      h: 1.09, fr: 1.10, sh: 1.20, ch: 1.20, wa: 1.08, hi: 1.05, ar: 1.20, lg: 1.12, fw: 1.10,
      skin: 0x6b4423, eyes: 0x2a1a10, lip: 0x4a2c1a,
      hair: { style: 'buzz', color: 0x0f0a08, beard: 'short' },
      outfit: { shirt: 0x4d5a3a, vest: 0x2e3a24, pants: 0x3a3a30, boots: 0x111111 } },

    { key: 'diego', name: 'Diego', role: 'El Corredor del Río', g: 'm',
      h: 0.98, fr: 0.98, sh: 1.02, ch: 0.98, wa: 0.92, hi: 0.94, ar: 1.00, lg: 1.00, fw: 1.0,
      skin: 0xd9a27c, eyes: 0x2a1a10, lip: 0xa0604a,
      hair: { style: 'wavy', color: 0x2a1a10, beard: null },
      outfit: { shirt: 0x1e3a5f, vest: 0x14293f, pants: 0x1f2937, boots: 0x3f2a1a } },

    { key: 'kenji', name: 'Kenji', role: 'El Técnico Ágil', g: 'm',
      h: 0.94, fr: 0.96, sh: 0.98, ch: 0.94, wa: 0.90, hi: 0.94, ar: 0.92, lg: 0.96, fw: 0.94,
      skin: 0xe8b48a, eyes: 0x1a1a1a, lip: 0xb07a62,
      hair: { style: 'short', color: 0x0b0b0b, beard: null },
      outfit: { shirt: 0x6b7280, vest: 0x374151, pants: 0x1f2937, boots: 0x111827 } },

    { key: 'tomas', name: 'Tomás', role: 'El Veterano del Reciclaje', g: 'm',
      h: 0.95, fr: 1.12, sh: 1.04, ch: 1.14, wa: 1.20, hi: 1.08, ar: 1.00, lg: 0.98, fw: 1.05,
      skin: 0xa8703f, eyes: 0x3a2a1a, lip: 0x7a4a2a,
      hair: { style: 'short', color: 0x9ca3af, beard: 'full', beardColor: 0x9ca3af },
      outfit: { shirt: 0x8b6f47, vest: 0x5c4630, pants: 0x4b3b2a, boots: 0x2a1d12 } },

    { key: 'lucia', name: 'Lucía', role: 'La Ingeniera de Campo', g: 'f',
      h: 1.00, fr: 1.04, sh: 0.94, ch: 1.02, wa: 0.80, hi: 1.22, ar: 0.96, lg: 1.10, fw: 0.95,
      skin: 0xc68a5e, eyes: 0x3b2a1a, lip: 0xb0505a,
      hair: { style: 'long', color: 0x140c08, beard: null },
      outfit: { shirt: 0xdc2626, vest: 0x7f1d1d, pants: 0x1c1917, boots: 0x292524 } },

    { key: 'mei', name: 'Mei', role: 'La Clasificadora Veloz', g: 'f',
      h: 0.90, fr: 0.90, sh: 0.82, ch: 0.88, wa: 0.80, hi: 0.98, ar: 0.80, lg: 0.90, fw: 0.86,
      skin: 0xf1c9a5, eyes: 0x2a2030, lip: 0xc0707a,
      hair: { style: 'bun', color: 0x0b0b0b, beard: null },
      outfit: { shirt: 0x7c3aed, vest: 0x4c1d95, pants: 0x1e1b4b, boots: 0x0f0f23 } },

    { key: 'amara', name: 'Amara', role: 'La Atleta del Vertedero', g: 'f',
      h: 1.06, fr: 1.02, sh: 1.00, ch: 1.04, wa: 0.90, hi: 1.10, ar: 1.06, lg: 1.08, fw: 1.05,
      skin: 0x7a4a2c, eyes: 0x1c110a, lip: 0x5a3020,
      hair: { style: 'afro', color: 0x0d0705, beard: null },
      outfit: { shirt: 0xeab308, vest: 0x854d0e, pants: 0x1f2937, boots: 0x1c1917 } },

    { key: 'rosa', name: 'Rosa', role: 'La Guardiana del Barrio', g: 'f',
      h: 0.99, fr: 1.06, sh: 0.96, ch: 1.06, wa: 1.00, hi: 1.12, ar: 1.00, lg: 1.00, fw: 1.0,
      skin: 0xb27850, eyes: 0x3b2a1a, lip: 0x8a4a3a,
      hair: { style: 'bun', color: 0x6e5a4e, beard: null },
      outfit: { shirt: 0x16a34a, vest: 0x14532d, pants: 0x3f3f46, boots: 0x292524 } }
  ],

  getSpec(key) {
    return this.roster.find(r => r.key === key) || null;
  },

  has(key) {
    return !!this.getSpec(key);
  },

  // -----------------------------------------------------------------------
  // GEOMETRY CACHE (shared across all characters)
  // -----------------------------------------------------------------------
  g(key, make) {
    if (!this._geo[key]) this._geo[key] = make();
    return this._geo[key];
  },
  sphere() { return this.g('sph', () => new THREE.SphereGeometry(1, 24, 16)); },
  hemi()   { return this.g('hemi', () => new THREE.SphereGeometry(1, 24, 14, 0, Math.PI * 2, 0, Math.PI * 0.5)); },
  cyl(r0, r1, len) {
    const k = 'cyl' + r0.toFixed(4) + '_' + r1.toFixed(4) + '_' + len.toFixed(4);
    return this.g(k, () => new THREE.CylinderGeometry(r0, r1, len, 20, 1));
  },
  box(w, h, d) {
    const k = 'box' + w.toFixed(4) + '_' + h.toFixed(4) + '_' + d.toFixed(4);
    return this.g(k, () => new THREE.BoxGeometry(w, h, d));
  },

  // Ellipsoid "muscle" / organ / feature at a local position
  blob(parent, mat, rx, ry, rz, x, y, z, rot) {
    const m = new THREE.Mesh(this.sphere(), mat);
    m.scale.set(rx, ry, rz);
    m.position.set(x, y, z);
    if (rot) m.rotation.set(rot[0], rot[1], rot[2]);
    m.castShadow = true;
    parent.add(m);
    return m;
  },

  // Tapered limb segment hanging DOWN from pivot (x, y) in parent space
  seg(parent, mat, r0, r1, len, x, y, z) {
    const m = new THREE.Mesh(this.cyl(r0, r1, len), mat);
    m.position.set(x, y - len / 2, z);
    m.castShadow = true;
    parent.add(m);
    return m;
  },

  mat(color, rough, metal, extra) {
    return new THREE.MeshStandardMaterial(Object.assign({ color: color, roughness: rough, metalness: metal || 0 }, extra || {}));
  },

  detailBump(seed, amount = 22) {
    const size = 128;
    const data = new Uint8Array(size * size);
    let value = seed >>> 0;
    for (let i = 0; i < data.length; i++) {
      value = (value * 1664525 + 1013904223) >>> 0;
      data[i] = 128 + ((value >>> 24) % amount) - Math.floor(amount / 2);
    }
    const texture = new THREE.DataTexture(data, size, size, THREE.LuminanceFormat);
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(2, 2);
    texture.needsUpdate = true;
    return texture;
  },

  // -----------------------------------------------------------------------
  // BUILD
  // -----------------------------------------------------------------------
  build(targetGroup, key, equipped) {
    if (targetGroup.userData && targetGroup.userData.gltfMixer) targetGroup.userData.gltfMixer.stopAllAction();
    if (targetGroup.userData) {
      delete targetGroup.userData.gltfMixer;
      delete targetGroup.userData.gltfActions;
      delete targetGroup.userData.gltfCurrentAction;
      delete targetGroup.userData.tmModel;
    }
    while (targetGroup.children.length > 0) {
      const child = targetGroup.children[0];
      if (window.TM && window.TM.disposeDynamic) window.TM.disposeDynamic(child);
      targetGroup.remove(child);
    }
    const s = this.getSpec(key) || this.roster[0];
    const f = s.g === 'f';
    const u = targetGroup.userData;
    ['torso', 'headGroup', 'leftArm', 'rightArm', 'leftLeg', 'rightLeg', 'weapon'].forEach(k => { u[k] = null; });
    u.isHuman = true;
    u.gender = s.g;

    // Use the character meshes from the supplied Trash Man model pack. Unlike
    // the remote GLB, these are local files and also work when index.html is
    // opened directly from disk.
    if (window.TM && typeof window.TM.build === 'function') {
      try {
        return this.buildTrashPackHero(targetGroup, key, equipped);
      } catch (error) {
        console.warn('[Humans] Trash Man model pack failed; using human fallback.', error);
        while (targetGroup.children.length > 0) {
          const child = targetGroup.children[0];
          if (window.TM.disposeDynamic) window.TM.disposeDynamic(child);
          targetGroup.remove(child);
        }
      }
    }

    // Use the supplied skinned, animated human for the main male heroes.
    // The hand-built figure remains a fallback when the GLB is unavailable.
    // Local file:// pages cannot reliably fetch rigged GLBs in Chromium. Keep the
    // fully visible procedural human there; use the skinned model on a local server.
    if (s.g === 'm' && window.location.protocol !== 'file:' && TrashGame.AssetLoader && TrashGame.AssetLoader.has('hero')) {
      try {
        return this.buildRiggedHero(targetGroup, s, equipped);
      } catch (error) {
        console.warn('[Humans] Rigged hero failed; using procedural fallback.', error);
        if (u.gltfMixer) u.gltfMixer.stopAllAction();
        delete u.gltfMixer;
        while (targetGroup.children.length > 0) targetGroup.remove(targetGroup.children[0]);
      }
    }

    const itemColor = (slot) => {
      const item = equipped && TrashGame.Items ? TrashGame.Items.find(i => i.id === equipped[slot]) : null;
      return item ? item.color : null;
    };
    const headC = itemColor('head');
    const torsoC = itemColor('torso');
    const legsC = itemColor('legs');
    const feetC = itemColor('feet');
    const weaponC = itemColor('weapon');
    const headItemId = equipped && equipped.head;
    const naturalCloth = (hex, blend = 0.2) => {
      const color = new THREE.Color(hex);
      color.lerp(new THREE.Color(0x77766a), blend);
      color.multiplyScalar(0.88);
      return color;
    };
    const fabricBump = this.detailBump(0x4a31, 28);
    const skinBump = this.detailBump(0x8b17, 12);

    // Materials (per character)
    const M = {
      skin: this.mat(s.skin, 0.76, 0.0, { bumpMap: skinBump, bumpScale: 0.008 }),
      lip: this.mat(s.lip, 0.4, 0.0),
      eyeW: this.mat(0xf4f4f0, 0.2, 0.0),
      iris: this.mat(s.eyes, 0.25, 0.0),
      hair: this.mat(s.hair.color, 0.6, 0.05),
      shirt: this.mat(naturalCloth(torsoC || s.outfit.shirt, 0.24), 0.88, 0.02, { bumpMap: fabricBump, bumpScale: 0.018 }),
      vest: this.mat(s.outfit.vest, 0.72, 0.08),
      pants: this.mat(naturalCloth(legsC || s.outfit.pants, 0.18), 0.9, 0.02, { bumpMap: fabricBump, bumpScale: 0.022 }),
      boots: this.mat(naturalCloth(feetC || s.outfit.boots, 0.1), 0.78, 0.06),
      helmet: this.mat(headC || s.outfit.vest, 0.62, 0.18),
      metal: this.mat(0x4a5a4a, 0.2, 0.9),
      glow: new THREE.MeshStandardMaterial({ color: 0x50a66b, emissive: 0x174a2d, emissiveIntensity: 0.35, roughness: 0.45 }),
      weaponGlow: new THREE.MeshStandardMaterial({ color: weaponC || 0x77c98d, emissive: weaponC || 0x174a2d, emissiveIntensity: 0.55, roughness: 0.35 })
    };
    if (s.hair.beardColor) M.beard = this.mat(s.hair.beardColor, 0.7, 0.05);
    else M.beard = M.hair;

    // Body root (scales the whole figure for height / frame)
    const B = new THREE.Group();
    B.scale.set(s.fr, s.h, s.fr);
    targetGroup.add(B);

    // Base anatomy (metres, average adult), varied per gender then per hero
    const base = f
      ? { hip: 0.165, waist: 0.112, chest: 0.150, neck: 0.050, xs: 1.10, zs: 0.66, sx: 0.165, dR: 0.066 }
      : { hip: 0.158, waist: 0.142, chest: 0.170, neck: 0.058, xs: 1.00, zs: 0.72, sx: 0.200, dR: 0.085 };
    const hipR = base.hip * s.hi;
    const waistR = base.waist * s.wa;
    const chestR = base.chest * s.ch;
    const xs = base.xs * s.sh;
    const zs = base.zs;
    const sx = chestR * xs * 0.93;   // shoulder joint x
    const dR = base.dR * s.ar;       // deltoid radius

    // ── TORSO (origin = hip centre) ─────────────────────────────────────
    const T = new THREE.Group();
    T.position.set(0, 0.95, 0);
    B.add(T);
    u.torso = T;

    const prof = [
      [hipR * 0.80, -0.05], [hipR, 0.02], [hipR * 1.02, 0.09],
      [(hipR + waistR) / 2, 0.16], [waistR, 0.23], [waistR * 1.04, 0.29],
      [(waistR + chestR) / 2, 0.35], [chestR * 0.98, 0.42], [chestR, 0.47],
      [chestR * 0.92, 0.53], [chestR * 0.62, 0.575], [base.neck * 1.1, 0.61]
    ].map(p => new THREE.Vector2(p[0], p[1]));
    const torsoGeo = new THREE.LatheGeometry(prof, 36);
    const torsoMesh = new THREE.Mesh(torsoGeo, M.shirt);
    torsoMesh.scale.set(xs, 1, zs);
    torsoMesh.castShadow = true;
    T.add(torsoMesh);

    // Vest: same silhouette, slightly outside, mid-torso band
    const vestPts = prof.filter(p => p.y >= 0.18 && p.y <= 0.56)
      .map(p => new THREE.Vector2(p.x + 0.018, p.y));
    if (vestPts.length > 2) {
      const vest = new THREE.Mesh(new THREE.LatheGeometry(vestPts, 36), M.vest);
      vest.scale.set(xs, 1, zs);
      vest.castShadow = true;
      T.add(vest);
    }

    // Chest emblem (identity of the Trash Man)
    const zFront = zs * (chestR + 0.018) + 0.012;
    const emblem = new THREE.Mesh(this.g('emb', () => new THREE.TorusGeometry(0.034, 0.006, 8, 24)), M.glow);
    emblem.position.set(0, 0.41, zFront * 0.98);
    T.add(emblem);

    // Visible tailoring keeps the jacket from reading as a smooth toy shell.
    const seamMat = this.mat(0x202a25, 0.86, 0.02);
    const zip = new THREE.Mesh(this.box(0.009, 0.31, 0.008), seamMat);
    zip.position.set(0, 0.36, zFront * 0.99);
    T.add(zip);
    [-1, 1].forEach(sd => {
      const pocket = new THREE.Mesh(this.box(0.075, 0.078, 0.018), M.vest);
      pocket.position.set(sd * 0.105, 0.34, zFront * 0.88);
      T.add(pocket);
      const flap = new THREE.Mesh(this.box(0.079, 0.018, 0.022), seamMat);
      flap.position.set(sd * 0.105, 0.38, zFront * 0.9);
      T.add(flap);
      const buckle = new THREE.Mesh(this.box(0.012, 0.016, 0.006), M.metal);
      buckle.position.set(sd * 0.105, 0.377, zFront * 0.98);
      T.add(buckle);
    });

    // Pecs (male) or bust (female), clothed in shirt material
    if (!f) {
      [-1, 1].forEach(sd => {
        this.blob(T, M.shirt, 0.07, 0.05, 0.05, sd * 0.062 * xs, 0.4, zs * chestR * 0.9, [0.1, 0, sd * 0.05]);
      });
    } else {
      [-1, 1].forEach(sd => {
        this.blob(T, M.shirt, 0.062, 0.058, 0.055, sd * 0.07 * xs, 0.39, zs * chestR + 0.02);
      });
    }

    // Glutes (pants material) and backpack
    [-1, 1].forEach(sd => {
      this.blob(T, M.pants, f ? 0.09 : 0.08, 0.08, 0.075, sd * 0.07, -0.03, -0.085);
    });
    const pack = new THREE.Mesh(this.box(0.2 * xs * 0.9, 0.3, 0.11), M.metal);
    pack.position.set(0, 0.33, -zs * chestR - 0.05);
    pack.castShadow = true;
    T.add(pack);
    const packStrip = new THREE.Mesh(this.box(0.18 * xs * 0.9, 0.012, 0.005), M.glow);
    packStrip.position.set(0, 0.33, -zs * chestR - 0.107);
    T.add(packStrip);

    // Neck
    const neck = this.seg(T, M.skin, base.neck, base.neck * 0.95, 0.12, 0, 0.68, 0);

    // ── HEAD ───────────────────────────────────────────────────────────
    const H = new THREE.Group();
    H.scale.setScalar(1.06);
    H.position.set(0, 0.6, 0);
    T.add(H);
    u.headGroup = H;

    const hw = f ? 0.96 : 1.0;
    const headProfile = [
      [0.018, 0.015], [0.052, 0.018], [0.078, 0.045], [0.095, 0.085],
      [0.105, 0.14], [0.105, 0.205], [0.088, 0.255], [0.052, 0.285], [0, 0.29]
    ].map(p => new THREE.Vector2(p[0] * hw, p[1]));
    const face = new THREE.Mesh(new THREE.LatheGeometry(headProfile, 32), M.skin);
    face.castShadow = true;
    H.add(face);
    this.blob(H, M.skin, 0.02, 0.04, 0.018, -0.105 * hw, 0.15, 0);                // ears
    this.blob(H, M.skin, 0.02, 0.04, 0.018, 0.105 * hw, 0.15, 0);
    const earShadow = this.mat(0x754b38, 0.82, 0);
    this.blob(H, earShadow, 0.006, 0.021, 0.003, -0.112 * hw, 0.15, 0.015);
    this.blob(H, earShadow, 0.006, 0.021, 0.003, 0.112 * hw, 0.15, 0.015);
    this.blob(H, M.skin, 0.014, 0.036, 0.024, 0, 0.14, 0.105);                      // nose bridge
    this.blob(H, M.skin, 0.022, 0.018, 0.025, 0, 0.112, 0.115);                    // nose tip
    [-1, 1].forEach(sd => {
      this.blob(H, M.eyeW, 0.028, 0.016, 0.014, sd * 0.042, 0.172, 0.094);          // eye white
      this.blob(H, M.iris, 0.013, 0.013, 0.009, sd * 0.042, 0.172, 0.105);          // iris
      this.blob(H, this.g('pupilMat', () => this.mat(0x171513, 0.22, 0)), 0.0055, 0.008, 0.004, sd * 0.042, 0.172, 0.112); // pupil
      this.blob(H, this.g('eyeCatch', () => this.mat(0xffffff, 0.18, 0)), 0.003, 0.003, 0.002, sd * 0.042 - 0.002, 0.175, 0.116);
      const brow = new THREE.Mesh(new THREE.CapsuleGeometry(0.006, 0.032, 4, 8), M.hair);
      brow.position.set(sd * 0.042, 0.203, 0.102);
      brow.rotation.z = Math.PI / 2 + sd * -0.12;
      H.add(brow);
    });
    this.blob(H, M.lip, f ? 0.03 : 0.028, 0.006, 0.01, 0, 0.084, 0.105);            // upper lip
    this.blob(H, M.skin, 0.022, 0.004, 0.008, 0, 0.074, 0.105);                     // lower lip

    // Facial hair
    if (s.hair.beard === 'stubble') this.blob(H, M.beard, 0.09, 0.06, 0.07, 0, 0.06, 0.035);
    if (s.hair.beard === 'short')   this.blob(H, M.beard, 0.096, 0.075, 0.075, 0, 0.07, 0.03);
    if (s.hair.beard === 'full')    this.blob(H, M.beard, 0.104, 0.11, 0.092, 0, 0.04, 0.035);

    // Hair styles
    const cap = (r, rx, ry, rz, y, z) => {
      const c = new THREE.Mesh(this.hemi(), M.hair);
      c.scale.set(rx, ry, rz);
      c.position.set(0, y, z || 0);
      c.castShadow = true;
      H.add(c);
      return c;
    };
    switch (s.hair.style) {
      case 'short':
        cap(0.11, 0.118, 0.13, 0.12, 0.15, -0.006); break;
      case 'buzz':
        cap(0.11, 0.108, 0.12, 0.11, 0.15, -0.004); break;
      case 'wavy':
        cap(0.11, 0.126, 0.14, 0.125, 0.15, -0.006);
        this.blob(H, M.hair, 0.11, 0.12, 0.06, 0, 0.1, -0.09); break;
      case 'long':
        cap(0.11, 0.122, 0.135, 0.12, 0.15, -0.006);
        this.blob(H, M.hair, 0.118, 0.22, 0.07, 0, 0.0, -0.075);
        this.blob(H, M.hair, 0.03, 0.12, 0.06, -0.1, 0.02, 0.0);
        this.blob(H, M.hair, 0.03, 0.12, 0.06, 0.1, 0.02, 0.0); break;
      case 'ponytail':
        cap(0.11, 0.118, 0.13, 0.12, 0.15, -0.006);
        this.blob(H, M.hair, 0.04, 0.13, 0.04, 0, 0.12, -0.13, [-0.5, 0, 0]);
        this.blob(H, M.hair, 0.022, 0.022, 0.022, 0, 0.23, -0.1); break;
      case 'bun':
        cap(0.11, 0.118, 0.13, 0.12, 0.15, -0.006);
        this.blob(H, M.hair, 0.052, 0.05, 0.05, 0, 0.23, -0.08); break;
      case 'afro': {
        // Puff sits ON the crown: ring above the forehead line, then a big top volume
        for (let i = 0; i < 9; i++) {
          const a = (i / 9) * Math.PI * 2;
          this.blob(H, M.hair, 0.062, 0.062, 0.062, Math.cos(a) * 0.088, 0.225, Math.sin(a) * 0.075 - 0.02);
        }
        this.blob(H, M.hair, 0.092, 0.075, 0.09, 0, 0.27, -0.02);
        this.blob(H, M.hair, 0.085, 0.08, 0.075, 0, 0.2, -0.085);
        break;
      }
    }

    // Match the selected headwear: cloth cap leaves the face visible; only
    // purpose-built tech helmets receive a visor.
    if (headItemId === 'cap_green') {
      const capMat = this.mat(naturalCloth(headC || 0x2f7540, 0.18), 0.9, 0.01, { bumpMap: fabricBump, bumpScale: 0.015 });
      const crown = new THREE.Mesh(this.hemi(), capMat);
      crown.scale.set(0.112, 0.072, 0.12);
      crown.position.set(0, 0.245, -0.005);
      H.add(crown);
      const brim = new THREE.Mesh(this.sphere(), capMat);
      brim.scale.set(0.108, 0.014, 0.075);
      brim.position.set(0, 0.207, 0.078);
      H.add(brim);
    } else if (headItemId === 'helmet_cyber' || headItemId === 'visor_holo') {
      const shell = new THREE.Mesh(this.hemi(), M.helmet);
      shell.scale.set(0.126, 0.11, 0.128);
      shell.position.set(0, 0.205, 0);
      H.add(shell);
      const visorMat = new THREE.MeshStandardMaterial({ color: 0x163d3d, roughness: 0.24, metalness: 0.28, transparent: true, opacity: 0.74 });
      const visor = new THREE.Mesh(this.box(0.17, 0.035, 0.025), visorMat);
      visor.position.set(0, 0.165, 0.106);
      H.add(visor);
    } else if (headItemId === 'crown_leaf') {
      const leafMat = this.mat(0xa9a64b, 0.72, 0.02);
      for (let i = 0; i < 7; i++) {
        const a = -Math.PI * 0.82 + i * Math.PI * 0.27;
        const leaf = new THREE.Mesh(new THREE.SphereGeometry(0.035, 8, 6), leafMat);
        leaf.scale.set(0.6, 1.8, 0.45);
        leaf.position.set(Math.sin(a) * 0.105, 0.23 + Math.cos(a) * 0.025, Math.cos(a) * 0.045);
        leaf.rotation.z = -a * 0.65;
        H.add(leaf);
      }
    }

    // ── ARMS ───────────────────────────────────────────────────────────
    const armDefs = [
      { side: 'left', x: -sx, z: 0.07 },
      { side: 'right', x: sx, z: -0.07 }
    ];
    armDefs.forEach(ad => {
      const A = new THREE.Group();
      A.position.set(ad.x, 0.5, 0);
      A.rotation.z = ad.z;
      T.add(A);
      if (ad.side === 'left') u.leftArm = A; else u.rightArm = A;

      this.blob(A, M.shirt, dR, dR * 0.9, dR, 0, 0, 0);                               // deltoid
      this.seg(A, M.shirt, 0.075 * s.ar, 0.058 * s.ar, 0.29, 0, 0, 0);               // upper arm
      this.blob(A, M.shirt, 0.068 * s.ar, 0.12, 0.06, 0, -0.1, 0.035);              // biceps / triceps mass

      const E = new THREE.Group();
      E.position.set(0, -0.29, 0);
      A.add(E);
      if (ad.side === 'left') u.leftElbow = E; else u.rightElbow = E;
      this.seg(E, M.skin, 0.052 * s.ar, 0.04 * s.ar, 0.27, 0, 0, 0);                 // forearm
      this.blob(E, M.skin, 0.05 * s.ar, 0.11, 0.05, 0, -0.1, 0.02);                  // forearm muscle

      const Hn = new THREE.Group();
      Hn.position.set(0, -0.28, 0);
      E.add(Hn);
      this.blob(Hn, M.skin, 0.042 * s.fw * s.ar, 0.058, 0.032, 0, -0.05, 0);          // palm
      this.blob(Hn, M.skin, 0.038 * s.fw, 0.05, 0.03, 0, -0.12, 0);                  // fingers
      this.blob(Hn, M.skin, 0.02, 0.03, 0.02, 0.035 * (ad.side === 'left' ? -1 : 1), -0.04, 0.02); // thumb

      // Sleeve band in shirt colour (tactical sleeve top)
      this.seg(A, M.shirt, 0.085 * s.ar, 0.078 * s.ar, 0.1, 0, 0.005, 0);

      if (ad.side === 'right') {   // every hero carries the bio-blaster, as before
        const wg = new THREE.Group();
        wg.position.set(0, -0.1, 0.06);
        wg.rotation.x = -0.4;
        Hn.add(wg);
        const body = new THREE.Mesh(this.box(0.055, 0.07, 0.17), M.metal);
        body.position.set(0, 0, 0.04);
        wg.add(body);
        const tip = new THREE.Mesh(this.sphere(), M.weaponGlow);
        tip.scale.set(0.025, 0.025, 0.025);
        tip.position.set(0, 0.02, 0.13);
        wg.add(tip);
        u.weapon = wg;
      }
    });

    // ── LEGS ───────────────────────────────────────────────────────────
    [-1, 1].forEach(sd => {
      const side = sd < 0 ? 'left' : 'right';
      const L = new THREE.Group();
      L.position.set(sd * 0.09 * s.hi, 0.93, 0);
      B.add(L);
      if (side === 'left') u.leftLeg = L; else u.rightLeg = L;

      this.seg(L, M.pants, 0.118 * s.lg, 0.078 * s.lg, 0.44, 0, 0, 0);               // thigh
      this.blob(L, M.pants, 0.1 * s.lg, 0.19, 0.075, 0, -0.2, 0.045);                 // quad mass
      const cargoPocket = new THREE.Mesh(this.box(0.105, 0.13, 0.055), M.pants);
      cargoPocket.position.set(sd * 0.088, -0.19, 0.085);
      L.add(cargoPocket);
      const cargoFlap = new THREE.Mesh(this.box(0.108, 0.022, 0.06), seamMat);
      cargoFlap.position.set(sd * 0.088, -0.13, 0.088);
      L.add(cargoFlap);

      const K = new THREE.Group();
      K.position.set(0, -0.44, 0);
      L.add(K);
      if (side === 'left') u.leftKnee = K; else u.rightKnee = K;
      this.seg(K, M.pants, 0.078 * s.lg, 0.05 * s.lg, 0.40, 0, 0, 0);                // shin
      this.blob(K, M.pants, 0.085 * s.lg, 0.16, 0.085, 0, -0.19, -0.04);              // calf mass

      const Ak = new THREE.Group();
      Ak.position.set(0, -0.41, 0);
      K.add(Ak);
      this.blob(Ak, M.boots, 0.058 * s.fw, 0.045, 0.11, 0, -0.035, 0.045);            // foot
      this.seg(Ak, M.boots, 0.064, 0.06, 0.1, 0, 0.02, 0);                            // boot shaft
    });

    // Belt & utility pouch (tactical detail)
    const belt = new THREE.Mesh(this.g('belt', () => new THREE.TorusGeometry(1, 0.02, 8, 36)), M.metal);
    belt.rotation.x = Math.PI / 2;
    belt.scale.set(waistR * xs * 1.02, waistR * zs * 1.02, 1);
    belt.position.set(0, 0.23, 0);
    T.add(belt);

    // Fixed rig: the first build always ends in a neutral rest pose
    u.leftArm.rotation.x = 0; u.rightArm.rotation.x = 0;
    u.leftLeg.rotation.x = 0; u.rightLeg.rotation.x = 0;
    u._hs = { phase: 0, blend: 0, air: 0 };
    return targetGroup;
  },

  buildTrashPackHero(targetGroup, characterKey, equipped) {
    const modelByHero = {
      abraham: 'personaje_chatarra_electrica',
      sasha: 'personaje_rescate_bioquimico',
      marcus: 'personaje_compactador_pesado',
      diego: 'personaje_chatarra_electrica',
      kenji: 'personaje_rescate_bioquimico',
      tomas: 'personaje_veterano_lanzaresiduos',
      lucia: 'personaje_rescate_bioquimico',
      mei: 'personaje_chatarra_electrica',
      amara: 'personaje_compactador_pesado',
      rosa: 'personaje_rescate_bioquimico'
    };
    const model = window.TM.build(THREE, modelByHero[characterKey] || modelByHero.abraham);
    model.updateMatrixWorld(true);
    let bounds = new THREE.Box3().setFromObject(model);
    const height = bounds.max.y - bounds.min.y;
    if (!Number.isFinite(height) || height < 0.2) throw new Error('El modelo no tiene una altura válida.');
    model.scale.setScalar(1.78 / height);
    model.updateMatrixWorld(true);
    bounds = new THREE.Box3().setFromObject(model);
    model.position.y -= bounds.min.y;
    model.traverse(node => {
      if (node.isMesh) {
        node.castShadow = true;
        node.receiveShadow = true;
        node.frustumCulled = false;
      }
    });
    targetGroup.add(model);

    const parts = model.userData.parts || {};
    const u = targetGroup.userData;
    u.tmModel = model;
    u.torso = parts.torso || null;
    u.headGroup = parts.head || null;
    u.leftArm = parts.armL || null;
    u.rightArm = parts.armR || null;
    u.leftLeg = parts.legL || null;
    u.rightLeg = parts.legR || null;
    u.weapon = parts.weapon || null;
    if (u.headGroup && equipped && window.TM.buildStatic) {
      const headModelId = equipped.head === 'cap_green'
        ? 'prop_gorra_recicla'
        : equipped.head === 'helmet_cyber' ? 'prop_casco_soldador' : null;
      if (headModelId && window.TM_MODELS[headModelId]) {
        const headProp = window.TM.buildStatic(THREE, headModelId);
        headProp.scale.setScalar(headModelId === 'prop_casco_soldador' ? 0.9 : 1.05);
        headProp.position.y = 0.08;
        u.headGroup.add(headProp);
      }
    }
    if (u.weapon) {
      const level = TrashGame.State && TrashGame.State.player ? TrashGame.State.player.level || 1 : 1;
      const tier = Math.max(1, Math.min(3, Math.ceil(level / 5)));
      const pinza = ['herramienta_pinza_t1_basica', 'herramienta_pinza_t2_reciclada', 'herramienta_pinza_t3_electrica'][tier - 1];
      const equippedWeapon = equipped && equipped.weapon;
      const equippedModelTool = equippedWeapon && equippedWeapon.startsWith('herramienta_') && window.TM_MODELS[equippedWeapon]
        ? equippedWeapon
        : null;
      const toolId = equippedModelTool || (equippedWeapon === 'cannon_vacuum'
        ? 'herramienta_aspiradora_residuos'
        : equippedWeapon === 'broom_laser'
          ? 'herramienta_rastrillo_t3_titanio'
          : pinza);
      if (window.TM_MODELS[toolId]) {
        const tool = window.TM.build(THREE, toolId);
        tool.scale.setScalar(toolId === 'herramienta_aspiradora_residuos' ? 0.66 : 0.5);
        tool.rotation.z = -0.55;
        while (u.weapon.children.length) u.weapon.remove(u.weapon.children[0]);
        [parts.claw, parts.barrels].forEach(part => {
          if (!part || !part.parent) return;
          part.parent.remove(part);
          part.traverse(node => {
            if (!node.isMesh) return;
            if (node.geometry) node.geometry.dispose();
            if (node.material) {
              const materials = Array.isArray(node.material) ? node.material : [node.material];
              materials.forEach(material => material.dispose());
            }
          });
        });
        delete parts.claw;
        delete parts.barrels;
        u.weapon.add(tool);
      }
    }
    u._hs = { phase: 0, blend: 0, air: 0 };
    return targetGroup;
  },

  buildRiggedHero(targetGroup, spec, equipped) {
    const u = targetGroup.userData;
    u.isHuman = true;
    u.gender = spec.g;
    const model = TrashGame.AssetLoader.getModel('hero', 1);
    if (!model) throw new Error('hero.glb is unavailable');
    const rigRoot = model.getObjectByName('Armature') || model;

    const itemColor = (slot) => {
      const item = equipped && TrashGame.Items ? TrashGame.Items.find(i => i.id === equipped[slot]) : null;
      return item ? item.color : null;
    };
    const natural = (hex, blend = 0.2) => {
      const color = new THREE.Color(hex);
      color.lerp(new THREE.Color(0x77766a), blend);
      color.multiplyScalar(0.9);
      return color;
    };
    const skin = new THREE.Color(spec.skin);
    const shirt = natural(itemColor('torso') || spec.outfit.shirt, 0.2);
    const pants = natural(itemColor('legs') || spec.outfit.pants, 0.16);
    const boots = natural(itemColor('feet') || spec.outfit.boots, 0.12);

    model.updateMatrixWorld(true);
    const bounds = new THREE.Box3().setFromObject(model);
    const height = bounds.max.y - bounds.min.y;
    if (height > 0.01 && height < 0.5) model.scale.multiplyScalar(100);
    else if (height > 3) model.scale.multiplyScalar(1.8 / height);
    model.updateMatrixWorld(true);
    const fitted = new THREE.Box3().setFromObject(model);
    const fittedHeight = fitted.max.y - fitted.min.y;
    if (!Number.isFinite(fittedHeight) || fittedHeight < 0.8 || fittedHeight > 3.2) {
      throw new Error('hero.glb has an invalid world scale (' + fittedHeight + 'm)');
    }
    if (Number.isFinite(fitted.min.y)) model.position.y -= fitted.min.y;

    model.traverse((child) => {
      if (child.isSkinnedMesh && child.geometry && child.geometry.attributes.position) {
        if (child.name !== 'Beta_Surface') {
          const jointMaterial = (source) => {
            const material = source.clone();
            material.roughness = 0.72;
            material.metalness = 0.0;
            return material;
          };
          child.material = Array.isArray(child.material)
            ? child.material.map(jointMaterial)
            : jointMaterial(child.material);
          child.castShadow = true;
          child.receiveShadow = true;
          return;
        }
        child.geometry = child.geometry.clone();
        const positions = child.geometry.attributes.position;
        const colors = new Float32Array(positions.count * 3);
        for (let i = 0; i < positions.count; i++) {
          const x = positions.getX(i), y = positions.getY(i);
          const ax = Math.abs(x);
          let color = skin;
          if (y < 0.11) color = boots;
          else if (y < 0.9) color = pants;
          else if (y < 1.52 && ax < 0.78) color = shirt;
          colors[i * 3] = color.r;
          colors[i * 3 + 1] = color.g;
          colors[i * 3 + 2] = color.b;
        }
        child.geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
        const applyVertexMaterial = (source) => {
          const material = source.clone();
          material.color.set(0xffffff);
          material.vertexColors = true;
          material.bumpMap = this.detailBump(0x8b17, 12);
          material.bumpScale = 0.004;
          material.roughness = 0.8;
          material.metalness = 0.02;
          return material;
        };
        child.material = Array.isArray(child.material)
          ? child.material.map(applyVertexMaterial)
          : applyVertexMaterial(child.material);
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });

    targetGroup.add(model);
    const findBone = (part) => {
      let found = null;
      model.traverse((node) => {
        if (!found && node.isBone && node.name.toLowerCase().includes(part.toLowerCase())) found = node;
      });
      return found;
    };
    u.torso = findBone('Spine2') || findBone('Spine');
    u.headGroup = findBone('Head');
    u.leftArm = findBone('LeftArm');
    u.rightArm = findBone('RightArm');
    u.leftLeg = findBone('LeftUpLeg');
    u.rightLeg = findBone('RightUpLeg');
    u.weapon = null;

    // Cloth panels, cargo pockets and a field pack add visible construction detail.
    const cloth = new THREE.MeshStandardMaterial({ color: 0x25382b, roughness: 0.92, metalness: 0.02 });
    const trim = new THREE.MeshStandardMaterial({ color: 0x56634d, roughness: 0.82, metalness: 0.04 });
    const detailRig = new THREE.Group();
    rigRoot.add(detailRig);
    const pack = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.42, 0.2), cloth);
    pack.position.set(0, 1.22, -0.19);
    detailRig.add(pack);
    [-1, 1].forEach(side => {
      const pocket = new THREE.Mesh(new THREE.BoxGeometry(0.105, 0.12, 0.035), cloth);
      pocket.position.set(side * 0.105, 1.12, 0.15);
      detailRig.add(pocket);
      const flap = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.025, 0.04), trim);
      flap.position.set(side * 0.105, 1.17, 0.155);
      detailRig.add(flap);

      const cargoPocket = new THREE.Mesh(new THREE.BoxGeometry(0.115, 0.14, 0.045), cloth);
      cargoPocket.position.set(side * 0.16, 0.62, 0.13);
      detailRig.add(cargoPocket);
      const cargoFlap = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.025, 0.05), trim);
      cargoFlap.position.set(side * 0.16, 0.685, 0.14);
      detailRig.add(cargoFlap);
    });
    const belt = new THREE.Mesh(new THREE.TorusGeometry(0.19, 0.018, 8, 40), cloth);
    belt.rotation.x = Math.PI / 2;
    belt.position.set(0, 0.93, 0);
    detailRig.add(belt);

    if (u.headGroup && equipped && equipped.head === 'cap_green') {
      const capMat = new THREE.MeshStandardMaterial({ color: natural(itemColor('head') || 0x2f7540, 0.18), roughness: 0.92 });
      const cap = new THREE.Group();
      const crown = new THREE.Mesh(new THREE.SphereGeometry(0.115, 24, 16, 0, Math.PI * 2, 0, Math.PI / 2), capMat);
      crown.scale.set(1, 0.66, 1);
      crown.position.set(0, 0.12, 0);
      cap.add(crown);
      const brim = new THREE.Mesh(new THREE.SphereGeometry(1, 20, 12), capMat);
      brim.scale.set(0.105, 0.012, 0.07);
      brim.position.set(0, 0.105, 0.075);
      cap.add(brim);
      u.headGroup.add(cap);
    }

    const gltf = TrashGame.AssetLoader.models.hero_gltf;
    const clips = gltf && gltf.animations ? gltf.animations : [];
    if (clips.length) {
      u.gltfMixer = new THREE.AnimationMixer(model);
      u.gltfActions = {};
      clips.forEach(clip => {
        const name = clip.name.toLowerCase();
        const key = name.includes('idle') ? 'idle' : name.includes('run') ? 'run' : name.includes('walk') ? 'walk' : null;
        if (key && !u.gltfActions[key]) u.gltfActions[key] = u.gltfMixer.clipAction(clip);
      });
      const idle = u.gltfActions.idle;
      if (idle) { idle.play(); u.gltfCurrentAction = idle; }
    }
    u._hs = { phase: 0, blend: 0, air: 0 };
    return targetGroup;
  },

  // -----------------------------------------------------------------------
  // LOCOMOTION — smooth procedural walk / run / jump / idle
  // Call once per frame after input is read and only when no emote is active.
  // -----------------------------------------------------------------------
  animate(group, time, dt, moving, sprint, grounded) {
    const u = group.userData;
    if (!u || !u.isHuman || !u.leftLeg || !u.leftArm) return;
    if (u.tmModel && window.TM) {
      if (TrashGame.Emotes && TrashGame.Emotes.activeEmote) return;
      window.TM.animate(u.tmModel, time, { run: !!moving });
      return;
    }
    if (u.gltfMixer) {
      if (TrashGame.Emotes && TrashGame.Emotes.activeEmote) return;
      const desired = moving ? (sprint ? u.gltfActions.run : u.gltfActions.walk) : u.gltfActions.idle;
      if (desired && desired !== u.gltfCurrentAction) {
        if (u.gltfCurrentAction) u.gltfCurrentAction.fadeOut(0.2);
        desired.reset().fadeIn(0.2).play();
        u.gltfCurrentAction = desired;
      }
      u.gltfMixer.update(dt);
      return;
    }
    const st = u._hs || (u._hs = { phase: 0, blend: 0, air: 0 });
    const k = Math.min(1, dt);

    // Blend in/out so starting and stopping never snap
    st.blend += ((moving ? 1 : 0) - st.blend) * Math.min(1, k * 7);
    st.air += ((grounded ? 0 : 1) - st.air) * Math.min(1, k * 12);
    if (moving) st.phase += k * 6.5 * (sprint || 1);

    const b = st.blend;
    const air = st.air;
    const p = st.phase;

    // Legs: thigh swings, knee flexes while the leg swings forward
    const legPose = (ph) => {
      const s = Math.sin(ph), c = Math.cos(ph);
      const thigh = s * 0.5 * b;
      const knee = Math.pow(Math.max(0, -c), 1.5) * 0.95 * b + 0.04;
      return { thigh: thigh, knee: knee };
    };
    const lp = legPose(p), rp = legPose(p + Math.PI);
    u.leftLeg.rotation.x = lp.thigh - 0.75 * air;
    u.rightLeg.rotation.x = rp.thigh - 0.75 * air;
    if (u.leftKnee) u.leftKnee.rotation.x = lp.knee + 1.0 * air;
    if (u.rightKnee) u.rightKnee.rotation.x = rp.knee + 1.0 * air;

    // Arms swing opposite to legs, elbows stay relaxed
    const holding = u.weapon ? 1 : 0;
    const armL = -Math.sin(p) * 0.55 * b - 0.9 * air;
    const armR = Math.sin(p) * 0.55 * b - 0.9 * air - 0.55 * holding;
    u.leftArm.rotation.x = armL;
    u.rightArm.rotation.x = armR;
    u.leftArm.rotation.z += (0.07 - u.leftArm.rotation.z) * Math.min(1, k * 8);
    u.rightArm.rotation.z += (-0.07 - u.rightArm.rotation.z) * Math.min(1, k * 8);
    if (u.leftElbow) u.leftElbow.rotation.x = -0.12 - 0.22 * b - 0.4 * air;
    if (u.rightElbow) u.rightElbow.rotation.x = -0.12 - 0.22 * b - 0.4 * air - 0.7 * holding;

    // Torso: bob + gentle counter-twist; idle breathing when standing still
    const T = u.torso;
    if (T) {
      T.position.y = Math.abs(Math.sin(p)) * 0.022 * b;
      const twist = Math.sin(p) * 0.07 * b;
      T.rotation.y += (twist - T.rotation.y) * Math.min(1, k * 10);
      const breath = Math.sin(time * 2.2) * 0.012 * (1 - b);
      T.scale.set(1 + breath * 0.6, 1 + breath, 1 + breath * 0.6);
    }
    // Head stays level while the torso twists
    if (u.headGroup) {
      u.headGroup.rotation.y += ((T ? -T.rotation.y * 0.8 : 0) - u.headGroup.rotation.y) * Math.min(1, k * 10);
    }
  },

  triggerShoot(group) {
    const u = group && group.userData;
    if (!u) return;
    if (!u._shootPose) {
      u._shootPose = {
        arm: u.rightArm ? u.rightArm.rotation.x : 0,
        elbow: u.rightElbow ? u.rightElbow.rotation.x : 0,
        torso: u.torso ? u.torso.rotation.x : 0
      };
    }
    u._shootTimer = 0.3;
  },

  updateShootPose(group, dt) {
    const u = group && group.userData;
    if (!u || !u._shootTimer || !u._shootPose) return;
    u._shootTimer = Math.max(0, u._shootTimer - Math.max(0, dt || 0));
    const recoil = Math.sin((1 - u._shootTimer / 0.3) * Math.PI);
    if (u.rightArm) u.rightArm.rotation.x = u._shootPose.arm - recoil * 0.72;
    if (u.rightElbow) u.rightElbow.rotation.x = u._shootPose.elbow - recoil * 0.38;
    if (u.torso) u.torso.rotation.x = u._shootPose.torso - recoil * 0.08;
  },

  // -----------------------------------------------------------------------
  // UI — roster cards (the 8 heroes beyond the two original cards)
  // -----------------------------------------------------------------------
  _hex(c) { return '#' + c.toString(16).padStart(6, '0'); },

  _renderRosterUI() {
    const anchor = document.getElementById('card-char-sasha');
    if (!anchor || document.getElementById('roster-extra')) return;
    const grid = anchor.parentElement;
    const wrap = document.createElement('div');
    wrap.id = 'roster-extra';
    wrap.className = 'mt-6';
    wrap.innerHTML =
      '<p class="text-[11px] uppercase tracking-widest text-slate-500 mb-3">Más héroes del Reciclaje</p>' +
      '<div id="roster-grid" class="grid grid-cols-2 md:grid-cols-4 gap-3"></div>';
    grid.parentElement.insertBefore(wrap, grid.nextSibling);

    const host = document.getElementById('roster-grid');
    this.roster.filter(r => r.key !== 'abraham' && r.key !== 'sasha').forEach(r => {
      const b = document.createElement('button');
      b.dataset.hero = r.key;
      b.className = 'text-left p-3 rounded-2xl bg-slate-900/80 border-2 border-slate-700/60 hover:border-cyan-500/60 transition-colors';
      b.innerHTML =
        '<div class="flex items-center gap-2 mb-2">' +
          '<span style="background:' + this._hex(r.skin) + '" class="w-5 h-5 rounded-full border border-white/20"></span>' +
          '<span style="background:' + this._hex(r.outfit.shirt) + '" class="w-5 h-5 rounded-md border border-white/20"></span>' +
          '<span class="ml-auto text-[10px] text-slate-500">' + (r.g === 'f' ? '♀' : '♂') + '</span>' +
        '</div>' +
        '<div class="font-display font-bold text-sm text-white">' + r.name + '</div>' +
        '<div class="text-[10px] text-slate-400 leading-tight">' + r.role + '</div>';
      b.onclick = () => TrashGame.UI.selectCharacter(r.key);
      host.appendChild(b);
    });
    this.markSelected(TrashGame.State && TrashGame.State.player ? TrashGame.State.player.character : 'abraham');
  },

  markSelected(key) {
    document.querySelectorAll('[data-hero]').forEach(el => {
      const on = el.dataset.hero === key;
      el.style.borderColor = on ? '#22d3ee' : '';
    });
  },

  _wrapUI() {
    const UI = TrashGame.UI;
    if (!UI || UI._humanWrapped) return;
    const original = UI.selectCharacter;
    UI.selectCharacter = function (key) {
      if (key === 'abraham' || key === 'sasha') {
        original.call(this, key);
      } else {
        if (TrashGame.State.player.character === key) return;
        const spec = TrashGame.Humans.getSpec(key);
        if (!spec) return;
        TrashGame.State.selectCharacter(key);
        if (TrashGame.Sound) TrashGame.Sound.playFanfare();
        const avatar = document.getElementById('hud-player-avatar');
        if (avatar) avatar.textContent = spec.g === 'f' ? '🦸‍♀️' : '🦸‍♂️';
        const ba = document.getElementById('btn-select-abraham');
        const bs = document.getElementById('btn-select-sasha');
        if (ba) ba.textContent = 'Seleccionar a Abraham';
        if (bs) bs.textContent = 'Seleccionar a Sasha';
        if (TrashGame.Main) {
          TrashGame.CharacterBuilder.build(TrashGame.Main.characterGroup, key, TrashGame.State.equipped);
        }
        this.showToast('Héroe seleccionado: ' + spec.name, 'success');
      }
      TrashGame.Humans.markSelected(TrashGame.State.player.character);
    };
    UI._humanWrapped = true;
  },

  init() {
    try { this._renderRosterUI(); } catch (e) { console.warn('[Humans] roster UI skipped', e); }
    try { this._wrapUI(); } catch (e) { console.warn('[Humans] UI hook skipped', e); }
  }
};

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => TrashGame.Humans.init());
} else {
  TrashGame.Humans.init();
}
