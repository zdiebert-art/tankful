/* ============================================
   GAS WATCH — Live Data Fetchers
   Free, legal, CORS-friendly sources only.

   Sources:
   - Bank of Canada Valet (USD/CAD)         no key needed
   - EIA Open Data v2 (WTI, NYH RBOB)       free key required

   All fetchers:
   - Return { success, ... } objects (never throw)
   - Cache successful results in localStorage with TTL
   - Fall back silently on failure (caller stays on mock data)
   ============================================ */

const GW_LIVE = (() => {

  const STORAGE_KEY = 'gw_live_cache_v1';

  // ---------- localStorage cache helpers ----------
  function getCached(key) {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      const all = JSON.parse(raw);
      const entry = all[key];
      if (!entry) return null;
      const ttlMs = (GW_CONFIG.cacheTtlMin || 60) * 60 * 1000;
      if (Date.now() - entry.fetchedAt > ttlMs) return null;
      if (GW_CONFIG.debug) console.log(`[live-data] cache HIT for ${key}`);
      return entry.value;
    } catch (e) {
      return null;
    }
  }

  function setCached(key, value) {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      const all = raw ? JSON.parse(raw) : {};
      all[key] = { fetchedAt: Date.now(), value };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
    } catch (e) { /* ignore quota / SecurityError */ }
  }

  function clearCache() {
    try { localStorage.removeItem(STORAGE_KEY); } catch (e) {}
  }

  // ---------- Trend helper ----------
  function computeTrend(series) {
    if (!series || series.length < 2) return 0;
    const latest = series[series.length - 1].value;
    const earliest = series[0].value;
    return ((latest - earliest) / earliest) * 100;
  }

  function fmtTrend(pct, suffix) {
    const sign = pct >= 0 ? '+' : '';
    return `${sign}${pct.toFixed(1)}% / ${suffix}`;
  }

  // ============================================
  // Bank of Canada Valet — USD/CAD daily fixing
  // Docs: https://www.bankofcanada.ca/valet/docs
  // CORS: allowed (Access-Control-Allow-Origin: *)
  // ============================================
  async function fetchFX() {
    const cached = getCached('fx');
    if (cached) return cached;

    try {
      const url = 'https://www.bankofcanada.ca/valet/observations/FXUSDCAD/json?recent=30';
      if (GW_CONFIG.debug) console.log('[live-data] fetching FX from Bank of Canada');
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();

      const obs = data.observations || [];
      const series = obs
        .map(o => ({ date: o.d, value: parseFloat(o.FXUSDCAD && o.FXUSDCAD.v) }))
        .filter(p => !isNaN(p.value));

      if (series.length === 0) throw new Error('No observations returned');

      const latest = series[series.length - 1];
      const trendPct = computeTrend(series);

      const result = {
        success: true,
        source: 'Bank of Canada',
        latest: latest.value,             // CAD per USD (e.g. 1.3845)
        latestDate: latest.date,
        usdPerCad: 1 / latest.value,      // CAD-buys-USD (e.g. 0.7223)
        trendPct,
        trendLabel: fmtTrend(trendPct, '30d'),
        series
      };
      setCached('fx', result);
      return result;
    } catch (err) {
      if (GW_CONFIG.debug) console.warn('[live-data] FX failed:', err.message);
      return { success: false, error: err.message };
    }
  }

  // ============================================
  // EIA Open Data v2 — petroleum spot prices
  // Docs: https://www.eia.gov/opendata/documentation.php
  // CORS: allowed
  // Requires a free API key.
  // ============================================
  async function fetchEIASeries(seriesId, cacheKey, valueUnit) {
    const apiKey = GW_CONFIG.eiaApiKey;
    if (!apiKey || apiKey.length < 10) {
      return { success: false, error: 'No EIA API key configured' };
    }

    const cached = getCached(cacheKey);
    if (cached) return cached;

    try {
      const params = new URLSearchParams({
        api_key: apiKey,
        frequency: 'daily',
        'data[0]': 'value',
        'facets[series][]': seriesId,
        'sort[0][column]': 'period',
        'sort[0][direction]': 'desc',
        offset: '0',
        length: '30'
      });
      const url = `https://api.eia.gov/v2/petroleum/pri/spt/data/?${params.toString()}`;
      if (GW_CONFIG.debug) console.log(`[live-data] fetching ${seriesId} from EIA`);
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();

      const rows = (data.response && data.response.data) || [];
      // EIA returns desc; reverse to chronological
      const series = rows
        .map(r => ({ date: r.period, value: parseFloat(r.value) }))
        .filter(p => !isNaN(p.value))
        .reverse();

      if (series.length === 0) throw new Error(`No data for series ${seriesId}`);

      const latest = series[series.length - 1];
      const trendPct = computeTrend(series);

      const result = {
        success: true,
        source: 'EIA',
        latest: latest.value,
        latestDate: latest.date,
        unit: valueUnit,
        trendPct,
        trendLabel: fmtTrend(trendPct, '30d'),
        series
      };
      setCached(cacheKey, result);
      return result;
    } catch (err) {
      if (GW_CONFIG.debug) console.warn(`[live-data] ${seriesId} failed:`, err.message);
      return { success: false, error: err.message };
    }
  }

  // WTI Cushing spot, $/barrel
  function fetchWTI() {
    return fetchEIASeries('RWTC', 'wti', 'USD/bbl');
  }

  // NY Harbor Conventional Regular Gasoline spot, $/gallon
  function fetchRBOB() {
    return fetchEIASeries('EER_EPMRR_PF4_Y35NY_DPG', 'rbob', 'USD/gal');
  }

  // ============================================
  // Lake Country station prices — produced by the GitHub Actions scraper.
  // Reads the committed JSON next to the app so the same path works locally
  // (over `python -m http.server` or similar) and once deployed.
  // ============================================
  async function fetchStations() {
    const cached = getCached('stations');
    if (cached) return cached;

    try {
      const url = (GW_CONFIG.stationsUrl || './data/lake-country-prices.json')
        + (GW_CONFIG.cacheBust === false ? '' : `?t=${Date.now()}`);
      if (GW_CONFIG.debug) console.log('[live-data] fetching stations from', url);
      const res = await fetch(url, { cache: 'no-store' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();

      if (!data || !Array.isArray(data.stations) || data.stations.length === 0) {
        throw new Error('No stations in JSON');
      }

      const result = {
        success: true,
        source: 'gasbuddy.com',
        fetchedAt: data.fetchedAt,
        marketAverage: data.marketAverage,
        stations: data.stations
      };
      setCached('stations', result);
      return result;
    } catch (err) {
      if (GW_CONFIG.debug) console.warn('[live-data] stations failed:', err.message);
      return { success: false, error: err.message };
    }
  }

  // ============================================
  // Fetch everything in parallel
  // Resolves once all four settle (success or failure).
  // ============================================
  async function fetchAll() {
    const [fx, wti, rbob, stations] = await Promise.all([
      fetchFX(),
      fetchWTI(),
      fetchRBOB(),
      fetchStations()
    ]);
    return {
      fx,
      wti,
      rbob,
      stations,
      fetchedAt: new Date().toISOString(),
      anySuccess: fx.success || wti.success || rbob.success || stations.success
    };
  }

  // ============================================
  // Convert a USD/gal RBOB price into approximate CAD/L
  // (Useful for showing what the wholesale rack roughly translates to)
  // ============================================
  function rbobToCadPerLitre(rbobUsdPerGal, usdCadRate) {
    if (!rbobUsdPerGal || !usdCadRate) return null;
    return (rbobUsdPerGal * usdCadRate) / 3.78541;
  }

  return { fetchFX, fetchWTI, fetchRBOB, fetchStations, fetchAll, clearCache, rbobToCadPerLitre };
})();
