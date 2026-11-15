// Trash Man - cargador de modelos generados por trashman_models.cpp
// Uso en tu juego (Three.js clásico por CDN):
//   <script src="models.js"></script>
//   <script src="tm_loader.js"></script>
//   const heroe = TM.build(THREE, 'personaje_chatarra_electrica');
//   scene.add(heroe);
//   // en el bucle de animación:
//   TM.animate(heroe, tiempoEnSegundos, { run: true });
(function (g) {
  function meshFrom(THREE, pd) {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(pd.p), 3));
    geo.setAttribute('color', new THREE.BufferAttribute(new Float32Array(pd.c), 3));
    geo.computeVertexNormals(); // geometría sin índice => sombreado plano low-poly
    const mat = pd.glow
      ? new THREE.MeshBasicMaterial({ vertexColors: true })
      : new THREE.MeshLambertMaterial({ vertexColors: true });
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

    // Animación sencilla: correr, cañones giratorios, bobina que pulsa.
    animate(model, t, opt) {
      opt = opt || {};
      const P = model.userData.parts;
      if (P.legL && P.legR) {
        const s = opt.run ? Math.sin(t * 9) * 0.7 : 0;
        P.legL.rotation.x = s;
        P.legR.rotation.x = -s;
      }
      if (opt.run) {
        const bob = Math.abs(Math.sin(t * 9)) * 0.04;
        ['torso', 'head', 'armL', 'armR', 'backpack', 'belt', 'weapon', 'claw', 'barrels'].forEach((k) => {
          if (P[k]) P[k].position.y = (P[k].userData.y0 !== undefined ? P[k].userData.y0 : (P[k].userData.y0 = P[k].position.y)) + bob;
        });
      }
      if (P.barrels) P.barrels.rotation.z = t * (opt.fire ? 14 : 3);
      // monstruos y jefe: mandíbula que muerde, brazos que se balancean, cabezas de hidra
      if (P.jaw) P.jaw.rotation.x = (0.5 + 0.5 * Math.sin(t * 2.5)) * 0.45;
      if (!P.legL && P.armL && P.armR) {
        P.armL.rotation.x = Math.sin(t * 3) * 0.3;
        P.armR.rotation.x = -Math.sin(t * 3) * 0.3;
      }
      ['headL', 'headC', 'headR'].forEach((k, i) => { if (P[k]) P[k].rotation.z = Math.sin(t * 1.5 + i * 2) * 0.12; });
      // ---- herramientas nuevas
      const run = opt.run ? 2.2 : 1;
      if (P.brush) P.brush.rotation.x = -t * 9 * run;
      if (P.drum) P.drum.rotation.x = -t * 3 * run;
      if (P.fan) P.fan.rotation.z = t * 22 * run;
      if (P.waterwheel) P.waterwheel.rotation.x = -t * 0.9 * run;
      if (P.rollerL) P.rollerL.rotation.z = t * 3 * run;
      if (P.rollerR) P.rollerR.rotation.z = -t * 3 * run;
      if (P.lever) P.lever.rotation.x = 0.55 * Math.sin(t * 2.2);
      if (P.piston) {
        if (P.piston.userData.y0 === undefined) P.piston.userData.y0 = P.piston.position.y;
        P.piston.position.y = P.piston.userData.y0 - (0.5 + 0.5 * Math.sin(t * 2)) * 0.9;
      }
      if (P.jawL && P.jawR) { const a = 0.3 + 0.3 * Math.sin(t * 2.4); P.jawL.rotation.z = a - 0.3; P.jawR.rotation.z = -(a - 0.3); }
      Object.keys(P).forEach((k) => { if (/^prop\d$/.test(k)) P[k].rotation.y = t * 40 * (+k.slice(4) % 2 ? 1 : -1); });
      if (model.name.indexOf('dron') >= 0) model.position.y = Math.sin(t * 2) * 0.05;
      if (P.disk) P.disk.rotation.y = t * 2.2;
      [1, 2, 3].forEach((i) => { if (P['orbit' + i]) P['orbit' + i].rotation.y = t * (0.5 + 0.35 * i) * (i % 2 ? 1 : -1); });
      // ---- mascotas
      if (P.legFL && P.legBR) {
        const sp = opt.run ? 9 : 2.5, am = opt.run ? 0.6 : 0.08;
        P.legFL.rotation.x = P.legBR.rotation.x = Math.sin(t * sp) * am;
        P.legFR.rotation.x = P.legBL.rotation.x = -Math.sin(t * sp) * am;
      }
      if (P.tail && !P.legL) P.tail.rotation.y = Math.sin(t * 7) * 0.5;
      if (P.earL && P.earR) { P.earL.rotation.z = Math.sin(t * 4) * 0.08; P.earR.rotation.z = -Math.sin(t * 4 + 1) * 0.08; }
      if (P.wingL && P.wingR) { const w = Math.sin(t * (opt.run ? 14 : 3)) * (opt.run ? 0.7 : 0.15); P.wingL.rotation.z = w; P.wingR.rotation.z = -w; }
      if (P.gear) P.gear.rotation.y = t * 4;
      if (P.head && model.name.indexOf('mascota') === 0) P.head.rotation.y = Math.sin(t * 1.3) * 0.25;
      if (model.name === 'mascota_mini_singularidad') { model.position.y = Math.sin(t * 2) * 0.05; if (P.orbit1) P.orbit1.rotation.y = t * 1.5; }
      const pulse = 0.75 + 0.25 * Math.sin(t * 6);
      model.traverse((o) => { if (o.userData && o.userData.glow) o.material.color.setScalar(pulse); });
    },
  };
  g.TM = TM;
})(window);
