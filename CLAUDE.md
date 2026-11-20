Read [`AGENTS.md`](AGENTS.md) (Expo rules), [`docs/DESIGN.md`](docs/DESIGN.md) (product rules) and
[`docs/IMPLEMENTATION_PLAN.md`](docs/IMPLEMENTATION_PLAN.md) (what to build, in order) before changing anything.

Definition of done — run all, all must pass:

```bash
npm test             # vitest (domain unit tests)
npm run typecheck    # tsc --noEmit
npx eslint .         # lint
npm run e2e          # Playwright against the built web app (builds it first)
```
