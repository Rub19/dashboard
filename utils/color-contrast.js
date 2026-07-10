/* ETHONE color contrast utilities. Shared by the theme and polish runtimes. */
(function initEthoneColorContrast(global, factory) {
  var api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (global) global.ETHONEColorContrast = api;
})(typeof window !== "undefined" ? window : globalThis, function colorContrastFactory() {
  "use strict";

  function normalize(value, fallback) {
    var color = String(value || "").trim().toLowerCase();
    if (/^#[0-9a-f]{3}$/.test(color)) {
      return "#" + color[1] + color[1] + color[2] + color[2] + color[3] + color[3];
    }
    if (/^#[0-9a-f]{6}$/.test(color)) return color;
    return fallback || "#000000";
  }

  function channels(value) {
    var color = normalize(value);
    return [
      parseInt(color.slice(1, 3), 16),
      parseInt(color.slice(3, 5), 16),
      parseInt(color.slice(5, 7), 16)
    ];
  }

  function hexByte(value) {
    return Math.max(0, Math.min(255, Math.round(value))).toString(16).padStart(2, "0");
  }

  function mix(from, to, amount) {
    var a = channels(from), b = channels(to);
    var weight = Math.max(0, Math.min(1, Number(amount) || 0));
    return "#" + a.map(function (channel, index) {
      return hexByte(channel + (b[index] - channel) * weight);
    }).join("");
  }

  function luminance(value) {
    var converted = channels(value).map(function (channel) {
      var part = channel / 255;
      return part <= 0.04045 ? part / 12.92 : Math.pow((part + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * converted[0] + 0.7152 * converted[1] + 0.0722 * converted[2];
  }

  function ratio(first, second) {
    var a = luminance(first), b = luminance(second);
    return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
  }

  function ensure(background, foreground, minimum) {
    var base = normalize(background, "#8b5cf6");
    var text = normalize(foreground, "#ffffff");
    var target = Math.max(1, Number(minimum) || 4.5);
    if (ratio(base, text) >= target) return base;
    var destination = luminance(text) > 0.5 ? "#000000" : "#ffffff";
    for (var step = 1; step <= 100; step += 1) {
      var candidate = mix(base, destination, step / 100);
      if (ratio(candidate, text) >= target) return candidate;
    }
    return destination;
  }

  function lightestPassing(base, foreground, minimum) {
    var text = normalize(foreground, "#ffffff");
    var destination = luminance(text) > 0.5 ? "#ffffff" : "#000000";
    var best = base;
    for (var step = 1; step <= 18; step += 1) {
      var candidate = mix(base, destination, step / 100);
      if (ratio(candidate, text) < minimum) break;
      best = candidate;
    }
    return best;
  }

  function actionPair(accent, foreground, minimum) {
    var text = normalize(foreground, "#ffffff");
    var target = Math.max(1, Number(minimum) || 4.5);
    var base = ensure(accent, text, target + 0.65);
    var hover = ensure(accent, text, target);
    if (hover === base) hover = lightestPassing(base, text, target);
    return { base: base, hover: hover, foreground: text };
  }

  return Object.freeze({
    normalize: normalize,
    mix: mix,
    luminance: luminance,
    ratio: ratio,
    ensure: ensure,
    actionPair: actionPair
  });
});
