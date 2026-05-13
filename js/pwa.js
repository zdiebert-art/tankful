/* ============================================
   TANKFUL — PWA glue
   - Registers the service worker (only over https, which GitHub
     Pages provides; localhost is also allowed as an exception).
   - Listens for the browser's `beforeinstallprompt` event and
     surfaces a subtle "Add to Home Screen" pill the first time
     the user is on a device that can install.
   - On iOS Safari, there's no programmatic install API, so we
     show a one-time hint with the manual share-sheet steps.
   ============================================ */

(function () {
  'use strict';

  // ---------- Service worker ----------
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js').catch((err) => {
        console.warn('[pwa] service worker registration failed:', err);
      });
    });
  }

  // ---------- Install prompt (Chrome / Edge / Android) ----------
  let deferredPrompt = null;
  const DISMISS_KEY = 'tankful_install_dismissed_v1';

  function isStandalone() {
    return (
      window.matchMedia('(display-mode: standalone)').matches ||
      window.navigator.standalone === true
    );
  }

  function dismissed() {
    try { return localStorage.getItem(DISMISS_KEY) === '1'; }
    catch (e) { return false; }
  }

  function setDismissed() {
    try { localStorage.setItem(DISMISS_KEY, '1'); } catch (e) {}
  }

  function ensureBarMarkup() {
    if (document.getElementById('installBar')) return;
    const bar = document.createElement('div');
    bar.id = 'installBar';
    bar.className = 'install-bar';
    bar.innerHTML =
      '<div class="install-bar-text">' +
      '<strong>Install Tankful</strong>' +
      '<span class="install-bar-sub" id="installBarSub">Add to your home screen for quick access.</span>' +
      '</div>' +
      '<div class="install-bar-actions">' +
      '<button type="button" class="install-bar-btn primary" id="installBarYes">Install</button>' +
      '<button type="button" class="install-bar-btn ghost"   id="installBarNo">Not now</button>' +
      '</div>';
    document.body.appendChild(bar);
  }

  function show(opts) {
    ensureBarMarkup();
    const bar  = document.getElementById('installBar');
    const sub  = document.getElementById('installBarSub');
    const yes  = document.getElementById('installBarYes');
    const no   = document.getElementById('installBarNo');
    if (opts && opts.sub) sub.textContent = opts.sub;
    if (opts && opts.hideYes) yes.style.display = 'none';
    bar.classList.add('show');
    no.onclick = () => { setDismissed(); bar.classList.remove('show'); };
    return { yes, no, bar };
  }

  // Chrome / Edge / Android path — wait for beforeinstallprompt.
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    if (isStandalone() || dismissed()) return;

    const ui = show();
    ui.yes.onclick = async () => {
      ui.bar.classList.remove('show');
      try {
        await deferredPrompt.prompt();
        const choice = await deferredPrompt.userChoice;
        if (choice && choice.outcome === 'dismissed') setDismissed();
      } catch (err) {
        console.warn('[pwa] install prompt failed:', err);
      } finally {
        deferredPrompt = null;
      }
    };
  });

  // iOS Safari path — no API, hint with the manual share-sheet steps.
  function isIOSSafari() {
    const ua = navigator.userAgent || '';
    const isIOS = /iPad|iPhone|iPod/.test(ua) ||
      (navigator.platform === 'MacIntel' && (navigator.maxTouchPoints || 0) > 1);
    const isSafari = /^((?!chrome|android|crios|fxios|edgios).)*safari/i.test(ua);
    return isIOS && isSafari;
  }

  window.addEventListener('load', () => {
    if (isStandalone() || dismissed()) return;
    if (!isIOSSafari()) return;
    // Slight delay so this doesn't fight the initial page render.
    setTimeout(() => {
      const ui = show({
        sub: 'Tap the Share button, then "Add to Home Screen".',
        hideYes: true
      });
      // No accept button on iOS, just dismissal.
      ui.no.textContent = 'Got it';
    }, 1500);
  });

  // Hide the bar if the app gets installed while it's open.
  window.addEventListener('appinstalled', () => {
    const bar = document.getElementById('installBar');
    if (bar) bar.classList.remove('show');
    setDismissed();
  });
})();
