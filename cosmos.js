/* Quiet Orbit — a small, entirely procedural universe. No network assets. */
(() => {
  'use strict';

  const TAU = Math.PI * 2;
  const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
  const lerp = (a, b, t) => a + (b - a) * t;
  const ease = t => t * t * (3 - 2 * t);
  const palettes = [
    { base: [4, 6, 20], low: [55, 48, 128], high: [159, 94, 184], light: [167, 195, 246], seed: 18, tilt: -.43 },
    { base: [3, 11, 19], low: [15, 76, 91], high: [71, 158, 154], light: [170, 235, 225], seed: 73, tilt: -.26 },
    { base: [13, 5, 18], low: [85, 28, 81], high: [185, 93, 126], light: [255, 205, 203], seed: 137, tilt: .28 },
    { base: [11, 8, 15], low: [83, 46, 45], high: [183, 115, 68], light: [255, 212, 153], seed: 224, tilt: -.15 },
    { base: [3, 8, 23], low: [16, 47, 108], high: [70, 115, 182], light: [177, 216, 255], seed: 311, tilt: -.64 }
  ];

  function random(seed) {
    return () => {
      seed |= 0;
      seed = seed + 0x6D2B79F5 | 0;
      let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }

  function canvasOf(w, h) {
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    return c;
  }

  // Precomputed value-noise grids keep cloud generation inexpensive even on phones.
  function noiseGrid(size, rng) {
    const values = new Float32Array((size + 1) * (size + 1));
    for (let i = 0; i < values.length; i++) values[i] = rng();
    return { values, size, stride: size + 1 };
  }

  function noise(grid, u, v) {
    const x = clamp(u, 0, .99999) * grid.size;
    const y = clamp(v, 0, .99999) * grid.size;
    const ix = x | 0, iy = y | 0;
    const a = ease(x - ix), b = ease(y - iy);
    const i = iy * grid.stride + ix, d = grid.values;
    return lerp(lerp(d[i], d[i + 1], a), lerp(d[i + grid.stride], d[i + grid.stride + 1], a), b);
  }

  function makeNebula(index) {
    const p = palettes[index], rng = random(p.seed);
    const w = 960, h = 640;
    const c = canvasOf(w, h), ctx = c.getContext('2d');
    const data = ctx.createImageData(w, h), pixels = data.data;
    const grids = [4, 8, 16, 32, 64, 128].map(size => noiseGrid(size, rng));
    const weights = [.44, .25, .15, .085, .05, .025];

    for (let y = 0; y < h; y++) {
      const v = y / h;
      for (let x = 0; x < w; x++) {
        const u = x / w;
        let f = 0;
        for (let n = 0; n < grids.length; n++) f += noise(grids[n], u, v) * weights[n];
        const warp = noise(grids[1], u, v);
        const ribbon = v - (.53 + p.tilt * (u - .5) + (warp - .5) * .38);
        const band = Math.exp(-ribbon * ribbon * 17);
        const rightCloud = Math.exp(-((u - .7) ** 2 * 5 + (v - .38) ** 2 * 3));
        const islands = Math.max(0, f - .29) * 2.3;
        const density = clamp(islands * band * (.38 + rightCloud * .8), 0, 1);
        const wisps = Math.max(0, noise(grids[3], u, v) - .42) * density;
        const hot = clamp((f - .49) * 3.2 + wisps * .8, 0, 1);
        const darkLane = 1 - clamp((noise(grids[2], u, v) - .53) * 3.4, 0, .8);
        const opacity = density * darkLane;
        const grain = (rng() - .5) * 2.2;
        const i = (y * w + x) * 4;
        for (let k = 0; k < 3; k++) {
          const cloud = lerp(p.low[k], p.high[k], hot);
          pixels[i + k] = clamp(p.base[k] + cloud * opacity * .96 + grain, 0, 255);
        }
        pixels[i + 3] = 255;
      }
    }
    ctx.putImageData(data, 0, 0);

    // Small luminous clouds on top of textured dust give the depth of a telescope view.
    ctx.globalCompositeOperation = 'screen';
    for (let n = 0; n < 16; n++) {
      const x = (rng() * .8 + .14) * w;
      const y = (.53 + p.tilt * (x / w - .5) + (rng() - .5) * .31) * h;
      const r = 35 + rng() * 120;
      const g = ctx.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(0, `rgba(${p.high.join(',')},${.025 + rng() * .055})`);
      g.addColorStop(.35, `rgba(${p.low.join(',')},.035)`);
      g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g;
      ctx.fillRect(x - r, y - r, r * 2, r * 2);
    }
    ctx.globalCompositeOperation = 'source-over';

    if (index === 3) {
      const x = w * .73, y = h * .45, r = h * .18;
      let glow = ctx.createRadialGradient(x, y, r * .86, x, y, r * 1.8);
      glow.addColorStop(0, 'rgba(255,205,132,0)');
      glow.addColorStop(.15, 'rgba(255,198,124,.46)');
      glow.addColorStop(.24, 'rgba(224,135,80,.16)');
      glow.addColorStop(1, 'rgba(190,95,50,0)');
      ctx.fillStyle = glow;
      ctx.fillRect(x - r * 2, y - r * 2, r * 4, r * 4);
      const planet = ctx.createRadialGradient(x + r * .33, y - r * .35, 0, x, y, r);
      planet.addColorStop(0, '#161420');
      planet.addColorStop(.75, '#090b14');
      planet.addColorStop(.97, '#0b0b12');
      planet.addColorStop(1, '#e0b37c');
      ctx.fillStyle = planet;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, TAU);
      ctx.fill();
    }
    return c;
  }

  class CosmosEngine {
    constructor(canvas, { onSceneChange } = {}) {
      this.canvas = canvas;
      this.ctx = canvas.getContext('2d', { alpha: false });
      this.onSceneChange = onSceneChange;
      this.sceneIndex = 0;
      this.paused = false;
      this.reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      this.destroyed = false;
      this.time = 0;
      this.rotation = 0;
      this.pointer = { x: 0, y: 0, targetX: 0, targetY: 0, active: false };
      this.lastInteraction = performance.now();
      this.sceneDuration = 50000;
      this.lastFrame = 0;
      this.lastDraw = 0;
      this.raf = 0;
      this.transition = 1;
      this.textures = new Map();
      this.background = this.getTexture(0);
      this.oldBackground = null;
      this.meteors = [];
      this.bursts = [];
      this.nextMeteor = 6;
      this.rng = random(9817);
      this.stars = [];
      this.glows = [];
      this.listeners = [];
      this.frame = this.frame.bind(this);
      this.resize = this.resize.bind(this);
      this.listen(window, 'resize', this.resize, { passive: true });
      this.listen(window, 'pointermove', event => {
        this.pointer.targetX = event.clientX / this.width * 2 - 1;
        this.pointer.targetY = event.clientY / this.height * 2 - 1;
        this.pointer.active = true;
        this.lastInteraction = performance.now();
      }, { passive: true });
      this.listen(document, 'pointerleave', () => {
        this.pointer.targetX = this.pointer.targetY = 0;
        this.pointer.active = false;
      });
      this.listen(document, 'visibilitychange', () => {
        this.lastFrame = 0;
        this.lastInteraction = performance.now();
        if (document.hidden) this.cancelFrame();
        else this.requestFrame();
      });
      this.resize();
      this.requestFrame();
    }

    listen(target, event, handler, options) {
      target.addEventListener(event, handler, options);
      this.listeners.push(() => target.removeEventListener(event, handler, options));
    }

    getTexture(index) {
      if (!this.textures.has(index)) this.textures.set(index, makeNebula(index));
      return this.textures.get(index);
    }

    resize() {
      const bounds = this.canvas.getBoundingClientRect();
      this.width = Math.max(1, bounds.width || innerWidth);
      this.height = Math.max(1, bounds.height || innerHeight);
      this.dpr = Math.min(window.devicePixelRatio || 1, 1.75);
      this.canvas.width = Math.round(this.width * this.dpr);
      this.canvas.height = Math.round(this.height * this.dpr);
      this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
      this.span = Math.hypot(this.width, this.height) * 1.24;
      const visibleCount = clamp(this.width * this.height / 850, 650, 1800);
      const count = Math.round(visibleCount * this.span * this.span / (this.width * this.height));
      this.stars.length = 0;
      this.glows.length = 0;
      for (let i = 0; i < count; i++) {
        const depth = this.rng();
        this.stars.push({
          x: (this.rng() - .5) * this.span,
          y: (this.rng() - .5) * this.span,
          radius: .3 + depth * depth * 1.15,
          depth,
          phase: this.rng() * TAU,
          rate: .45 + this.rng() * 1.2,
          alpha: .18 + this.rng() * .61,
          warm: this.rng() > .84,
          driftX: 0,
          driftY: 0
        });
      }
      for (let i = 0; i < 13; i++) {
        this.glows.push({
          x: (this.rng() - .5) * this.width * 1.4,
          y: (this.rng() - .5) * this.height * 1.5,
          size: 4 + this.rng() * 9,
          phase: this.rng() * TAU
        });
      }
      this.draw();
    }

    setScene(index) {
      if (this.destroyed) return;
      index = ((Math.trunc(Number(index) || 0) % palettes.length) + palettes.length) % palettes.length;
      this.lastInteraction = performance.now();
      if (index === this.sceneIndex) return;
      if (this.transition < 1 && this.oldBackground) {
        const snapshot = canvasOf(this.background.width, this.background.height);
        const context = snapshot.getContext('2d');
        context.drawImage(this.oldBackground, 0, 0, snapshot.width, snapshot.height);
        context.globalAlpha = ease(this.transition);
        context.drawImage(this.background, 0, 0, snapshot.width, snapshot.height);
        this.oldBackground = snapshot;
      } else {
        this.oldBackground = this.background;
      }
      this.background = this.getTexture(index);
      this.sceneIndex = index;
      this.transition = this.reducedMotion || this.paused ? 1 : 0;
      this.meteors.length = 0;
      this.onSceneChange?.(index);
      this.draw();
      this.requestFrame();
    }

    setPaused(value) {
      this.paused = Boolean(value);
      this.lastFrame = 0;
      this.lastInteraction = performance.now();
      if (this.paused) this.cancelFrame();
      else this.requestFrame();
      this.draw();
    }

    setReducedMotion(value) {
      this.reducedMotion = Boolean(value);
      if (this.reducedMotion) {
        this.transition = 1;
        this.meteors.length = 0;
        this.bursts.length = 0;
      }
      this.draw();
    }

    burst(x, y) {
      this.lastInteraction = performance.now();
      if (this.reducedMotion || this.paused || this.destroyed) return;
      this.bursts.push({ x, y, age: 0, seed: this.rng() * TAU });
      if (this.bursts.length > 5) this.bursts.shift();
    }

    requestFrame() {
      if (!this.raf && !this.paused && !this.destroyed && !document.hidden) this.raf = requestAnimationFrame(this.frame);
    }

    cancelFrame() {
      if (this.raf) cancelAnimationFrame(this.raf);
      this.raf = 0;
    }

    frame(now) {
      this.raf = 0;
      if (this.destroyed || this.paused || document.hidden) return;
      const dt = this.lastFrame ? Math.min((now - this.lastFrame) / 1000, .05) : 1 / 60;
      this.lastFrame = now;
      this.time += dt;
      this.transition = Math.min(1, this.transition + dt / 3.5);
      const smoothing = 1 - Math.exp(-dt * 2.4);
      this.pointer.x = lerp(this.pointer.x, this.pointer.targetX, smoothing);
      this.pointer.y = lerp(this.pointer.y, this.pointer.targetY, smoothing);
      if (!this.reducedMotion) {
        const idle = now - this.lastInteraction > 3500;
        this.rotation += dt * (idle ? .0022 : .0005);
        if (now - this.lastInteraction > this.sceneDuration && this.transition === 1) this.setScene(this.sceneIndex + 1);
        if (this.time > this.nextMeteor) {
          this.meteors.push({
            x: this.width * (.25 + this.rng() * .7),
            y: this.height * this.rng() * .48,
            age: 0,
            length: 65 + this.rng() * 75,
            speed: 150 + this.rng() * 70
          });
          this.nextMeteor = this.time + 10 + this.rng() * 15;
        }
      }
      for (let i = this.meteors.length - 1; i >= 0; i--) {
        this.meteors[i].age += dt;
        if (this.meteors[i].age > 1.7) this.meteors.splice(i, 1);
      }
      for (let i = this.bursts.length - 1; i >= 0; i--) {
        this.bursts[i].age += dt;
        if (this.bursts[i].age > 2.7) this.bursts.splice(i, 1);
      }
      // Reduced-motion mode preserves a quiet, very slow shimmer without camera movement.
      if (!this.reducedMotion || now - this.lastDraw > 70) {
        this.draw();
        this.lastDraw = now;
      }
      this.requestFrame();
    }

    drawBackground(texture, alpha) {
      if (!texture || alpha <= 0) return;
      const ctx = this.ctx, w = this.width, h = this.height;
      const cover = Math.max(w / texture.width, h / texture.height) * 1.22;
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.translate(w * .5, h * .5);
      if (!this.reducedMotion) {
        ctx.translate(-this.pointer.x * 9, -this.pointer.y * 7);
        ctx.rotate(Math.sin(this.rotation * .24) * .08);
      }
      ctx.drawImage(texture, -texture.width * cover / 2, -texture.height * cover / 2, texture.width * cover, texture.height * cover);
      ctx.restore();
    }

    draw() {
      if (this.destroyed || !this.ctx) return;
      const ctx = this.ctx, w = this.width, h = this.height;
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';
      ctx.fillStyle = '#040713';
      ctx.fillRect(0, 0, w, h);
      if (this.transition < 1 && this.oldBackground) this.drawBackground(this.oldBackground, 1);
      this.drawBackground(this.background, ease(this.transition));
      const motion = this.reducedMotion ? 0 : 1;
      const angle = this.rotation * motion;
      const cos = Math.cos(angle), sin = Math.sin(angle);
      const px = this.pointer.x * motion, py = this.pointer.y * motion;
      const mouseX = (this.pointer.x + 1) * w / 2, mouseY = (this.pointer.y + 1) * h / 2;
      const starTint = palettes[this.sceneIndex].light;
      const tint = `rgb(${starTint.join(',')})`;

      for (let i = 0; i < this.stars.length; i++) {
        const s = this.stars[i];
        let x = s.x * cos - s.y * sin + w / 2 - px * (5 + s.depth * 23);
        let y = s.x * sin + s.y * cos + h / 2 - py * (4 + s.depth * 17);
        if (x < -15 || x > w + 15 || y < -15 || y > h + 15) continue;
        if (this.pointer.active && motion) {
          const dx = mouseX - x, dy = mouseY - y, distance = dx * dx + dy * dy;
          if (distance < 40000) {
            const pull = (1 - distance / 40000) * .065 * s.depth;
            x += dx * pull;
            y += dy * pull;
          }
        }
        const twinkle = .75 + Math.sin(this.time * s.rate + s.phase) * .25;
        ctx.globalAlpha = s.alpha * twinkle;
        ctx.fillStyle = s.warm ? '#f4d9c9' : tint;
        ctx.beginPath();
        ctx.arc(x, y, s.radius, 0, TAU);
        ctx.fill();
      }

      ctx.globalCompositeOperation = 'screen';
      for (let i = 0; i < this.glows.length; i++) {
        const s = this.glows[i];
        const x = s.x * cos - s.y * sin + w / 2 - px * 27;
        const y = s.x * sin + s.y * cos + h / 2 - py * 20;
        if (x < -20 || x > w + 20 || y < -20 || y > h + 20) continue;
        const shimmer = .65 + Math.sin(this.time * .72 + s.phase) * .25;
        ctx.globalAlpha = shimmer;
        const g = ctx.createRadialGradient(x, y, 0, x, y, s.size);
        g.addColorStop(0, 'rgba(232,240,255,.9)');
        g.addColorStop(.1, `rgba(${starTint.join(',')},.45)`);
        g.addColorStop(.36, `rgba(${starTint.join(',')},.08)`);
        g.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = g;
        ctx.fillRect(x - s.size, y - s.size, s.size * 2, s.size * 2);
        if (i % 4 === 0) {
          ctx.strokeStyle = `rgba(${starTint.join(',')},.21)`;
          ctx.lineWidth = .5;
          ctx.beginPath();
          ctx.moveTo(x - s.size * .7, y); ctx.lineTo(x + s.size * .7, y);
          ctx.moveTo(x, y - s.size * .7); ctx.lineTo(x, y + s.size * .7);
          ctx.stroke();
        }
      }

      for (const meteor of this.meteors) {
        const a = Math.sin(meteor.age / 1.7 * Math.PI) * .65;
        const x = meteor.x - meteor.age * meteor.speed;
        const y = meteor.y + meteor.age * meteor.speed * .45;
        ctx.globalAlpha = a;
        const trail = ctx.createLinearGradient(x, y, x + meteor.length, y - meteor.length * .45);
        trail.addColorStop(0, 'rgba(229,239,255,.9)');
        trail.addColorStop(1, 'rgba(170,199,255,0)');
        ctx.strokeStyle = trail;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(x, y); ctx.lineTo(x + meteor.length, y - meteor.length * .45);
        ctx.stroke();
      }

      for (const burst of this.bursts) {
        const progress = burst.age / 2.7;
        ctx.globalAlpha = (1 - progress) ** 2 * .7;
        ctx.fillStyle = '#dbe7ff';
        for (let i = 0; i < 22; i++) {
          const a = i / 22 * TAU + burst.seed;
          const distance = 12 + Math.sqrt(progress) * (36 + Math.sin(i * 5.7) * 16);
          const x = burst.x + Math.cos(a) * distance;
          const y = burst.y + Math.sin(a) * distance;
          ctx.beginPath();
          ctx.arc(x, y, .5 + (1 - progress) * .55, 0, TAU);
          ctx.fill();
        }
      }
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';
      // A gentle edge falloff leaves the center luminous and the UI legible.
      const vignette = ctx.createRadialGradient(w * .5, h * .44, h * .15, w * .5, h * .5, Math.max(w, h) * .7);
      vignette.addColorStop(0, 'rgba(1,3,12,0)');
      vignette.addColorStop(.65, 'rgba(1,3,12,.12)');
      vignette.addColorStop(1, 'rgba(1,3,12,.65)');
      ctx.fillStyle = vignette;
      ctx.fillRect(0, 0, w, h);
    }

    destroy() {
      this.destroyed = true;
      this.cancelFrame();
      this.listeners.forEach(remove => remove());
      this.listeners.length = 0;
      this.textures.clear();
      this.stars.length = this.glows.length = this.meteors.length = this.bursts.length = 0;
    }
  }

  window.CosmosEngine = CosmosEngine;
})();
