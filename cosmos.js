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
  const CONSTELLATION_DURATION = 26;
  const STAR_TINTS = ['184,216,255', '231,226,255', '194,235,247', '255,222,187'];
  for (const figure of constellations) {
    const neighbors = figure.points.map(() => []), visited = new Set(), walk = [];
    figure.edges.forEach(([a, b], edge) => {
      neighbors[a].push({ next: b, edge });
      neighbors[b].push({ next: a, edge });
    });
    // Every edge is walked out and back, including branches and cycles, so the loop is closed.
    function visit(a) {
      for (const { next: b, edge } of neighbors[a]) {
        if (visited.has(edge)) continue;
        visited.add(edge);
        walk.push([a, b]); visit(b); walk.push([b, a]);
      }
    }
    visit(figure.edges[0][0]);
    let distance = 0;
    figure.route = walk.map(([a, b]) => {
      const length = Math.hypot((figure.points[b][0] - figure.points[a][0]) * figure.aspect, figure.points[b][1] - figure.points[a][1]);
      const segment = { a, b, start: distance, length };
      distance += length;
      return segment;
    });
    figure.routeLength = distance;
  }

  function sampleRoute(figure, phase, out) {
    const distance = (phase - Math.floor(phase)) * figure.routeLength;
    let index = figure.route.length - 1;
    for (let i = 0; i < figure.route.length; i++) {
      if (distance < figure.route[i].start + figure.route[i].length) { index = i; break; }
    }
    const segment = figure.route[index];
    const t = clamp((distance - segment.start) / segment.length, 0, 1);
    out.x = lerp(figure.points[segment.a][0], figure.points[segment.b][0], t);
    out.y = lerp(figure.points[segment.a][1], figure.points[segment.b][1], t);
    out.a = segment.a; out.b = segment.b; out.t = t; out.segment = index;
    out.distance = distance; out.totalLength = figure.routeLength;
    out.remaining = segment.length * (1 - t);
    return out;
  }

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
    const keepLeftQuiet = [3, 4, 5, 7].includes(index);
    const cloudStrength = [1, 4, 5, 7].includes(index) ? .55 : 1;

    // Warped, layered dust has no hard cloud outlines or repeating ridges.
    for (let y = 0; y < h; y++) {
      const v = y / h;
      for (let x = 0; x < w; x++) {
        const u = x / w;
        const broad = noise(grids[0], u, v), fold = noise(grids[1], u, v);
        const wu = clamp(u + (broad - .5) * .13, 0, 1);
        const wv = clamp(v + (fold - .5) * .1, 0, 1);
        const middle = noise(grids[2], wu, wv), fine = noise(grids[3], wu, wv);
        const dust = noise(grids[4], wu, wv), grain = noise(grids[5], wu, wv);
        const f = broad * .4 + fold * .26 + middle * .17 + fine * .1 + dust * .05 + grain * .02;
        const ribbon = v - (.53 + p.tilt * (u - .5) + (broad - .5) * .3 + (fold - .5) * .14);
        let band = Math.exp(-ribbon * ribbon * 15);
        if (index === 2) band = .2 + .8 * Math.exp(-((u - .56) ** 2 * 5 + (v - .58) ** 2 * 8));
        if (index === 6) band = Math.exp(-((ribbon + .09) ** 2) * 20) * .65 + Math.exp(-((ribbon - .15) ** 2) * 36) * .3;
        const quietSide = keepLeftQuiet ? .32 + .68 * ease(clamp((u - .14) / .65, 0, 1)) : 1;
        const depth = .55 + .45 * middle;
        const density = Math.pow(Math.max(0, f - .22), 1.6) * band * depth * quietSide * cloudStrength;
        const light = clamp((f - .4) * 1.5 + fine * dust * .2, 0, 1);
        const i = (y * w + x) * 4;
        for (let k = 0; k < 3; k++) {
          pixels[i + k] = p.base[k] + lerp(p.low[k], p.high[k], light) * density * 1.8 + (rng() - .5) * 1.1;
        }

        if (index === 1) {
          // A continuous soft curtain, with uneven folds fading into the night.
          const crest = .23 + Math.sin(u * 7.2) * .065 + Math.sin(u * 15.1 + .8) * .02;
          const down = v - crest;
          const folds = .45 + .55 * (.5 + .5 * Math.sin(u * 32 + fold * 5 + v * 3));
          const veil = Math.exp(-(((down - .09) / .17) ** 2)) * ease(clamp((down + .065) / .1, 0, 1));
          const rim = Math.exp(-((down / .035) ** 2)) * .24;
          const strength = (veil * .6 + rim) * folds * (.35 + broad * .65);
          pixels[i] += strength * 19;
          pixels[i + 1] += strength * 87;
          pixels[i + 2] += strength * 73;
        }
        pixels[i + 3] = 255;
      }
    }
    ctx.putImageData(data, 0, 0);

    // Broad low-opacity light gives the dust depth without bright circular blobs.
    ctx.globalCompositeOperation = 'screen';
    for (let n = 0; n < 10; n++) {
      const x = (rng() * .7 + .2) * w;
      const y = (.54 + p.tilt * (x / w - .5) + (rng() - .5) * .24) * h;
      const r = 75 + rng() * 145;
      const g = ctx.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(0, `rgba(${p.high.join(',')},${.018 + rng() * .025})`);
      g.addColorStop(.4, `rgba(${p.low.join(',')},.016)`);
      g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g;
      ctx.fillRect(x - r, y - r, r * 2, r * 2);
    }
    ctx.globalCompositeOperation = 'source-over';

    if (index === 2 || index === 6) {
      ctx.globalCompositeOperation = 'screen';
      for (let n = 0; n < 110; n++) {
        const u = rng(), offset = (rng() + rng() - 1) * .2;
        const x = (.15 + u * .8) * w;
        const y = (.54 + p.tilt * (u - .5) + offset) * h;
        ctx.globalAlpha = .035 + rng() * .1;
        ctx.fillStyle = index === 2 ? '#d7a6af' : '#b3d9ea';
        ctx.beginPath(); ctx.arc(x, y, .3 + rng() * .7, 0, TAU); ctx.fill();
      }
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';
    }

    if (index === 3) {
      const x = w * .64, y = h * .47, r = h * .15;
      ctx.globalCompositeOperation = 'screen';
      const corona = ctx.createRadialGradient(x, y, r * .9, x, y, r * 2.25);
      corona.addColorStop(0, 'rgba(235,190,131,0)');
      corona.addColorStop(.08, 'rgba(236,185,117,.3)');
      corona.addColorStop(.2, 'rgba(205,138,86,.1)');
      corona.addColorStop(.55, 'rgba(168,99,66,.025)');
      corona.addColorStop(1, 'rgba(168,99,66,0)');
      ctx.fillStyle = corona; ctx.fillRect(x - r * 2.3, y - r * 2.3, r * 4.6, r * 4.6);
      for (let n = 0; n < 12; n++) {
        const angle = rng() * TAU, size = r * (.2 + rng() * .3);
        const px = x + Math.cos(angle) * r * 1.06, py = y + Math.sin(angle) * r * 1.06;
        const glow = ctx.createRadialGradient(px, py, 0, px, py, size);
        glow.addColorStop(0, 'rgba(242,195,134,.055)'); glow.addColorStop(1, 'rgba(210,139,80,0)');
        ctx.fillStyle = glow; ctx.fillRect(px - size, py - size, size * 2, size * 2);
      }
      ctx.globalCompositeOperation = 'source-over';
      const planet = ctx.createRadialGradient(x - r * .24, y - r * .28, 0, x, y, r);
      planet.addColorStop(0, '#11141d'); planet.addColorStop(.8, '#080c15');
      planet.addColorStop(.975, '#0c1018'); planet.addColorStop(.994, '#594733'); planet.addColorStop(1, '#a28359');
      ctx.fillStyle = planet; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
    }

    if (index === 4) {
      const puff = canvasOf(48, 48), pc = puff.getContext('2d');
      const glow = pc.createRadialGradient(24, 24, 0, 24, 24, 24);
      glow.addColorStop(0, 'rgba(170,203,238,.56)');
      glow.addColorStop(.25, 'rgba(100,147,201,.21)');
      glow.addColorStop(1, 'rgba(48,79,136,0)');
      pc.fillStyle = glow; pc.fillRect(0, 0, 48, 48);
      ctx.save(); ctx.translate(w * .59, h * .5); ctx.rotate(-.32); ctx.scale(1, .56);
      ctx.globalCompositeOperation = 'screen';
      const radius = w * .34;
      for (let n = 0; n < 2600; n++) {
        const r = Math.pow(rng(), .67) * radius, arm = n % 2 * Math.PI;
        const angle = arm + Math.log(r / radius + .09) * 3.15 + (rng() - .5) * .95 + Math.sin(r / radius * 9 + arm) * .11;
        const x = Math.cos(angle) * r, y = Math.sin(angle) * r;
        const size = 7 + rng() * 22;
        ctx.globalAlpha = (.035 + rng() * .12) * (1 - r / radius * .7);
        ctx.drawImage(puff, x - size, y - size, size * 2, size * 2);
      }
      ctx.globalAlpha = 1;
      const core = ctx.createRadialGradient(0, 0, 0, 0, 0, radius * .5);
      core.addColorStop(0, 'rgba(224,231,242,.64)');
      core.addColorStop(.15, 'rgba(183,202,229,.39)');
      core.addColorStop(.45, 'rgba(107,144,199,.13)'); core.addColorStop(1, 'rgba(49,87,143,0)');
      ctx.fillStyle = core; ctx.fillRect(-radius, -radius, radius * 2, radius * 2);
      ctx.restore();
    }

    if (index === 5) {
      const x = w * .64, y = h * .48, r = h * .112;
      ctx.save(); ctx.translate(x, y); ctx.rotate(-.36);
      const haze = ctx.createRadialGradient(0, 0, r * .8, 0, 0, r * 3.2);
      haze.addColorStop(0, 'rgba(159,145,193,.09)'); haze.addColorStop(1, 'rgba(104,79,168,0)');
      ctx.fillStyle = haze; ctx.fillRect(-r * 3.3, -r * 3.3, r * 6.6, r * 6.6);
      const ring = () => {
        ctx.save(); ctx.scale(1, .32);
        const dust = ctx.createRadialGradient(0, 0, r * 1.34, 0, 0, r * 2.24);
        dust.addColorStop(0, 'rgba(178,167,199,0)'); dust.addColorStop(.1, 'rgba(178,167,199,.13)');
        dust.addColorStop(.42, 'rgba(194,181,210,.27)'); dust.addColorStop(.65, 'rgba(177,161,198,.18)');
        dust.addColorStop(.71, 'rgba(139,127,165,.045)'); dust.addColorStop(.8, 'rgba(174,158,192,.15)');
        dust.addColorStop(1, 'rgba(174,158,192,0)');
        ctx.fillStyle = dust;
        ctx.beginPath(); ctx.arc(0, 0, r * 2.24, 0, TAU); ctx.arc(0, 0, r * 1.34, TAU, 0, true);
        ctx.fill('evenodd'); ctx.restore();
      };
      ring();
      const planet = ctx.createRadialGradient(-r * .36, -r * .38, 0, r * .05, r * .04, r * 1.06);
      planet.addColorStop(0, '#a49ab8'); planet.addColorStop(.28, '#827891');
      planet.addColorStop(.6, '#4e485f'); planet.addColorStop(.88, '#242235'); planet.addColorStop(1, '#101420');
      ctx.fillStyle = planet; ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU); ctx.fill();
      ctx.save(); ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU); ctx.clip();
      const atmosphere = ctx.createLinearGradient(0, -r, 0, r);
      atmosphere.addColorStop(0, 'rgba(198,182,211,0)'); atmosphere.addColorStop(.2, 'rgba(198,182,211,.035)');
      atmosphere.addColorStop(.36, 'rgba(111,96,140,.035)'); atmosphere.addColorStop(.52, 'rgba(198,182,211,.045)');
      atmosphere.addColorStop(.7, 'rgba(111,96,140,.025)'); atmosphere.addColorStop(1, 'rgba(198,182,211,0)');
      ctx.fillStyle = atmosphere; ctx.fillRect(-r, -r, r * 2, r * 2); ctx.restore();
      ctx.save(); ctx.beginPath(); ctx.rect(-r * 3, 0, r * 6, r * 3); ctx.clip(); ring(); ctx.restore();
      ctx.restore();
    }

    if (index === 7) {
      ctx.globalCompositeOperation = 'screen';
      [[w * .56, h * .52, 13, [242,197,143]], [w * .69, h * .61, 9, [224,160,132]]].forEach(([x, y, radius, color]) => {
        const halo = ctx.createRadialGradient(x, y, 0, x, y, radius * 12);
        halo.addColorStop(0, 'rgba(249,237,211,.79)');
        halo.addColorStop(.04, `rgba(${color.join(',')},.58)`);
        halo.addColorStop(.13, `rgba(${color.join(',')},.2)`);
        halo.addColorStop(.42, `rgba(${color.join(',')},.04)`); halo.addColorStop(1, 'rgba(154,65,52,0)');
        ctx.fillStyle = halo; ctx.fillRect(x - radius * 12, y - radius * 12, radius * 24, radius * 24);
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
      this.worldAngle = 0;
      this.worldX = 0;
      this.worldY = 0;
      this.planetMasks = [{ index: 3, y: .47, radius: .15 }, { index: 5, y: .48, radius: .112 }];
      this.pointer = { x: 0, y: 0, targetX: 0, targetY: 0, active: false };
      this.lastInteraction = performance.now();
      this.sceneDuration = 32000;
      this.sceneElapsed = 0;
      this.sceneBag = [];
      this.lastFrame = 0;
      this.lastDraw = 0;
      this.raf = 0;
      this.transition = 1;
      this.constellationFrom = new Float32Array(palettes.length);
      this.constellationFrom[0] = 1;
      this.constellationDuration = CONSTELLATION_DURATION;
      this.constellationElapsed = new Float32Array(palettes.length);
      this.constellationHead = {};
      this.constellationTail = {};
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
      this.sceneElapsed = 0;
      if (index === this.sceneIndex) return this.replayConstellation();
      const pending = this.sceneBag.indexOf(index);
      if (pending !== -1) this.sceneBag.splice(pending, 1);
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
      this.constellationElapsed[index] = 0;
      this.transition = this.paused ? 1 : 0;
      this.meteors.length = 0;
      this.onSceneChange?.(index);
      this.draw();
      this.requestFrame();
    }

    replayConstellation() {
      if (this.destroyed) return;
      this.lastInteraction = performance.now();
      this.sceneElapsed = 0;
      this.constellationElapsed[this.sceneIndex] = 0;
      this.draw();
      this.requestFrame();
    }

    sampleConstellation(index, phase) {
      const figure = constellations[index] || constellations[this.sceneIndex];
      return sampleRoute(figure, Number.isFinite(phase) ? phase : 0, {});
    }

    nextRandomScene() {
      while (true) {
        if (!this.sceneBag.length) {
          for (let index = 0; index < palettes.length; index++) {
            if (index !== this.sceneIndex) this.sceneBag.push(index);
          }
          for (let i = this.sceneBag.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [this.sceneBag[i], this.sceneBag[j]] = [this.sceneBag[j], this.sceneBag[i]];
          }
        }
        const next = this.sceneBag.pop();
        if (next !== this.sceneIndex) return next;
      }
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
      const wasReduced = this.reducedMotion;
      this.reducedMotion = Boolean(value);
      if (this.reducedMotion) {
        this.transition = 1;
        this.meteors.length = 0;
        this.bursts.length = 0;
      } else if (wasReduced) {
        return this.replayConstellation();
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
      this.sceneElapsed += dt * 1000;
      if (!this.reducedMotion) {
        this.constellationElapsed[this.sceneIndex] = (this.constellationElapsed[this.sceneIndex] + dt) % CONSTELLATION_DURATION;
      }
      this.transition = Math.min(1, this.transition + dt / 3.5);
      const smoothing = 1 - Math.exp(-dt * 2.4);
      this.pointer.x = lerp(this.pointer.x, this.pointer.targetX, smoothing);
      this.pointer.y = lerp(this.pointer.y, this.pointer.targetY, smoothing);
      if (this.sceneElapsed >= this.sceneDuration && this.transition === 1) this.setScene(this.nextRandomScene());
      if (!this.reducedMotion) {
        const idle = now - this.lastInteraction > 3500;
        this.rotation += dt * (idle ? .0022 : .0005);
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
      ctx.translate(w * .5 + this.worldX, h * .5 + this.worldY);
      ctx.rotate(this.worldAngle);
      const focusX = w <= 700 ? .62 : .5;
      ctx.drawImage(texture, -texture.width * cover * focusX, -texture.height * cover / 2, texture.width * cover, texture.height * cover);
      ctx.restore();
    }

    updateWorldTransform() {
      const motion = this.reducedMotion ? 0 : 1;
      this.worldAngle = Math.sin(this.rotation * 12) * .075 * motion;
      this.worldX = (Math.sin(this.time * .019) * 4 - this.pointer.x * 9) * motion;
      this.worldY = (Math.sin(this.time * .015) * 3 - this.pointer.y * 7) * motion;
    }

    updatePlanetMasks() {
      const cover = Math.max(this.width / 960, this.height / 640) * 1.22;
      const focusX = this.width <= 700 ? .62 : .5;
      const cos = Math.cos(this.worldAngle), sin = Math.sin(this.worldAngle);
      const blend = ease(this.transition);
      for (const mask of this.planetMasks) {
        const x = (.64 - focusX) * 960 * cover, y = (mask.y - .5) * 640 * cover;
        mask.cx = this.width / 2 + this.worldX + x * cos - y * sin;
        mask.cy = this.height / 2 + this.worldY + x * sin + y * cos;
        mask.r = mask.radius * 640 * cover;
        mask.opacity = this.constellationFrom[mask.index] * (1 - blend) + (this.sceneIndex === mask.index ? blend : 0);
      }
    }

    starVisibility(x, y) {
      let hidden = 0;
      for (const mask of this.planetMasks) {
        if (mask.opacity < .001) continue;
        const dx = x - mask.cx, dy = y - mask.cy, distance = dx * dx + dy * dy;
        if (distance < mask.r * mask.r) hidden += mask.opacity * clamp((mask.r - Math.sqrt(distance)) / 1.5, 0, 1);
      }
      return clamp(1 - hidden, 0, 1);
    }

    drawConstellations() {
      const ctx = this.ctx, w = this.width, h = this.height;
      const mobile = w <= 700;
      const immersed = document.body?.classList.contains('immersed');
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
        cx = clamp(cx, width / 2 + 14, w - width / 2 - 14);
        const left = cx - width / 2, top = cy - height / 2;
        const color = palettes[index].light.join(',');
        ctx.save();
        ctx.translate(w * .5 + this.worldX, h * .5 + this.worldY);
        ctx.rotate(this.worldAngle);
        ctx.translate(-w * .5, -h * .5);
        ctx.globalCompositeOperation = 'source-over';
        ctx.globalAlpha = opacity;
        ctx.beginPath();
        for (const [a, b] of figure.edges) {
          const ax = left + figure.points[a][0] * width, ay = top + figure.points[a][1] * height;
          const bx = left + figure.points[b][0] * width, by = top + figure.points[b][1] * height;
          ctx.moveTo(ax, ay);
          ctx.lineTo(bx, by);
        }
        ctx.strokeStyle = 'rgba(2,5,17,.45)';
        ctx.lineWidth = mobile ? 1.8 : 2;
        ctx.stroke();
        ctx.strokeStyle = `rgba(${color},.7)`;
        ctx.lineWidth = mobile ? .85 : .95;
        ctx.shadowColor = `rgba(${color},.22)`; ctx.shadowBlur = 3;
        ctx.stroke();
        ctx.shadowBlur = 0;
        for (let i = 0; i < figure.points.length; i++) {
          const [u, v, strength] = figure.points[i];
          const x = left + u * width, y = top + v * height;
          const shimmer = .94 + Math.sin(this.time * .44 + i * 1.7) * .06;
          const tint = STAR_TINTS[index === 0 && i === 0 ? 3 : (i + index * 2) % STAR_TINTS.length];
          const scale = Math.sqrt(strength);
          const radius = (mobile ? 14 : 20) * scale;
          ctx.globalAlpha = opacity;
          const halo = ctx.createRadialGradient(x, y, 0, x, y, radius);
          halo.addColorStop(0, `rgba(${tint},${.48 * shimmer})`);
          halo.addColorStop(.16, `rgba(${tint},${.21 * shimmer})`);
          halo.addColorStop(.48, `rgba(${tint},${.045 * shimmer})`);
          halo.addColorStop(1, `rgba(${tint},0)`);
          ctx.fillStyle = halo;
          ctx.fillRect(x - radius, y - radius, radius * 2, radius * 2);
          const coronaRadius = (mobile ? 4.5 : 6) * scale;
          const corona = ctx.createRadialGradient(x, y, 0, x, y, coronaRadius);
          corona.addColorStop(0, 'rgba(253,253,255,.9)');
          corona.addColorStop(.2, `rgba(${tint},${.65 * shimmer})`);
          corona.addColorStop(.65, `rgba(${tint},.08)`);
          corona.addColorStop(1, `rgba(${tint},0)`);
          ctx.fillStyle = corona;
          ctx.fillRect(x - coronaRadius, y - coronaRadius, coronaRadius * 2, coronaRadius * 2);
          ctx.fillStyle = `rgba(252,253,255,${.94 + shimmer * .05})`;
          ctx.beginPath(); ctx.arc(x, y, (mobile ? 1 : 1.25) * scale, 0, TAU); ctx.fill();
          if (strength >= 1.2) {
            const arm = (mobile ? 5.4 : 7.5) * scale;
            ctx.strokeStyle = `rgba(${tint},.37)`; ctx.lineWidth = .5;
            ctx.beginPath(); ctx.moveTo(x - arm, y); ctx.lineTo(x + arm, y);
            ctx.moveTo(x, y - arm); ctx.lineTo(x, y + arm); ctx.stroke();
          }
        }
        if (index === this.sceneIndex && !this.reducedMotion) {
          const head = sampleRoute(figure, this.constellationElapsed[index] / CONSTELLATION_DURATION, this.constellationHead);
          const headX = left + head.x * width, headY = top + head.y * height;
          const end = head.distance, tailLength = figure.routeLength * .024;
          let cursor = end - tailLength;
          ctx.globalAlpha = opacity;
          ctx.beginPath();
          while (cursor < end - 1e-9) {
            const sample = sampleRoute(figure, cursor / figure.routeLength, this.constellationTail);
            const segment = figure.route[sample.segment];
            const advance = Math.min(end - cursor, sample.remaining);
            if (advance < 1e-9) { cursor += 1e-8; continue; }
            const t = clamp(sample.t + advance / segment.length, 0, 1);
            const x = lerp(figure.points[segment.a][0], figure.points[segment.b][0], t);
            const y = lerp(figure.points[segment.a][1], figure.points[segment.b][1], t);
            ctx.moveTo(left + sample.x * width, top + sample.y * height);
            ctx.lineTo(left + x * width, top + y * height);
            cursor += advance;
          }
          ctx.strokeStyle = 'rgba(228,242,255,.14)'; ctx.lineWidth = mobile ? 1.25 : 1.5;
          ctx.lineCap = 'round'; ctx.shadowColor = `rgba(${color},.25)`; ctx.shadowBlur = 4;
          ctx.stroke(); ctx.shadowBlur = 0;
          const radius = mobile ? 16 : 22;
          const tip = ctx.createRadialGradient(headX, headY, 0, headX, headY, radius);
          tip.addColorStop(0, 'rgba(250,252,255,.98)');
          tip.addColorStop(.12, 'rgba(223,242,255,.8)');
          tip.addColorStop(.36, `rgba(${color},.22)`);
          tip.addColorStop(1, `rgba(${color},0)`);
          ctx.fillStyle = tip;
          ctx.fillRect(headX - radius, headY - radius, radius * 2, radius * 2);
          ctx.fillStyle = '#f8fbff';
          ctx.beginPath(); ctx.arc(headX, headY, mobile ? 1.8 : 2.15, 0, TAU); ctx.fill();
        }
        ctx.restore();
      }
    }

    draw() {
      if (this.destroyed || !this.ctx) return;
      this.updateWorldTransform();
      this.updatePlanetMasks();
      const ctx = this.ctx, w = this.width, h = this.height;
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';
      ctx.fillStyle = '#040713';
      ctx.fillRect(0, 0, w, h);
      if (this.transition < 1 && this.oldBackground) this.drawBackground(this.oldBackground, 1);
      this.drawBackground(this.background, ease(this.transition));
      const motion = this.reducedMotion ? 0 : 1;
      const angle = this.worldAngle;
      const cos = Math.cos(angle), sin = Math.sin(angle);
      const px = this.pointer.x * motion, py = this.pointer.y * motion;
      const mouseX = (this.pointer.x + 1) * w / 2, mouseY = (this.pointer.y + 1) * h / 2;
      const starTint = palettes[this.sceneIndex].light;
      const tint = `rgb(${starTint.join(',')})`;

      for (let i = 0; i < this.stars.length; i++) {
        const s = this.stars[i];
        let x = s.x * cos - s.y * sin + w / 2 + this.worldX - px * s.depth * 23;
        let y = s.x * sin + s.y * cos + h / 2 + this.worldY - py * s.depth * 17;
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
        ctx.globalAlpha = s.alpha * twinkle * this.starVisibility(x, y);
        ctx.fillStyle = s.warm ? '#f4d9c9' : tint;
        ctx.beginPath();
        ctx.arc(x, y, s.radius, 0, TAU);
        ctx.fill();
      }

      ctx.globalCompositeOperation = 'screen';
      for (let i = 0; i < this.glows.length; i++) {
        const s = this.glows[i];
        const x = s.x * cos - s.y * sin + w / 2 + this.worldX - px * 18;
        const y = s.x * sin + s.y * cos + h / 2 + this.worldY - py * 13;
        if (x < -20 || x > w + 20 || y < -20 || y > h + 20) continue;
        const shimmer = .65 + Math.sin(this.time * .72 + s.phase) * .25;
        ctx.globalAlpha = shimmer * this.starVisibility(x, y);
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
