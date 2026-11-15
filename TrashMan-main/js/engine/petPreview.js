/* =========================================================================
   TRASH MAN 3D — FREE FIRE STYLE 3D PET SHOWCASE ENGINE
   Dedicated 3D studio viewport for companions: 360° drag rotation,
   holographic pedestal, animated tricks, sounds and live preview!
   ========================================================================= */

window.TrashGame = window.TrashGame || {};

TrashGame.PetPreview = {
  renderer: null,
  scene: null,
  camera: null,
  petGroup: null,
  pedestalGroup: null,
  animId: null,
  rotY: 0,
  targetRotY: 0,
  isDragging: false,
  prevX: 0,
  initialized: false,
  currentPetId: 'ecobot',
  isDoingTrick: false,
  trickStart: 0,

  init() {
    const canvas = document.getElementById('pet-preview-canvas');
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const w = rect.width || 360;
    const h = rect.height || 420;

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(36, w / h, 0.1, 50);
    this.camera.position.set(0, 0.45, 2.3);
    this.camera.lookAt(0, 0.12, 0);

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
    const amb = new THREE.AmbientLight(0xffffff, 0.95);
    this.scene.add(amb);

    const keyLight = new THREE.DirectionalLight(0xfffaed, 1.4);
    keyLight.position.set(4, 8, 6);
    this.scene.add(keyLight);

    const purpleRim = new THREE.DirectionalLight(0xa855f7, 1.2);
    purpleRim.position.set(-4, 5, -4);
    this.scene.add(purpleRim);

    const cyanRim = new THREE.DirectionalLight(0x06b6d4, 1.0);
    cyanRim.position.set(4, 3, -4);
    this.scene.add(cyanRim);

    // Free Fire High-Tech Pedestal Platform
    this.pedestalGroup = new THREE.Group();
    const pedGeo = new THREE.CylinderGeometry(0.75, 0.88, 0.06, 32);
    const pedMat = new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      roughness: 0.3,
      metalness: 0.85,
      transparent: true,
      opacity: 0.8
    });
    const ped = new THREE.Mesh(pedGeo, pedMat);
    ped.position.y = -0.32;
    this.pedestalGroup.add(ped);

    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(0.72, 0.018, 10, 40),
      new THREE.MeshStandardMaterial({ color: 0xa855f7, emissive: 0xa855f7, emissiveIntensity: 2.8 })
    );
    ring.rotation.x = Math.PI / 2;
    ring.position.y = -0.28;
    this.pedestalGroup.add(ring);
    this.scene.add(this.pedestalGroup);

    this.petGroup = new THREE.Group();
    this.petGroup.position.set(0, 0.08, 0);
    this.scene.add(this.petGroup);

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

  open(petId) {
    if (!this.initialized) {
      this.init();
    } else {
      this.resize();
    }
    this.currentPetId = petId || TrashGame.State.equipped.pet || 'ecobot';
    this.targetRotY = 0;
    this.rotY = 0;
    this.updateModel(this.currentPetId);
    this.startLoop();
  },

  resize() {
    const canvas = document.getElementById('pet-preview-canvas');
    if (!canvas || !this.renderer || !this.camera) return;
    const rect = canvas.getBoundingClientRect();
    const w = rect.width || 360;
    const h = rect.height || 420;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
  },

  updateModel(petId) {
    this.currentPetId = petId;
    if (!this.petGroup) return;
    TrashGame.CharacterBuilder.buildPet(this.petGroup, petId);
    this.petGroup.position.set(0, 0.08, 0); // Center inside preview
  },

  centerView() {
    this.targetRotY = 0;
    if (TrashGame.Sound) TrashGame.Sound.playClick();
  },

  playPetTrick() {
    if (!this.petGroup) return;
    this.isDoingTrick = true;
    this.trickStart = performance.now() / 1000;

    if (TrashGame.Sound) {
      TrashGame.Sound.playFanfare();
    }
    if (typeof confetti === 'function') {
      confetti({
        particleCount: 40,
        spread: 60,
        origin: { y: 0.6 },
        colors: ['#a855f7', '#ec4899', '#06b6d4', '#00ff88']
      });
    }
    if (TrashGame.UI) {
      TrashGame.UI.showToast('¡Tu mascota realizó una acrobacia aérea! ✨', 'success');
    }
  },

  startLoop() {
    if (this.animId) cancelAnimationFrame(this.animId);
    const render = () => {
      this.animId = requestAnimationFrame(render);
      this.rotY += (this.targetRotY - this.rotY) * 0.12;

      const time = performance.now() / 1000;

      if (this.pedestalGroup) {
        this.pedestalGroup.rotation.y = time * 0.2;
      }

      if (this.petGroup) {
        this.petGroup.rotation.y = this.rotY;

        // Trick animation (acrobatic spin) or gentle hover
        if (this.isDoingTrick) {
          const elapsed = time - this.trickStart;
          if (elapsed < 1.2) {
            const p = elapsed / 1.2;
            this.petGroup.position.y = 0.08 + Math.sin(p * Math.PI) * 0.45;
            this.petGroup.rotation.x = p * Math.PI * 2; // Full backflip!
          } else {
            this.isDoingTrick = false;
            this.petGroup.rotation.x = 0;
          }
        } else {
          this.petGroup.position.y = 0.08 + Math.sin(time * 3) * 0.06;
        }

        // Sub-elements rotation (rings, rotors, propellers)
        if (this.petGroup.userData.ring1) {
          if (this.currentPetId === 'drone_bee') {
            this.petGroup.userData.ring1.rotation.y = time * 25; // Super fast spinning rotors!
          } else {
            this.petGroup.userData.ring1.rotation.y = time * 2.2;
            this.petGroup.userData.ring1.rotation.z = time * 1.6;
          }
        }
        if (this.petGroup.userData.ring2) {
          this.petGroup.userData.ring2.rotation.y = -time * 1.8;
        }
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
