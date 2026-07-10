/* ETHONE legacy compatibility module: lanyard. */
// === LANYARD WEBSOCKET (real-time) ===
let _lanyardWS = null;
let _lanyardHB = null;
let _lanyardUserId = null;
let _lanyardPoll = null;
let _lanyardRetryTimer = null;
let _lanyardRetryDelay = 5000;

function _lanyardCurrentDiscordId() {
  try {
    const p = curP();
    return p && p.state && p.state.connections && p.state.connections.discord
      ? p.state.connections.discord.userId
      : null;
  } catch (e) {
    return null;
  }
}

function _lanyardStoreData(data) {
  const p = curP();
  if (!p || !p.state || !p.state.connections || !p.state.connections.discord) return;
  p.state.connections.discord.data = data;
  saveStateNow();
  if (typeof renderDiscordCard === "function") renderDiscordCard(data);
  if (typeof refreshDiscordSidebar === "function") refreshDiscordSidebar();
}

function _lanyardClearRetry() {
  clearTimeout(_lanyardRetryTimer);
  _lanyardRetryTimer = null;
}

function _lanyardClearPolling() {
  clearInterval(_lanyardPoll);
  _lanyardPoll = null;
}

function startLanyardWS(userId) {
  if (!userId) return;
  if (_lanyardUserId === userId && _lanyardWS && (_lanyardWS.readyState === 0 || _lanyardWS.readyState === 1)) return;

  stopLanyardWS();
  _lanyardUserId = userId;
  _lanyardRetryDelay = 5000;

  try {
    _lanyardWS = new WebSocket("wss://api.lanyard.rest/socket");
    _lanyardWS.onopen = function () {
      _lanyardRetryDelay = 5000;
      _lanyardClearPolling();
    };
    _lanyardWS.onmessage = function (event) {
      let msg;
      try { msg = JSON.parse(event.data); } catch (e) { return; }
      if (!msg) return;

      if (msg.op === 1) {
        const interval = msg.d && msg.d.heartbeat_interval ? msg.d.heartbeat_interval : 30000;
        clearInterval(_lanyardHB);
        _lanyardHB = setInterval(function () {
          if (_lanyardWS && _lanyardWS.readyState === 1) {
            _lanyardWS.send(JSON.stringify({ op: 3 }));
          }
        }, interval);
        if (_lanyardWS && _lanyardWS.readyState === 1) {
          _lanyardWS.send(JSON.stringify({ op: 2, d: { subscribe_to_id: userId } }));
        }
        return;
      }

      if (msg.op === 0 && (msg.t === "INIT_STATE" || msg.t === "PRESENCE_UPDATE")) {
        if (_lanyardCurrentDiscordId() !== userId) return;
        _lanyardStoreData(msg.d);
      }
    };
    _lanyardWS.onclose = function () {
      clearInterval(_lanyardHB);
      _lanyardHB = null;
      _lanyardClearRetry();
      _lanyardRetryTimer = setTimeout(function () {
        if (_lanyardCurrentDiscordId() === userId) {
          _lanyardRetryDelay = Math.min(_lanyardRetryDelay * 2, 30000);
          startLanyardWS(userId);
        }
      }, _lanyardRetryDelay);
    };
    _lanyardWS.onerror = function () {
      try { _lanyardWS.close(); } catch (e) {}
      startLanyardPolling(userId);
    };
  } catch (e) {
    startLanyardPolling(userId);
  }
}

function stopLanyardWS() {
  if (_lanyardWS) {
    _lanyardWS.onclose = null;
    try { _lanyardWS.close(); } catch (e) {}
    _lanyardWS = null;
  }
  clearInterval(_lanyardHB);
  _lanyardHB = null;
  _lanyardClearRetry();
  _lanyardClearPolling();
  _lanyardUserId = null;
  _lanyardRetryDelay = 5000;
}

function startLanyardPolling(userId) {
  if (!userId) return;
  _lanyardClearPolling();
  _lanyardPoll = setInterval(function () {
    if (_lanyardCurrentDiscordId() !== userId) {
      _lanyardClearPolling();
      return;
    }
    fetch("https://api.lanyard.rest/v1/users/" + encodeURIComponent(userId))
      .then(function (response) { return response.json(); })
      .then(function (json) {
        if (json && json.success) _lanyardStoreData(json.data);
      })
      .catch(function () {});
  }, 20000);
}
