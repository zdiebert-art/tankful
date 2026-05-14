/* ============================================
   TANKFUL — Main App
   Hydrates the UI from TANKFUL_MOCK state
   ============================================ */

(function () {
  'use strict';

  // ---------- Icon library (inline Lucide-style SVG) ----------
  const ICONS = {
    fuel: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="11" height="18" rx="2"/><path d="M3 12h11"/><path d="M14 8h3a2 2 0 0 1 2 2v5a2 2 0 0 0 2 2v-9l-3-3"/></svg>`,
    barrel: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M5 4h14l-1 16H6L5 4Z"/><path d="M4 8h16"/><path d="M4 16h16"/></svg>`,
    currency: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M9 9h4.5a2 2 0 0 1 0 4H10a2 2 0 0 0 0 4H15"/><path d="M12 6v2"/><path d="M12 16v2"/></svg>`,
    'calendar-day': `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4"/><path d="M8 3v4"/><path d="M3 11h18"/><circle cx="12" cy="16" r="1.5" fill="currentColor"/></svg>`,
    'calendar-days': `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4"/><path d="M8 3v4"/><path d="M3 11h18"/><path d="M8 15h.01"/><path d="M12 15h.01"/><path d="M16 15h.01"/></svg>`,
    cycle: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a9 9 0 1 1-3-6.7"/><path d="M21 4v5h-5"/></svg>`,
    range: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M4 18h16"/><circle cx="8" cy="18" r="2" fill="currentColor"/><circle cx="16" cy="18" r="2"/><path d="M8 6l8 0"/><path d="M6 6h0"/><path d="M18 6h0"/></svg>`,
    flag: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M4 21V4h12l-2 5 2 5H4"/></svg>`,
    target: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.5" fill="currentColor"/></svg>`,
    'credit-card': `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 10h18"/><path d="M7 15h2"/></svg>`,
    refinery: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M3 21V9l4 3V9l4 3V9l4 3V6l4 3v12"/><path d="M3 21h18"/></svg>`,
    storm: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M19 16.9A5 5 0 0 0 18 7h-1.26a8 8 0 1 0-11.62 9"/><path d="m13 12-3 5h4l-3 5"/></svg>`
  };

  // ---------- Station brand glyphs ----------
  // Monochrome mini-marks (uses currentColor so it inherits the surrounding
  // text color). Sized as small inline icons next to the brand name —
  // distinctively different from the source-listing treatment which puts
  // colored logos in prominent circles. Keep silhouettes simple enough to
  // read at ~20-22px.
  const STATION_LOGOS = {
    // Petro-Canada — Canadian maple leaf (11-point silhouette with stem)
    petrocanada: `<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 1.5l-1.2 3.6-2.6-.8.8 2.7-3.5-.2 1.7 3-3.3 1.5 3.6 1 -.7 1.7 4 .2-.2 2 2.8-.6.6 5.4h1.6l.6-5.4 2.8.6-.2-2 4-.2-.7-1.7 3.6-1-3.3-1.5 1.7-3-3.5.2.8-2.7-2.6.8z"/></svg>`,

    // Chevron — two stacked chevron arrows
    chevron: `<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M3 11.5L12 5l9 6.5-2 1.6L12 8l-7 5.1zm0 6L12 11l9 6.5-2 1.6L12 14l-7 5.1z"/></svg>`,

    // Shell — scallop / fan silhouette with ribs
    shell: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 19c-.6-9 3-15 9-15s9.6 6 9 15z"/><path d="M12 4v15M7.5 4.6L9 19M16.5 4.6L15 19M4.5 7L6.5 19M19.5 7L17.5 19"/></svg>`,

    // Husky — bold "H" (the actual husky+mountains mark is too detailed
    // for a 22px icon — letter monogram is the clean fallback)
    husky: `<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M5 4v16h3v-7h8v7h3V4h-3v6H8V4z"/></svg>`,

    // Canco — bold "C"
    canco: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" aria-hidden="true"><path d="M19 7.5a7 7 0 1 0 0 9"/></svg>`,

    // Super Save — "$"
    supersave: `<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M13 3v2.2c2.4.4 3.8 1.5 4.3 3.4l-2 .55c-.4-1.3-1.5-1.95-3.3-1.95-1.7 0-2.7.7-2.7 1.85 0 1.2 1 1.5 3 2 2.6.6 5 1.4 5 4 0 2-1.5 3.4-4.3 3.7V21h-2v-2.25c-2.6-.3-4.1-1.5-4.6-3.6l2-.5c.4 1.4 1.5 2.1 3.7 2.1 1.95 0 3-.7 3-1.85 0-1.2-1-1.5-3.1-2-2.6-.6-4.9-1.4-4.9-3.9 0-1.9 1.4-3.3 4.2-3.6V3z"/></svg>`,

    // Parkway — bold "P"
    parkway: `<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M6 4v16h3v-6h3.5a5 5 0 0 0 0-10zm3 3h3.5a2 2 0 0 1 0 4H9z"/></svg>`
  };

  // Map a brand string ("Petro-Canada", "Super Save", "Shell") to a logo
  // key — strip non-letters, lowercase, then look up.
  function stationLogoFor(brand) {
    if (!brand) return null;
    const key = brand.toLowerCase().replace(/[^a-z]/g, '');
    return STATION_LOGOS[key] || null;
  }

  // ---------- DOM refs ----------
  const $ = (sel) => document.querySelector(sel);
  const els = {
    body: document.body,
    scoreNumber: $('#scoreNumber'),
    ringFill: document.querySelector('.ring-fill'),
    verdict: $('#verdict'),
    verdictSub: $('#verdictSub'),
    indicators: $('#indicators'),
    modifiersRow: $('#modifiersRow'),
    tipsList: $('#tipsList'),
    lastUpdated: $('#lastUpdated'),
    themeMeta: $('#theme-color-meta'),
    tabs: document.querySelectorAll('.tab'),
    regionPicker: $('#regionPicker'),
    dealHero: $('#dealHero'),
    stationList: $('#stationList'),
    scoreLegend: $('#scoreLegend'),
    chartCard: $('.chart-card'),
    liveStatus: $('#liveStatus'),
    locationBtn: $('#locationBtn'),
    whereFreshness: $('#whereFreshness')
  };

  // Module-level user location — shared across renders. Populated by either
  // the silent restore on boot (if permission already granted) or the
  // Show-Distance button.
  let userLocation = null;

  // ---------- Apply state theme ----------
  function applyState(state) {
    els.body.dataset.state = state;
    if (els.themeMeta) {
      const themeColor = getComputedStyle(document.body)
        .getPropertyValue('--theme-meta').trim();
      els.themeMeta.setAttribute('content', themeColor);
    }
  }

  // ---------- Animate score number count-up ----------
  function animateScore(target) {
    const duration = 1400;
    const start = performance.now();
    function step(now) {
      const elapsed = now - start;
      const t = Math.min(1, elapsed / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      els.scoreNumber.textContent = Math.round(target * eased);
      if (t < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }

  // ---------- Animate ring fill ----------
  function animateRing(score) {
    const circumference = 2 * Math.PI * 86;
    const offset = circumference - (score / 100) * circumference;
    requestAnimationFrame(() => {
      els.ringFill.style.strokeDashoffset = offset;
    });
  }

  function renderVerdict(state) {
    els.verdict.textContent = state.verdict;
    els.verdictSub.textContent = state.verdictSub;
  }

  // (Hero used to display a "Today in Lake Country — 199.5¢/L" market-average
  // pill. Removed because the number was an average without saying so and
  // wasn't actionable. Station-level prices live in the "Where to fill up"
  // card, which is the useful surface.)

  // Pretty-format a signed score contribution: "+5", "−3", or "" for zero.
  function fmtContrib(n) {
    if (!Number.isFinite(n) || n === 0) return '';
    return n > 0 ? `+${Math.round(n)}` : `−${Math.abs(Math.round(n))}`;
  }

  function renderIndicators(components) {
    const html = Object.entries(components).map(([key, c]) => {
      // Indicators that need a history pipeline render in a dimmed
      // "pending" state with no impact badge — they don't pretend to
      // be live data.
      if (c.pending) {
        return `
          <div class="indicator indicator-pending" title="${c.detail}">
            <div class="indicator-top">
              <div class="indicator-icon">${ICONS[c.icon] || ICONS.fuel}</div>
            </div>
            <div class="indicator-name">${c.name}</div>
            <div class="indicator-trend">${c.trend}</div>
          </div>
        `;
      }
      const contrib = typeof c.impact === 'number' ? c.impact : 0;
      const label = fmtContrib(contrib);
      let badgeHtml = '';
      if (label) {
        const cls = contrib > 0 ? 'indicator-impact pos' : 'indicator-impact neg';
        badgeHtml = `<div class="${cls}">${label}</div>`;
      }
      return `
        <div class="indicator" title="${c.detail}">
          <div class="indicator-top">
            <div class="indicator-icon">${ICONS[c.icon] || ICONS.fuel}</div>
            ${badgeHtml}
          </div>
          <div class="indicator-name">${c.name}</div>
          <div class="indicator-trend">${c.trend}</div>
        </div>
      `;
    }).join('');
    els.indicators.innerHTML = html;
  }

  // ---------- Score breakdown panel ----------
  // Lists every signed contribution that produced the current score.
  // Lives in a <details> element under the verdict so it can be tap-expanded.
  function renderBreakdown(breakdown) {
    const host = document.getElementById('breakdownList');
    const summary = document.getElementById('breakdownSummary');
    if (!host) return;

    if (!Array.isArray(breakdown) || breakdown.length === 0) {
      host.innerHTML = '<li class="breakdown-empty">No signals strong enough to move the score off neutral.</li>';
      if (summary) summary.textContent = "What's driving this score?";
      return;
    }

    if (summary) {
      const n = breakdown.length;
      summary.textContent = `What's driving this score? (${n} signal${n === 1 ? '' : 's'})`;
    }

    host.innerHTML = breakdown.map(b => {
      const icon = ICONS[b.icon] || ICONS.target;
      const label = fmtContrib(b.contrib);
      const sign = b.contrib > 0 ? 'pos' : (b.contrib < 0 ? 'neg' : 'zero');
      return `
        <li class="breakdown-item ${sign}">
          <span class="breakdown-icon">${icon}</span>
          <div class="breakdown-text">
            <span class="breakdown-name">${b.name}</span>
            ${b.detail ? `<span class="breakdown-detail">${b.detail}</span>` : ''}
          </div>
          <span class="breakdown-contrib">${label}</span>
        </li>
      `;
    }).join('');
  }

  // Merge the user's manual refinery-outage alert into the modifiers list
  // (if active). Render-time helper so we don't mutate state.modifiers.
  function modifiersWithAlerts(modifiers) {
    const list = Array.isArray(modifiers) ? modifiers.slice() : [];
    if (typeof TANKFUL_RefineryAlert !== 'undefined') {
      const alert = TANKFUL_RefineryAlert.asModifier();
      if (alert) list.unshift(alert);
    }
    return list;
  }

  function renderModifiers(modifiers) {
    const list = modifiersWithAlerts(modifiers);
    if (!list.length) {
      els.modifiersRow.innerHTML = '';
      return;
    }
    const html = list.map(m => {
      const icon = ICONS[m.icon] || ICONS.flag;
      const isActive = m.active === true;
      const impactBadge = m.impact > 0
        ? `<span class="impact">+${m.impact}</span>`
        : '';
      const extraCls = m._kind === 'refinery' ? ' clearable' : '';
      const dataAttr = m._kind ? ` data-kind="${m._kind}"` : '';
      const cls = (isActive ? 'modifier-chip active' : 'modifier-chip') + extraCls;
      return `
        <div class="${cls}"${dataAttr}>
          <span class="modifier-icon">${icon}</span>
          <div class="modifier-text">
            <span class="modifier-name">${m.name}</span>
            <span class="modifier-detail">${m.detail}</span>
          </div>
          ${impactBadge}
        </div>
      `;
    }).join('');
    els.modifiersRow.innerHTML = html;

    // Click on a refinery chip → clear the alert.
    const refineryChip = els.modifiersRow.querySelector('[data-kind="refinery"]');
    if (refineryChip) {
      refineryChip.style.cursor = 'pointer';
      refineryChip.addEventListener('click', () => {
        if (typeof TANKFUL_RefineryAlert !== 'undefined') {
          TANKFUL_RefineryAlert.clear();
          refreshAfterAlertChange();
        }
      });
    }
  }

  // Triggered when the refinery alert flips. Re-renders the modifiers chip,
  // recomputes the verdict (so the score updates), and repaints the header
  // button state.
  function refreshAfterAlertChange() {
    renderModifiers(TANKFUL_MOCK.modifiers);
    updateRefineryButton();
    const verdict = computeLiveVerdict(TANKFUL_MOCK);
    TANKFUL_MOCK.score = verdict.score;
    TANKFUL_MOCK.state = verdict.state;
    TANKFUL_MOCK.verdict = verdict.verdict;
    TANKFUL_MOCK.verdictSub = verdict.verdictSub;
    TANKFUL_MOCK.breakdown = verdict.breakdown;
    syncIndicatorImpacts(TANKFUL_MOCK, verdict.breakdown);
    renderIndicators(TANKFUL_MOCK.components);
    applyState(verdict.state);
    animateScore(verdict.score);
    animateRing(verdict.score);
    renderVerdict(TANKFUL_MOCK);
    renderBreakdown(verdict.breakdown);
    renderLegend(verdict.state);
    // Tips refer to active modifiers, so refresh those too.
    TANKFUL_MOCK.tips = computeLiveTips(TANKFUL_MOCK, null);
    renderTips(TANKFUL_MOCK.tips);
  }

  function updateRefineryButton() {
    const btn = document.getElementById('refineryAlertBtn');
    if (!btn || typeof TANKFUL_RefineryAlert === 'undefined') return;
    const active = TANKFUL_RefineryAlert.active();
    btn.classList.toggle('active', active);
    btn.querySelector('.alert-toggle-label').textContent =
      active ? 'Outage active' : 'Supply alert';
  }

  function renderTips(tips) {
    const html = tips.map(t => {
      const icon = ICONS[t.icon] || ICONS.target;
      return `
        <li class="tip">
          <span class="tip-icon">${icon}</span>
          <span class="tip-body">${t.html}</span>
        </li>
      `;
    }).join('');
    els.tipsList.innerHTML = html;
  }

  // Friendly relative time: "just now" / "12m ago" / "3h ago" / "2d ago".
  // Falls back to null for invalid input so callers can hide the line.
  function formatRelativeTime(iso) {
    if (!iso) return null;
    const then = Date.parse(iso);
    if (!Number.isFinite(then)) return null;
    const diffSec = Math.max(0, (Date.now() - then) / 1000);
    if (diffSec < 60) return 'just now';
    const min = Math.round(diffSec / 60);
    if (min < 60) return min + 'm ago';
    const hr = Math.round(min / 60);
    if (hr < 24) return hr + 'h ago';
    const days = Math.round(hr / 24);
    return days + 'd ago';
  }

  // Show how long ago the GasBuddy scrape was committed. The cron commits to
  // data/lake-country-prices.json every 4h; we pull `fetchedAt` from the JSON
  // and surface it in the where-card title. Tooltip carries the exact local
  // timestamp for desktop hover; the visible text is short enough for mobile.
  function renderWhereFreshness(live) {
    const el = els.whereFreshness;
    if (!el) return;
    const fetchedAt = live && live.stations && live.stations.success
      ? live.stations.fetchedAt
      : null;
    const rel = formatRelativeTime(fetchedAt);
    if (!rel) {
      el.hidden = true;
      el.removeAttribute('title');
      return;
    }
    el.hidden = false;
    el.textContent = '· Updated ' + rel;

    // Tooltip: last refresh (absolute) + countdown to the next one.
    // The cron runs at minute 0 every 4h, so next fetch ≈ last + 4h.
    const d = new Date(fetchedAt);
    const opts = { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' };
    const last = d.toLocaleString('en-CA', opts);

    const nextMs = d.getTime() + 4 * 60 * 60 * 1000;
    const untilSec = Math.max(0, (nextMs - Date.now()) / 1000);
    let nextRel;
    if (untilSec < 60) {
      nextRel = 'any minute now';
    } else if (untilSec < 3600) {
      nextRel = 'in ~' + Math.round(untilSec / 60) + 'm';
    } else {
      const h = Math.floor(untilSec / 3600);
      const m = Math.round((untilSec - h * 3600) / 60);
      nextRel = 'in ~' + h + 'h' + (m ? ' ' + m + 'm' : '');
    }
    el.title = 'Last refresh: ' + last + '\nNext refresh: ' + nextRel;
  }

  function renderLastUpdated(iso) {
    const d = new Date(iso);
    const opts = { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' };
    els.lastUpdated.textContent = d.toLocaleString('en-CA', opts);
  }

  // Mock station entries keep useful UI metadata (Canco card discount, brand
  // labels) that the scraper doesn't produce. Map by scraper ID → mock ID so
  // we can carry that metadata across when we overlay live prices.
  // brand = the fuel brand line (bold). cstore = the convenience-store
  // co-brand if the station has one ("& 7-Eleven" / "& CO-OP" / etc.).
  // Pattern mirrors how the source listing pairs a fuel brand with an
  // optional in-store co-brand.
  const STATION_OVERLAY = {
    'canco':     { mockId: 'canco-woodsdale', brand: 'Canco',        cstore: 'One Stop', discount: { type: 'card', amount: 2.0, label: 'with Canco card' } },
    'petrocan':  { mockId: 'petro-711',       brand: 'Petro-Canada', cstore: '7-Eleven', discount: null },
    'supersave': { mockId: 'supersave-lc',    brand: 'Super Save',   cstore: null,       discount: null },
    'husky':     { mockId: 'husky-97',        brand: 'Husky',        cstore: 'CO-OP',    discount: null },
    'parkway':   { mockId: null,              brand: 'Parkway',      cstore: null,         discount: null },
    'shell-lc':  { mockId: null,              brand: 'Shell',        cstore: null,         discount: null },
    'chevron':   { mockId: null,              brand: 'Chevron',      cstore: 'On the Run', discount: null }
  };

  // Pretty-print a scraped GasBuddy address line for display under the station
  // name. "9724 BC-97" → "9724 Highway 97". The locality already appears on
  // the meta line directly below, so we don't repeat it here.
  function formatStationAddress(raw) {
    if (!raw) return null;
    return String(raw).replace(/\bBC-(\d+)\b/gi, 'Highway $1').trim();
  }

  function applyLiveStations(state, liveStations) {
    if (!liveStations || !liveStations.success) return;

    const mockById = Object.fromEntries((state.stations || []).map(s => [s.id, s]));
    const market = liveStations.marketAverage || state.marketPrice;

    const merged = liveStations.stations.map(s => {
      const overlay = STATION_OVERLAY[s.id] || {};
      const fromMock = overlay.mockId ? mockById[overlay.mockId] : null;
      const discount = overlay.discount || (fromMock && fromMock.discount) || null;
      const effectivePrice = discount ? s.price - discount.amount : s.price;

      return {
        id: overlay.mockId || s.id,
        name: s.name,
        brand: overlay.brand || s.name,
        cstore: overlay.cstore || null,
        area: 'Lake Country',
        address: formatStationAddress(s.address),
        // Raw address (no "Highway 97" rewrite) for Maps deep-links — Apple
        // and Google both prefer the literal address string the postal
        // service knows.
        addressForMaps: s.address,
        lat: s.lat,
        lng: s.lng,
        price: s.price,
        effectivePrice,
        discount,
        notes: s.reportedAgo ? `Reported ${s.reportedAgo.toLowerCase()}` : '',
        reportedBy: s.reportedBy,
        trust: s.trust,
        badge: null  // recomputed below based on live prices
      };
    });

    // Recompute badges from live prices.
    const sorted = [...merged].sort((a, b) => a.effectivePrice - b.effectivePrice);
    if (sorted[0]) sorted[0].badge = 'Best deal';
    merged.forEach(s => {
      if (s.badge) return;
      if (s.price >= market - 0.5) s.badge = 'Market price';
    });

    state.stations = merged;
    state.marketPrice = market;
    state.currentPrice = market;
    if (liveStations.fetchedAt) state.lastUpdated = liveStations.fetchedAt;
  }

  // Map a -1.0..+1.0 normalized signal to a 0..100 indicator value where 50
  // is neutral. Used to turn trend percentages into the score-style scale
  // the existing visuals expect.
  function signalToValue(normalized) {
    const clamped = Math.max(-1, Math.min(1, normalized));
    return Math.round(50 + clamped * 50);
  }

  // The day-of-week pattern in BC: prices typically jump Wed-Fri before the
  // weekend, settle Sun-Tue. Early-week is a "fill bias" (it's about to
  // climb), Fri afternoon onwards is "wait" (you've already been priced).
  function dayOfWeekIndicator() {
    const now = new Date();
    const dow = now.getDay(); // 0 Sun ... 6 Sat
    const names = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];

    // Score = how favorable filling up TODAY is (high = good time)
    const scoreByDow = {
      0: 35, // Sun — usually post-weekend, prices still firm
      1: 70, // Mon — early week, often best
      2: 75, // Tue — typically the trough
      3: 55, // Wed — pre-jump
      4: 25, // Thu — pre-weekend jump common
      5: 30, // Fri — already firmed
      6: 30  // Sat — long-weekend pressure if any
    };
    const detailByDow = {
      0: 'Sunday — weekend pricing still in effect',
      1: 'Monday — early-week, prices often soften',
      2: 'Tuesday — typically the cheapest day of the week',
      3: 'Wednesday — last day before the Thu/Fri jump',
      4: 'Thursday — pre-weekend jump is common',
      5: 'Friday — weekend pricing likely already set',
      6: 'Saturday — weekend pricing in effect'
    };
    return {
      value: scoreByDow[dow],
      trend: names[dow],
      detail: detailByDow[dow]
    };
  }

  // ---------- Live-data patching ----------
  // Takes the result of TANKFUL_LIVE.fetchAll() and overlays it onto the mock state.
  // Mock fields stay intact for any source that failed.
  function applyLiveData(state, live) {
    if (!live) return;

    // Score sign convention: score is "% chance you should fill up NOW"
    // (high → Fill Up Now, low → Wait). So things that signal pump pressure
    // ahead (wholesale rising, loonie weakening) push the indicator's value
    // UP, which contributes positively to the score in computeLiveVerdict.
    if (live.fx && live.fx.success) {
      // FXUSDCAD up = USD strengthening = loonie weakening = imports cost
      // more = pump pressure → fill bias → HIGH value
      const v = signalToValue(live.fx.trendPct / 5);
      state.components.fx.detail = `Loonie at ${live.fx.usdPerCad.toFixed(4)} USD`;
      state.components.fx.trend = live.fx.trendLabel;
      state.components.fx.value = v;
    }

    if (live.wti && live.wti.success) {
      // Crude rising = upstream pressure ahead → fill bias → HIGH value
      const v = signalToValue(live.wti.trendPct / 10);
      state.components.wti.detail = 'USD ' + live.wti.latest.toFixed(2) + '/bbl';
      state.components.wti.trend = live.wti.trendLabel;
      state.components.wti.value = v;
    }

    if (live.rbob && live.rbob.success) {
      let detail = 'USD ' + live.rbob.latest.toFixed(3) + '/gal NYH spot';
      if (live.fx && live.fx.success) {
        const cadPerL = TANKFUL_LIVE.rbobToCadPerLitre(live.rbob.latest, live.fx.latest);
        if (cadPerL) detail += ' (~' + (cadPerL * 100).toFixed(1) + '¢/L wholesale)';
      }
      // RBOB rising = wholesale pressure → fill bias → HIGH value
      const v = signalToValue(live.rbob.trendPct / 8);
      state.components.rbob.detail = detail;
      state.components.rbob.trend = live.rbob.trendLabel;
      state.components.rbob.value = v;
    }

    // Day-of-Week is fully derivable from `new Date()` — no API needed.
    if (state.components.dow) {
      const dow = dayOfWeekIndicator();
      state.components.dow.value = dow.value;
      state.components.dow.trend = dow.trend;
      state.components.dow.detail = dow.detail;
      // Impact is filled in by syncIndicatorImpacts() once computeLiveVerdict
      // has run, so it matches the actual score contribution exactly.
    }

    if (live.stations && live.stations.success) {
      applyLiveStations(state, live.stations);
    }

    if (live.anySuccess) {
      state.lastUpdated = live.fetchedAt;
    }
  }

  // ---------- Live price history → chart series ----------
  // Bucket the scraper's rolling samples into the daily / weekly shape the
  // chart card consumes. Samples are { at: ISO, marketAverage }. We don't
  // try to fill gaps — days with no scrape simply don't appear in the series.
  function bucketDaily(samples, days) {
    const now = new Date();
    const cutoff = now.getTime() - (days * 86400000);
    const buckets = new Map(); // "YYYY-MM-DD" → [prices]

    for (const s of samples) {
      const t = Date.parse(s.at);
      if (!Number.isFinite(t) || t < cutoff) continue;
      const d = new Date(t);
      const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
      const arr = buckets.get(key) || [];
      arr.push(s.marketAverage);
      buckets.set(key, arr);
    }
    return Array.from(buckets.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([date, prices]) => ({
        date,
        price: Math.round((prices.reduce((a,b)=>a+b,0) / prices.length) * 10) / 10
      }));
  }

  function bucketWeekly(samples, weeks) {
    const now = new Date();
    const cutoff = now.getTime() - (weeks * 7 * 86400000);
    const buckets = new Map(); // ISO-week key → [prices]

    function weekKey(d) {
      // Monday-of-week as YYYY-MM-DD, treated as the bucket label.
      const day = d.getDay();
      const diffToMonday = (day === 0 ? -6 : 1 - day);
      const monday = new Date(d.getFullYear(), d.getMonth(), d.getDate() + diffToMonday);
      return `${monday.getFullYear()}-${String(monday.getMonth()+1).padStart(2,'0')}-${String(monday.getDate()).padStart(2,'0')}`;
    }

    for (const s of samples) {
      const t = Date.parse(s.at);
      if (!Number.isFinite(t) || t < cutoff) continue;
      const k = weekKey(new Date(t));
      const arr = buckets.get(k) || [];
      arr.push(s.marketAverage);
      buckets.set(k, arr);
    }
    return Array.from(buckets.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([date, prices]) => ({
        date,
        price: Math.round((prices.reduce((a,b)=>a+b,0) / prices.length) * 10) / 10
      }));
  }

  // Returns a new history object { 7, 30, 365 } if we have enough live samples
  // to be useful (≥3 days of coverage in 30-day view), otherwise null and the
  // caller keeps the mock arrays + shows a "building history" notice.
  function maybeBuildLiveHistory(rawSamples) {
    if (!Array.isArray(rawSamples) || rawSamples.length === 0) return null;
    const thirty = bucketDaily(rawSamples, 30);
    if (thirty.length < 3) return null;
    return {
      7:   bucketDaily(rawSamples, 7),
      30:  thirty,
      365: bucketWeekly(rawSamples, 52)
    };
  }

  // Flag the chart card visually when the chart is showing illustrative
  // sample data (i.e. before the scraper history has enough coverage).
  function setChartSampleBadge(isSample) {
    const card = document.querySelector('.chart-card');
    if (!card) return;
    let badge = card.querySelector('.chart-sample-badge');
    if (isSample) {
      if (!badge) {
        badge = document.createElement('span');
        badge.className = 'chart-sample-badge';
        badge.textContent = 'Sample data — real history is accumulating';
        card.querySelector('.chart-header').appendChild(badge);
      }
    } else if (badge) {
      badge.remove();
    }
  }

  // ---------- Live verdict / score / state ----------
  // Replaces the mock score/verdict/verdictSub by combining live indicators,
  // upcoming holidays, and station spread. Returns the new score block plus
  // the strongest signal that drove it (used for verdictSub).
  function computeLiveVerdict(state) {
    let score = 50; // neutral baseline
    const signals = [];        // for picking the verdict subline
    const breakdown = [];      // every contribution, signed, for the "what's driving" panel

    function push(key, name, contrib, detail, opts) {
      score += contrib;
      breakdown.push({ key, name, contrib, detail, icon: opts && opts.icon });
      if (opts && opts.subline) {
        signals.push({
          strength: opts.strength != null ? opts.strength : Math.abs(contrib),
          text: opts.subline
        });
      }
    }

    // SIGNAL 0: Manual refinery / supply outage — strong fill bias.
    if (typeof TANKFUL_RefineryAlert !== 'undefined') {
      const ref = TANKFUL_RefineryAlert.current();
      if (ref) {
        push('refinery', 'Refinery / supply alert', +12,
          `Manual flag active${ref.daysActive ? ' for ' + ref.daysActive + 'd' : ''}`,
          { icon: 'refinery', strength: 14,
            subline: 'Refinery / supply alert is active — fill before the wholesale shock reaches the pump.' });
      }
    }

    // SIGNAL 1: Active long weekend / stat ahead → fill bias
    const activeMod = (state.modifiers || []).find(m => m.active);
    if (activeMod) {
      push('holiday', activeMod.name, +Math.round(activeMod.impact),
        activeMod.detail,
        { icon: activeMod.icon || 'calendar-days',
          subline: `${activeMod.name} ahead — pre-weekend pump firming is the usual play.` });
    }

    // SIGNAL 2: Best-deal spread vs market
    if (state.stations && state.stations.length && state.marketPrice) {
      const sorted = [...state.stations].sort((a, b) => a.effectivePrice - b.effectivePrice);
      const top = sorted[0];
      const spread = state.marketPrice - top.effectivePrice;
      let contrib = 0;
      if (spread >= 8) contrib = +8;
      else if (spread >= 4) contrib = +4;
      else if (spread >= 1) contrib = +2;
      if (contrib > 0) {
        push('spread', 'Best deal spread', contrib,
          `${top.name} ${spread.toFixed(1)}¢/L cheaper`,
          { icon: 'target',
            subline: contrib >= 8
              ? `${top.name} is ${spread.toFixed(1)}¢/L cheaper than the rest — grab that price now.`
              : `${top.name} is ${spread.toFixed(1)}¢/L cheaper than the rest.`
          });
      }
    }

    // SIGNAL 3: RBOB wholesale trend (the most direct pump-pressure signal)
    const rbob = state.components.rbob;
    if (rbob && typeof rbob.value === 'number') {
      const contrib = Math.round((rbob.value - 50) * 0.3); // up to ±15
      if (contrib !== 0) {
        push('rbob', 'Wholesale gas (RBOB)', contrib,
          rbob.trend || '',
          { icon: 'fuel',
            subline: Math.abs(contrib) >= 6
              ? (contrib > 0
                  ? 'Wholesale gas easing — relief could reach the pump this week.'
                  : 'Wholesale gas firming — pump pressure ahead.')
              : undefined
          });
      }
    }

    // SIGNAL 4: WTI crude — feeds RBOB but earlier in the chain.
    const wti = state.components.wti;
    if (wti && typeof wti.value === 'number') {
      const contrib = Math.round((wti.value - 50) * 0.1); // up to ±5, gentler than RBOB
      if (contrib !== 0) {
        push('wti', 'WTI crude', contrib,
          wti.trend || '',
          { icon: 'barrel' });
      }
    }

    // SIGNAL 5: Day-of-week
    const dow = state.components.dow;
    if (dow && typeof dow.value === 'number') {
      const contrib = Math.round((dow.value - 50) * 0.16); // up to ±8
      if (contrib !== 0) {
        push('dow', dow.trend || 'Day of week', contrib,
          dow.detail || '',
          { icon: 'calendar-day',
            subline: Math.abs(contrib) >= 4
              ? (contrib > 0
                  ? `It's ${dow.trend} — typically a softer-price day.`
                  : `It's ${dow.trend} — weekend pricing usually firm by now.`)
              : undefined
          });
      }
    }

    // SIGNAL 6: FX (CAD weakness costs us)
    const fx = state.components.fx;
    if (fx && typeof fx.value === 'number') {
      const contrib = Math.round((fx.value - 50) * 0.1); // up to ±5
      if (contrib !== 0) {
        push('fx', 'CAD vs USD', contrib,
          fx.trend || '',
          { icon: 'currency' });
      }
    }

    // Clamp + bucket
    score = Math.max(0, Math.min(100, Math.round(score)));
    let bucketState, verdict;
    if (score >= 70) { bucketState = 'fill-up'; verdict = 'Fill Up Now'; }
    else if (score >= 30) { bucketState = 'neutral'; verdict = 'Maybe Today'; }
    else { bucketState = 'wait'; verdict = 'Wait a Bit'; }

    // Pick the strongest signal for the sub-line
    const top = signals.sort((a, b) => b.strength - a.strength)[0];
    const verdictSub = top
      ? top.text
      : 'Mixed signals — no strong push either way today.';

    // Sort breakdown by absolute contribution so the dominant signals lead.
    breakdown.sort((a, b) => Math.abs(b.contrib) - Math.abs(a.contrib));

    return { score, state: bucketState, verdict, verdictSub, breakdown };
  }

  // Sync the live score breakdown back into the indicator component impacts
  // so each chip's "+X" badge reflects what it actually contributed, not the
  // legacy mock value * weight calculation.
  function syncIndicatorImpacts(state, breakdown) {
    const keyMap = { rbob: 'rbob', wti: 'wti', fx: 'fx', dow: 'dow' };
    const byKey = {};
    breakdown.forEach((b) => { byKey[b.key] = b.contrib; });
    Object.entries(keyMap).forEach(([compKey, breakKey]) => {
      const c = state.components[compKey];
      if (!c || c.pending) return;
      c.impact = byKey[breakKey] != null ? byKey[breakKey] : 0;
    });
  }

  function updateLiveStatus(live) {
    if (!els.liveStatus) return;
    const fxOk = live.fx && live.fx.success;
    const wtiOk = live.wti && live.wti.success;
    const rbobOk = live.rbob && live.rbob.success;
    const stationsOk = live.stations && live.stations.success;
    const noKey = !TANKFUL_CONFIG.eiaApiKey || TANKFUL_CONFIG.eiaApiKey.length < 10;

    const parts = [];
    if (stationsOk) {
      const when = live.stations.fetchedAt
        ? new Date(live.stations.fetchedAt).toLocaleTimeString('en-CA', { hour: 'numeric', minute: '2-digit' })
        : null;
      parts.push(when ? `stations @ ${when}` : 'stations');
    }
    if (fxOk) parts.push('FX');
    if (wtiOk && rbobOk) parts.push('oil');
    else if (wtiOk || rbobOk) parts.push('oil (partial)');

    if (parts.length) {
      els.liveStatus.textContent = `Live • ${parts.join(' + ')}`;
    } else if (fxOk && !wtiOk && !rbobOk && noKey) {
      els.liveStatus.textContent = 'Live FX • add EIA key in js/config.js for oil';
    } else {
      els.liveStatus.textContent = 'Live fetch failed — showing mock data';
    }
  }

  // ---------- Live "Quick tips for today" ----------
  // Built from real state (scraped stations, upcoming holidays, RBOB trend)
  // rather than the mock-data scenario blurbs. Returns up to 4 tips in
  // priority order: best-deal spread → active holiday → card stack →
  // RBOB pressure. Falls back to a generic refresh note if fewer than 2
  // tips land.
  function computeLiveTips(state, live) {
    const out = [];

    // -- 1. Best deal vs market --
    if (state.stations && state.stations.length > 0 && state.marketPrice) {
      const sorted = [...state.stations].sort((a, b) => a.effectivePrice - b.effectivePrice);
      const top = sorted[0];
      const spread = state.marketPrice - top.effectivePrice;

      if (spread >= 1.0) {
        const cardSuffix = top.discount
          ? ` ${top.discount.label}`
          : '';
        out.push({
          icon: 'target',
          html: `<strong>Where matters today.</strong> Market average is ${state.marketPrice.toFixed(1)}¢/L but ${top.name} is at ${top.effectivePrice.toFixed(1)}¢/L${cardSuffix} — ${spread.toFixed(1)}¢/L below the rest.`
        });
      }
    }

    // -- 2. Active or upcoming holiday / long weekend --
    if (state.modifiers && state.modifiers.length) {
      const active = state.modifiers.find(m => m.active);
      if (active) {
        out.push({
          icon: 'calendar-days',
          html: `<strong>${active.name} ahead.</strong> ${active.detail}. Pump prices typically firm 2-3 days before a long weekend — fill before Friday if you can.`
        });
      } else {
        const next = state.modifiers[0];
        if (next) {
          out.push({
            icon: 'calendar-day',
            html: `<strong>Next stat: ${next.name}.</strong> ${next.detail}. No pre-weekend price firming pressure yet.`
          });
        }
      }
    }

    // -- 3. Card-discount reminder (only when a card actually wins) --
    if (state.stations) {
      const cardDeals = state.stations.filter(s => s.discount && s.discount.amount > 0);
      if (cardDeals.length) {
        const best = cardDeals.slice().sort((a, b) => a.effectivePrice - b.effectivePrice)[0];
        out.push({
          icon: 'credit-card',
          html: `<strong>Don't forget the ${best.discount.label.replace(/^with\s+/i, '')}.</strong> Pumps at ${best.name} show ${best.price.toFixed(1)}¢, but with the ${best.discount.amount}¢/L card discount you pay ${best.effectivePrice.toFixed(1)}¢.`
        });
      }
    }

    // -- 4. RBOB / FX pressure signal --
    if (live && live.rbob && live.rbob.success && Math.abs(live.rbob.trendPct) >= 2) {
      const trend = live.rbob.trendPct;
      const dir = trend > 0 ? 'up' : 'down';
      const verb = trend > 0 ? 'pressure' : 'relief';
      out.push({
        icon: 'refinery',
        html: `<strong>Wholesale gas (RBOB) is ${dir} ${Math.abs(trend).toFixed(1)}% over 30 days.</strong> Wholesale ${verb} usually shows up at the pump within a week.`
      });
    } else if (live && live.fx && live.fx.success && Math.abs(live.fx.trendPct) >= 1.5) {
      const trend = live.fx.trendPct;
      const dir = trend > 0 ? 'weakening' : 'strengthening';
      out.push({
        icon: 'currency',
        html: `<strong>Loonie ${dir}.</strong> CAD has moved ${Math.abs(trend).toFixed(1)}% over 30 days against the USD — Canadian wholesale costs follow.`
      });
    }

    // -- Fallback so the card never feels empty --
    if (out.length < 2) {
      out.push({
        icon: 'target',
        html: '<strong>Tankful refreshes itself.</strong> Station prices update every 4 hours from GasBuddy; FX and oil indicators refresh hourly. Hard-refresh anytime.'
      });
    }

    return out.slice(0, 4);
  }

  function kickoffLiveData() {
    if (typeof TANKFUL_LIVE === 'undefined') return;
    TANKFUL_LIVE.fetchAll().then(live => {
      if (TANKFUL_CONFIG && TANKFUL_CONFIG.debug) console.log('[live-data] result:', live);

      applyLiveData(TANKFUL_MOCK, live);

      if (live.stations && live.stations.success) {
        renderStations(TANKFUL_MOCK);
      }

      // Replace the mock chart history with real cron-derived samples
      // when there's enough coverage; otherwise leave mock + flag it.
      const liveHistory = live.history && live.history.success
        ? maybeBuildLiveHistory(live.history.samples)
        : null;
      if (liveHistory) {
        TANKFUL_MOCK.history = liveHistory;
        setChartSampleBadge(false);
        // Re-render whichever range is currently selected.
        const activeTab = document.querySelector('.tab.active');
        const range = activeTab ? parseInt(activeTab.dataset.range, 10) : 7;
        if (TANKFUL_MOCK.history[range] && TANKFUL_MOCK.history[range].length) {
          TANKFUL_Chart.render(TANKFUL_MOCK.history[range], range);
        }
      } else {
        setChartSampleBadge(true);
      }

      // Recompute the live verdict / score / state from the patched data.
      const verdict = computeLiveVerdict(TANKFUL_MOCK);
      TANKFUL_MOCK.score = verdict.score;
      TANKFUL_MOCK.state = verdict.state;
      TANKFUL_MOCK.verdict = verdict.verdict;
      TANKFUL_MOCK.verdictSub = verdict.verdictSub;
      TANKFUL_MOCK.breakdown = verdict.breakdown;

      // Sync indicator badges to the real score contributions so the +X
      // numbers in the indicators card match the breakdown.
      syncIndicatorImpacts(TANKFUL_MOCK, verdict.breakdown);
      renderIndicators(TANKFUL_MOCK.components);

      applyState(verdict.state);
      animateScore(verdict.score);
      animateRing(verdict.score);
      renderVerdict(TANKFUL_MOCK);
      renderBreakdown(verdict.breakdown);
      renderLegend(verdict.state);

      // Tips depend on the patched state too.
      TANKFUL_MOCK.tips = computeLiveTips(TANKFUL_MOCK, live);
      renderTips(TANKFUL_MOCK.tips);

      renderLastUpdated(TANKFUL_MOCK.lastUpdated);
      renderWhereFreshness(live);
      updateLiveStatus(live);
    }).catch(err => {
      console.warn('[live-data] unexpected error:', err);
      if (els.liveStatus) els.liveStatus.textContent = 'Live fetch failed — showing mock data';
    });
  }

  // ---------- Render region picker ----------
  function renderRegions(regions, activeRegion) {
    const html = regions.map(r => {
      const classes = ['region-pill'];
      if (r.id === activeRegion) classes.push('active');
      if (!r.enabled) classes.push('disabled');
      const soonTag = r.comingSoon ? '<span class="soon-tag">Soon</span>' : '';
      return `<button class="${classes.join(' ')}" data-region="${r.id}" ${!r.enabled ? 'aria-disabled="true"' : ''}>
        ${r.name}${soonTag}
      </button>`;
    }).join('');
    els.regionPicker.innerHTML = html;
  }

  // ---------- Render stations ----------
  // Stations display their BASE price; card discounts shown as a separate badge.
  // Ranking still uses effectivePrice so card-holders win ties.
  function renderStations(state) {
    const { stations, marketPrice } = state;

    // Sort by effectivePrice (this is the ranking signal)
    const enriched = [...stations].sort((a, b) => a.effectivePrice - b.effectivePrice);

    // ----- Deal hero (top / cheapest station) -----
    const top = enriched[0];
    const baseCentsOff = TANKFUL_Score.stationSavings(top.price, marketPrice);
    const cardSavings = top.discount ? top.discount.amount : 0;

    const dealHtml = `
      <div class="deal-hero-label">Best deal in ${top.area}</div>
      <div class="deal-price-big">
        ${top.price.toFixed(1)}<span class="deal-price-unit">¢/L</span>
      </div>
      <div class="deal-savings-sub">
        <strong>${baseCentsOff.toFixed(1)}¢/L</strong> below the market average
      </div>
      <div class="deal-station-name">
        <span class="station-brand">${top.brand || top.name}</span>${top.cstore ? `<span class="station-cstore"> &amp; ${top.cstore}</span>` : ''}
      </div>
      ${cardSavings > 0
        ? `<div class="deal-station-meta">
            <span class="deal-discount-tag">
              ${ICONS['credit-card']}
              <span>Save another ${cardSavings}¢ with Canco card</span>
            </span>
          </div>`
        : ''}
    `;
    els.dealHero.innerHTML = dealHtml;

    // ----- Full station list -----
    const listHtml = enriched.map(s => {
      const centsOff = TANKFUL_Score.stationSavings(s.price, marketPrice);
      const isMarket = s.price >= marketPrice - 0.5;
      const savingsCls = isMarket
        ? 'neutral'
        : (centsOff > 0 ? 'positive' : 'negative');
      const savingsText = isMarket
        ? 'market rate'
        : `${centsOff.toFixed(1)}¢ below market`;

      let badgeHtml = '';
      if (s.badge === 'Best deal') {
        badgeHtml = '<span class="station-badge">Best deal</span>';
      } else if (s.badge === 'You filled here') {
        badgeHtml = '<span class="station-badge yours">You filled here</span>';
      } else if (s.badge === 'Market price') {
        badgeHtml = '<span class="station-badge market">Market</span>';
      }

      const discountTag = s.discount
        ? `<span class="discount-tag">Save ${s.discount.amount}¢ with card</span>`
        : '';

      const addressLine = s.address
        ? `<div class="station-address">${s.address}</div>`
        : '';

      // Distance — only shown when the user has granted location AND the
      // station carries coords. Format is delegated to TANKFUL_Location so
      // sub-1km values read as "650m" rather than "0.7 km". The pin icon
      // viewBox is tight to the pin shape (no internal padding) so the
      // visual gap between the pin and the "X.X km" text matches the
      // intended 4px CSS gap.
      let distanceLine = '';
      if (userLocation && typeof s.lat === 'number' && typeof s.lng === 'number') {
        const km = TANKFUL_Location.distanceKm(userLocation.lat, userLocation.lng, s.lat, s.lng);
        const label = TANKFUL_Location.formatDistance(km);
        if (label) {
          distanceLine =
            `<span class="station-distance" aria-label="${label} away">` +
            `<svg viewBox="4 2 16 20" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">` +
            `<path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/>` +
            `<circle cx="12" cy="10" r="3"/></svg>` +
            `${label}</span>`;
        }
      }

      const href = TANKFUL_Location && typeof TANKFUL_Location.directionsUrl === 'function'
        ? TANKFUL_Location.directionsUrl({
            address: s.addressForMaps || s.address,
            lat: s.lat,
            lng: s.lng
          })
        : '#';

      return `
        <li class="station">
          <a class="station-link" href="${href}" target="_blank" rel="noopener" aria-label="Get directions to ${s.name}">
            <div class="station-info">
              <div class="station-name-row">
                ${stationLogoFor(s.brand) ? `<span class="station-logo" aria-hidden="true">${stationLogoFor(s.brand)}</span>` : ''}
                <span class="station-name">
                  <span class="station-brand">${s.brand || s.name}</span>${s.cstore ? `<span class="station-cstore"> &amp; ${s.cstore}</span>` : ''}
                </span>
                ${badgeHtml}
              </div>
              ${addressLine}
              <div class="station-meta">
                ${s.area}${distanceLine ? ' · ' + distanceLine : ''}${discountTag ? ' · ' + discountTag : ''}
              </div>
            </div>
            <div class="station-prices">
              <div class="station-price">
                ${s.price.toFixed(1)}<span class="station-price-unit">¢/L</span>
              </div>
              <div class="station-savings ${savingsCls}">${savingsText}</div>
            </div>
          </a>
        </li>
      `;
    }).join('');

    els.stationList.innerHTML = listHtml;
  }

  // ---------- Render legend ----------
  function renderLegend(activeState) {
    if (!els.scoreLegend) return;
    els.scoreLegend.querySelectorAll('.legend-item').forEach(item => {
      item.classList.toggle('active', item.dataset.state === activeState);
    });
  }

  // ---------- Region picker handler ----------
  function setupRegionPicker() {
    els.regionPicker.addEventListener('click', (e) => {
      const btn = e.target.closest('.region-pill');
      if (!btn) return;
      if (btn.classList.contains('disabled')) {
        btn.animate(
          [{ transform: 'translateX(0)' }, { transform: 'translateX(-3px)' }, { transform: 'translateX(3px)' }, { transform: 'translateX(0)' }],
          { duration: 240, easing: 'ease-in-out' }
        );
        return;
      }
      const region = btn.dataset.region;
      if (region === TANKFUL_MOCK.region) return;
      TANKFUL_MOCK.region = region;
      renderRegions(TANKFUL_MOCK.regions, region);
    });
  }

  // ---------- Tab handling ----------
  function setupTabs() {
    els.tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        els.tabs.forEach(t => {
          t.classList.remove('active');
          t.setAttribute('aria-selected', 'false');
        });
        tab.classList.add('active');
        tab.setAttribute('aria-selected', 'true');
        const range = parseInt(tab.dataset.range, 10);
        TANKFUL_Chart.render(TANKFUL_MOCK.history[range], range);
      });
    });
  }

  // ---------- Chart in-view animator ----------
  // The chart should "draw itself" only once the chart card scrolls into view.
  function setupChartObserver() {
    if (!els.chartCard) return;

    let hasRendered = false;
    const renderChart = () => {
      if (hasRendered) return;
      hasRendered = true;
      TANKFUL_Chart.render(TANKFUL_MOCK.history[7], 7);
    };

    if ('IntersectionObserver' in window) {
      const obs = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting && entry.intersectionRatio > 0.25) {
            renderChart();
            obs.disconnect();
          }
        });
      }, { threshold: [0.25, 0.5] });
      obs.observe(els.chartCard);

      // Fallback: if chart-card is already in view at page load, observer may
      // not fire immediately on some browsers — kick render after a short delay.
      setTimeout(() => {
        const rect = els.chartCard.getBoundingClientRect();
        if (rect.top < window.innerHeight && rect.bottom > 0) {
          renderChart();
        }
      }, 400);
    } else {
      // No observer support — just render after init.
      setTimeout(renderChart, 300);
    }
  }

  // ---------- Initial render ----------
  function init() {
    const data = TANKFUL_MOCK;

    applyState(data.state);

    setTimeout(() => {
      animateScore(data.score);
      animateRing(data.score);
    }, 100);

    renderVerdict(data);
    renderRegions(data.regions, data.region);
    renderStations(data);
    renderIndicators(data.components);
    renderModifiers(data.modifiers);
    renderTips(data.tips);
    renderLegend(data.state);
    renderLastUpdated(data.lastUpdated);

    setupTabs();
    setupRegionPicker();
    setupChartObserver();
    setupLocation();
    setupRefineryAlert();
    setupPushButton();

    // Fire live data fetches after the initial mock render is on screen.
    // Patches in once they resolve; mock stays put if anything fails.
    kickoffLiveData();
  }

  // ---------- Push notifications subscribe / unsubscribe ----------
  function setupPushButton() {
    const btn = document.getElementById('pushBtn');
    if (!btn || typeof TANKFUL_Push === 'undefined' || !TANKFUL_Push.supported()) return;

    const label = btn.querySelector('.push-btn-label');

    function setLabel(text, active) {
      label.textContent = text;
      btn.classList.toggle('active', !!active);
    }

    btn.hidden = false;

    // Reflect existing subscription state if there is one.
    TANKFUL_Push.isActive().then((on) => {
      if (on) setLabel('Alerts on', true);
      else setLabel('Get alerts', false);
    });

    btn.addEventListener('click', async () => {
      btn.disabled = true;
      try {
        const on = await TANKFUL_Push.isActive();
        if (on) {
          await TANKFUL_Push.unsubscribe();
          setLabel('Get alerts', false);
        } else {
          setLabel('Subscribing…', false);
          await TANKFUL_Push.subscribe();
          setLabel('Alerts on', true);
        }
      } catch (err) {
        console.warn('[push] toggle failed:', err.message);
        setLabel('Try again', false);
        setTimeout(() => setLabel('Get alerts', false), 2500);
      } finally {
        btn.disabled = false;
      }
    });
  }

  // ---------- Refinery / supply-outage toggle ----------
  function setupRefineryAlert() {
    const btn = document.getElementById('refineryAlertBtn');
    if (!btn || typeof TANKFUL_RefineryAlert === 'undefined') return;
    updateRefineryButton();
    btn.addEventListener('click', () => {
      TANKFUL_RefineryAlert.toggle();
      refreshAfterAlertChange();
    });
  }

  // ---------- Location button + silent restore ----------
  function setupLocation() {
    if (typeof TANKFUL_Location === 'undefined' || !els.locationBtn) return;
    if (!('geolocation' in navigator)) {
      els.locationBtn.hidden = true;
      return;
    }

    // 1. Silent restore — if the user already granted location previously,
    //    populate userLocation without prompting and just re-render.
    TANKFUL_Location.getCachedOrSilent().then((pos) => {
      if (pos) {
        userLocation = pos;
        renderStations(TANKFUL_MOCK);
        els.locationBtn.hidden = true;
      } else {
        els.locationBtn.hidden = false;
      }
    });

    // 2. Button — explicit user gesture to trigger the permission prompt
    //    on first use. Hide once we have a position.
    els.locationBtn.addEventListener('click', () => {
      els.locationBtn.disabled = true;
      els.locationBtn.querySelector('.location-btn-label').textContent = 'Locating…';
      TANKFUL_Location.request().then((pos) => {
        els.locationBtn.disabled = false;
        if (pos) {
          userLocation = pos;
          renderStations(TANKFUL_MOCK);
          els.locationBtn.hidden = true;
        } else {
          els.locationBtn.querySelector('.location-btn-label').textContent = 'Location unavailable';
          setTimeout(() => {
            els.locationBtn.querySelector('.location-btn-label').textContent = 'Show distance';
          }, 2500);
        }
      });
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
