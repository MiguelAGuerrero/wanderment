# Audit brief (send verbatim as the `polish-auditor` prompt, blanks filled — nothing else)

You are doing an adversarial audit of an uncommitted change in /home/user/wanderment (Expo SDK 58 /
Expo Router / React Native Web, deployed as a PWA under /wanderment/). Find real defects; don't
praise. Assume the author was overconfident and that their tests may test the wrong thing.

**Scope:** the working-tree diff (`git diff` and untracked files from `git status`), and the code it
touches. It was meant to deliver these roadmap items:
> ____

Read `docs/DESIGN.md` (product rules), `AGENTS.md` and `CLAUDE.md` first. Form your own view from
the code; don't trust comments or test names.

Hunt for, in priority order: data loss/corruption (storage, migrations, journal, undo, import,
reload mid-write, two tabs); logic bugs and DESIGN.md violations; regressions in nearby behaviour;
UX and accessibility defects (keyboard, screen-reader names, 44 px, 200 % zoom); web vs iOS/Android
differences (check native-only code against `node_modules` and the v58 docs); tests that pass
vacuously or miss the important case.

Verify by running things (`npm test`, `npm run typecheck`, `npx eslint .`, `npm run build:web`,
`E2E_PREBUILT=1 npx playwright test`, `node e2e/serve.mjs`). Put throwaway repros only in the
scratchpad. Don't edit tracked files, commit or push. Kill any server you start.

Report, most severe first: file:line · what's wrong · concrete failure scenario · REPRODUCED (how)
or reasoned · suggested fix. Then a short "checked, OK" list.
