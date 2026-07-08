/* ETHONE Background Engine
   GPU-friendly animated backgrounds with legacy API compatibility:
   startAmbientBg, stopAmbientBg, renderBgThemeBtns, pickBgTheme, applyBgTheme. */
(function () {
  "use strict";

  var BACKGROUND_THEMES = [
    { name: "None", id: "none", kind: "static" },
    { name: "Aurora", id: "aurora", kind: "canvas" },
    { name: "Particles", id: "particles", kind: "canvas" },
    { name: "Nebula", id: "nebula", kind: "canvas" },
    { name: "Stars", id: "stars", kind: "canvas" },
    { name: "Glass", id: "glass", kind: "css" },
    { name: "Cyber", id: "cyber", kind: "canvas" },
    { name: "Rain", id: "rain", kind: "canvas" },
    { name: "Snow", id: "snow", kind: "canvas" },
    { name: "Matrix", id: "matrix", kind: "canvas" },
    { name: "Gradient", id: "gradient", kind: "css" },
    { name: "Image", id: "image", kind: "media" },
    { name: "GIF", id: "gif", kind: "media" },
    { name: "Video", id: "video", kind: "media" }
  ];

  var frame = 0;
  var ambientFrame = 0;
  var resizeTimer = 0;
  var particles = [];
  var mediaObjectUrl = "";
  var runtimeMediaSrc = "";
  var activeId = "";
  var activeSignature = "";

  function profile() {
    try { return typeof window.curP === "function" ? window.curP() : null; } catch (e) { return null; }
  }

  function save() {
    try { if (typeof window.saveStateNow === "function") window.saveStateNow(); } catch (e) {}
  }

  function toastSafe(message, type) {
    try { if (typeof window.toast === "function") window.toast(message, type || "info"); } catch (e) {}
  }

  function isLightBoot() {
    return !!(window.ETHONE_LIGHT_BOOT_MODE || window.ETHONE_SAFE_MODE || window.__ethoneSkipExternalWidgets);
  }

  function isReducedMotion() {
    try { return !!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches); } catch (e) { return false; }
  }

  function langIsFr() {
    try { return (window._lang || "fr") === "fr"; } catch (e) { return true; }
  }

  function esc(value) {
    return String(value == null ? "" : value).replace(/[&<>"]/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c];
    });
  }

  function getCanvas() {
    return document.getElementById("bg-canvas");
  }

  function getAccentRgb() {
    var raw = getComputedStyle(document.documentElement).getPropertyValue("--accent-rgb").trim();
    if (/^\d+,\s*\d+,\s*\d+$/.test(raw)) return raw;
    var accent = getComputedStyle(document.documentElement).getPropertyValue("--accent").trim() || "#8b5cf6";
    if (accent.charAt(0) !== "#") return "139,92,246";
    if (accent.length === 4) accent = "#" + accent[1] + accent[1] + accent[2] + accent[2] + accent[3] + accent[3];
    return [
      parseInt(accent.slice(1, 3), 16) || 139,
      parseInt(accent.slice(3, 5), 16) || 92,
      parseInt(accent.slice(5, 7), 16) || 246
    ].join(",");
  }

  function sizeCanvas(canvas) {
    var dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    var width = Math.max(1, window.innerWidth);
    var height = Math.max(1, window.innerHeight);
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    canvas.style.width = width + "px";
    canvas.style.height = height + "px";
    var ctx = canvas.getContext("2d");
    if (ctx) ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    return { width: width, height: height, dpr: dpr, ctx: ctx };
  }

  function stopFrames() {
    if (frame) cancelAnimationFrame(frame);
    if (ambientFrame) cancelAnimationFrame(ambientFrame);
    frame = 0;
    ambientFrame = 0;
    try { if (typeof window._bgFrame !== "undefined") window._bgFrame = null; } catch (e) {}
    try { if (typeof window._ambientFrame !== "undefined") window._ambientFrame = null; } catch (e) {}
    particles = [];
  }

  function clearLayers() {
    stopFrames();
    var canvas = getCanvas();
    if (canvas) {
      var ctx = canvas.getContext("2d");
      if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
      canvas.style.opacity = "0";
    }
    var css = document.getElementById("ethone-bg-css-layer");
    if (css) css.remove();
    var media = document.getElementById("ethone-bg-media-layer");
    if (media) media.remove();
    document.documentElement.removeAttribute("data-bg-theme");
  }

  function ensureCssLayer(id) {
    var layer = document.getElementById("ethone-bg-css-layer");
    if (!layer) {
      layer = document.createElement("div");
      layer.id = "ethone-bg-css-layer";
      layer.setAttribute("aria-hidden", "true");
      document.body.insertBefore(layer, document.body.firstChild);
    }
    layer.className = "ethone-bg-css-layer ethone-bg-" + id;
    return layer;
  }

  function getMediaConfig() {
    var p = profile();
    var cfg = p && p.bgMedia ? p.bgMedia : {};
    return {
      src: cfg.src || "",
      type: cfg.type || "image",
      blur: Number.isFinite(Number(cfg.blur)) ? Number(cfg.blur) : 18,
      dim: Number.isFinite(Number(cfg.dim)) ? Number(cfg.dim) : 58
    };
  }

  function setMediaConfig(next) {
    var p = profile();
    if (!p) return;
    p.bgMedia = Object.assign({}, getMediaConfig(), next || {});
    save();
  }

  function ensureMediaLayer(type, src, options) {
    options = options || getMediaConfig();
    var layer = document.getElementById("ethone-bg-media-layer");
    if (!layer) {
      layer = document.createElement("div");
      layer.id = "ethone-bg-media-layer";
      layer.className = "ethone-bg-media-layer";
      layer.setAttribute("aria-hidden", "true");
      document.body.insertBefore(layer, document.body.firstChild);
    }
    layer.innerHTML = "";
    layer.style.setProperty("--bg-media-blur", Math.max(0, options.blur || 0) + "px");
    layer.style.setProperty("--bg-media-dim", Math.max(0, Math.min(90, options.dim || 58)) + "%");

    if (!src) {
      layer.innerHTML = '<div class="ethone-bg-media-empty"></div>';
      return layer;
    }

    var el;
    if (type === "video") {
      el = document.createElement("video");
      el.src = src;
      el.autoplay = true;
      el.loop = true;
      el.muted = true;
      el.playsInline = true;
    } else {
      el = document.createElement("img");
      el.src = src;
      el.alt = "";
    }
    el.className = "ethone-bg-media";
    layer.appendChild(el);
    return layer;
  }

  function pickBgTheme(id) {
    var p = profile();
    if (!p) return;
    p.bgTheme = id;
    save();
    applyBgTheme(id, { force: true });
    renderBgThemeBtns();
    toastSafe(langIsFr() ? "Fond mis a jour." : "Background updated.", "success");
  }

  function startAmbientBg() {
    if (isLightBoot()) return;
    var p = profile();
    if (p && p.bgTheme && p.bgTheme !== "none") return;
    applyCanvasTheme("ambient", true);
  }

  function stopAmbientBg() {
    if (ambientFrame) cancelAnimationFrame(ambientFrame);
    ambientFrame = 0;
    var canvas = getCanvas();
    if (canvas) canvas.style.opacity = "0";
  }

  function backgroundSignature(id) {
    var media = getMediaConfig();
    return [
      id || "none",
      media.src || "",
      runtimeMediaSrc || "",
      media.blur,
      media.dim,
      getAccentRgb()
    ].join("|");
  }

  function applyBgTheme(id, options) {
    options = options || {};
    id = id || "none";
    var signature = backgroundSignature(id);
    if (!options.force && activeId === id && activeSignature === signature) return;
    activeId = id;
    activeSignature = signature;
    clearLayers();
    document.documentElement.dataset.bgTheme = id;

    var canvas = getCanvas();
    if (!canvas || isLightBoot()) {
      if (canvas) canvas.style.opacity = "0";
      return;
    }

    if (id === "none") {
      startAmbientBg();
      return;
    }
    if (id === "glass" || id === "gradient") {
      canvas.style.opacity = "0";
      ensureCssLayer(id);
      return;
    }
    if (id === "image" || id === "gif" || id === "video") {
      canvas.style.opacity = "0";
      var media = getMediaConfig();
      ensureMediaLayer(id, runtimeMediaSrc || media.src, Object.assign({}, media, { type: id }));
      return;
    }
    applyCanvasTheme(id, false);
  }

  function applyCanvasTheme(id, ambient) {
    var canvas = getCanvas();
    if (!canvas || isReducedMotion()) {
      if (id === "ambient" || id === "aurora" || id === "gradient") ensureCssLayer("gradient");
      return;
    }
    var sized = sizeCanvas(canvas);
    var ctx = sized.ctx;
    if (!ctx) return;
    canvas.style.opacity = "1";
    var rgb = getAccentRgb();
    var width = sized.width;
    var height = sized.height;

    if (id === "ambient") drawAmbient(ctx, width, height, rgb);
    else if (id === "aurora") drawAurora(ctx, width, height, rgb);
    else if (id === "particles") drawParticles(ctx, width, height, rgb);
    else if (id === "nebula") drawNebula(ctx, width, height, rgb);
    else if (id === "stars") drawStars(ctx, width, height, rgb);
    else if (id === "cyber") drawCyber(ctx, width, height, rgb);
    else if (id === "rain") drawRain(ctx, width, height, rgb);
    else if (id === "snow") drawSnow(ctx, width, height, rgb);
    else if (id === "matrix") drawMatrix(ctx, width, height, rgb);
    else drawAurora(ctx, width, height, rgb);

    try {
      if (ambient) window._ambientFrame = ambientFrame;
      else window._bgFrame = frame;
    } catch (e) {}
  }

  function loop(draw, ambient) {
    function tick() {
      draw();
      if (ambient) ambientFrame = requestAnimationFrame(tick);
      else frame = requestAnimationFrame(tick);
    }
    tick();
  }

  function drawAmbient(ctx, width, height, rgb) {
    var pts = createPoints(70, width, height, 1.1);
    var t = 0;
    loop(function () {
      ctx.clearRect(0, 0, width, height);
      softOrb(ctx, width * (.18 + Math.sin(t * .35) * .02), height * .22, width * .34, rgb, .045);
      softOrb(ctx, width * (.82 + Math.cos(t * .28) * .02), height * .76, width * .28, "124,58,237", .035);
      pts.forEach(function (p) {
        p.x += p.vx * .45;
        p.y += p.vy * .45;
        wrap(p, width, height);
        dot(ctx, p.x, p.y, p.r, p.c || rgb, p.o * .55);
      });
      t += .008;
    }, true);
  }

  function drawAurora(ctx, width, height, rgb) {
    var t = 0;
    loop(function () {
      ctx.clearRect(0, 0, width, height);
      for (var i = 0; i < 5; i += 1) {
        var x = width * (.18 + i * .17 + Math.sin(t + i) * .06);
        var y = height * (.26 + Math.cos(t * .72 + i) * .12);
        softOrb(ctx, x, y, width * (.34 + i * .02), i % 2 ? "124,58,237" : rgb, .07);
      }
      t += .006;
    });
  }

  function drawParticles(ctx, width, height, rgb) {
    particles = createPoints(Math.min(90, Math.round(width / 18)), width, height, 1.8);
    loop(function () {
      ctx.clearRect(0, 0, width, height);
      for (var i = 0; i < particles.length; i += 1) {
        var a = particles[i];
        for (var j = i + 1; j < particles.length; j += 1) {
          var b = particles[j];
          var d = Math.hypot(a.x - b.x, a.y - b.y);
          if (d < 130) line(ctx, a.x, a.y, b.x, b.y, rgb, (1 - d / 130) * .13);
        }
        a.x += a.vx;
        a.y += a.vy;
        if (a.x < 0 || a.x > width) a.vx *= -1;
        if (a.y < 0 || a.y > height) a.vy *= -1;
        dot(ctx, a.x, a.y, a.r, rgb, a.o);
      }
    });
  }

  function drawNebula(ctx, width, height, rgb) {
    var clouds = createPoints(18, width, height, 1).map(function (p, i) {
      p.radius = width * (.12 + Math.random() * .22);
      p.phase = i * .7;
      p.color = i % 3 === 0 ? "255,255,255" : (i % 2 ? "124,58,237" : rgb);
      p.o = i % 3 === 0 ? .025 : .06;
      return p;
    });
    var t = 0;
    loop(function () {
      ctx.clearRect(0, 0, width, height);
      clouds.forEach(function (c) {
        softOrb(ctx, c.x + Math.sin(t + c.phase) * 18, c.y + Math.cos(t * .8 + c.phase) * 14, c.radius, c.color, c.o);
      });
      grain(ctx, width, height, rgb, .018);
      t += .005;
    });
  }

  function drawStars(ctx, width, height, rgb) {
    var stars = createPoints(150, width, height, 1.4);
    stars.forEach(function (s) { s.tw = Math.random() * 6.28; s.vy = Math.random() * .08 + .02; });
    loop(function () {
      ctx.clearRect(0, 0, width, height);
      softOrb(ctx, width * .78, height * .18, width * .25, rgb, .035);
      stars.forEach(function (s) {
        s.tw += .025;
        s.y += s.vy;
        if (s.y > height + 8) { s.y = -8; s.x = Math.random() * width; }
        dot(ctx, s.x, s.y, s.r, Math.random() > .82 ? rgb : "255,255,255", .22 + Math.sin(s.tw) * .15);
      });
    });
  }

  function drawCyber(ctx, width, height, rgb) {
    var t = 0;
    loop(function () {
      ctx.clearRect(0, 0, width, height);
      var gap = 48;
      ctx.lineWidth = .65;
      for (var x = (t % gap) - gap; x < width + gap; x += gap) line(ctx, x, 0, x + height * .22, height, rgb, .065);
      for (var y = 0; y < height; y += gap) line(ctx, 0, y + Math.sin(t * .02 + y) * 4, width, y, rgb, .045);
      for (var i = 0; i < 9; i += 1) {
        var px = (t * (1.4 + i * .16) + i * 173) % (width + 180) - 90;
        line(ctx, px, height * (.16 + (i % 6) * .12), px + 120, height * (.16 + (i % 6) * .12), rgb, .18);
      }
      t += .8;
    });
  }

  function drawRain(ctx, width, height, rgb) {
    var drops = createPoints(Math.min(170, Math.round(width / 8)), width, height, 1);
    drops.forEach(function (d) { d.len = 12 + Math.random() * 26; d.vy = 5 + Math.random() * 7; d.vx = -1.6 + Math.random() * .6; });
    loop(function () {
      ctx.clearRect(0, 0, width, height);
      drops.forEach(function (d) {
        line(ctx, d.x, d.y, d.x + d.vx * d.len * .22, d.y + d.len, Math.random() > .86 ? rgb : "255,255,255", .13);
        d.x += d.vx;
        d.y += d.vy;
        if (d.y > height + 40) { d.y = -40; d.x = Math.random() * width; }
        if (d.x < -40) d.x = width + 40;
      });
    });
  }

  function drawSnow(ctx, width, height, rgb) {
    var flakes = createPoints(Math.min(130, Math.round(width / 10)), width, height, 2.4);
    flakes.forEach(function (f) { f.vy = .4 + Math.random() * 1.1; f.phase = Math.random() * 6.28; });
    var t = 0;
    loop(function () {
      ctx.clearRect(0, 0, width, height);
      flakes.forEach(function (f) {
        f.y += f.vy;
        f.x += Math.sin(t + f.phase) * .22;
        if (f.y > height + 8) { f.y = -8; f.x = Math.random() * width; }
        dot(ctx, f.x, f.y, f.r, Math.random() > .88 ? rgb : "255,255,255", f.o * .55);
      });
      t += .025;
    });
  }

  function drawMatrix(ctx, width, height, rgb) {
    var font = 14;
    var columns = Math.ceil(width / font);
    var drops = Array.from({ length: columns }, function () { return Math.random() * -height; });
    var chars = "ETHONE01BRAINOS";
    loop(function () {
      ctx.fillStyle = "rgba(5,5,8,.16)";
      ctx.fillRect(0, 0, width, height);
      ctx.font = "600 " + font + "px ui-monospace, SFMono-Regular, Menlo, monospace";
      for (var i = 0; i < columns; i += 1) {
        var ch = chars[Math.floor(Math.random() * chars.length)];
        var x = i * font;
        var y = drops[i] * font;
        ctx.fillStyle = "rgba(" + rgb + ",.42)";
        ctx.fillText(ch, x, y);
        drops[i] += 1;
        if (y > height && Math.random() > .975) drops[i] = 0;
      }
    });
  }

  function createPoints(count, width, height, maxR) {
    var list = [];
    for (var i = 0; i < count; i += 1) {
      list.push({
        x: Math.random() * width,
        y: Math.random() * height,
        r: Math.random() * maxR + .35,
        vx: (Math.random() - .5) * .55,
        vy: (Math.random() - .5) * .55,
        o: Math.random() * .3 + .12,
        c: Math.random() > .72 ? "255,255,255" : getAccentRgb()
      });
    }
    return list;
  }

  function wrap(p, width, height) {
    if (p.x < -8) p.x = width + 8;
    if (p.x > width + 8) p.x = -8;
    if (p.y < -8) p.y = height + 8;
    if (p.y > height + 8) p.y = -8;
  }

  function dot(ctx, x, y, r, color, opacity) {
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(" + color + "," + opacity + ")";
    ctx.fill();
  }

  function line(ctx, x1, y1, x2, y2, color, opacity) {
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.strokeStyle = "rgba(" + color + "," + opacity + ")";
    ctx.stroke();
  }

  function softOrb(ctx, x, y, radius, color, opacity) {
    var g = ctx.createRadialGradient(x, y, 0, x, y, radius);
    g.addColorStop(0, "rgba(" + color + "," + opacity + ")");
    g.addColorStop(.58, "rgba(" + color + "," + opacity * .34 + ")");
    g.addColorStop(1, "rgba(" + color + ",0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, window.innerWidth, window.innerHeight);
  }

  function grain(ctx, width, height, rgb, opacity) {
    ctx.fillStyle = "rgba(" + rgb + "," + opacity + ")";
    for (var i = 0; i < 90; i += 1) {
      ctx.fillRect(Math.random() * width, Math.random() * height, 1, 1);
    }
  }

  function renderBgThemeBtns() {
    var p = profile();
    var cur = (p && p.bgTheme) || "none";
    var media = getMediaConfig();
    var container = document.getElementById("bg-theme-btns");
    if (!container) return;
    container.innerHTML = [
      '<div class="ethone-bg-picker-grid">',
      BACKGROUND_THEMES.map(function (item) {
        return '<button class="ethone-bg-preset' + (item.id === cur ? " active" : "") + '" type="button" data-bg-pick="' + esc(item.id) + '">' +
          '<span>' + esc(item.name) + '</span><small>' + esc(item.kind) + '</small></button>';
      }).join(""),
      '</div>',
      '<div class="ethone-bg-media-controls">',
      '<div class="ethone-bg-field wide"><label>Media URL</label><input id="ethone-bg-media-url" type="url" placeholder="https://... image, GIF or video" value="' + esc(media.src) + '"></div>',
      '<div class="ethone-bg-field"><label>Blur</label><input id="ethone-bg-media-blur" type="range" min="0" max="40" step="1" value="' + esc(media.blur) + '"></div>',
      '<div class="ethone-bg-field"><label>Dim</label><input id="ethone-bg-media-dim" type="range" min="20" max="82" step="1" value="' + esc(media.dim) + '"></div>',
      '<div class="ethone-bg-actions">',
      '<button type="button" data-bg-media="image">Use image</button>',
      '<button type="button" data-bg-media="gif">Use GIF</button>',
      '<button type="button" data-bg-media="video">Use video</button>',
      '<button type="button" data-bg-upload>Upload</button>',
      '<button type="button" data-bg-clear>Clear</button>',
      '</div>',
      '<input id="ethone-bg-file-input" type="file" accept="image/*,video/*" hidden>',
      '<p>' + esc(langIsFr() ? "Les images et GIF legers peuvent etre sauvegardes localement. Pour les videos lourdes, utilise plutot une URL." : "Light images and GIFs can be saved locally. For large videos, prefer a URL.") + '</p>',
      '</div>'
    ].join("");
  }

  function bindControls() {
    document.addEventListener("click", function (event) {
      var pick = event.target.closest("[data-bg-pick]");
      if (pick) {
        pickBgTheme(pick.getAttribute("data-bg-pick"));
        return;
      }
      var mediaButton = event.target.closest("[data-bg-media]");
      if (mediaButton) {
        applyMediaFromControls(mediaButton.getAttribute("data-bg-media"));
        return;
      }
      if (event.target.closest("[data-bg-upload]")) {
        var input = document.getElementById("ethone-bg-file-input");
        if (input) input.click();
        return;
      }
      if (event.target.closest("[data-bg-clear]")) {
        if (mediaObjectUrl) {
          try { URL.revokeObjectURL(mediaObjectUrl); } catch (e) {}
          mediaObjectUrl = "";
        }
        runtimeMediaSrc = "";
        setMediaConfig({ src: "" });
        var p = profile();
        if (p) p.bgTheme = "none";
        save();
        applyBgTheme("none");
        renderBgThemeBtns();
      }
    });

    document.addEventListener("input", function (event) {
      if (event.target && event.target.id === "ethone-bg-media-blur") {
        setMediaConfig({ blur: Number(event.target.value) || 0 });
        if (isMediaActive()) applyBgTheme((profile() && profile().bgTheme) || "image", { force: true });
      }
      if (event.target && event.target.id === "ethone-bg-media-dim") {
        setMediaConfig({ dim: Number(event.target.value) || 58 });
        if (isMediaActive()) applyBgTheme((profile() && profile().bgTheme) || "image", { force: true });
      }
    });

    document.addEventListener("change", function (event) {
      if (event.target && event.target.id === "ethone-bg-file-input") handleFileUpload(event.target);
    });
  }

  function isMediaActive() {
    var p = profile();
    return !!(p && /^(image|gif|video)$/.test(p.bgTheme || ""));
  }

  function applyMediaFromControls(type) {
    if (mediaObjectUrl) {
      try { URL.revokeObjectURL(mediaObjectUrl); } catch (e) {}
      mediaObjectUrl = "";
    }
    runtimeMediaSrc = "";
    var input = document.getElementById("ethone-bg-media-url");
    var blur = document.getElementById("ethone-bg-media-blur");
    var dim = document.getElementById("ethone-bg-media-dim");
    setMediaConfig({
      type: type,
      src: input ? input.value.trim() : "",
      blur: blur ? Number(blur.value) || 0 : 18,
      dim: dim ? Number(dim.value) || 58 : 58
    });
    pickBgTheme(type);
  }

  function handleFileUpload(input) {
    var file = input.files && input.files[0];
    if (!file) return;
    var type = file.type.indexOf("video/") === 0 ? "video" : (file.type === "image/gif" ? "gif" : "image");
    if (mediaObjectUrl) {
      try { URL.revokeObjectURL(mediaObjectUrl); } catch (e) {}
    }
    mediaObjectUrl = URL.createObjectURL(file);
    var canPersist = file.size <= 8 * 1024 * 1024 && type !== "video";
    if (!canPersist) {
      runtimeMediaSrc = mediaObjectUrl;
      setMediaConfig({ type: type });
      pickBgTheme(type);
      toastSafe(langIsFr() ? "Apercu charge. Utilise une URL pour conserver ce media apres rechargement." : "Preview loaded. Use a URL to keep this media after reload.", "info");
      return;
    }
    var reader = new FileReader();
    reader.onload = function () {
      setMediaConfig({ type: type, src: String(reader.result || "") });
      pickBgTheme(type);
    };
    reader.onerror = function () {
      setMediaConfig({ type: type, src: mediaObjectUrl });
      pickBgTheme(type);
    };
    reader.readAsDataURL(file);
  }

  function restoreBackground(force) {
    var p = profile();
    applyBgTheme((p && p.bgTheme) || "none", { force: force === true });
    renderBgThemeBtns();
  }

  window.addEventListener("resize", function () {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(function () { restoreBackground(true); }, 140);
  });
  window.addEventListener("ethone:theme-changed", function () {
    var p = profile();
    if (p && p.bgTheme && !/^(image|gif|video|glass|gradient)$/.test(p.bgTheme)) restoreBackground(true);
  });
  window.addEventListener("ethone:page-ready", restoreBackground);
  document.addEventListener("DOMContentLoaded", function () {
    bindControls();
    setTimeout(restoreBackground, 250);
    setTimeout(restoreBackground, 1200);
  });

  window.startAmbientBg = startAmbientBg;
  window.stopAmbientBg = stopAmbientBg;
  window.renderBgThemeBtns = renderBgThemeBtns;
  window.pickBgTheme = pickBgTheme;
  window.applyBgTheme = applyBgTheme;
  window.ETHONEBackgrounds = {
    themes: BACKGROUND_THEMES,
    apply: applyBgTheme,
    pick: pickBgTheme,
    render: renderBgThemeBtns,
    media: setMediaConfig,
    restore: restoreBackground
  };
})();
