(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const scenes = [
    {title:'별빛의 바다', description:'보랏빛 성운 사이, 고요하게 흐르는 별들'},
    {title:'푸른 숨결', description:'깊은 밤을 감싸 안는, 청록빛의 잔잔한 물결'},
    {title:'장밋빛 꿈', description:'아주 먼 우주에서 도착한, 따뜻한 빛 한 조각'},
    {title:'황금빛 고요', description:'어둠의 가장자리에 조용히 머무는 빛'},
    {title:'아득한 은하', description:'수없이 많은 별들 속, 나만의 작은 쉼표'}
  ];
  let toastTimeout, revealTimeout, audio, soundOn = false, paused = false, immersed = false;
  let selected = 0, motionReduced = false;
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const worlds = [...document.querySelectorAll('.world')];
  function toast(message) {
    $('toast').textContent = message;
    $('toast').classList.add('show');
    clearTimeout(toastTimeout);
    toastTimeout = setTimeout(() => $('toast').classList.remove('show'), 2600);
  }
  function syncScene(index) {
    selected = index;
    $('scene-number').textContent = String(index + 1).padStart(2, '0');
    $('scene-title').textContent = scenes[index].title;
    $('scene-description').textContent = scenes[index].description;
    worlds.forEach((button, i) => {
      button.classList.toggle('active', i === index);
      button.setAttribute('aria-pressed', String(i === index));
    });
    const info = document.querySelector('.scene-info');
    info.classList.remove('changing');
    void info.offsetWidth;
    info.classList.add('changing');
  }
  const engine = new window.CosmosEngine($('cosmos'), {onSceneChange: syncScene});
  motionReduced = reducedMotion.matches;
  engine.setReducedMotion(motionReduced);
  reducedMotion.addEventListener('change', e => {
    motionReduced = e.matches;
    engine.setReducedMotion(motionReduced);
    updateStatus();
  });
  function updateStatus() {
    $('status-label').textContent = paused ? '이 순간에, 잠시 머무는 중' : motionReduced ? '잔잔한 별빛 · 움직임 켜기' : '천천히, 자동 항해 중';
    $('motion').setAttribute('aria-pressed', String(motionReduced));
    $('motion').setAttribute('aria-label', motionReduced ? '우주 움직임 켜기' : '우주 움직임 줄이기');
    $('motion').title = motionReduced ? '마우스 반응과 자동 항해 켜기' : '움직임을 줄여 편하게 바라보기';
  }
  updateStatus();
  $('motion').addEventListener('click', () => {
    motionReduced = !motionReduced;
    engine.setReducedMotion(motionReduced);
    updateStatus();
    toast(motionReduced ? '별빛만 잔잔하게 반짝일게요' : '이제 별들이 당신을 따라 흘러요');
  });
  worlds.forEach(button => button.addEventListener('click', () => {
    engine.setScene(Number(button.dataset.scene));
  }));
  function togglePause() {
    paused = !paused;
    engine.setPaused(paused);
    document.body.classList.toggle('paused', paused);
    $('pause').setAttribute('aria-pressed', String(paused));
    $('pause').setAttribute('aria-label', paused ? '별의 움직임 이어가기' : '별의 움직임 멈추기');
    $('pause').title = paused ? '이어가기 (Space)' : '잠시 멈추기 (Space)';
    updateStatus();
  }
  $('pause').addEventListener('click', togglePause);
  function setImmersed(value) {
    immersed = value;
    document.body.classList.toggle('immersed', value);
    $('interface').inert = value;
    if(value) $('restore').focus({preventScroll:true});
    else $('immerse').focus({preventScroll:true});
  }
  $('immerse').addEventListener('click', () => setImmersed(true));
  $('restore').addEventListener('click', () => setImmersed(false));
  window.addEventListener('pointermove', () => {
    if(!immersed) return;
    document.body.classList.add('reveal');
    clearTimeout(revealTimeout);
    revealTimeout = setTimeout(() => document.body.classList.remove('reveal'), 2000);
  }, {passive:true});
  $('cosmos').addEventListener('pointerdown', e => {
    if(!paused) engine.burst(e.clientX, e.clientY);
  });

  class CosmicSound {
    constructor() {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AudioContext();
      const ctx = this.ctx;
      this.master = ctx.createGain();
      this.master.gain.value = 0;
      this.master.connect(ctx.destination);
      const length = ctx.sampleRate * 6;
      const noise = ctx.createBuffer(2, length, ctx.sampleRate);
      for(let channel = 0; channel < 2; channel++) {
        const data = noise.getChannelData(channel);
        let last = 0;
        for(let i = 0; i < length; i++) {
          last = (last + (Math.random() * 2 - 1) * .02) / 1.02;
          data[i] = last * 3;
        }
      }
      const source = ctx.createBufferSource();
      source.buffer = noise;
      source.loop = true;
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 460;
      source.connect(filter).connect(this.master);
      source.start();
      [65.406, 97.999, 130.813].forEach((frequency, i) => {
        const oscillator = ctx.createOscillator();
        const gain = ctx.createGain();
        oscillator.type = 'sine';
        oscillator.frequency.value = frequency;
        gain.gain.value = .025 / (i + 1);
        oscillator.connect(gain).connect(this.master);
        oscillator.start();
        const lfo = ctx.createOscillator();
        const depth = ctx.createGain();
        lfo.frequency.value = .035 + i * .013;
        depth.gain.value = .008;
        lfo.connect(depth).connect(gain.gain);
        lfo.start();
      });
    }
    async setEnabled(enabled) {
      await this.ctx.resume();
      this.master.gain.cancelScheduledValues(this.ctx.currentTime);
      this.master.gain.setTargetAtTime(enabled ? .42 : 0, this.ctx.currentTime, .65);
    }
  }
  async function toggleSound() {
    try {
      if(!audio) audio = new CosmicSound();
      const next = !soundOn;
      await audio.setEnabled(next);
      soundOn = next;
      $('sound').setAttribute('aria-pressed', String(soundOn));
      $('sound').setAttribute('aria-label', soundOn ? '우주 소리 끄기' : '우주 소리 켜기');
      $('sound').title = (soundOn ? '우주 소리 끄기' : '우주 소리 켜기') + ' (M)';
      toast(soundOn ? '작은 소리로, 편안히 들어보세요' : '고요한 우주로 돌아왔어요');
    } catch {
      toast('이 브라우저에서는 소리를 재생할 수 없어요');
    }
  }
  $('sound').addEventListener('click', toggleSound);
  async function toggleFullscreen() {
    try {
      if(document.fullscreenElement) await document.exitFullscreen();
      else if(document.documentElement.requestFullscreen) await document.documentElement.requestFullscreen();
      else toast('이 브라우저에서는 전체 화면을 지원하지 않아요');
    } catch { toast('브라우저에서 전체 화면을 허용해 주세요'); }
  }
  $('fullscreen').addEventListener('click', toggleFullscreen);
  document.addEventListener('fullscreenchange', () => {
    const active = !!document.fullscreenElement;
    $('fullscreen').setAttribute('aria-pressed', String(active));
    $('fullscreen').setAttribute('aria-label', active ? '전체 화면 나가기' : '전체 화면으로 보기');
  });
  $('help').addEventListener('click', () => $('help-dialog').showModal());
  $('close-help').addEventListener('click', () => $('help-dialog').close());
  $('help-dialog').addEventListener('click', e => {
    const box = $('help-dialog').getBoundingClientRect();
    if(e.clientX < box.left || e.clientX > box.right || e.clientY < box.top || e.clientY > box.bottom) $('help-dialog').close();
  });
  window.addEventListener('keydown', e => {
    if(e.ctrlKey || e.metaKey || e.altKey || e.repeat || $('help-dialog').open) return;
    if(e.target instanceof HTMLButtonElement && (e.code === 'Space' || e.code === 'Enter')) return;
    if(e.code === 'Space') { e.preventDefault(); togglePause(); }
    if(e.code === 'ArrowRight') { e.preventDefault(); engine.setScene((selected + 1) % scenes.length); }
    if(e.code === 'ArrowLeft') { e.preventDefault(); engine.setScene((selected + scenes.length - 1) % scenes.length); }
    if(e.code === 'KeyM') toggleSound();
    if(e.code === 'KeyF') toggleFullscreen();
    if(e.code === 'KeyH') setImmersed(!immersed);
    if(e.code === 'Escape' && immersed) setImmersed(false);
  });
  document.addEventListener('visibilitychange', () => {
    if(audio && soundOn) audio.setEnabled(!document.hidden).catch(() => {});
  });
  setInterval(() => {
    if(document.hidden || paused || motionReduced) return;
    const duration = engine.sceneDuration || 50000;
    const elapsed = performance.now() - (engine.lastInteraction || performance.now());
    $('journey-progress').style.width = Math.min(100, elapsed / duration * 100) + '%';
  }, 500);
})();
