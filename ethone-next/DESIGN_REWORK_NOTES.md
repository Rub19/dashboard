# Design Rework Notes

Running log of the "less AI, more clean/modern" visual and structural pass on the ETHONE
dashboard. Each entry says exactly what was wrong, what changed, and which files were touched.
Purely presentational/structural — no data flow, API, or feature behavior was changed.

This file is additive: earlier passes in this session (animated-dot → static dot + glow,
redundant emoji → icon, double-blur aura trims, v1.20.54–v1.20.63) are already shipped and are
**not** re-documented here; this log starts with the deeper structural pass requested afterwards.

---

## 2026-09-09 — Batch 1: stat-tile hierarchy, hardcoded theming, shared empty state

### `components/DashboardOverview.tsx` — home page "Priority Layer"
**Problem:** the row under the hero header ("Calendrier / Tâches / Focus Mode / ETHONE Brain")
was four separate, visually identical bordered/rounded cards side by side — the textbook
"generic AI dashboard" stat-tile grid: same border, same background, same icon size, no sense
of which tile carries a real number vs. which is just static status text (Focus and Brain never
show a number at all, only "Prêt à démarrer" / "Intelligence connectée").
**Change:** merged the four cards into a single `v8-panel` strip divided by `divide-x`
(row on mobile via `divide-y`), each stat now has its own colored icon chip (rose/emerald/sky/
purple, matching the icon color already used) instead of a small plain icon — this gives each
tile a distinct identity while removing three redundant outer card borders. Typography is now
consistent: bold `font-mono` numeral for the two count-based tiles, quieter status line for the
two state-based tiles, all left-aligned next to their icon chip instead of icon-top-right/number-
bottom-left. Interactive elements are now real `<button>`s instead of `<div onClick>`.
No change to what data is shown or the click-through destinations (`/calendar`, `/tasks`,
`/focus`, `/brain`).

### `components/BrainBriefingPanel.tsx` — Brain briefing stat grid (used on Home "Brain" widget and `/brain` → Briefing tab)
**Problem:** seven stat tiles (Météo, Agenda, Tâches, Mail, Notifications, Activité, Now Playing)
all rendered with identical styling regardless of whether they carried real, actionable
information (e.g. "3 tâches ouvertes") or were just idle/zero — no emphasis on what actually
matters right now.
**Change:** added a `highlight` flag per section (true when the tile has a non-zero/meaningful
value: open tasks, unread mail, important notifications, today's events, or active now-playing).
Highlighted tiles get an accent-tinted border/background, an accent-colored icon, and a larger
bold value; non-highlighted tiles stay in the previous muted style but at a smaller value size.
Weather and the aggregate "Activité" counter are left neutral (they're ambient info, not an
actionable count). No data/computation changed, only which tiles get visual emphasis.

### `components/ui/EmptyState.tsx` — shared empty state (used on `/connections` filtered-out results, `/files`, etc.)
**Problem:** classic "icon in a grey box + one grey sentence" placeholder with no visual
identity — the icon chip used the same flat `text-primary/[0.04]` fill as generic disabled UI,
and the outer frame was a solid card indistinguishable from a real content card ("empty state
that looks like it's still loading/broken" smell).
**Change:** icon chip now uses the accent color (`--accent-primary` tinted background + ring)
so it reads as "nothing here yet" rather than "broken", the outer container uses a dashed border
instead of a solid one so it visually reads as a placeholder rather than a content card, and
copy spacing/line-height was tightened. Same props/API (`title`, `description`, `icon`, `action`,
`className`) — no behavior change, purely the shared visual for every page that already uses
this component.

### `components/ActivityHub.tsx` — Activity page stat cards, toolbar, and "Brain Insights" panel
**Problem:** three containers used a hardcoded `bg-zinc-950/80` instead of the theme's
`--panel-bg` / `v8-panel` token, meaning the Activity stat cards, the journal toolbar, and the
Brain Insights panel stayed near-black even when the user is on a light theme or any of the
other 15 preset themes — a real theming bug, not just a style nit (verified in the browser by
forcing a light-theme token set: with the old hardcoded class those panels stayed black; after
the fix they turn light/white and adopt the theme's border/text colors correctly).
**Change:** replaced all three `bg-zinc-950/80 border border-[var(--text-primary)]/[0.08]
backdrop-blur-xl rounded-2xl p-4 shadow-lg` occurrences (StatCard, StatSkeleton, and two section
containers) with the standard `v8-panel` utility class already used everywhere else in the app,
which resolves to the correct theme-aware background/border/blur automatically. No layout or
data change.

### `components/IntegrationsSettings.tsx` — Connections page search bar
**Problem:** the file already imports the design-system `Input` component but the header search
field was a hand-rolled `<input>` with its own one-off border/background/focus classes instead
of reusing it — a small inconsistency that adds up across the app ("every page styles its own
inputs slightly differently").
**Change:** swapped the raw `<input>` + manually-positioned `lucide-react` `Search` icon for
`<Input icon="search" clearable inputSize="compact" .../>`, matching how search inputs look
everywhere else (e.g. `/activity`, `/settings`). Removed the now-unused `Search` import from
`lucide-react`. Same `search` state, same `onChange` handler — purely a markup/component swap.

**Verification after this batch:** `npx tsc --noEmit` → 0 errors. `npm run build` → succeeded,
all routes prerendered, no new errors. Manually reviewed in the browser (dev server) at
`/dashboard` (Priority Layer strip + Brain briefing tiles), `/connections` (new search input),
and `/activity` (v8-panel stat cards), including forcing a light-theme token override on
`/activity` to confirm the previously-hardcoded panels now respond to theme tokens correctly.

---

## Deliberately left alone

- **Live/transient indicators** (now-playing pulse, sync-in-progress states, focus timer ring,
  drag-and-drop active states) — untouched, these reflect real state and were explicitly out of
  scope for this pass.
- **`components/EmptyState.tsx`** (the richer `v8-empty-state` variant with `STATE_PRESETS`,
  used by `ConnectionCardsWidget` and others) — already has eyebrow/title/description hierarchy,
  a two-layer icon frame, and per-kind semantics (loading/error/offline/etc.); it was not judged
  to have the same "generic AI empty state" problem as the plainer `components/ui/EmptyState.tsx`,
  so it was left as-is to avoid scope creep.
- **`app/brain/page.tsx` automations/diagnostics list rows** — reviewed, but these are simple
  single-level list rows (not nested cards) and already read cleanly; no change made.
