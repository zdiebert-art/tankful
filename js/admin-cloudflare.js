// Cloudflare Web Analytics API wrapper.
//
// Cloudflare exposes Web Analytics through a GraphQL endpoint at
// api.cloudflare.com/client/v4/graphql. The API token needs the
// "Account Analytics: Read" permission for the account.
//
// All methods return raw JSON; the view layer formats numbers/dates.

const TANKFUL_Admin_Cloudflare = (() => {
  const cfg = window.TANKFUL_ADMIN_CONFIG;
  const GQL_URL = "https://api.cloudflare.com/client/v4/graphql/";

  function headers() {
    const token = window.TANKFUL_Admin_Auth && TANKFUL_Admin_Auth.getCloudflareToken();
    return {
      "Authorization": `Bearer ${token || ""}`,
      "Content-Type":  "application/json",
    };
  }

  async function gql(query, variables) {
    const res = await fetch(GQL_URL, {
      method:  "POST",
      headers: headers(),
      body:    JSON.stringify({ query, variables }),
    });
    if (!res.ok) {
      throw new Error(`Cloudflare GraphQL returned ${res.status}`);
    }
    const data = await res.json();
    if (data.errors && data.errors.length) {
      throw new Error("Cloudflare GraphQL error: " + data.errors.map(e => e.message).join("; "));
    }
    return data.data;
  }

  // ISO-8601 window helpers — Cloudflare expects YYYY-MM-DD or full ISO.
  function dateBack(days) {
    const d = new Date(Date.now() - days * 86400000);
    return d.toISOString().slice(0, 10);
  }
  function today() {
    return new Date().toISOString().slice(0, 10);
  }

  // Pull a basic 30-day overview: total visits, page views, average per day.
  async function getOverview(daysBack = 30) {
    if (!cfg.cloudflareAccountId || cfg.cloudflareAccountId.startsWith("REPLACE_")) {
      throw new Error("Cloudflare Account ID not configured");
    }
    if (!cfg.cloudflareSiteTag || cfg.cloudflareSiteTag.startsWith("REPLACE_")) {
      throw new Error("Cloudflare site tag not configured");
    }

    const query = `
      query Totals($accountTag: string!, $siteTag: string!, $start: Date!, $end: Date!) {
        viewer {
          accounts(filter: { accountTag: $accountTag }) {
            total: rumPageloadEventsAdaptiveGroups(
              limit: 1
              filter: { siteTag: $siteTag, date_geq: $start, date_leq: $end }
            ) {
              count
              sum { visits }
            }
            byDay: rumPageloadEventsAdaptiveGroups(
              limit: 1000
              orderBy: [date_ASC]
              filter: { siteTag: $siteTag, date_geq: $start, date_leq: $end }
            ) {
              dimensions { date }
              count
              sum { visits }
            }
          }
        }
      }
    `;
    return gql(query, {
      accountTag: cfg.cloudflareAccountId,
      siteTag:    cfg.cloudflareSiteTag,
      start:      dateBack(daysBack),
      end:        today(),
    });
  }

  // Top paths over the window.
  async function getTopPaths(daysBack = 30, limit = 10) {
    const query = `
      query TopPaths($accountTag: string!, $siteTag: string!, $start: Date!, $end: Date!, $limit: Int!) {
        viewer {
          accounts(filter: { accountTag: $accountTag }) {
            paths: rumPageloadEventsAdaptiveGroups(
              limit: $limit
              orderBy: [count_DESC]
              filter: { siteTag: $siteTag, date_geq: $start, date_leq: $end }
            ) {
              dimensions { metric: requestPath }
              count
              sum { visits }
            }
          }
        }
      }
    `;
    return gql(query, {
      accountTag: cfg.cloudflareAccountId,
      siteTag:    cfg.cloudflareSiteTag,
      start:      dateBack(daysBack),
      end:        today(),
      limit,
    });
  }

  // Country breakdown.
  async function getCountries(daysBack = 30, limit = 10) {
    const query = `
      query Countries($accountTag: string!, $siteTag: string!, $start: Date!, $end: Date!, $limit: Int!) {
        viewer {
          accounts(filter: { accountTag: $accountTag }) {
            countries: rumPageloadEventsAdaptiveGroups(
              limit: $limit
              orderBy: [count_DESC]
              filter: { siteTag: $siteTag, date_geq: $start, date_leq: $end }
            ) {
              dimensions { metric: countryName }
              count
              sum { visits }
            }
          }
        }
      }
    `;
    return gql(query, {
      accountTag: cfg.cloudflareAccountId,
      siteTag:    cfg.cloudflareSiteTag,
      start:      dateBack(daysBack),
      end:        today(),
      limit,
    });
  }

  // Device + browser breakdown — uses the userAgent.device + browser dims.
  async function getDevices(daysBack = 30) {
    const query = `
      query Devices($accountTag: string!, $siteTag: string!, $start: Date!, $end: Date!) {
        viewer {
          accounts(filter: { accountTag: $accountTag }) {
            devices: rumPageloadEventsAdaptiveGroups(
              limit: 10
              orderBy: [count_DESC]
              filter: { siteTag: $siteTag, date_geq: $start, date_leq: $end }
            ) {
              dimensions { metric: deviceType }
              count
            }
          }
        }
      }
    `;
    return gql(query, {
      accountTag: cfg.cloudflareAccountId,
      siteTag:    cfg.cloudflareSiteTag,
      start:      dateBack(daysBack),
      end:        today(),
    });
  }

  return { getOverview, getTopPaths, getCountries, getDevices };
})();

if (typeof window !== "undefined") window.TANKFUL_Admin_Cloudflare = TANKFUL_Admin_Cloudflare;
