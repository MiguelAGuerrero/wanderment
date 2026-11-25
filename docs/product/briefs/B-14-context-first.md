# B-14 — Context first: a tree of threads, a run queue, and a way back in

**Status:** draft for the owner · **Date:** 2026-11-25 · **Decision:** D-22 · **Replaces:** B-13 (two drafts), P-94's flat queue

## What the owner said (owner-notes, 2026-11-25, newest four entries)
"We're not routine first, we're context first, hence context management … resume where I picked off and
quickly start myself back up with minimal effort … the UI might have to look like a tree … the ability to
[en]queue tasks from these threads, and finding the depth-first item to push up, without losing the
context of that item." The model is concurrency: "one main thread … sub-threads … each of those tasks
have their own context, their own state, and they often reference functions, which are repeatable
instructions that can be reused anywhere." The words pursuit, stack and queue are descriptions, not nouns.

## The model (structured concurrency)
```
main                                  the root thread; Home
  run queue                           what you've lined up; one runs at a time
  thread "Become a better drawer"     a thread: its own values and its own place
    values {medium: pencil}           visible to everything inside it (lexical scope)
    thread "Practise drawing"  ↻      a loop: each turn yields; ends when you break it
      call gesture(subject: hands)    a routine call: a function with parameters
    thread "Study colour"      ↻
    "Buy a sketchbook"                a one-off: one step
fn gesture(subject)                   a routine: static, reusable anywhere, edited only in Plan
```
- **A thread** holds children in order (one-offs, routine calls, threads), its values, and its place.
- **Its next item** is found depth-first: the first unfinished leaf inside it, following each child's own
  place. "Practise drawing" → its current call → that call's current step.
- **Done** returns: a one-off or a call leaves its parent; a loop's turn ends and the loop stays; a
  thread with children left asks first.
- **A routine** never changes because it was run. Its `{blanks}` are parameters; the call holds values.
- **One thing runs at a time.** Pause is yield; it keeps its place. Switching is yield, then resume.

## The screens
**1. The way back in (what the app opens on).** Not the note alone — the note with its context:
```
 Become a better drawer › Practise drawing ↻
 gesture · subject: hands
 last: Warm up for 2 minutes
 ┌──────────────────────────┐
 │ Draw 10 hands, 30 s each │
 └──────────────────────────┘
   Pause  ·  Plan  ·  Next
```
The path, the values in play, and the last step done. Three lines that answer "where was I, doing what,
for what" — the whole of friction 1.

**2. Home: the run queue over the tree.**
```
 Up next                                          ← the run queue
  1 Draw 10 hands…   Better drawer › Practise      [Resume]
  2 Chapter 3        Better drawer › Study colour
  3 Sketch the HUD   Make a game › UI
 ───────────────────────────────────────────────
 ▾ Become a better drawer       at Draw 10 hands  ← the tree; each row says where it stands
     ↻ Practise drawing           at Draw 10 hands      [↑ queue]
     ↻ Study colour               at Chapter 3          [↑ queue]
       Buy a sketchbook                                 [↑ queue]
 ▸ Make a game                  at Sketch the HUD
 ▸ Produce an EP                waiting for mix notes · since Tue
 + Add
```
- **The queue holds references.** Each entry is the depth-first next item of the thread it was taken
  from, shown with its own words and its path, so it never loses its context. Running it resumes that
  thread in place; finishing it returns it in the tree too.
- **↑ queue** on any row pushes that thread's next item to the end of the queue. Tapping a row's words
  opens the thread (its children, its values, Plan for a routine call).
- Rows collapse and expand (▸ ▾); the tree remembers what was open. Each collapsed row still shows where
  it stands inside.

**3. A thread** (opened from the tree): the path, its values (tap to change), its children in order with
where each stands, "+ Add" (words, a routine call, a thread), and ↑ queue on each child.

**4. Plan**: unchanged — for routines (functions) only.

## What this keeps and drops
- Keeps: the runner, Plan, routines, repeat loops (they become loop threads), waits, Undo, the P-93
  keyboard fixes, all stored data.
- Drops: the tile grid on Home; "the queue as Home" of P-94.
- Freezes until used: Jump to…, references of one thread in two places, history views.

## Slices (each a full batch; the owner's freeze holds until lifted)
1. **The way back in + parameters**: `{blanks}` in routine steps, values held by the run and shown on the
   note, the path and "last:" lines on the runner. Fixes friction 1 with today's data model plus one field.
2. **Threads that hold threads**: a thread with one-offs, routine calls and threads; depth-first next;
   Done returns; Home's tree. Existing runs read as threads under main at load; nothing converted.
3. **The run queue**: ↑ queue, Up next on Home, finishing a queued item returns it in the tree. Fixes
   friction 2.

## Questions
1. **Does ↑ queue on a thread push its next item only** (proposed — one bite), or the whole thread
   (it stays queued until you finish it)?
2. **When a queued item returns, does the thread's new next item join the queue by itself?** Proposed: no;
   you push again (the queue is your plan, not the tree's).
3. **Show "last:" (the last step done)** on the way back in — yes? It is the only trace of the past the
   app would show.

## Decision requested
**D-22:** Go on B-14, slice 1 first? **Go** / **Go, but change …** / **Not now (keep the freeze)**.
