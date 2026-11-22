Read [`AGENTS.md`](AGENTS.md) (Expo rules), [`docs/DESIGN.md`](docs/DESIGN.md) (product rules) and
[`docs/ROADMAP.md`](docs/ROADMAP.md) (what's next, polish-first) before changing anything.
[`docs/IMPLEMENTATION_PLAN.md`](docs/IMPLEMENTATION_PLAN.md) is the completed plan for M1–M4.

Two skills drive the work, and each runs only when the owner types it:
- `/product` (`.claude/skills/product/`) — **grows** the app: new capabilities from the owner's ideas
  and approved briefs (`docs/product/`), a visible slice per cycle; briefs for big ones.
- `/polish` (`.claude/skills/polish/`) — **refines** what exists: benchmarks a feature area against
  similar apps' UI/UX conventions and quality of life, then fixes the gaps in small audited batches;
  also the Fix lane (data loss, lockouts) at full rigor.

Both build through one pipeline (scout → contract → build → audit → verify → land) with **rigor by
risk**: Light for UI-only work (one audit per batch), Full for stored data and storage.

Definition of done — run all, all must pass:

```bash
npm test             # vitest (domain unit tests)
npm run typecheck    # tsc --noEmit
npx eslint .         # lint
npm run e2e          # Playwright against the built web app (builds it first)
```

`scripts/polish/verify.sh` runs all of these (plus a test-integrity check and the roadmap lint)
quietly, with logs in `.polish/logs/`, and stamps the tree it verified. A project hook only lets
Claude push that exact tree, and blocks force-pushes and `--no-verify`: run the full verify, then
push (or use `scripts/polish/land.sh`).
