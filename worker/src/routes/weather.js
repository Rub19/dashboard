import { PATTERNS, assertAllowedQuery, queryText } from "../middleware/validation.js";
import { getWeather } from "../services/weather-client.js";
import { cachedLoad } from "../utils/cache.js";
import { routeResult } from "../utils/response.js";

export async function weatherRoute({ env, url }) {
  assertAllowedQuery(url, ["city"]);
  const city = queryText(url, "city", { pattern: PATTERNS.cityQuery, min: 2, max: 80 });
  const result = await cachedLoad(`weather:${city.toLowerCase()}`, 900, () => getWeather(env, city));
  return routeResult(result.data, { source: "weather", cached: result.cached });
}
