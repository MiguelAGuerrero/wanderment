# References to work that lives elsewhere: an investigation (2026-11-27)

_Discovery for the owner's request of 2026-11-27 ("it would be nice and easy to … click and pull up where
I left off without having to try to remember exactly the specifics of where I put the Notion document or
that text file … or at least a place to park that … I don't want the app to instrument tooling to do
your work"). Curated by /product from one research report. While it was running the owner decided:
"Let's build the references, because I think that's a simple feature that would make sense." The brief
is [`../briefs/B-18-places.md`](../briefs/B-18-places.md)._

> **Verification caveat.** Expo's own documentation was opened and is marked verified. Everything about
> other products, and about what an installed iPhone web app does with a tapped link, is from search
> summaries or recall and is unverified. Whether a Notion or Google link opened from the installed web
> app lands in that app or in an in-app browser sheet has **not** been tested on a phone.

**The owner's answers before the research:** a reference belongs to "The routine itself"; the kinds of
place are all four ("Web links", "Files on my devices", "A place inside another app", "Physical
places"); the depth is "A named link that opens".

## 1. The pain point, restated

The owner's results and thinking live in other apps (Notion, text files, cloud folders). The app holds
where they are in a routine but not where the work is, so picking a routine back up costs a second act
of remembering.

Two different problems are in the owner's words, and they lead to different designs:

| | Supported by the owner's words | What it asks of a design |
|---|---|---|
| **"I forget it exists"** | Strongly: "this is more so a point of remembering that I originally had a document … I may have a Notion page for it and I don't remember that I did" | The reference has to be **seen without being looked for**, at the moment a routine is taken up. A list hidden behind a swipe does little. |
| **"I can't get there quickly"** | Also said: "click and pull up where I left off without having to try to remember exactly the specifics of where I put [it]" | One tap has to land in the right place. This depends on the platform (section 3). |

The owner ranks the first above the second ("more so"). A guess, not in the notes: how many places a
routine has (one or two, or ten), and whether "where I left off" means a page or a spot inside a page.

What the owner ruled out is clear and repeated: no reading, writing or syncing; no capture; "a place to
park that … as like some mediator".

## 2. What others do

### 2.1 The patterns

| Product | Where the reference lives | Added by | Shown as | On tap | What breaks / complaints | Source |
|---|---|---|---|---|---|---|
| **Linear** project Resources | On the project, in its own section of the overview | + then paste, Return | The label if given, **otherwise the link's domain** ("docs.google.com") | Opens the link | Nothing checks the link | search: [project overview](https://linear.app/docs/project-overview) |
| **Workona** | On the workspace, a Resources view with named sections ("Key Docs", "Research") | + button; a tab saved as a resource | Titled rows | Opens a tab | It grows into a second file system | search: [help/resources](https://workona.com/help/resources) |
| **Apple Reminders** | On the task: one URL field in Details | Typed or pasted; or made from another app, which adds a link back to the item | A link chip; an app icon for an in-app source | Opens the app or Safari | One URL per reminder; hidden until Details is opened (memory) | search: [Apple guide](https://support.apple.com/guide/reminders/remndc729e28), [MacRumors](https://www.macrumors.com/how-to/add-notes-urls-to-reminders-ios/) |
| **Things 3** | Anywhere the person types: title, notes, checklist items; projects have notes | Paste; on Mac, drag a file or email into a note | The address itself, made tappable | Opens it | Long addresses clutter notes; file links are Mac-only (memory) | search: [MacStories on 3.5](https://www.macstories.net/ios/things-3-5-brings-ui-refinements-tagging-and-automation-improvements-clipboard-integration/), [App Store story](https://apps.apple.com/ca/story/id1578939701) |
| **OmniFocus** | Task notes (links) and attachments | Paste; drag; other apps write their own item links (`x-devonthink-item://`) | Link text in the note | Opens the other app | Linked files do not travel to the phone; embedded ones bloat sync (memory) | search: [DEVONthink blog](https://www.devontechnologies.com/blog/usingdevonthinkwithomnifocus) |
| **Hookmark** (Mac) | Outside every app: a link pair between two things | "Copy Link" on whatever is in front, then "Hook to copied link" | Titled links in a context window | Opens the item in its app | Vendor says `hook://file/` survives a move where `file://` and aliases do not, and admits heuristic matching can open the wrong file | search (vendor claims): [hook://file](https://hookproductivity.com/help/integration/using-hookmark-with-files/) |
| **Obsidian** | The other app's own address for a note | Copied from Obsidian | `obsidian://open?vault=…&file=…` | Opens the note | Addressed by name or path, so a rename or move breaks it (memory) | search: [Obsidian URI](https://obsidian.md/help/uri) |
| **Notion** | "Copy link" gives an `https://` address | Copied | n/a | Desktop: a Notion setting decides browser or desktop app | Deleted or unshared pages; `notion://` is a third-party trick, not documented by Notion | search: [Notion for desktop](https://www.notion.com/help/notion-for-desktop), [T. Frank](https://thomasjfrank.com/how-to-share-notion-links-that-open-directly-in-the-app/) |
| Todoist, Bear, Raycast Quicklinks, Jira web links, browser tab groups, Finder aliases, read-later inboxes | | | | | | memory only; not checked today |

From memory, for the unchecked row: Todoist turns a pasted address into a titled link by fetching the
title (the owner has already refused network fetching); Bear's links carry a note ID and survive a
rename; Raycast Quicklinks are a name plus an address; tab groups hold the project as open tabs and are
lost with the browser; a read-later inbox holds links with no context, which is where they are forgotten.

### 2.2 What the patterns have in common

1. **Two homes.** Either the reference sits **on the project** in its own short section (Linear,
   Workona), or it is **an address inside the person's own text** that the app makes tappable (Things,
   OmniFocus). Reminders' single field sits between.
2. **Name first, host as fallback.** Linear shows the label, else the domain, and fetches nothing.
3. **Nobody verifies a link.** No product above checks that the target still exists.
4. **Stable addresses come from the other app.** Notion page links and Bear links carry an ID. File
   paths and name-based addresses rot. The holding app cannot fix this.

### 2.3 Research on re-finding

- People strongly prefer navigating to a known place over searching, and search is the last resort used
  when the place is forgotten (Bergman et al. 2008; a 2013 follow-up found search slower and more
  error-prone). **search**: [Open University record](https://cris.openu.ac.il/en/publications/improved-search-engines-and-navigation-preference-in-personal-inf-2/).
  A pointer kept at the routine is a navigation aid of exactly this kind.
- Jones, Bruce and Dumais's "Keeping Found Things Found" frames the problem as keeping, and measures it
  by whether the thing is re-found later. **search**: [Information Research 2004](https://informationr.net/ir/10-1/paper207.html).
- From **memory**, not checked today: Barreau and Nardi (1995, "Finding and reminding") and Malone (1983)
  found that where a thing is placed also serves to **remind** the person it exists; Bergman,
  Beyth-Marom and Nachmias (CHI 2006) named the **project fragmentation problem**: one project's
  material is split across stores by format, so no one place shows it. These map onto the owner's "I
  forget I made a document at all". The implication is that a reference helps with forgetting only if it
  is in view where the project is taken up.

## 3. What the platform can do

### 3.1 Today: the installed iPhone web app, and browser tabs

Checked in the code: `public/manifest.json` is `display: standalone`, scope `/wanderment/`. Nothing in
`src/` opens an outside link, detects an address or reads the clipboard. The person's text is drawn as
plain text (`NoteWords` in `src/components/go/Runner.tsx`; tiles in `GoHome.tsx`), and on the note it is
not selectable unless the note scrolls.

| Capability | iPhone, installed web app | Other browsers | Status |
|---|---|---|---|
| Open an `https://` link | Leaves the app's scope, so it opens in an **in-app Safari sheet** with a Done button (Apple, WWDC23, as reported) | New tab | search: [firt.dev](https://firt.dev/notes/pwa-ios/), [progressivewebapps.com](https://progressivewebapps.com/platforms/ios-safari/) |
| …landing in the other app (universal link: Notion, Google Docs) | **Unknown.** I found no source that says whether a tap in a standalone web app is handed to the installed app or stays in the sheet. If it stays in the sheet, the person may meet a sign-in page, since that sheet may not share Safari's sign-in. | Android Chrome hands verified links to the app (memory); desktop follows Notion's own setting | **unverified; needs a device test** |
| Custom schemes (`notion://`, `obsidian://`, `things:///`, `shortcuts://`) | **Unknown.** Old reports say they failed from a home-screen web app; nothing current found | Desktop browsers prompt "Open <app>?" (memory) | **unverified; needs a device test** |
| Know whether the other app is installed | No. `Linking.canOpenURL` "always returns true" on web | No | verified in docs ([Linking](https://docs.expo.dev/versions/v58.0.0/sdk/linking/)) |
| Hold a reference to a local file | **No.** iOS Safari has no file picker that returns a handle (caniuse lists `showOpenFilePicker` unsupported through 27.2; WebKit's position is opposed) | Chromium desktop: a handle can be stored in IndexedDB and permission kept since Chrome 122, but a handle only lets the web app **read the bytes**; it cannot open the file in its own app | search: [caniuse](https://caniuse.com/mdn-api_window_showopenfilepicker), [Chrome blog](https://developer.chrome.com/blog/persistent-permissions-for-the-file-system-access-api) |
| Receive a link from the share sheet | **No** (Web Share Target unsupported on iOS; WebKit bug open since 2019) | Android/Chromium installed apps: yes | search: [caniuse](https://caniuse.com/mdn-manifests_webapp_share_target), [WebKit 194593](https://bugs.webkit.org/show_bug.cgi?id=194593) |
| Paste | An ordinary text field works. Reading the clipboard from a button shows iOS's own "Paste" callout, which the person must tap; Expo's docs warn the async clipboard is unreliable on WebKit | Chromium prompts for permission | verified in docs ([Clipboard](https://docs.expo.dev/versions/v58.0.0/sdk/clipboard/)); search: [WebKit blog](https://webkit.org/?p=10855) |
| Drag a link in | Not on a phone | Desktop: a dropped link arrives as text (memory) | unverified |
| How to render the link | Expo Router's `Link` renders a real `<a>` on web, which is what a browser treats as a user's own navigation | same | verified in docs ([Linking into other apps](https://docs.expo.dev/linking/into-other-apps/)) |

**A probe that needs no change to the app:** a throwaway one-file page with six links (a Notion page, a
Google Doc, `notion://`, `obsidian://`, `shortcuts://`, a maps link), added to the iPhone home screen and
tapped once each. It answers the two "unknown" rows in five minutes. Everything about one-tap opening on
the phone hangs on that answer.

### 3.2 A future native build (ROADMAP D-3, not started)

| Need | Module (SDK 58) | Status | Cost |
|---|---|---|---|
| Open a link in its app | `expo-linking` (`~58.0.17`, already installed): `openURL` hands the address to the OS; `https` universal links and custom schemes both go to the owning app | verified in docs | None beyond D-3 |
| In-app browser | `expo-web-browser` (installed) opens `SFSafariViewController` / Custom Tabs. Not wanted here: it keeps the person out of the other app | verified in docs | n/a |
| Ask "is that app installed?" | `canOpenURL` needs each scheme listed in `LSApplicationQueriesSchemes` and a development build | verified in docs | Not worth it; just open |
| Receive a share | `expo-sharing` incoming shares: config plugin, `useIncomingShare()`, URL and text supported. **Marked experimental**; on iOS it opens the main app from the share extension, which Apple does not support | verified in docs ([Sharing](https://docs.expo.dev/versions/v58.0.0/sdk/sharing/)) | New binary; an app group and extension target; M, with risk |
| Paste without a prompt | `expo-clipboard` `ClipboardPasteButton` (iOS 16+) | verified in docs | Not installed; S |
| Pick a file | `expo-document-picker` (`~58.0.5`) or `File.pickFileAsync`. Both give a **copy** on iOS ("a temporary copy of the file leaving the original file untouched") | verified in docs ([DocumentPicker](https://docs.expo.dev/versions/v58.0.0/sdk/document-picker/), [FileSystem](https://docs.expo.dev/versions/v58.0.0/sdk/filesystem/)) | S, but it does not give a reference |
| Keep a durable reference to the original file | **Nothing documented** in SDK 58: no security-scoped bookmark API, and nothing says Android URI permissions persist | verified absent from those two pages | A custom native module; **L**; a new native dependency |

### 3.3 The owner's four kinds, plainly

| Kind | Installed iPhone web app, today | Native build | Cannot be done |
|---|---|---|---|
| **Web links** | Yes, it opens. Whether it lands in the other app or in a sheet is the untested question | Yes, in the other app | |
| **A place inside another app** | Yes when that app gives an `https` link (Notion, Google Docs, Figma: the same case as above). Through a custom scheme: untested | Yes | Knowing whether the target still exists |
| **Files on my devices** | Only as **words** ("iCloud › Game › design.psd"), or as a cloud link if the file has one, or as the other app's own address (`obsidian://`) | Still hard: a custom native module | A web app opening a local file in its own app, on any platform |
| **Physical places** | **Words** ("blue sketchbook, second shelf"). A maps address is a web link | Same | |

So a reference has to be allowed to be **a name and words with nothing to open**. Two of the four kinds
are that on every platform.

## 4. Where a reference could live: five options

### (a) Addresses in the person's existing words become openable. No new model.

A step's words belong to the routine, so "Open the design doc https://notion.so/…" is already a standing
reference. A value or a pause note can carry one for a single run.

The catch, found in the code: nearly everywhere the person's text shows, it is already inside a button
(the note opens the panel; a tile's body is Resume; a values-row target opens the value sheet). A link
inside a button is not workable. So the address is offered as its own row where there is room:

```
PULL-UP PANEL                              VALUE SHEET
  then: Rank your drawings                   { } design doc
  ───────────────────────────                [ https://notion.so/Game-9f2c…      ]
  ↗ Open notion.so                           ↗ Open notion.so
  Back to Find three photos                  from Select the project · today
  Jump to…                                   [ Keep ]   Close
```

- Four kinds: web links and in-app addresses open; a file or a physical place is words, as today.
- **Verdict: fits if changed.** A long address on the sticky note fights "The note always fits", and
  showing it shortened fights "The person's words are never clipped". It also does not answer "I forget
  it exists": the panel is behind a swipe.
- **Size S–M. Not big** (display only; no stored field). Light tier.

### (b) Named references kept on the routine. Tags' sibling.

The closest precedent is not the kept list but **tags** (P-97): the routine's own words, kept in its
body, edited in a sheet from Plan's ··· and a My routines row's ···, one Plan edit with one Undo.

```
PLAN                                       SHEET "Places"
  ⌂ Home  PLAN                               Name   [ Design doc            ]
  Make a game                                Where  [ https://notion.so/…   ]
  #game #design                              ─────────────────────────────
  ↗ Design doc   ↗ Art board                 ↗ Design doc      notion.so   ×
  Sketchbook: blue, second shelf             Sketchbook        blue, second shelf  ×
  at Block out the level                     [ Keep ]   Close

HOME TILE                                  PULL-UP PANEL
  Make a game                                ↗ Design doc
  at Block out the level                     ↗ Art board
  Resume   Plan   ↗   ···                    Sketchbook: blue, second shelf
```

- Four kinds: an entry is a name and a "where". If "where" is an address it opens; otherwise both are
  shown as words and nothing is tappable. No error for "not a link".
- This is the option that matches all three of the owner's answers (the routine; named; opens).
- **Verdict: fits if changed.** (1) On the tile, one door (↗) opening a small anchored menu of names, not
  a row of links, or the tile becomes a dashboard. (2) "The runner is the step and nothing else": the
  panel, not the runner's face. (3) It needs a word and a mark of their own ("One vocabulary … one mark
  per meaning"); "Places" above is a placeholder, the owner's to choose.
- **Size M. Big**: a stored field, the export and import format, the import preview. Full tier.

### (c) A reference as a kept list item (B-16). An existing construct.

B-16's kept list already belongs to the routine across runs, with + Add in Plan and on the tile. A list
item that is an address would be openable wherever values are shown, and a step could read it by name:

```
PLAN                                       RUNNER
  Make a game                                Make a game
  places:  Design doc · Art board   + Add    { } place: Design doc
  For each {place} …                         ┌──────────────────────┐
  Review [Design doc] before you start       │ Review Design doc    │
                                             │ before you start     │
                                             └──────────────────────┘
```

- Four kinds: as (b); an item is words, or words with an address.
- **Verdict: fits if changed, and not yet.** A kept list exists to be run over by a for each; a list
  nothing runs over bends the construct. It also depends on P-108, which is not built. Its real strength
  is different: the reference appears **in the step that needs it**, which is the strongest answer to "I
  forget it exists".
- **Size M on top of P-108. Big.**

### (d) Nothing in the app: where it lives, in words.

The discipline, as B-16 did before building: the first step of a routine says where the work is ("Open
Notion › Projects › Game › Design"), or one Notion page per pursuit lists everything and the step names
that page.

- Four kinds: all four, as words. Nothing opens.
- **Verdict: fits** as it stands. Size none. It is also the control for the test in section 6: if words
  are enough, the rest is unnecessary.

### (e) A reference per run, as a value.

When a routine is a method used across projects ("Iterate on a product feature"), the document differs
each run. That is a value ("Select the project doc · gives {doc}") made openable by (a). The owner did
not choose this; it is listed because a routine that is "a function" (owner, 2026-11-25) has no one
standing document.

- **Verdict: fits**, as part of (a). No extra size.

### Not fitting (kept so they are not re-proposed)

- Fetching a title, preview or site icon: network; already refused. Use the name, else the host in words.
- Checking that a link still works: network.
- A link written in a syntax (`[name](url)`): the owner already found typed notation undiscoverable.
- Any "is the app installed?" logic: not available on web.

## 5. Tensions to weigh

- **"Values belong to the run, never the routine."** (b) is not a value. It sits with tags, which already
  belong to the routine, so the rule is untouched. (c) leans on the kept-list exception.
- **A routine is a function.** A standing reference fits a long-lived routine ("Make a game"). It fits a
  reusable method badly: every caller would see the same document. Which routine does a reference show
  on when one is called inside another: the outermost, or each level on the path?
- **Seen versus minimal.** The owner's main problem is forgetting the document exists. That argues for
  the tile and Plan's heading. Minimalism and "the runner is the step" argue for the panel. These pull
  apart, and the panel alone probably does not solve the stated problem.
- **Capture.** A "where" field that takes any words is one step from a notes field. Two short lines
  (name, where), and no paragraph, keeps it a pointer.
- **Link rot and moved files.** No product checks. A dead reference is worse than none, because it is
  trusted. The honest position: the app opens what it was given and says nothing if it fails.
- **Export and import.** References must travel in the backup. Some links are keys: a Notion or Google
  "anyone with the link" address grants access to whoever holds the file. The backup already holds the
  person's words; this raises its sensitivity.
- **A safety point that is not optional.** Import brings in text the person did not type on this device.
  On the web, an address such as `javascript:` or `data:` opened from the app would run inside the app
  and could read all its data. Any option, (a) included, must open only `http(s)` and ordinary app
  schemes and refuse the rest silently.
- **Privacy on tap.** The link should carry no referrer and be opened only by the person's tap, never
  prefetched.
- **"No explanatory text."** The sheet needs only its two labels. The open question is the word for the
  thing itself.
- **The other device.** A reference added on the desktop to a desktop file means nothing on the phone,
  and the data does not sync between them anyway.

## 6. What the owner's test could observe first

Each time they go looking for where something was, one line in their own notes:

1. What was it, and in which app or place?
2. **Had they forgotten it existed, or only where it was?**
3. When did the need arise: starting a routine, resuming, at a particular step, or after the sitting?
4. How did they find it, and about how long did it take?
5. Would a page link have been enough, or was "where I left off" a spot inside the page?
6. Is it the same place every run of that routine, or a different one each time?
7. Which device were they on, and does the thing exist on that device?

And two trials that need no build: option (d) on one real routine for the length of the test, and the
five-minute link probe in section 3.1.

## 7. Open questions for the owner

1. Is the main problem forgetting the document exists, or reaching it? (The notes suggest the first.)
2. How many places does a typical routine have?
3. Standing per routine, or different per run for routines used across projects?
4. When a routine with references is called inside another, where should they show?
5. Is it acceptable that a file on the device and a physical place are words only, on every platform?
6. Should a reference be visible on the home tile, or is Plan and the panel enough?
7. What is the thing called, and does it get a mark?
8. Are links in a backup file acceptable as they are?

## 8. A view (not a recommendation to build)

**Most promising: (b)**, built as tags' sibling. It is the only option that matches the owner's three
answers, it handles all four kinds because "where" may be plain words, and it reuses an editing pattern
the app already has. It is big, so it would need a brief.

**Smallest honest first step:** nothing in the app. Run (d) during the test, do the link probe, and keep
the seven-line log. If something is then built, the smallest thing is the "Open" row of (a), which is
Light tier and puts the platform question into real use before any stored field is committed.

**What would change this view:**
- The probe shows a Notion link from the installed web app lands in a sheet with a sign-in page, and
  custom schemes fail: one-tap opening is not real on the phone until a native build, and (d) is the
  honest answer until then.
- The log shows the place differs per run: (e) and (a), not (b).
- The log shows "forgot it existed" nearly every time: placement matters more than opening, and (c)'s
  reference-in-the-step, or a tile door, outranks a list in the panel.
- The log shows mostly files and physical places: words are enough, and (d) may be the whole answer.
- Words in a step prove sufficient in the test: build nothing.

## Sources

Opened today (Expo SDK 58 docs):
- https://docs.expo.dev/versions/v58.0.0/sdk/linking/
- https://docs.expo.dev/linking/into-other-apps/
- https://docs.expo.dev/versions/v58.0.0/sdk/webbrowser/
- https://docs.expo.dev/versions/v58.0.0/sdk/sharing/
- https://docs.expo.dev/versions/v58.0.0/sdk/clipboard/
- https://docs.expo.dev/versions/v58.0.0/sdk/document-picker/
- https://docs.expo.dev/versions/v58.0.0/sdk/filesystem/
- https://docs.expo.dev/guides/progressive-web-apps/ (says nothing about share targets or iOS limits)

Search-result summaries only (pages not opened):
- https://linear.app/docs/project-overview
- https://workona.com/help/resources
- https://support.apple.com/guide/reminders/remndc729e28 · https://www.macrumors.com/how-to/add-notes-urls-to-reminders-ios/
- https://www.macstories.net/ios/things-3-5-brings-ui-refinements-tagging-and-automation-improvements-clipboard-integration/ · https://apps.apple.com/ca/story/id1578939701
- https://www.devontechnologies.com/blog/usingdevonthinkwithomnifocus
- https://hookproductivity.com/help/integration/using-hookmark-with-files/
- https://obsidian.md/help/uri
- https://www.notion.com/help/notion-for-desktop · https://thomasjfrank.com/how-to-share-notion-links-that-open-directly-in-the-app/
- https://firt.dev/notes/pwa-ios/ · https://progressivewebapps.com/platforms/ios-safari/
- https://caniuse.com/mdn-api_window_showopenfilepicker · https://caniuse.com/mdn-manifests_webapp_share_target · https://bugs.webkit.org/show_bug.cgi?id=194593
- https://developer.chrome.com/blog/persistent-permissions-for-the-file-system-access-api
- https://webkit.org/?p=10855 (Async Clipboard API)
- https://cris.openu.ac.il/en/publications/improved-search-engines-and-navigation-preference-in-personal-inf-2/
- https://informationr.net/ir/10-1/paper207.html
