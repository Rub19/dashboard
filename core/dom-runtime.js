/* ETHONE shared DOM mutation runtime.
   UI enhancement modules subscribe here instead of owning competing deep observers. */
(function initEthoneDOMRuntime(global) {
  "use strict";

  if (global.ETHONEDOMRuntime) return;

  var subscribers = Object.create(null);
  var observer = null;
  var observerPending = false;
  var scheduled = false;
  var roots = [];
  var overflow = false;
  var batches = 0;
  var MAX_ROOTS = 24;

  function warn(name, error) {
    try { console.warn("[ETHONE DOM] Subscriber failed: " + name, error); } catch (ignored) {}
  }

  function notify() {
    scheduled = false;
    if (!roots.length && !overflow) return;
    var batchRoots = roots.splice(0, roots.length);
    var batch = {
      reason: "mutation",
      roots: batchRoots,
      overflow: overflow,
      batch: ++batches
    };
    overflow = false;
    Object.keys(subscribers).forEach(function (name) {
      try { subscribers[name](batch); } catch (error) { warn(name, error); }
    });
  }

  function schedule() {
    if (scheduled) return;
    scheduled = true;
    (global.requestAnimationFrame || function (callback) { return setTimeout(callback, 16); })(notify);
  }

  function collect(mutations) {
    for (var i = 0; i < mutations.length; i += 1) {
      var added = mutations[i] && mutations[i].addedNodes;
      if (!added) continue;
      for (var j = 0; j < added.length; j += 1) {
        var node = added[j];
        if (!node || node.nodeType !== 1) continue;
        if (roots.length < MAX_ROOTS) roots.push(node);
        else overflow = true;
      }
    }
    if (roots.length || overflow) schedule();
  }

  function startObserver() {
    if (observer || observerPending || typeof global.MutationObserver !== "function") return;
    if (!document.body) {
      observerPending = true;
      document.addEventListener("DOMContentLoaded", function () {
        observerPending = false;
        startObserver();
      }, { once: true });
      return;
    }
    observer = new global.MutationObserver(collect);
    observer.observe(document.body, { childList: true, subtree: true });
  }

  function subscribe(name, callback) {
    name = String(name || "").trim();
    if (!name || typeof callback !== "function") return function noop() {};
    subscribers[name] = callback;
    startObserver();
    return function disposeSubscription() { unsubscribe(name, callback); };
  }

  function unsubscribe(name, callback) {
    name = String(name || "").trim();
    if (!subscribers[name] || (callback && subscribers[name] !== callback)) return false;
    delete subscribers[name];
    return true;
  }

  function flush() {
    if (!roots.length && !overflow && document.body) roots.push(document.body);
    notify();
  }

  function stats() {
    return {
      subscribers: Object.keys(subscribers).length,
      observers: observer ? 1 : 0,
      queuedRoots: roots.length,
      batches: batches
    };
  }

  var api = Object.freeze({
    subscribe: subscribe,
    unsubscribe: unsubscribe,
    flush: flush,
    stats: stats
  });

  global.ETHONEDOMRuntime = api;
  try {
    if (global.Ethone && typeof global.Ethone.define === "function") global.Ethone.define("domRuntime", api);
  } catch (error) {}
})(window);
