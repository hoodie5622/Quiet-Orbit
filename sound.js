/* Quiet Orbit: original ambient sound, generated locally with Web Audio. */
(() => {
  'use strict';
  // Each landscape has its own harmony, noise colour, register and note rhythm.
  const profiles = [
    { frequencies: [65.41, 98, 130.81, 196], levels: [.075, .045, .025, .008], wind: .025, low: 420, high: 30, notes: [392, 523.25, 587.33, 783.99], interval: 6, bell: .018, decay: 4.5, overtone: .1 },
    { frequencies: [110, 164.81, 220, 329.63], levels: [.025, .02, .012, .004], wind: .17, low: 1800, high: 420, notes: [880, 1108.73, 1318.51], interval: 4.1, bell: .024, decay: 3.4, overtone: .3 },
    { frequencies: [130.81, 164.81, 196, 261.63], levels: [.04, .025, .025, .004], wind: .014, low: 650, high: 70, notes: [261.63, 329.63, 392, 523.25, 392, 329.63], interval: 2.4, bell: .095, decay: 2.2, overtone: .14 },
    { frequencies: [43.65, 65.41, 87.31, 130.81], levels: [.1, .055, .022, .018], wind: .13, low: 180, high: 25, notes: [174.61, 130.81], interval: 9.5, bell: .028, decay: 6, overtone: .04 },
    { frequencies: [73.42, 110, 146.83, 220], levels: [.055, .032, .02, .005], wind: .025, low: 900, high: 110, notes: [293.66, 440, 587.33, 659.25, 587.33, 440, 329.63, 440], interval: 1.35, bell: .065, decay: 2.3, overtone: .24 },
    { frequencies: [82.41, 123.47, 164.81, 246.94], levels: [.035, .026, .016, .002], wind: .018, low: 1200, high: 300, notes: [659.25, 987.77, 830.61, 1318.51, 987.77], interval: 3.1, bell: .075, decay: 4, overtone: .48 },
    { frequencies: [146.83, 220, 293.66, 440], levels: [.018, .014, .012, .002], wind: .115, low: 3600, high: 1400, notes: [1174.66, 1760, 1567.98, 2349.32], interval: 4.7, bell: .04, decay: 3.6, overtone: .42 },
    { frequencies: [98, 146.83, 196, 246.94], levels: [.065, .035, .027, .014], wind: .035, low: 700, high: 40, notes: [392, 493.88, 587.33, 493.88], interval: 3.7, bell: .06, decay: 3.2, overtone: .08 }
  ];

  function ramp(param, value, now, duration = 2.8) {
    if (param.cancelAndHoldAtTime) param.cancelAndHoldAtTime(now);
    else {
      const current = param.value;
      param.cancelScheduledValues(now);
      param.setValueAtTime(current, now);
    }
    param.linearRampToValueAtTime(value, now + duration);
  }

  class CosmicSound {
    constructor() {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) throw new Error('Web Audio is unavailable');
      this.ctx = new AudioContext();
      this.enabled = false;
      this.visible = !document.hidden;
      this.volume = .35;
      this.sceneIndex = 0;
      this.destroyed = false;
      this.revision = 0;
      this.timer = null;
      this.suspendTimer = null;
      this.nodes = [];
      this.sources = [];
      this.noteIndex = 0;
      this.nextNote = 0;
      this.slotIndex = 0;
      const ctx = this.ctx;
      this.master = this.node(ctx.createGain());
      this.master.gain.value = 0;
      const limiter = this.node(ctx.createDynamicsCompressor());
      limiter.threshold.value = -18;
      limiter.knee.value = 20;
      limiter.ratio.value = 4;
      limiter.attack.value = .03;
      limiter.release.value = .7;
      this.master.connect(limiter).connect(ctx.destination);

      // A fixed graph morphs between worlds; scene changes never add voices.
      this.drones = Array.from({ length: 4 }, (_, i) => {
        const oscillator = this.source(ctx.createOscillator());
        oscillator.type = i === 3 ? 'triangle' : 'sine';
        const gain = this.node(ctx.createGain());
        gain.gain.value = 0;
        oscillator.connect(gain).connect(this.master);
        const lfo = this.source(ctx.createOscillator());
        lfo.frequency.value = .035 + i * .013;
        const depth = this.node(ctx.createGain());
        depth.gain.value = 0;
        lfo.connect(depth).connect(gain.gain);
        return { oscillator, gain, depth };
      });

      const noise = ctx.createBuffer(2, ctx.sampleRate * 4, ctx.sampleRate);
      for (let channel = 0; channel < noise.numberOfChannels; channel++) {
        const samples = noise.getChannelData(channel);
        for (let i = 0; i < samples.length; i++) samples[i] = Math.random() * 2 - 1;
      }
      const windSource = this.source(ctx.createBufferSource());
      windSource.buffer = noise;
      windSource.loop = true;
      this.windHigh = this.node(ctx.createBiquadFilter());
      this.windHigh.type = 'highpass';
      this.windHigh.Q.value = .5;
      this.windLow = this.node(ctx.createBiquadFilter());
      this.windLow.type = 'lowpass';
      this.windLow.Q.value = .5;
      this.windGain = this.node(ctx.createGain());
      this.windGain.gain.value = 0;
      windSource.connect(this.windHigh).connect(this.windLow).connect(this.windGain).connect(this.master);

      this.bellGain = this.node(ctx.createGain());
      this.bellGain.gain.value = 1;
      this.bellGain.connect(this.master);
      this.bells = Array.from({ length: 3 }, () => {
        const envelope = this.node(ctx.createGain());
        envelope.gain.value = 0;
        envelope.connect(this.bellGain);
        const fundamental = this.source(ctx.createOscillator());
        const harmonic = this.source(ctx.createOscillator());
        const harmonicGain = this.node(ctx.createGain());
        harmonicGain.gain.value = 0;
        fundamental.connect(envelope);
        harmonic.connect(harmonicGain).connect(envelope);
        return { fundamental, harmonic, harmonicGain, envelope };
      });
      this.setScene(0);
      this.sources.forEach(source => source.start());
    }

    node(node) { this.nodes.push(node); return node; }
    source(node) { this.sources.push(node); return this.node(node); }
    get active() { return this.enabled && this.visible && this.volume > 0 && !this.destroyed; }

    setScene(index) {
      if (this.destroyed) return;
      index = Number(index);
      this.sceneIndex = Number.isFinite(index) ? ((Math.trunc(index) % profiles.length) + profiles.length) % profiles.length : 0;
      const profile = profiles[this.sceneIndex], now = this.ctx.currentTime;
      this.drones.forEach((voice, i) => {
        ramp(voice.oscillator.frequency, profile.frequencies[i], now);
        ramp(voice.gain.gain, profile.levels[i], now);
        ramp(voice.depth.gain, profile.levels[i] * .12, now);
      });
      ramp(this.windGain.gain, profile.wind, now);
      ramp(this.windLow.frequency, profile.low, now);
      ramp(this.windHigh.frequency, profile.high, now);
      this.bells.forEach(voice => ramp(voice.envelope.gain, 0, now, 2));
      this.noteIndex = 0;
      this.nextNote = now + 2.1;
    }

    setVolume(value) {
      if (this.destroyed) return;
      value = Number(value);
      if (!Number.isFinite(value)) return;
      this.volume = Math.max(0, Math.min(1, value));
      void this.syncActivity().catch(() => {});
    }

    async setEnabled(value) {
      if (this.destroyed) return;
      this.enabled = Boolean(value);
      await this.syncActivity();
    }

    setVisible(value) {
      if (this.destroyed) return;
      this.visible = Boolean(value);
      void this.syncActivity().catch(() => {});
    }

    async syncActivity() {
      const revision = ++this.revision;
      clearTimeout(this.suspendTimer);
      this.suspendTimer = null;
      if (this.active) {
        if (this.ctx.state !== 'running') await this.ctx.resume();
        if (revision !== this.revision || !this.active) {
          if (!this.active && this.ctx.state === 'running') await this.ctx.suspend();
          return;
        }
        ramp(this.master.gain, this.volume, this.ctx.currentTime, .4);
        if (!this.timer) {
          this.nextNote = this.ctx.currentTime + 1;
          this.timer = setInterval(() => this.tick(), 200);
        }
      } else {
        clearInterval(this.timer);
        this.timer = null;
        ramp(this.master.gain, 0, this.ctx.currentTime, .3);
        if (this.ctx.state !== 'suspended' && this.ctx.state !== 'closed') {
          this.suspendTimer = setTimeout(() => {
            this.suspendTimer = null;
            if (!this.active && !this.destroyed) {
              void this.ctx.suspend().then(() => {
                if (this.active) return this.syncActivity();
              }).catch(() => {});
            }
          }, 400);
        }
      }
    }

    tick() {
      if (!this.active || this.ctx.state !== 'running') return;
      const now = this.ctx.currentTime;
      if (now < this.nextNote) return;
      const profile = profiles[this.sceneIndex];
      const voice = this.bells[this.slotIndex++ % this.bells.length];
      const frequency = profile.notes[this.noteIndex++ % profile.notes.length];
      const start = now + .04;
      // Fade a reused voice before retuning, including after a quick scene change.
      ramp(voice.envelope.gain, 0, now, .03);
      voice.fundamental.frequency.setValueAtTime(frequency, start);
      voice.harmonic.frequency.setValueAtTime(frequency * 2.004, start);
      voice.harmonicGain.gain.setValueAtTime(profile.overtone, start);
      voice.envelope.gain.setValueAtTime(0, start);
      voice.envelope.gain.linearRampToValueAtTime(profile.bell, start + .09);
      voice.envelope.gain.exponentialRampToValueAtTime(.0001, start + profile.decay);
      voice.envelope.gain.linearRampToValueAtTime(0, start + profile.decay + .1);
      this.nextNote = now + profile.interval;
    }

    destroy() {
      if (this.destroyed) return;
      this.destroyed = true;
      this.revision++;
      clearInterval(this.timer);
      clearTimeout(this.suspendTimer);
      this.timer = this.suspendTimer = null;
      this.sources.forEach(source => source.stop());
      this.nodes.forEach(node => node.disconnect());
      this.nodes.length = this.sources.length = 0;
      void this.ctx.close().catch(() => {});
    }
  }
  window.CosmicSound = CosmicSound;
})();
