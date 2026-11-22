# Discovery: stacks of steps toward a pursuit (adjacent apps and methods)

_Scout report for B-06 (the stack under the graph), 2026-11-22. Territory: intention, goal and
task-breakdown apps, ADHD breakdown tools, PKM/outliners, and ACT values methods, and how each shows
"this small step serves that bigger thing". Visualization theory (flame graphs, icicles, laddering)
and mobile interaction/Expo tooling are other scouts' slices and are left out here._

**Method note.** Direct page fetches were blocked in this session (help.sunsama.com,
intend.herokuapp.com and todoist.com failed DNS; those hosts would have to be allowed to re-check).
Every claim below comes from web-search results, checked on 2026-11-22, that quote the product's own
help pages, changelogs or App Store listings. Where only a review or forum post supports a claim, it's
labelled as such. Apps change, so each claim carries the date of its source where one was given.

---

## What others do

### At a glance

| Product / method | How the step-to-why chain shows | Only the top/next? | One item, several whys | Drift and return |
|---|---|---|---|---|
| Intend (ex-Complice) | Each day's intention is tagged with a goal number/colour (one hop) | No, a daily list | Yes: comma-separated goal numbers | A fresh list every day, so no backlog |
| Sunsama objectives | Purple target icon on a task aligned to a weekly objective | No | No (one objective) | Auto-archive after N rolled-over days; objectives reset weekly |
| Todoist Goals (beta) | Tasks linked to a goal in a Goals tab | No | Not found | **Retired 2026-07-13; users' goals deleted** |
| Amazing Marvin | Heart icon on a goal-linked task; hover shows the goal and one of its *motivations* above the task | Sequential projects exist | Not found | "Alerts" when a project has no next step |
| OmniFocus | Project → actions; sequential projects | **Yes: only the first available action; the rest are blocked and hidden** | No | Weekly review; Focus narrows scope temporarily |
| Lunatask | Areas of life → goals → tasks, with auto progress | No | No | Must/Should/Want sorting |
| Things 3 | Projects with headings; a progress pie per project | No | No | Someday list |
| Tiimo, Llama Life, Structured | Steps under a task (often AI-made), one task at a time | Tiimo/Llama show one task at a time | No | Llama "Not-Now" list; Tiimo "paused" |
| Goblin.tools Magic ToDo | Recursive AI breakdown into sub-steps | No, a tree | No | none |
| GTD | Horizons of focus: runway (actions) → … → purpose; Natural Planning starts with "why" | **Yes, one "next action" per project** | Not addressed | Weekly review flags projects with no next action |
| Workflowy / Logseq / Roam | Zoom into any node; ancestors shown as a breadcrumb | Zoom shows one subtree | Mirrors: one bullet in many places, "show mirror breadcrumbs" | none |
| Heptabase | Nested whiteboards; one card on many boards | No | Yes: the card's Info lists every board it's on | none |
| ACT Matrix / Bull's-eye / Choice Point | What matters (bottom-right) with "toward moves" above it | One "towards move" at a time | Not addressed | "Toward" is judged by intent, not outcome |

### Intention-to-goal apps

