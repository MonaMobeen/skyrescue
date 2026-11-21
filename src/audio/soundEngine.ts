class ArcadeSoundEngine {
  private ctx: AudioContext | null = null;
  private enabled = true;

  setEnabled(value: boolean) {
    this.enabled = value;
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  private getContext(): AudioContext | null {
    if (!this.enabled || typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return null;
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  unlock() {
    this.getContext();
  }

  private tone(
    freq: number,
    duration: number,
    type: OscillatorType = 'sine',
    volume = 0.08,
    delay = 0,
    endFreq?: number
  ) {
    const ctx = this.getContext();
    if (!ctx) return;

    const now = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);
    if (endFreq !== undefined) {
      osc.frequency.exponentialRampToValueAtTime(Math.max(40, endFreq), now + duration);
    }

    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(volume, now + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + duration + 0.02);
  }

  playPickup() {
    this.tone(587.33, 0.09, 'triangle', 0.09, 0);
    this.tone(880, 0.14, 'triangle', 0.09, 0.06);
  }

  playRepair() {
    this.tone(523.25, 0.09, 'sine', 0.09, 0);
    this.tone(659.25, 0.09, 'sine', 0.09, 0.07);
    this.tone(1046.5, 0.18, 'sine', 0.1, 0.14);
  }

  playBoost() {
    this.tone(180, 0.18, 'sawtooth', 0.04, 0, 420);
  }

  playHit() {
    this.tone(170, 0.16, 'sawtooth', 0.11, 0, 55);
    this.tone(110, 0.22, 'square', 0.06, 0.03, 45);
  }

  playRadio() {
    this.tone(960, 0.05, 'sine', 0.05, 0);
    this.tone(1280, 0.06, 'sine', 0.05, 0.06);
  }

  playTakeoff() {
    this.tone(392, 0.1, 'triangle', 0.08, 0);
    this.tone(523.25, 0.1, 'triangle', 0.08, 0.08);
    this.tone(659.25, 0.16, 'triangle', 0.09, 0.16);
  }

  playVictory() {
    this.tone(523.25, 0.12, 'triangle', 0.09, 0);
    this.tone(659.25, 0.12, 'triangle', 0.09, 0.1);
    this.tone(783.99, 0.12, 'triangle', 0.09, 0.2);
    this.tone(1046.5, 0.32, 'triangle', 0.11, 0.3);
  }

  playGameOver() {
    this.tone(392, 0.18, 'sawtooth', 0.07, 0, 340);
    this.tone(329.63, 0.2, 'sawtooth', 0.07, 0.18, 280);
    this.tone(246.94, 0.36, 'sawtooth', 0.07, 0.38, 170);
  }
}

export const soundEngine = new ArcadeSoundEngine();
