const REPO = "Rub19/dashboard";
const WORKFLOW = "deploy-pages.yml";
const SITE_URL = "https://ethone.dev/";
const WORKER_HEALTH_URL = "https://raspy-fog-bf5b.rub19-mailpro.workers.dev/health";
const CACHE_TTL_MS = 90000;
const HEALTH_TIMEOUT_MS = 5000;

let cached = null;
let cachedAt = 0;
let pending = null;

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json", "cache-control": "no-store" }
  });
}

async function checkUp(url, verify) {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), HEALTH_TIMEOUT_MS);
    const response = await fetch(url, { signal: controller.signal }).finally(() => clearTimeout(timer));
    if (!response.ok) return false;
    if (!verify) return true;
    return verify(await response.json());
  } catch {
    return false;
  }
}

async function fetchStatus() {
  const headers = { "user-agent": "ethone-deploy-status", accept: "application/vnd.github+json" };
  const [commitsResponse, runsResponse, siteUp, workerUp] = await Promise.all([
    fetch(`https://api.github.com/repos/${REPO}/commits?sha=main&per_page=5`, { headers }),
    fetch(`https://api.github.com/repos/${REPO}/actions/workflows/${WORKFLOW}/runs?per_page=1`, { headers }),
    checkUp(SITE_URL),
    checkUp(WORKER_HEALTH_URL, (body) => body?.ok === true && body?.data?.status === "ok")
  ]);
  if (!commitsResponse.ok || !runsResponse.ok) return null;
  const commits = await commitsResponse.json();
  const runsData = await runsResponse.json();
  const run = runsData.workflow_runs?.[0] || null;
  return {
    commits: (Array.isArray(commits) ? commits : []).slice(0, 5).map((commit) => ({
      sha: String(commit.sha || ""),
      message: String(commit.commit?.message || "").split("\n")[0],
      author: commit.commit?.author?.name || commit.author?.login || "Inconnu",
      date: commit.commit?.author?.date || null,
      url: commit.html_url || ""
    })),
    deploy: run ? {
      status: run.status,
      conclusion: run.conclusion,
      title: run.display_title || run.name || "Deploy",
      url: run.html_url,
      updatedAt: run.updated_at || run.run_started_at
    } : null,
    health: {
      site: siteUp,
      worker: workerUp
    }
  };
}

// Every browser refresh (auto or manual) hits this Worker, but GitHub's
// unauthenticated API allows only 60 requests/hour total. Cache the result
// so repeated page loads within CACHE_TTL_MS reuse one upstream call.
async function loadStatus() {
  const now = Date.now();
  if (cached && now - cachedAt < CACHE_TTL_MS) return cached;
  if (pending) return pending;
  pending = fetchStatus().then((result) => {
    if (result) {
      cached = result;
      cachedAt = Date.now();
    }
    pending = null;
    return result;
  }).catch((error) => {
    pending = null;
    throw error;
  });
  return pending;
}

export default {
  async fetch(request) {
    const url = new URL(request.url);
    if (url.pathname !== "/api/status") return new Response("Not found", { status: 404 });
    try {
      const status = await loadStatus();
      if (!status) return jsonResponse(cached || { error: "GitHub indisponible pour le moment." }, cached ? 200 : 502);
      return jsonResponse(status);
    } catch {
      return jsonResponse(cached || { error: "Erreur serveur." }, cached ? 200 : 500);
    }
  }
};
