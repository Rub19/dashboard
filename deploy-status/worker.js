const REPO = "Rub19/dashboard";
const WORKFLOW = "deploy-pages.yml";
const CACHE_TTL_MS = 90000;

let cached = null;
let cachedAt = 0;
let pending = null;

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json", "cache-control": "no-store" }
  });
}

async function fetchStatus() {
  const headers = { "user-agent": "ethone-deploy-status", accept: "application/vnd.github+json" };
  const [commitResponse, runsResponse] = await Promise.all([
    fetch(`https://api.github.com/repos/${REPO}/commits/main`, { headers }),
    fetch(`https://api.github.com/repos/${REPO}/actions/workflows/${WORKFLOW}/runs?per_page=1`, { headers })
  ]);
  if (!commitResponse.ok || !runsResponse.ok) return null;
  const commit = await commitResponse.json();
  const runsData = await runsResponse.json();
  const run = runsData.workflow_runs?.[0] || null;
  return {
    commit: {
      sha: String(commit.sha || ""),
      message: String(commit.commit?.message || "").split("\n")[0],
      author: commit.commit?.author?.name || commit.author?.login || "Inconnu",
      date: commit.commit?.author?.date || null,
      url: commit.html_url || ""
    },
    deploy: run ? {
      status: run.status,
      conclusion: run.conclusion,
      title: run.display_title || run.name || "Deploy",
      url: run.html_url,
      updatedAt: run.updated_at || run.run_started_at
    } : null
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
