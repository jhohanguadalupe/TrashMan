/* =========================================================================
   TRASH MAN 3D - GRAPHICS ENHANCEMENT LAYER
   - HDR + MSAA post-processing pipeline (single, correct tone-mapping pass)
   - Procedural sky dome (gradient, sun halo, animated volumetric-style clouds,
     stars, storm lightning)
   - Image-based lighting (PMREM environment generated from the sky)
   - Per-map atmosphere / lighting / colour-grade presets
   Every public method is wrapped so a failure here can NEVER break the game:
   if anything is unsupported the engine silently falls back to the original
   rendering path.
   ========================================================================= */

window.TrashGame = window.TrashGame || {};

TrashGame.Graphics = {
  enabled: true,
  composer: null,
  bloomPass: null,
  finalPass: null,
  pmrem: null,
  envCache: {},
  hemi: null,
  maxAniso: 1,
  skyUniformSets: [],
  waterTime: { value: 0 },
  flash: { value: 0 },
  nextFlash: 4,
  currentPreset: null,
  foamMeshes: [],

  // -----------------------------------------------------------------------
  // PRESETS (colours are sRGB hex, converted to linear when applied)
  // -----------------------------------------------------------------------
  presets: {
    lobby: {
      zenith: 0x1b1840, mid: 0x4a2f63, horizon: 0xd9804a, ground: 0x2a1c26,
      glow: 0xffa24a, glowAmt: 0.6, sunColor: 0xffc27a, sunStrength: 0.0,
      cloudCover: 0.0, stars: 0.0, envSun: 0.0
    },
    playa: {
      zenith: 0x2468c4, mid: 0x4fa0e6, horizon: 0xbfe0f2, ground: 0xbfe0f2,
      glow: 0xfff0d0, glowAmt: 0.25, sunColor: 0xfff0d0, sunStrength: 1.0,
      cloudLight: 0xffffff, cloudShade: 0x93aecb, cloudCover: 0.5, stars: 0.0,
      fog: 0xbfe0f2, fogNear: 55, fogFar: 250,
      ambient: [0xcfe6ff, 0.055], hemi: [0xb9dcff, 0xc0a77d, 0.34],
      sun: 1.35, rim: 0.10, fill: 0.08,
      grade: { exposure: 0.73, saturation: 1.03, contrast: 1.10, vignette: 0.24, gain: [0.99, 0.99, 0.98], lift: [0, 0, 0] },
      bloom: { strength: 0.13, radius: 0.38, threshold: 1.28 },
      envSun: 0.35
    },
    bosque: {
      zenith: 0x3a78bd, mid: 0x78aee0, horizon: 0xcfe0d4, ground: 0xb9cdb8,
      glow: 0xfff2b8, glowAmt: 0.22, sunColor: 0xffe9a8, sunStrength: 0.9,
      cloudLight: 0xffffff, cloudShade: 0xa3b8c4, cloudCover: 0.42, stars: 0.0,
      fog: 0xb4cdb6, fogNear: 28, fogFar: 170,
      ambient: [0xdcfce7, 0.06], hemi: [0xb8d8f0, 0x4f6a2e, 0.38],
      sun: 1.3, rim: 0.10, fill: 0.08,
      grade: { exposure: 0.74, saturation: 1.04, contrast: 1.10, vignette: 0.27, gain: [0.99, 1.0, 0.97], lift: [0, 0, 0] },
      bloom: { strength: 0.16, radius: 0.4, threshold: 1.25 },
      envSun: 0.3
    },
    rio: {
      zenith: 0x2f73c2, mid: 0x6aa8e0, horizon: 0xc7dde8, ground: 0xa9c3cf,
      glow: 0xffe8c8, glowAmt: 0.22, sunColor: 0xffe2bd, sunStrength: 0.9,
      cloudLight: 0xffffff, cloudShade: 0x8ea6c0, cloudCover: 0.5, stars: 0.0,
      fog: 0xa9c6d2, fogNear: 35, fogFar: 200,
      ambient: [0xe0f2fe, 0.06], hemi: [0xb4d6f2, 0x6b5a3c, 0.38],
      sun: 1.35, rim: 0.10, fill: 0.09,
      grade: { exposure: 0.74, saturation: 1.03, contrast: 1.10, vignette: 0.26, gain: [0.98, 0.99, 1.0], lift: [0, 0, 0] },
      bloom: { strength: 0.14, radius: 0.4, threshold: 1.26 },
      envSun: 0.3
    },
    ciudad: {
      zenith: 0x070b1c, mid: 0x1b1d45, horizon: 0x3a2850, ground: 0x151228,
      glow: 0xff7a3d, glowAmt: 0.5, sunColor: 0xffa060, sunStrength: 0.0,
      cloudLight: 0x6a4a78, cloudShade: 0x14122a, cloudCover: 0.45, stars: 1.0,
      fog: 0x1c1a3a, fogNear: 30, fogFar: 190,
      ambient: [0x5a6aa8, 0.11], hemi: [0x5568b0, 0x241a30, 0.38],
      sun: 0.72, rim: 0.30, fill: 0.22,
      sunColor2: 0x9aa8ff,
      grade: { exposure: 0.82, saturation: 1.05, contrast: 1.12, vignette: 0.36, gain: [0.98, 0.99, 1.03], lift: [0, 0, 0.002] },
      bloom: { strength: 0.32, radius: 0.55, threshold: 1.2 },
      envSun: 0.0
    },
    boss_arena: {
      zenith: 0x080412, mid: 0x1f0f3a, horizon: 0x4b2368, ground: 0x1a0c2a,
      glow: 0x33ff99, glowAmt: 0.35, sunColor: 0x9a66ff, sunStrength: 0.0,
      cloudLight: 0x6d3fa8, cloudShade: 0x0c0618, cloudCover: 0.75, stars: 0.0,
      fog: 0x251040, fogNear: 28, fogFar: 170,
      ambient: [0x6a40b0, 0.12], hemi: [0x6a48b8, 0x13241c, 0.4],
      sun: 0.68, rim: 0.34, fill: 0.26,
      storm: 1.0,
      grade: { exposure: 0.8, saturation: 1.07, contrast: 1.12, vignette: 0.4, gain: [1.0, 0.98, 1.03], lift: [0, 0, 0.002] },
      bloom: { strength: 0.36, radius: 0.55, threshold: 1.18 },
      envSun: 0.0
    }
  },

  // -----------------------------------------------------------------------
  // UTILS
  // -----------------------------------------------------------------------
  lin(hex) {
    const c = new THREE.Color(hex);
    c.convertSRGBToLinear();
    return c;
  },

  safe(fn, label) {
    try { return fn(); } catch (e) {
      console.warn('[Graphics] ' + (label || 'step') + ' failed, using fallback:', e);
      return null;
    }
  },

  enhanceTexture(tex, isColor) {
    if (!tex) return tex;
    tex.anisotropy = this.maxAniso || 1;
    if (isColor) tex.encoding = THREE.sRGBEncoding;
    return tex;
  },

  // -----------------------------------------------------------------------
  // RENDERER SETUP (called once from Main.init after the renderer exists)
  // -----------------------------------------------------------------------
  initRenderer(renderer) {
    this.safe(() => {
      this.maxAniso = Math.min(16, renderer.capabilities.getMaxAnisotropy());
      this.pmrem = new THREE.PMREMGenerator(renderer);
      this.pmrem.compileEquirectangularShader && this.pmrem.compileEquirectangularShader();

      // Sharper sun shadows on capable desktop GPUs
      const isTouch = ('ontouchstart' in window) || navigator.maxTouchPoints > 0;
      const bigTex = renderer.capabilities.maxTextureSize >= 8192;
      this.shadowSize = (!isTouch && bigTex) ? 4096 : 2048;
    }, 'initRenderer');
  },

  // -----------------------------------------------------------------------
  // POST-PROCESSING PIPELINE
  // -----------------------------------------------------------------------
  makeComposer(renderer, scene, camera, w, h) {
    return this.safe(() => {
      if (typeof THREE.EffectComposer === 'undefined' || typeof THREE.ShaderPass === 'undefined' ||
          typeof THREE.UnrealBloomPass === 'undefined') return null;

      const pr = renderer.getPixelRatio();
      const params = {
        format: THREE.RGBAFormat,
        type: THREE.HalfFloatType,
        minFilter: THREE.LinearFilter,
        magFilter: THREE.LinearFilter,
        encoding: THREE.LinearEncoding
      };

      let rt;
      if (renderer.capabilities.isWebGL2 && THREE.WebGLMultisampleRenderTarget) {
        rt = new THREE.WebGLMultisampleRenderTarget(w, h, params);
        rt.samples = 4;
      } else {
        rt = new THREE.WebGLRenderTarget(w, h, params);
      }

      const composer = new THREE.EffectComposer(renderer, rt);
      composer.setPixelRatio(pr);
      composer.setSize(w, h);

      composer.addPass(new THREE.RenderPass(scene, camera));

      this.bloomPass = new THREE.UnrealBloomPass(new THREE.Vector2(w, h), 0.3, 0.55, 1.05);
      composer.addPass(this.bloomPass);

      this.finalPass = new THREE.ShaderPass(this.finalShader());
      composer.addPass(this.finalPass);

      this.composer = composer;
      return composer;
    }, 'makeComposer');
  },

  finalShader() {
    return {
      uniforms: {
        tDiffuse: { value: null },
        exposure: { value: 1.0 },
        saturation: { value: 1.1 },
        contrast: { value: 1.05 },
        vignette: { value: 0.3 },
        gain: { value: new THREE.Vector3(1, 1, 1) },
        lift: { value: new THREE.Vector3(0, 0, 0) },
        aberration: { value: 0.0035 },
        grain: { value: 0.018 },
        time: { value: 0 },
        res: { value: new THREE.Vector2(1280, 720) }
      },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }`,
      fragmentShader: `
        uniform sampler2D tDiffuse;
        uniform float exposure, saturation, contrast, vignette, aberration, grain, time;
        uniform vec3 gain, lift;
        uniform vec2 res;
        varying vec2 vUv;

        vec3 RRTAndODTFit(vec3 v) {
          vec3 a = v * (v + 0.0245786) - 0.000090537;
          vec3 b = v * (0.983729 * v + 0.4329510) + 0.238081;
          return a / b;
        }
        vec3 aces(vec3 color) {
          const mat3 inM = mat3(vec3(0.59719, 0.07600, 0.02840),
                                vec3(0.35458, 0.90834, 0.13383),
                                vec3(0.04823, 0.01566, 0.83777));
          const mat3 outM = mat3(vec3(1.60475, -0.10208, -0.00327),
                                 vec3(-0.53108, 1.10813, -0.07276),
                                 vec3(-0.07367, -0.00605, 1.07602));
          color *= exposure / 0.6;
          color = inM * color;
          color = RRTAndODTFit(color);
          color = outM * color;
          return clamp(color, 0.0, 1.0);
        }
        vec3 toSRGB(vec3 c) {
          return mix(c * 12.92, 1.055 * pow(c, vec3(1.0 / 2.4)) - 0.055, step(vec3(0.0031308), c));
        }
        float hash(vec2 p) {
          return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
        }

        void main() {
          vec2 d = vUv - 0.5;
          float r2 = dot(d, d);
          vec2 off = d * r2 * aberration;
          vec3 col;
          col.r = texture2D(tDiffuse, vUv - off).r;
          col.g = texture2D(tDiffuse, vUv).g;
          col.b = texture2D(tDiffuse, vUv + off).b;

          col = aces(max(col, 0.0));
          col = toSRGB(col);

          float l = dot(col, vec3(0.2126, 0.7152, 0.0722));
          col = mix(vec3(l), col, saturation);
          col = (col - 0.5) * contrast + 0.5;
          col = col * gain + lift;

          float v = smoothstep(0.18, 0.78, length(d * vec2(1.0, 0.92)));
          col *= 1.0 - vignette * v;

          float n = hash(vUv * res + fract(time) * 91.7);
          col += (n - 0.5) * grain;

          gl_FragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
        }`
    };
  },

  setSize(w, h) {
    if (!this.finalPass) return;
    const pr = (TrashGame.Main && TrashGame.Main.renderer) ? TrashGame.Main.renderer.getPixelRatio() : 1;
    this.finalPass.uniforms.res.value.set(w * pr, h * pr);
  },

  // -----------------------------------------------------------------------
  // SKY
  // -----------------------------------------------------------------------
  skyVertex: `
    varying vec3 vDir;
    void main() {
      vDir = normalize(position);
      vec4 p = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      gl_Position = p.xyww;
    }`,

  skyFragment: `
    uniform vec3 uZenith, uMid, uHorizon, uGround, uGlow, uSunDir, uSunColor, uCloudLight, uCloudShade;
    uniform float uTime, uCloudCover, uSunStrength, uGlowAmt, uFlash, uStars, uStorm;
    varying vec3 vDir;

    float hash21(vec2 p) {
      p = fract(p * vec2(123.34, 456.21));
      p += dot(p, p + 45.32);
      return fract(p.x * p.y);
    }
    float vnoise(vec2 p) {
      vec2 i = floor(p), f = fract(p);
      f = f * f * (3.0 - 2.0 * f);
      float a = hash21(i), b = hash21(i + vec2(1, 0));
      float c = hash21(i + vec2(0, 1)), d = hash21(i + vec2(1, 1));
      return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
    }
    float fbm(vec2 p) {
      float s = 0.0, a = 0.5;
      for (int i = 0; i < 5; i++) {
        s += a * vnoise(p);
        p = p * 2.03 + vec2(17.3, 9.1);
        a *= 0.5;
      }
      return s;
    }

    void main() {
      vec3 d = normalize(vDir + vec3(0.0, 1e-5, 0.0));
      float h = d.y;
      float t = clamp(h, 0.0, 1.0);

      vec3 sky = mix(uHorizon, uMid, smoothstep(0.0, 0.32, t));
      sky = mix(sky, uZenith, smoothstep(0.22, 0.95, t));
      sky = mix(sky, uGround, 1.0 - smoothstep(-0.10, 0.0, h));

      // warm/atmospheric glow band along the horizon (stronger toward the sun)
      float sd = max(dot(d, uSunDir), 0.0);
      float hb = (h - 0.05) * 6.5;
      float band = exp(-hb * hb);
      vec2 dh = normalize(d.xz + vec2(1e-4));
      vec2 sh = normalize(uSunDir.xz + vec2(1e-4));
      float al = max(dot(dh, sh), 0.0);
      float toward = 0.45 + 0.55 * al * al;
      sky += uGlow * band * uGlowAmt * toward;

      // sun halo (the solid disc is a separate mesh)
      vec3 sun = uSunColor * (pow(max(sd, 1e-4), 220.0) * 1.6 + pow(max(sd, 1e-4), 36.0) * 0.55 + pow(max(sd, 1e-4), 6.0) * 0.16) * uSunStrength;

      // stars
      if (uStars > 0.0 && h > 0.02) {
        vec2 sp = d.xz / max(h + 0.25, 0.05) * 90.0;
        vec2 g = floor(sp);
        float r = hash21(g);
        vec2 f = fract(sp) - 0.5;
        float star = step(0.986, r) * (1.0 - smoothstep(0.0, 0.35, length(f)));
        star *= 0.6 + 0.4 * sin(uTime * (1.0 + r * 3.0) + r * 40.0);
        sky += vec3(0.8, 0.85, 1.0) * star * uStars * smoothstep(0.05, 0.4, h);
      }

      // clouds
      float cover = 0.0;
      if (h > 0.0 && uCloudCover > 0.0) {
        vec2 p = d.xz / max(h + 0.20, 0.05);
        p = p * 0.50 + vec2(uTime * 0.0045, uTime * 0.0020);
        float n = fbm(p * 1.55);
        float lo = 1.0 - uCloudCover;
        cover = smoothstep(lo, lo + 0.28, n);
        cover *= smoothstep(0.0, 0.20, h);
        float n2 = fbm((p + uSunDir.xz * 0.06) * 1.55);
        float lit = clamp((n - n2) * 4.0 + 0.55, 0.0, 1.0);
        vec3 cc = mix(uCloudShade, uCloudLight, lit);
        cc += uSunColor * pow(max(sd, 1e-4), 5.0) * 0.30 * uSunStrength;
        sky = mix(sky, cc, cover * 0.94);
      }
      sky += sun * (1.0 - cover * 0.8);

      // storm lightning flashes lighting up the clouds
      if (uFlash > 0.0) {
        float c2 = fbm(d.xz / max(h + 0.25, 0.05) * 0.8 + 3.0);
        sky += vec3(0.55, 0.5, 0.95) * uFlash * (0.35 + c2) * smoothstep(0.0, 0.3, h);
      }

      sky = clamp(sky, vec3(0.0), vec3(16.0));
      if (sky.x != sky.x || sky.y != sky.y || sky.z != sky.z) sky = uMid;
      gl_FragColor = vec4(sky, 1.0);
    }`,

  createSkyMaterial(presetKey, opts) {
    opts = opts || {};
    const p = this.presets[presetKey] || this.presets.playa;
    const data = (TrashGame.MapsData && TrashGame.MapsData[presetKey]) || {};
    const sp = data.sunPosition || { x: 45, y: 55, z: -55 };
    const sunDir = new THREE.Vector3(sp.x, sp.y, sp.z).normalize();
    const hasSun = data.hasSun !== false && (p.sunStrength || 0) > 0;

    const fogC = this.lin(p.fog !== undefined ? p.fog : p.horizon);
    const u = {
      uZenith: { value: this.lin(p.zenith) },
      uMid: { value: this.lin(p.mid) },
      uHorizon: { value: p.fog !== undefined ? fogC.clone() : this.lin(p.horizon) },
      uGround: { value: p.fog !== undefined ? fogC.clone() : this.lin(p.ground) },
      uGlow: { value: this.lin(p.glow || p.horizon) },
      uGlowAmt: { value: p.glowAmt || 0 },
      uSunDir: { value: sunDir },
      uSunColor: { value: this.lin(p.sunColor || 0xffffff) },
      uSunStrength: { value: (hasSun ? (opts.env ? (p.envSun !== undefined ? p.envSun : 0.3) : p.sunStrength) : 0) },
      uCloudLight: { value: this.lin(p.cloudLight || 0xffffff) },
      uCloudShade: { value: this.lin(p.cloudShade || 0x8899aa) },
      uCloudCover: { value: opts.env ? 0 : (p.cloudCover || 0) },
      uStars: { value: opts.env ? 0 : (p.stars || 0) },
      uStorm: { value: p.storm || 0 },
      uTime: { value: 0 },
      uFlash: this.flash
    };

    const mat = new THREE.ShaderMaterial({
      uniforms: u,
      vertexShader: this.skyVertex,
      fragmentShader: this.skyFragment,
      side: THREE.BackSide,
      depthWrite: false,
      fog: false
    });
    if (!opts.env) this.skyUniformSets.push(u);
    return mat;
  },

  // -----------------------------------------------------------------------
  // IMAGE-BASED LIGHTING
  // -----------------------------------------------------------------------
  getEnvironment(presetKey) {
    if (!this.pmrem) return null;
    if (this.envCache[presetKey]) return this.envCache[presetKey];
    const tex = this.safe(() => {
      const envScene = new THREE.Scene();
      const mat = this.createSkyMaterial(presetKey, { env: true });
      // Note: sky vertex shader forces depth to far plane; env capture needs a plain sphere
      mat.vertexShader = 'varying vec3 vDir; void main(){ vDir = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }';
      const dome = new THREE.Mesh(new THREE.SphereGeometry(50, 48, 24), mat);
      envScene.add(dome);
      const rt = this.pmrem.fromScene(envScene, 0.02);
      return rt.texture;
    }, 'env ' + presetKey);
    this.envCache[presetKey] = tex;
    return tex;
  },

  // -----------------------------------------------------------------------
  // LIGHT RIG
  // -----------------------------------------------------------------------
  initLights(scene, lights) {
    this.safe(() => {
      this.hemi = new THREE.HemisphereLight(0xb9dcff, 0x806040, 0.0);
      scene.add(this.hemi);
      lights.hemi = this.hemi;

      if (this.shadowSize && lights.sun && lights.sun.shadow) {
        lights.sun.shadow.mapSize.width = this.shadowSize;
        lights.sun.shadow.mapSize.height = this.shadowSize;
        lights.sun.shadow.bias = -0.00025;
        lights.sun.shadow.normalBias = 0.05;
      }
    }, 'initLights');
  },

  // Called by MapBuilder.build at the end of building a map.
  applyMapAtmosphere(scene, mapId) {
    this.safe(() => {
      const p = this.presets[mapId] || this.presets.playa;
      this.currentPreset = p;
      const Main = TrashGame.Main;
      const lights = Main.lights;

      // Fog & background
      if (scene.fog) {
        scene.fog.color.copy(this.lin(p.fog));
        scene.fog.near = p.fogNear;
        scene.fog.far = p.fogFar;
      }
      // background is converted from sRGB internally by three r128
      scene.background = new THREE.Color(p.fog);

      // Image-based lighting disabled: the PMREM sky capture produced black
      // materials in the playa. Sky stays as a visual background only.
      scene.environment = null;

      // Lights
      if (lights.ambient) {
        lights.ambient.color.setHex(p.ambient[0]);
        lights.ambient.intensity = p.ambient[1];
      }
      if (this.hemi) {
        this.hemi.color.copy(this.lin(p.hemi[0]));
        this.hemi.groundColor.copy(this.lin(p.hemi[1]));
        this.hemi.intensity = p.hemi[2];
      }
      if (lights.sun) {
        lights.sun.intensity = p.sun;
        if (p.sunColor2) lights.sun.color.setHex(p.sunColor2);
      }
      if (lights.rim) lights.rim.intensity = p.rim;
      if (lights.fill) lights.fill.intensity = p.fill;

      // Colour grade + bloom
      if (this.finalPass) {
        const g = p.grade, U = this.finalPass.uniforms;
        U.exposure.value = g.exposure;
        U.saturation.value = g.saturation;
        U.contrast.value = g.contrast;
        U.vignette.value = g.vignette;
        U.gain.value.set(g.gain[0], g.gain[1], g.gain[2]);
        U.lift.value.set(g.lift[0], g.lift[1], g.lift[2]);
      }
      if (this.bloomPass) {
        this.bloomPass.strength = p.bloom.strength;
        this.bloomPass.radius = p.bloom.radius;
        this.bloomPass.threshold = p.bloom.threshold;
      }
      this.flash.value = 0;
      this.nextFlash = 3 + Math.random() * 4;
    }, 'applyMapAtmosphere');
  },

  applyLobby(scene) {
    this.safe(() => {
      this.currentPreset = null;
      scene.environment = null;
      if (this.hemi) this.hemi.intensity = 0.0;
      this.skyUniformSets.length = 0;
      this.foamMeshes.length = 0;
    }, 'applyLobby');
  },

  // -----------------------------------------------------------------------
  // PER-FRAME
  // -----------------------------------------------------------------------
  update(time, dt) {
    this.waterTime.value = time;
    for (let i = 0; i < this.skyUniformSets.length; i++) this.skyUniformSets[i].uTime.value = time;
    if (this.finalPass) this.finalPass.uniforms.time.value = time;

    // Storm lightning (boss arena only)
    const p = this.currentPreset;
    if (p && p.storm) {
      this.nextFlash -= dt;
      if (this.nextFlash <= 0) {
        this.flash.value = 0.55 + Math.random() * 0.35;
        this.nextFlash = 4 + Math.random() * 7;
      }
      this.flash.value *= Math.pow(0.0025, dt);
      if (this.flash.value < 0.01) this.flash.value = 0;
    }

    // Shoreline foam breathing
    if (this.foamMeshes.length) {
      for (let i = 0; i < this.foamMeshes.length; i++) {
        const f = this.foamMeshes[i];
        const ph = time * 0.55 + f.userData.phase;
        f.position.z = f.userData.baseZ - Math.abs(Math.sin(ph)) * 1.4;
        f.material.opacity = 0.55 * (1.0 - Math.abs(Math.sin(ph)) * 0.65);
      }
    }
  },

  // -----------------------------------------------------------------------
  // WATER MATERIAL HELPER: adds a 2nd counter-scrolling normal layer
  // -----------------------------------------------------------------------
  upgradeWaterMaterial(mat) {
    this.safe(() => {
      const timeU = this.waterTime;
      mat.onBeforeCompile = (shader) => {
        shader.uniforms.uWaterTime = timeU;
        shader.vertexShader = shader.vertexShader
          .replace('#include <common>', '#include <common>\nuniform float uWaterTime;')
          .replace('#include <begin_vertex>', `
            vec3 transformed = vec3( position );
            transformed.z += sin( position.x * 0.42 + uWaterTime * 0.9 ) * 0.035;
            transformed.z += cos( position.y * 0.16 - uWaterTime * 0.72 ) * 0.025;
            transformed.z += sin( ( position.x + position.y ) * 0.11 + uWaterTime * 0.48 ) * 0.018;
          `);
        shader.fragmentShader = shader.fragmentShader
          .replace('#include <common>', '#include <common>\nuniform float uWaterTime;')
          .replace('#include <normal_fragment_maps>', `
            #ifdef TANGENTSPACE_NORMALMAP
              vec3 mapA = texture2D( normalMap, vUv ).xyz * 2.0 - 1.0;
              vec3 mapB = texture2D( normalMap, vUv * 0.43 + vec2( -uWaterTime * 0.018, uWaterTime * 0.022 ) ).xyz * 2.0 - 1.0;
              vec3 mapC = texture2D( normalMap, vUv * 2.3 + vec2( uWaterTime * 0.03, uWaterTime * 0.01 ) ).xyz * 2.0 - 1.0;
            vec3 mapN = normalize( mapA + mapB * 0.8 + mapC * 0.35 );
              mapN.xy *= normalScale;
              normal = perturbNormal2Arb( - vViewPosition, normal, mapN, faceDirection );
            #endif
          `);
      };
      mat.needsUpdate = true;
    }, 'upgradeWaterMaterial');
  }
};
