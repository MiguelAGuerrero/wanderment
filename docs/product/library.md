# The library: house style and sources (B-17 slice 4)

The library is read-only content that ships with the app: `src/domain/libraryContent.ts`, built into the export format
and read through the import check (`src/domain/library.ts`). `src/domain/library.test.ts` fails the build when a library
routine fails the import check or the rules below that a test can check.

## House style

Checked by the test:
1. **Verb-first names** that read after "Plan" and "Start" ("Recall before you look", "Learn ▢").
2. **One job:** a routine hands back at most two names, and each is one it gives.
3. **A plural list and its singular item** (`For each fault in {faults}`), as the app's own `itemNameFor` reads them.
4. **No counts or minutes** in any words: no digits, units of time or tallies.
5. **No kept list in a method.** Only a template keeps lists (its for each blocks' own lists).
6. **No wait step**, anywhere ("Conventions in, waits out", D-24).
7. Every call gives its routine only inputs that routine asks; every routine called is in the library.

Written to, not checked:
- *List* gives a list and *Name* or *State* give one short thing; *Write*, *Make*, *Redo* and *Read* happen in the
  person's own material and give nothing.
- A `gives` name says the product ({revised}, {trust}), never the moment. Inputs are named for a role ({work}).
- A long value goes last in a step, after a colon.
- Results inside a loop are collected by giving the outer list again; no step asks the person to act from memory.
- Steps are statements of work whose point does not depend on knowing the research.
- No more than three levels: a template calls a method, which calls the core.

## The catalogue and where each comes from

Each routine below is written from `docs/product/discovery/2026-11-27-standard-library.md`, "The library, in three
layers"; the research behind it is that file's research note named in the last column. **No source was opened by
discovery** (it says so); read the citations there before repeating any claim.

| Routine | Heading | Its line | Research note |
|---|---|---|---|
| Recall before you look | To learn | Fixing material in memory | S1 |
| Practise at the edge | To learn | Getting better at a skill | S4 |
| Review after doing | To learn | Learning from something you finished | S3 |
| Say what done is | To check your work | Deciding what finished looks like | survey (core) |
| Check and mend | To check your work | Finding and fixing where work falls short | S2 (core) |
| Keep the lesson | To check your work | Turning what happened into better steps | S2, S3 (core) |
| Try to break it | To check your work | Testing a plan or a belief against doubt | S10, S11 (core) |
| Weigh the options | To decide | Choosing between options fairly | S13 |
| Gather options | To decide | Widening the choices before you pick | S13 (core) |
| Choose | To decide | Picking on evidence, a test at a time | S13 (core) |
| Find how it fails | To decide | Seeing a plan’s weak points before you start | S10 |
| Argue the other side | To decide | Checking a belief against its opposite | S11 |
| Take the outside view | To decide | Forecasting from how things like it went | S12 |
| Check a source | To decide | Judging how far to trust what you read | S14 |
| Set a cue to start | To start | Making a start more likely | S8 |
| Learn ▢ | For a big aim | Learning a skill by practice, study and use | B1 (practitioner convention) |
| Find out ▢ | For a big aim | Researching a question, and what it raises | B2 |
| Make ▢ | For a big aim | Making something for someone, tried early | B3 (practitioner convention) |
| Make a decision | For a big aim | A decision that matters, checked from all sides | B4 (practitioner convention) |
| Work it out as you go | For a big aim | An aim with no clear path yet | survey |

Left out of this first library, though in the catalogue: Teach it plainly, Work through the errors, Explain each step,
Compare two cases, Make it startable, Try it more than one way (held to keep the library small); Test a guess (it has a
wait step).
