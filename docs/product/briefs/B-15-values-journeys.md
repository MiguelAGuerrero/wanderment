# B-15 — Values, routines inside routines, and for each: the journeys

**Status:** for the owner · **Date:** 2026-11-26 · **Items:** P-96 (values), P-97 (routines inside
routines and for each) · **Replaces:** the PNG mock-ups in `.polish/product/p96-mock/` (kept, but too
small to read)

This is the feature under development, written as the journeys a person takes, with each screen drawn
in text. Rules come after the journeys. Everything here follows B-14 and the owner's notes of 2026-11-26.

The example throughout is the owner's routine:

```
Drawing practice
  Select the subject matter
  Find three reference photos
  For each reference photo, spend 3 minutes drawing it out
  ── Repeat from here ──
  Rank your drawings
  Justify your rankings and pick one point of improvement
  For each of the three drawings, perform the same sketch, but focus on that one point
```

and a second routine, **Sketch**, that the owner wants to reuse instead of writing it out each time:

```
Sketch
  Set a timer for 3 minutes
  Draw {reference}, big shapes first
  Stop when the timer ends
```

How to read the screens: `[Button]` is a button, `[[Button]]` the one filled button, `{photo}` a
name chip, **bold** a value filled in, `···` a row's menu, `⠿` a drag handle.

---

## Journey 1 — A step gives a value (Plan)

The person wants "Select the subject matter" to remember what they selected.

1. In Plan, they open the step's `···` menu and choose **Gives…**.
2. A sheet asks for one thing: the name.

```
┌──────────────────────────────────────┐
│ Select the subject matter            │
│                                      │
│ Gives                                │
│ ┌──────────────────────────────────┐ │
│ │ subject                          │ │  ← suggested from the step's words; editable
│ └──────────────────────────────────┘ │
│ [[ Gives subject ]]                  │
│ [ Close ]                            │
└──────────────────────────────────────┘
```

3. The row now reads:

```
⠿  Select the subject matter                    ···
   gives {subject}
```

**Undo** is offered. Nothing else changes.

## Journey 2 — A later step uses it (Plan)

1. They tap "Find three reference photos" to change its words.
2. While typing, a bar sits above the keyboard with the names given above this step:

```
│ Find three reference photos of {subject}|     │
├───────────────────────────────────────────────┤
│ [ {subject} ]                                 │  ← tap inserts it at the cursor
└───────────────────────────────────────────────┘
```

While typing, the words show plain `{subject}`; when they finish, it becomes a chip:

```
⠿  Find three reference photos of {subject}     ···
```

A step can only offer names given above it, so a name can never point at nothing. Typing braces by
hand works too.

## Journey 3 — Running it: giving, reading, coming back

**Giving.** The runner reaches the step that gives a value. Under the words is a field labelled with
the name:

```
 Drawing practice                        [Done]
┌───────────────────────────────────────┐
│ Select the subject matter              │
│                                        │
│ {subject}                              │
│ ┌────────────────────────────────────┐ │
│ │ figures in motion                  │ │
│ └────────────────────────────────────┘ │
└───────────────────────────────────────┘
   [❚❚]          [ Plan ]
   [[              Next →              ]]
```

Next moves on, filled or not.

**Reading.** On a later step, the value appears in place, and a row above the note says what is in play:

```
 Drawing practice                        [Done]
 {subject}: figures in motion
┌───────────────────────────────────────┐
│ Find three reference photos of         │
│ **figures in motion**                  │
└───────────────────────────────────────┘
```

**Coming back.** They press Pause and go to cook. Pause takes them home; the paused run is first:

```
┌─────────────────────────────┐
│ Drawing practice             │
│ ❚❚ at Find three reference   │
│    photos of **figures in    │
│    motion**                  │
│ [[ Resume ]]   [ Plan ]      │
└─────────────────────────────┘
```

Opening the app later shows the same. The context that was missing in the first real use (friction 1)
is the value in the line.

## Journey 4 — Where did this come from, and changing it

Tapping the `{subject}` row above the note opens:

```
┌──────────────────────────────────────┐
│ {subject}                            │
│ ┌──────────────────────────────────┐ │
│ │ figures in motion                │ │
│ └──────────────────────────────────┘ │
│ from Select the subject matter       │
│ today 9:02                           │
│ read by Find three reference photos  │
│ [ Close ]                            │
└──────────────────────────────────────┘
```

Changing the words and closing keeps the change, with **Undo**.

## Journey 5 — A step that is another routine (Plan) *(new, the owner's request)*

The person does not want to write out the sketching steps every time; they have **Sketch**.

1. In Plan, they type in **Add a step**. Typing "sk" shows matching routines first:

```
│ + sk|                                          │
├────────────────────────────────────────────────┤
│ Sketch                     routine              │  ← tap: adds Sketch as a step
│ Add "sk" as a step                              │
└────────────────────────────────────────────────┘
```

2. Sketch is added as one row. It reads its own steps' names, so the row says what it needs:

```
⠿  Sketch                                        ···
   needs {reference}
```

3. If a name above has the same name, it is passed in by itself and the row says **with**:

```
⠿  Sketch                                        ···
   with {reference}
```

4. If not, the person taps **needs {reference}** and picks what fills it, from the names given above:

