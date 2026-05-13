/* ============================================
   GAS WATCH — Mock Data
   Real-feeling Kelowna / Lake Country scenario
   May 12, 2026 — Tuesday, 6 days before
   Victoria Day weekend, post-Iran/Hormuz spike
   ============================================ */

const GW_MOCK = (() => {

  // ---------- Helpers ----------
  const today = new Date('2026-05-12T08:00:00-07:00');
  const dayMs = 86400000;
  const addDays = (date, n) => new Date(date.getTime() + n * dayMs);
  const fmt = (d) => d.toISOString().slice(0, 10);

  // ---------- 7-day daily history (¢/L) ----------
  const sevenBase = [181.2, 179.8, 178.4, 178.0, 199.5, 200.5, 203.0];
  const sevenDay = sevenBase.map((p, i) => ({
    date: fmt(addDays(today, -(6 - i))),
    price: p
  }));

  // ---------- 30-day daily history ----------
  const thirtyBase = [
    162.4, 161.8, 161.2, 160.4, 159.8, 159.0, 158.4, 157.6, 156.8,
    178.2, 177.4, 176.6, 175.8, 174.8, 173.8, 172.6, 171.4,
    188.4, 187.5, 186.4, 185.2, 184.0, 182.6, 181.2, 179.8,
    178.4, 178.0, 199.5, 200.5, 203.0
  ];
  const thirtyDay = thirtyBase.map((p, i) => ({
    date: fmt(addDays(today, -(29 - i))),
    price: p
  }));

  // ---------- 52-week weekly history ----------
  const yearlyBase = [
    158.4, 159.2, 161.4, 163.8, 164.2, 162.9, 160.6, 158.4, 156.2, 153.6,
    151.2, 148.8, 146.4, 144.8, 143.6, 142.8, 142.4, 143.2, 144.6, 146.8,
    148.4, 149.6, 150.8, 152.2, 153.4, 154.8, 156.2, 157.8, 159.4, 162.6,
    173.4, 178.2, 182.4, 184.6, 183.8, 181.6, 178.4, 175.8, 173.4, 178.2,
    182.4, 186.2, 188.4, 184.2, 179.8, 182.6, 188.4, 191.6, 195.2, 197.4,
    199.8, 203.0
  ];
  const yearly = yearlyBase.map((p, i) => ({
    date: fmt(addDays(today, -((yearlyBase.length - 1 - i) * 7))),
    price: p
  }));

  // ---------- Regions ----------
  const regions = [
    { id: 'lake-country', name: 'Lake Country', enabled: true },
    { id: 'kelowna',      name: 'Kelowna',      enabled: false, comingSoon: true },
    { id: 'vernon',       name: 'Vernon',       enabled: false, comingSoon: true }
  ];

  // ---------- Local market price ----------
  const marketPrice = 203.0;   // ¢/L Lake Country average this morning

  // ---------- Stations (Lake Country only) ----------
  const stations = [
    {
      id: 'canco-woodsdale',
      name: 'Canco Woodsdale',
      brand: 'Canco',
      area: 'Lake Country',
      address: '11470 Bottom Wood Lake Rd, Lake Country',
      price: 173.0,
      discount: { type: 'card', amount: 2.0, label: 'with Canco card' },
      effectivePrice: 171.0,
      notes: '$0.02/L card discount',
      badge: 'Best deal'
    },
    {
      id: 'petro-711',
      name: 'Petro-Canada · 7-Eleven',
      brand: 'Petro-Canada',
      area: 'Lake Country',
      address: '9724 Highway 97, Lake Country',
      price: 173.0,
      effectivePrice: 173.0,
      notes: 'Confirmed price this morning',
      badge: 'You filled here'
    },
    {
      id: 'supersave-lc',
      name: 'Super Save Lake Country',
      brand: 'Super Save',
      area: 'Lake Country',
      address: '11751 Highway 97, Lake Country',
      price: 188.0,
      effectivePrice: 188.0,
      notes: '',
      badge: null
    },
    {
      id: 'husky-97',
      name: 'Husky Highway 97',
      brand: 'Husky',
      area: 'Lake Country',
      address: '10550 Highway 97, Lake Country',
      price: 203.0,
      effectivePrice: 203.0,
      notes: 'Market rate',
      badge: 'Market price'
    }
  ];

  // ---------- Score components ----------
  const components = {
    rbob: {
      name: 'RBOB Futures',
      icon: 'fuel',
      value: 55,
      weight: 0.25,
      trend: '+1.2% / 5d',
      detail: 'Holding above $3.60/gal',
      impact: 13.75
    },
    wti: {
      name: 'WTI Crude',
      icon: 'barrel',
      value: 65,
      weight: 0.10,
      trend: '+3.4% / 5d',
      detail: '$94/bbl — Mideast premium intact',
      impact: 6.5
    },
    fx: {
      name: 'CAD vs USD',
      icon: 'currency',
      value: 55,
      weight: 0.10,
      trend: 'CAD -0.2%',
      detail: 'Loonie soft at 0.728 USD',
      impact: 5.5
    },
    dow: {
      name: 'Day of Week',
      icon: 'calendar-day',
      value: 70,
      weight: 0.15,
      trend: 'Tuesday',
      detail: 'Early-week before Thu/Fri jump',
      impact: 10.5
    },
    cycleAge: {
      name: 'Days Since Reset',
      icon: 'cycle',
      value: 25,
      weight: 0.20,
      trend: '2 days ago',
      detail: 'Fresh jump — drift down expected',
      impact: 5.0
    },
    range: {
      name: '30-Day Position',
      icon: 'range',
      value: 78,
      weight: 0.10,
      trend: 'At top',
      detail: '203¢ vs range 157–203¢',
      impact: 7.8
    }
  };

  // Holidays & long weekends are computed live from real "today" so the list
  // always reflects what's actually coming up in British Columbia.
  // (See js/holidays.js for the BC catalogue + impact weighting.)
  const modifiers = (typeof GW_Holidays !== 'undefined')
    ? GW_Holidays.upcoming(new Date(), { limit: 4, lookaheadDays: 180 })
    : [];

  const baseScore = Object.values(components).reduce((s, c) => s + c.impact, 0);
  const modifierTotal = modifiers.reduce((s, m) => s + m.impact, 0);
  const score = Math.round(Math.min(100, Math.max(0, baseScore + modifierTotal)));

  let verdict, verdictSub, state;
  if (score >= 70) {
    state = 'fill-up';
    verdict = 'Fill Up Now';
    verdictSub = 'Conditions favor a further increase soon';
  } else if (score >= 30) {
    state = 'neutral';
    verdict = 'Maybe Today';
    verdictSub = 'Prices just jumped — drift down possible, but long weekend looms';
  } else {
    state = 'wait';
    verdict = 'Wait a Bit';
    verdictSub = 'Prices look likely to drift down';
  }

  const tips = [
    {
      icon: 'target',
      html: '<strong>Where matters more than when today.</strong> Market sits at $2.03/L but Canco Woodsdale with your card is $1.71 — a 32¢/L spread is huge.'
    },
    {
      icon: 'calendar-days',
      html: '<strong>Victoria Day in 6 days.</strong> Even if prices drift down this week, expect a Thursday-before-the-long-weekend bump. Fill by Wednesday.'
    },
    {
      icon: 'cycle',
      html: '<strong>Cycle just reset 2 days ago.</strong> Locally, prices typically drift down 1-3¢/L per day from a jump for 7-10 days before the next reset.'
    },
    {
      icon: 'credit-card',
      html: '<strong>Don\'t forget the Canco card.</strong> The $0.02/L discount stacks on top of their already-low price — that\'s where the real edge comes from.'
    }
  ];

  return {
    location: 'Lake Country, BC',
    region: 'lake-country',
    regions,
    marketPrice,
    currentPrice: marketPrice,
    priceYesterday: 200.5,
    lastUpdated: today.toISOString(),
    score,
    state,
    verdict,
    verdictSub,
    components,
    modifiers,
    stations,
    tips,
    history: {
      7: sevenDay,
      30: thirtyDay,
      365: yearly
    }
  };
})();

// Demo overrides via URL param
(function applyDemoOverride() {
  const params = new URLSearchParams(window.location.search);
  const demo = params.get('demo');
  if (!demo) return;
  if (demo === 'wait') {
    GW_MOCK.score = 22;
    GW_MOCK.state = 'wait';
    GW_MOCK.verdict = 'Wait a Bit';
    GW_MOCK.verdictSub = 'Prices look likely to drift down';
    GW_MOCK.modifiers = [];
  } else if (demo === 'neutral') {
    GW_MOCK.score = 48;
    GW_MOCK.state = 'neutral';
    GW_MOCK.verdict = 'Maybe Today';
    GW_MOCK.verdictSub = 'Mixed signals — no strong push either way';
    GW_MOCK.modifiers = [];
  } else if (demo === 'fill-up') {
    GW_MOCK.score = 78;
    GW_MOCK.state = 'fill-up';
    GW_MOCK.verdict = 'Fill Up Now';
    GW_MOCK.verdictSub = 'Conditions favor a further increase soon';
  }
})();
