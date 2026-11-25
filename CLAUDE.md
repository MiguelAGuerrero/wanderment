Read [`AGENTS.md`](AGENTS.md) (Expo rules), [`docs/DESIGN.md`](docs/DESIGN.md) (product rules) and
[`docs/ROADMAP.md`](docs/ROADMAP.md) (what's next, polish-first) before changing anything.
[`docs/IMPLEMENTATION_PLAN.md`](docs/IMPLEMENTATION_PLAN.md) is history: the completed plan (M1–M4)
for the retired app, not a plan to follow.

**What this repository holds.** It is still called `wanderment`, but Wanderment (a night-sky log of
wanders, whys, lines and stars) was retired by the owner on 2026-11-25. The app is now a personal
runbook — "Not what you have to do. How you do it." — that keeps a person's routines in their own
words and runs them one small step at a time. **It has no name yet: write "the app".**
- The design is [`docs/product/briefs/B-11-context-stacks.md`](docs/product/briefs/B-11-context-stacks.md)
  (its §9b and §9c override its earlier sections). On a conflict the owner's notes
  (`docs/product/owner-notes.md`) win, then B-11 §9b/§9c, then DESIGN.md. Much of B-11 is designed
  and not built; DESIGN.md says which.
- Code: routes under `src/app/go/` (home, `run/[id]`, `routine/[id]`, settings); components in
  `src/components/go/`; the engine in `src/domain/run.ts` (pure: data + verb → data), its selectors
  in `src/domain/runView.ts`, the prompt's search in `src/domain/starts.ts`.
- e2e: the `e2e/go-*.spec.ts` specs, seeded through `e2e/goFixture.ts` (it imports a backup through
  Settings), plus the storage, import, hand-over, update and PWA specs.
- The retired app's stored data (wanders, activities) is kept in storage, export and import and is
  not shown yet. Never delete or convert it.

Two skills drive the work, and each runs only when the owner types it:
- `/product` (`.claude/skills/product/`) — **grows** the app: new capabilities from the owner's ideas
  and approved briefs (`docs/product/`), a visible slice per cycle; briefs for big ones.
- `/polish` (`.claude/skills/polish/`) — **refines** what exists: benchmarks a feature area against
  similar apps' UI/UX conventions and quality of life, then fixes the gaps in small audited batches;
  also the Fix lane (data loss, lockouts) at full rigor.

Both build through one pipeline with **rigor by risk**: Light for UI work (build → verify → land;
no scout, contract file or audit), Full for stored data and storage (scout → contract → build →
audit → `verify.sh --full` → land).

Definition of done: `scripts/polish/verify.sh` passes. It runs unit tests, typecheck, lint and the
roadmap lint, builds the web app, and runs the end-to-end specs you changed plus a smoke set; logs go
to `.polish/logs/`. Use `--full` (the whole e2e suite) for stored-data, storage or sync work. It
stamps the tree it verified; a project hook only lets Claude push that exact tree and blocks
force-pushes and `--no-verify` — so verify, then push (or use `scripts/polish/land.sh`). CI deploys
in about a minute and a half and runs the whole e2e suite alongside; if that goes red, fix forward.

```bash
npm test             # vitest (domain unit tests)
npm run typecheck    # tsc --noEmit
npx eslint .         # lint
npm run e2e          # Playwright, whole suite (builds first)
```
