// Render functions for each admin dashboard tab. One function per tab,
// each receives the panel element it should fill. Views are responsible
// for fetching their own data + setting up their own event handlers.

const TANKFUL_Admin_Views = (() => {
  const cfg = window.TANKFUL_ADMIN_CONFIG;
  const GH   = () => window.TANKFUL_Admin_GitHub;
  const CF   = () => window.TANKFUL_Admin_Cloudflare;
  const Auth = () => window.TANKFUL_Admin_Auth;

  // ---------- shared helpers ----------
  function loading(panel, msg) {
    panel.innerHTML = `<div class="admin-loading">${msg || "Loading…"}</div>`;
  }

  function errorBox(msg, hint) {
    return `<div class="admin-error"><strong>Couldn't load.</strong> ${escapeHtml(msg)}${hint ? `<br><small>${hint}</small>` : ""}</div>`;
  }

  function escapeHtml(s) {
    return String(s || "").replace(/[&<>"']/g, c => ({ "&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;" }[c]));
  }

  function fmtRelative(iso) {
    if (!iso) return "—";
    const ms = Date.now() - Date.parse(iso);
    const s = Math.round(ms / 1000);
    if (s < 60)    return `${s}s ago`;
    const m = Math.round(s / 60);
    if (m < 60)    return `${m}m ago`;
    const h = Math.round(m / 60);
    if (h < 24)    return `${h}h ago`;
    const d = Math.round(h / 24);
    return `${d}d ago`;
  }

  function fmtDuration(ms) {
    if (!Number.isFinite(ms)) return "—";
    const s = Math.round(ms / 1000);
    if (s < 60) return `${s}s`;
    const m = Math.floor(s / 60);
    const rem = s % 60;
    return `${m}m ${rem}s`;
  }

  function fmtDate(iso) {
    if (!iso) return "—";
    return new Date(iso).toLocaleString();
  }

  function setStatus(msg) {
    const el = document.getElementById("adminStatus");
    if (el) el.textContent = msg;
  }

  function toast(msg, kind = "info") {
    const el = document.getElementById("adminToast");
    if (!el) return;
    el.className = `admin-toast admin-toast--${kind}`;
    el.textContent = msg;
    el.hidden = false;
    clearTimeout(toast._t);
    toast._t = setTimeout(() => { el.hidden = true; }, 4000);
  }

  // ============================================
  // Overview tab — summary cards.
  // ============================================
  async function renderOverview(panel) {
    loading(panel, "Loading overview…");
    const cards = [];
    try {
      const manifestRes = await fetch("data/regions.json?t=" + Date.now(), { cache: "no-store" });
      const manifest = await manifestRes.json();

      let totalStations = 0;
      let totalRegions  = (manifest.regions || []).length;
      let oldestFetch   = null;
      const regionRows  = [];

      for (const r of manifest.regions || []) {
        try {
          const pricesRes = await fetch(r.pricesUrl + "?t=" + Date.now(), { cache: "no-store" });
          const prices = await pricesRes.json();
          totalStations += prices.stationCount || 0;
          if (!oldestFetch || (prices.fetchedAt && Date.parse(prices.fetchedAt) < Date.parse(oldestFetch))) {
            oldestFetch = prices.fetchedAt;
          }
          regionRows.push({
            id: r.id, name: r.name,
            stationCount: prices.stationCount,
            marketAverage: prices.marketAverage,
            fetchedAt: prices.fetchedAt,
            zones: (r.zones || []).length,
          });
        } catch (err) {
          regionRows.push({ id: r.id, name: r.name, error: err.message });
        }
      }

      panel.innerHTML = `
        <div class="admin-cards">
          <div class="admin-card">
            <div class="admin-card-label">Regions</div>
            <div class="admin-card-value">${totalRegions}</div>
            <div class="admin-card-sub">${regionRows.filter(r => !r.error).map(r => r.name).join(" · ")}</div>
          </div>
          <div class="admin-card">
            <div class="admin-card-label">Stations tracked</div>
            <div class="admin-card-value">${totalStations}</div>
            <div class="admin-card-sub">${regionRows.filter(r => !r.error).map(r => `${r.name}: ${r.stationCount}`).join(" · ")}</div>
          </div>
          <div class="admin-card">
            <div class="admin-card-label">Last successful crawl</div>
            <div class="admin-card-value">${fmtRelative(oldestFetch)}</div>
            <div class="admin-card-sub">${fmtDate(oldestFetch)}</div>
          </div>
          <div class="admin-card">
            <div class="admin-card-label">Manifest updated</div>
            <div class="admin-card-value">${fmtRelative(manifest.updatedAt)}</div>
            <div class="admin-card-sub">${fmtDate(manifest.updatedAt)}</div>
          </div>
        </div>

        <h2 class="admin-section-title">Per-region snapshot</h2>
        <table class="admin-table">
          <thead><tr>
            <th>Region</th><th>Stations</th><th>Zones</th><th>Market avg</th><th>Last fetch</th>
          </tr></thead>
          <tbody>
            ${regionRows.map(r => r.error
              ? `<tr><td>${escapeHtml(r.name)}</td><td colspan="4" class="admin-cell-error">${escapeHtml(r.error)}</td></tr>`
              : `<tr>
                  <td><strong>${escapeHtml(r.name)}</strong> <small class="admin-mute">${r.id}</small></td>
                  <td>${r.stationCount}</td>
                  <td>${r.zones || "—"}</td>
                  <td>${r.marketAverage ? r.marketAverage.toFixed(1) + "¢" : "—"}</td>
                  <td title="${escapeHtml(fmtDate(r.fetchedAt))}">${fmtRelative(r.fetchedAt)}</td>
                </tr>`
            ).join("")}
          </tbody>
        </table>
      `;
    } catch (err) {
      panel.innerHTML = errorBox(err.message);
    }
  }

  // ============================================
  // Crawls tab — recent GitHub Actions runs.
  // ============================================
  async function renderCrawls(panel) {
    loading(panel, "Loading recent workflow runs…");
    try {
      const runs = await GH().listWorkflowRuns("refresh-prices.yml", 50);

      const totals = {
        success:  runs.filter(r => r.conclusion === "success").length,
        failure:  runs.filter(r => r.conclusion === "failure").length,
        skipped:  runs.filter(r => r.conclusion === "skipped").length,
        running:  runs.filter(r => r.status !== "completed").length,
      };

      panel.innerHTML = `
        <div class="admin-cards">
          <div class="admin-card"><div class="admin-card-label">Last 50 runs</div><div class="admin-card-value">${runs.length}</div></div>
          <div class="admin-card admin-card--good"><div class="admin-card-label">Success</div><div class="admin-card-value">${totals.success}</div></div>
          <div class="admin-card admin-card--bad"><div class="admin-card-label">Failed</div><div class="admin-card-value">${totals.failure}</div></div>
          <div class="admin-card"><div class="admin-card-label">Running</div><div class="admin-card-value">${totals.running}</div></div>
        </div>

        <div class="admin-toolbar">
          <button class="admin-btn admin-btn--primary" id="triggerScrapeBtn">↻ Run scrape now</button>
          <span class="admin-mute">Triggers <code>workflow_dispatch</code> on <code>refresh-prices.yml</code></span>
        </div>

        <h2 class="admin-section-title">Recent runs</h2>
        <table class="admin-table">
          <thead><tr>
            <th>Result</th><th>Event</th><th>Scheduled</th><th>Started</th><th>Duration</th><th></th>
          </tr></thead>
          <tbody>
            ${runs.map(r => {
              const cls = r.conclusion === "success" ? "good"
                        : r.conclusion === "failure" ? "bad"
                        : r.status !== "completed"   ? "warn" : "mute";
              const label = r.status === "completed" ? r.conclusion : r.status;
              const queueDelay = r.runStartedAt && r.createdAt
                ? Date.parse(r.runStartedAt) - Date.parse(r.createdAt)
                : null;
              return `<tr>
                <td><span class="admin-pill admin-pill--${cls}">${escapeHtml(label || "—")}</span></td>
                <td>${escapeHtml(r.event)}</td>
                <td title="${escapeHtml(fmtDate(r.createdAt))}">${fmtRelative(r.createdAt)}</td>
                <td title="Queue delay: ${fmtDuration(queueDelay)}">${fmtRelative(r.runStartedAt)}</td>
                <td>${fmtDuration(r.durationMs)}</td>
                <td><a href="${r.htmlUrl}" target="_blank" rel="noopener">Open ↗</a></td>
              </tr>`;
            }).join("")}
          </tbody>
        </table>
      `;

      const btn = document.getElementById("triggerScrapeBtn");
      if (btn) {
        btn.addEventListener("click", async () => {
          if (!Auth().getGithubToken()) {
            toast("Add a GitHub PAT in the Setup tab first.", "error");
            return;
          }
          btn.disabled = true;
          try {
            await GH().dispatchWorkflow("refresh-prices.yml");
            toast("Scrape triggered. New run will appear in ~10 seconds.", "good");
            setTimeout(() => renderCrawls(panel), 8000);
          } catch (err) {
            toast(err.message, "error");
          } finally {
            btn.disabled = false;
          }
        });
      }
    } catch (err) {
      panel.innerHTML = errorBox(err.message, "If this is a rate-limit error, add a GitHub PAT in the Setup tab.");
    }
  }

  // ============================================
  // Regions tab — overview of each region's config + current data.
  // ============================================
  async function renderRegions(panel) {
    loading(panel, "Loading region configs…");
    try {
      const manifestRes = await fetch("data/regions.json?t=" + Date.now(), { cache: "no-store" });
      const manifest = await manifestRes.json();

      const regionBlocks = await Promise.all((manifest.regions || []).map(async (r) => {
        let prices = null;
        try {
          const pricesRes = await fetch(r.pricesUrl + "?t=" + Date.now(), { cache: "no-store" });
          prices = await pricesRes.json();
        } catch {}

        const zonesHtml = (r.zones || []).length
          ? `<ul class="admin-list">${r.zones.map(z => `<li><strong>${escapeHtml(z.name)}</strong> <small class="admin-mute">${z.id}</small></li>`).join("")}</ul>`
          : `<p class="admin-mute">No zones declared (small region).</p>`;

        return `
          <div class="admin-region-block">
            <div class="admin-region-head">
              <h3>${escapeHtml(r.name)}</h3>
              <code class="admin-mute">${r.id}</code>
            </div>
            <div class="admin-region-grid">
              <div>
                <div class="admin-mute">Stations live</div>
                <div class="admin-big">${prices ? prices.stationCount : "—"}</div>
              </div>
              <div>
                <div class="admin-mute">Market avg</div>
                <div class="admin-big">${prices && prices.marketAverage != null ? prices.marketAverage.toFixed(1) + "¢" : "—"}</div>
              </div>
              <div>
                <div class="admin-mute">Last fetch</div>
                <div class="admin-big" title="${escapeHtml(fmtDate(prices && prices.fetchedAt))}">${fmtRelative(prices && prices.fetchedAt)}</div>
              </div>
            </div>
            <div class="admin-region-zones">
              <h4>Zones</h4>
              ${zonesHtml}
            </div>
          </div>
        `;
      }));

      panel.innerHTML = `
        <p class="admin-mute">Region configs live in <code>scrape/regions/*.js</code>. To add a new region or change zones, edit the source files (Stations tab supports per-station edits).</p>
        <div class="admin-region-list">${regionBlocks.join("")}</div>
      `;
    } catch (err) {
      panel.innerHTML = errorBox(err.message);
    }
  }

  // ============================================
  // Stations tab — full list with per-station edit modal.
  // Edits trigger a GitHub commit that rewrites the region's JS config.
  // ============================================
  async function renderStations(panel) {
    loading(panel, "Loading stations…");
    try {
      const manifestRes = await fetch("data/regions.json?t=" + Date.now(), { cache: "no-store" });
      const manifest = await manifestRes.json();

      const allStations = [];
      for (const r of manifest.regions || []) {
        try {
          const pricesRes = await fetch(r.pricesUrl + "?t=" + Date.now(), { cache: "no-store" });
          const prices = await pricesRes.json();
          for (const s of prices.stations || []) {
            allStations.push({ ...s, regionId: r.id, regionName: r.name });
          }
        } catch {}
      }

      panel.innerHTML = `
        <div class="admin-toolbar">
          <input class="admin-input" id="stationFilter" placeholder="Filter by name, address, brand…" />
          <select class="admin-input" id="stationRegionFilter">
            <option value="">All regions</option>
            ${(manifest.regions || []).map(r => `<option value="${r.id}">${escapeHtml(r.name)}</option>`).join("")}
          </select>
        </div>
        <table class="admin-table" id="stationTable">
          <thead><tr>
            <th>Region</th><th>Zone</th><th>Brand</th><th>C-store</th><th>Address</th><th>Price</th><th>Discount</th><th></th>
          </tr></thead>
          <tbody>
            ${allStations.map(s => `
              <tr data-id="${escapeHtml(s.id)}" data-region="${escapeHtml(s.regionId)}">
                <td>${escapeHtml(s.regionName)}</td>
                <td>${escapeHtml(s.zone || "—")}</td>
                <td><strong>${escapeHtml(s.fuelBrand || "—")}</strong></td>
                <td>${escapeHtml(s.cstoreBrand || "")}</td>
                <td>${escapeHtml(s.address)}</td>
                <td>${s.price != null ? s.price.toFixed(1) + "¢" : "—"}</td>
                <td>${s.discount ? `${s.discount.amount}¢ ${escapeHtml(s.discount.label)}` : "—"}</td>
                <td><button class="admin-btn admin-btn--small" data-action="edit-station">Edit</button></td>
              </tr>
            `).join("")}
          </tbody>
        </table>
      `;

      const tbody = panel.querySelector("#stationTable tbody");
      const filter = panel.querySelector("#stationFilter");
      const regionFilter = panel.querySelector("#stationRegionFilter");

      function applyFilters() {
        const q = (filter.value || "").toLowerCase();
        const region = regionFilter.value;
        tbody.querySelectorAll("tr").forEach(tr => {
          const text = tr.textContent.toLowerCase();
          const inRegion = !region || tr.dataset.region === region;
          tr.style.display = inRegion && (!q || text.includes(q)) ? "" : "none";
        });
      }
      filter.addEventListener("input", applyFilters);
      regionFilter.addEventListener("change", applyFilters);

      tbody.addEventListener("click", (e) => {
        const btn = e.target.closest('[data-action="edit-station"]');
        if (!btn) return;
        const tr = btn.closest("tr");
        const id = tr.dataset.id;
        const region = tr.dataset.region;
        const station = allStations.find(s => s.id === id && s.regionId === region);
        openStationEditor(station);
      });
    } catch (err) {
      panel.innerHTML = errorBox(err.message);
    }
  }

  // Edit one station via a GitHub commit that rewrites the region's
  // config file. Surgical regex replace inside the matching object literal.
  function openStationEditor(station) {
    const modal = document.createElement("div");
    modal.className = "admin-modal";
    modal.innerHTML = `
      <div class="admin-modal-card">
        <h3>Edit ${escapeHtml(station.fuelBrand || station.name)} <small class="admin-mute">${escapeHtml(station.id)}</small></h3>
        <p class="admin-mute">Address + GasBuddy match keys are read-only — changing them risks breaking the matcher.</p>
        <div class="admin-field"><label>Fuel brand</label><input id="edit-fuelBrand" value="${escapeHtml(station.fuelBrand || "")}"/></div>
        <div class="admin-field"><label>C-store brand</label><input id="edit-cstoreBrand" value="${escapeHtml(station.cstoreBrand || "")}"/></div>
        <div class="admin-field"><label>Logo brand override</label><input id="edit-logoBrand" value="${escapeHtml(station.logoBrand || "")}" placeholder="(leave blank to use fuel brand)"/></div>
        <div class="admin-field"><label>Zone</label><input id="edit-zone" value="${escapeHtml(station.zone || "")}"/></div>
        <div class="admin-field"><label>Discount amount (¢/L)</label><input id="edit-discAmt" type="number" step="0.1" value="${station.discount ? station.discount.amount : ""}"/></div>
        <div class="admin-field"><label>Discount label</label><input id="edit-discLabel" value="${escapeHtml(station.discount ? station.discount.label : "")}" placeholder="e.g. with Canco card"/></div>
        <div class="admin-modal-actions">
          <button class="admin-btn" data-action="cancel">Cancel</button>
          <button class="admin-btn admin-btn--primary" data-action="save">Save → commit to main</button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);

    modal.addEventListener("click", async (e) => {
      if (e.target.dataset.action === "cancel" || e.target === modal) {
        modal.remove();
        return;
      }
      if (e.target.dataset.action === "save") {
        const next = {
          fuelBrand:   modal.querySelector("#edit-fuelBrand").value.trim() || null,
          cstoreBrand: modal.querySelector("#edit-cstoreBrand").value.trim() || null,
          logoBrand:   modal.querySelector("#edit-logoBrand").value.trim() || null,
          zone:        modal.querySelector("#edit-zone").value.trim() || null,
          discAmt:     parseFloat(modal.querySelector("#edit-discAmt").value),
          discLabel:   modal.querySelector("#edit-discLabel").value.trim(),
        };
        e.target.disabled = true;
        try {
          await saveStationEdit(station, next);
          toast("Saved. Commit pushed to main; deploy ~5 min.", "good");
          modal.remove();
        } catch (err) {
          toast(err.message, "error");
          e.target.disabled = false;
        }
      }
    });
  }

  async function saveStationEdit(station, next) {
    if (!Auth().getGithubToken()) throw new Error("Set a GitHub PAT in the Setup tab first.");
    const path = `scrape/regions/${station.regionId}.js`;
    const { content, sha } = await GH().getFile(path);

    // Find the station object literal by id and rewrite its fields. We
    // match the entry by `id: "<stationId>"` and replace the whole object
    // literal up to the matching closing brace.
    const idEsc = station.id.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&");
    const re = new RegExp(`(\\{[^{}]*id:\\s*"${idEsc}"[^{}]*\\})`, "g");
    const match = content.match(re);
    if (!match || match.length !== 1) {
      throw new Error(`Couldn't locate station entry for ${station.id} (found ${match ? match.length : 0} matches).`);
    }
    const original = match[0];

    let updated = original;
    updated = setField(updated, "fuelBrand",   next.fuelBrand);
    updated = setField(updated, "cstoreBrand", next.cstoreBrand);
    updated = setField(updated, "logoBrand",   next.logoBrand);
    updated = setField(updated, "zone",        next.zone);

    // Discount needs special handling — it's an object literal or absent.
    updated = setDiscount(updated, next.discAmt, next.discLabel);

    if (updated === original) {
      throw new Error("Nothing changed.");
    }

    const newContent = content.replace(original, updated);

    await GH().putFile({
      path,
      content: newContent,
      sha,
      message: `chore(regions): admin edit to ${station.id}`,
    });
  }

  // Replace `<field>: <value>` or add it before the closing brace.
  function setField(obj, field, value) {
    const fieldEsc = field.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const has = new RegExp(`${fieldEsc}:\\s*("[^"]*"|null)`).test(obj);
    if (value === null || value === undefined || value === "") {
      // Remove the field (or set to null if it's a known nullable).
      if (has) {
        return obj.replace(new RegExp(`,?\\s*${fieldEsc}:\\s*("[^"]*"|null)`), "");
      }
      return obj;
    }
    const literal = `${field}: ${JSON.stringify(value)}`;
    if (has) {
      return obj.replace(new RegExp(`${fieldEsc}:\\s*("[^"]*"|null)`), literal);
    }
    // Insert before the closing brace.
    return obj.replace(/\}$/, `, ${literal} }`);
  }

  function setDiscount(obj, amt, label) {
    const re = /discount:\s*(\{[^}]*\}|null)/;
    if (!Number.isFinite(amt) || amt <= 0) {
      // Remove the discount field if present.
      return obj.replace(/,?\s*discount:\s*(\{[^}]*\}|null)/, "");
    }
    const lit = `discount: { type: "card", amount: ${amt}, label: ${JSON.stringify(label || "card discount")} }`;
    if (re.test(obj)) return obj.replace(re, lit);
    return obj.replace(/\}$/, `, ${lit} }`);
  }

  // ============================================
  // History tab — chart per region of all retained samples.
  // ============================================
  async function renderHistory(panel) {
    loading(panel, "Loading retention charts…");
    try {
      const manifestRes = await fetch("data/regions.json?t=" + Date.now(), { cache: "no-store" });
      const manifest = await manifestRes.json();

      panel.innerHTML = manifest.regions.map(r => `
        <div class="admin-chart-block">
          <h3>${escapeHtml(r.name)} <small class="admin-mute">${r.id}</small></h3>
          <div id="chart-${r.id}" class="admin-chart"></div>
          <p class="admin-mute" id="meta-${r.id}">Loading samples…</p>
        </div>
      `).join("");

      for (const r of manifest.regions) {
        try {
          const histRes = await fetch(r.historyUrl + "?t=" + Date.now(), { cache: "no-store" });
          const hist = await histRes.json();
          const samples = (hist.samples || []).filter(s => Number.isFinite(s.marketAverage));
          const series = samples.map(s => ({ x: Date.parse(s.at), y: s.marketAverage }));

          new ApexCharts(document.getElementById(`chart-${r.id}`), {
            chart: { type: "line", height: 240, toolbar: { show: true }, animations: { enabled: false } },
            series: [{ name: r.name, data: series }],
            stroke: { width: 2, curve: "smooth" },
            xaxis: { type: "datetime" },
            yaxis: { labels: { formatter: v => v.toFixed(1) + "¢" } },
            tooltip: { x: { format: "MMM dd, HH:mm" } },
            theme: { mode: "light" },
            colors: ["#1E3A8A"],
          }).render();

          const meta = document.getElementById(`meta-${r.id}`);
          if (meta) {
            meta.textContent = `${samples.length} samples · oldest ${fmtRelative(samples[0]?.at)} · newest ${fmtRelative(samples[samples.length-1]?.at)}`;
          }
        } catch (err) {
          document.getElementById(`meta-${r.id}`).innerHTML = `<span class="admin-cell-error">${escapeHtml(err.message)}</span>`;
        }
      }
    } catch (err) {
      panel.innerHTML = errorBox(err.message);
    }
  }

  // ============================================
  // Settings tab — cron, retention, refinery alert toggle, manual scrape.
  // ============================================
  async function renderSettings(panel) {
    loading(panel, "Loading settings…");
    try {
      // Read the workflow YAML + scraper file to surface current cron + retention.
      const [workflow, scraper] = await Promise.all([
        GH().getRawFile(".github/workflows/refresh-prices.yml"),
        GH().getRawFile("scrape/fetch-prices.js"),
      ]);

      const cronMatch = workflow.match(/cron:\s*"([^"]+)"/);
      const cron = cronMatch ? cronMatch[1] : "(not detected)";

      const hourlyMatch = scraper.match(/const HOURLY_DAYS\s*=\s*(\d+)/);
      const maxMatch    = scraper.match(/const MAX_DAYS\s*=\s*([^;]+)/);
      const hourly = hourlyMatch ? hourlyMatch[1] : "?";
      const max    = maxMatch ? maxMatch[1].trim() : "?";

      panel.innerHTML = `
        <h2 class="admin-section-title">Scraper schedule</h2>
        <div class="admin-form">
          <div class="admin-field">
            <label>Cron expression (UTC)</label>
            <input id="settings-cron" value="${escapeHtml(cron)}"/>
            <small class="admin-mute">Currently: hourly between 6am-8pm PT (UTC-7 year-round, BC has no DST). Default is <code>0 13-23,0-3 * * *</code>.</small>
          </div>
          <button class="admin-btn admin-btn--primary" id="saveCronBtn">Save cron</button>
        </div>

        <h2 class="admin-section-title">History retention</h2>
        <div class="admin-form">
          <div class="admin-field">
            <label>Hourly-detail days</label>
            <input id="settings-hourly" type="number" min="1" max="365" value="${escapeHtml(hourly)}"/>
            <small class="admin-mute">Samples within this window are kept verbatim. Older samples collapse to one daily average.</small>
          </div>
          <div class="admin-field">
            <label>Total retention</label>
            <input id="settings-max" value="${escapeHtml(max)}"/>
            <small class="admin-mute">Anything older is dropped. Default <code>365 * 5</code> (5 years).</small>
          </div>
          <button class="admin-btn admin-btn--primary" id="saveRetentionBtn">Save retention</button>
        </div>

        <h2 class="admin-section-title">Manual trigger</h2>
        <p>Kick off an unscheduled scrape (workflow_dispatch on <code>refresh-prices.yml</code>).</p>
        <button class="admin-btn admin-btn--primary" id="settingsTriggerBtn">↻ Run scrape now</button>
      `;

      document.getElementById("saveCronBtn").addEventListener("click", async (e) => {
        const v = document.getElementById("settings-cron").value.trim();
        if (!v) return toast("Cron can't be empty.", "error");
        e.target.disabled = true;
        try {
          const { content, sha } = await GH().getFile(".github/workflows/refresh-prices.yml");
          const updated = content.replace(/cron:\s*"[^"]+"/, `cron: "${v}"`);
          if (updated === content) throw new Error("No cron line found in workflow.");
          await GH().putFile({
            path: ".github/workflows/refresh-prices.yml",
            content: updated, sha,
            message: `chore(workflow): admin update cron to "${v}"`,
          });
          toast("Cron updated. New schedule takes effect on the next run.", "good");
        } catch (err) { toast(err.message, "error"); }
        finally       { e.target.disabled = false; }
      });

      document.getElementById("saveRetentionBtn").addEventListener("click", async (e) => {
        const hourly = parseInt(document.getElementById("settings-hourly").value, 10);
        const max    = document.getElementById("settings-max").value.trim();
        if (!Number.isFinite(hourly) || !max) return toast("Both retention values required.", "error");
        e.target.disabled = true;
        try {
          const { content, sha } = await GH().getFile("scrape/fetch-prices.js");
          let updated = content
            .replace(/const HOURLY_DAYS\s*=\s*\d+;/, `const HOURLY_DAYS = ${hourly};`)
            .replace(/const MAX_DAYS\s*=\s*[^;]+;/, `const MAX_DAYS    = ${max};`);
          if (updated === content) throw new Error("Retention constants not found.");
          await GH().putFile({
            path: "scrape/fetch-prices.js",
            content: updated, sha,
            message: `chore(scrape): admin update retention to hourly=${hourly}, max=${max}`,
          });
          toast("Retention updated.", "good");
        } catch (err) { toast(err.message, "error"); }
        finally       { e.target.disabled = false; }
      });

      document.getElementById("settingsTriggerBtn").addEventListener("click", async (e) => {
        e.target.disabled = true;
        try {
          await GH().dispatchWorkflow("refresh-prices.yml");
          toast("Scrape triggered.", "good");
        } catch (err) { toast(err.message, "error"); }
        finally       { e.target.disabled = false; }
      });
    } catch (err) {
      panel.innerHTML = errorBox(err.message);
    }
  }

  // ============================================
  // Traffic tab — Cloudflare Web Analytics.
  // ============================================
  async function renderTraffic(panel) {
    if (!Auth().getCloudflareToken()) {
      panel.innerHTML = errorBox("Cloudflare API token not set.", "Add one in the Setup tab — needs the 'Account Analytics: Read' permission.");
      return;
    }
    loading(panel, "Loading traffic data…");
    try {
      const [overview, paths, countries, devices] = await Promise.all([
        CF().getOverview(30),
        CF().getTopPaths(30, 10),
        CF().getCountries(30, 10),
        CF().getDevices(30),
      ]);

      const acct       = overview.viewer.accounts[0] || {};
      const totalRow   = (acct.total || [])[0];
      const totalViews = totalRow ? totalRow.count : 0;
      const totalVisits= totalRow && totalRow.sum ? totalRow.sum.visits : 0;
      const byDay      = acct.byDay || [];

      panel.innerHTML = `
        <div class="admin-cards">
          <div class="admin-card"><div class="admin-card-label">Page views (30d)</div><div class="admin-card-value">${totalViews.toLocaleString()}</div></div>
          <div class="admin-card"><div class="admin-card-label">Visits (30d)</div><div class="admin-card-value">${totalVisits.toLocaleString()}</div></div>
          <div class="admin-card"><div class="admin-card-label">Avg views/day</div><div class="admin-card-value">${Math.round(totalViews / 30)}</div></div>
        </div>

        <h2 class="admin-section-title">Daily traffic (30d)</h2>
        <div id="trafficChart" class="admin-chart"></div>

        <div class="admin-side-by-side">
          <div>
            <h2 class="admin-section-title">Top pages</h2>
            <table class="admin-table">
              <thead><tr><th>Path</th><th>Views</th></tr></thead>
              <tbody>
                ${((paths.viewer.accounts[0] || {}).paths || []).map(row => `
                  <tr><td><code>${escapeHtml(row.dimensions.metric || "/")}</code></td><td>${row.count}</td></tr>
                `).join("")}
              </tbody>
            </table>
          </div>
          <div>
            <h2 class="admin-section-title">Top countries</h2>
            <table class="admin-table">
              <thead><tr><th>Country</th><th>Views</th></tr></thead>
              <tbody>
                ${((countries.viewer.accounts[0] || {}).countries || []).map(row => `
                  <tr><td>${escapeHtml(row.dimensions.metric || "—")}</td><td>${row.count}</td></tr>
                `).join("")}
              </tbody>
            </table>
          </div>
        </div>

        <h2 class="admin-section-title">Device types</h2>
        <table class="admin-table">
          <thead><tr><th>Device</th><th>Views</th></tr></thead>
          <tbody>
            ${((devices.viewer.accounts[0] || {}).devices || []).map(row => `
              <tr><td>${escapeHtml(row.dimensions.metric || "—")}</td><td>${row.count}</td></tr>
            `).join("")}
          </tbody>
        </table>
      `;

      const series = byDay.map(d => ({ x: Date.parse(d.dimensions.date), y: d.count }));
      new ApexCharts(document.getElementById("trafficChart"), {
        chart: { type: "area", height: 240, toolbar: { show: false }, animations: { enabled: false } },
        series: [{ name: "Views", data: series }],
        stroke: { width: 2, curve: "smooth" },
        fill:   { type: "gradient", gradient: { opacityFrom: 0.4, opacityTo: 0 } },
        xaxis:  { type: "datetime" },
        colors: ["#7E22CE"],
      }).render();
    } catch (err) {
      panel.innerHTML = errorBox(err.message);
    }
  }

  // ============================================
  // Setup tab — token entry + status.
  // ============================================
  function renderSetup(panel) {
    const gh = Auth().getGithubToken();
    const cf = Auth().getCloudflareToken();

    panel.innerHTML = `
      <p class="admin-mute">Paste credentials below — they're stored in this browser only (localStorage). See <a href="ADMIN-SETUP.md" target="_blank">ADMIN-SETUP.md</a> for the full walkthrough.</p>

      <h2 class="admin-section-title">GitHub Personal Access Token</h2>
      <p>Fine-grained PAT scoped to <code>${escapeHtml(cfg.githubRepo)}</code> with <strong>Contents: write</strong> and <strong>Actions: write</strong>.</p>
      <div class="admin-field">
        <label>Token (starts with <code>github_pat_</code>)</label>
        <input id="setup-github" type="password" placeholder="${gh ? "(token saved — paste a new one to replace)" : "github_pat_…"}"/>
      </div>
      <div class="admin-toolbar">
        <button class="admin-btn admin-btn--primary" data-action="save-github">Save GitHub PAT</button>
        ${gh ? `<button class="admin-btn" data-action="clear-github">Clear</button>` : ""}
        <button class="admin-btn" data-action="test-github">Test connection</button>
        <span id="ghStatus" class="admin-mute">${gh ? "✓ token saved" : "no token"}</span>
      </div>

      <h2 class="admin-section-title">Cloudflare API Token</h2>
      <p>Token with <strong>Account → Account Analytics: Read</strong>. Create at
        <a href="https://dash.cloudflare.com/profile/api-tokens" target="_blank" rel="noopener">Cloudflare → Profile → API Tokens</a>.</p>
      <div class="admin-field">
        <label>Token</label>
        <input id="setup-cf" type="password" placeholder="${cf ? "(token saved — paste a new one to replace)" : ""}"/>
      </div>
      <div class="admin-toolbar">
        <button class="admin-btn admin-btn--primary" data-action="save-cf">Save Cloudflare token</button>
        ${cf ? `<button class="admin-btn" data-action="clear-cf">Clear</button>` : ""}
        <span id="cfStatus" class="admin-mute">${cf ? "✓ token saved" : "no token"}</span>
      </div>

      <h2 class="admin-section-title">External setup status</h2>
      <ul class="admin-checklist">
        <li class="${cfg.googleClientId.startsWith("REPLACE_") ? "todo" : "done"}">
          Google OAuth Client ID configured in <code>js/admin-config.js</code>
        </li>
        <li class="${cfg.cloudflareSiteTag.startsWith("REPLACE_") ? "todo" : "done"}">
          Cloudflare Web Analytics site tag configured
        </li>
        <li class="${cfg.cloudflareAccountId.startsWith("REPLACE_") ? "todo" : "done"}">
          Cloudflare Account ID configured
        </li>
        <li class="${gh ? "done" : "todo"}">GitHub PAT saved (this browser)</li>
        <li class="${cf ? "done" : "todo"}">Cloudflare API token saved (this browser)</li>
      </ul>
    `;

    panel.addEventListener("click", async (e) => {
      const a = e.target.dataset.action;
      if (a === "save-github") {
        const v = document.getElementById("setup-github").value.trim();
        if (!v) return toast("Paste a token first.", "error");
        Auth().setGithubToken(v);
        toast("Saved.", "good");
        renderSetup(panel);
      }
      if (a === "clear-github") {
        Auth().setGithubToken(null);
        toast("Cleared.", "info");
        renderSetup(panel);
      }
      if (a === "test-github") {
        try {
          const u = await GH().whoAmI();
          toast(`✓ Authed as ${u.login}`, "good");
        } catch (err) { toast(err.message, "error"); }
      }
      if (a === "save-cf") {
        const v = document.getElementById("setup-cf").value.trim();
        if (!v) return toast("Paste a token first.", "error");
        Auth().setCloudflareToken(v);
        toast("Saved.", "good");
        renderSetup(panel);
      }
      if (a === "clear-cf") {
        Auth().setCloudflareToken(null);
        toast("Cleared.", "info");
        renderSetup(panel);
      }
    });
  }

  // ---------- Dispatch table ----------
  const renderers = {
    overview: renderOverview,
    crawls:   renderCrawls,
    regions:  renderRegions,
    stations: renderStations,
    history:  renderHistory,
    settings: renderSettings,
    traffic:  renderTraffic,
    setup:    renderSetup,
  };

  function render(tab) {
    const panel = document.getElementById(`panel-${tab}`);
    if (!panel || !renderers[tab]) return;
    renderers[tab](panel);
  }

  return { render };
})();

if (typeof window !== "undefined") window.TANKFUL_Admin_Views = TANKFUL_Admin_Views;
