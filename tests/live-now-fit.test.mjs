import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

function read(relative) {
  return fs.readFileSync(new URL(`../${relative}`, import.meta.url), "utf8");
}

test("the weather detail popover is wired on the Activity page's Live Now grid, not just Home", () => {
  const activity = read("v8/pages/activity.mjs");
  assert.match(activity, /import \{ createWeatherDetail \} from "\.\.\/ui\/weather-detail\.mjs";/);
  assert.match(activity, /weatherLiveCard\(weatherPresence, \{ variant: "activity", detailable: true \}\)/);
  assert.match(activity, /const weatherDetail = createWeatherDetail\(\);/);
  assert.match(activity, /liveGrid\.addEventListener\("click"/);
  assert.match(activity, /data-weather-detail-trigger/);
  assert.match(activity, /weatherDetail\.destroy\(\);/);
});

test("Spotify and Weather cards shed their widest secondary content before their own text truncates, via container queries scoped after the base rule they override", () => {
  const shell = read("v8/styles/shell.css");

  assert.match(shell, /\.v8-spotify-live \{[^}]*container-type:inline-size/);
  assert.match(shell, /\.v8-weather-live \{[^}]*container-type:inline-size/);

  const spotifyBaseIndex = shell.indexOf('.v8-spotify-control--secondary { width:26px');
  const spotifyQueryIndex = shell.indexOf('@container (max-width:360px) { .v8-spotify-control--secondary { display:none; } }');
  assert.ok(spotifyBaseIndex > -1 && spotifyQueryIndex > spotifyBaseIndex, "the spotify container query must come after the base rule it overrides, or source order loses the cascade");

  const weatherBaseIndex = shell.indexOf(".v8-weather-forecast { display:flex;gap:10px;");
  const weatherQueryIndex = shell.indexOf("@container (max-width:400px) { .v8-weather-forecast { display:none; } }");
  assert.ok(weatherBaseIndex > -1 && weatherQueryIndex > weatherBaseIndex, "the weather container query must come after the base rule it overrides, or source order loses the cascade");
});
