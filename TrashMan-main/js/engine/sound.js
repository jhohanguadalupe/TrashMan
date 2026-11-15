/* =========================================================================
   TRASH MAN 3D - ADVANCED SYNTHESIZED SOUND ENGINE (Web Audio API)
   ========================================================================= */

window.TrashGame = window.TrashGame || {};

TrashGame.Sound = {
  ctx: null,
  muted: false,
  assetCache: {},
  loopAudio: {},
  deathAudio: null,
  deathAudioResolve: null,

  init() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AudioCtx();
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  },

  toggleMute() {
    this.muted = !this.muted;
    Object.values(this.loopAudio).forEach(audio => { audio.muted = this.muted; });
    const icon = document.getElementById('audio-icon-display');
    if (icon) icon.textContent = this.muted ? '🔇' : '🔊';
    if (!this.muted && TrashGame.Main) {
      if (TrashGame.Main.currentMode === 'LOBBY') this.setLobbyAudio();
      else this.setMapAudio(TrashGame.Main.currentMode === 'BOSS' ? 'boss_arena' : TrashGame.Main.currentMapId);
    }
    return this.muted;
  },

  playAsset(path, volume = 0.55) {
    if (this.muted || typeof Audio === 'undefined') return false;
    const url = `assets/sounds/${path}.ogg`;
    try {
      let source = this.assetCache[url];
      if (!source) {
        source = new Audio(url);
        source.preload = 'auto';
        this.assetCache[url] = source;
      }
      const voice = source.cloneNode();
      voice.volume = Math.max(0, Math.min(1, volume));
      voice.play().catch(() => {});
      return true;
    } catch (error) { return false; }
  },

  playDamageSound(volume = 0.72) {
    if (this.muted || typeof Audio === 'undefined') return false;
    const url = 'assets/sounds/gameplay/player_damage.mpeg';
    try {
      let source = this.assetCache[url];
      if (!source) {
        source = new Audio(url);
        source.preload = 'auto';
        this.assetCache[url] = source;
      }
      const voice = source.cloneNode();
      voice.volume = Math.max(0, Math.min(1, volume));
      voice.play().catch(() => {});
      return true;
    } catch (error) { return false; }
  },

  setLoopAudio(channel, path, volume = 0.3) {
    const current = this.loopAudio[channel];
    const src = `assets/sounds/${path}.ogg`;
    if (current && current.src.endsWith(src)) return;
    if (current) { current.pause(); delete this.loopAudio[channel]; }
    if (this.muted || typeof Audio === 'undefined') return;
    const audio = new Audio(src);
    audio.loop = true;
    audio.volume = Math.max(0, Math.min(1, volume));
    audio.play().catch(() => {});
    this.loopAudio[channel] = audio;
  },

  stopLoopAudio(channel) {
    const audio = this.loopAudio[channel];
    if (!audio) return;
    audio.pause();
    audio.currentTime = 0;
    delete this.loopAudio[channel];
  },

  setMapAudio(mapId) {
    const ambient = { playa: 'ambiente/ambiente_playa', bosque: 'ambiente/ambiente_bosque', rio: 'ambiente/ambiente_rio', ciudad: 'ambiente/ambiente_ciudad', boss_arena: 'ambiente/ambiente_arena_jefe' }[mapId];
    if (ambient) this.setLoopAudio('ambience', ambient, 0.28);
    this.setLoopAudio('music', mapId === 'boss_arena' ? 'musica/musica_jefe' : 'musica/musica_juego', mapId === 'boss_arena' ? 0.22 : 0.16);
  },

  setLobbyAudio() {
    this.stopLoopAudio('ambience');
    this.setLoopAudio('music', 'musica/musica_menu', 0.14);
  },

  playClick() {
    if (this.muted) return;
    if (TrashGame.Main && TrashGame.Main.currentMode === 'LOBBY' && !this.loopAudio.music) this.setLobbyAudio();
    if (this.playAsset('ui/click', 0.42)) return;
    this.init();
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(440, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(880, this.ctx.currentTime + 0.08);
    gain.gain.setValueAtTime(0.15, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.08);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.08);
  },

  playEquip() {
    if (this.muted) return;
    if (this.playAsset('ui/equip', 0.52)) return;
    this.init();
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(523.25, now);
    osc.frequency.setValueAtTime(659.25, now + 0.06);
    osc.frequency.setValueAtTime(783.99, now + 0.12);
    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start();
    osc.stop(now + 0.25);
  },

  playCoin() {
    if (this.muted) return;
    if (this.playAsset('gameplay/coin', 0.55)) return;
    this.init();
    const now = this.ctx.currentTime;
    const osc1 = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc1.type = 'sine';
    osc2.type = 'sine';
    osc1.frequency.setValueAtTime(987.77, now);
    osc1.frequency.setValueAtTime(1318.51, now + 0.08);
    osc2.frequency.setValueAtTime(1318.51, now);
    osc2.frequency.setValueAtTime(1760.00, now + 0.08);
    gain.gain.setValueAtTime(0.22, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.32);
    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(this.ctx.destination);
    osc1.start();
    osc2.start();
    osc1.stop(now + 0.32);
    osc2.stop(now + 0.32);
  },

  playVacuumPop() {
    if (this.muted) return;
    if (this.playAsset('gameplay/vacuum_pop', 0.4)) return;
    this.init();
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(320, now);
    osc.frequency.exponentialRampToValueAtTime(960, now + 0.09);
    gain.gain.setValueAtTime(0.28, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start();
    osc.stop(now + 0.12);
  },

  playLaserShot() {
    if (this.muted) return;
    if (this.playAsset('gameplay/laser_shot', 0.45)) return;
    this.init();
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(850, now);
    osc.frequency.exponentialRampToValueAtTime(140, now + 0.16);
    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.16);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start();
    osc.stop(now + 0.16);
  },

  playBossHit() {
    if (this.muted) return;
    if (this.playAsset('jefe/boss_hit', 0.52)) return;
    this.init();
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(130, now);
    osc.frequency.exponentialRampToValueAtTime(45, now + 0.22);
    gain.gain.setValueAtTime(0.35, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start();
    osc.stop(now + 0.22);
  },

  playDeath() {
    if (this.muted) return Promise.resolve();
    if (!this.deathAudio) {
      this.deathAudio = new Audio('assets/audio/gokuuuu.mp3');
      this.deathAudio.preload = 'auto';
      this.deathAudio.volume = 0.9;
    }
    this.deathAudio.pause();
    this.deathAudio.currentTime = 0;
    return new Promise((resolve) => {
      let finished = false;
      const finish = () => {
        if (finished) return;
        finished = true;
        this.deathAudio.removeEventListener('ended', finish);
        this.deathAudio.removeEventListener('error', finish);
        this.deathAudioResolve = null;
        resolve();
      };
      this.deathAudioResolve = finish;
      this.deathAudio.addEventListener('ended', finish);
      this.deathAudio.addEventListener('error', finish);
      try {
        const playback = this.deathAudio.play();
        if (playback && playback.catch) playback.catch((error) => {
          console.warn('[Sound] Death audio could not play:', error);
          finish();
        });
      } catch (error) {
        console.warn('[Sound] Death audio could not play:', error);
        finish();
      }
    });
  },

  stopDeath() {
    if (this.deathAudio) {
      this.deathAudio.pause();
      this.deathAudio.currentTime = 0;
    }
    if (this.deathAudioResolve) this.deathAudioResolve();
  },

  playBossSlam() {
    if (this.muted) return;
    if (this.playAsset('jefe/boss_slam', 0.68)) return;
    this.init();
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(100, now);
    osc.frequency.exponentialRampToValueAtTime(25, now + 0.5);
    gain.gain.setValueAtTime(0.7, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start();
    osc.stop(now + 0.5);
  },

  playWheelTick(freq = 600) {
    if (this.muted) return;
    if (this.playAsset('ruleta/wheel_tick_1', 0.25)) return;
    this.init();
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(freq, now);
    gain.gain.setValueAtTime(0.07, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start();
    osc.stop(now + 0.04);
  },

  playFanfare() {
    if (this.muted) return;
    if (this.playAsset('gameplay/level_complete', 0.58)) return;
    this.init();
    const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
    notes.forEach((freq, idx) => {
      const now = this.ctx.currentTime + idx * 0.1;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now);
      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.4);
    });
  }
};
