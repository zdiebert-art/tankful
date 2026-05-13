/* ============================================
   GAS WATCH — Main App
   Hydrates the UI from GW_MOCK state
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
    currentPrice: $('#currentPrice'),
    priceDelta: $('#priceDelta'),
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
    priceLabel: $('#priceLabel'),
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

  function renderPrice(state) {
    // Pull the active region's display name for the label
    const activeRegion = state.regions.find(r => r.id === state.region);
    const regionName = activeRegion ? activeRegion.name : 'your area';
    if (els.priceLabel) {
      els.priceLabel.textContent = `Today in ${regionName}`;
    }

    els.currentPrice.textContent = state.currentPrice.toFixed(1);
    const delta = state.currentPrice - state.priceYesterday;
    if (Math.abs(delta) < 0.05) {
      els.priceDelta.innerHTML = `<span>unchanged from yesterday</span>`;
    } else {
      const arrow = delta > 0 ? '▲' : '▼';
      const sign = delta > 0 ? '+' : '';
      els.priceDelta.innerHTML = `<span>${arrow} ${sign}${delta.toFixed(1)}¢ from yesterday</span>`;
    }
  }

  function renderIndicators(components) {
    const html = Object.entries(components).map(([key, c]) => {
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

  // ---------- Live-data patching ----------
  // Takes the result of GW_LIVE.fetchAll() and overlays it onto the mock state.
  // Mock fields stay intact for any source that failed.
  function applyLiveData(state, live) {
    if (!live) return;

    if (live.fx && live.fx.success) {
      state.components.fx.detail = `Loonie at ${live.fx.usdPerCad.toFixed(4)} USD`;
      state.components.fx.trend = live.fx.trendLabel;
    }

    if (live.wti && live.wti.success) {
      state.components.wti.detail = 'USD ' + live.wti.latest.toFixed(2) + '/bbl';
      state.components.wti.trend = live.wti.trendLabel;
    }

    if (live.rbob && live.rbob.success) {
      let detail = 'USD ' + live.rbob.latest.toFixed(3) + '/gal NYH spot';
      // If FX is also live, translate to approximate Canadian wholesale ¢/L
      if (live.fx && live.fx.success) {
        const cadPerL = GW_LIVE.rbobToCadPerLitre(live.rbob.latest, live.fx.latest);
        if (cadPerL) detail += ' (~' + (cadPerL * 100).toFixed(1) + '¢/L wholesale)';
      }
      state.components.rbob.detail = detail;
      state.components.rbob.trend = live.rbob.trendLabel;
    }

    if (live.stations && live.stations.success) {
      applyLiveStations(state, live.stations);
    }

    if (live.anySuccess) {
      state.lastUpdated = live.fetchedAt;
    }
  }

  function updateLiveStatus(live) {
    if (!els.liveStatus) return;
    const fxOk = live.fx && live.fx.success;
    const wtiOk = live.wti && live.wti.success;
    const rbobOk = live.rbob && live.rbob.success;
    const stationsOk = live.stations && live.stations.success;
    const noKey = !GW_CONFIG.eiaApiKey || GW_CONFIG.eiaApiKey.length < 10;

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

  function kickoffLiveData() {
    if (typeof GW_LIVE === 'undefined') return;
    GW_LIVE.fetchAll().then(live => {
      if (GW_CONFIG && GW_CONFIG.debug) console.log('[live-data] result:', live);
      applyLiveData(GW_MOCK, live);
      renderIndicators(GW_MOCK.components);
      if (live.stations && live.stations.success) {
        renderStations(GW_MOCK);
        renderPrice(GW_MOCK);
      }
      renderLastUpdated(GW_MOCK.lastUpdated);
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
    const baseCentsOff = GW_Score.stationSavings(top.price, marketPrice);
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
      const centsOff = GW_Score.stationSavings(s.price, marketPrice);
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
      if (region === GW_MOCK.region) return;
      GW_MOCK.region = region;
      renderRegions(GW_MOCK.regions, region);
      renderPrice(GW_MOCK);
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
        GW_Chart.render(GW_MOCK.history[range], range);
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
      GW_Chart.render(GW_MOCK.history[7], 7);
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
    const data = GW_MOCK;

    applyState(data.state);

    setTimeout(() => {
      animateScore(data.score);
      animateRing(data.score);
    }, 100);

    renderVerdict(data);
    renderPrice(data);
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
