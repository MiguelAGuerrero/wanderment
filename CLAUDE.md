Read [`AGENTS.md`](AGENTS.md) (Expo rules), [`docs/DESIGN.md`](docs/DESIGN.md) (product rules) and
[`docs/ROADMAP.md`](docs/ROADMAP.md) (what's next, polish-first) before changing anything.
[`docs/IMPLEMENTATION_PLAN.md`](docs/IMPLEMENTATION_PLAN.md) is the completed plan for M1–M4.

To work through the roadmap, run the `/polish` skill (`.claude/skills/polish/`): it triages the
roadmap's Inbox, scouts, builds, audits with a fresh agent, lands one batch on `main` and updates
the roadmap.

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