```
┌──────────────────────────────────────┐
│ Sketch needs reference               │
│                                      │
│ [ {subject} ]                        │
│ [ {photo} ]                          │
│ [ Ask when it runs ]                 │
│ [ Close ]                            │
└──────────────────────────────────────┘
```

Choosing `{photo}` makes the row read `with {photo} as reference`. Choosing **Ask when it runs**
leaves it `needs {reference}`, and Sketch's first step that reads it asks for it on the runner.

Sketch itself is unchanged; this is only how this step calls it. Editing Sketch (Plan on Sketch)
changes it everywhere it is used, as today.

**Running.** Reaching the Sketch row steps into it; the row above the note shows where the value came
from:

```
 Drawing practice › Sketch               [Done]
 {reference}: **the dancer** · from {photo}
┌───────────────────────────────────────┐
│ Draw **the dancer**, big shapes first  │
└───────────────────────────────────────┘
```

## Journey 6 — For each (Plan)

This replaces the sheet the owner could not read. A for each is a sentence, and the sheet only offers
whole sentences to tap.

1. On "Find three reference photos" (which gives `{photos}`), the steps that should repeat for each
   photo are the next ones. On the first of them, the menu offers **For each…**.
2. The sheet lists one ready-made sentence per name given above:

```
┌──────────────────────────────────────┐
│ For each…                            │
│                                      │
│ [ photo in {photos} ]                │
│ [ subject in {subject} ]             │
│ [ Close ]                            │
└──────────────────────────────────────┘
```

One tap and it is done. (The item's name, "photo", is the singular of the list's; it can be renamed
later from the block's menu.)

3. The step becomes a block; the steps inside are indented under it:

```
⠿  Find three reference photos of {subject}      ···
   gives {photos}
▌  For each photo in {photos}                    ···
▌  gives {drawings}
▌    ⠿  Sketch                                   ···
▌       with {photo} as reference
▌       gives {drawing}
```

Steps are moved into or out of the block by dragging, or **Move in** / **Move out** on their menu.

A value given inside the block (`{drawing}`) is collected for the steps after it (`{drawings}`).

## Journey 7 — For each (running)

**Giving the list.** Because a for each reads `{photos}`, the step that gives it shows one row per
photo instead of one field:

```
┌───────────────────────────────────────┐
│ Find three reference photos of         │
│ **figures in motion**                  │
│                                        │
│ {photos}                               │
│ ⠿ the dancer                        ×  │
│ ⠿ the boxer                         ×  │
│ ⠿ the cellist                       ×  │
│ + Add another                          │
└───────────────────────────────────────┘
```

Pasting "the dancer, the boxer, the cellist" into a row offers **Split into rows** / **Keep as one**.

**Inside the block.** The row above the note says where in the list they are:

```
 Drawing practice › For each photo       [Done]
 {photo} 2 of 3: the boxer
┌───────────────────────────────────────┐
│ Draw **the boxer**, big shapes first   │
└───────────────────────────────────────┘
```

**After the block:**

```
┌───────────────────────────────────────┐
│ Rank your **dancer sketch, boxer       │
│ sketch and cellist sketch**            │
└───────────────────────────────────────┘
```

## Journey 8 — Finishing

On the step whose Next would end the whole run, Next reads **Done**. Pressing it ends the run and goes
home, with a notice **Done with Drawing practice · Undo** in its own place (never over a row). It does
not open Plan. The `[Done]` at the top stays where it always is and means "finish this routine now".

---

## Rules

1. **One notation, `{name}`.** No types to choose. Every value is a list of text items; one item is the
   usual case. A plain step shows the items joined in words ("the dancer, the boxer and the cellist").
   A for each goes through them one by one. Neither can fail on any value.
2. **Names exist before they are used.** Plan only offers names given above (or that a routine needs).
   Renaming a name renames it in the steps that use it. Removing the step that gives a name turns its
   readers into **needs {name}** — they ask when run.
3. **A routine's needs are the names it reads but does not give.** At a call, each need is filled by the
   same name from above (automatic), by a name the person picks, or asked when it runs. The call row
   always says which: `with {x}`, `with {y} as x`, `needs {x}`.
4. **Values belong to this time through.** Starting again starts empty. A new round after "Repeat from
   here" clears the values given after the divider (including lists collected there).
5. **Waiting** (B-14) comes later: a value that will arrive later, and a run that waits for it.
6. Nothing in this explains itself in words on screen; the words on screen are the person's own, the
   names, and the verbs Gives, For each, with, needs, Done.

## Order of building

- **P-96:** journeys 1–4 and 8, values stored as lists from the start, home and runner changes from the
  MyStack friction list (no "Nothing running", no prompt, Pause goes home, Done ends the run).
- **P-97:** journeys 5–7 — adding a routine as a step in Plan, needs/with, for each and the list editor.

## Questions for the owner
1. Journey 5: is **needs** the right word on a call row that is missing a value (vs "asks")?
2. Journey 6: is making the first step to repeat into the block the right place to start ("For each…"
   on that step's menu), or would you rather start from the list ("For each photo…" on the step that
   gives `{photos}`, then choose which steps go inside)?
3. Rule 4: should a new round keep the subject (given before the divider) and clear the photos — as
   proposed — or keep everything until you change it?
