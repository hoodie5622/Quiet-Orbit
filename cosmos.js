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
    { base: [3, 8, 23], low: [16, 47, 108], high: [70, 115, 182], light: [177, 216, 255], seed: 311, tilt: -.64 },
    { base: [9, 6, 23], low: [51, 37, 92], high: [152, 128, 194], light: [221, 207, 255], seed: 419, tilt: .12 },
    { base: [2, 12, 24], low: [18, 71, 107], high: [105, 197, 222], light: [204, 246, 255], seed: 563, tilt: -.32 },
    { base: [16, 7, 14], low: [94, 39, 47], high: [197, 112, 73], light: [255, 221, 171], seed: 677, tilt: .22 }
  ];

  // Artistic, normalized stick figures, not a positional sky simulator.
  // Shape references: NASA Space Place's Star Finder (all eight patterns):
  // https://spaceplace.nasa.gov/review/starfinder/star_finder_jan.pdf
  // Orion's belt/hourglass: https://starchild.gsfc.nasa.gov/docs/StarChild/questions/question9.html
  // Gemini's paired heads: https://science.nasa.gov/solar-system/skywatching/night-sky-network/gemini-constellation/
  // Cassiopeia's W and Ursa Minor's dipper/Polaris:
  // https://spdf.gsfc.nasa.gov/pub/documents/archived_websites/pwg.gsfc.nasa.gov/stargaze/Spolaris.htm
  // Andromeda: https://science.nasa.gov/asset/hubble/andromeda-constellation/
  const constellations = [
    { aspect: .85, anchor: [.83, .34], mobileX: .59, // Orion
      points: [[.28,.17,1.5],[.72,.23,1.25],[.4,.49,1.05],[.5,.46,1.1],[.6,.43,1.05],[.3,.91,1.2],[.78,.86,1.55],[.49,.03,.8],[.07,.1,.75],[.04,.34,.7]],
      edges: [[0,7],[7,1],[0,2],[2,3],[3,4],[4,1],[2,5],[4,6],[5,6],[0,8],[8,9]] },
    { aspect: 1.15, anchor: [.18, .31], mobileX: .39, // Cygnus
      points: [[.48,.04,1.55],[.5,.4,1.3],[.59,.93,1.15],[.06,.53,1],[.29,.46,.9],[.74,.28,1],[.96,.16,.95]],
      edges: [[0,1],[1,2],[3,4],[4,1],[1,5],[5,6]] },
    { aspect: .85, anchor: [.83, .4], mobileX: .6, // Lyra
      points: [[.18,.06,1.75],[.56,.17,.8],[.36,.34,1],[.87,.46,1.1],[.72,.91,1.15],[.21,.78,1.05]],
      edges: [[0,1],[1,2],[2,0],[2,3],[3,4],[4,5],[5,2]] },
    { aspect: 1.5, anchor: [.18, .36], mobileX: .29, // Leo, opposite the eclipse
      points: [[.83,.18,1],[.66,.04,.85],[.5,.16,1.05],[.51,.37,.95],[.68,.53,1.05],[.66,.89,1.65],[.04,.72,1.2],[.25,.39,1.1]],
      edges: [[0,1],[1,2],[2,3],[3,4],[4,5],[5,6],[6,7],[7,3],[7,5]] },
    { aspect: 1.65, anchor: [.18, .4], mobileX: .41, // Andromeda
      points: [[.04,.88,1.3],[.29,.66,.85],[.55,.48,1.45],[.94,.18,1.4],[.55,.25,.9],[.46,.04,.75],[.29,.9,.75],[.57,.82,.8]],
      edges: [[0,1],[1,2],[2,3],[2,4],[4,5],[1,6],[6,7]] },
    { aspect: 1.9, anchor: [.18, .28], mobileX: .36, // Cassiopeia
      points: [[.02,.12,1.1],[.24,.85,1.35],[.5,.32,1.5],[.75,.79,1.15],[.98,.05,1.05]],
      edges: [[0,1],[1,2],[2,3],[3,4]] },
    { aspect: 1.5, anchor: [.83, .34], mobileX: .6, // Ursa Minor
      points: [[.02,.03,1.6],[.25,.18,.9],[.48,.28,.9],[.68,.42,1.1],[.93,.4,1.2],[.98,.82,1.4],[.71,.92,1.15]],
      edges: [[0,1],[1,2],[2,3],[3,4],[4,5],[5,6],[6,3]] },
    { aspect: 1.12, anchor: [.18, .36], mobileX: .4, // Gemini
      points: [[.25,.05,1.45],[.69,.1,1.65],[.28,.33,1.05],[.63,.39,1.1],[.2,.65,.9],[.56,.69,1.05],[.02,.92,1.05],[.38,.96,1.05],[.55,.94,.95],[.89,.87,1.1],[.05,.4,.8],[.9,.46,.85]],
      edges: [[0,2],[1,3],[2,3],[2,4],[3,5],[4,6],[4,7],[5,8],[5,9],[2,10],[3,11]] }
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
        let band = Math.exp(-ribbon * ribbon * 17);
        if (index === 2) band = .32 + .65 * Math.exp(-((u - .64) ** 2 * 4 + (v - .52) ** 2 * 7));
        if (index === 1 || index === 4 || index === 5 || index === 7) band *= .5;
        if (index === 6) band = .32 + .6 * Math.exp(-((u - .6) ** 2 * 5 + (v - .5) ** 2 * 8));
        const rightCloud = Math.exp(-((u - .7) ** 2 * 5 + (v - .38) ** 2 * 3));
        const islands = Math.max(0, f - .29) * 2.3;
        const density = clamp(islands * band * (.38 + rightCloud * .8), 0, 1);
        const wisps = Math.max(0, noise(grids[3], u, v) - .42) * density;
        const ice = index === 6 ? Math.pow(1 - Math.abs(noise(grids[2], u, v) * 2 - 1), 9) * .35 : 0;
        const hot = clamp((f - .49) * 3.2 + wisps * .8 + ice, 0, 1);
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

    if (index === 1) {
      // Thin vertical folds, rather than a recolored cloud, make an auroral curtain.
      ctx.globalCompositeOperation = 'screen';
      for (let n = 0; n < 260; n++) {
        const u = n / 259;
        const x = (u * .96 + .02) * w;
        const top = (.2 + Math.sin(u * 7.2) * .09 + Math.sin(u * 17) * .026) * h;
        const bottom = top + (.13 + Math.sin(u * 5.6 + .3) ** 2 * .32) * h;
        const bend = Math.sin(u * 9) * w * .045;
        const curtain = ctx.createLinearGradient(x, top, x, bottom);
        curtain.addColorStop(0, 'rgba(147,252,216,.28)');
        curtain.addColorStop(.22, 'rgba(55,214,169,.18)');
        curtain.addColorStop(.65, 'rgba(50,139,173,.07)');
        curtain.addColorStop(1, 'rgba(110,86,189,0)');
        ctx.strokeStyle = curtain;
        ctx.lineWidth = 2.8 + Math.sin(u * 61) * 1.7;
        ctx.beginPath();
        ctx.moveTo(x, top);
        ctx.bezierCurveTo(x - bend, top + 35, x + bend * .6, bottom - 45, x + bend, bottom);
        ctx.stroke();
      }
      ctx.globalCompositeOperation = 'source-over';
    }

    if (index === 2) {
      ctx.globalCompositeOperation = 'screen';
      for (let n = 0; n < 160; n++) {
        const a = rng() * TAU, radius = Math.sqrt(rng());
        const x = w * (.6 + Math.cos(a) * radius * .4);
        const y = h * (.52 + Math.sin(a) * radius * .29);
        ctx.globalAlpha = .08 + rng() * .2;
        ctx.fillStyle = rng() > .6 ? '#e9bea7' : '#cc86ab';
        ctx.beginPath(); ctx.arc(x, y, .4 + rng() * 1.5, 0, TAU); ctx.fill();
      }
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';
    }

    if (index === 3) {
      const x = w * .64, y = h * .47, r = h * .15;
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

    if (index === 4) {
      // Logarithmic arms, tilted into a luminous blue spiral galaxy.
      const puff = canvasOf(40, 40), pc = puff.getContext('2d');
      const pg = pc.createRadialGradient(20, 20, 0, 20, 20, 20);
      pg.addColorStop(0, 'rgba(178,217,255,.85)');
      pg.addColorStop(.25, 'rgba(92,153,231,.27)');
      pg.addColorStop(1, 'rgba(39,81,169,0)');
      pc.fillStyle = pg; pc.fillRect(0, 0, 40, 40);
      ctx.save();
      ctx.translate(w * .59, h * .5);
      ctx.rotate(-.32); ctx.scale(1, .6);
      ctx.globalCompositeOperation = 'screen';
      const radius = w * .35;
      for (let n = 0; n < 3000; n++) {
        const r = Math.sqrt(rng()) * radius;
        const arm = n % 3 / 3 * TAU;
        const angle = arm + Math.log(r / radius + .045) * 3.25 + (rng() - .5) * (.32 + r / radius * .2);
        const x = Math.cos(angle) * r, y = Math.sin(angle) * r;
        const size = 3 + rng() * 14;
        ctx.globalAlpha = (.05 + rng() * .23) * (1 - r / radius * .65);
        ctx.drawImage(puff, x - size, y - size, size * 2, size * 2);
      }
      ctx.globalAlpha = 1;
      const core = ctx.createRadialGradient(0, 0, 0, 0, 0, radius * .38);
      core.addColorStop(0, 'rgba(231,239,255,.92)');
      core.addColorStop(.13, 'rgba(185,210,255,.65)');
      core.addColorStop(.42, 'rgba(112,157,229,.19)');
      core.addColorStop(1, 'rgba(49,87,174,0)');
      ctx.fillStyle = core; ctx.fillRect(-radius, -radius, radius * 2, radius * 2);
      ctx.restore();
    }

    if (index === 5) {
      const x = w * .64, y = h * .48, r = h * .112;
      ctx.save(); ctx.translate(x, y); ctx.rotate(-.36);
      const haze = ctx.createRadialGradient(0, 0, r * .7, 0, 0, r * 3.2);
      haze.addColorStop(0, 'rgba(184,148,237,.13)'); haze.addColorStop(1, 'rgba(104,79,168,0)');
      ctx.fillStyle = haze; ctx.fillRect(-r * 3.3, -r * 3.3, r * 6.6, r * 6.6);
      for (let n = 0; n < 27; n++) {
        ctx.strokeStyle = `rgba(200,180,238,${.055 + Math.sin(n * 1.8) ** 2 * .15})`;
        ctx.lineWidth = 1.4;
        ctx.beginPath(); ctx.ellipse(0, 0, r * (1.52 + n * .025), r * (.42 + n * .008), 0, 0, TAU); ctx.stroke();
      }
      const planet = ctx.createRadialGradient(-r * .36, -r * .36, 0, 0, 0, r);
      planet.addColorStop(0, '#c7b0df'); planet.addColorStop(.34, '#8c78b2');
      planet.addColorStop(.7, '#403753'); planet.addColorStop(1, '#111222');
      ctx.fillStyle = planet; ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU); ctx.fill();
      ctx.save(); ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU); ctx.clip();
      ctx.strokeStyle = 'rgba(228,207,245,.12)'; ctx.lineWidth = 4;
      for (let n = -4; n < 5; n++) {
        ctx.beginPath(); ctx.ellipse(0, n * r * .21, r * 1.15, r * .24, 0, 0, Math.PI); ctx.stroke();
      }
      ctx.restore();
      for (let n = 0; n < 27; n++) {
        ctx.strokeStyle = `rgba(221,202,249,${.08 + Math.sin(n * 1.8) ** 2 * .18})`;
        ctx.lineWidth = 1.4;
        ctx.beginPath(); ctx.ellipse(0, 0, r * (1.52 + n * .025), r * (.42 + n * .008), 0, 0, Math.PI); ctx.stroke();
      }
      ctx.restore();
    }

    if (index === 6) {
      // Translucent facets sit within ridged ice-blue clouds.
      ctx.globalCompositeOperation = 'screen';
      for (let n = 0; n < 34; n++) {
        const x = w * (.22 + rng() * .74), y = h * (.15 + rng() * .7);
        const radius = 16 + rng() * 58;
        ctx.save(); ctx.translate(x, y); ctx.rotate(-.5 + rng() * .8);
        ctx.beginPath(); ctx.moveTo(0, -radius);
        ctx.lineTo(radius * .35, -radius * .25); ctx.lineTo(radius * .27, radius * .62);
        ctx.lineTo(0, radius); ctx.lineTo(-radius * .3, radius * .2); ctx.lineTo(-radius * .25, -radius * .55); ctx.closePath();
        const crystal = ctx.createLinearGradient(-radius, -radius, radius, radius);
        crystal.addColorStop(0, 'rgba(175,244,255,.1)'); crystal.addColorStop(.48, 'rgba(94,180,224,.015)');
        crystal.addColorStop(.52, 'rgba(192,247,255,.11)'); crystal.addColorStop(1, 'rgba(67,138,195,.01)');
        ctx.fillStyle = crystal; ctx.fill();
        ctx.strokeStyle = 'rgba(180,233,255,.12)'; ctx.lineWidth = .65; ctx.stroke();
        ctx.beginPath(); ctx.moveTo(0, -radius); ctx.lineTo(0, radius); ctx.stroke();
        ctx.restore();
      }
      ctx.globalCompositeOperation = 'source-over';
    }

    if (index === 7) {
      ctx.globalCompositeOperation = 'screen';
      [[w * .56, h * .52, 15, [255,204,140]], [w * .69, h * .61, 10, [255,165,116]]].forEach(([x, y, radius, color]) => {
        const halo = ctx.createRadialGradient(x, y, 0, x, y, radius * 12);
        halo.addColorStop(0, 'rgba(255,247,217,.95)');
        halo.addColorStop(.055, `rgba(${color.join(',')},.95)`);
        halo.addColorStop(.13, `rgba(${color.join(',')},.32)`);
        halo.addColorStop(.4, `rgba(${color.join(',')},.075)`);
        halo.addColorStop(1, 'rgba(154,65,52,0)');
        ctx.fillStyle = halo; ctx.fillRect(x - radius * 12, y - radius * 12, radius * 24, radius * 24);
        ctx.fillStyle = '#fff1cf'; ctx.beginPath(); ctx.arc(x, y, radius * .3, 0, TAU); ctx.fill();
        ctx.strokeStyle = `rgba(${color.join(',')},.22)`; ctx.lineWidth = .65;
        ctx.beginPath(); ctx.moveTo(x - radius * 4, y); ctx.lineTo(x + radius * 4, y); ctx.stroke();
      });
      ctx.globalCompositeOperation = 'source-over';
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
      this.constellationFrom = new Float32Array(palettes.length);
      this.constellationFrom[0] = 1;
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
      const blend = ease(this.transition);
      for (let i = 0; i < this.constellationFrom.length; i++) {
        this.constellationFrom[i] = this.constellationFrom[i] * (1 - blend) + (i === this.sceneIndex ? blend : 0);
      }
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
      const focusX = w <= 700 ? .62 : .5;
      ctx.drawImage(texture, -texture.width * cover * focusX, -texture.height * cover / 2, texture.width * cover, texture.height * cover);
      ctx.restore();
    }

    drawConstellations() {
      const ctx = this.ctx, w = this.width, h = this.height;
      const mobile = w <= 700;
      const immersed = document.body?.classList.contains('immersed');
      const motion = this.reducedMotion ? 0 : 1;
      const blend = ease(this.transition);
      for (let index = 0; index < constellations.length; index++) {
        const opacity = this.constellationFrom[index] * (1 - blend) + (index === this.sceneIndex ? blend : 0);
        if (opacity < .003) continue;
        const figure = constellations[index];
        let cx = w * figure.anchor[0], cy = h * figure.anchor[1];
        let maxWidth = Math.min(350, w * .27), maxHeight = Math.min(270, h * .39);
        if (mobile) {
          cx = w * figure.mobileX;
          cy = h >= 760 ? 157.5 : 130;
          maxWidth = Math.min(index === 3 ? 190 : 250, w * .6);
          maxHeight = h >= 760 ? 135 : 100;
          if (h < 600) { cy = 119; maxHeight = 78; }
        }
        if (immersed) {
          cx = w * (mobile ? figure.mobileX : figure.anchor[0] < .5 ? .24 : .77);
          cy = h * (mobile ? .38 : figure.anchor[1] + .08);
          maxWidth = mobile ? Math.min(index === 3 ? 234 : 310, w * .78) : Math.min(500, w * .41);
          maxHeight = Math.min(mobile ? 250 : 380, h * .48);
        }
        const height = Math.min(maxHeight, maxWidth / figure.aspect), width = height * figure.aspect;
        cx = clamp(cx, width / 2 + 14, w - width / 2 - 14) - this.pointer.x * 5 * motion;
        cy -= this.pointer.y * 3 * motion;
        const left = cx - width / 2, top = cy - height / 2;
        const color = palettes[index].light.join(',');
        ctx.save();
        ctx.globalCompositeOperation = 'source-over';
        ctx.globalAlpha = opacity;
        ctx.beginPath();
        for (const [a, b] of figure.edges) {
          ctx.moveTo(left + figure.points[a][0] * width, top + figure.points[a][1] * height);
          ctx.lineTo(left + figure.points[b][0] * width, top + figure.points[b][1] * height);
        }
        ctx.strokeStyle = 'rgba(2,5,17,.62)';
        ctx.lineWidth = mobile ? 2.8 : 3.2;
        ctx.stroke();
        ctx.strokeStyle = `rgba(${color},.74)`;
        ctx.lineWidth = mobile ? 1.15 : 1.3;
        ctx.shadowColor = `rgba(${color},.3)`; ctx.shadowBlur = 3;
        ctx.stroke();
        ctx.shadowBlur = 0;
        for (let i = 0; i < figure.points.length; i++) {
          const [u, v, strength] = figure.points[i];
          const x = left + u * width, y = top + v * height;
          const shimmer = .92 + Math.sin(this.time * .55 + i * 1.7) * .08;
          const radius = (mobile ? 2.1 : 2.6) * strength;
          const halo = ctx.createRadialGradient(x, y, 0, x, y, radius * 8);
          halo.addColorStop(0, `rgba(${color},${.94 * shimmer})`);
          halo.addColorStop(.16, `rgba(${color},${.44 * shimmer})`);
          halo.addColorStop(.42, `rgba(${color},${.12 * shimmer})`);
          halo.addColorStop(1, `rgba(${color},0)`);
          ctx.fillStyle = halo;
          ctx.fillRect(x - radius * 8, y - radius * 8, radius * 16, radius * 16);
          ctx.fillStyle = `rgba(250,251,255,${.96 + shimmer * .04})`;
          ctx.beginPath(); ctx.arc(x, y, radius * .8, 0, TAU); ctx.fill();
          if (strength >= 1.05) {
            ctx.strokeStyle = `rgba(${color},.72)`; ctx.lineWidth = .75;
            ctx.beginPath(); ctx.moveTo(x - radius * 3.4, y); ctx.lineTo(x + radius * 3.4, y);
            ctx.moveTo(x, y - radius * 3.4); ctx.lineTo(x, y + radius * 3.4); ctx.stroke();
          }
        }
        ctx.restore();
      }
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
      this.drawConstellations();
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
