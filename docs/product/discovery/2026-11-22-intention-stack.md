# The intention stack — discovery and research audit (2026-11-22)

For brief [B-06](../briefs/B-06-intention-stack.md). Full reports with sources are in
[`2026-11-22-intention-stack/`](2026-11-22-intention-stack/):
- `forms.md`: visualization forms and theory;
- `mobile.md`: mobile patterns and Expo tooling;
- `apps.md`: adjacent apps;
- `research-goals.md`, `research-perception.md` and `research-wellbeing.md`: the research audit.

Many vendor and paper pages couldn't be fetched from the session, so those claims come from search
excerpts and are marked "(via search)". Claims about products are dated 2026-11-22.

## What the owner described, named
- **A flame graph of intentions.** An icicle chart with the root at the bottom: the why is the
  base, and the next step is on top.
- **Hoisting.** Re-anchoring at any node (Workflowy's zoom; MORE, 1986).
- **Small multiples, paged.** One tower per sibling, like Apple Weather's pager.
- **Theory:** a means–end goal hierarchy (laddering; Carver & Scheier). Goal-systems theory covers
  one wander serving several whys (multifinality); profilers handle that case with a "sandwich"
  view.
- **No app surveyed does this.** Workflowy, OmniFocus, Intend and the ACT Matrix each have one piece.

## Borrowable ideas (verdicts)
| Idea | Verdict | Where |
|---|---|---|
| Equal-width towers (width never encodes an amount) | fits if changed | forms 1 |
| Compressed tower: top + one "toward" + base, the middle folded | fits | forms 2, apps 9 |
| One home per shared wander + a ◇ "also toward" mirror | fits | forms 4, apps 5 |
| Cycle-safe `subtreeFrom(anchor)` (derived links can form cycles) | fits | forms 5 |
| Hoist: tap a base to re-anchor; the trail goes back down | fits | forms 6, mobile 1, apps 1 |
| Sibling pager with name chips (no dots, which count); the next page peeks | fits if changed | mobile, apps 2 |
| The next step mirrored at the log box → the **spotlight dock** | fits if changed | mobile 2, research |
| Only the top is live (OmniFocus's first available action) | fits | apps 3 |
| "Toward", not "done" (ACT Matrix toward moves) | fits | apps 6, research |
| Horizontal snap pager with `ScrollView pagingEnabled` (track the page with `onScroll` on web) | fits | mobile tooling |
| Plain Views with `column-reverse`, no Skia (2.9 MB of WASM on web, inaccessible text) | fits | forms, mobile tooling |

## Doesn't fit (kept so they aren't re-proposed)
- **Counts and progress:** proportional widths and areas (flame graphs, treemaps), progress pies,
  the Bull's-eye's scores, Must/Should/Want tags.
- **Swipe and gesture patterns:** swipe to log or set down, Tinder-style judging swipes, Stories'
  auto-advance, pinch to change level, page dots.
- **Planning and nudges:** AI step breakdown, if-then plans with times, WOOP as a flow, goal-gradient
  pulls, fresh-start prompts, re-engagement nudges.
- **App-chosen content:** app-ranked "do this next", auto-reordered stacks.

## The research audit, in one paragraph
- **The core shape is supported.** The why underneath and one concrete step on top divide the work:
  the reason helps self-control, the concrete step helps you start.
- **Lean on these.** "You left off" is a cue to resume (the robust Ovsiankina effect, not
  Zeigarnik). Popping reads as moving *toward*, not "done". No counts is backed by evidence.
- **The next step needs one deliberate place.** That is the owner's spotlight, docked above the log
  box, showing the step plus its why.
- **What the spotlight must do:** show only what the person picks, appear when asked, rest after a
  pop, and never age a step.

Little of this research tested an app like this one: read it as which way to lean, not as a
prediction.
