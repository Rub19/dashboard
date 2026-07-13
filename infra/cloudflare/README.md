# ETHONE edge configuration audit

Observed on 2026-07-13:

- `ethone.dev` resolves to the four GitHub Pages IPv4 addresses.
- `deploy.ethone.dev` resolves to Cloudflare edge addresses.
- The repository contains a valid `CNAME` for `ethone.dev`.

## Important hosting constraint

GitHub Pages does not apply the repository `_headers` file. The file documents the intended policy and is usable if the site moves to Cloudflare Pages, but production headers on the current GitHub Pages origin must be applied by Cloudflare Response Header Transform Rules or a reviewed Worker route.

Do not proxy `ethone.dev` until GitHub Pages HTTPS is valid and the following checks pass without redirects looping:

1. `https://ethone.dev/`
2. `https://ethone.dev/index.html`
3. `https://ethone.dev/sw.js`
4. Supabase OAuth return to `https://ethone.dev/`

## Required cache rules

- Bypass cache for HTML, `sw.js`, OAuth parameters, auth paths and API paths.
- Cache immutable icons for one year.
- Cache unhashed V8 modules and styles for at most five minutes with revalidation.
- Never cache responses carrying `Authorization`, `Set-Cookie`, OAuth codes or Supabase user data.
- Do not use a zone-wide Cache Everything rule.

## Cloudflare Access for deploy.ethone.dev

- Use an allow policy for the single authorized identity and a deny fallback.
- Keep the Access session short and require re-authentication for deployment actions.
- Protect every path, including API and callback paths.
- Store GitHub credentials only as encrypted Worker secrets.
- Use a fine-grained GitHub token limited to the target repository contents and workflow read access.
- Never expose the token to browser JavaScript, logs, query parameters or local storage.
- Revoke the token when a deployment session is disconnected or compromised.

The `deploy.ethone.dev` source is not present in this workspace, so its upload, dry-run and commit implementation must be audited in its own repository before deployment.
