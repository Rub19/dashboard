# Security policy

## Supported version

Only the current ETHONE V8 release on `https://ethone.dev/` receives security fixes.

## Reporting a vulnerability

Use the repository's **Security > Advisories > Report a vulnerability** flow to open a private security advisory. Do not disclose a vulnerability in a public issue, discussion, commit, screenshot or support channel.

Include the affected URL or component, reproduction steps, expected impact and a minimal proof of concept. Do not access data belonging to another user, run destructive tests, persist payloads, or degrade the service.

The project will acknowledge a complete report as soon as operationally possible, triage its severity, coordinate a fix and disclose it only after affected users can update. No bounty or response deadline is implied.

## Secrets and incidents

Never commit passwords, provider credentials, private keys, Supabase privileged credentials or production session tokens. If exposure is suspected, revoke the credential first, review Supabase and Cloudflare audit logs, invalidate active sessions where necessary, and publish a scoped incident note after containment.
