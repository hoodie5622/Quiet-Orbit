(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const scenes = window.QUIET_ORBIT_SCENES;
  let audio, toastTimeout, soundOn = false, soundBusy = false;
  let paused = false, immersed = false, selected = 0;
  let lastTouch = 0, touchX = 0, touchY = 0;
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  let motionReduced = reducedMotion.matches;
  let motionPreference = null;
  let volume = .35;
  try {
    const savedMotion = localStorage.getItem('quiet-orbit-motion');
    if(savedMotion === 'full' || savedMotion === 'reduced') {
      motionPreference = savedMotion;
      motionReduced = savedMotion === 'reduced';
    }
    const saved = localStorage.getItem('quiet-orbit-volume');
    if(saved !== null && Number.isFinite(Number(saved))) volume = Math.max(0, Math.min(1, Number(saved)));
  } catch {}

  const worlds = scenes.map((scene, index) => {
    const button = document.createElement('button');
    button.className = 'world';
    button.dataset.scene = index;
    button.setAttribute('aria-label', scene.title);
    button.title = scene.title;
    const orb = document.createElement('span');
    orb.className = 'world-orb orb-' + index;
    const label = document.createElement('span');
    label.className = 'world-label';
    label.textContent = scene.title;
    button.append(orb, label);
    document.querySelector('.scene-choices').append(button);
    button.addEventListener('click', () => engine.setScene(index));
    return button;
  });
  $('scene-count').textContent = String(scenes.length).padStart(2, '0');
  function toast(message) {
    $('toast').textContent = message;
    $('toast').classList.add('show');
    clearTimeout(toastTimeout);
    toastTimeout = setTimeout(() => $('toast').classList.remove('show'), 2600);
  }
  function syncScene(index) {
    selected = index;
    const scene = scenes[index];
    $('scene-number').textContent = String(index + 1).padStart(2, '0');
    $('scene-title').textContent = scene.title;
    $('scene-description').textContent = scene.description;
    $('soundscape-name').textContent = scene.sound;
    $('cosmos').setAttribute('aria-label', scene.title + ' 우주와 반짝이는 별자리');
    worlds.forEach((button, i) => {
      button.classList.toggle('active', i === index);
      button.setAttribute('aria-pressed', String(i === index));
    });
    audio?.setScene(index);
  }
  const engine = new window.CosmosEngine($('cosmos'), {onSceneChange: syncScene});
  engine.setReducedMotion(motionReduced);
  syncScene(0);
  function updateStatus() {
    $('status-label').textContent = paused ? '이 순간에, 잠시 머무는 중' : motionReduced ? '자동 항해 중 · 움직임 켜기' : '무작위로, 자동 항해 중';
    $('motion').setAttribute('aria-pressed', String(motionReduced));
    $('motion').setAttribute('aria-label', motionReduced ? '우주 움직임 켜기' : '우주 움직임 줄이기');
    $('motion').title = motionReduced ? '별빛 순환과 우주 움직임 켜기' : '자동 항해는 유지하며 움직임 줄이기';
    $('journey-progress').style.width = '0%';
  }
  updateStatus();
  reducedMotion.addEventListener('change', e => {
    if(motionPreference !== null) return;
    motionReduced = e.matches;
    engine.setReducedMotion(motionReduced);
    updateStatus();
  });
  $('motion').addEventListener('click', () => {
    motionReduced = !motionReduced;
    motionPreference = motionReduced ? 'reduced' : 'full';
    try { localStorage.setItem('quiet-orbit-motion', motionPreference); } catch {}
    engine.setReducedMotion(motionReduced);
    engine.lastInteraction = performance.now();
    updateStatus();
    toast(motionReduced ? '별빛만 잔잔하게 반짝일게요' : '이제 별들이 당신을 따라 흘러요');
  });
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
    lastTouch = 0;
    document.body.classList.toggle('immersed', value);
    $('interface').inert = value;
    if(paused) engine.draw();
    $('toast').classList.remove('show');
    (value ? $('cosmos') : $('immerse')).focus({preventScroll:true});
  }
  $('immerse').addEventListener('click', () => setImmersed(true));
  $('cosmos').addEventListener('pointerdown', e => {
    // Touch screens have no Escape key; a double tap returns without adding UI.
    if(e.pointerType === 'touch' && immersed) {
      const now = performance.now();
      if(lastTouch > 0 && now - lastTouch < 350 && Math.hypot(e.clientX - touchX, e.clientY - touchY) < 35) {
        setImmersed(false);
        lastTouch = 0;
        return;
      }
      lastTouch = now; touchX = e.clientX; touchY = e.clientY;
    }
    if(!paused) engine.burst(e.clientX, e.clientY);
  });
  function updateVolume() {
    $('volume').value = Math.round(volume * 100);
    $('volume-value').value = Math.round(volume * 100) + '%';
    $('volume').setAttribute('aria-valuetext', Math.round(volume * 100) + '퍼센트');
    audio?.setVolume(volume);
  }
  updateVolume();
  $('volume').addEventListener('input', e => {
    volume = Number(e.target.value) / 100;
    updateVolume();
    try { localStorage.setItem('quiet-orbit-volume', String(volume)); } catch {}
  });
  async function toggleSound() {
    if(soundBusy) return;
    soundBusy = true;
    try {
      if(!audio) {
        audio = new window.CosmicSound();
        audio.setScene(selected);
        audio.setVolume(volume);
        audio.setVisible(!document.hidden);
      }
      const next = !soundOn;
      await audio.setEnabled(next);
      soundOn = next;
      $('sound').setAttribute('aria-pressed', String(soundOn));
      $('sound').setAttribute('aria-label', soundOn ? '우주 소리 끄기' : '우주 소리 켜기');
      $('sound').title = (soundOn ? '우주 소리 끄기' : '우주 소리 켜기') + ' (M)';
      document.body.classList.toggle('sound-playing', soundOn);
    } catch { toast('이 브라우저에서는 소리를 재생할 수 없어요'); }
    finally { soundBusy = false; }
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
    if(!active && immersed) setImmersed(false);
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
    if(e.code === 'Escape' && immersed) { e.preventDefault(); setImmersed(false); return; }
    if(e.ctrlKey || e.metaKey || e.altKey || e.repeat || $('help-dialog').open) return;
    if(e.target.matches('input,textarea,select,[contenteditable=true]')) return;
    if(e.target instanceof HTMLButtonElement && (e.code === 'Space' || e.code === 'Enter')) return;
    if(e.code === 'Space') { e.preventDefault(); togglePause(); }
    if(e.code === 'ArrowRight') { e.preventDefault(); engine.setScene((selected + 1) % scenes.length); }
    if(e.code === 'ArrowLeft') { e.preventDefault(); engine.setScene((selected + scenes.length - 1) % scenes.length); }
    if(e.code === 'KeyM') toggleSound();
    if(e.code === 'KeyF') toggleFullscreen();
    if(e.code === 'KeyH') setImmersed(!immersed);
  });
  document.addEventListener('visibilitychange', () => audio?.setVisible(!document.hidden));
  setInterval(() => {
    if(document.hidden || paused) return;
    $('journey-progress').style.width = Math.min(100, engine.sceneElapsed / engine.sceneDuration * 100) + '%';
  }, 500);
})();
