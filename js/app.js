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
    liveStatus: $('#liveStatus')
  };

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
      const impactCls = c.impact < (c.weight * 50) ? 'neg' : '';
      const impactDisplay = `+${c.impact.toFixed(1)}`;
      return `
        <div class="indicator" title="${c.detail}">
          <div class="indicator-top">
            <div class="indicator-icon">${ICONS[c.icon] || ICONS.fuel}</div>
            <div class="indicator-impact ${impactCls}">${impactDisplay}</div>
          </div>
          <div class="indicator-name">${c.name}</div>
          <div class="indicator-trend">${c.trend}</div>
        </div>
      `;
    }).join('');
    els.indicators.innerHTML = html;
  }

  function renderModifiers(modifiers) {
    if (!modifiers || modifiers.length === 0) {
      els.modifiersRow.innerHTML = '';
      return;
    }
    const html = modifiers.map(m => {
      const icon = ICONS[m.icon] || ICONS.flag;
      const isActive = m.active === true;
      const impactBadge = m.impact > 0
        ? `<span class="impact">+${m.impact}</span>`
        : '';
      const cls = isActive ? 'modifier-chip active' : 'modifier-chip';
      return `
        <div class="${cls}">
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

  function renderLastUpdated(iso) {
    const d = new Date(iso);
    const opts = { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' };
    els.lastUpdated.textContent = d.toLocaleString('en-CA', opts);
  }

  // Mock station entries keep useful UI metadata (Canco card discount, brand
  // labels) that the scraper doesn't produce. Map by scraper ID → mock ID so
  // we can carry that metadata across when we overlay live prices.
  const STATION_OVERLAY = {
    'canco':     { mockId: 'canco-woodsdale', brand: 'Canco',         discount: { type: 'card', amount: 2.0, label: 'with Canco card' } },
    'petrocan':  { mockId: 'petro-711',       brand: 'Petro-Canada',  discount: null },
    'supersave': { mockId: 'supersave-lc',    brand: 'Super Save',    discount: null },
    'husky':     { mockId: 'husky-97',        brand: 'Husky',         discount: null },
    'parkway':   { mockId: null,              brand: 'Shell (Parkway)', discount: null },
    'shell-lc':  { mockId: null,              brand: 'Shell',           discount: null },
    'chevron':   { mockId: null,              brand: 'Chevron',         discount: null }
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
        area: 'Lake Country',
        address: formatStationAddress(s.address),
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

    if (live.fx && live.fx.success) {
      // Loonie weakening (FXUSDCAD up) = bad for pump → low score
      const v = signalToValue(-live.fx.trendPct / 5);
      state.components.fx.detail = `Loonie at ${live.fx.usdPerCad.toFixed(4)} USD`;
      state.components.fx.trend = live.fx.trendLabel;
      state.components.fx.value = v;
      state.components.fx.impact = +(v * state.components.fx.weight).toFixed(1);
    }

    if (live.wti && live.wti.success) {
      // Crude up = future pump pressure → low score (fill bias)
      const v = signalToValue(-live.wti.trendPct / 10);
      state.components.wti.detail = 'USD ' + live.wti.latest.toFixed(2) + '/bbl';
      state.components.wti.trend = live.wti.trendLabel;
      state.components.wti.value = v;
      state.components.wti.impact = +(v * state.components.wti.weight).toFixed(1);
    }

    if (live.rbob && live.rbob.success) {
      let detail = 'USD ' + live.rbob.latest.toFixed(3) + '/gal NYH spot';
      if (live.fx && live.fx.success) {
        const cadPerL = TANKFUL_LIVE.rbobToCadPerLitre(live.rbob.latest, live.fx.latest);
        if (cadPerL) detail += ' (~' + (cadPerL * 100).toFixed(1) + '¢/L wholesale)';
      }
      // RBOB up = wholesale pressure on pumps → low score (fill bias)
      const v = signalToValue(-live.rbob.trendPct / 8);
      state.components.rbob.detail = detail;
      state.components.rbob.trend = live.rbob.trendLabel;
      state.components.rbob.value = v;
      state.components.rbob.impact = +(v * state.components.rbob.weight).toFixed(1);
    }

    // Day-of-Week is fully derivable from `new Date()` — no API needed.
    if (state.components.dow) {
      const dow = dayOfWeekIndicator();
      state.components.dow.value = dow.value;
      state.components.dow.trend = dow.trend;
      state.components.dow.detail = dow.detail;
      state.components.dow.impact = +(dow.value * state.components.dow.weight).toFixed(1);
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
    const signals = [];

    // SIGNAL 1: Active long weekend / stat ahead → fill bias
    const activeMod = (state.modifiers || []).find(m => m.active);
    if (activeMod) {
      score += activeMod.impact;
      signals.push({
        strength: activeMod.impact,
        text: `${activeMod.name} ahead — pre-weekend pump firming is the usual play.`
      });
    }

    // SIGNAL 2: Best-deal spread vs market
    if (state.stations && state.stations.length && state.marketPrice) {
      const sorted = [...state.stations].sort((a, b) => a.effectivePrice - b.effectivePrice);
      const top = sorted[0];
      const spread = state.marketPrice - top.effectivePrice;
      if (spread >= 8) {
        score += 8;
        signals.push({
          strength: 9,
          text: `${top.name} is ${spread.toFixed(1)}¢/L below average — grab that price now.`
        });
      } else if (spread >= 4) {
        score += 4;
        signals.push({
          strength: 5,
          text: `${top.name} is ${spread.toFixed(1)}¢/L below average — moderate edge available.`
        });
      }
    }

    // SIGNAL 3: RBOB wholesale trend
    const rbob = state.components.rbob;
    if (rbob && typeof rbob.value === 'number' && rbob.trend && !rbob.trend.includes('5d')) {
      // 'value' was patched live (signalToValue mapping). Translate back to a +/- score contribution.
      const contrib = Math.round((rbob.value - 50) * 0.3); // up to ±15 from RBOB
      score += contrib;
      if (Math.abs(contrib) >= 6) {
        signals.push({
          strength: Math.abs(contrib),
          text: contrib > 0
            ? `Wholesale gas easing — relief could reach the pump this week.`
            : `Wholesale gas firming — pump pressure ahead.`
        });
      }
    }

    // SIGNAL 4: Day-of-week (cheaper days = lean fill, since it'll climb later)
    const dow = state.components.dow;
    if (dow && typeof dow.value === 'number') {
      const contrib = Math.round((dow.value - 50) * 0.15); // up to ±7.5
      score += contrib;
      if (Math.abs(contrib) >= 4) {
        signals.push({
          strength: Math.abs(contrib),
          text: contrib > 0
            ? `It's a ${dow.trend} — typically a softer-price day.`
            : `It's a ${dow.trend} — weekend pricing usually firm by now.`
        });
      }
    }

    // SIGNAL 5: FX (CAD weakness costs us)
    const fx = state.components.fx;
    if (fx && typeof fx.value === 'number') {
      const contrib = Math.round((fx.value - 50) * 0.1); // up to ±5
      score += contrib;
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

    return { score, state: bucketState, verdict, verdictSub };
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
      renderIndicators(TANKFUL_MOCK.components);

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

      applyState(verdict.state);
      animateScore(verdict.score);
      animateRing(verdict.score);
      renderVerdict(TANKFUL_MOCK);
      renderLegend(verdict.state);

      // Tips depend on the patched state too.
      TANKFUL_MOCK.tips = computeLiveTips(TANKFUL_MOCK, live);
      renderTips(TANKFUL_MOCK.tips);

      renderLastUpdated(TANKFUL_MOCK.lastUpdated);
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
      <div class="deal-station-name">${top.name}</div>
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

      return `
        <li class="station">
          <div class="station-info">
            <div class="station-name-row">
              <span class="station-name">${s.name}</span>
              ${badgeHtml}
            </div>
            ${addressLine}
            <div class="station-meta">
              ${s.area}${discountTag ? ' · ' + discountTag : ''}
            </div>
          </div>
          <div class="station-prices">
            <div class="station-price">
              ${s.price.toFixed(1)}<span class="station-price-unit">¢/L</span>
            </div>
            <div class="station-savings ${savingsCls}">${savingsText}</div>
          </div>
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

    // Fire live data fetches after the initial mock render is on screen.
    // Patches in once they resolve; mock stays put if anything fails.
    kickoffLiveData();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
