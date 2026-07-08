/* ETHONE Achievements
   Persistent badge, level and streak system driven by existing profile data. */
(function () {
  "use strict";

  if (window.__ethoneAchievementsLoaded) return;
  window.__ethoneAchievementsLoaded = true;

  var scanTimer = 0;
  var renderTimer = 0;

  var DEFINITIONS = [
    achievement("first-workspace", "Premier Workspace", "Créer ou activer ton premier environnement ETHONE.", "Workspace", 80, "bronze", "layout-dashboard", function (m) { return m.workspaceCount >= 1; }, function (m) { return Math.min(100, m.workspaceCount * 100); }),
    achievement("workspace-builder", "Architecte des Spaces", "Créer 5 workspaces distincts.", "Workspace", 160, "silver", "layers-3", function (m) { return m.workspaceCount >= 5; }, function (m) { return pct(m.workspaceCount, 5); }),
    achievement("first-task", "Première tâche terminée", "Terminer une première tâche dans ETHONE.", "Productivité", 60, "bronze", "check-circle-2", function (m) { return m.tasksDone >= 1; }, function (m) { return pct(m.tasksDone, 1); }),
    achievement("tasks-100", "100 tâches terminées", "Atteindre 100 tâches complétées.", "Productivité", 320, "gold", "badge-check", function (m) { return m.tasksDone >= 100; }, function (m) { return pct(m.tasksDone, 100); }),
    achievement("task-streak-3", "Streak tâches 3 jours", "Terminer au moins une tâche pendant 3 jours d'affilée.", "Streak", 120, "silver", "flame", function (m) { return m.taskStreak >= 3; }, function (m) { return pct(m.taskStreak, 3); }),
    achievement("task-streak-7", "Streak tâches 7 jours", "Garder une série de tâches sur 7 jours.", "Streak", 240, "gold", "flame-kindling", function (m) { return m.taskStreak >= 7; }, function (m) { return pct(m.taskStreak, 7); }),
    achievement("github-connected", "Premier GitHub connecté", "Connecter GitHub à ETHONE.", "Intégrations", 120, "silver", "git-branch", function (m) { return m.githubConnected; }, function (m) { return m.githubConnected ? 100 : 0; }),
    achievement("spotify-connected", "Spotify connecté", "Connecter Spotify ou détecter Spotify via présence Discord.", "Intégrations", 120, "silver", "music-2", function (m) { return m.spotifyConnected; }, function (m) { return m.spotifyConnected ? 100 : 0; }),
    achievement("focus-first", "Première session Focus", "Terminer une première session Pomodoro Focus.", "Focus", 80, "bronze", "timer", function (m) { return m.focusMinutes >= 25; }, function (m) { return pct(m.focusMinutes, 25); }),
    achievement("focus-10h", "10 heures Focus", "Accumuler 10 heures de concentration.", "Focus", 220, "silver", "target", function (m) { return m.focusMinutes >= 600; }, function (m) { return pct(m.focusMinutes, 600); }),
    achievement("focus-100h", "100 heures Focus", "Accumuler 100 heures Focus dans ETHONE.", "Focus", 600, "platinum", "trophy", function (m) { return m.focusMinutes >= 6000; }, function (m) { return pct(m.focusMinutes, 6000); }),
    achievement("focus-streak-3", "Streak Focus 3 jours", "Faire du focus pendant 3 jours d'affilée.", "Streak", 140, "silver", "zap", function (m) { return m.focusStreak >= 3; }, function (m) { return pct(m.focusStreak, 3); }),
    achievement("focus-streak-14", "Streak Focus 14 jours", "Garder une série Focus pendant 14 jours.", "Streak", 420, "platinum", "sparkles", function (m) { return m.focusStreak >= 14; }, function (m) { return pct(m.focusStreak, 14); }),
    achievement("integration-trio", "Trio connecté", "Connecter au moins 3 intégrations.", "Intégrations", 220, "gold", "plug-zap", function (m) { return m.connectedIntegrations >= 3; }, function (m) { return pct(m.connectedIntegrations, 3); }),
    achievement("ethone-level-5", "Niveau 5", "Atteindre le niveau d'achievements 5.", "Niveaux", 260, "gold", "star", function (m) { return m.level >= 5; }, function (m) { return pct(m.level, 5); })
  ];

  function achievement(id, title, description, category, points, tier, icon, unlocked, progress) {
    return { id: id, title: title, description: description, category: category, points: points, tier: tier, icon: icon, unlocked: unlocked, progress: progress };
  }

  function pct(value, target) {
    value = Number(value) || 0;
    target = Number(target) || 1;
    return Math.max(0, Math.min(100, Math.round((value / target) * 100)));
  }

  function profile() {
    try { return typeof window.curP === "function" ? window.curP() : null; } catch (e) { return null; }
  }

  function save() {
    try { if (typeof window.saveStateNow === "function") window.saveStateNow(); } catch (e) {}
  }

  function esc(value) {
    return String(value == null ? "" : value).replace(/[&<>"]/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c];
    });
  }

  function todayKey(date) {
    date = date || new Date();
    return [date.getFullYear(), String(date.getMonth() + 1).padStart(2, "0"), String(date.getDate()).padStart(2, "0")].join("-");
  }

  function validDate(value) {
    if (!value) return null;
    var d = new Date(value);
    return isNaN(d.getTime()) ? null : d;
  }

  function dateKeyFrom(value) {
    var d = validDate(value);
    return d ? todayKey(d) : "";
  }

  function uniqueDates(list) {
    var map = Object.create(null);
    list.forEach(function (value) {
      var key = dateKeyFrom(value);
      if (key) map[key] = true;
    });
    return Object.keys(map).sort().reverse();
  }

  function streakFromDates(dates) {
    if (!dates.length) return 0;
    var set = Object.create(null);
    dates.forEach(function (d) { set[d] = true; });
    var streak = 0;
    var cursor = new Date();
    for (var i = 0; i < 370; i += 1) {
      var key = todayKey(cursor);
      if (!set[key]) {
        if (i === 0) {
          cursor.setDate(cursor.getDate() - 1);
          continue;
        }
        break;
      }
      streak += 1;
      cursor.setDate(cursor.getDate() - 1);
    }
    return streak;
  }

  function isDone(item) {
    return !!(item && (item.done || item.completed || item.status === "done" || item.status === "completed" || item.checked));
  }

  function getConnections(s) {
    return Object.assign({}, s.connections || {}, s.integrations || {});
  }

  function connectionIsActive(value) {
    if (!value) return false;
    if (value === true) return true;
    if (typeof value === "string") return value.trim().length > 0;
    if (typeof value !== "object") return false;
    if (value.connected || value.enabled || value.status === "connected") return true;
    return Object.keys(value).some(function (key) {
      if (/token|key|secret|password/i.test(key)) return false;
      var v = value[key];
      return typeof v === "string" ? v.trim().length > 0 : !!v;
    });
  }

  function collectMetrics() {
    var p = profile();
    var s = p && p.state ? p.state : {};
    var todos = Array.isArray(s.todos) ? s.todos : [];
    var doneTodos = todos.filter(isDone);
    var taskDates = doneTodos.map(function (todo) {
      return todo.doneAt || todo.completedAt || todo.updatedAt || todo.createdAt || todo.date;
    });
    var pomo = Array.isArray(s.pomoHistory) ? s.pomoHistory : [];
    var focusMinutes = Math.round(pomo.reduce(function (sum, item) {
      return sum + (Number(item && item.duration) || 1500);
    }, 0) / 60);
    var focusDates = pomo.map(function (item) { return item && (item.ts || item.date || item.createdAt); });
    var workspaces = [];
    try { workspaces = window.ETHONEWorkspaces && window.ETHONEWorkspaces.all ? window.ETHONEWorkspaces.all() : (Array.isArray(p && p.workspaces) ? p.workspaces : []); } catch (e) { workspaces = Array.isArray(p && p.workspaces) ? p.workspaces : []; }
    var connections = getConnections(s);
    var github = connections.github || s.github || {};
    var spotify = connections.spotify || s.spotify || {};
    var discordSpotify = connections.discord && connections.discord.data && connections.discord.data.spotify;
    var connectedKeys = Object.keys(connections).filter(function (key) { return connectionIsActive(connections[key]); });
    var points = 0;
    var unlocked = getStore().unlocked || {};
    DEFINITIONS.forEach(function (def) { if (unlocked[def.id]) points += def.points; });
    var level = levelFromPoints(points).level;
    return {
      tasksTotal: todos.length,
      tasksDone: doneTodos.length,
      taskStreak: streakFromDates(uniqueDates(taskDates)),
      focusMinutes: focusMinutes,
      focusSessions: pomo.length,
      focusStreak: streakFromDates(uniqueDates(focusDates)),
      workspaceCount: Math.max(workspaces.length, p && p.activeWorkspaceId ? 1 : 0),
      githubConnected: connectionIsActive(github),
      spotifyConnected: connectionIsActive(spotify) || !!discordSpotify,
      connectedIntegrations: connectedKeys.length,
      points: points,
      level: level
    };
  }

  function getStore() {
    var p = profile();
    if (!p) return { unlocked: {}, seen: {}, history: [] };
    p.state = p.state || {};
    p.state.achievements = p.state.achievements || { unlocked: {}, seen: {}, history: [] };
    p.state.achievements.unlocked = p.state.achievements.unlocked || {};
    p.state.achievements.seen = p.state.achievements.seen || {};
    p.state.achievements.history = Array.isArray(p.state.achievements.history) ? p.state.achievements.history : [];
    return p.state.achievements;
  }

  function levelFromPoints(points) {
    points = Number(points) || 0;
    var level = Math.max(1, Math.floor(Math.sqrt(points / 120)) + 1);
    var base = Math.pow(level - 1, 2) * 120;
    var next = Math.pow(level, 2) * 120;
    return { level: level, base: base, next: next, progress: pct(points - base, next - base) };
  }

  function evaluate() {
    var p = profile();
    if (!p || !p.state) return null;
    var store = getStore();
    var metrics = collectMetrics();
    var unlockedNow = [];
    DEFINITIONS.forEach(function (def) {
      var isUnlocked = false;
      try { isUnlocked = !!def.unlocked(metrics); } catch (e) { isUnlocked = false; }
      if (isUnlocked && !store.unlocked[def.id]) {
        store.unlocked[def.id] = new Date().toISOString();
        store.history.unshift({ id: def.id, title: def.title, points: def.points, tier: def.tier, ts: store.unlocked[def.id] });
        unlockedNow.push(def);
      }
    });
    store.history = store.history.slice(0, 80);
    var totalPoints = score(store).points;
    var lvl = levelFromPoints(totalPoints);
    store.points = totalPoints;
    store.level = lvl.level;
    store.updatedAt = new Date().toISOString();
    if (unlockedNow.length) {
      save();
      unlockedNow.forEach(showUnlock);
      window.dispatchEvent(new CustomEvent("ethone:achievements-unlocked", { detail: { achievements: unlockedNow.slice(), score: score(store) } }));
    }
    render();
    return { store: store, metrics: metrics, unlocked: unlockedNow };
  }

  function score(store) {
    store = store || getStore();
    var unlocked = store.unlocked || {};
    var points = 0;
    var count = 0;
    DEFINITIONS.forEach(function (def) {
      if (unlocked[def.id]) {
        points += def.points;
        count += 1;
      }
    });
    var lvl = levelFromPoints(points);
    return { points: points, count: count, total: DEFINITIONS.length, level: lvl.level, next: lvl.next, progress: lvl.progress };
  }

  function showUnlock(def) {
    try {
      if (window.ETHONENotifications && typeof window.ETHONENotifications.notify === "function") {
        window.ETHONENotifications.notify({
          title: "Achievement unlocked",
          body: def.title + " +" + def.points + " XP",
          category: "success",
          icon: def.icon || "trophy",
          dedupe: "achievement-" + def.id + "-" + todayKey()
        });
      }
    } catch (e) {}
    if (typeof window.toast === "function") {
      try { window.toast("Achievement unlocked: " + def.title, "success"); } catch (e) {}
    }
    var root = document.getElementById("achievement-toast-stack");
    if (!root) {
      root = document.createElement("div");
      root.id = "achievement-toast-stack";
      document.body.appendChild(root);
    }
    var node = document.createElement("div");
    node.className = "achievement-unlock-toast tier-" + def.tier;
    node.innerHTML = '<div class="achievement-unlock-icon">' + icon(def.icon) + '</div><div><strong>' + esc(def.title) + '</strong><span>' + esc(def.category) + ' · +' + def.points + ' XP</span></div>';
    root.appendChild(node);
    setTimeout(function () { node.classList.add("leaving"); setTimeout(function () { node.remove(); }, 260); }, 4200);
  }

  function icon(name) {
    return '<i data-lucide="' + esc(name || "trophy") + '"></i>';
  }

  function ensurePanel() {
    var settings = document.getElementById("settings-profile");
    if (!settings) return null;
    var panel = document.getElementById("achievements-panel");
    if (panel) return panel;
    panel = document.createElement("div");
    panel.id = "achievements-panel";
    panel.className = "settings-card achievements-panel";
    var xp = document.getElementById("profile-xp-widget");
    if (xp && xp.parentNode) xp.parentNode.insertBefore(panel, xp.nextSibling);
    else settings.appendChild(panel);
    return panel;
  }

  function render() {
    clearTimeout(renderTimer);
    renderTimer = setTimeout(function () {
      var panel = ensurePanel();
      if (!panel) return;
      var store = getStore();
      var metrics = collectMetrics();
      var current = score(store);
      var lvl = levelFromPoints(current.points);
      var rows = DEFINITIONS.map(function (def) {
        var unlockedAt = store.unlocked && store.unlocked[def.id];
        var progress = unlockedAt ? 100 : safeProgress(def, metrics);
        return Object.assign({}, def, { unlockedAt: unlockedAt, progress: progress });
      });
      rows.sort(function (a, b) {
        return Number(!!b.unlockedAt) - Number(!!a.unlockedAt) || b.progress - a.progress || b.points - a.points;
      });
      panel.innerHTML = [
        '<div class="achievements-head"><div><div class="settings-card-title">Achievements</div><p>Badges, niveaux et streaks issus de ton activité ETHONE.</p></div><button class="btn btn-ghost" type="button" data-achievements-scan>Refresh</button></div>',
        '<div class="achievements-summary">',
        '<div class="achievement-level"><span>LVL</span><strong>' + current.level + '</strong></div>',
        '<div class="achievement-progress"><div><strong>' + current.points.toLocaleString() + ' XP</strong><span>' + current.count + ' / ' + current.total + ' badges · prochain niveau ' + lvl.next.toLocaleString() + ' XP</span></div><div class="achievement-bar"><i style="width:' + lvl.progress + '%"></i></div></div>',
        '<div class="achievement-streaks"><div><strong>' + metrics.taskStreak + '</strong><span>Task streak</span></div><div><strong>' + metrics.focusStreak + '</strong><span>Focus streak</span></div></div>',
        '</div>',
        '<div class="achievement-badge-grid">',
        rows.map(badgeHTML).join(""),
        '</div>'
      ].join("");
      try { if (window.lucide && !window.__lucideFailed) window.lucide.createIcons(); } catch (e) {}
    }, 60);
  }

  function safeProgress(def, metrics) {
    try { return Math.max(0, Math.min(100, Number(def.progress(metrics)) || 0)); } catch (e) { return 0; }
  }

  function badgeHTML(def) {
    var locked = !def.unlockedAt;
    return '<article class="achievement-badge tier-' + esc(def.tier) + (locked ? ' locked' : ' unlocked') + '">' +
      '<div class="achievement-badge-icon">' + icon(def.icon) + '</div>' +
      '<div class="achievement-badge-body"><div class="achievement-badge-meta"><span>' + esc(def.tier) + '</span><b>+' + def.points + '</b></div>' +
      '<strong>' + esc(def.title) + '</strong><p>' + esc(def.description) + '</p>' +
      '<div class="achievement-mini-bar"><i style="width:' + def.progress + '%"></i></div></div>' +
      '</article>';
  }

  function scheduleScan(delay) {
    clearTimeout(scanTimer);
    scanTimer = setTimeout(evaluate, delay == null ? 180 : delay);
  }

  function wrapFunction(name) {
    var original = window[name];
    if (typeof original !== "function" || original.__achievementsWrapped) return;
    var wrapped = function () {
      var result = original.apply(this, arguments);
      scheduleScan(80);
      return result;
    };
    wrapped.__achievementsWrapped = true;
    wrapped.__original = original;
    window[name] = wrapped;
  }

  function installHooks() {
    ["addTodo", "toggleTodo", "clearDone", "savePomoSession", "saveDailyFocus", "toggleDailyFocusDone", "connectSpotify", "disconnectSpotify", "connectGithubFromConnections", "disconnectGithub"].forEach(wrapFunction);
    document.addEventListener("click", function (event) {
      if (event.target && event.target.closest && event.target.closest("[data-achievements-scan]")) {
        evaluate();
      }
    });
    ["ethone:page-ready", "ethone:workspace-update", "ethone:workspace-change", "ethone:space-update", "ethone:notification", "ethone:theme-changed"].forEach(function (eventName) {
      window.addEventListener(eventName, function () { scheduleScan(220); });
    });
    window.addEventListener("storage", function (event) {
      if (!event.key || /ethone|pomo|spotify|github/i.test(event.key)) scheduleScan(260);
    });
  }

  function boot() {
    installHooks();
    scheduleScan(800);
    setTimeout(function () { installHooks(); scheduleScan(0); }, 1800);
  }

  window.ETHONEAchievements = {
    definitions: DEFINITIONS.slice(),
    evaluate: evaluate,
    render: render,
    score: function () { return score(getStore()); },
    metrics: collectMetrics
  };

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot, { once: true });
  else boot();
})();
