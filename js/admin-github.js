// GitHub REST API wrapper for the admin dashboard.
//
// Read endpoints work unauthenticated (60 req/hour shared rate limit on
// public endpoints) but the dashboard uses the user's PAT for higher
// limits + write access. The PAT is fine-grained, scoped to this repo,
// and grants Contents: write + Actions: write.
//
// All methods return parsed JSON on success, throw on failure.

const TANKFUL_Admin_GitHub = (() => {
  const cfg = window.TANKFUL_ADMIN_CONFIG;
  const API_ROOT = "https://api.github.com";
  const REPO = cfg.githubRepo;

  function headers() {
    const h = {
      "Accept":               "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
    };
    const token = window.TANKFUL_Admin_Auth && TANKFUL_Admin_Auth.getGithubToken();
    if (token) h["Authorization"] = `Bearer ${token}`;
    return h;
  }

  async function req(path, opts = {}) {
    const url = path.startsWith("http") ? path : `${API_ROOT}${path}`;
    const res = await fetch(url, {
      method: opts.method || "GET",
      headers: { ...headers(), ...(opts.headers || {}) },
      body:    opts.body || undefined,
    });
    if (!res.ok) {
      let detail = "";
      try { detail = " — " + (await res.text()).slice(0, 200); } catch {}
      throw new Error(`GitHub ${opts.method || "GET"} ${path} returned ${res.status}${detail}`);
    }
    if (res.status === 204) return null;
    return res.json();
  }

  // ---------- Read endpoints ----------

  // Recent commits on main. Returns array of { sha, message, author, date }.
  async function listCommits(limit = 50) {
    const data = await req(`/repos/${REPO}/commits?per_page=${limit}`);
    return data.map(c => ({
      sha:     c.sha.slice(0, 7),
      fullSha: c.sha,
      message: (c.commit.message || "").split("\n")[0],
      author:  (c.author && c.author.login) || c.commit.author.name,
      date:    c.commit.author.date,
      url:     c.html_url,
    }));
  }

  // Workflow runs for a specific workflow file (e.g. "refresh-prices.yml").
  async function listWorkflowRuns(workflowFile = "refresh-prices.yml", limit = 50) {
    const data = await req(`/repos/${REPO}/actions/workflows/${workflowFile}/runs?per_page=${limit}`);
    return (data.workflow_runs || []).map(r => ({
      id:           r.id,
      name:         r.name,
      status:       r.status,            // queued | in_progress | completed
      conclusion:   r.conclusion,        // success | failure | cancelled | skipped | null
      event:        r.event,             // schedule | workflow_dispatch | push
      createdAt:    r.created_at,
      updatedAt:    r.updated_at,
      runStartedAt: r.run_started_at,
      durationMs:   r.updated_at && r.run_started_at
                      ? Date.parse(r.updated_at) - Date.parse(r.run_started_at)
                      : null,
      htmlUrl:      r.html_url,
    }));
  }

  // List ALL workflows in the repo (for the settings view).
  async function listWorkflows() {
    const data = await req(`/repos/${REPO}/actions/workflows`);
    return (data.workflows || []).map(w => ({
      id:    w.id,
      name:  w.name,
      path:  w.path,
      state: w.state,
    }));
  }

  // Get file contents at HEAD on main. Returns { content (decoded text), sha }.
  async function getFile(path) {
    const data = await req(`/repos/${REPO}/contents/${encodeURIComponent(path)}?ref=main`);
    const content = atob((data.content || "").replace(/\n/g, ""));
    return { content, sha: data.sha, path: data.path };
  }

  // Get the raw file via the raw.githubusercontent URL (bypasses base64
  // round-trip — useful for big JSON files).
  async function getRawFile(path) {
    const url = `https://raw.githubusercontent.com/${REPO}/main/${path}?t=${Date.now()}`;
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) throw new Error(`Raw fetch ${path} returned ${res.status}`);
    return res.text();
  }

  // ---------- Write endpoints ----------

  // Create or update a file directly on main. Pass the previous sha so
  // GitHub can reject if the file has changed since last read (optimistic
  // concurrency control).
  async function putFile({ path, content, message, sha }) {
    const body = {
      message,
      content: btoa(unescape(encodeURIComponent(content))),
      branch:  "main",
    };
    if (sha) body.sha = sha;
    return req(`/repos/${REPO}/contents/${encodeURIComponent(path)}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify(body),
    });
  }

  // Trigger a workflow_dispatch run for a given workflow.
  async function dispatchWorkflow(workflowFile = "refresh-prices.yml", inputs = {}) {
    return req(`/repos/${REPO}/actions/workflows/${workflowFile}/dispatches`, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ ref: "main", inputs }),
    });
  }

  // ---------- Convenience: "is the PAT working?" ----------
  async function whoAmI() {
    return req("/user");
  }

  // ---------- Rate-limit visibility ----------
  async function rateLimit() {
    return req("/rate_limit");
  }

  return {
    listCommits,
    listWorkflowRuns,
    listWorkflows,
    getFile,
    getRawFile,
    putFile,
    dispatchWorkflow,
    whoAmI,
    rateLimit,
  };
})();

if (typeof window !== "undefined") window.TANKFUL_Admin_GitHub = TANKFUL_Admin_GitHub;
