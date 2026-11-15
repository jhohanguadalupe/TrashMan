/* =========================================================================
   TRASH MAN 3D — FREE FIRE STYLE 3D INVENTORY PREVIEW ENGINE
   Dedicated interactive 3D studio viewport: live character model,
   instant skin preview, 360° mouse rotation, lighting, pedestal & emotes.
   ========================================================================= */

window.TrashGame = window.TrashGame || {};

TrashGame.InventoryPreview = {
  renderer: null,
  scene: null,
  camera: null,
  characterGroup: null,
  animId: null,
  rotY: 0,
  targetRotY: 0,
  isDragging: false,
  prevX: 0,
  initialized: false,

  init() {
    const canvas = document.getElementById('inv-preview-canvas');
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const w = rect.width || 380;
    const h = rect.height || 480;

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(38, w / h, 0.1, 50);
    this.camera.position.set(0, 1.25, 3.4);
    this.camera.lookAt(0, 0.95, 0);

    this.renderer = new THREE.WebGLRenderer({
      canvas: canvas,
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance'
    });
    this.renderer.setSize(w, h);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.outputEncoding = THREE.sRGBEncoding;

    // Tactical Studio Lighting
    const amb = new THREE.AmbientLight(0xffffff, 0.85);
    this.scene.add(amb);

    const keyLight = new THREE.DirectionalLight(0xfffaed, 1.4);
    keyLight.position.set(5, 10, 7);
    this.scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0x00ff88, 0.9);
    rimLight.position.set(-5, 6, -5);
    this.scene.add(rimLight);

    const cyanRim = new THREE.DirectionalLight(0x06b6d4, 0.7);
    cyanRim.position.set(5, 4, -4);
    this.scene.add(cyanRim);

    // Free Fire High-Tech Pedestal Base
    const pedGeo = new THREE.CylinderGeometry(0.95, 1.1, 0.08, 36);
    const pedMat = new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      roughness: 0.3,
      metalness: 0.8,
      transparent: true,
      opacity: 0.8
    });
    const ped = new THREE.Mesh(pedGeo, pedMat);
    ped.position.y = -0.04;
    this.scene.add(ped);

    const ringGeo = new THREE.TorusGeometry(0.9, 0.02, 12, 48);
    const ringMat = new THREE.MeshStandardMaterial({
      color: 0x00ff88,
      emissive: 0x00ff88,
      emissiveIntensity: 2.5
    });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.rotation.x = Math.PI / 2;
    ring.position.y = 0.01;
    this.scene.add(ring);

    this.characterGroup = new THREE.Group();
    this.characterGroup.position.set(0, 0, 0);
    this.scene.add(this.characterGroup);

    // Mouse Drag Rotation
    canvas.addEventListener('mousedown', (e) => {
      this.isDragging = true;
      this.prevX = e.clientX;
    });

    window.addEventListener('mouseup', () => {
      this.isDragging = false;
    });

    window.addEventListener('mousemove', (e) => {
      if (!this.isDragging) return;
      const dx = e.clientX - this.prevX;
      this.targetRotY += dx * 0.015;
      this.prevX = e.clientX;
    });

    // Mobile / Touch Drag
    canvas.addEventListener('touchstart', (e) => {
      if (e.touches.length > 0) {
        this.isDragging = true;
        this.prevX = e.touches[0].clientX;
      }
    });

    window.addEventListener('touchend', () => {
      this.isDragging = false;
    });

    window.addEventListener('touchmove', (e) => {
      if (!this.isDragging || e.touches.length === 0) return;
      const dx = e.touches[0].clientX - this.prevX;
      this.targetRotY += dx * 0.015;
      this.prevX = e.touches[0].clientX;
    });

    this.initialized = true;
  },

  open(tempEquipped) {
    if (!this.initialized) {
      this.init();
    } else {
      this.resize();
    }
    this.targetRotY = 0;
    this.rotY = 0;
    this.updateModel(tempEquipped);
    this.startLoop();
  },

  resize() {
    const canvas = document.getElementById('inv-preview-canvas');
    if (!canvas || !this.renderer || !this.camera) return;
    const rect = canvas.getBoundingClientRect();
    const w = rect.width || 380;
    const h = rect.height || 480;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
  },

  updateModel(equipped) {
    if (!this.characterGroup) return;
    TrashGame.CharacterBuilder.build(
      this.characterGroup,
      TrashGame.State.player.character,
      equipped || TrashGame.State.equipped
    );
    this.characterGroup.userData.isInventoryPreview = true;
  },

  testEmote(emoteId) {
    if (!this.characterGroup) return;
    if (TrashGame.Emotes) {
      TrashGame.Emotes.trigger(emoteId);
    }
  },

  centerView() {
    this.targetRotY = 0;
    if (TrashGame.Sound) TrashGame.Sound.playClick();
  },

  startLoop() {
    if (this.animId) cancelAnimationFrame(this.animId);
    const render = () => {
      this.animId = requestAnimationFrame(render);
      this.rotY += (this.targetRotY - this.rotY) * 0.12;
      
      const time = performance.now() / 1000;

      // Animar emote o respiración en el preview
      let isEmoting = false;
      if (TrashGame.Emotes && TrashGame.Emotes.activeEmote) {
        isEmoting = TrashGame.Emotes.update(this.characterGroup, time, 0.016);
      }

      if (!isEmoting && this.characterGroup) {
        this.characterGroup.rotation.y = this.rotY;
        this.characterGroup.position.set(0, 0, 0);
        const u = this.characterGroup.userData;
        if (u && u.gltfMixer) u.gltfMixer.update(0.016);
        if (u && u.torso && !u.gltfMixer) {
          const b = Math.sin(time * 2.5) * 0.02;
          u.torso.scale.set(1 + b, 1 + b * 0.8, 1 + b);
          this.characterGroup.position.y = Math.sin(time * 2) * 0.015;

          const lerpSpeed = 0.16;
          u.torso.rotation.x += (0 - u.torso.rotation.x) * lerpSpeed;
          u.torso.rotation.y += (0 - u.torso.rotation.y) * lerpSpeed;
          u.torso.rotation.z += (0 - u.torso.rotation.z) * lerpSpeed;

          if (u.headGroup) {
            u.headGroup.rotation.x += (0 - u.headGroup.rotation.x) * lerpSpeed;
            u.headGroup.rotation.y += (0 - u.headGroup.rotation.y) * lerpSpeed;
            u.headGroup.rotation.z += (0 - u.headGroup.rotation.z) * lerpSpeed;
          }

          if (u.leftArm) {
            u.leftArm.rotation.x += (0 - u.leftArm.rotation.x) * lerpSpeed;
            u.leftArm.rotation.y += (0 - u.leftArm.rotation.y) * lerpSpeed;
            u.leftArm.rotation.z += (0.06 - u.leftArm.rotation.z) * lerpSpeed;
          }

          if (u.rightArm) {
            u.rightArm.rotation.x += (-0.1 - u.rightArm.rotation.x) * lerpSpeed;
            u.rightArm.rotation.y += (0 - u.rightArm.rotation.y) * lerpSpeed;
            u.rightArm.rotation.z += (-0.06 - u.rightArm.rotation.z) * lerpSpeed;
          }

          if (u.leftLeg) {
            u.leftLeg.rotation.x += (0 - u.leftLeg.rotation.x) * lerpSpeed;
            u.leftLeg.rotation.y += (0 - u.leftLeg.rotation.y) * lerpSpeed;
            u.leftLeg.rotation.z += (0 - u.leftLeg.rotation.z) * lerpSpeed;
          }

          if (u.rightLeg) {
            u.rightLeg.rotation.x += (0 - u.rightLeg.rotation.x) * lerpSpeed;
            u.rightLeg.rotation.y += (0 - u.rightLeg.rotation.y) * lerpSpeed;
            u.rightLeg.rotation.z += (0 - u.rightLeg.rotation.z) * lerpSpeed;
          }
        }
      } else if (this.characterGroup) {
        this.characterGroup.rotation.y = this.rotY;
      }

      if (this.renderer && this.scene && this.camera) {
        this.renderer.render(this.scene, this.camera);
      }
    };
    render();
  },

  stopLoop() {
    if (this.animId) {
      cancelAnimationFrame(this.animId);
      this.animId = null;
    }
  }
};
