(function () {
  "use strict";

  if (window.__ethoneMorningBriefingLoaded) return;
  window.__ethoneMorningBriefingLoaded = true;

  var STORAGE_KEY = "ethone:morning-briefing:last-shown";
  var root = null;
  var autoTimer = 0;
  var clockTimer = 0;

  function profile() {
    try { return typeof window.curP === "function" ? window.curP() : null; } catch (e) { return null; }
  }

  function state() {
    var p = profile();
    return p && p.state ? p.state : {};
  }

  function esc(value) {
    return String(value == null ? "" : value).replace(/[&<>"]/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c];
    });
  }

  function lang() {
    try { return typeof window._lang !== "undefined" ? window._lang : "fr"; } catch (e) { return "fr"; }
  }

  function text(fr, en, es, de) {
    var l = lang();
    if (l === "en") return en || fr;
    if (l === "es") return es || en || fr;
    if (l === "de") return de || en || fr;
    return fr;
  }

  function todayKey(date) {
    date = date || new Date();
    return [
      date.getFullYear(),
      String(date.getMonth() + 1).padStart(2, "0"),
      String(date.getDate()).padStart(2, "0")
    ].join("-");
  }

  function isMorning() {
    var hour = new Date().getHours();
    return hour >= 5 && hour < 12;
  }

  function isAppVisible() {
    var app = document.getElementById("app") || document.querySelector(".app-shell,.dashboard-shell,.ethone-app");
    var auth = document.querySelector(".auth-shell,.auth-page,.login-page,#auth-screen");
    if (auth && getComputedStyle(auth).display !== "none" && !auth.hidden) return false;
    if (!app) return !!profile();
    var styles = getComputedStyle(app);
    return styles.display !== "none" && styles.visibility !== "hidden" && app.offsetParent !== null;
  }

  function getUserName() {
    var p = profile() || {};
    var possible = [
      p.name,
      p.username,
      p.displayName,
      p.email ? String(p.email).split("@")[0] : "",
      state().displayName,
      state().username,
      state().profile && state().profile.name,
      state().profile && state().profile.username
    ];
    for (var i = 0; i < possible.length; i += 1) {
      if (possible[i] && String(possible[i]).trim()) return String(possible[i]).trim();
    }
    return text("Utilisateur", "User", "Usuario", "Benutzer");
  }

  function asArray(value) {
    return Array.isArray(value) ? value : [];
  }

  function isDone(item) {
    return !!(item && (item.done || item.completed || item.status === "done" || item.status === "completed" || item.checked));
  }

  function countTasks(s) {
    var tasks = []
      .concat(asArray(s.todos))
      .concat(asArray(s.tasks))
      .concat(asArray(s.items && s.items.tasks));
    var seen = {};
    return tasks.filter(function (task, index) {
      var id = task && (task.id || task.uid || task.title || task.text || index);
      if (seen[id]) return false;
      seen[id] = true;
      return task && !isDone(task);
    }).length;
  }

  function countEventsToday(s) {
    var key = todayKey();
    var events = []
      .concat(asArray(s.events))
      .concat(asArray(s.calendar))
      .concat(asArray(s.calendarEvents));
    return events.filter(function (event) {
      var raw = event && (event.date || event.day || event.start || event.startDate || event.datetime);
      return raw && String(raw).slice(0, 10) === key;
    }).length;
  }

  function countGoals(s) {
    var goals = []
      .concat(asArray(s.goals))
      .concat(asArray(s.objectives));
    return goals.filter(function (goal) { return goal && !isDone(goal); }).length;
  }

  function connection(s, id) {
    var c = s.connections || {};
    return c[id] || (s.integrations && s.integrations[id]) || {};
  }

  function spotifyMinutesYesterday(s) {
    var spotify = connection(s, "spotify");
    var sources = [
      spotify.minutesYesterday,
      spotify.yesterdayMinutes,
      spotify.listeningMinutesYesterday,
      s.spotifyMinutesYesterday,
      s.spotify && s.spotify.minutesYesterday
    ];
    for (var i = 0; i < sources.length; i += 1) {
      var n = Number(sources[i]);
      if (Number.isFinite(n) && n >= 0) return n;
    }
    var history = asArray(spotify.history).concat(asArray(s.spotifyHistory));
    if (!history.length) return null;
    var yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    var key = todayKey(yesterday);
    var minutes = 0;
    history.forEach(function (entry) {
      var raw = entry && (entry.date || entry.playedAt || entry.timestamp || entry.time);
      if (raw && String(raw).slice(0, 10) === key) minutes += Number(entry.minutes || entry.durationMinutes || 3) || 3;
    });
    return minutes || null;
  }

  function formatMinutes(minutes) {
    if (minutes == null) return null;
    var hours = Math.floor(minutes / 60);
    var rest = Math.round(minutes % 60);
    if (hours && rest) return hours + "h " + rest + "m";
    if (hours) return hours + "h";
    return rest + "m";
  }

  function githubCommitsThisWeek(s) {
    var github = connection(s, "github");
    var arrays = []
      .concat(asArray(github.commits))
      .concat(asArray(github.events))
      .concat(asArray(github.activity))
      .concat(asArray(s.githubCommits))
      .concat(asArray(s.githubActivity))
      .concat(asArray(s.github && s.github.commits))
      .concat(asArray(s.github && s.github.events));
    if (!arrays.length) {
      var fallback = Number(github.weeklyCommits || github.commitsThisWeek || (s.github && s.github.commitsThisWeek));
      return Number.isFinite(fallback) ? fallback : null;
    }
    var since = Date.now() - 7 * 24 * 60 * 60 * 1000;
    var commits = 0;
    arrays.forEach(function (item) {
      var type = String((item && (item.type || item.event || item.kind)) || "").toLowerCase();
      var message = String((item && (item.message || item.title || item.summary)) || "").toLowerCase();
      var looksCommit = !type || type.indexOf("commit") >= 0 || type.indexOf("push") >= 0 || message.indexOf("commit") >= 0;
      var raw = item && (item.date || item.created_at || item.createdAt || item.time || item.timestamp);
      var date = raw ? new Date(raw).getTime() : Date.now();
      if (looksCommit && (!raw || date >= since)) commits += Number(item.count || item.commits || 1) || 1;
    });
    return commits;
  }

  function weatherSummary(s) {
    var cache = s.weatherCache || s.weather || (s.widgets && s.widgets.weather) || {};
    var temp = cache.temp || cache.temperature || cache.currentTemp || (cache.current && cache.current.temp);
    var condition = cache.condition || cache.summary || cache.description || (cache.current && cache.current.condition);
    var city = cache.city || cache.location || cache.name || "";
    if (temp || condition || city) {
      return [temp ? String(Math.round(Number(temp))) + "°" : "", condition, city].filter(Boolean).join(" · ");
    }
    return text("Météo prête à synchroniser", "Weather ready to sync", "Meteo lista para sincronizar", "Wetter bereit zur Synchronisierung");
  }

  function quoteSummary(s) {
    var quote = s.quoteCache || s.dailyQuote || s.quote || {};
    if (typeof quote === "string") return quote;
    if (quote.text || quote.quote) return (quote.text || quote.quote) + (quote.author ? " — " + quote.author : "");
    return text(
      "Construis une journée plus simple que la précédente.",
      "Build a simpler day than yesterday.",
      "Construye un día más simple que ayer.",
      "Gestalte einen einfacheren Tag als gestern."
    );
  }

  function currentWorkspace(s) {
    try {
      if (window.ETHONESpaces && typeof window.ETHONESpaces.getActive === "function") {
        var space = window.ETHONESpaces.getActive();
        if (space && (space.name || space.label)) return space.name || space.label;
      }
    } catch (e) {}
    return s.activeWorkspaceName || s.workspaceName || s.activeSpaceName || text("Principal", "Main", "Principal", "Hauptbereich");
  }

  function aiSuggestion(metrics) {
    if (metrics.tasks > 0 && metrics.events > 0) {
      return text(
        "Commence par la tâche la plus courte, puis vérifie ton calendrier avant de lancer une session focus.",
        "Start with the shortest task, then check your calendar before starting a focus session.",
        "Empieza por la tarea más corta y revisa tu calendario antes de iniciar una sesión de enfoque.",
        "Beginne mit der kürzesten Aufgabe und prüfe danach den Kalender vor einer Fokus-Session."
      );
    }
    if (metrics.tasks > 0) {
      return text(
        "Brain recommande de choisir une seule priorité et de la terminer avant d'ouvrir tes intégrations.",
        "Brain recommends choosing one priority and finishing it before opening integrations.",
        "Brain recomienda elegir una prioridad y terminarla antes de abrir integraciones.",
        "Brain empfiehlt, eine Priorität zu wählen und sie vor den Integrationen abzuschließen."
      );
    }
    return text(
      "Ton espace est calme. C'est le bon moment pour planifier ou nettoyer ton workspace.",
      "Your space is calm. This is a good moment to plan or clean your workspace.",
      "Tu espacio está tranquilo. Es buen momento para planificar o limpiar tu workspace.",
      "Dein Space ist ruhig. Ein guter Moment zum Planen oder Aufräumen."
    );
  }

  function collectBriefing() {
    var s = state();
    var metrics = {
      tasks: countTasks(s),
      events: countEventsToday(s),
      goals: countGoals(s),
      github: githubCommitsThisWeek(s)
    };
    return {
      name: getUserName(),
      workspace: currentWorkspace(s),
      metrics: metrics,
      spotify: spotifyMinutesYesterday(s),
      weather: weatherSummary(s),
      quote: quoteSummary(s),
      suggestion: aiSuggestion(metrics)
    };
  }

  function formatClock(date) {
    try {
      return date.toLocaleTimeString(lang() === "en" ? "en-US" : lang() === "de" ? "de-DE" : lang() === "es" ? "es-ES" : "fr-FR", {
        hour: "2-digit",
        minute: "2-digit"
      });
    } catch (e) {
      return String(date.getHours()).padStart(2, "0") + ":" + String(date.getMinutes()).padStart(2, "0");
    }
  }

  function formatDate(date) {
    try {
      return date.toLocaleDateString(lang() === "en" ? "en-US" : lang() === "de" ? "de-DE" : lang() === "es" ? "es-ES" : "fr-FR", {
        weekday: "long",
        month: "long",
        day: "numeric"
      });
    } catch (e) {
      return todayKey(date);
    }
  }

  function ensureRoot() {
    if (root && document.body.contains(root)) return root;
    root = document.createElement("section");
    root.className = "ethone-morning-briefing";
    root.setAttribute("role", "dialog");
    root.setAttribute("aria-modal", "true");
    root.setAttribute("aria-label", "ETHONE Morning Briefing");
    document.body.appendChild(root);
    root.addEventListener("click", function (event) {
      if (event.target === root) close();
    });
    root.addEventListener("click", function (event) {
      var action = event.target && event.target.closest ? event.target.closest("[data-briefing-action]") : null;
      if (!action) return;
      var id = action.getAttribute("data-briefing-action");
      if (id === "close") close();
      if (id === "tasks") { close(); if (typeof window.switchPage === "function") window.switchPage("todos", null); }
      if (id === "brain") {
        close();
        if (window.ETHONEAIEverywhere && typeof window.ETHONEAIEverywhere.openCopilot === "function") {
          window.ETHONEAIEverywhere.openCopilot({ source: "morning-briefing" });
        } else if (typeof window.switchPage === "function") {
          window.switchPage("ai", null);
        }
      }
    });
    return root;
  }

  function metricCard(label, value, sub, icon) {
    return [
      '<article class="morning-briefing-card">',
      '<div class="briefing-card-label">' + esc(label) + '<span>' + esc(icon) + '</span></div>',
      '<div class="briefing-card-value">' + esc(value) + '</div>',
      '<div class="briefing-card-sub">' + esc(sub) + '</div>',
      '</article>'
    ].join("");
  }

  function render() {
    var data = collectBriefing();
    var now = new Date();
    var githubValue = data.metrics.github == null ? "—" : data.metrics.github;
    var spotify = formatMinutes(data.spotify);
    ensureRoot().innerHTML = [
      '<div class="morning-briefing-shell" tabindex="-1">',
      '<button class="morning-briefing-close" type="button" aria-label="Close briefing" data-briefing-action="close">×</button>',
      '<header class="morning-briefing-hero">',
      '<div>',
      '<div class="morning-briefing-kicker">' + esc(text("Briefing du matin", "Morning briefing", "Briefing de la mañana", "Morgenbriefing")) + '</div>',
      '<h2 class="morning-briefing-title">' + esc(text("Bonjour", "Good morning", "Buenos días", "Guten Morgen")) + ' ' + esc(data.name) + '</h2>',
      '<p class="morning-briefing-subtitle">' + esc(text("Brain a préparé ton espace", "Brain prepared your space", "Brain preparó tu espacio", "Brain hat deinen Space vorbereitet")) + ' · ' + esc(data.workspace) + '</p>',
      '</div>',
      '<aside class="morning-briefing-time">',
      '<div class="morning-briefing-clock" data-briefing-clock>' + esc(formatClock(now)) + '</div>',
      '<div class="morning-briefing-date" data-briefing-date>' + esc(formatDate(now)) + '</div>',
      '</aside>',
      '</header>',
      '<div class="morning-briefing-body">',
      '<section class="morning-briefing-grid">',
      metricCard(text("Tâches", "Tasks", "Tareas", "Aufgaben"), data.metrics.tasks, text("à traiter aujourd'hui", "open today", "abiertas hoy", "heute offen"), "Task"),
      metricCard(text("Événements", "Events", "Eventos", "Termine"), data.metrics.events, text("dans ton calendrier", "on your calendar", "en tu calendario", "im Kalender"), "Cal"),
      metricCard(text("Objectifs", "Goals", "Objetivos", "Ziele"), data.metrics.goals, text("encore actifs", "still active", "activos", "aktiv"), "Goal"),
      metricCard("Spotify", spotify || "—", spotify ? text("écouté hier", "listened yesterday", "ayer", "gestern") : text("connecte Spotify pour l'historique", "connect Spotify for history", "conecta Spotify", "Spotify verbinden"), "Music"),
      metricCard("GitHub", githubValue, data.metrics.github == null ? text("connexion à synchroniser", "connection to sync", "conexión por sincronizar", "Sync ausstehend") : text("commits cette semaine", "commits this week", "commits esta semana", "Commits diese Woche"), "Git"),
      metricCard(text("Météo", "Weather", "Meteo", "Wetter"), data.weather, text("pour ton briefing", "for your briefing", "para tu briefing", "für dein Briefing"), "Sky"),
      '</section>',
      '<aside class="morning-briefing-panel">',
      '<div class="morning-briefing-focus">',
      '<h3 class="briefing-focus-title">' + esc(text("Suggestion IA", "AI suggestion", "Sugerencia IA", "KI-Vorschlag")) + '</h3>',
      '<p class="briefing-focus-text">' + esc(data.suggestion) + '</p>',
      '</div>',
      '<div class="briefing-mini-row">',
      '<div class="briefing-mini"><strong>' + esc(text("État ETHONE", "ETHONE status", "Estado ETHONE", "ETHONE Status")) + '</strong><span>' + esc(text("Workspace prêt, synchronisation locale stable.", "Workspace ready, local sync stable.", "Workspace listo, sincronización local estable.", "Workspace bereit, lokale Synchronisierung stabil.")) + '</span></div>',
      '<div class="briefing-mini"><strong>' + esc(text("Citation", "Quote", "Cita", "Zitat")) + '</strong><span class="briefing-quote">' + esc(data.quote) + '</span></div>',
      '</div>',
      '</aside>',
      '</div>',
      '<footer class="morning-briefing-actions">',
      '<button class="morning-briefing-button primary" type="button" data-briefing-action="close">' + esc(text("Commencer la journée", "Start the day", "Empezar el día", "Tag starten")) + '</button>',
      '<button class="morning-briefing-button" type="button" data-briefing-action="tasks">' + esc(text("Voir les tâches", "View tasks", "Ver tareas", "Aufgaben anzeigen")) + '</button>',
      '<button class="morning-briefing-button" type="button" data-briefing-action="brain">' + esc(text("Demander à Brain", "Ask Brain", "Preguntar a Brain", "Brain fragen")) + '</button>',
      '</footer>',
      '</div>'
    ].join("");
    startClock();
  }

  function startClock() {
    clearInterval(clockTimer);
    clockTimer = setInterval(function () {
      if (!root || !root.classList.contains("is-open")) return;
      var now = new Date();
      var clock = root.querySelector("[data-briefing-clock]");
      var date = root.querySelector("[data-briefing-date]");
      if (clock) clock.textContent = formatClock(now);
      if (date) date.textContent = formatDate(now);
    }, 30000);
  }

  function open(options) {
    options = options || {};
    if (!options.manual && !isAppVisible()) return;
    render();
    var schedule = window.ETHONE_SAFE_MODE ? function (fn) { return setTimeout(fn, 16); } : window.requestAnimationFrame;
    (schedule || function (fn) { return setTimeout(fn, 16); })(function () {
      ensureRoot().classList.add("is-open");
      var shell = root.querySelector(".morning-briefing-shell");
      if (shell) {
        try { shell.focus({ preventScroll: true }); } catch (e) { shell.focus(); }
      }
    });
    if (!options.manual) markShown();
  }

  function close() {
    if (!root) return;
    root.classList.remove("is-open");
    clearInterval(clockTimer);
  }

  function alreadyShownToday() {
    var key = todayKey();
    try {
      if (localStorage.getItem(STORAGE_KEY) === key) return true;
    } catch (e) {}
    var s = state();
    return !!(s.morningBriefing && s.morningBriefing.lastShownDate === key);
  }

  function markShown() {
    var key = todayKey();
    try { localStorage.setItem(STORAGE_KEY, key); } catch (e) {}
    try {
      var p = profile();
      if (p && p.state) {
        p.state.morningBriefing = p.state.morningBriefing || {};
        p.state.morningBriefing.lastShownDate = key;
        if (typeof window.saveStateNow === "function") window.saveStateNow();
      }
    } catch (e) {}
  }

  function maybeAutoOpen() {
    clearTimeout(autoTimer);
    autoTimer = setTimeout(function () {
      if (!isMorning() || alreadyShownToday() || !isAppVisible()) return;
      open({ auto: true });
    }, 900);
  }

  document.addEventListener("keydown", function (event) {
    if (event.key === "Escape" && root && root.classList.contains("is-open")) close();
  });

  document.addEventListener("DOMContentLoaded", maybeAutoOpen);
  window.addEventListener("ethone:page-ready", maybeAutoOpen);
  window.addEventListener("ethone:profile-ready", maybeAutoOpen);
  setTimeout(maybeAutoOpen, 1800);

  window.ETHONEMorningBriefing = {
    open: function () { open({ manual: true }); },
    close: close,
    refresh: function () { if (root && root.classList.contains("is-open")) render(); },
    shouldAutoOpen: function () { return isMorning() && !alreadyShownToday() && isAppVisible(); }
  };
})();
