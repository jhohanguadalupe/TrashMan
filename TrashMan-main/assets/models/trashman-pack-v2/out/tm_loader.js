// Trash Man - cargador de modelos generados por trashman_models.cpp
// Uso en tu juego (Three.js clásico por CDN):
//   <script src="models.js"></script>
//   <script src="tm_loader.js"></script>
//   const heroe = TM.build(THREE, 'personaje_chatarra_electrica');
//   scene.add(heroe);
//   // en el bucle de animación:
//   TM.animate(heroe, tiempoEnSegundos, { run: true });
(function (g) {
  const staticModels = Object.create(null);

  function meshFrom(THREE, pd) {
    const geo = new THREE.BufferGeometry();
    // Join duplicate triangle vertices by position and color for smooth normals.
    const positions = [], colors = [], indices = [], vertexByKey = new Map();
    for (let i = 0; i < pd.p.length; i += 3) {
      const x = pd.p[i], y = pd.p[i + 1], z = pd.p[i + 2];
      const r = pd.c[i] || 0, gg = pd.c[i + 1] || 0, b = pd.c[i + 2] || 0;
      const key = [x, y, z, r, gg, b].map(v => Math.round(v * 10000)).join(':');
      let index = vertexByKey.get(key);
      if (index === undefined) {
        index = positions.length / 3;
        vertexByKey.set(key, index);
        positions.push(x, y, z);
        colors.push(r, gg, b);
      }
      indices.push(index);
    }
    geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    geo.setIndex(indices);
    geo.computeVertexNormals();
    const mat = pd.glow
      ? new THREE.MeshStandardMaterial({ vertexColors: true, emissive: 0x194c3b, emissiveIntensity: 0.38, roughness: 0.46, metalness: 0.16 })
      : new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.76, metalness: 0.2 });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.userData.glow = pd.glow;
    return mesh;
  }

  const TM = {
    names() { return Object.keys(g.TM_MODELS); },

    triCount(name) {
      return g.TM_MODELS[name].parts.reduce((s, p) => s + p.p.length / 9, 0);
    },

    // Devuelve un THREE.Group. Cada parte articulable (legL, legR, head, torso,
    // armL, armR, backpack, belt, weapon, claw, barrels...) es un sub-grupo en
    // group.userData.parts[nombre], ya colocado en su pivote.
    build(THREE, name) {
      const data = g.TM_MODELS[name];
      if (!data) throw new Error('Modelo desconocido: ' + name);
      const root = new THREE.Group();
      root.name = name;
      root.userData.parts = {};
      root.userData.tmDynamicModel = true;
      data.parts.forEach((pd) => {
        const base = pd.n.replace(/_glow$/, '');
        let grp = root.userData.parts[base];
        if (!grp) {
          grp = new THREE.Group();
          grp.name = base;
          grp.position.set(pd.pivot[0], pd.pivot[1], pd.pivot[2]);
          root.userData.parts[base] = grp;
          root.add(grp);
        }
        grp.add(meshFrom(THREE, pd));
      });
      return root;
    },

    // Cache immutable geometry/materials for repeated litter props. The clone
    // rebuilds part references while sharing GPU buffers to keep draw cost low.
    buildStatic(THREE, name) {
      if (!staticModels[name]) staticModels[name] = this.build(THREE, name);
      const original = staticModels[name];
      const originalParts = original.userData.parts;
      delete original.userData.parts;
      const clone = original.clone(true);
      original.userData.parts = originalParts;
      clone.userData.parts = {};
      clone.userData.tmDynamicModel = false;
      clone.userData.tmStaticShared = true;
      Object.keys(originalParts).forEach((partName) => {
        const node = clone.getObjectByName(partName);
        if (node) clone.userData.parts[partName] = node;
      });
      return clone;
    },

    disposeDynamic(root) {
      const disposeBranch = (node) => {
        if (node.userData && node.userData.tmStaticShared) return;
        node.children.forEach(disposeBranch);
        if (!node.isMesh) return;
        if (node.geometry) node.geometry.dispose();
        if (node.material) {
          const materials = Array.isArray(node.material) ? node.material : [node.material];
          materials.forEach((material) => material.dispose());
        }
      };
      if (root && root.userData && root.userData.tmDynamicModel) disposeBranch(root);
    },

    // Animación sencilla: correr, cañones giratorios, bobina que pulsa.
    animate(model, t, opt) {
      opt = opt || {};
      const P = model.userData.parts;
      if (P.legL && P.legR) {
        const s = opt.run ? Math.sin(t * 9) * 0.7 : 0;
        P.legL.rotation.x = s;
        P.legR.rotation.x = -s;
        if (P.armL) P.armL.rotation.x = -s * 0.62;
        if (P.armR) P.armR.rotation.x = s * 0.62;
      }
      const bob = opt.run ? Math.abs(Math.sin(t * 9)) * 0.028 : 0;
      ['torso', 'head', 'armL', 'armR', 'backpack', 'belt', 'weapon', 'claw', 'barrels'].forEach((k) => {
        if (P[k]) P[k].position.y = (P[k].userData.y0 !== undefined ? P[k].userData.y0 : (P[k].userData.y0 = P[k].position.y)) + bob;
      });
      if (P.barrels) P.barrels.rotation.z = t * (opt.fire ? 14 : 3);
      // monstruos y jefe: mandíbula que muerde, brazos que se balancean, cabezas de hidra
      if (P.jaw) P.jaw.rotation.x = (0.5 + 0.5 * Math.sin(t * 2.5)) * 0.45;
      if (!P.legL && P.armL && P.armR) {
        P.armL.rotation.x = Math.sin(t * 3) * 0.3;
        P.armR.rotation.x = -Math.sin(t * 3) * 0.3;
      }
      ['headL', 'headC', 'headR'].forEach((k, i) => { if (P[k]) P[k].rotation.z = Math.sin(t * 1.5 + i * 2) * 0.12; });
      const pulse = 0.92 + 0.08 * Math.sin(t * 3.2);
      model.traverse((o) => { if (o.userData && o.userData.glow) o.material.color.setScalar(pulse); });
    },
  };
  g.TM = TM;
})(window);
