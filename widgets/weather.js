/* ETHONE legacy compatibility module: weather. */
//  WEATHER
// ===================================================
const WMO={0:' Clear',1:' Mostly clear',2:' Partly cloudy',3:' Overcast',
  45:' Foggy',48:' Foggy',51:' Drizzle',53:' Drizzle',55:' Heavy drizzle',
  61:' Rain',63:' Rain',65:' Heavy rain',71:' Snow',73:' Snow',75:' Heavy snow',
  80:' Showers',81:' Showers',82:' Heavy showers',95:' Thunderstorm',99:' Thunderstorm'};


function promptWeatherCity(){
  const p=curP();if(!p)return;
  const w=document.getElementById('weather-widget');if(!w)return;
  const current=p.state?.weatherCity||'';
  w.innerHTML=`<div style="padding:12px 14px">
    <div style="font-size:11px;color:var(--muted);margin-bottom:8px;letter-spacing:.05em">VILLE MÉTÉO</div>
    <div style="display:flex;gap:8px">
      <input id="wx-city-input" value="${escapeHTML(current)}" placeholder="Brive-la-Gaillarde..."
        style="flex:1;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.12);border-radius:8px;padding:8px 10px;color:var(--text);font-family:var(--font);font-size:13px;outline:none">
      <button onclick="saveWeatherCity()"
        style="background:var(--accent);color:#fff;border:none;border-radius:8px;padding:8px 16px;cursor:pointer;font-size:13px;font-weight:600;white-space:nowrap">OK</button>
    </div>
  </div>`;
  const inp=document.getElementById('wx-city-input');
  if(inp){inp.focus();inp.select();inp.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();saveWeatherCity();}});}
}

function saveWeatherCity(){
  const inp=document.getElementById('wx-city-input');if(!inp)return;
  const city=inp.value.trim();if(!city)return;
  const p=curP();if(!p)return;
  if(!p.state)p.state={};
  p.state.weatherCity=city;
  p.state.weatherCache=null;
  saveStateNow();
  if(_sbUser){clearTimeout(_saveCloudTimeout);saveCloudState().catch(()=>{});}
  fetchWeather(city);
}

