/* =========================================================================
   TRASH MAN 3D - CANVAS ROULETTE WHEEL ENGINE
   ========================================================================= */

window.TrashGame = window.TrashGame || {};

TrashGame.Roulette = {
  prizes: [
    { text: '200 Monedas', type: 'coins', value: 200, icon: '🪙', color: '#10b981', dark: '#047857' },
    { text: 'Casco Bio', type: 'item', id: 'helmet_cyber', icon: '🪖', color: '#06b6d4', dark: '#0891b2' },
    { text: '500 Monedas', type: 'coins', value: 500, icon: '🪙', color: '#3b82f6', dark: '#1d4ed8' },
    { text: 'Dron Mascota', type: 'pet', id: 'drone_bee', icon: '🐝', color: '#a855f7', dark: '#7e22ce' },
    { text: '1000 Monedas', type: 'coins', value: 1000, icon: '💰', color: '#f59e0b', dark: '#b45309' },
    { text: 'Escoba Láser', type: 'item', id: 'broom_laser', icon: '🧹', color: '#ec4899', dark: '#be185d' },
    { text: '200 Monedas', type: 'coins', value: 200, icon: '🪙', color: '#22c55e', dark: '#15803d' },
    { text: 'Corona Dorada', type: 'item', id: 'crown_leaf', icon: '👑', color: '#eab308', dark: '#a16207' },
  ],
  currentAngle: 0,
  isSpinning: false,

  draw() {
    const canvas = document.getElementById('wheel-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const num = this.prizes.length;
    const arc = (2 * Math.PI) / num;
    const radius = canvas.width / 2;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save();
    ctx.translate(radius, radius);
    ctx.rotate(this.currentAngle);

    for (let i = 0; i < num; i++) {
      const angle = i * arc;
      const prize = this.prizes[i];

      // Slice background
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.arc(0, 0, radius - 6, angle, angle + arc);
      ctx.closePath();

      const grad = ctx.createRadialGradient(0, 0, 30, 0, 0, radius);
      grad.addColorStop(0, prize.color);
      grad.addColorStop(1, prize.dark);
      ctx.fillStyle = grad;
      ctx.fill();

      ctx.strokeStyle = '#0f172a';
      ctx.lineWidth = 4;
      ctx.stroke();

      // Text label
      ctx.save();
      ctx.rotate(angle + arc / 2);
      ctx.textAlign = 'right';
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 16px Outfit, sans-serif';
      ctx.shadowColor = 'rgba(0,0,0,0.8)';
      ctx.shadowBlur = 6;
      ctx.fillText(`${prize.icon} ${prize.text}`, radius - 24, 6);
      ctx.restore();
    }
    ctx.restore();
  },

  spin() {
    if (this.isSpinning) return;

    if (TrashGame.State.coins < 100) {
      TrashGame.UI.showToast('¡Necesitas al menos 100 🪙 para girar!', 'error');
      return;
    }

    TrashGame.State.addCoins(-100);
    this.isSpinning = true;
    TrashGame.Sound.playClick();

    const spinBtn = document.getElementById('btn-spin-wheel');
    if (spinBtn) {
      spinBtn.disabled = true;
      spinBtn.classList.add('opacity-50', 'cursor-not-allowed');
    }

    const selectedIdx = Math.floor(Math.random() * this.prizes.length);
    const arc = (2 * Math.PI) / this.prizes.length;
    const extraRotations = 5 + Math.floor(Math.random() * 3);
    const targetSlice = selectedIdx * arc + arc / 2;
    const desiredFinal = (1.5 * Math.PI - targetSlice + 2 * Math.PI) % (2 * Math.PI);
    const currentMod = this.currentAngle % (2 * Math.PI);
    const totalSpin = extraRotations * 2 * Math.PI + ((desiredFinal - currentMod + 2 * Math.PI) % (2 * Math.PI));

    const duration = 4800;
    const startTime = performance.now();
    const startAngle = this.currentAngle;
    let lastTick = -1;

    const step = (now) => {
      const progress = Math.min((now - startTime) / duration, 1);
      const easeOut = 1 - Math.pow(1 - progress, 3);
      this.currentAngle = startAngle + totalSpin * easeOut;

      const currentSlice = Math.floor(((1.5 * Math.PI - this.currentAngle) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI) / arc);
      if (currentSlice !== lastTick) {
        lastTick = currentSlice;
        TrashGame.Sound.playWheelTick(500 + (1 - progress) * 250);
      }

      this.draw();

      if (progress < 1) {
        requestAnimationFrame(step);
      } else {
        this.isSpinning = false;
        if (spinBtn) {
          spinBtn.disabled = false;
          spinBtn.classList.remove('opacity-50', 'cursor-not-allowed');
        }
        this.grantReward(this.prizes[selectedIdx]);
      }
    };

    requestAnimationFrame(step);
  },

  grantReward(prize) {
    TrashGame.Sound.playFanfare();
    if (typeof confetti === 'function') confetti({ particleCount: 110, spread: 75 });

    if (prize.type === 'coins') {
      TrashGame.State.addCoins(prize.value);
      TrashGame.UI.showToast(`🎉 ¡Ganaste ${prize.value} Monedas en la Ruleta!`, 'success');
    } else if (prize.type === 'item') {
      const item = TrashGame.Items.find(i => i.id === prize.id);
      TrashGame.UI.showToast(`✨ ¡Ganaste el objeto: "${item ? item.name : prize.text}"!`, 'success');
      TrashGame.UI.equipItem(item.category, item.id);
    } else if (prize.type === 'pet') {
      TrashGame.UI.showToast(`🐾 ¡Ganaste la mascota: "${prize.text}"!`, 'success');
      TrashGame.UI.equipPet(prize.id);
    }
  }
};
