(() => {
  'use strict';
  const page = document.getElementById('story-page');
  if (!page) return;
  const audio = document.getElementById('voicebook-audio');
  const mini = document.getElementById('mini-player');
  const status = document.getElementById('audio-status');
  const seek = document.getElementById('audio-seek');
  const abstract = document.getElementById('abstract');
  const tools = document.querySelector('.site-tools');
  const toggles = [...document.querySelectorAll('[data-audio-toggle]')];
  let startedByReader = false, miniDismissed = false, playPending = false, audioFailed = false;
  const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const timeLabel = seconds => {
    if (!Number.isFinite(seconds)) return '--:--';
    const whole = Math.max(0, Math.floor(seconds));
    return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, '0')}`;
  };
  function navigateTo(id) {
    const target = document.getElementById(id);
    if (!target) return;
    if (!target.hasAttribute('tabindex')) {
      target.tabIndex = -1;
      target.addEventListener('blur', () => target.removeAttribute('tabindex'), { once: true });
    }
    target.focus({ preventScroll: true });
    target.scrollIntoView({ behavior: reducedMotion() ? 'auto' : 'smooth', block: 'start' });
    // Native hash navigation remains functional on file:// and needs no History API.
  }
  page.addEventListener('click', event => {
    const link = event.target.closest('a[href^="#"]');
    if (!link || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const id = link.getAttribute('href').slice(1);
    if (!document.getElementById(id)) return;
    event.preventDefault();
    navigateTo(id);
  });
  document.getElementById('chapter-select').addEventListener('change', event => navigateTo(event.target.value));
  window.addEventListener('hashchange', () => {
    const id = window.location.hash.slice(1);
    if (id) navigateTo(id);
  });
  function updateToolsHeight() {
    document.documentElement.style.setProperty('--story-tools-height', `${tools.offsetHeight}px`);
  }
  function updateMini() {
    const bounds = abstract.getBoundingClientRect();
    const away = bounds.bottom <= tools.offsetHeight || bounds.top >= window.innerHeight;
    const show = startedByReader && !miniDismissed && !audio.error && !audioFailed && away;
    if (mini.hidden === show) { mini.hidden = !show; updateToolsHeight(); }
  }
  function updateAudio() {
    const playing = !audio.paused && !audio.ended;
    toggles.forEach(button => {
      button.textContent = playPending ? 'Loading…' : playing ? 'Pause' : 'Play';
      button.setAttribute('aria-label', playing ? 'Pause story summary' : 'Play story summary');
      button.disabled = playPending;
    });
    const duration = Number.isFinite(audio.duration) ? audio.duration : 0;
    seek.disabled = !duration;
    seek.max = String(duration || 1);
    seek.value = String(audio.currentTime || 0);
    document.getElementById('audio-current').textContent = timeLabel(audio.currentTime);
    document.getElementById('audio-duration').textContent = timeLabel(audio.duration);
    document.getElementById('mini-time').textContent = timeLabel(audio.currentTime);
    document.getElementById('mini-progress').max = duration || 1;
    document.getElementById('mini-progress').value = audio.currentTime || 0;
    updateMini();
  }
  function audioUnavailable() {
    audioFailed = true;
    playPending = false;
    status.textContent = 'The Voicebook audio has not been added or could not be loaded. You can continue reading and use the interactives below.';
    mini.hidden = true; updateAudio(); updateToolsHeight();
  }
  async function toggleAudio() {
    if (playPending) return;
    if (!audio.paused) { audio.pause(); return; }
    playPending = true; status.textContent = 'Loading the story summary…'; updateAudio();
    try {
      if (audio.error || audioFailed) { audioFailed = false; audio.load(); }
      await audio.play();
      startedByReader = true;
      status.textContent = 'Playing the audio summary of the entire investigation.';
    } catch (_) { audioUnavailable(); }
    finally { playPending = false; updateAudio(); }
  }
  toggles.forEach(button => button.addEventListener('click', toggleAudio));
  audio.volume = 0.8;
  audio.addEventListener('error', audioUnavailable);
  audio.addEventListener('loadedmetadata', () => { audioFailed = false; });
  audio.querySelector('source').addEventListener('error', audioUnavailable);
  ['loadedmetadata', 'durationchange', 'timeupdate', 'play', 'pause', 'ended'].forEach(name => audio.addEventListener(name, updateAudio));
  audio.addEventListener('pause', () => { if (!audio.error && !audioFailed) status.textContent = 'Paused. Press Play to continue from this position.'; });
  audio.addEventListener('ended', () => { status.textContent = 'Story summary complete. Continue with the story below.'; });
  seek.addEventListener('input', () => {
    if (Number.isFinite(audio.duration)) { audio.currentTime = Math.min(audio.duration, Math.max(0, Number(seek.value))); updateAudio(); }
  });
  document.getElementById('audio-volume').addEventListener('input', event => { audio.volume = Number(event.target.value); });
  document.getElementById('dismiss-mini').addEventListener('click', () => {
    miniDismissed = true; mini.hidden = true; updateToolsHeight();
    // Dismiss the controls, not the audio; the full player remains available.
    const select = document.getElementById('chapter-select');
    if (select.offsetParent) select.focus({ preventScroll: true });
    else document.querySelector('.wordmark').focus({ preventScroll: true });
  });
  const chapterIds = ['hero', 'abstract', 'game', 'students', 'employers', 'law', 'government', 'insights', 'calculator', 'conclusion'];
  const chapters = chapterIds.map(id => document.getElementById(id));
  let scheduled = false;
  function updateReadingPosition() {
    scheduled = false;
    const threshold = tools.offsetHeight + 65;
    let current = 'hero';
    chapters.forEach(section => { if (section.getBoundingClientRect().top <= threshold) current = section.id; });
    document.querySelectorAll('.desktop-links a').forEach(link => {
      if (link.getAttribute('href') === `#${current}`) link.setAttribute('aria-current', 'location');
      else link.removeAttribute('aria-current');
    });
    document.getElementById('chapter-select').value = current;
    const range = document.documentElement.scrollHeight - window.innerHeight;
    const fraction = range > 0 ? Math.max(0, Math.min(1, window.scrollY / range)) : 0;
    document.getElementById('reading-progress-fill').style.width = `${fraction * 100}%`;
    updateMini();
  }
  function scheduleUpdate() { if (!scheduled) { scheduled = true; requestAnimationFrame(updateReadingPosition); } }
  window.addEventListener('scroll', scheduleUpdate, { passive: true });
  window.addEventListener('resize', () => { updateToolsHeight(); scheduleUpdate(); });
  new ResizeObserver(() => { updateToolsHeight(); scheduleUpdate(); }).observe(tools);
  new ResizeObserver(scheduleUpdate).observe(document.querySelector('main'));
  // Integration only: adjust heading semantics, leaving each component's logic intact.
  function nestComponentHeadings(id, levels) {
    const root = document.getElementById(id);
    const update = () => root.querySelectorAll(Object.keys(levels).join(',')).forEach(heading => {
      heading.setAttribute('aria-level', levels[heading.tagName.toLowerCase()]);
    });
    new MutationObserver(update).observe(root, { childList: true, subtree: true });
    update();
  }
  nestComponentHeadings('internship-game', { h1: '3', h2: '3', h3: '4' });
  nestComponentHeadings('internship-calculator', { h2: '3', h3: '4', h4: '5' });
  updateToolsHeight(); updateAudio(); updateReadingPosition();
  // Deferred component scripts mount before this file; re-align direct links once layout is ready.
  if (window.location.hash) requestAnimationFrame(() => navigateTo(window.location.hash.slice(1)));
})();
