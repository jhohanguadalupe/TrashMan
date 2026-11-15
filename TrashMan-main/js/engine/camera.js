/* =========================================================================
   TRASH MAN 3D - CAMARA 3RA PERSONA v2  (reemplazo directo de js/engine/camera.js)

   Misma API que la camara original (constructor(camera), update(playerPos, dt),
   rotate(dYaw, dPitch), zoom(delta), setLobbyView(), yaw, pitch, distance...),
   asi que main.js sigue funcionando sin cambios.

   MEJORAS
   1. Suavizado independiente de los FPS (antes dependia de la velocidad del equipo).
   2. Colision: la camara no atraviesa paredes/rocas/edificios (setCollidables).
   3. No se mete bajo el suelo (altura minima configurable).
   4. Auto-centrado: al caminar sin mover la camara, se coloca detras del jugador
      (ideal para mando). Se desactiva al mover la camara.
   5. FOV dinamico: se abre al correr y vuelve al caminar.
   6. Temblor de camara (shake) automatico en golpes/aplastones del jefe.
   7. Camara sobre el hombro (shoulderOffset) y "ojo al jefe" (setFocus).
   8. Zoom suave con limites, limites de pitch, sensibilidad ajustable.
   9. Se adapta sola al movimiento del jugador: NO hace falta pasarle velocidad.

   USO BASICO (opcional, el juego ya funciona sin esto)
     const cc = TrashGame.Main.cameraController;
     cc.setCollidables([worldGroup]);          // grupo/meshes que la camara no debe atravesar
     cc.shake(0.6, 0.5);                       // temblor manual (fuerza 0..1, segundos)
     cc.setFocus(boss.position);               // mirar hacia el jefe suavemente (null = quitar)
     cc.settings.autoRecenter = false;         // apagar auto-centrado
   ========================================================================= */

window.TrashGame = window.TrashGame || {};

