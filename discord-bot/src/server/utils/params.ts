/**
 * `@types/express-serve-static-core` types every named route param (and
 * every `req.query` value) as `string | string[]` — Express supports
 * wildcard route segments (e.g. `/files/*path`) whose captured value is an
 * array, and a query string can legally repeat a key (`?tag=a&tag=b`).
 *
 * None of this codebase's routes declare wildcard segments, and the route
 * params these helpers are used for (`:guildId`, `:id`, `:userId`, …) are
 * always single path segments — so at runtime they are always plain
 * strings. These helpers narrow that type in one place instead of
 * sprinkling `as string` casts (which would silently accept a real array
 * and truncate it to `"a,b"` via implicit `toString()`) at every call site.
 */

/** Thrown by {@link requireStringParam} when a required param is missing or an array. */
export class ParamValidationError extends Error {
  readonly status = 400;

  constructor(message: string) {
    super(message);
    this.name = 'ParamValidationError';
  }
}

/**
 * Narrows a route/query param to a single string, taking the first entry if
 * Express ever did hand back an array. Returns `undefined` if the value is
 * missing — use this for optional params where a permissive best-effort
 * value is preferable to throwing.
 */
export function firstString(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) {
    return value[0];
  }
  return value;
}

/**
 * Same as {@link firstString}, but requires a non-empty value — for
 * identifiers that must be present for the request to make sense (e.g.
 * `:guildId`). Throws a {@link ParamValidationError} (HTTP 400) rather than
 * silently continuing with `undefined`, which would otherwise surface as a
 * confusing failure further down the call stack.
 */
export function requireStringParam(value: string | string[] | undefined, name: string): string {
  const resolved = firstString(value);
  if (!resolved) {
    throw new ParamValidationError(`Paramètre "${name}" manquant ou invalide.`);
  }
  return resolved;
}