async function fetchWeather(forceCity){
  const w=document.getElementById('weather-widget');if(!w)return;
  const _wp=curP();
  // Ville: forceCity (depuis saveWeatherCity) > weatherCity sauvée > null
  const city=forceCity!=null?String(forceCity).trim():((_wp?.state?.weatherCity)||null);

  // Cache: valide 30min, même ville
  const cache=_wp?.state?.weatherCache;
  const _cacheAge=(Date.now()-(cache?.ts||0))<1800000;
  const _cityMatch=!city||!cache?.city||(cache.city.toLowerCase()===city.toLowerCase());
  if(cache?.rendered&&_cacheAge&&_cityMatch){w.innerHTML=cache.rendered;return;}

  // Vider le cache
  if(_wp?.state)_wp.state.weatherCache=null;
  w.innerHTML='<div style="padding:14px;font-size:12px;color:var(--muted)">⏳ Chargement...</div>';

  // ── Geocoding (ville manuelle) ──
  if(city){
    let lat=null,lon=null,cityLabel=city;
    const variants=[city,city.replace(/-/g,' '),city.split(' ')[0]].filter((v,i,a)=>v&&a.indexOf(v)===i);
    for(const q of variants){
      try{
        const r=await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(q)}&count=5&language=fr&format=json`,{signal:AbortSignal.timeout(8000)});
        const d=await r.json();
        const results=d?.results||[];
        const best=results.find(r=>r.country_code==='FR')||results[0];
        if(best){lat=best.latitude;lon=best.longitude;cityLabel=best.name;break;}
      }catch(e){}
    }
    if(lat&&lon){await _doRender(lat,lon,cityLabel);return;}
    // Ville introuvable
    w.innerHTML=`<div style="padding:12px 14px">
      <div style="font-size:12px;color:var(--muted);margin-bottom:10px">❌ "<strong>${escapeHTML(city)}</strong>" introuvable</div>
      <div style="display:flex;gap:8px">
        <input id="wx-city-input" value="${escapeHTML(city)}" placeholder="Réessaie..."
          style="flex:1;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.15);border-radius:8px;padding:7px 10px;color:var(--text);font-family:var(--font);font-size:13px;outline:none">
        <button onclick="saveWeatherCity()" style="background:var(--accent);color:#fff;border:none;border-radius:8px;padding:7px 14px;cursor:pointer;font-size:13px;font-weight:600">OK</button>
      </div>
    </div>`;
    const inp=document.getElementById('wx-city-input');
    if(inp){inp.focus();inp.select();inp.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();saveWeatherCity();}});}
    return;
  }

  // ── Géoloc GPS ──
  const _showCityForm=()=>{
    w.innerHTML=`<div style="padding:12px 14px">
      <div style="font-size:12px;color:var(--muted);margin-bottom:10px">📍 Localisation indisponible</div>
      <div style="display:flex;gap:8px">
        <input id="wx-city-input" placeholder="Entre ta ville..."
          style="flex:1;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.12);border-radius:8px;padding:7px 10px;color:var(--text);font-family:var(--font);font-size:13px;outline:none">
        <button onclick="saveWeatherCity()" style="background:var(--accent);color:#fff;border:none;border-radius:8px;padding:7px 14px;cursor:pointer;font-size:13px;font-weight:600">OK</button>
      </div>
    </div>`;
    const inp=document.getElementById('wx-city-input');
    if(inp){inp.focus();inp.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();saveWeatherCity();}});}
  };

  if(!navigator.geolocation){_showCityForm();return;}

  // Vérifier permission
  let permState='prompt';
  try{const perm=await navigator.permissions.query({name:'geolocation'});permState=perm.state;}catch(e){}

  if(permState==='denied'){_showCityForm();return;}

  navigator.geolocation.getCurrentPosition(
    async pos=>{try{await _doRender(pos.coords.latitude,pos.coords.longitude,null);}catch(e){_showCityForm();}},
    ()=>{_showCityForm();},
    {timeout:8000,maximumAge:300000,enableHighAccuracy:false}
  );

  // ── Rendu météo ──
  async function _doRender(lat,lon,forcedLabel){
    const res=await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,apparent_temperature,weather_code,windspeed_10m,relative_humidity_2m&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max&timezone=auto&forecast_days=6`,{signal:AbortSignal.timeout(8000)});
    if(!res.ok)throw new Error();
    const data=await res.json();
    let cityName=forcedLabel||city||'';
    if(!cityName){
      try{
        const rg=await fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=fr`,{signal:AbortSignal.timeout(5000)});
        const dg=await rg.json();
        cityName=dg?.city||dg?.locality||'';
      }catch(e){}
    }
    const cur=data.current;
    const temp=Math.round(cur.temperature_2m),feels=Math.round(cur.apparent_temperature);
    const code=cur.weather_code,desc=WMO[code]||'☁️ Unknown';
    const icon=desc.split(' ')[0],text=desc.split(' ').slice(1).join(' ');
    const wind=Math.round(cur.windspeed_10m),hum=cur.relative_humidity_2m;
    const days=['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
    const daily=data.daily;
    function wxIcon(code,size=64){
      const s=size;
      if(code===0)return`<svg width="${s}" height="${s}" viewBox="0 0 64 64"><circle cx="32" cy="32" r="14" fill="#fbbf24"><animate attributeName="r" values="13;15;13" dur="3s" repeatCount="indefinite"/></circle>${[0,45,90,135,180,225,270,315].map(a=>`<line x1="${32+20*Math.cos(a*Math.PI/180)}" y1="${32+20*Math.sin(a*Math.PI/180)}" x2="${32+24*Math.cos(a*Math.PI/180)}" y2="${32+24*Math.sin(a*Math.PI/180)}" stroke="#fbbf24" stroke-width="2.5" stroke-linecap="round"><animateTransform attributeName="transform" type="rotate" from="0 32 32" to="360 32 32" dur="8s" repeatCount="indefinite"/></line>`).join('')}</svg>`;
      if(code<=2)return`<svg width="${s}" height="${s}" viewBox="0 0 64 64"><circle cx="24" cy="30" r="12" fill="#fbbf24"><animate attributeName="cy" values="30;28;30" dur="4s" repeatCount="indefinite"/></circle><ellipse cx="36" cy="34" rx="17" ry="12" fill="rgba(255,255,255,.18)"/><ellipse cx="28" cy="38" rx="14" ry="10" fill="rgba(255,255,255,.14)"/></svg>`;
      if(code<=45)return`<svg width="${s}" height="${s}" viewBox="0 0 64 64"><ellipse cx="32" cy="28" rx="18" ry="12" fill="rgba(255,255,255,.2)"><animate attributeName="cx" values="32;34;32" dur="5s" repeatCount="indefinite"/></ellipse><ellipse cx="24" cy="34" rx="16" ry="11" fill="rgba(255,255,255,.18)"/><ellipse cx="38" cy="34" rx="14" ry="10" fill="rgba(255,255,255,.15)"/></svg>`;
      if(code<=67)return`<svg width="${s}" height="${s}" viewBox="0 0 64 64"><ellipse cx="32" cy="24" rx="18" ry="11" fill="rgba(148,163,184,.35)"><animate attributeName="cx" values="32;30;32" dur="4s" repeatCount="indefinite"/></ellipse><ellipse cx="22" cy="30" rx="14" ry="10" fill="rgba(148,163,184,.3)"/><ellipse cx="40" cy="30" rx="14" ry="10" fill="rgba(148,163,184,.28)"/>${[1,2,3,4,5].map(i=>`<line x1="${18+i*6}" y1="40" x2="${16+i*6}" y2="50" stroke="#60a5fa" stroke-width="1.8" stroke-linecap="round"><animate attributeName="y1" values="40;38;40" dur="${1.5+i*.2}s" repeatCount="indefinite"/></line>`).join('')}</svg>`;
      if(code<=77)return`<svg width="${s}" height="${s}" viewBox="0 0 64 64"><ellipse cx="32" cy="24" rx="18" ry="11" fill="rgba(148,163,184,.35)"/><ellipse cx="22" cy="30" rx="14" ry="10" fill="rgba(148,163,184,.3)"/>${[1,2,3,4,5].map(i=>`<circle cx="${18+i*6}" cy="${44+i%2*5}" r="2" fill="white" opacity=".7"><animate attributeName="cy" values="${44+i%2*5};${54+i%2*5}" dur="${.8+i*.1}s" repeatCount="indefinite"/></circle>`).join('')}</svg>`;
      return`<svg width="${s}" height="${s}" viewBox="0 0 64 64"><ellipse cx="32" cy="22" rx="20" ry="12" fill="rgba(71,85,105,.5)"/><ellipse cx="22" cy="30" rx="16" ry="11" fill="rgba(71,85,105,.45)"/><path d="M35 28 L28 40 L33 40 L26 54" stroke="#fbbf24" stroke-width="2.5" fill="none" stroke-linecap="round"><animate attributeName="opacity" values="1;0;1" dur="2s" repeatCount="indefinite"/></path></svg>`;
    }
    const forecastHtml=daily.time.slice(1,6).map((date,i)=>{
      const d=new Date(date),dc=daily.weather_code[i+1];
      const hi=Math.round(daily.temperature_2m_max[i+1]),lo=Math.round(daily.temperature_2m_min[i+1]);
      const rain=daily.precipitation_probability_max[i+1]||0;
      return`<div class="wx-day"><div class="wx-day-name">${days[d.getDay()]}</div><div class="wx-day-icon">${wxIcon(dc,28)}</div><div class="wx-day-hi">${hi}°</div><div class="wx-day-lo">${lo}°</div>${rain>15?`<div class="wx-day-rain">💧${rain}%</div>`:''}</div>`;
    }).join('');
    const html=`<div class="wx-root"><div class="wx-hero"><div class="wx-icon-wrap">${wxIcon(code,64)}</div><div style="flex:1;min-width:0"><div class="wx-temp">${temp}<sup>°C</sup></div><div class="wx-desc">${text}</div><div class="wx-loc" style="cursor:pointer" onclick="promptWeatherCity()" title="Changer"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" style="width:11px;height:11px"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>${cityName||'?'} <span style="opacity:.4;font-size:9px">✎</span></div></div></div><div class="wx-meta"><div class="wx-meta-cell"><div class="wx-meta-val">${feels}°</div><div class="wx-meta-lbl">Feels like</div></div><div class="wx-meta-cell"><div class="wx-meta-val">${wind}</div><div class="wx-meta-lbl">km/h wind</div></div><div class="wx-meta-cell"><div class="wx-meta-val">${hum}%</div><div class="wx-meta-lbl">Humidity</div></div></div><div class="wx-forecast">${forecastHtml}</div></div>`;
    w.innerHTML=html;
    if(_wp?.state)_wp.state.weatherCache={city:city||cityName||'',ts:Date.now(),rendered:html};
  }
}


// ===================================================
