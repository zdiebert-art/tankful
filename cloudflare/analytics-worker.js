// Tankful — Cloudflare Web Analytics proxy.
//
// Why this exists:
//   The browser can't call Cloudflare's GraphQL Analytics API directly —
//   CORS blocks authenticated requests. This Worker accepts requests from
//   the admin dashboard at https://tankful.ca/admin.html, holds the API
//   token as a server-side secret, queries the GraphQL endpoint, and
//   returns the result with the right CORS headers.
//
// Endpoints (all GET, all return JSON):
//   /overview?days=30         — total views + visits + day-by-day series
//   /paths?days=30&limit=10   — top requested paths
//   /countries?days=30&limit=10 — top countries
//   /devices?days=30          — desktop/mobile/tablet split
//
// Deploy: see cloudflare/ANALYTICS-WORKER-SETUP.md for click-by-click
// dashboard instructions, or `wrangler deploy` if you have the CLI.
//
// Required environment variables (set via Worker → Settings → Variables):
//   CF_API_TOKEN     (Secret) — token with "Account → Account Analytics: Read"
//   CF_ACCOUNT_ID    (Plain)  — Cloudflare account ID
//   CF_SITE_TAG      (Plain)  — Web Analytics site tag for tankful.ca
//
// Allowed origins (CORS) are hardcoded below — update if the admin moves.

const ALLOWED_ORIGINS = new Set([
  "https://tankful.ca",
  "https://www.tankful.ca",
  "http://localhost:8765",
  "http://127.0.0.1:8765",
]);

const GRAPHQL_URL = "https://api.cloudflare.com/client/v4/graphql/";

// ---------- helpers ----------

function corsHeaders(origin) {
  const allow = ALLOWED_ORIGINS.has(origin) ? origin : "https://tankful.ca";
  return {
    "Access-Control-Allow-Origin":  allow,
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age":       "86400",
    "Vary":                         "Origin",
  };
}

function json(body, init = {}, origin = "") {
  return new Response(JSON.stringify(body), {
    status: init.status || 200,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      ...corsHeaders(origin),
      ...(init.headers || {}),
    },
  });
}

function dateBackISO(days) {
  return new Date(Date.now() - days * 86400000).toISOString().slice(0, 10);
}
function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

