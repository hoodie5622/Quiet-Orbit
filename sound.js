/* Quiet Orbit: original ambient sound, generated locally with Web Audio. */
(() => {
  'use strict';
  // Warm, open harmonies with slow swells rather than a melody to follow.
  const profiles = [
    { frequencies: [130.81,196,261.63,293.66], levels: [.027,.017,.011,.005], wind:.028, low:460, high:65, tone:1000, notes:[329.63,293.66,392,261.63], interval:11, bloom:.024, attack:2.8, release:13, overtone:.04 },
    { frequencies: [146.83,220,293.66,369.99], levels: [.021,.016,.009,.004], wind:.075, low:680, high:100, tone:1200, notes:[329.63,440,369.99], interval:12, bloom:.018, attack:3, release:13, overtone:.03 },
    { frequencies: [130.81,174.61,220,261.63], levels: [.025,.021,.013,.006], wind:.022, low:420, high:50, tone:850, notes:[349.23,329.63,261.63], interval:10, bloom:.024, attack:2.6, release:12, overtone:.035 },
    { frequencies: [98,130.81,196,261.63], levels: [.025,.021,.012,.005], wind:.038, low:230, high:35, tone:700, notes:[196,261.63,293.66], interval:14, bloom:.019, attack:3, release:14, overtone:.02 },
    { frequencies: [110,146.83,196,246.94], levels: [.021,.021,.013,.007], wind:.03, low:520, high:90, tone:1000, notes:[293.66,329.63,392,329.63], interval:9, bloom:.022, attack:2.5, release:12, overtone:.04 },
    { frequencies: [123.47,164.81,246.94,293.66], levels: [.022,.018,.012,.006], wind:.025, low:560, high:110, tone:1100, notes:[329.63,369.99,293.66], interval:11, bloom:.021, attack:2.8, release:13, overtone:.055 },
    { frequencies: [146.83,220,277.18,329.63], levels: [.019,.015,.009,.005], wind:.06, low:850, high:150, tone:1250, notes:[440,369.99,329.63], interval:13, bloom:.017, attack:3, release:14, overtone:.025 },
    { frequencies: [130.81,164.81,196,261.63], levels: [.026,.021,.015,.007], wind:.028, low:390, high:55, tone:900, notes:[329.63,392], interval:10.5, bloom:.023, attack:2.7, release:12, overtone:.03 }
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
      limiter.threshold.value = -20;
      limiter.knee.value = 20;
      limiter.ratio.value = 3;
      limiter.attack.value = .03;
      limiter.release.value = .7;
      this.master.connect(limiter).connect(ctx.destination);

      this.tone = this.node(ctx.createBiquadFilter());
      this.tone.type = 'lowpass';
      this.tone.frequency.value = profiles[0].tone;
      this.tone.Q.value = .5;
      const dry = this.node(ctx.createGain());
      dry.gain.value = .82;
      this.tone.connect(dry).connect(this.master);

      // One quiet stereo room gives every voice a soft tail, with no feedback loop.
      const reverb = this.node(ctx.createConvolver());
      const impulse = ctx.createBuffer(2, Math.floor(ctx.sampleRate * 4.8), ctx.sampleRate);
      for (let channel = 0; channel < impulse.numberOfChannels; channel++) {
        const samples = impulse.getChannelData(channel);
        let smooth = 0;
        for (let i = 0; i < samples.length; i++) {
          smooth += .1 * (Math.random() * 2 - 1 - smooth);
          samples[i] = smooth * Math.min(1, i / (ctx.sampleRate * .025)) * (1 - i / samples.length) ** 2.8;
        }
      }
      reverb.buffer = impulse;
      const wet = this.node(ctx.createGain());
      wet.gain.value = .46;
      this.tone.connect(reverb).connect(wet).connect(this.master);

      const breaths = [.017,.023,.031].map(frequency => {
        const lfo = this.source(ctx.createOscillator());
        lfo.frequency.value = frequency;
        return lfo;
      });
      // Fixed pitches crossfade in level. Rapid world changes cannot create pitch slides.
      const pitches = [...new Set(profiles.flatMap(profile => profile.frequencies))];
      this.drones = pitches.map((frequency, i) => {
        const oscillator = this.source(ctx.createOscillator());
        oscillator.type = 'sine';
        oscillator.frequency.value = frequency;
        const gain = this.node(ctx.createGain());
        gain.gain.value = 0;
        const pan = this.node(ctx.createStereoPanner());
        pan.pan.value = [-.38,.32,-.16,.2][i % 4];
        oscillator.connect(gain).connect(pan).connect(this.tone);
        const depth = this.node(ctx.createGain());
        depth.gain.value = 0;
        breaths[i % breaths.length].connect(depth).connect(gain.gain);
        return { frequency, oscillator, gain, depth };
      });

      const noise = ctx.createBuffer(2, ctx.sampleRate * 6, ctx.sampleRate);
      for (let channel = 0; channel < noise.numberOfChannels; channel++) {
        const samples = noise.getChannelData(channel);
        let smooth = 0;
        for (let i = 0; i < samples.length; i++) {
          smooth += .045 * (Math.random() * 2 - 1 - smooth);
          const edge = Math.min(1, i / (ctx.sampleRate * .2), (samples.length - 1 - i) / (ctx.sampleRate * .2));
          samples[i] = smooth * edge;
        }
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
      windSource.connect(this.windHigh).connect(this.windLow).connect(this.windGain).connect(this.tone);

      this.blooms = Array.from({ length: 3 }, (_, i) => {
        const envelope = this.node(ctx.createGain());
        envelope.gain.value = 0;
        const pan = this.node(ctx.createStereoPanner());
        pan.pan.value = [-.45,0,.45][i];
        envelope.connect(pan).connect(this.tone);
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
      this.drones.forEach(voice => {
        const i = profile.frequencies.indexOf(voice.frequency);
        const level = i < 0 ? 0 : profile.levels[i];
        ramp(voice.gain.gain, level, now);
        ramp(voice.depth.gain, level * .16, now);
      });
      ramp(this.tone.frequency, profile.tone, now);
      ramp(this.windGain.gain, profile.wind, now);
      ramp(this.windLow.frequency, profile.low, now);
      ramp(this.windHigh.frequency, profile.high, now);
      this.blooms.forEach(voice => ramp(voice.envelope.gain, 0, now, 2.8));
      this.noteIndex = 0;
      this.nextNote = now + 3.6;
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
        ramp(this.master.gain, this.volume, this.ctx.currentTime, this.timer ? .4 : 1.8);
        if (!this.timer) {
          this.nextNote = this.ctx.currentTime + 3.6;
          this.timer = setInterval(() => this.tick(), 200);
        }
      } else {
        clearInterval(this.timer);
        this.timer = null;
        ramp(this.master.gain, 0, this.ctx.currentTime, .75);
        if (this.ctx.state !== 'suspended' && this.ctx.state !== 'closed') {
          this.suspendTimer = setTimeout(() => {
            this.suspendTimer = null;
            if (!this.active && !this.destroyed) {
              void this.ctx.suspend().then(() => {
                if (this.active) return this.syncActivity();
              }).catch(() => {});
            }
          }, 850);
        }
      }
    }

    tick() {
      if (!this.active || this.ctx.state !== 'running') return;
      const now = this.ctx.currentTime;
      if (now < this.nextNote) return;
      const profile = profiles[this.sceneIndex];
      const voice = this.blooms[this.slotIndex++ % this.blooms.length];
      const frequency = profile.notes[this.noteIndex++ % profile.notes.length];
      const start = now + .04;
      // Three fixed voices leave enough time for a whole swell before reuse.
      ramp(voice.envelope.gain, 0, now, .03);
      voice.fundamental.frequency.setValueAtTime(frequency, start);
      voice.harmonic.frequency.setValueAtTime(frequency * 2.002, start);
      voice.harmonicGain.gain.setValueAtTime(profile.overtone, start);
      voice.envelope.gain.setValueAtTime(0, start);
      voice.envelope.gain.linearRampToValueAtTime(profile.bloom, start + profile.attack);
      voice.envelope.gain.exponentialRampToValueAtTime(.0001, start + profile.attack + profile.release);
      voice.envelope.gain.linearRampToValueAtTime(0, start + profile.attack + profile.release + .2);
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
