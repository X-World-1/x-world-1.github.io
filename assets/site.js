(() => {
  'use strict';

  const $ = (selector) => document.querySelector(selector);
  const languageButtons = [...document.querySelectorAll('button[data-lang]')];
  const menuToggle = $('#menu-toggle');
  const siteHeader = $('#site-header');
  const siteLinks = $('#site-links');
  const videos = [...document.querySelectorAll('video.demo-video')];
  const mediaStates = new Map();
  const pendingPlayback = new WeakSet();
  const copyButton = $('#copy-citation');
  const copyStatus = $('#copy-status');

  // Each page load starts in English; switching languages affects this visit only.
  let language = 'en';
  let copyState = '';
  let copyTimer;

  const messages = {
    copied: { en: 'Citation copied.', zh: '引用已复制。' },
    copyFailed: { en: 'Could not copy. Select and copy the citation below.', zh: '复制失败，请选中下方引用文本手动复制。' },
    mediaFailed: { en: 'This demonstration could not be loaded. Please reload the page to retry.', zh: '这段演示暂时无法加载，请刷新页面重试。' },
    playFailed: { en: 'Automatic playback is blocked by the browser. Interact with the page to retry.', zh: '浏览器暂时阻止了自动播放，可与页面交互后重试。' }
  };

  function renderStatus() {
    if (copyStatus) copyStatus.textContent = copyState ? messages[copyState][language] : '';
    videos.forEach((video) => {
      const message = video.closest('.demo-card')?.querySelector('.media-error');
      const state = mediaStates.get(video);
      if (!message) return;
      message.hidden = !state;
      message.textContent = state ? messages[state][language] : '';
    });
  }

  function updateMenuLabel() {
    if (!menuToggle || !siteHeader) return;
    const open = siteHeader.classList.contains('is-open');
    menuToggle.setAttribute('aria-expanded', String(open));
    menuToggle.setAttribute('aria-label', language === 'zh'
      ? (open ? '关闭菜单' : '打开菜单')
      : (open ? 'Close menu' : 'Open menu'));
  }

  function setLanguage(next) {
    language = next === 'zh' ? 'zh' : 'en';
    document.documentElement.lang = language === 'zh' ? 'zh-CN' : 'en';
    document.title = language === 'zh'
      ? 'X-World 1.0 — 可控多摄像头世界模型'
      : 'X-World 1.0 — Controllable Multi-Camera World Model';
    document.querySelectorAll('[data-en][data-zh]').forEach((element) => {
      element.textContent = element.dataset[language];
    });
    document.querySelectorAll('[data-label-en][data-label-zh]').forEach((element) => {
      element.setAttribute('aria-label', language === 'zh' ? element.dataset.labelZh : element.dataset.labelEn);
    });
    languageButtons.forEach((button) => {
      button.setAttribute('aria-pressed', String(button.dataset.lang === language));
    });
    renderStatus();
    updateMenuLabel();
  }

  languageButtons.forEach((button) => {
    button.addEventListener('click', () => setLanguage(button.dataset.lang));
  });

  function closeMenu(returnFocus = false) {
    if (!siteHeader) return;
    const wasOpen = siteHeader.classList.contains('is-open');
    siteHeader.classList.remove('is-open');
    updateMenuLabel();
    if (wasOpen && returnFocus && menuToggle) menuToggle.focus();
  }

  if (menuToggle && siteHeader) {
    menuToggle.addEventListener('click', () => {
      siteHeader.classList.toggle('is-open');
      updateMenuLabel();
    });
  }
  if (siteLinks) {
    siteLinks.querySelectorAll('a').forEach((link) => link.addEventListener('click', () => closeMenu()));
  }
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') closeMenu(true);
  });

  function startPlayback(video) {
    if (!video.paused || video.error || pendingPlayback.has(video)) return;
    pendingPlayback.add(video);
    let request;
    try {
      request = video.play();
    } catch (_) {
      pendingPlayback.delete(video);
      mediaStates.set(video, 'playFailed');
      renderStatus();
      return;
    }
    Promise.resolve(request).catch((error) => {
      // Loading a source or browser lifecycle changes can abort a pending request.
      if (error.name === 'AbortError') return;
      mediaStates.set(video, video.error ? 'mediaFailed' : 'playFailed');
      renderStatus();
    }).finally(() => pendingPlayback.delete(video));
  }

  videos.forEach((video) => {
    video.muted = true;
    video.defaultMuted = true;
    video.autoplay = true;
    video.loop = true;
    video.playsInline = true;
    video.controls = false;
    video.disablePictureInPicture = true;
    video.disableRemotePlayback = true;
    video.addEventListener('canplay', () => startPlayback(video), { once: true });
    video.addEventListener('error', () => {
      mediaStates.set(video, 'mediaFailed');
      renderStatus();
    });
    video.addEventListener('playing', () => {
      mediaStates.delete(video);
      renderStatus();
    });
    if (video.readyState >= 2) startPlayback(video);
  });

  function retryPlayback() {
    videos.forEach(startPlayback);
  }
  // A genuine user interaction can unlock playback under stricter browser policies.
  document.addEventListener('pointerdown', retryPlayback, { once: true, passive: true });
  document.addEventListener('keydown', retryPlayback, { once: true });
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') retryPlayback();
  });

  async function copyText(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      try {
        await navigator.clipboard.writeText(text);
        return true;
      } catch (_) { /* Try the user-initiated selection fallback below. */ }
    }
    const previousFocus = document.activeElement;
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.setAttribute('readonly', '');
    textarea.style.cssText = 'position:fixed;left:-9999px;top:0;';
    document.body.appendChild(textarea);
    textarea.select();
    let success = false;
    try { success = document.execCommand('copy'); } catch (_) { /* Report failure below. */ }
    textarea.remove();
    if (previousFocus && typeof previousFocus.focus === 'function') previousFocus.focus({ preventScroll: true });
    return success;
  }

  if (copyStatus) copyStatus.setAttribute('aria-live', 'polite');
  if (copyButton) {
    copyButton.addEventListener('click', async () => {
      const code = $('#citation-code');
      if (!code || copyButton.disabled) return;
      copyButton.disabled = true;
      let success = false;
      try { success = await copyText(code.textContent.trim()); } catch (_) { /* Show failure. */ }
      copyButton.disabled = false;
      copyState = success ? 'copied' : 'copyFailed';
      renderStatus();
      clearTimeout(copyTimer);
      copyTimer = setTimeout(() => {
        copyState = '';
        renderStatus();
      }, success ? 3000 : 7000);
    });
  }

  setLanguage(language);
})();
