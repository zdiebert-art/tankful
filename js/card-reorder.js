/* ============================================
   TANKFUL — Card reorder
   Lets the user nudge each dashboard card up or down. Order is
   persisted per-browser in localStorage; new visitors get the
   default layout.

   Markup contract: each reorderable card carries
     <section data-card-id="..." data-card-label="..."> … </section>
   under .app. This module injects the controls and re-orders the
   children of .app at boot, before any data hydration runs.
   ============================================ */

(function () {
  'use strict';

  const STORAGE_KEY = 'tankful_card_order_v1';

  const ICON_UP =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"' +
    ' stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
    '<path d="m6 14 6-6 6 6"/></svg>';
  const ICON_DOWN =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"' +
    ' stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
    '<path d="m6 10 6 6 6-6"/></svg>';

  // ---------- localStorage helpers ----------
  function loadOrder() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      const arr = JSON.parse(raw);
      return Array.isArray(arr) ? arr : null;
    } catch (e) {
      return null;
    }
  }
  function saveOrder(ids) {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(ids)); }
    catch (e) { /* quota / private-mode — silently ignore */ }
  }

  // ---------- Card discovery ----------
  function getApp() {
    return document.querySelector('main.app') || document.querySelector('.app');
  }
  function getCards(app) {
    return Array.from(app.querySelectorAll(':scope > [data-card-id]'));
  }
  function currentIds(app) {
    return getCards(app).map(el => el.dataset.cardId);
  }

  // ---------- Reorder on boot ----------
  function applySavedOrder(app) {
    const saved = loadOrder();
    if (!saved || !saved.length) return;

    const byId = Object.fromEntries(getCards(app).map(el => [el.dataset.cardId, el]));

    // Append saved cards first, in saved order. Any new cards that weren't in
    // the saved list (e.g. shipped after the user last saved) keep their
    // default position relative to each other and land at the end.
    const moved = new Set();
    saved.forEach(id => {
      const el = byId[id];
      if (!el) return;
      app.appendChild(el);
      moved.add(id);
    });
    Object.entries(byId).forEach(([id, el]) => {
      if (!moved.has(id)) app.appendChild(el);
    });
  }

  // Cards with an existing flex header get the reorder buttons appended
  // inside that header so they sit cleanly next to existing right-side
  // controls (region picker, range tabs). Cards without a header fall back
  // to absolute positioning in the card's top-right corner.
  const HEADER_SELECTORS = [
    '.where-header',
    '.chart-header',
    '.why-header',
    '.tips-title'
  ].join(',');

  // ---------- Controls injection ----------
  function injectControls(app) {
    const cards = getCards(app);
    cards.forEach((card) => {
      // Avoid duplicate injection if this runs twice.
      if (card.querySelector(':scope .card-reorder')) return;

      const label = card.dataset.cardLabel || card.dataset.cardId || 'card';
      const wrap = document.createElement('div');
      wrap.className = 'card-reorder';
      wrap.setAttribute('aria-label', `Reorder ${label} card`);
      wrap.innerHTML =
        `<button type="button" class="card-reorder-btn up"   aria-label="Move ${label} up">${ICON_UP}</button>` +
        `<button type="button" class="card-reorder-btn down" aria-label="Move ${label} down">${ICON_DOWN}</button>`;

      const header = card.querySelector(HEADER_SELECTORS);
      if (header) {
        wrap.classList.add('inline');
        header.appendChild(wrap);
      } else {
        wrap.classList.add('floating');
        card.appendChild(wrap);
      }

      wrap.querySelector('.up').addEventListener('click', (e) => {
        e.preventDefault();
        moveCard(card, -1);
      });
      wrap.querySelector('.down').addEventListener('click', (e) => {
        e.preventDefault();
        moveCard(card, +1);
      });
    });
    refreshBoundaryState(app);
  }

  // ---------- Movement ----------
  function moveCard(card, dir) {
    const app = card.parentNode;
    const siblings = getCards(app);
    const idx = siblings.indexOf(card);
    if (idx < 0) return;

    const target = idx + dir;
    if (target < 0 || target >= siblings.length) return;

    if (dir < 0) {
      app.insertBefore(card, siblings[target]);
    } else {
      // insertBefore the element after the target (or null = append)
      const after = siblings[target].nextElementSibling;
      if (after) app.insertBefore(card, after);
      else app.appendChild(card);
    }

    saveOrder(currentIds(app));
    refreshBoundaryState(app);
    flash(card);
  }

  function refreshBoundaryState(app) {
    const cards = getCards(app);
    cards.forEach((card, i) => {
      const up   = card.querySelector(':scope > .card-reorder .up');
      const down = card.querySelector(':scope > .card-reorder .down');
      if (up)   up.disabled   = (i === 0);
      if (down) down.disabled = (i === cards.length - 1);
    });
  }

  function flash(card) {
    card.classList.remove('card-moved');
    // Force reflow so the animation can restart on rapid taps.
    // eslint-disable-next-line no-unused-expressions
    void card.offsetWidth;
    card.classList.add('card-moved');
  }

  // ---------- Public reset (handy from console) ----------
  window.TANKFUL_resetCardOrder = function () {
    try { localStorage.removeItem(STORAGE_KEY); } catch (e) {}
    location.reload();
  };

  // ---------- Boot ----------
  function init() {
    const app = getApp();
    if (!app) return;
    applySavedOrder(app);
    injectControls(app);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
