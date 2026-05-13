/* ============================================
   TANKFUL — Refinery / supply alert
   Manual toggle. No reliable free API surfaces refinery outage status
   for BC's supply chain (Parkland Burnaby, Tidewater Prince George,
   Cherry Point + Anacortes in WA), so this is a "I heard it on the
   radio" flag the user flips on. While active it:
     - Adds a "Refinery outage" chip to the Holidays modifiers row.
     - Contributes a strong signal to computeLiveVerdict() so the score
       leans toward Fill Up Now.
   Auto-expires after 14 days as a guardrail against forgotten toggles.
   ============================================ */

const TANKFUL_RefineryAlert = (() => {
  const KEY = 'tankful_refinery_outage_v1';
  const MAX_AGE_DAYS = 14;
  const DAY_MS = 86400000;

  function read() {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return null;
      const obj = JSON.parse(raw);
      if (!obj || typeof obj.activatedAt !== 'number') return null;
      return obj;
    } catch (e) { return null; }
  }

  function write(obj) {
    try { localStorage.setItem(KEY, JSON.stringify(obj)); }
    catch (e) { /* quota / private */ }
  }

  function clear() {
    try { localStorage.removeItem(KEY); }
    catch (e) {}
  }

  // ---------- Public: current state ----------
  // Returns { activatedAt, daysActive } or null if not active / expired.
  function current() {
    const obj = read();
    if (!obj) return null;
    const ageMs = Date.now() - obj.activatedAt;
    if (ageMs > MAX_AGE_DAYS * DAY_MS) {
      clear();
      return null;
    }
    return {
      activatedAt: obj.activatedAt,
      daysActive: Math.max(0, Math.floor(ageMs / DAY_MS)),
      note: obj.note || null
    };
  }

  function active() { return !!current(); }

  function activate(note) {
    write({ activatedAt: Date.now(), note: note || null });
  }

  function toggle() {
    if (active()) { clear(); return false; }
    activate();
    return true;
  }

  // ---------- Public: a modifier-shaped object for the holidays row ----------
  // Matches the shape of TANKFUL_Holidays.upcoming() entries so it slots into
  // the existing renderModifiers() pipeline without special-casing.
  function asModifier() {
    const c = current();
    if (!c) return null;
    const detailParts = [];
    if (c.daysActive === 0) detailParts.push('Activated today');
    else if (c.daysActive === 1) detailParts.push('1 day');
    else detailParts.push(`${c.daysActive} days`);
    detailParts.push('Tap to clear');
    return {
      name: 'Refinery outage',
      detail: detailParts.join(' · '),
      icon: 'refinery',
      impact: 10,
      active: true,
      _kind: 'refinery'   // marker so the click handler in app.js can identify it
    };
  }

  return { current, active, activate, clear, toggle, asModifier };
})();
