// Main admin entry. Wires the auth gate to the dashboard shell, handles
// tab switching, and remembers the last-opened tab between sessions.

(() => {
  const cfg = window.TANKFUL_ADMIN_CONFIG;
  const Auth = window.TANKFUL_Admin_Auth;
  const Views = window.TANKFUL_Admin_Views;
  const KEYS = cfg.storageKeys;

  const gate  = document.getElementById("adminGate");
  const shell = document.getElementById("adminShell");

  // ---------- Tab routing ----------
  function setActiveTab(tab) {
    if (!tab) tab = cfg.defaultTab;
    document.querySelectorAll(".admin-tab").forEach(b => {
      b.classList.toggle("active", b.dataset.tab === tab);
    });
    document.querySelectorAll(".admin-panel").forEach(p => {
      p.classList.toggle("active", p.id === `panel-${tab}`);
    });
    try { localStorage.setItem(KEYS.activeTab, tab); } catch {}
    Views.render(tab);
  }

  document.getElementById("adminTabs").addEventListener("click", (e) => {
    const btn = e.target.closest(".admin-tab");
    if (!btn) return;
    setActiveTab(btn.dataset.tab);
  });

  // ---------- Gate ↔ shell visibility ----------
  function showDashboard(email) {
    gate.hidden = true;
    shell.hidden = false;
    const emailEl = document.getElementById("adminEmail");
    if (emailEl) emailEl.textContent = email;

    // Restore last-active tab or open default.
    let lastTab = cfg.defaultTab;
    try { lastTab = localStorage.getItem(KEYS.activeTab) || cfg.defaultTab; } catch {}
    setActiveTab(lastTab);
  }

  function showGate() {
    gate.hidden = false;
    shell.hidden = true;
  }

  // ---------- Sign-in / sign-out ----------
  Auth.onSignIn((email) => {
    Auth.clearError();
    showDashboard(email);
  });

  Auth.onSignOut(() => {
    showGate();
  });

  document.getElementById("adminSignoutBtn").addEventListener("click", () => {
    Auth.signOut();
  });

  // ---------- Boot ----------
  // If we already have a valid session, skip the gate. Otherwise wait for
  // GIS to render its button + the user to sign in.
  if (Auth.hasValidSession()) {
    showDashboard(Auth.getStoredEmail());
  } else {
    showGate();
    Auth.init();
  }
})();
