// Admin dashboard configuration. Edit values here before deploying.
//
// SECURITY NOTE
// -------------
// This is a personal admin tool. Anyone hitting /admin.html can SEE the
// page exists, but the email allowlist + Google SSO gate prevents anyone
// who isn't on the list from rendering the dashboard. The GitHub PAT
// that enables writes is stored in browser localStorage — fine for a
// single-user personal site, but rotate it if you ever sign in on a
// shared device.
//
// All credentials below are values the OWNER supplies after creating the
// matching accounts/tokens. See SETUP.md for the walkthrough.

const TANKFUL_ADMIN_CONFIG = {
  // Comma-separated list of emails permitted to use the dashboard. The
  // Google SSO flow only completes for accounts whose verified email
  // matches one of these.
  allowedEmails: ["zdiebert@gmail.com"],

  // Google OAuth Client ID. Get from console.cloud.google.com →
  // APIs & Services → Credentials → "OAuth 2.0 Client IDs" →
  // create a new Web application client with `https://tankful.ca` and
  // `http://localhost:8765` as authorized origins.
  googleClientId: "281080467284-u9tlf7tb89jggf9v72isodgv7qki5t79.apps.googleusercontent.com",

  // GitHub repo the admin operates on. Used to build API URLs for reads
  // and writes. owner/repo format.
  githubRepo: "zdiebert-art/tankful",

  // Cloudflare Web Analytics site tag — set after enabling Analytics in
  // the Cloudflare dashboard. The traffic tab fetches stats for this tag.
  cloudflareSiteTag: "REPLACE_WITH_CF_SITE_TAG",

  // Cloudflare Account ID (find in Cloudflare dashboard right sidebar).
  // Needed alongside the API token to call the Analytics GraphQL API.
  cloudflareAccountId: "REPLACE_WITH_CF_ACCOUNT_ID",

  // localStorage keys used to cache user-supplied tokens between sessions.
  // Cleared on sign-out.
  storageKeys: {
    googleToken:    "tankful_admin_google_id_token",
    googleEmail:    "tankful_admin_google_email",
    githubToken:    "tankful_admin_github_pat",
    cloudflareToken:"tankful_admin_cf_api_token",
    activeTab:      "tankful_admin_active_tab",
  },

  // Default tab to open when no preference is remembered.
  defaultTab: "overview",
};

if (typeof window !== "undefined") window.TANKFUL_ADMIN_CONFIG = TANKFUL_ADMIN_CONFIG;
