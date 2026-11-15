/* =========================================================================
   TRASH MAN 3D - PROCEDURAL PBR TEXTURE & MATERIAL GENERATOR
   Generates photorealistic high-res procedural PBR textures directly in Canvas
   (No external image dependencies, zero download latency, ultra-sharp detail)
   ========================================================================= */

window.TrashGame = window.TrashGame || {};

TrashGame.Textures = {
  cache: {},

  // Helper to create a canvas texture with crisp anisotropic settings
  _createTexture(drawFn, width = 512, height = 512) {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    drawFn(ctx, width, height);

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.generateMipmaps = true;
    texture.minFilter = THREE.LinearMipmapLinearFilter;
    texture.magFilter = THREE.LinearFilter;
    return texture;
  },

  // 1. SCI-FI TITANIUM HANGAR FLOOR (For the Lobby)
  getSciFiFloor() {
    if (this.cache.sciFiFloor) return this.cache.sciFiFloor;

    const diffuse = this._createTexture((ctx, w, h) => {
      // Dark slate brushed titanium base
      const grad = ctx.createLinearGradient(0, 0, w, h);
      grad.addColorStop(0, '#0b1120');
      grad.addColorStop(0.5, '#0f172a');
      grad.addColorStop(1, '#020617');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);

      // Brushed metal streaks
      for (let i = 0; i < 2000; i++) {
        const x = Math.random() * w;
        const y = Math.random() * h;
        const len = 15 + Math.random() * 40;
        ctx.fillStyle = `rgba(255, 255, 255, ${0.01 + Math.random() * 0.03})`;
        ctx.fillRect(x, y, len, 1);
      }

      // Modular Grid Tiles & Seams
      const tileSize = 64;
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.7)';
      ctx.lineWidth = 3;
      for (let x = 0; x <= w; x += tileSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, h);
        ctx.stroke();
      }
      for (let y = 0; y <= h; y += tileSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
        ctx.stroke();
      }

      // Hexagonal tech accents & bevel highlights
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.2)';
      ctx.lineWidth = 1;
      for (let x = 0; x < w; x += tileSize) {
        for (let y = 0; y < h; y += tileSize) {
          ctx.strokeRect(x + 2, y + 2, tileSize - 4, tileSize - 4);
          
          // Screws / Bolts on corners
          ctx.fillStyle = '#475569';
          ctx.beginPath();
          ctx.arc(x + 6, y + 6, 2, 0, Math.PI * 2);
          ctx.arc(x + tileSize - 6, y + 6, 2, 0, Math.PI * 2);
          ctx.arc(x + 6, y + tileSize - 6, 2, 0, Math.PI * 2);
          ctx.arc(x + tileSize - 6, y + tileSize - 6, 2, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // Glowing circuit traces
      ctx.strokeStyle = '#00ff88';
      ctx.shadowColor = '#00ff88';
      ctx.shadowBlur = 8;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, 128); ctx.lineTo(128, 128); ctx.lineTo(192, 192); ctx.lineTo(384, 192); ctx.lineTo(448, 256); ctx.lineTo(512, 256);
      ctx.moveTo(256, 0); ctx.lineTo(256, 128); ctx.lineTo(320, 192); ctx.lineTo(320, 384); ctx.lineTo(256, 448); ctx.lineTo(256, 512);
      ctx.stroke();
      ctx.shadowBlur = 0;
    }, 1024, 1024);

    const roughness = this._createTexture((ctx, w, h) => {
      ctx.fillStyle = '#222222'; // Glossy metal base
      ctx.fillRect(0, 0, w, h);
      // Rough seams
      ctx.strokeStyle = '#888888';
      ctx.lineWidth = 4;
      for (let x = 0; x <= w; x += 64) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke();
      }
      for (let y = 0; y <= h; y += 64) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
      }
    }, 512, 512);

    this.cache.sciFiFloor = { diffuse, roughness };
    return this.cache.sciFiFloor;
  },

  // 2. TROPICAL GOLDEN SAND (For Playa Paraíso - Rich Warm Beach Color)
  getSand() {
    if (this.cache.sand) return this.cache.sand;

    const diffuse = this._createTexture((ctx, w, h) => {
      // Natural warm golden-tan sand gradient (realistic tropical beach, NOT pale/white)
      const grad = ctx.createLinearGradient(0, 0, w, h);
      grad.addColorStop(0, '#d99b45');
      grad.addColorStop(0.3, '#c88c3a');
      grad.addColorStop(0.7, '#b87c2e');
      grad.addColorStop(1, '#a87028');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);

      // Micro granular sand grains
      const imgData = ctx.getImageData(0, 0, w, h);
      const d = imgData.data;
      for (let i = 0; i < d.length; i += 4) {
        const noise = (Math.random() - 0.5) * 28;
        d[i] = Math.min(255, Math.max(0, d[i] + noise));
        d[i+1] = Math.min(255, Math.max(0, d[i+1] + noise * 0.85));
        d[i+2] = Math.min(255, Math.max(0, d[i+2] + noise * 0.65));
      }
      ctx.putImageData(imgData, 0, 0);

      // Organic wind-swept sand ripples
      ctx.strokeStyle = 'rgba(115, 65, 15, 0.22)';
      ctx.lineWidth = 5;
      for (let y = 15; y < h; y += 32) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        for (let x = 0; x <= w; x += 25) {
          ctx.quadraticCurveTo(x + 12, y + Math.sin(x * 0.06) * 6, x + 25, y);
        }
        ctx.stroke();
      }
    }, 512, 512);

    this.cache.sand = diffuse;
    return this.cache.sand;
  },

  // Weathered bark grain shared by the forest trunks.
  getBark() {
    if (this.cache.bark) return this.cache.bark;
    const bark = this._createTexture((ctx, w, h) => {
      const base = ctx.createLinearGradient(0, 0, w, 0);
      base.addColorStop(0, '#35251b');
      base.addColorStop(0.28, '#694831');
      base.addColorStop(0.55, '#493326');
      base.addColorStop(0.82, '#755039');
      base.addColorStop(1, '#38271e');
      ctx.fillStyle = base;
      ctx.fillRect(0, 0, w, h);
      for (let i = 0; i < 780; i++) {
        const x = Math.random() * w;
        const width = 1 + Math.random() * 5;
        ctx.fillStyle = Math.random() > 0.48
          ? `rgba(20, 14, 10, ${0.08 + Math.random() * 0.24})`
          : `rgba(202, 153, 104, ${0.04 + Math.random() * 0.14})`;
        ctx.fillRect(x, 0, width, h);
      }
      for (let i = 0; i < 26; i++) {
        const x = Math.random() * w, y = Math.random() * h;
        ctx.strokeStyle = 'rgba(24, 16, 11, 0.3)';
        ctx.lineWidth = 2 + Math.random() * 3;
        ctx.beginPath();
        ctx.ellipse(x, y, 5 + Math.random() * 12, 12 + Math.random() * 34, (Math.random() - 0.5) * 0.2, 0, Math.PI * 2);
        ctx.stroke();
      }
    }, 512, 512);
    this.cache.bark = bark;
    return bark;
  },

  getSurfaceBump() {
    if (this.cache.surfaceBump) return this.cache.surfaceBump;
    const size = 128;
    const data = new Uint8Array(size * size);
    let seed = 0x37a51;
    for (let i = 0; i < data.length; i++) {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      data[i] = 118 + ((seed >>> 24) % 21);
    }
    const bump = new THREE.DataTexture(data, size, size, THREE.LuminanceFormat);
    bump.wrapS = bump.wrapT = THREE.RepeatWrapping;
    bump.repeat.set(8, 8);
    bump.needsUpdate = true;
    this.cache.surfaceBump = bump;
    return bump;
  },

  // 3. ORGANIC FOREST TERRAIN (Grass, Moss & Dirt)
  getForestTerrain() {
    if (this.cache.forestTerrain) return this.cache.forestTerrain;

    const diffuse = this._createTexture((ctx, w, h) => {
      // Moss, leaf litter and damp soil in a restrained forest palette.
      ctx.fillStyle = '#35483a';
      ctx.fillRect(0, 0, w, h);

      // Dense grass strands & moss patches
      for (let i = 0; i < 4000; i++) {
        const x = Math.random() * w;
        const y = Math.random() * h;
        const colVal = Math.random();
        if (colVal < 0.4) {
          ctx.fillStyle = '#526947';
        } else if (colVal < 0.7) {
          ctx.fillStyle = '#73804e';
        } else if (colVal < 0.9) {
          ctx.fillStyle = '#304a38';
        } else {
          ctx.fillStyle = '#3f2e18'; // Rich soil
        }
        ctx.fillRect(x, y, 2 + Math.random() * 3, 4 + Math.random() * 6);
      }

      // Soft natural soil noise
      ctx.fillStyle = 'rgba(41, 26, 12, 0.2)';
      for (let i = 0; i < 30; i++) {
        ctx.beginPath();
        ctx.arc(Math.random() * w, Math.random() * h, 15 + Math.random() * 35, 0, Math.PI * 2);
        ctx.fill();
      }
    }, 512, 512);

    this.cache.forestTerrain = diffuse;
    return this.cache.forestTerrain;
  },

  // 4. WET ASPHALT WITH PUDDLES (Industrial City)
  getAsphalt() {
    if (this.cache.asphalt) return this.cache.asphalt;

    const diffuse = this._createTexture((ctx, w, h) => {
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(0, 0, w, h);

      // Asphalt fine gravel texture
      const imgData = ctx.getImageData(0, 0, w, h);
      const d = imgData.data;
      for (let i = 0; i < d.length; i += 4) {
        const n = (Math.random() - 0.5) * 45;
        d[i] = Math.min(255, Math.max(0, d[i] + n));
        d[i+1] = Math.min(255, Math.max(0, d[i+1] + n));
        d[i+2] = Math.min(255, Math.max(0, d[i+2] + n + 6)); // Slight blueish tint
      }
      ctx.putImageData(imgData, 0, 0);

      // Subtle dark mineral patches; larger puddles are placed in the scene.
      ctx.fillStyle = 'rgba(2, 6, 23, 0.18)';
      for (let i = 0; i < 3; i++) {
        ctx.beginPath();
        ctx.ellipse(Math.random() * w, Math.random() * h, 30 + Math.random() * 40, 20 + Math.random() * 25, Math.random() * Math.PI, 0, Math.PI * 2);
        ctx.fill();
      }
    }, 512, 512);

    this.cache.asphalt = diffuse;
    return this.cache.asphalt;
  },

  getRiverMud() {
    if (this.cache.riverMud) return this.cache.riverMud;
    const mud = this._createTexture((ctx, w, h) => {
      const base = ctx.createLinearGradient(0, 0, w, h);
      base.addColorStop(0, '#4a4a40');
      base.addColorStop(0.48, '#686456');
      base.addColorStop(1, '#3e4643');
      ctx.fillStyle = base;
      ctx.fillRect(0, 0, w, h);
      for (let i = 0; i < 2800; i++) {
        const x = Math.random() * w, y = Math.random() * h;
        const radius = 1 + Math.random() * 5;
        const shade = Math.random() > 0.52 ? 0 : 255;
        ctx.fillStyle = `rgba(${shade}, ${shade}, ${shade}, ${0.025 + Math.random() * 0.11})`;
        ctx.beginPath();
        ctx.ellipse(x, y, radius * 1.8, radius, Math.random(), 0, Math.PI * 2);
        ctx.fill();
      }
      for (let i = 0; i < 24; i++) {
        const x = Math.random() * w, y = Math.random() * h;
        ctx.fillStyle = i % 2 ? 'rgba(31, 38, 35, 0.2)' : 'rgba(145, 127, 97, 0.16)';
        ctx.beginPath();
        ctx.ellipse(x, y, 8 + Math.random() * 24, 4 + Math.random() * 13, Math.random(), 0, Math.PI * 2);
        ctx.fill();
      }
    }, 512, 512);
    this.cache.riverMud = mud;
    return mud;
  },

  // 5. TOXIC FRACTURED VOLCANIC CRUST (Boss Arena)
  getToxicArena() {
    if (this.cache.toxicArena) return this.cache.toxicArena;

    const diffuse = this._createTexture((ctx, w, h) => {
      // Charred obsidian / cracked black crust
      ctx.fillStyle = '#09090b';
      ctx.fillRect(0, 0, w, h);

      // Glowing radioactive magma fractures
      ctx.strokeStyle = '#22c55e';
      ctx.shadowColor = '#00ff88';
      ctx.shadowBlur = 12;
      ctx.lineWidth = 5;

      const drawCrack = (x1, y1, x2, y2, depth = 0) => {
        if (depth > 4) {
          ctx.beginPath();
          ctx.moveTo(x1, y1);
          ctx.lineTo(x2, y2);
          ctx.stroke();
          return;
        }
        const midX = (x1 + x2) / 2 + (Math.random() - 0.5) * 40;
        const midY = (y1 + y2) / 2 + (Math.random() - 0.5) * 40;
        drawCrack(x1, y1, midX, midY, depth + 1);
        drawCrack(midX, midY, x2, y2, depth + 1);
      };

      for (let i = 0; i < 10; i++) {
        drawCrack(Math.random() * w, Math.random() * h, Math.random() * w, Math.random() * h);
      }
      ctx.shadowBlur = 0;

      // Surface rock roughness
      ctx.fillStyle = 'rgba(39, 39, 42, 0.4)';
      for (let i = 0; i < 200; i++) {
        ctx.fillRect(Math.random() * w, Math.random() * h, 4 + Math.random() * 12, 4 + Math.random() * 12);
      }
    }, 1024, 1024);

    this.cache.toxicArena = diffuse;
    return this.cache.toxicArena;
  },

  // 6. SCRAP METAL & HEAVY RUST (Boss & Industrial Objects)
  getScrapMetal() {
    if (this.cache.scrapMetal) return this.cache.scrapMetal;

    const diffuse = this._createTexture((ctx, w, h) => {
      // Cast iron / industrial steel
      ctx.fillStyle = '#475569';
      ctx.fillRect(0, 0, w, h);

      // Rust oxidization patches
      for (let i = 0; i < 40; i++) {
        const x = Math.random() * w;
        const y = Math.random() * h;
        const rad = 20 + Math.random() * 50;
        const rustGrad = ctx.createRadialGradient(x, y, 5, x, y, rad);
        rustGrad.addColorStop(0, 'rgba(154, 52, 18, 0.85)'); // Deep rust red
        rustGrad.addColorStop(0.6, 'rgba(180, 83, 9, 0.5)'); // Orange oxide
        rustGrad.addColorStop(1, 'rgba(71, 85, 105, 0)');
        ctx.fillStyle = rustGrad;
        ctx.beginPath();
        ctx.arc(x, y, rad, 0, Math.PI * 2);
        ctx.fill();
      }

      // Scratches and welding seams
      ctx.strokeStyle = '#1e293b';
      ctx.lineWidth = 2;
      for (let i = 0; i < 30; i++) {
        ctx.beginPath();
        const sx = Math.random() * w;
        const sy = Math.random() * h;
        ctx.moveTo(sx, sy);
        ctx.lineTo(sx + (Math.random() - 0.5) * 60, sy + (Math.random() - 0.5) * 60);
        ctx.stroke();
      }
    }, 512, 512);

    this.cache.scrapMetal = diffuse;
    return this.cache.scrapMetal;
  },

  // 7. OCEAN WATER NORMAL MAP (Dynamic Ripples)
  getWaterNormal() {
    if (this.cache.waterNormal) return this.cache.waterNormal;

    const normal = this._createTexture((ctx, w, h) => {
      // Normal map neutral blue base (128, 128, 255)
      ctx.fillStyle = 'rgb(128, 128, 255)';
      ctx.fillRect(0, 0, w, h);

      // Wave slope deviations
      for (let y = 0; y < h; y += 4) {
        for (let x = 0; x < w; x += 4) {
          const waveX = Math.sin(x * 0.08) * Math.cos(y * 0.06);
          const waveY = Math.cos(x * 0.06) * Math.sin(y * 0.08);
          const r = Math.floor(128 + waveX * 60);
          const g = Math.floor(128 + waveY * 60);
          ctx.fillStyle = `rgb(${r}, ${g}, 255)`;
          ctx.fillRect(x, y, 4, 4);
        }
      }
    }, 256, 256);

    this.cache.waterNormal = normal;
    return this.cache.waterNormal;
  }
};
