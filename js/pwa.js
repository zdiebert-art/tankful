/* ============================================
   TANKFUL — PWA glue
   - Registers the service worker and auto-reloads once when a new
     version takes control (so deploys roll out without manual cache
     clearing).
   - First-visit prompt (Chrome/Edge/Android) via beforeinstallprompt.
   - iOS Safari hint with the manual share-sheet steps.
   - A persistent "Install Tankful" footer button so anyone who
     dismissed earlier or uninstalled later can install again on demand.
   ============================================ */

(function () {
  'use strict';

  // ---------- Service worker registration + auto-reload on update ----------
  let _swRefreshing = false;
  if ('serviceWorker' in navigator) {
    // Reload exactly once when a new SW takes control. The new SW activated
    // (skipWaiting + clients.claim) and is ready to serve fresh content.
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (_swRefreshing) return;
      // Don't reload on the FIRST controller (initial install). Only when a
      // controller already existed and is being replaced.
      if (!sessionStorage.getItem('tankful_had_controller')) return;
      _swRefreshing = true;
      window.location.reload();
    });

    window.addEventListener('load', () => {
      if (navigator.serviceWorker.controller) {
        try { sessionStorage.setItem('tankful_had_controller', '1'); } catch (e) {}
      }
      navigator.serviceWorker.register('/sw.js').then((reg) => {
        // If an update is already waiting when we register, push it through.
        if (reg.waiting) reg.waiting.postMessage('skipWaiting');
        // Watch for new SW installs and tell them to take over immediately.
        reg.addEventListener('updatefound', () => {
          const newWorker = reg.installing;
          if (!newWorker) return;
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              newWorker.postMessage('skipWaiting');
            }
          });
        });
      }).catch((err) => {
        console.warn('[pwa] service worker registration failed:', err);
      });
    });
  }

  // ---------- Install prompt state ----------
  let deferredPrompt = null;
  // Session-scoped dismissal — clears on new tab/session so the prompt isn't
  // permanently silenced for someone who tapped "Not now" weeks ago. The
  // footer "Install Tankful" button is the always-available re-entry.
  const DISMISS_KEY = 'tankful_install_dismissed';

  function isStandalone() {
    return (
      window.matchMedia('(display-mode: standalone)').matches ||
      window.navigator.standalone === true
    );
  }
  function dismissed() {
    try { return sessionStorage.getItem(DISMISS_KEY) === '1'; }
    catch (e) { return false; }
  }
  function setDismissed() {
    try { sessionStorage.setItem(DISMISS_KEY, '1'); } catch (e) {}
  }
  function isIOSSafari() {
    const ua = navigator.userAgent || '';
    const isIOS = /iPad|iPhone|iPod/.test(ua) ||
      (navigator.platform === 'MacIntel' && (navigator.maxTouchPoints || 0) > 1);
    const isSafari = /^((?!chrome|android|crios|fxios|edgios).)*safari/i.test(ua);
    return isIOS && isSafari;
  }

  // ---------- Footer install button (always available) ----------
  // Visible whenever the app isn't running standalone, regardless of any
  // earlier dismissal. Lets users install (or re-install after uninstall)
  // without hunting through browser menus.
  function setupInstallButton() {
    const btn = document.getElementById('installAppBtn');
    if (!btn) return;
    if (isStandalone()) { btn.hidden = true; return; }
    btn.hidden = false;

    btn.addEventListener('click', async () => {
      // Chrome / Edge / Android: use the deferred prompt if we have one.
      if (deferredPrompt) {
        try {
          await deferredPrompt.prompt();
          await deferredPrompt.userChoice;
        } catch (e) {
          console.warn('[pwa] manual install prompt failed:', e);
        } finally {
          deferredPrompt = null;
        }
        return;
      }
      // iOS Safari (or any browser without the API): show the manual hint.
      showIOSHint();
    });
  }

  // ---------- Install bar (first-visit prompt) ----------
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
  function showBar(opts) {
    ensureBarMarkup();
    const bar = document.getElementById('installBar');
    const sub = document.getElementById('installBarSub');
    const yes = document.getElementById('installBarYes');
    const no  = document.getElementById('installBarNo');
    if (opts && opts.sub) sub.textContent = opts.sub;
    if (opts && opts.hideYes) yes.style.display = 'none';
    else yes.style.display = '';
    bar.classList.add('show');
    no.onclick = () => { setDismissed(); bar.classList.remove('show'); };
    return { yes, no, bar };
  }
  function showIOSHint() {
    const ui = showBar({
      sub: 'Tap the Share button, then "Add to Home Screen".',
      hideYes: true
    });
    ui.no.textContent = 'Got it';
  }

  // Chrome / Edge / Android — capture the prompt and offer it immediately
  // (unless dismissed this session).
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    if (isStandalone() || dismissed()) return;

    const ui = showBar();
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

  // iOS Safari — no programmatic prompt; show the manual hint once per session.
  window.addEventListener('load', () => {
    setupInstallButton();
    if (isStandalone() || dismissed()) return;
    if (!isIOSSafari()) return;
    setTimeout(showIOSHint, 1500);
  });

  // Hide the bar + footer button once the app gets installed.
  window.addEventListener('appinstalled', () => {
    const bar = document.getElementById('installBar');
    if (bar) bar.classList.remove('show');
    const btn = document.getElementById('installAppBtn');
    if (btn) btn.hidden = true;
    setDismissed();
  });
})();
