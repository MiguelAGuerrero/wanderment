# Wanderment and Mindstream (Rep-it) — comparison

2026-11-23 · Page: https://claude.ai/artifact/UApq4fKUiLTjqavucpkhei (private) · Led to D-12.

**Finding.** Both apps are converging on one primitive: a resumable stack of intentions, one per
context, where only the top is actionable. Mindstream builds it top-down, to think through and do a
piece of work now. Wanderment builds it bottom-up from what you did, across months. The overlap is
a mechanism, not a purpose.

| | Mindstream · Rep-it | Wanderment |
|---|---|---|
| Job | Think and work through a problem now; offload intellectual context | See where life's energy goes; keep directions in view |
| Entry | "The one thing you want to focus on" / a blank think-pad | "What did you just do?" → soon "what are you up to?" |
| Direction | Top-down: author a focus, decompose | Bottom-up: logs first; whys earned (or declared) |
| **Stack** | Focus: `drillIntoFocus` push, `completeFocus` pop + takeaway; ThinkPad drill → Complete | Chains (B-02 / P-19, unbuilt): smaller step on top, logging pops it |
| **Contexts** | Many; switch, park "waiting on…", resume exactly | Many wanders/whys; heat shows which are alive; warm return |
| Ending | Focuses and contexts complete | Nodes never done (routines); only a written step completes |
| Pressure | Timers, timeboxes | No timers, streaks, counts or goals |
| Timescale | A session to days | Weeks to years |
| Capture | Long-form (TipTap), stream/reflect phases, thinking moves | One line, as typed |
| Picture | Breadcrumb + context rail (DAG planned) | The graph is Home |
| Platform | Vue 3, Vuetify, IndexedDB, desktop web | Expo/React Native (iOS, Android, PWA), SQLite, backup |
| Activity | v0.1.0, last commit 2026-06-18 (b0fa956) | Daily; B-06 being built |

**Options.**
1. Two apps with a handoff: a Wanderment step opens a Focus context; completing it logs back.
   Low cost; two stacks to learn.
2. **Wanderment takes the stack** (recommended, chosen): port the Focus model (~300 lines, UI-free)
   as chains with no timers and no completed nodes; the companion prompt is the front door — it
   logs what you did or opens/resumes a stack. Mindstream keeps ThinkPad or retires. Risk: a
   work-session feel creeping in; the refusals must hold.
3. Mindstream absorbs Wanderment: port to Vue/IndexedDB; loses native apps and the storage work.
   Highest cost, for the less active app.

**Sources.** Mindstream master (b0fa956): `docs/PRODUCT_AGENT_CONTEXT.md`, `FRONTEND_PATHS.md`,
`recursive-resolve-contract.md`, `topology-contract.md`, `stream-reflect-lifecycle.md`,
`src/focus/model/session.js`, `src/focus/store/sessionRunStore.js`,
`src/thinkpad/domain/thinkPadModel.js`. Wanderment: DESIGN.md, STRATEGY.md, B-02, B-06.
