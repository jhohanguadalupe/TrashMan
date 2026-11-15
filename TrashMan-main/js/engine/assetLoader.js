/* =========================================================================
   TRASH MAN 3D - ASYNC GLTF/GLB ASSET LOADER & CACHE MANAGER
   Loads real photorealistic 3D models with PBR textures and shadow setup
   ========================================================================= */

window.TrashGame = window.TrashGame || {};

TrashGame.AssetLoader = {
  loader: null,
  models: {},
  loaded: false,

  init() {
    if (typeof THREE.GLTFLoader !== 'undefined') {
      this.loader = new THREE.GLTFLoader();
      // car.glb is Draco-compressed: without a DRACOLoader it silently failed and a placeholder was used.
      if (typeof THREE.DRACOLoader !== 'undefined') {
        try {
          const draco = new THREE.DRACOLoader();
          draco.setDecoderPath('https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/libs/draco/gltf/');
          this.loader.setDRACOLoader(draco);
        } catch (e) { console.warn('[AssetLoader] DRACOLoader setup failed', e); }
      }
    } else {
      console.warn('GLTFLoader not found, using procedural fallback.');
    }
  },

  has(key) {
    return !!this.models[key];
  },

  getModel(key, scale = 1.0) {
    if (!this.models[key]) return null;
    const clone = (THREE.SkeletonUtils && THREE.SkeletonUtils.clone)
      ? THREE.SkeletonUtils.clone(this.models[key])
      : this.models[key].clone(true);
    clone.scale.set(scale, scale, scale);
    return clone;
  },

  loadModel(key, path) {
    return new Promise((resolve) => {
      if (!this.loader) return resolve(null);

      this.loader.load(
        path,
        (gltf) => {
          const model = gltf.scene || gltf.scenes[0];
          model.traverse((child) => {
            if (child.isMesh) {
              child.castShadow = true;
              child.receiveShadow = true;
              if (child.material) {
                child.material.roughness = child.material.roughness !== undefined ? child.material.roughness : 0.5;
                // Sharper textures at grazing angles
                const aniso = (TrashGame.Graphics && TrashGame.Graphics.maxAniso) || 8;
                ['map', 'normalMap', 'roughnessMap', 'metalnessMap', 'emissiveMap', 'aoMap'].forEach(k => {
                  if (child.material[k]) child.material[k].anisotropy = aniso;
                });
              }
            }
          });
          this.models[key] = model;
          this.models[key + '_gltf'] = gltf; // Store animations if needed
          resolve(model);
        },
        undefined,
        (err) => {
          console.warn(`[AssetLoader] Could not load ${path}, fallback used.`, err);
          resolve(null);
        }
      );
    });
  },

  async loadAll(onProgress, onComplete) {
    this.init();

    const assetsToLoad = [
      { key: 'hero', path: 'assets/models/characters/hero.glb' },
      { key: 'bottle', path: 'assets/models/items/water_bottle.glb' },
      { key: 'boombox', path: 'assets/models/items/boombox.glb' },
      { key: 'mug', path: 'assets/models/items/mug.glb' },
      { key: 'car', path: 'assets/models/environment/car.glb' },
      { key: 'lamp', path: 'assets/models/environment/lamp.glb' },
      { key: 'flamingo', path: 'assets/models/environment/flamingo.glb' }
    ];

    let count = 0;
    const total = assetsToLoad.length;

    for (const a of assetsToLoad) {
      await this.loadModel(a.key, a.path);
      count++;
      if (onProgress) onProgress(count / total);
    }

    this.loaded = true;
    if (onComplete) onComplete();
  }
};