async function graphql(query, variables, env) {
  const res = await fetch(GRAPHQL_URL, {
    method:  "POST",
    headers: {
      "Authorization": `Bearer ${env.CF_API_TOKEN}`,
      "Content-Type":  "application/json",
    },
    body: JSON.stringify({ query, variables }),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Cloudflare GraphQL HTTP ${res.status}: ${text.slice(0, 200)}`);
  }
  const data = await res.json();
  if (data.errors && data.errors.length) {
    throw new Error("Cloudflare GraphQL: " + data.errors.map(e => e.message).join("; "));
  }
  return data.data;
}

// ---------- handlers ----------

async function handleOverview(env, params) {
  const days  = Math.max(1, Math.min(90, parseInt(params.get("days") || "30", 10)));
  const start = dateBackISO(days);
  const end   = todayISO();

  const query = `
    query Totals($accountTag: String!, $filter: AccountRumPageloadEventsAdaptiveGroupsFilter_InputObject!) {
      viewer {
        accounts(filter: { accountTag: $accountTag }) {
          total: rumPageloadEventsAdaptiveGroups(limit: 1, filter: $filter) {
            count
            sum { visits }
          }
          byDay: rumPageloadEventsAdaptiveGroups(
            limit: 1000
            orderBy: [date_ASC]
            filter: $filter
          ) {
            dimensions { date }
            count
            sum { visits }
          }
        }
      }
    }
  `;
  return graphql(query, {
    accountTag: env.CF_ACCOUNT_ID,
    filter:     { siteTag: env.CF_SITE_TAG, date_geq: start, date_leq: end },
  }, env);
}

async function handleTopPaths(env, params) {
  const days  = Math.max(1, Math.min(90, parseInt(params.get("days")  || "30", 10)));
  const limit = Math.max(1, Math.min(50, parseInt(params.get("limit") || "10", 10)));
  const start = dateBackISO(days);
  const end   = todayISO();

  const query = `
    query TopPaths($accountTag: String!, $filter: AccountRumPageloadEventsAdaptiveGroupsFilter_InputObject!, $limit: Int!) {
      viewer {
        accounts(filter: { accountTag: $accountTag }) {
          paths: rumPageloadEventsAdaptiveGroups(
            limit: $limit
            orderBy: [count_DESC]
            filter: $filter
          ) {
            dimensions { metric: requestPath }
            count
            sum { visits }
          }
        }
      }
    }
  `;
  return graphql(query, {
    accountTag: env.CF_ACCOUNT_ID,
    filter:     { siteTag: env.CF_SITE_TAG, date_geq: start, date_leq: end },
    limit,
  }, env);
}

async function handleCountries(env, params) {
  const days  = Math.max(1, Math.min(90, parseInt(params.get("days")  || "30", 10)));
  const limit = Math.max(1, Math.min(50, parseInt(params.get("limit") || "10", 10)));
  const start = dateBackISO(days);
  const end   = todayISO();

  const query = `
    query Countries($accountTag: String!, $filter: AccountRumPageloadEventsAdaptiveGroupsFilter_InputObject!, $limit: Int!) {
      viewer {
        accounts(filter: { accountTag: $accountTag }) {
          countries: rumPageloadEventsAdaptiveGroups(
            limit: $limit
            orderBy: [count_DESC]
            filter: $filter
          ) {
            dimensions { metric: countryName }
            count
          }
        }
      }
    }
  `;
  return graphql(query, {
    accountTag: env.CF_ACCOUNT_ID,
    filter:     { siteTag: env.CF_SITE_TAG, date_geq: start, date_leq: end },
    limit,
  }, env);
}

async function handleDevices(env, params) {
  const days  = Math.max(1, Math.min(90, parseInt(params.get("days") || "30", 10)));
  const start = dateBackISO(days);
  const end   = todayISO();

  const query = `
    query Devices($accountTag: String!, $filter: AccountRumPageloadEventsAdaptiveGroupsFilter_InputObject!) {
      viewer {
        accounts(filter: { accountTag: $accountTag }) {
          devices: rumPageloadEventsAdaptiveGroups(
            limit: 10
            orderBy: [count_DESC]
            filter: $filter
          ) {
            dimensions { metric: deviceType }
            count
          }
        }
      }
    }
  `;
  return graphql(query, {
    accountTag: env.CF_ACCOUNT_ID,
    filter:     { siteTag: env.CF_SITE_TAG, date_geq: start, date_leq: end },
  }, env);
}

// ---------- entry ----------

export default {
  async fetch(request, env) {
    const url    = new URL(request.url);
    const origin = request.headers.get("Origin") || "";

    // Preflight
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders(origin) });
    }
    if (request.method !== "GET") {
      return json({ error: "Method not allowed" }, { status: 405 }, origin);
    }

    // Health check / readiness
    if (url.pathname === "/" || url.pathname === "/health") {
      return json({
        ok: true,
        service: "tankful-analytics-proxy",
        env: {
          hasToken:     Boolean(env.CF_API_TOKEN),
          hasAccountId: Boolean(env.CF_ACCOUNT_ID),
          hasSiteTag:   Boolean(env.CF_SITE_TAG),
        },
      }, {}, origin);
    }

    if (!env.CF_API_TOKEN || !env.CF_ACCOUNT_ID || !env.CF_SITE_TAG) {
      return json({ error: "Worker missing CF_API_TOKEN / CF_ACCOUNT_ID / CF_SITE_TAG env vars" },
                  { status: 500 }, origin);
    }

    try {
      let data;
      if      (url.pathname === "/overview")  data = await handleOverview(env,  url.searchParams);
      else if (url.pathname === "/paths")     data = await handleTopPaths(env,  url.searchParams);
      else if (url.pathname === "/countries") data = await handleCountries(env, url.searchParams);
      else if (url.pathname === "/devices")   data = await handleDevices(env,   url.searchParams);
      else return json({ error: "Not found", path: url.pathname }, { status: 404 }, origin);

      return json(data, {}, origin);
    } catch (err) {
      return json({ error: err.message }, { status: 502 }, origin);
    }
  },
};
