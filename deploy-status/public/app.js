function timeAgo(iso) {
  const diff = Math.max(0, Date.now() - new Date(iso).getTime());
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "a l'instant";
  if (minutes < 60) return "il y a " + minutes + " min";
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return "il y a " + hours + " h";
  const days = Math.floor(hours / 24);
  return "il y a " + days + " j";
}

function badge(label, tone) {
  return '<span class="badge is-' + tone + '">' + label + "</span>";
}

function renderCommits(commits) {
  const host = document.getElementById("commit-body");
  if (!commits || !commits.length) {
    host.innerHTML = '<p class="empty">Aucun commit trouve.</p>';
    return;
  }
  host.innerHTML = commits.map((commit) =>
    '<div class="row">' +
      '<div>' +
        '<p class="title">' + commit.message + "</p>" +
        '<p class="meta">' +
          '<a class="sha" href="' + (commit.url || "#") + '" target="_blank" rel="noopener noreferrer">' + commit.sha.slice(0, 7) + "</a>" +
          " &middot; " + commit.author + (commit.date ? " &middot; " + timeAgo(commit.date) : "") +
        "</p>" +
      "</div>" +
    "</div>"
  ).join("");
}

function renderHealth(health) {
  const host = document.getElementById("health-body");
  if (!health) {
    host.innerHTML = '<p class="empty">Verification indisponible.</p>';
    return;
  }
  const item = (label, up) => badge(label, up ? "success" : "danger");
  host.innerHTML =
    '<div class="row">' + item("ethone.dev", health.site) + item("ETHONE Worker", health.worker) + "</div>";
}

function renderDeploy(run) {
  const host = document.getElementById("deploy-body");
  if (!run) {
    host.innerHTML = '<p class="empty">Aucun deploiement trouve.</p>';
    return;
  }
  const inProgress = run.status !== "completed";
  const success = run.conclusion === "success";
  const tone = inProgress ? "warning" : success ? "success" : "danger";
  const label = inProgress ? "En cours" : success ? "Reussi" : "Echec";
  host.innerHTML =
    '<div class="row">' +
      badge(label, tone) +
      '<div>' +
        '<p class="title"><a href="' + run.url + '" target="_blank" rel="noopener noreferrer">' + run.title + "</a></p>" +
        '<p class="meta">' + timeAgo(run.updatedAt) + "</p>" +
      "</div>" +
    "</div>";
}

async function refreshAll() {
  const button = document.getElementById("refresh-btn");
  button.disabled = true;
  try {
    const response = await fetch("/api/status", { headers: { accept: "application/json" } });
    if (!response.ok) throw new Error("Statut indisponible (" + response.status + ").");
    const data = await response.json();
    renderHealth(data.health);
    renderCommits(data.commits);
    renderDeploy(data.deploy);
    document.getElementById("updated-at").textContent = "Actualise " + timeAgo(new Date().toISOString());
  } catch (error) {
    document.getElementById("health-body").innerHTML = '<p class="empty">' + error.message + "</p>";
    document.getElementById("commit-body").innerHTML = '<p class="empty">' + error.message + "</p>";
    document.getElementById("deploy-body").innerHTML = '<p class="empty">' + error.message + "</p>";
  }
  button.disabled = false;
}

document.getElementById("refresh-btn").addEventListener("click", refreshAll);
refreshAll();
setInterval(refreshAll, 300000);