TrashGame.CameraController = class {
  constructor(camera) {
    this.camera = camera;

    // ---- estado (mismos nombres que la version original) ----
    this.yaw = 0;
    this.pitch = 0.22;
    this.distance = 4.4;
    this.targetDistance = 4.4;
    this.targetOffset = new THREE.Vector3(0, 1.25, 0);
    this.currentPosition = new THREE.Vector3(0, 1.5, 4.4);
    this.currentTarget = new THREE.Vector3(0, 1.1, 0);

    // ---- ajustes (editables en caliente: cc.settings.xxx = ...) ----
    this.settings = {
      minDistance: 2.2, maxDistance: 8.5,
      minPitch: 0.05, maxPitch: 1.25,
      followSharpness: 14,        // mayor = camara pegada al jugador, menor = mas "flotante"
      lookSharpness: 18,
      zoomSharpness: 9,
      minHeight: 0.45,            // altura minima de la camara sobre y=0 (o sobre el suelo si hay colision)
      groundClearance: 0.35,      // separacion extra del suelo/paredes
      shoulderOffset: 0.0,        // >0 desplaza la camara a la derecha (sobre el hombro). Prueba 0.5
      // auto-centrado detras del jugador
      autoRecenter: true,
      recenterDelay: 1.6,         // segundos sin mover la camara antes de centrar
      recenterSpeed: 1.8,         // velocidad del centrado
      // FOV dinamico
      baseFov: camera ? camera.fov : 45,
      sprintFovBoost: 7,
      sprintSpeed: 7.0,           // unidades/seg a partir de las que se considera "correr"
      fovSharpness: 6,
      // temblor
      shakeMax: 0.28,             // desplazamiento maximo (unidades) con fuerza 1
      shakeRoll: 0.035,           // inclinacion maxima (rad)
      autoShake: true,            // engancha los sonidos del jefe
      // colision
      collisionEvery: 2           // raycast cada N frames (mas alto = mas barato)
    };

    // ---- internos ----
    this._collidables = [];
    this._raycaster = (typeof THREE !== 'undefined' && THREE.Raycaster) ? new THREE.Raycaster() : null;
    this._frame = 0;
    this._collisionDist = null;          // distancia permitida por colision (suavizada)
    this._collisionTarget = Infinity;
    this._idleTime = 0;
    this._lastPlayer = null;
    this._speed = 0;
    this._moveDir = new THREE.Vector3();
    this._fov = camera ? camera.fov : 45;
    this._trauma = 0;
    this._shakeT = 0;
    this._focus = null;
    this._focusOffsetY = 0;
    this._focusWeight = 0;
    this._tmpA = new THREE.Vector3();
    this._tmpB = new THREE.Vector3();
    this._snap = true;                   // primer frame: sin interpolacion

    if (this.settings.autoShake) this._hookShake();
  }

  // ===================================================================
  //  API publica
  // ===================================================================
  /** Objetos que la camara no debe atravesar (Group, Mesh o arreglo de ambos). */
  setCollidables(list) {
    this._collidables = Array.isArray(list) ? list : (list ? [list] : []);
  }

  /** Temblor de camara. strength 0..1, duration en segundos. */
  shake(strength = 0.5, duration = 0.4) {
    this._trauma = Math.min(1, Math.max(this._trauma, strength));
    this._traumaDecay = strength / Math.max(0.05, duration);
  }

  /** Mira suavemente hacia un punto (ej. el jefe). null para quitar. */
  setFocus(vec3OrNull, heightOffset = 0) {
    this._focus = vec3OrNull || null;
    this._focusOffsetY = this._focus ? heightOffset : 0;
  }

  /** Coloca la camara de golpe detras del jugador (al empezar nivel / reaparecer). */
  snapBehind(playerPos, heading) {
    if (typeof heading === 'number') this.yaw = heading;
    this._snap = true;
    this._collisionDist = null;
    this._lastPlayer = playerPos ? playerPos.clone() : null;
  }

  rotate(deltaYaw, deltaPitch) {
    this.yaw -= deltaYaw;
    this.pitch += deltaPitch;
    this.pitch = Math.max(this.settings.minPitch, Math.min(this.settings.maxPitch, this.pitch));
    this._idleTime = 0;                  // el jugador movio la camara -> no auto-centrar
  }

  zoom(delta) {
    this.targetDistance += delta * 0.005;
    this.targetDistance = Math.max(this.settings.minDistance, Math.min(this.settings.maxDistance, this.targetDistance));
  }

  /** Direccion horizontal hacia donde mira la camara (util para disparar). */
  getForward(out = new THREE.Vector3()) {
    return out.set(-Math.sin(this.yaw), 0, -Math.cos(this.yaw));
  }

  setLobbyView() {
    this.camera.position.set(0, 1.45, 4.2);
    this.camera.lookAt(0, 0.95, -0.75);
    this.camera.rotation.z = 0;
    this._snap = true;
  }

  // ===================================================================
  //  Actualizacion por frame
  // ===================================================================
  update(playerPos, dt) {
    dt = Math.min(Math.max(dt || 0.016, 0.0001), 0.1);
    const S = this.settings;
    const damp = (k) => 1 - Math.exp(-k * dt);   // factor de suavizado independiente de FPS

    this._frame++;
    this._trackPlayer(playerPos, dt);

    // ---- zoom suave ----
    this.distance += (this.targetDistance - this.distance) * damp(S.zoomSharpness);

    // ---- auto-centrado detras del jugador ----
    this._idleTime += dt;
    if (S.autoRecenter && this._idleTime > S.recenterDelay && this._speed > 0.8) {
      const fwd = this.getForward(this._tmpA);
      const along = fwd.dot(this._moveDir);          // 1 = camina hacia donde mira la camara
      if (along > -0.5) {                              // no centrar si camina hacia la camara
        const w = Math.min(1, (along + 0.5));          // adelante = 1, de lado ~0.5
        const want = Math.atan2(-this._moveDir.x, -this._moveDir.z);
        let diff = want - this.yaw;
        diff = Math.atan2(Math.sin(diff), Math.cos(diff));   // camino mas corto
        this.yaw += diff * Math.min(1, S.recenterSpeed * dt * w);
      }
    }

    // ---- ojo al jefe (sesgo suave del yaw hacia el objetivo) ----
    if (this._focus) {
      const dx = this._focus.x - playerPos.x, dz = this._focus.z - playerPos.z;
      if (dx * dx + dz * dz > 1) {
        const want = Math.atan2(-dx, -dz);                 // camara DETRAS del jugador mirando al jefe
        let diff = want - this.yaw;
        diff = Math.atan2(Math.sin(diff), Math.cos(diff));
        this.yaw += diff * damp(2.2);
      }
    }

    // ---- posicion ideal (esfera alrededor del jugador) ----
    const target = this._tmpB.copy(playerPos).add(this.targetOffset);      // punto que miramos
    if (this._focus) target.set(this._focus.x, this._focus.y + this._focusOffsetY, this._focus.z);
    const cp = Math.cos(this.pitch), sp = Math.sin(this.pitch);
    const dirX = Math.sin(this.yaw) * cp, dirY = sp, dirZ = Math.cos(this.yaw) * cp;
    const pivotY = playerPos.y + 1.1;                                        // mismo pivote que la version original

    let dist = this.distance;
    dist = this._collide(playerPos.x, pivotY, playerPos.z, dirX, dirY, dirZ, dist, dt);

    const desired = new THREE.Vector3(
      playerPos.x + dirX * dist,
      pivotY + dirY * dist,
      playerPos.z + dirZ * dist
    );
    // sobre el hombro: desplaza hacia la derecha de la camara
    if (S.shoulderOffset) {
      desired.x += Math.cos(this.yaw) * S.shoulderOffset;
      desired.z += -Math.sin(this.yaw) * S.shoulderOffset;
    }
    desired.y = Math.max(S.minHeight, desired.y);

    if (this._snap) {
      this.currentPosition.copy(desired);
      this.currentTarget.copy(target);
      this._snap = false;
    } else {
      this.currentPosition.lerp(desired, damp(S.followSharpness));
      this.currentTarget.lerp(target, damp(S.lookSharpness));
    }

    // ---- temblor ----
    this.camera.position.copy(this.currentPosition);
    let roll = 0;
    if (this._trauma > 0.001) {
      this._shakeT += dt * 38;
      const k = this._trauma * this._trauma;
      this.camera.position.x += this._noise(this._shakeT, 1) * S.shakeMax * k;
      this.camera.position.y += this._noise(this._shakeT, 2) * S.shakeMax * k;
      this.camera.position.z += this._noise(this._shakeT, 3) * S.shakeMax * k;
      roll = this._noise(this._shakeT, 4) * S.shakeRoll * k;
      this._trauma = Math.max(0, this._trauma - (this._traumaDecay || 1.6) * dt);
    }

    this.camera.lookAt(this.currentTarget);
    if (roll) this.camera.rotateZ(roll);

    // ---- FOV dinamico ----
    const sprinting = this._speed > S.sprintSpeed;
    const wantFov = S.baseFov + (sprinting ? S.sprintFovBoost : 0);
    this._fov += (wantFov - this._fov) * damp(S.fovSharpness);
    if (Math.abs(this.camera.fov - this._fov) > 0.01) {
      this.camera.fov = this._fov;
      this.camera.updateProjectionMatrix();
    }
  }

  // ===================================================================
  //  Internos
  // ===================================================================
  /** Deduce velocidad y direccion del jugador a partir de su posicion. */
  _trackPlayer(p, dt) {
    if (this._lastPlayer) {
      const dx = p.x - this._lastPlayer.x, dz = p.z - this._lastPlayer.z;
      const len = Math.hypot(dx, dz);
      const inst = len / dt;
      if (len > 1e-5) this._moveDir.set(dx / len, 0, dz / len);
      this._speed += (inst - this._speed) * Math.min(1, dt * 10);     // velocidad suavizada
      if (inst > 40) this._speed = 0;                                  // teletransporte: ignorar
      this._lastPlayer.copy(p);
    } else {
      this._lastPlayer = p.clone();
    }
  }

  /** Acorta la distancia si hay algo entre el jugador y la camara. */
  _collide(px, py, pz, dx, dy, dz, wanted, dt) {
    const S = this.settings;
    if (this._raycaster && this._collidables.length && (this._frame % Math.max(1, S.collisionEvery) === 0)) {
      this._tmpA.set(px, py, pz);
      this._raycaster.set(this._tmpA, new THREE.Vector3(dx, dy, dz));
      this._raycaster.far = wanted + 0.5;
      const hits = this._raycaster.intersectObjects(this._collidables, true);
      let best = Infinity;
      for (const h of hits) {
        if (h.object.userData && h.object.userData.noCameraCollision) continue;
        if (h.object.isSprite || (h.object.material && h.object.material.transparent && h.object.material.opacity < 0.5)) continue;
        best = h.distance - S.groundClearance - 0.2;
        break;
      }
      this._collisionTarget = best;
    }
    if (this._collisionDist === null) this._collisionDist = wanted;
    const allowed = Math.max(0.9, Math.min(wanted, this._collisionTarget));
    // acercarse rapido (para no atravesar), alejarse lento (para no "saltar")
    const k = allowed < this._collisionDist ? 22 : 3.2;
    this._collisionDist += (allowed - this._collisionDist) * (1 - Math.exp(-k * dt));
    return Math.min(wanted, this._collisionDist);
  }

  _noise(t, seed) {
    return Math.sin(t * 1.0 + seed * 12.9898) * 0.6 + Math.sin(t * 2.3 + seed * 78.233) * 0.4;
  }

  /** Engancha el temblor a los sonidos del jefe (sin editar sound.js). */
  _hookShake() {
    const S = window.TrashGame && TrashGame.Sound;
    if (!S || S._camHooked) return;
    const self = this;
    const wrap = (name, strength, dur) => {
      const fn = S[name]; if (typeof fn !== 'function') return;
      S[name] = function () {
        const M = TrashGame.Main;
        if (M && M.cameraController === self && self.settings.autoShake) self.shake(strength, dur);
        return fn.apply(S, arguments);
      };
    };
    wrap('playBossSlam', 0.9, 0.55);
    wrap('playBossHit', 0.35, 0.25);
    S._camHooked = true;
  }
};