- **Intend (formerly Complice).** You can't use the app until you've set at least two goals (max 10,
  most people 3–6). Each goal has a number and colour, and each daily intention is tagged with a
  number. One intention can serve several goals ("1,3"), and intentions that serve none use a symbol
  (`&` or `~`). Inactive goals keep a two-letter code. You write a **fresh list each day**, so
  unfinished items don't pile up, and at day's end you're asked what actually happened, unplanned
  things included. Goals need no deadline or number. Sources: [Beeminder help: Intend](https://help.beeminder.com/article/85-intend),
  [Intend features (Heroku-hosted copy, possibly older)](https://intend.herokuapp.com/features),
  [Intend philosophy](https://intend.herokuapp.com/philosophy), [founder's "Complice is now Intend"](https://intentionality.substack.com/p/complice-is-now-intend).
  A third-party review describes the result as "no guilt or overwhelm at having a growing list of
  past to-dos that were never finished" (review, not primary).
- **Sunsama, weekly objectives.** You align a task with `R` or the ⋯ menu, and aligned tasks show a
  **purple target icon**. Objectives are meant for multi-day work, and they **don't roll over**: each
  week starts fresh. "Turn this into an objective" promotes a task (changelog 2022-08-19, and a newer
  entry). Users have asked to list tasks *under* an objective, which isn't supported (a request, not
  a feature). Separately, tasks that roll over more than N days in a row (default 4, 1–14, or off)
  are **auto-archived**. Only the app archives, and you retrieve a task by picking a new day for it.
  Sources: [Weekly Objectives help](https://help.sunsama.com/docs/weekly-objectives),
  [create objective from a task](https://roadmap.sunsama.com/changelog/create-objective-from-a-task),
  [weekly update 2022-08-19](https://roadmap.sunsama.com/changelog/weekly-update-august-19-2022),
  [objective subtasks request](https://roadmap.sunsama.com/improvements/p/objective-subtasks),
  [archive help](https://help.sunsama.com/docs/archive).
- **Todoist Goals (beta), launched 2026-05-14, retired 2026-07-13.** Tasks were linked to goals from a
  task's sidebar or in bulk. On retirement, the Goals tab and **every goal people had made were
  deleted** ("can't be recovered" without an export). Todoist's stated reason: Goals didn't clear its
  bar of "simple and powerful". Its suggested replacement is project descriptions. Sources:
  [Goals beta (May 14)](https://www.todoist.com/help/articles/goals-beta-connect-your-tasks-to-what-actually-matters-may-14-x0RWRaKDS),
  [Goals beta retired](https://www.todoist.com/help/todoist/product-updates/goals-beta-retired-VKe2PuGn5).
- **Amazing Marvin, Goals.** A task connected to a goal shows a heart icon. Hovering "will tell you to
  which goal the task is connected, and also display one of the motivations for working on this goal
  above the task." Completed tasks add to the goal's progress. Marvin's feature list also promises
  "make sure projects always have a defined next step, with alerts". Sources:
  [Goals & objectives help](https://help.amazingmarvin.com/en/articles/5015479-goals-objectives),
  [sequential projects](https://help.amazingmarvin.com/en/articles/5028039-sequential-projects),
  [features](https://amazingmarvin.com/features/funnel/).
- **OmniFocus.** In a sequential project "the first action in the list is the only one available for
  completion; all later actions are considered blocked", and in the Available view they're hidden. In
  other views they're grey. **Focus** (Pro, now also on iPhone and iPad) "temporarily narrow[s] the scope
  … across all perspectives to just the selected folders or projects". The latest iOS notes found are
  4.9, 2026-09-13. Sources: [glossary 4.8](https://support.omnigroup.com/documentation/omnifocus/universal/4.8/en/glossary),
  [iOS projects guide](https://support.omnigroup.com/documentation/omnifocus/ios/2.9/en/planning-with-projects),
  [OF4 manual](https://support.omnigroup.com/documentation/omnifocus/universal/4.7/en/welcome),
  [iOS 4.9 release notes](https://www.omnigroup.com/releasenotes/omnifocus-ios/P5).
- **Lunatask.** Tasks live in "areas of life", which can have goals that "automatically calculate your
  progress". A Premium workflow tags each task **Must / Should / Want** and sorts by it. Sources:
  [tasks concepts](https://lunatask.app/docs/features/tasks/concepts),
  [Must/Should/Want](https://lunatask.app/docs/features/tasks/workflows/must-should-want-method).
- **Things 3.** Projects split by headings, and Today can be grouped by project (a setting). Each
  project shows a progress pie (described in a review, not docs). Sources:
  [headings support](https://culturedcode.com/things/support/articles/2803577/),
  [MacStories review, 2017](https://www.macstories.net/reviews/things-3-beauty-and-delight-in-a-task-manager/).
- **Tiimo.** Tiimo's own guidance: "only displaying one task at a time can help reduce overwhelm". An
  AI co-planner splits tasks into steps with time estimates. The "Right now" widget used to be a static
  display of the current task, and now shows what's "ongoing or paused so you do not lose track of
  where you are". Subtasks can be checked off from the widget. All of this is from Tiimo's own
  marketing and resource pages. Sources: [task initiation](https://www.tiimoapp.com/ko/resource-hub/task-initiation-adhd),
  [new iOS widgets](https://tiimoapp.com/resource-hub/new-ios-widgets),
  [App Store](https://apps.apple.com/us/app/id1480220328).
- **Llama Life.** One task at a time, each with a countdown, chimes and confetti. A **Not-Now list**
  keeps the main list short, and AI "Break it down" splits a task. Source: [App Store listing](https://apps.apple.com/us/app/adhd-organizer-llama-life/id6454469750).
- **Structured.** A timeline planner. A small button reveals a task's subtasks inline on the timeline,
  without opening the editor (2.0 notes), and there's AI subtask breakdown. Sources:
  [getting started](https://help.structured.app/en/articles/380546), [App Store](https://apps.apple.com/app/structured-daily-planner/id1499198946).
- **Amie, Reflect.** Nothing to borrow. Amie's changelog through #132 (2026-09-03) has no goals or
  projects ([changelog](https://amie.so/changelog)). Reflect's Tasks is "a basic aggregate view", and
  it says outright that it isn't a task manager ([tasks beta](https://reflect.app/blog/tasks-beta)).
- **Notion goal templates.** These run top-down: vision → goals (with a target and a quarter) →
  projects → tasks, joined by relations, with rollups that compute progress. Sources:
  [Every on Marie Poulin's template](https://every.to/superorganizers/the-notion-template-behind-one-of-295426),
  [Notion team-goals guide](https://www.notion.com/guides/start-fresh-and-do-the-thing-how-to-actually-set-and-hit-team-goals-this).

### Task breakdown for overwhelm

- **Goblin.tools Magic ToDo.** You enter a task and pick a "spiciness" (how hard it *feels*), and AI
  generates steps. Every step can be broken down again, and all of them are editable. It's free and
  aimed at neurodivergent people. Sources: [Asana forum write-up](https://forum.asana.com/t/free-handy-ai-assisted-goblin-tools-breaks-down-tasks-and-more-designed-for-neurodivergent-people-and-useful-to-all/868466),
  [Warwick library guide](https://warwick.ac.uk/services/library/using/productivity-tools/magic-todo-gobin-tools),
  [Gigazine, 2025-03-26](https://gigazine.net/gsc_news/en/20250326-magic-todo).
- **GTD.**
  - Each project has a concrete *next physical action*.
  - The Natural Planning Model starts with purpose ("the 'why' of any project") and ends with next
    actions.
  - The Horizons of Focus rise like altitudes, from the runway (actions) to projects, areas, goals,
    vision and purpose. Allen is "carefully agnostic" about how anyone finds purpose.

  Sources: [Horizons of Focus (2018)](https://gettingthingsdone.com/2018/12/the-gtd-horizons-of-focus-for-determining-your-priorities/),
  [Natural Planning Model, ep. 285 (2024-11)](https://gettingthingsdone.com/2024/11/the-natural-planning-model/).
- **Inflow.** A CBT-based ADHD programme (with an open feasibility study). Its AI companion "Quinn" can
  break big projects into steps. Sources: [App Store](https://apps.apple.com/us/app/inflow-adhd-cbt-based-program/id1528183849),
  [PMC study](https://pmc.ncbi.nlm.nih.gov/articles/PMC9931323).
- **Carousels of one card per project.** A search for "one swipeable card per project, each showing
  its next action" found **no app that does it**. The nearest are SwipeTask and Now Todo, which swipe
  single *tasks*, and DoNext, which is next-action-only with no cards
  ([Now Todo](https://www.producthunt.com/products/now-todo), [DoNext](https://apps.apple.com/pg/app/donext-to-do-list/id1471853306)).
  The owner's swipe is novel in this space, so there's no prior art to copy and none to warn against.

### Outliners and knowledge tools

- **Workflowy.**
  - **Zoom:** clicking a bullet "zoom[s] in", and everything outside it disappears.
  - **Breadcrumbs:** "a path of breadcrumbs is created and shown in the menu bar". Each crumb can be
    clicked to zoom out to it, a long path collapses to "···" (hover to see it), and a house icon goes
    to the root.
  - **Flipping through siblings:** Ctrl/Alt+Shift+9/0 "flip through any set of sibling lists as if
    they were pages in a book", without zooming out.
  - **Mirrors:** live copies of one bullet in several places, with a "show mirror breadcrumbs" command
    that lists where each copy lives.

  Sources: [navigate around](https://beta.workflowy.com/help/navigate-around),
  [flipping through zoomed-in sibling lists](https://blog.workflowy.com/flipping-through-zoomed-in-sibling-lists/),
  [mirrors help](https://workflowy.com/help/mirrors).
- **Logseq / Roam.** Referenced blocks carry a breadcrumb that Logseq calls "context". Middle ancestors
  hide behind "Show more ancestors" (a feature request asks for the full path inline). Sources (forum
  posts): [breadcrumb paths request](https://discuss.logseq.com/t/option-to-show-full-block-paths-breadcrumbs-in-list-view-query-results-and-references/35220),
  [embed paths](https://discuss.logseq.com/t/can-logseq-track-embed-paths-like-roam-research/10116).
- **Heptabase.** Cards belong to a library, not to boards, so "you can also place it on both" boards.
  A card's Info lists every board it's on, and tapping one "open[s] the whiteboard and focus[es] on the
  location of the card". A right-sidebar location panel was added in 2024-11. On depth: "starting with
  the above two-layer whiteboard structure is typically sufficient … Avoid hastily adding third-layer
  sub-whiteboards." Sources: [nested whiteboard](https://wiki.heptabase.com/nested-whiteboard),
  [organize knowledge & projects](https://wiki.heptabase.com/organize-knowledge-and-projects),
  [newsletter 2024-11-29](https://wiki.heptabase.com/newsletters/2024-11-29).
- **Tana.** Supertags carry fields (#task with a Project field). Live searches using PARENT/GRANDPARENT
  collect a project's tasks. It's configurable, and it's powerful only once you've built the schema.
  Sources: [supertags](https://tana.inc/docs/supertags), [live search (marked outdated)](https://help.tana.inc/live-search.html).
- **Capacities.** Typed objects, and "referencing a project creates a two-way link automatically", so
  backlinks are derived rather than filed. Source: [PARA in Capacities](https://docs.capacities.io/reference/use-cases/para-in-capacities).

### Values methods (ACT and goal psychology)

- **ACT Matrix (Polk).**
  - The horizontal axis runs from *away* (from unwanted inner experience) to *toward* (who or what is
    important).
  - The **bottom-right** quadrant asks "who or what is important to me?" and is usually filled in
    **first**.
  - The **top-right** holds "toward moves": "actions I engage in to move toward who or what is
    important to me, **even when these actions don't work out**."

  Sources: [ACBS: ACT Matrix](https://contextualscience.org/act_matrix),
  [Matrix cards PDF](https://contextualscience.org/files/38.%20ACT%20made%20simpler,%20easier%20and%20effective%20-%20Six%20steps%20to%20psychological%20flexibility%20with%20the%20ACT%20Matrix%20-%20Matrix%20Cards.pdf).
- **Choice Point 2.0 (Harris, 2017/2018).** Towards and away moves "are always from the client's
  perspective, not the therapist's". Harris credits Lundgren's Bull's-eye as the first ACT tool to
  bring in towards and away. Sources: [Choice Point 2.0 overview, Oct 2018](https://www.actmindfully.com.au/wp-content/uploads/2018/10/Choice-Point-2.0-An-Overview-Russ-Harris-Updated-October-2018.pdf),
  [Choice Point for values & goals, 2017](https://www.actmindfully.com.au/upimages/Choice_Point_2.0_-__Values_and_Goals_-_Russ_Harris_2017.pdf).
- **Bull's-eye (Lundgren; Harris adaptation).** Four life domains. You mark an X, and "the closer the
  'x' is to the centre … the more you are living fully by your values". You also rate each area 0–10
  on how well you're living by your values right now. Sources: [Drexel handout](https://drexel.edu/~/media/Files/studentlife/counseling/Bulls%20Eye%20Values%20Exercise.ashx?la=en),
  [Harris worksheets 2018](https://www.actmindfully.com.au/wp-content/uploads/2018/06/2018_COMPLETE_WORKSHEETS_FOR_RUSS_HARRIS_BOOKS.pdf).
- **Values vs goals (Harris).**
  - Values are an ongoing direction, like a compass, and goals are places along the way. The compass
    wording comes from a secondary source attributing it to *The Confidence Gap*.
  - His goal worksheet asks for a graduated series, "starting from tiny simple goals", the smallest
    being "something small, simple, easy, I can do in the next 24 hours".

  Sources: [Harris worksheets 2018](https://www.actmindfully.com.au/wp-content/uploads/2018/06/2018_COMPLETE_WORKSHEETS_FOR_RUSS_HARRIS_BOOKS.pdf),
  [Providence goal-setting worksheet](https://providence.org/-/media/project/psjh/providence/or/files/act-group-handouts/goal-setting-worksheet.pdf).
- **Goal hierarchy (Duckworth, *Grit*).** "A well-organized and aligned **pyramid** of goals": low-level
  goals serve mid-level goals, which serve one top-level "ultimate concern" (summaries call it a
  compass). **Her apex is the why, the opposite of the owner's "base = the pursuit".** Sources:
  [Freakonomics "goal hierarchy" transcript](https://freakonomics.com/podcast/goal-hierarchy/),
  [Duckworth & Gross 2014](https://scottbarrykaufman.com/wp-content/uploads/2015/03/Current-Directions-in-Psychological-Science-2014-Duckworth-319-25.pdf).
- **Habit stacking (Clear, after S.J. Scott).** "After/Before [CURRENT HABIT], I will [NEW HABIT]." The
  existing habit is called the **anchor**, and the stack is a *sequence in time*. Source:
  [jamesclear.com/habit-stacking](https://jamesclear.com/habit-stacking).

---

## Tooling options

None needed for the ideas in this slice. Everything below is presentation over today's data (wanders,
derived doing → to links, the D-5 step stack once P-19 lands). Swipe and pager components, gesture
libraries and Expo support for them belong to the mobile-interaction scout. One note for that scout:
Workflowy's sibling flip is **keyboard-first** (Ctrl/Alt+Shift+9/0), which is a reminder that the
swipe needs a non-gesture twin on web and for switch users.

---

## Borrowable ideas

Best first. "Big" uses [briefs/README](../../docs/product/briefs/README.md): a new screen or
navigation entry, a stored field, a capture change, anything near a DESIGN.md rule, a native
dependency, or size L.

### 1. Anchor = zoom, with the base as a breadcrumb trail (Workflowy zoom + breadcrumbs; Logseq "context")
- **What:** pick any wander as the anchor and the view shows only its subtree, with the trail back
  to where you came from at the base ("feel productive › make apparel"). Each crumb re-anchors, long
  trails collapse to "…", and "All" returns to the whole of Home. This is the Workflowy zoom
  ([help](https://beta.workflowy.com/help/navigate-around)).
- **Why here:** it's the owner's "pick any node as an anchor … see my visual hierarchy, give me the
  context on which I'm working". The base is literally the breadcrumb.
- **Verdict: fits if changed.** Links are derived and many-to-many, so there's no single stored
  parent. The trail must be **the path you navigated**, not a stored hierarchy. No counts appear on
  crumbs. Like OmniFocus's Focus, it's a temporary lens: not remembered, and it clears when you leave
  Home, because pinning is on the roadmap's *cut* list. This is B-06 option C's lens, made navigable.
- **Size:** M. **Big: yes** (a new way of navigating Home, close to the P-34 Home rule).

### 2. Flip between sibling subtrees, each showing its current top (Workflowy's "pages in a book")
- **What:** inside an anchor, each child pursuit is one page. Its face shows the child's name, its
  top staged step ("current engagement") and "You left off". Moving left or right flips to the next
  sibling, and the base stays put. Workflowy does the same with keys
  ([blog](https://blog.workflowy.com/flipping-through-zoomed-in-sibling-lists/)). No task app was found
  that does it as a swipeable card per project, so this is new ground.
- **Why here:** it's the owner's exact ask ("swipe between them and see what the current engagement is
  for each"). It also gives the Dabbler and the Returner one calm card at a time, which echoes Tiimo's
  "one task at a time reduces overwhelm" (a vendor claim).
- **Verdict: fits if changed.**
  - **No pager dots or "2 of 5"**, because dots are a count. Show the neighbours' names instead
    ("‹ draw · read ›").
  - Order the pages the way the graph does (declared, then warmth), never by "most behind".
  - Every swipe has a button and keyboard twin, the page change is announced ("make apparel, next
    step: buy fabric"), and it's instant under Reduce Motion.
  - A sibling with no staged step shows "You left off", not a blank "+ next step" (B-06 refinement 1).
- **Size:** M. **Big: yes** (a new Home interaction).

### 3. Only the top is live; the rest is shown on request (OmniFocus "first available"; Structured inline reveal)
- **What:**
  - In OmniFocus, only the first action of a sequential project is available, and the rest are
    blocked and hidden in the Available view
    ([glossary](https://support.omnigroup.com/documentation/omnifocus/universal/4.8/en/glossary)).
  - In Structured, a small button reveals a task's subtasks inline, without opening an editor.
- **Why here:** it confirms D-5 (only the top is loggable) with a mature precedent, and gives a
  pattern for "see the stack" without turning it into a checklist. The page shows the top plus one
  "toward …" line, and "show the rest" opens the stack in place, read-only.
- **The key difference to keep:** OmniFocus's order is planned *forward*. Wanderment's stack grows
  *backward* from the why, one step at a time, which is what keeps it out of "no plans for the how".
- **Verdict: fits** (already decided, and this is the presentation). **Size:** S. **Big: no** (within
  B-02/B-06).

### 4. The why sits under the step, in words, always (Marvin's motivation-over-task; Sunsama's target icon)
- **What:**
  - Marvin shows, on hover, which goal a task serves and "one of the motivations … above the task"
    ([help](https://help.amazingmarvin.com/en/articles/5015479-goals-objectives)).
  - Sunsama marks aligned tasks with a purple target
    ([help](https://help.sunsama.com/docs/weekly-objectives)).
- **Why here:** it's the "keep the why in view" half of the brief. A step card should never appear
  without its base.
- **Verdict: fits if changed.** Use visible text, not hover (hover doesn't exist on touch and fails
  persona F): the base's name as the card's floor and "toward …" under the step. An icon is optional
  and decorative only. Marvin's **progress** part doesn't fit (the never list). A separate free-text
  "motivation" field also **doesn't fit for now**: D-8 decided "no 'because…' for now".
- **Size:** S. **Big: no.**

### 5. One pursuit, several whys: the card says "also toward …" and links there (Intend's "1,3"; Heptabase's "appears on"; Workflowy mirror breadcrumbs)
- **What:**
  - Intend lets one intention serve several goals.
  - Heptabase lists every board a card sits on, and a tap opens that board focused on the card.
  - Workflowy shows where each mirror lives.
- **Why here:** with any node as an anchor, a wander that feeds two whys belongs in both anchors'
  subtrees. Showing it in each is natural because the view is scoped. B-06's panels disliked the
  duplicate only in an all-at-once list (option B). One quiet "also toward *make apparel*" line that
  re-anchors keeps the second why visible without a second card.
- **Verdict: fits if changed.** Derive it from logged doing → to links (never store it), show no
  count, and list the names only, one line at most, then "…".
- **Size:** S–M. **Big: no** if it lands inside B-06's slices, yes if it ships alone.

### 6. "Toward" is judged by intent, not outcome (ACT Matrix; Choice Point)
- **What:**
  - Toward moves are actions toward what matters "even when these actions don't work out".
  - Towards/away is "always from the client's perspective"
    ([Matrix](https://contextualscience.org/act_matrix), [Choice Point 2.0](https://www.actmindfully.com.au/wp-content/uploads/2018/10/Choice-Point-2.0-An-Overview-Russ-Harris-Updated-October-2018.pdf)).
- **Why here:** it's a clinical basis for Wanderment's shame-free logging. Popping the top step means
  "I moved toward this", not "I completed this". It also supports filling the base first (the Matrix
  starts bottom-right), which B-05's name → step order already does.
- **Verdict: fits** as copy and principle: the toast says "toward …", never "done" or "completed".
  The **away** half doesn't fit, because labelling a log "away" judges it.
- **Size:** S. **Big: no.**

### 7. The smallest step, worded as "something small" (Harris's graduated goals; Goblin's spiciness)
- **What:**
  - Harris's worksheet starts from the tiniest goal, "something small, simple, easy, I can do in the
    next 24 hours".
  - Goblin.tools asks how hard a task *feels* and makes the steps that much smaller.
- **Why here:** the moment to stack a step is when the top feels too big. That's a felt cue, not a
  planning session. The hint on "+ a step toward this" can say "something small, whenever", and a
  top that's been sitting can offer "smaller?" (the same action, worded for overwhelm).
- **Verdict: fits if changed.** Drop the "24 hours" (a deadline). The person types the step, one per
  tap (B-02 refinement 3). **AI breakdown doesn't fit**: Goblin, Tiimo, Llama, Inflow and Structured
  all generate a list of steps ahead of time, which breaks "no plans for the how" and "nothing created
  without a tap", and it would need a model that isn't on-device and offline.
- **Size:** S (copy). **Big: no.**

### 8. Promote a step to its own pursuit from where it's aligned (Sunsama "Turn this into an objective", 2022)
- **What:** promote a task to an objective from the same `R` alignment menu
  ([changelog](https://roadmap.sunsama.com/changelog/create-objective-from-a-task)).
- **Why here:** it's B-02 slice 2 ("make this a wander"). Sunsama's lesson is placement: the promote
  action lives in the same place you see what the step is toward. On a stack card, the top's ✎ menu
  offers it.
- **Verdict: fits** (already planned). **Size:** S. **Big: no** (it's inside the approved B-02).

### 9. Keep subtree depth shallow by default (Heptabase "two layers"; Logseq hidden ancestors)
- **What:** Heptabase advises starting with two layers and "avoid hastily adding third-layer"
  boards. Logseq hides middle ancestors behind "show more".
- **Why here:** a page shows the base, the child, and the child's top step, nothing deeper. To go
  deeper you re-anchor (idea 1), so the page never becomes a tree to scan.
- **Verdict: fits.** **Size:** S. **Big: no.**

### 10. A return without a backlog (Intend's fresh daily list; Tiimo's "paused")
- **What:**
  - Intend avoids a growing pile of unfinished items by starting each day fresh.
  - Tiimo's "Right now" now says what's "ongoing or paused" rather than overdue.
- **Why here:** after weeks away, every sibling page should greet you with "You left off" and its
  top, with no age-shaming and no "stalled" badge.
- **Verdict:**
  - **Fits** as wording: say "resting" or "you left off", never "stalled" or "overdue".
  - **Doesn't fit:**
    - Intend's *automatic* daily reset and Sunsama's *auto-archive* would remove a staged step without
      a tap (nothing applied silently; B-02 refused auto-expiring steps). The person's own "Let these
      go", with Undo, already covers a fresh start.
    - Marvin's "alerts" for projects with no next step, and GTD-style "stalled" flags: notifications
      and counting absence.
- **Size:** S. **Big: no.**

### 11. A home-screen glance at the current top (Tiimo's "Right now" widget)
- **What:** the widget shows the current or paused activity and its subtasks
  ([Tiimo](https://tiimoapp.com/resource-hub/new-ios-widgets)).
- **Why here:** "Capture anywhere", and the owner's "see what the current engagement is" without
  opening the app.
- **Verdict: fits if changed.** No timer or countdown, and no checking off from the widget (a tap
  opens the log box loaded, as crumbs do). It's already on Later ("home-screen widget") and needs a
  product decision.
- **Size:** L. **Big: yes** (native code, needs D-3 native builds).

### Doesn't fit (kept so they aren't re-proposed)
- **Progress pies and rollups** (Things, Notion, Lunatask, Marvin, Asana): % complete, from the never
  list.
- **Bull's-eye distance from the centre, and 0–10 "living by values" ratings:** a score of how far
  off you are, which counts failure (persona C).
- **Must / Should / Want tags** (Lunatask): sorting by obligation turns pursuits into "shoulds"
  (persona A's fear), and it's a stored field with no why in it.
- **Weekly-resetting objectives** (Sunsama), and goals with quarters or targets (Notion templates):
  schedules and targets, against "no plans for the how". Whys fade by inactivity, not by calendar.
- **Goals required before anything else** (Intend gates the app on two goals): capture is sacred, and
  the why can be earned.
- **Habit stacking's "After I X, I will Y":** a timed routine sequence that lives in streak culture. It
  also **collides with the owner's words**: there, "anchor" is a cue in time and "stack" is an order of
  habits.
- **Timers, chimes and confetti on finishing** (Llama Life, Tiimo): timers and gamification.
- **Gating the step to a goal behind a separate tab** (Todoist Goals): this is an inference, not
  Todoist's stated reason, which was "not simple and powerful enough". It argues for keeping the why
  *on* the step card rather than in a destination. Todoist's deletion of users' goals on retirement is
  the opposite of the Trust theme: whatever happens to the stack design later, stored steps must
  survive it, as B-02's export round-trip already requires.

---

## Open questions for the owner

1. **Which way up?** You described the base (the pursuit) at the bottom and the next step on top,
   like a stack. Duckworth's goal "pyramid" and GTD's horizons put the why at the **top** (altitude),
   with actions as the wide base. Both are defensible. There's also a practical one: on Home the log
   box is at the bottom, so a stack's top (the step you'd log) sits farthest from where you log it.
   Keep the literal stack, flip it (step at the bottom, next to the log box, with the why above it,
   like the ACT Matrix's "toward moves" above "what matters"), or let the mockups decide?
2. **What counts as a "child" of an anchor?** Links are derived from logs, so a wander's children are
   the wanders that have flowed into it. Is the anchor's own staged-step stack (D-5) also one of the
   pages you swipe through ("its own"), or does it sit on the base?
3. **Swipe order and indicator:** order the pages by the graph's order (declared, then warmth), and
   show neighbour names instead of dots, since dots are a count. OK?
4. **Should an anchor be remembered** between visits? Pinning is on the roadmap's cut list, and the
   B-06 panel wanted the lens forgotten when you leave Home. "Remember my last anchor" would reopen
   that.
5. **Wording for "anchor" on screen.** Habit stacking already uses "anchor" for a time cue. Is "from
   here", or just the pursuit's name as a heading, enough on screen, with "anchor" kept as an internal
   word?
6. **Popping the top:** after a log clears the top, the step beneath rises. B-02's panel warned that
   "done one, here's another" in one beat stings the Returner. Should the risen step appear quietly
   (no accent and no focus move until you look), as B-06 refinement 2 does for "what's next?"?
7. **"Also toward …" (idea 5):** show the other whys a pursuit feeds, as links that re-anchor, or keep
   each page to the current anchor only?
