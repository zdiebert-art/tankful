// Cloudflare Web Analytics wrapper.
//
// Talks to our proxy worker at cloudflare/analytics-worker.js (set in
// admin-config.js as analyticsWorkerUrl). The worker holds the API token
// server-side, runs the GraphQL query, and returns JSON with proper CORS
// headers — direct browser calls to Cloudflare's GraphQL API are blocked
// by CORS, so the worker is necessary.

const TANKFUL_Admin_Cloudflare = (() => {
  const cfg = window.TANKFUL_ADMIN_CONFIG;

  function workerUrl() {
    const url = cfg.analyticsWorkerUrl || "";
    return url.replace(/\/$/, "");  // trim any trailing slash
  }

  function isConfigured() {
    return Boolean(workerUrl());
  }

  async function get(endpoint, params = {}) {
    if (!isConfigured()) {
      throw new Error("Analytics worker URL not set. See cloudflare/ANALYTICS-WORKER-SETUP.md.");
    }
    const qs = new URLSearchParams(params).toString();
    const url = `${workerUrl()}${endpoint}${qs ? "?" + qs : ""}`;
    const res = await fetch(url);
    if (!res.ok) {
      let detail = "";
      try { detail = " — " + (await res.text()).slice(0, 200); } catch {}
      throw new Error(`Worker ${endpoint} returned ${res.status}${detail}`);
    }
    return res.json();
  }

  function getOverview(days = 30)   { return get("/overview",  { days }); }
  function getTopPaths(days = 30, limit = 10) { return get("/paths", { days, limit }); }
  function getCountries(days = 30, limit = 10) { return get("/countries", { days, limit }); }
  function getDevices(days = 30)    { return get("/devices",   { days }); }
  function health()                 { return get("/health"); }

  return { isConfigured, getOverview, getTopPaths, getCountries, getDevices, health };
})();

if (typeof window !== "undefined") window.TANKFUL_Admin_Cloudflare = TANKFUL_Admin_Cloudflare;
