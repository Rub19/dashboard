/* ETHONE legacy compatibility module: lanyard. */
// === LANYARD WEBSOCKET (real-time) ===
let _lanyardWS = null, _lanyardHB = null, _lanyardUserId = null;

function startLanyardWS(userId){
  if(_lanyardWS){_lanyardWS.close();clearInterval(_lanyardHB);}
  _lanyardUserId = userId;
  let _lanyardRetry=5000; // reset délai de reconnexion
  try{
    _lanyardWS = new WebSocket('wss://api.lanyard.rest/socket');
    _lanyardWS.onopen = ()=>
    _lanyardWS.onmessage = e => {
      const msg = JSON.parse(e.data);
      if(msg.op === 1){ // HELLO
        const interval = msg.d.heartbeat_interval;
        clearInterval(_lanyardHB);
        _lanyardHB = setInterval(()=>{ if(_lanyardWS.readyState===1) _lanyardWS.send(JSON.stringify({op:3})); }, interval);
        // Subscribe
        _lanyardWS.send(JSON.stringify({op:2, d:{subscribe_to_id: userId}}));
      } else if(msg.op === 0){ // EVENT
        const d = msg.d;
        if(msg.t==='INIT_STATE'||msg.t==='PRESENCE_UPDATE'){
          const data = msg.t==='INIT_STATE' ? d : d;
          const p = curP(); if(!p) return;
          if(!p.state.connections?.discord) return;
          p.state.connections.discord.data = data;
          saveStateNow();
          renderDiscordCard(data);
          refreshDiscordSidebar();
        }
      }
    };
    let _lanyardRetry=5000;
    _lanyardWS.onclose = ()=>{
      clearInterval(_lanyardHB);
      // Reconnexion exponentielle: 5s → 10s → 20s → 30s max
      setTimeout(()=>{
        const p=curP();
        if(p?.state?.connections?.discord?.userId===userId){
          _lanyardRetry=Math.min(_lanyardRetry*2,30000);
          startLanyardWS(userId);
        }
      }, _lanyardRetry);
    };
    _lanyardWS.onerror = ()=> _lanyardWS.close();
  } catch(err){ console.warn('[Lanyard WS] WebSocket not available, falling back to polling'); startLanyardPolling(userId); }
}

function stopLanyardWS(){
  if(_lanyardWS){_lanyardWS.onclose=null;_lanyardWS.close();_lanyardWS=null;}
  clearInterval(_lanyardHB);
}

function startLanyardPolling(userId){
  setInterval(()=>{
    const p=curP();if(!p)return;
    if(p.state.connections?.discord?.userId!==userId)return;
    fetch('https://api.lanyard.rest/v1/users/'+userId).then(r=>r.json()).then(j=>{
      if(j.success){p.state.connections.discord.data=j.data;saveStateNow();renderDiscordCard(j.data);refreshDiscordSidebar();}
    }).catch(()=>{});
  },20000);
}
