const REPO = "Rub19/dashboard";
const WORKFLOW = "deploy-pages.yml";

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json", "cache-control": "no-store" }
  });
}

async function loadStatus() {
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

export default {
  async fetch(request) {
    const url = new URL(request.url);
    if (url.pathname !== "/api/status") return new Response("Not found", { status: 404 });
    try {
      const status = await loadStatus();
      if (!status) return jsonResponse({ error: "GitHub indisponible pour le moment." }, 502);
      return jsonResponse(status);
    } catch {
      return jsonResponse({ error: "Erreur serveur." }, 500);
    }
  }
};
