/* =========================================================================
   TRASH MAN 3D — FREE FIRE STYLE EMOTES SYSTEM
   Dynamic 3D procedural animations: dances, martial arts kicks, muscle flexes,
   military salutes, taunts, and legendary superhero poses with sound & VFX!
   ========================================================================= */

window.TrashGame = window.TrashGame || {};

TrashGame.Emotes = {
  activeEmote: null,
  startTime: 0,
  duration: 6.0,
  loop: false,

  list: [
    {
      id: 'dance',
      name: 'Danza Free Fire',
      icon: '💃',
      category: 'Baile Épico',
      desc: 'El clásico baile rítmico y viral de victoria con cadencia de cadera y brazos.',
      rarity: 'epico',
      duration: 8.0,
      loop: true
    },
    {
      id: 'kungfu',
      name: 'Patada Dragón',
      icon: '🥋',
      category: 'Artes Marciales',
      desc: 'Salto acrobático, giro de 360° en el aire con patada voladora y aterrizaje ninja.',
      rarity: 'legendario',
      duration: 3.5,
      loop: false
    },
    {
      id: 'flex',
      name: 'Poder de Titán',
      icon: '💪',
      category: 'Fuerza Épica',
      desc: 'Carga de energía eco con pisada pesada y flexión doble de bíceps titánico.',
      rarity: 'raro',
      duration: 4.5,
      loop: false
    },
    {
      id: 'salute',
      name: 'Honor de Élite',
      icon: '🫡',
      category: 'Militar',
      desc: 'Firmeza militar perfecta, mirada al frente y saludo marcial a la visera.',
      rarity: 'comun',
      duration: 3.2,
      loop: false
    },
    {
      id: 'laugh',
      name: 'Risa Burlona',
      icon: '🤣',
      category: 'Provocación',
      desc: 'Risa incontenible apuntando con el arma al rival para intimidar al enemigo.',
      rarity: 'raro',
      duration: 4.0,
      loop: false
    },
    {
      id: 'legendary',
      name: 'Aura de Superhéroe',
      icon: '⚡',
      category: 'Legendario',
      desc: 'Levitación mística, despliegue de brazos y caída en 3 puntos con explosión dorada.',
      rarity: 'legendario',
      duration: 5.0,
      loop: false
    }
  ],

  lastCharacterGroup: null,

  trigger(emoteId) {
    const emote = this.list.find(e => e.id === emoteId);
    if (!emote) return;

    // Reset any previous character pose before launching a new emote
    if (this.lastCharacterGroup && this.lastCharacterGroup.userData) {
      this.resetPose(this.lastCharacterGroup.userData, this.lastCharacterGroup);
    }
    if (TrashGame.Main && TrashGame.Main.characterGroup && TrashGame.Main.characterGroup.userData) {
      this.resetPose(TrashGame.Main.characterGroup.userData, TrashGame.Main.characterGroup);
    }

    this.activeEmote = emote.id;
    this.startTime = performance.now() / 1000;
    this.duration = emote.duration;
    this.loop = emote.loop;

    // Sonidos y feedback de UI
    if (TrashGame.Sound) {
      if (emoteId === 'legendary' || emoteId === 'dance') {
        TrashGame.Sound.playFanfare();
      } else if (emoteId === 'kungfu' || emoteId === 'flex') {
        TrashGame.Sound.playVacuumPop();
      } else {
        TrashGame.Sound.playEquip();
      }
    }

    // VFX de confeti si es legendario o baile
    if (typeof confetti === 'function' && (emote.rarity === 'legendario' || emoteId === 'dance')) {
      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.65 },
        colors: ['#00ff88', '#06b6d4', '#f59e0b', '#ffffff']
      });
    }

    // Banner flotante sobre el personaje
    this.showEmoteBadge(emote);
  },

  stop(targetGroup) {
    this.activeEmote = null;
    const badge = document.getElementById('emote-active-badge');
    if (badge) badge.classList.add('opacity-0');

    // Reset all characters immediately so limbs never stay frozen mid-pose
    const groups = [];
    if (targetGroup) groups.push(targetGroup);
    if (this.lastCharacterGroup && !groups.includes(this.lastCharacterGroup)) groups.push(this.lastCharacterGroup);
    if (TrashGame.Main && TrashGame.Main.characterGroup && !groups.includes(TrashGame.Main.characterGroup)) {
      groups.push(TrashGame.Main.characterGroup);
    }
    if (TrashGame.InventoryPreview && TrashGame.InventoryPreview.characterGroup && !groups.includes(TrashGame.InventoryPreview.characterGroup)) {
      groups.push(TrashGame.InventoryPreview.characterGroup);
    }

    groups.forEach(g => {
      if (g && g.userData) {
        this.resetPose(g.userData, g);
      }
    });
  },

  showEmoteBadge(emote) {
    let badge = document.getElementById('emote-active-badge');
    if (!badge) {
      badge = document.createElement('div');
      badge.id = 'emote-active-badge';
      badge.className = 'fixed top-24 left-1/2 -translate-x-1/2 pointer-events-none z-30 flex items-center gap-2.5 px-5 py-2 rounded-2xl border transition-all duration-300';
      document.body.appendChild(badge);
    }

    badge.className = `fixed top-24 left-1/2 -translate-x-1/2 pointer-events-none z-30 flex items-center gap-2.5 px-5 py-2 rounded-2xl border transition-all duration-300 bg-slate-950/85 backdrop-blur-md shadow-2xl scale-110 opacity-100 ${
      emote.rarity === 'legendario' ? 'border-amber-400 text-amber-300 shadow-amber-500/30' :
      emote.rarity === 'epico' ? 'border-purple-400 text-purple-300 shadow-purple-500/30' :
      'border-eco-400 text-eco-300 shadow-eco-500/30'
    }`;

    badge.innerHTML = `
      <span class="text-2xl animate-bounce">${emote.icon}</span>
      <div>
        <div class="text-[10px] uppercase font-black tracking-widest text-slate-400">${emote.category}</div>
        <div class="text-sm font-black font-display tracking-wide">${emote.name}</div>
      </div>
    `;

    setTimeout(() => {
      badge.classList.remove('scale-110');
    }, 200);

    clearTimeout(this._badgeTimer);
    this._badgeTimer = setTimeout(() => {
      badge.classList.add('opacity-0');
    }, 3200);
  },

  update(characterGroup, time, dt) {
    if (!characterGroup || !characterGroup.userData) return false;
    this.lastCharacterGroup = characterGroup;

    if (!this.activeEmote || !characterGroup.userData.leftArm) return false;

    const u = characterGroup.userData;
    const elapsed = time - this.startTime;

    // Verificar si expiró el emote no loopeable
    if (!this.loop && elapsed > this.duration) {
      this.resetPose(u, characterGroup);
      this.activeEmote = null;
      return false;
    }

    const t = elapsed;
    const isInv = characterGroup.userData && characterGroup.userData.isInventoryPreview;
    const baseZ = isInv ? 0 : -0.75;
    const baseY = isInv ? 0 : -0.15;

    switch (this.activeEmote) {

      // ── 1. DANZA FREE FIRE ─────────────────────────────────────────────
      case 'dance': {
        const beat = t * 7.5;
        // Rebote rítmico vertical
        characterGroup.position.y = baseY + Math.abs(Math.sin(beat)) * 0.08;
        characterGroup.position.z = baseZ;

        // Balanceo de torso y caderas
        u.torso.rotation.z = Math.sin(beat * 0.5) * 0.14;
        u.torso.rotation.y = Math.cos(beat * 0.5) * 0.18;
        u.torso.rotation.x = Math.sin(beat) * 0.06;

        // Cabeza con ritmo
        u.headGroup.rotation.y = -Math.cos(beat * 0.5) * 0.22;
        u.headGroup.rotation.z = Math.sin(beat * 0.5) * 0.12;

        // Brazo izquierdo: bombeo y flexión
        u.leftArm.rotation.x = -1.1 + Math.sin(beat) * 0.65;
        u.leftArm.rotation.z = 0.5 + Math.cos(beat) * 0.35;
        u.leftArm.rotation.y = Math.sin(beat * 0.5) * 0.4;

        // Brazo derecho: groove con arma
        u.rightArm.rotation.x = -0.7 + Math.cos(beat) * 0.65;
        u.rightArm.rotation.z = -0.45 + Math.sin(beat) * 0.35;
        u.rightArm.rotation.y = -Math.sin(beat * 0.5) * 0.4;

        // Piernas con paso rítmico
        u.leftLeg.rotation.x = Math.sin(beat) * 0.4;
        u.rightLeg.rotation.x = -Math.sin(beat) * 0.4;
        u.leftLeg.rotation.z = Math.sin(beat * 0.5) * 0.1;
        u.rightLeg.rotation.z = -Math.sin(beat * 0.5) * 0.1;
        break;
      }

      // ── 2. PATADA DRAGÓN KUNG-FU ───────────────────────────────────────
      case 'kungfu': {
        if (t < 0.8) {
          // Fase 1: Enfoque y agachada previa
          const p = t / 0.8;
          characterGroup.position.y = baseY - 0.12 * Math.sin(p * Math.PI);
          u.torso.rotation.x = 0.2 * p;
          u.torso.rotation.y = -0.4 * p;
          u.leftArm.rotation.x = -1.4 * p;
          u.rightArm.rotation.x = 0.4 * p;
          u.rightLeg.rotation.x = 0.3 * p;
        } else if (t < 2.0) {
          // Fase 2: Salto acrobático y patada giratoria
          const p = (t - 0.8) / 1.2;
          const jumpCurve = Math.sin(p * Math.PI);
          characterGroup.position.y = baseY + jumpCurve * 0.55; // ¡Vuela en el aire!

          // Giro de cuerpo
          u.torso.rotation.y = -0.4 + p * Math.PI * 2;
          // Pierna derecha extendida en patada alta
          u.rightLeg.rotation.x = -1.6 * jumpCurve;
          u.rightLeg.rotation.z = -0.6 * jumpCurve;
          // Pierna izquierda doblada recogida
          u.leftLeg.rotation.x = 0.7 * jumpCurve;

          // Brazos en guardia ninja
          u.leftArm.rotation.x = -1.6;
          u.leftArm.rotation.z = 0.8;
          u.rightArm.rotation.x = 0.5;
        } else {
          // Fase 3: Aterrizaje en pose ninja
          const p = Math.min(1, (t - 2.0) / 1.5);
          characterGroup.position.y = baseY - 0.08 * (1 - p);
          u.torso.rotation.y = THREE.MathUtils.lerp(0.3, 0, p);
          u.torso.rotation.x = THREE.MathUtils.lerp(0.35, 0, p);
          u.rightLeg.rotation.x = THREE.MathUtils.lerp(0.4, 0, p);
          u.rightLeg.rotation.z = 0;
          u.leftLeg.rotation.x = THREE.MathUtils.lerp(-0.3, 0, p);
          u.leftArm.rotation.x = THREE.MathUtils.lerp(-1.2, 0, p);
          u.rightArm.rotation.x = THREE.MathUtils.lerp(-0.5, 0, p);
        }
        break;
      }

      // ── 3. PODER DE TITÁN (FLEX) ───────────────────────────────────────
      case 'flex': {
        if (t < 1.0) {
          // Agachada de concentración
          const p = t / 1.0;
          characterGroup.position.y = baseY - 0.09 * p;
          u.torso.rotation.x = 0.25 * p;
          u.leftArm.rotation.x = -0.5 * p;
          u.rightArm.rotation.x = -0.5 * p;
        } else if (t < 3.2) {
          // Explosión de flexión de bíceps
          const p = Math.min(1, (t - 1.0) / 0.3);
          const shake = Math.sin(t * 35) * 0.015; // Temblores de pura fuerza
          characterGroup.position.y = baseY + 0.03 + shake;

          // Pecho inflado y cabeza orgullosa
          u.torso.scale.set(1.12, 1.08, 1.15);
          u.torso.rotation.x = -0.15;
          u.headGroup.rotation.x = -0.22;

          // Doble flexión de brazos hacia arriba
          u.leftArm.rotation.x = -1.65;
          u.leftArm.rotation.z = 1.35;
          u.leftArm.rotation.y = 0.3;

          u.rightArm.rotation.x = -1.65;
          u.rightArm.rotation.z = -1.35;
          u.rightArm.rotation.y = -0.3;

          // Piernas abiertas firmes
          u.leftLeg.rotation.z = 0.16;
          u.rightLeg.rotation.z = -0.16;
        } else {
          // Relajación gradual
          const p = (t - 3.2) / 1.3;
          u.torso.scale.set(1, 1, 1);
          u.torso.rotation.x = THREE.MathUtils.lerp(-0.15, 0, p);
          u.headGroup.rotation.x = THREE.MathUtils.lerp(-0.22, 0, p);
          u.leftArm.rotation.z = THREE.MathUtils.lerp(1.35, 0, p);
          u.rightArm.rotation.z = THREE.MathUtils.lerp(-1.35, 0, p);
          u.leftArm.rotation.x = THREE.MathUtils.lerp(-1.65, 0, p);
          u.rightArm.rotation.x = THREE.MathUtils.lerp(-1.65, 0, p);
          u.leftLeg.rotation.z = THREE.MathUtils.lerp(0.16, 0, p);
          u.rightLeg.rotation.z = THREE.MathUtils.lerp(-0.16, 0, p);
          characterGroup.position.y = baseY;
        }
        break;
      }

      // ── 4. SALUDO DE ÉLITE MILITAR ─────────────────────────────────────
      case 'salute': {
        characterGroup.position.y = baseY;
        characterGroup.position.z = baseZ;

        if (t < 0.6) {
          // Chasquido firme de atención y mano al casco
          const p = t / 0.6;
          u.leftLeg.rotation.set(0, 0, 0);
          u.rightLeg.rotation.set(0, 0, 0);
          u.torso.rotation.set(0, 0, 0);

          // Brazo izquierdo recto pegado al muslo
          u.leftArm.rotation.x = 0;
          u.leftArm.rotation.z = 0.12;

          // Brazo derecho sube a la sien
          u.rightArm.rotation.x = -2.6 * p;
          u.rightArm.rotation.z = -0.9 * p;
          u.rightArm.rotation.y = 0.55 * p;
          u.headGroup.rotation.x = 0.1 * p;
        } else if (t < 2.5) {
          // Mantiene la pose marcial perfecta
          u.leftLeg.rotation.set(0, 0, 0);
          u.rightLeg.rotation.set(0, 0, 0);
          u.leftArm.rotation.set(0, 0, 0.12);
          u.rightArm.rotation.set(-2.6, 0.55, -0.9);
          u.headGroup.rotation.set(0.1, 0, 0);
          u.torso.rotation.set(0, 0, 0);
        } else {
          // Baja el brazo con disciplina militar
          const p = (t - 2.5) / 0.7;
          u.rightArm.rotation.x = THREE.MathUtils.lerp(-2.6, 0, p);
          u.rightArm.rotation.z = THREE.MathUtils.lerp(-0.9, 0, p);
          u.rightArm.rotation.y = THREE.MathUtils.lerp(0.55, 0, p);
          u.headGroup.rotation.x = THREE.MathUtils.lerp(0.1, 0, p);
          u.leftArm.rotation.z = THREE.MathUtils.lerp(0.12, 0, p);
        }
        break;
      }

      // ── 5. RISA BURLONA (TAUNT LOL) ───────────────────────────────────
      case 'laugh': {
        const laughRate = t * 16;
        const bounce = Math.sin(laughRate) * 0.08;

        characterGroup.position.y = baseY + Math.abs(bounce) * 0.04;
        u.torso.rotation.x = 0.22 + bounce * 0.6;
        u.headGroup.rotation.x = bounce;
        u.headGroup.rotation.y = Math.sin(t * 4) * 0.15;

        // Brazo izquierdo sostiene la barriga de la risa
        u.leftArm.rotation.x = -1.1;
        u.leftArm.rotation.z = 0.65 + bounce * 0.3;

        // Brazo derecho señala al espectador
        u.rightArm.rotation.x = -1.55;
        u.rightArm.rotation.z = -0.25;
        u.rightArm.rotation.y = Math.sin(t * 6) * 0.15;

        u.leftLeg.rotation.x = 0.08;
        u.rightLeg.rotation.x = -0.08;
        break;
      }

      // ── 6. AURA LEGENDARIA DE SUPERHÉROE ───────────────────────────────
      case 'legendary': {
        if (t < 2.2) {
          // Fase 1: Levitación mística con brazos abiertos
          const p = t / 2.2;
          const floatY = Math.sin(p * Math.PI * 0.5) * 0.42;
          characterGroup.position.y = baseY + floatY;

          // Despliegue imperial de brazos
          u.leftArm.rotation.x = 0;
          u.leftArm.rotation.z = 1.45 * p;
          u.rightArm.rotation.x = 0;
          u.rightArm.rotation.z = -1.45 * p;

          // Piernas estiradas apuntando hacia abajo
          u.leftLeg.rotation.x = 0.2 * p;
          u.rightLeg.rotation.x = 0.2 * p;
          u.torso.rotation.x = -0.25 * p;
          u.headGroup.rotation.x = -0.3 * p; // Mirando al cielo
        } else if (t < 2.8) {
          // Fase 2: Caída en picada rápida hacia el suelo
          const p = (t - 2.2) / 0.6;
          characterGroup.position.y = THREE.MathUtils.lerp(baseY + 0.42, baseY - 0.1, p);
          u.leftArm.rotation.z = THREE.MathUtils.lerp(1.45, 0.4, p);
          u.rightArm.rotation.z = THREE.MathUtils.lerp(-1.45, -0.4, p);
          u.torso.rotation.x = THREE.MathUtils.lerp(-0.25, 0.4, p);
        } else if (t < 4.2) {
          // Fase 3: Superhero 3-point landing en el suelo (puño en tierra)
          characterGroup.position.y = baseY - 0.1;

          u.torso.rotation.x = 0.5;
          u.headGroup.rotation.x = -0.45; // Cabeza levantada mirando al frente
          u.headGroup.rotation.y = 0;

          // Brazo derecho: puño contra el suelo
          u.rightArm.rotation.x = -0.7;
          u.rightArm.rotation.z = -0.3;

          // Brazo izquierdo: hacia atrás en equilibrio
          u.leftArm.rotation.x = 0.8;
          u.leftArm.rotation.z = 0.6;

          // Pierna derecha hincada
          u.rightLeg.rotation.x = -0.7;
          u.leftLeg.rotation.x = 0.5;
        } else {
          // Fase 4: Incorporación triunfal
          const p = (t - 4.2) / 0.8;
          characterGroup.position.y = THREE.MathUtils.lerp(baseY - 0.1, baseY, p);
          u.torso.rotation.x = THREE.MathUtils.lerp(0.5, 0, p);
          u.headGroup.rotation.x = THREE.MathUtils.lerp(-0.45, 0, p);
          u.rightArm.rotation.x = THREE.MathUtils.lerp(-0.7, 0, p);
          u.rightArm.rotation.z = THREE.MathUtils.lerp(-0.3, 0, p);
          u.leftArm.rotation.x = THREE.MathUtils.lerp(0.8, 0, p);
          u.leftArm.rotation.z = THREE.MathUtils.lerp(0.6, 0, p);
          u.rightLeg.rotation.x = THREE.MathUtils.lerp(-0.7, 0, p);
          u.leftLeg.rotation.x = THREE.MathUtils.lerp(0.5, 0, p);
        }
        break;
      }
    }

    return true;
  },

  resetPose(u, characterGroup) {
    if (!u) return;
    if (characterGroup) {
      const isInv = characterGroup.userData && characterGroup.userData.isInventoryPreview;
      if (isInv) {
        characterGroup.position.set(0, 0, 0);
      } else {
        characterGroup.position.set(0, -0.15, -0.75);
      }
      characterGroup.rotation.x = 0;
      characterGroup.rotation.z = 0;
    }
    if (u.torso) {
      u.torso.rotation.set(0, 0, 0);
      u.torso.scale.set(1, 1, 1);
    }
    if (u.headGroup) u.headGroup.rotation.set(0, 0, 0);
    if (u.leftArm) u.leftArm.rotation.set(0, 0, 0);
    if (u.rightArm) u.rightArm.rotation.set(0, 0, 0);
    if (u.leftLeg) u.leftLeg.rotation.set(0, 0, 0);
    if (u.rightLeg) u.rightLeg.rotation.set(0, 0, 0);
  }
};
