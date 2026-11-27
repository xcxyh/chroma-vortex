(() => {
  class Foley {
    constructor(enabled) {
      this.enabled = enabled;
      this.last = -1;
      this.strokeDistance = 0;
    }
    getContext() {
      const Audio = window.AudioContext || window.webkitAudioContext;
      if (!this.context && Audio) {
        try { this.context = new Audio(); } catch (error) { return null; }
      }
      return this.context;
    }
    unlock() {
      if (!this.enabled) return;
      const ac = this.getContext();
      if (!ac) return;
      try {
        if (!this.master) this.connect(ac);
        if (ac.state === "suspended") ac.resume().catch(() => {});
      } catch (error) {}
    }
    connect(ac) {
      const master = ac.createGain();
      const limiter = ac.createDynamicsCompressor();
      master.gain.value = 0.59;
      limiter.threshold.value = -12;
      limiter.ratio.value = 5;
      master.connect(limiter).connect(ac.destination);
      const buffer = ac.createBuffer(1, ac.sampleRate * 2, ac.sampleRate);
      const samples = buffer.getChannelData(0);
      let brown = 0;
      for (let i = 0; i < samples.length; i++) {
        const white = Math.random() * 2 - 1;
        brown = 0.87 * brown + 0.13 * white;
        samples[i] = white * 0.45 + brown;
      }
      const loop = ac.createBufferSource();
      loop.buffer = buffer;
      loop.loop = true;
      const filter = ac.createBiquadFilter();
      filter.type = "bandpass";
      filter.frequency.value = 360;
      filter.Q.value = 1.7;
      const drag = ac.createGain();
      drag.gain.value = 0;
      loop.connect(filter).connect(drag).connect(master);
      loop.start();
      Object.assign(this, { context: ac, master, buffer, filter, drag });
    }
    setEnabled(enabled) {
      this.enabled = enabled;
      if (enabled) this.unlock();
      if (this.master) this.master.gain.setTargetAtTime(enabled ? 0.59 : 0, this.context.currentTime, 0.018);
      if (!enabled) this.stop();
    }
    tone(from, to, delay, duration, gain, type = "sine") {
      if (!this.enabled || !this.master) return;
      const ac = this.context;
      const t = ac.currentTime + delay;
      const oscillator = ac.createOscillator();
      const env = ac.createGain();
      oscillator.type = type;
      oscillator.frequency.setValueAtTime(from, t);
      oscillator.frequency.exponentialRampToValueAtTime(to, t + duration * 0.88);
      env.gain.setValueAtTime(1e-4, t);
      env.gain.exponentialRampToValueAtTime(gain, t + 7e-3);
      env.gain.exponentialRampToValueAtTime(1e-4, t + duration);
      oscillator.connect(env).connect(this.master);
      oscillator.start(t);
      oscillator.stop(t + duration);
    }
    noise(freq, delay, duration, gain) {
      if (!this.enabled || !this.master) return;
      const ac = this.context;
      const t = ac.currentTime + delay;
      const source = ac.createBufferSource();
      source.buffer = this.buffer;
      const filter = ac.createBiquadFilter();
      filter.type = "lowpass";
      filter.frequency.value = freq;
      const env = ac.createGain();
      env.gain.setValueAtTime(1e-4, t);
      env.gain.exponentialRampToValueAtTime(gain, t + 4e-3);
      env.gain.exponentialRampToValueAtTime(1e-4, t + duration);
      source.connect(filter).connect(env).connect(this.master);
      source.start(t, 0.3, duration);
    }
    pull() {
      this.strokeDistance = 0;
      this.tone(260, 86, 0, 0.13, 0.28);
      this.tone(750, 300, 0.019, 0.095, 0.08, "triangle");
      this.noise(1180, 7e-3, 0.14, 0.18);
    }
    stir(speed, progress, distance) {
      if (!this.enabled || !this.drag || this.context.state !== "running") return;
      const t = this.context.currentTime;
      const intensity = Math.min(1, speed);
      this.filter.frequency.setTargetAtTime(215 + intensity * 780 + progress * 195, t, 0.033);
      this.drag.gain.cancelScheduledValues(t);
      this.drag.gain.setTargetAtTime(0.16 + intensity * 0.42, t, 0.019);
      this.drag.gain.setTargetAtTime(0, t + 0.055, 0.042);
      this.strokeDistance += distance;
      if (this.strokeDistance > 0.26 && t - this.last > 0.1 && intensity > 0.12) {
        this.strokeDistance = 0;
        this.last = t;
        this.tone(310 + progress * 200 + intensity * 92, 121 + progress * 89, 0, 0.095, 0.08 + intensity * 0.09);
        this.noise(720 + intensity * 780, 0.018, 0.09, 0.075 + intensity * 0.11);
      }
    }
    ready() {
      this.tone(655, 672, 0, 0.13, 0.12, "triangle");
      this.tone(991, 984, 0.037, 0.16, 0.095);
    }
    stop() {
      if (!this.drag) return;
      const t = this.context.currentTime;
      this.drag.gain.cancelScheduledValues(t);
      this.drag.gain.setTargetAtTime(0, t, 0.027);
    }
    stamp(verdict) {
      this.stop();
      this.tone(190, 57, 0.033, 0.18, 0.47);
      this.noise(1610, 0.037, 0.14, 0.46);
      this.tone(620, 205, 0.052, 0.13, 0.16, "triangle");
      if (verdict === "good") {
        this.tone(523, 523, 0.105, 0.22, 0.15, "triangle");
        this.tone(784, 784, 0.158, 0.25, 0.15, "triangle");
      } else {
        const late = verdict === "late";
        this.tone(late ? 370 : 422, late ? 107 : 231, 0.118, 0.3, 0.23, "triangle");
        this.tone(late ? 226 : 197, late ? 95 : 133, 0.16, 0.36, 0.15);
      }
    }
    reset() {
      this.tone(270, 440, 0, 0.095, 0.1);
    }
  }
  window.StirFoley = Foley;
})();
