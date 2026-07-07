/* ETHONE — Live panel: additional widget types (Weather, Clock, Calendar,
   CPU/RAM/Network demo gauges, Custom). Mirrors the mount/unmount pattern of
   pages/dashboard/widget-catalog.js (used by the MAIN dashboard grid) but is
   a separate, independent registry — we don't touch that file, to avoid any
   risk of regressing the main dashboard.
   CPU/RAM/Network cannot read real OS stats from a browser — these are
   clearly-labeled simulated/demo widgets (user-confirmed acceptable). */
(function(){
  "use strict";
  const _timers = new WeakMap();
  function trackInterval(el,id){ _timers.set(el,id); }
  function clearTrackedInterval(el){ const id=_timers.get(el); if(id) clearInterval(id); _timers.delete(el); }
  function esc(s){ return String(s==null?"":s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c])); }

  const CATALOG = {};

  // ── Weather — reuses the existing fetchWeather() cache (curP().state.weatherCache)
  // instead of hijacking #weather-widget directly, to avoid a DOM id collision with
  // the same widget when it's also placed on the main dashboard grid. ──
  CATALOG.weather = {
    label:'Météo', icon:'☁️', singleton:true,
    mount(container){
      function paint(){
        const cache = (typeof curP==='function' && curP()?.state?.weatherCache) || null;
        if(cache?.rendered){ container.innerHTML = cache.rendered; return; }
        container.innerHTML = '<div class="lp-empty">⏳ Chargement…</div>';
      }
      paint();
      if(typeof window.fetchWeather==='function') window.fetchWeather().then(paint).catch(()=>{});
      trackInterval(container, setInterval(paint, 60000));
    },
    unmount(container){ clearTrackedInterval(container); container.innerHTML=''; }
  };

  // ── Clock ──
  CATALOG.clock = {
    label:'Horloge', icon:'🕐', singleton:false,
    mount(container, ctx){
      container.innerHTML = '<div class="lp-clock"><strong class="lp-clock-time"></strong><span class="lp-clock-date"></span></div>';
      const timeEl = container.querySelector('.lp-clock-time'), dateEl = container.querySelector('.lp-clock-date');
      function tick(){
        const now = new Date();
        const tz = (ctx.config && ctx.config.timezone) || undefined;
        timeEl.textContent = now.toLocaleTimeString('fr-FR', tz?{hour:'2-digit',minute:'2-digit',timeZone:tz}:{hour:'2-digit',minute:'2-digit'});
        dateEl.textContent = now.toLocaleDateString('fr-FR', tz?{weekday:'short',day:'numeric',month:'short',timeZone:tz}:{weekday:'short',day:'numeric',month:'short'});
      }
      tick();
      trackInterval(container, setInterval(tick, 1000));
    },
    unmount(container){ clearTrackedInterval(container); container.innerHTML=''; }
  };

  // ── Calendar (upcoming events summary) ──
  CATALOG.calendar = {
    label:'Calendrier', icon:'📅', singleton:true,
    mount(container){
      function paint(){
        const s = (typeof curP==='function' && curP()?.state) || {};
        const events = (s.events||[]).slice().sort((a,b)=>String(a.date||'').localeCompare(String(b.date||''))).slice(0,4);
        container.innerHTML = events.length
          ? events.map(e=>`<div class="lp-row"><strong>${esc(e.title||e.text||'')}</strong><span>${esc(e.date||'')}</span></div>`).join('')
          : '<div class="lp-empty">Aucun événement à venir</div>';
      }
      paint();
      trackInterval(container, setInterval(paint, 60000));
    },
    unmount(container){ clearTrackedInterval(container); container.innerHTML=''; }
  };

  // ── Demo gauges (CPU / RAM / Network) — simulated values, always badged "Démo" ──
  function demoGauge(label, unit, seed){
    let value = seed;
    return {
      label, icon:'⚙️', singleton:true, demo:true,
      mount(container){
        container.innerHTML = `<div class="lp-gauge">
          <div class="lp-gauge-top"><span>${esc(label)}</span><span class="lp-demo-badge">Démo</span></div>
          <div class="lp-gauge-track"><div class="lp-gauge-fill"></div></div>
          <div class="lp-gauge-value">--${unit}</div>
        </div>`;
        const fill = container.querySelector('.lp-gauge-fill'), val = container.querySelector('.lp-gauge-value');
        function tick(){
          value = Math.max(4, Math.min(96, value + (Math.random()*16-8)));
          fill.style.width = value.toFixed(0)+'%';
          val.textContent = value.toFixed(0)+unit;
        }
        tick();
        trackInterval(container, setInterval(tick, 2200));
      },
      unmount(container){ clearTrackedInterval(container); container.innerHTML=''; }
    };
  }
  CATALOG.cpu = demoGauge('CPU', '%', 30);
  CATALOG.ram = demoGauge('RAM', '%', 55);
  CATALOG.network = demoGauge('Réseau', ' Mb/s', 40);

  // ── Custom widget (multi-instance: title + free text) ──
  CATALOG.custom = {
    label:'Widget personnalisé', icon:'✨', singleton:false,
    mount(container, ctx){
      const cfg = ctx.config || {};
      container.innerHTML = `<div class="lp-custom">
        <div class="lp-custom-title">${esc(cfg.title||'Sans titre')}</div>
        <div class="lp-custom-content">${esc(cfg.content||'')}</div>
      </div>`;
    },
    unmount(container){ container.innerHTML=''; }
  };

  window.LivePanelCatalog = CATALOG;
})();
