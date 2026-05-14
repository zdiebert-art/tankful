// Admin auth — Google Identity Services (GIS) ID-token flow.
//
// Flow:
//   1. We render Google's "Sign in with Google" button on the gate.
//   2. User signs in → Google returns an ID token (JWT) via callback.
//   3. We decode the JWT to extract the verified email.
//   4. If the email is on the allowlist, we store the token + email,
//      hide the gate, and reveal the dashboard.
//   5. Sign-out clears the token + email and re-shows the gate.
//
// Token verification: for a personal admin tool we trust GIS's client-side
// callback (the JWT is short-lived and signed by Google). A hardened
// deployment would verify the JWT signature server-side, but there's no
// server here. The allowlist is the practical gate.

const TANKFUL_Admin_Auth = (() => {
  const cfg = window.TANKFUL_ADMIN_CONFIG;
  const KEYS = cfg.storageKeys;

  let onSignInCallback = null;
  let onSignOutCallback = null;

  // ---------- localStorage helpers ----------
  function getStored(key) {
    try { return localStorage.getItem(key); } catch { return null; }
  }
  function setStored(key, value) {
    try { localStorage.setItem(key, value); } catch {}
  }
  function clearStored(key) {
    try { localStorage.removeItem(key); } catch {}
  }

  // ---------- JWT decode (no signature check — see file header) ----------
  function decodeIdToken(jwt) {
    try {
      const payload = jwt.split(".")[1];
      const json = atob(payload.replace(/-/g, "+").replace(/_/g, "/"));
      return JSON.parse(decodeURIComponent(
        json.split("").map(c => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2)).join("")
      ));
    } catch (err) {
      console.warn("[admin-auth] decode failed:", err);
      return null;
    }
  }

  function emailAllowed(email) {
    if (!email) return false;
    return (cfg.allowedEmails || []).map(e => e.toLowerCase()).includes(email.toLowerCase());
  }

  // ---------- GIS button render + callback ----------
  function handleCredentialResponse(response) {
    const payload = decodeIdToken(response.credential);
    if (!payload || !payload.email || !payload.email_verified) {
      showError("Sign-in returned no verified email. Try again.");
      return;
    }
    if (!emailAllowed(payload.email)) {
      showError(`Sorry, ${payload.email} isn't on the admin allowlist.`);
      return;
    }
    setStored(KEYS.googleToken, response.credential);
    setStored(KEYS.googleEmail, payload.email);
    if (onSignInCallback) onSignInCallback(payload.email);
  }

  function showError(msg) {
    const el = document.getElementById("gateError");
    if (!el) return;
    el.textContent = msg;
    el.hidden = false;
  }

  function clearError() {
    const el = document.getElementById("gateError");
    if (el) { el.hidden = true; el.textContent = ""; }
  }

  // Initialize GIS once the script has loaded.
  function init() {
    if (!cfg.googleClientId || cfg.googleClientId.startsWith("REPLACE_")) {
      showError("Google Client ID isn't configured yet. Open the Setup tab (visible after first sign-in) — or read SETUP.md.");
      return;
    }
    if (typeof google === "undefined" || !google.accounts || !google.accounts.id) {
      // GIS script not yet ready — poll.
      setTimeout(init, 200);
      return;
    }

    google.accounts.id.initialize({
      client_id: cfg.googleClientId,
      callback: handleCredentialResponse,
      auto_select: false,
      ux_mode: "popup",
    });

    const btnEl = document.getElementById("googleSignInBtn");
    if (btnEl) {
      google.accounts.id.renderButton(btnEl, {
        type: "standard",
        theme: "filled_black",
        size: "large",
        text: "signin_with",
        shape: "pill",
        logo_alignment: "left",
      });
    }
  }

  // ---------- Public API ----------
  function getStoredEmail() {
    return getStored(KEYS.googleEmail);
  }

  function getStoredToken() {
    return getStored(KEYS.googleToken);
  }

  // Check if the stored JWT still looks valid (we only trust expiration —
  // we don't re-validate the signature client-side).
  function hasValidSession() {
    const token = getStoredToken();
    if (!token) return false;
    const payload = decodeIdToken(token);
    if (!payload) return false;
    if (!emailAllowed(payload.email)) return false;
    if (payload.exp && payload.exp * 1000 < Date.now()) return false;
    return true;
  }

  function signOut() {
    clearStored(KEYS.googleToken);
    clearStored(KEYS.googleEmail);
    // Note: GitHub PAT + Cloudflare token are kept by default so the user
    // doesn't have to re-paste them. If you want full forget-me, also clear
    // KEYS.githubToken + KEYS.cloudflareToken here.
    if (typeof google !== "undefined" && google.accounts && google.accounts.id) {
      google.accounts.id.disableAutoSelect();
    }
    if (onSignOutCallback) onSignOutCallback();
  }

  function onSignIn(cb)  { onSignInCallback = cb; }
  function onSignOut(cb) { onSignOutCallback = cb; }

  // ---------- Secondary tokens (GitHub PAT, Cloudflare API token) ----------
  // These are user-pasted in the Setup tab and persisted across sessions.
  function getGithubToken()        { return getStored(KEYS.githubToken); }
  function setGithubToken(value)   { value ? setStored(KEYS.githubToken, value) : clearStored(KEYS.githubToken); }
  function getCloudflareToken()    { return getStored(KEYS.cloudflareToken); }
  function setCloudflareToken(val) { val ? setStored(KEYS.cloudflareToken, val) : clearStored(KEYS.cloudflareToken); }

  return {
    init,
    getStoredEmail,
    getStoredToken,
    hasValidSession,
    signOut,
    onSignIn,
    onSignOut,
    clearError,
    showError,
    getGithubToken,
    setGithubToken,
    getCloudflareToken,
    setCloudflareToken,
  };
})();

if (typeof window !== "undefined") window.TANKFUL_Admin_Auth = TANKFUL_Admin_Auth;
