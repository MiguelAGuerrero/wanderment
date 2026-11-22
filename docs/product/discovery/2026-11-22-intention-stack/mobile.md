# Discovery: navigating and acting on a hierarchy of stacks on a phone

_Scout report, 2026-11-22. Territory: mobile interaction patterns, real apps that use them,
accessibility, and Expo SDK 58 tooling. Visualization theory and goal/task apps are covered by other
scouts. Includes the owner's carousel hypothesis (added mid-task) as its own section._

**How this was researched.** The session could not open web pages directly (every host except the
search engine was blocked), so claims about other products come from search-engine extracts of the
pages linked here, mostly vendors' own help pages, changelogs and platform docs. Forum and app-store
material is labelled as such. Tooling claims were also checked in this repo's installed
`node_modules` (react-native-web 0.21.4, @expo/ui 58.0.29, gesture-handler 3.3.0, reanimated 4.7.1,
react-native-svg 15.16.0), which counts as a primary source for this build.

**The model this has to fit.** The anchor can be a why, a wander or a step. Its children are
*derived*: wanders whose activity flows into a why, and (after B-02 slice 2) steps that became
wanders. Inside a wander, the stack is the chain of "toward" notes: each layer is the why of the one
above, only the top is staged and loggable, and "set it down" removes the top without logging (with
Undo). The structure is a **graph, not a tree**: a wander can feed two whys, so it is a child of both.
Every outliner below assumes a tree, and that difference comes up more than once.

---

## What others do

### Outliner zoom ("hoist") on phones: tap to go in, a breadcrumb to go up
| App | Go in | Go up / where am I | Source (date) |
|---|---|---|---|
| **Dynalist** | Tap the item's bullet to zoom into it. | Breadcrumbs, plus desktop "zoom out" shortcuts. On mobile, swipes check off or delete items, and users report accidental deletes while scrolling; the team said it would turn swipe actions into buttons. | [Help: Zoom in a list](https://help.dynalist.io/article/56-zoom-in-a-list) (undated); forum: [accidental delete](https://talk.dynalist.io/t/scrolling-leads-to-accidental-delete/5556), [swipe→buttons](https://talk.dynalist.io/t/swiping-to-complete-delete-in-mobile-apps/2595) (user reports) |
| **Workflowy** | Tap a bullet (standard, but not confirmed on a mobile help page). | Breadcrumbs stay at the top of the page, with a Home button and search (iOS app launch). Swipe right completes, swipe left opens the bullet menu; users complain about accidental swipes when they meant to scroll a board. | [iOS app launch](https://blog.workflowy.com/workflowys-new-mobile-app-for-ios-is-live/amp/) (2018); [Swipe right on us](https://blog.workflowy.com/swipe-right-on-us-mobile-shortcuts/) |
| **Workflowy mirrors** | One bullet lives in several places, kept in sync. A diamond bullet marks it, and "See them" lists the other places. | — | [Help: mirrors](https://workflowy.com/help/mirrors) |
| **Tana** (mobile) | Tap a node to open it ("zoom in"); an arrow on the right expands it in place. | The node screen has a back button, **breadcrumbs for moving up the tree**, and a "…" menu. In Oct 2025, sidebar items gained **long-press to capture into them**. | [Tana mobile docs](https://tana.inc/docs/tana-mobile); [Oct 2025 update](https://outliner.tana.inc/blog/tana-current-monthly-update-october-2025) |
| **Logseq** (DB version, mobile) | Block zoom came to the mobile app in 2025, and clicking a bullet zooms on desktop and mobile. Breadcrumb ancestors collapse into a "···" menu in references. | — | [DB changelog](https://discuss.logseq.com/t/logseq-db-changelog/30013/22) (May 2025); [breadcrumb request](https://discuss.logseq.com/t/option-to-show-full-block-paths-breadcrumbs-in-list-view-query-results-and-references/35220) |
| **Bike** (Hog Bay) | Focus into a row with a focus button beside it. | An optional navigation bar with back/forward and **breadcrumbs; tapping a crumb opens a menu of rows to focus**. Bike 2.0 drops "hoist" as a separate idea and keeps only focus. Whether this exists on iOS is unclear. | [Navigation bar guide](https://bikeguide.hogbaysoftware.com/using-bike/using-navigation-bar); [focus/hoist post](https://support.hogbaysoftware.com/t/something-about-focusid-in-row-links/5590) |
| **Notion** (mobile) | Toggles reveal nested pages in the sidebar. | "The breadcrumb at the top of your app shows you where the page … fits." | [Workspaces on mobile](https://www.notion.com/help/workspaces-on-mobile) |
| **OmniFocus 4** (iPhone) | On compact screens, "each level of hierarchy is represented sequentially as you navigate through it". Wide screens show the hierarchy as one outline. **Focus** temporarily narrows the whole database to chosen folders or projects. | Quick Open jumps straight to any project. | [OmniFocus 4 manual: outline](https://support.omnigroup.com/documentation/omnifocus/mac/4.1/en/outline), [4.0 manual](https://support.omnigroup.com/documentation/omnifocus/mac/4.0/en/print) |
| **Amplenote** | Headings and task lists can be collapsed. Mobile behaviour isn't documented, and a user calls the mobile path to Jots "clunky". | — | [Help: outlining](https://assets.amplenote.com/help/outline_with_collapsible_bullets_tasks_headings) |

**What they share:** **tap the node to go in; a breadcrumb trail at the top to go up; back goes up
too.** None of them uses a swipe to change level, and swipe-to-act on rows is a known source of
accidents on phones.

### Platform conventions for going down and back up
- **iOS back-button history** (since iOS 14): long-press Back to get a menu of every level in the
  stack and jump to any of them. Labels come from the back-button titles.
  [sarunw](https://sarunw.com/posts/what-should-you-know-about-navigation-history-stack-in-ios14/),
  [Apple forums](https://developer.apple.com/forums/thread/653913) (2020). This is the platform's own
  phone-sized breadcrumb.
- **Apple HIG, gestures:** don't interfere with screen-edge system gestures. Offer a swipe as a
  *shortcut* while keeping a visible Back button. Don't give a familiar gesture an app-specific
  meaning. [HIG gestures](https://developer.apple.com/design/human-interface-guidelines/gestures)
- **Android predictive back:** keep drag targets out of the system gesture zones. Predictive back
  "is not supported if you manage your own back stack". On Android 15 and later it is on by default.
  [Android design: predictive back](https://developer.android.com/design/ui/mobile/guides/patterns/predictive-back)
- **Pinch between levels:** Photos on iPhone has Years / Months / Days / All Photos, with pinch in All
  Photos ([iPhone User Guide](https://support.apple.com/guide/iphone/iph3d267610/16.0/ios)). Forum
  reports on iOS 26.2.1 say pinching out now stops at about 5 photos across and no longer reaches
  months or years ([Apple Community](https://discussions.apple.com/thread/256234546), user reports).
  Muse's handbook lists pinch alongside Back/Esc for moving between nested boards, but the direction
  isn't stated ([Muse handbook](https://podcast-preview--muse-website.netlify.app/handbook/mac)).
  Pinch is a hidden extra, and even Apple pulled it back.

### Swiping between siblings, and showing where you are without a count
- **Apple Weather:** swipe left/right between saved locations, or tap the list icon and pick one. Dots
  at the bottom show the places
  ([iPhone User Guide](https://support.apple.com/guide/iphone/check-the-weather-in-other-locations-ipha39110aad/16.0/ios/16.0)).
  Your current location gets its own glyph instead of a dot. It's the closest analogue to "swipe
  between sibling subtrees", and it always pairs the swipe with a list.
- **HIG page controls:** for an *ordered* set of full-screen pages. "More than about 10 dots are hard
  to count at a glance", and for complex navigation use a sidebar or split view instead
  ([HIG page controls](https://developer.apple.com/design/human-interface-guidelines/page-controls)).
  **Dots are a count by another name.** B-06's panel already dropped option B because its dots "read
  as a ledger".
- **NN/g on mobile carousels:** they must support swipe, shouldn't hold many items (the last item
  should be reachable in 3–4 swipes), and suffer **"swipe ambiguity"**: the same swipe means
  different things depending on where it starts, and can take people off the page by accident
  ([NN/g](https://www.nngroup.com/articles/mobile-carousels/)).
- **Material 3 carousels** (multi-browse, uncontained, hero) show **part of the next item** instead of
  dots ([Android Compose carousel](https://developer.android.com/develop/ui/compose/components/carousel)).
- **Stories** (Instagram): tap the left/right side, auto-advance, progress segments. Screen-reader
  users report "none of those gestures work", and auto-advance puts time pressure on screen-reader and
  switch users ([AppleVis comment](https://applevis.com/comment/212620),
  [Silktide](https://silktide.com/blog/social-media-accessibility-crisis/); a user report and a vendor
  blog). The segments are counts and the auto-advance is a timer.
- **iOS widget stacks and watchOS Smart Stack:** swipe up/down through stacked widgets. **Smart
  Rotate** reorders them by time, place and activity, and can be turned off per stack
  ([Apple support](https://support.apple.com/en-is/118610),
  [watch guide](https://support.apple.com/guide/watch/apdecf142fb9/watchos)). Relevance ranking is
  something applied without a tap.

### Card stacks where the top card is the one you act on
- **Apple Wallet:** cards overlap, so only the top edge of each shows. Tap one and it comes forward;
  the animation "mimics … cards within a stack"
  ([Pratt IxD critique, 2026](https://ixd.prattsi.org/2026/09/design-critique-apple-wallet-ios/)).
  **Google Wallet** moved from a horizontal carousel to a vertical stack (one full card plus the edge
  of the next), and critics say similar cards are "nearly impossible to tell apart"
  ([9to5Google, 2026-10-06](https://9to5google.com/2026/10/06/google-wallet-stacked-redesign/)).
- **Things 3, Magic Plus:** drag the + button to the exact spot in a list where the new item should go
  ([Cultured Code support](https://culturedcode.com/things/support/articles/2803582/)).
- **Tinder-style piles:** a swipe judges the top card (keep or reject). Rejected in the brief.

### Mind maps and canvases on phones
- **MindNode Focus Mode** (iPhone): the canvas shrinks around the selected node and its children,
  dims the rest of the map and zooms in. "Refocus" moves to another node. A visible **X in a bubble**
  exits. Fold Node collapses children to an ellipsis
  ([Sweet Setup](https://thesweetsetup.com/how-to-use-folding-focus-mode-in-mindnode/)). This backs
  B-06 option C's lens.
- **Heptabase** mobile: a "Back to center" button (2024), and "better whiteboard navigation with
  minimap" on the roadmap for Sept 2026
  ([changelog](https://wiki.heptabase.com/changelog/2024), [roadmap](https://wiki.heptabase.com/roadmap)).
  App-store reviewers complain about the limits of editing a whiteboard on a phone.
- **Obsidian Canvas** on mobile: "Zoom to selection" is a desktop right-click or Shift+2. Forum
  reports describe pinch problems on iPad, touch offsets on iPhone, and auto-zoom when the keyboard
  opens ([forum](https://forum.obsidian.md/t/problem-with-mandatory-canvas-auto-zoom-on-mobile-android/107971),
  user reports).

**What they share:** on phones, canvases get used through **a focus that narrows the view, plus a
"back to everything" button**, not through freehand zoom. That supports keeping the graph as the
picture and putting the doing in a list or stack.

### Accessibility
- **Swipes need a tap alternative.** WCAG 2.5.1 (A) uses a draggable news carousel with prev/next
  buttons as its example. WCAG 2.5.7 (AA) adds that the alternative can't itself be a swipe
  ([Understanding 2.5.1](https://www.w3.org/WAI/WCAG22/Understanding/pointer-gestures)).
- **APG carousel pattern** ([W3C](https://w3.org/WAI/ARIA/apg/patterns/carousel)):
  - the tabbed variant uses a tablist as the slide picker;
  - the examples label slides "N of 6" (a count, see below);
  - use `aria-live="polite"` on the slide wrapper when the carousel doesn't auto-rotate.
- **VoiceOver "adjustable":** swipe up or down on the element to step its value
  (increment/decrement), the way pickers and page controls work
  ([Orange a11y guide](https://a11y-guidelines.orange.com/en/mobile/ios/development/),
  [Deque](https://www.deque.com/blog/implement-ui-adjustable-trait-design-pattern/)).
- **React Native actions:** `increment`/`decrement`/`activate` work on both platforms. `magicTap` and
  `escape` are iOS-only; `onAccessibilityEscape` is the two-finger Z, meant for moving back up the
  hierarchy ([Deque linter](https://docs.deque.com/linter/4.0.0/en/has-valid-accessibility-actions),
  [RN archive](https://archive.reactnative.dev/docs/accessibility)). Apple describes Magic Tap as the
  app's "most important" action, such as answering a call or starting a timer
  ([Apple](https://developer.apple.com/tutorials/data/documentation/objectivec/nsobject-swift.class/accessibilityperformmagictap().md)).
- **Checked in this repo's react-native-web 0.21.4:**
  - `accessibilityRole="adjustable"` maps to ARIA `slider` (`propsToAriaRole.js`);
  - there is **no** `accessibilityActions`/`onAccessibilityAction` support;
  - `AccessibilityInfo.announceForAccessibility` is an empty function on web.
  - So an adjustable pager wouldn't work on web. The app already uses `accessibilityLiveRegion`
    (which becomes `aria-live`) for web announcements and `announceForAccessibility` on native
    (`src/app/thread/[id].tsx`).
- **TalkBack and pagers:** no official statement was found on what TalkBack announces. A Mozilla bug
  discussion suggests "Page 2 of 2"-style announcements, and notes that pages are only discoverable by
  focusing the pager ([Bugzilla 1398836](https://bugzilla.mozilla.org/show_bug.cgi?id=1398836)).
  Treat the native pager's speech as unknown until it's tested on a device.
- **Reduce Motion:** Apple's guidance is to replace motion with a dissolve, highlight fade or colour
  change rather than removing all animation. Scaling and zooming are the usual triggers
  ([App Store Connect criteria](https://developer.apple.com/help/app-store-connect/manage-app-accessibility/reduced-motion-evaluation-criteria)).
  Reanimated's `useReducedMotion` works on Android, iOS and web, but reads the setting at launch only
  ([docs](https://docs.swmansion.com/react-native-reanimated/docs/device/useReducedMotion)). The app
  doesn't check Reduce Motion anywhere yet (grep of `src/`).
- **One-handed reach:** Hoober's 2013 field study (1,333 observations) found 49% of people hold the
  phone one-handed and 36% cradle it. The top and far corners are the hardest to reach.
  ([UXmatters](https://www.uxmatters.com/mt/archives/2013/02/how-do-users-really-hold-mobile-devices.php)).
  This is dated, but Home already puts the log box at the bottom for this reason.

---

## Tooling options (Expo SDK 58, released 2026-10-15; RN 0.88)

| Option | iOS / Android / Web | Cost to adopt | Verdict |
|---|---|---|---|
| **`ScrollView`/`FlatList` horizontal + `pagingEnabled`** (core RN) | ✓ / ✓ / ✓ | **None.** On web, react-native-web 0.21.4 turns `pagingEnabled` into CSS `scroll-snap-type: x mandatory`, with `scroll-snap-align: start` on each child (verified in `node_modules/react-native-web/dist/exports/ScrollView/index.js` l.533–623). Caveats: on web, `onMomentumScrollEnd` is passed through but the DOM never fires it, and `snapToInterval` isn't implemented. So track the current page from `onScroll` (`round(x / pageWidth)`). The newer `scrollsnapchange` event is Chrome 129+ only, not Safari ([caniuse](https://caniuse.com/mdn-api_element_scrollsnapchange_event)). Peeking at the next card needs each child narrower than the viewport; test it on iOS Safari. | **Recommended.** No dependency, no native build, works offline. |
| **`@expo/ui/community/pager-view`** (already a dependency, `@expo/ui` 58.0.29) | ✓ (paged SwiftUI ScrollView) / ✓ (Compose HorizontalPager) / **✗, throws on web** ([SDK 58 docs](https://docs.expo.dev/versions/v58.0.0/sdk/ui/drop-in-replacements/pagerview/)) | The native code is already in the build, but it needs a separate web version. Its CHANGELOG lists several fixes where a `Pressable` on a page missed or misdirected taps, and one fix needs iOS 18+ (l.99, 347, 496, 500). | Only if the core one feels wrong on a device. Two code paths. |
| `react-native-pager-view` | ✓ / ✓ / ✗ ([SDK 58 view-pager](https://docs.expo.dev/versions/v58.0.0/sdk/view-pager/) lists android, ios, expo-go) | New dependency; Expo itself points to @expo/ui instead. | Doesn't fit (no web). |
| `react-native-reanimated-carousel` v5 | needs Reanimated ≥4.1 and Worklets ≥0.5 (installed: 4.7.1 / 0.13.0). Web support isn't stated; SSR isn't supported. ([release](https://newreleases.io/project/yarn/react-native-reanimated-carousel/release/5.0.0)) | JS-only dependency. Built for showcase carousels with looping, parallax and auto-play. | Not needed. |
| **react-native-reanimated 4.7.1** (installed) | ✓ / ✓ / ✓ (JS on web, slower) | None. `useReducedMotion` for the crossfade when the anchor changes, and layout transitions when the stack pops. | Use. |
| **react-native-gesture-handler 3.3.0** (installed) | ✓ / ✓ / ✓ (hook API: `usePinchGesture`, `usePanGesture`; needs RN ≥0.82) ([upgrading to 3](https://docs.swmansion.com/react-native-gesture-handler/docs/guides/upgrading-to-3/)) | None. Pinch on web competes with the browser's own zoom. | Only if a pinch shortcut is ever wanted. |
| **react-native-svg 15.16.0** (installed, draws the graph) | ✓ / ✓ / ✓ | None. | Keep it for the graph. Draw the stack with plain Views: it's text, and Views are accessible. |
| `@shopify/react-native-skia` | ✓ / ✓ / ✓ via CanvasKit WASM | **+2.9 MB gzipped on web**, plus 6 MB on iOS and 4 MB on Android. Web has to wait for `LoadSkiaWeb()` before rendering ([Skia web docs](https://shopify.github.io/react-native-skia/docs/getting-started/web)). | **Doesn't fit.** The log box would wait on a WASM download, which breaks "capture is sacred" and the offline first paint. |

---

## The owner's carousel hypothesis, evaluated

> "a carousel viewer to swipe between any sort of chain of intention at a given level … if I'm on the
> 'feel productive' layer and there's four different chains … swipe between each … to focus on any
> particular [one] and see its stack at that level … leverage selection and focus to really highlight
> intentionality and what I wanna do next."

**Verdict: fits if changed.** It is the Weather pattern (one page per sibling, swipe to move) inside
the outliner pattern (tap to go in, crumbs to go up), focused like MindNode. It fits if these hold:

1. **Each page is one child's stack.** Bottom to top:
   - the child's name (the base);
   - its layers, each a "toward" line;
   - the **top step**, as the tappable crumb.

   The **anchor** sits above the pager as a heading, with the trail to it ("All › feel productive").
   Pages keep the graph's order (declared, earned, then recency) and **never reorder themselves**
   (Smart Rotate is refused). There is no looping, and the pager never moves on its own (Stories are
   refused).
2. **Show where you are among siblings by name, not by count.**
   - A row of **name chips** above the pager acts as tabs and stays in sync with the swipe. That's
     B-06 C's existing "All · make apparel · feel productive" row, now one level down.
   - Each card is about 88% of the width, so the **next card's edge peeks** in (Material's way of
     saying "more this way" without dots).
   - No dots and no "2 of 4". The panels already read dots as a ledger, and HIG says dots are for
     counting.
3. **Swiping is looking.** A swipe highlights that child's node in the graph (MindNode-style dimming)
   but never changes what the log box will log to (P-35's rule). Only a tap on the top step loads it.
   "Set it down" lives on a long-press or menu on the top step, with Undo, **never on a swipe**: the
   pager owns horizontal swipes, and Workflowy and Dynalist users report accidental swipe actions.
4. **It has to live alongside vertical scrolling and the bottom log box.**
   - Give the pager a **fixed height**, so swiping between a 1-layer and a 4-layer stack doesn't make
     Home jump. Deeper layers fold behind a "…" (no number) that opens the full "toward" view.
   - Inset it at least 16 pt from both screen edges, clear of the iOS back-swipe and Android back
     zones (HIG; Android predictive back).
   - Only the pager swipes sideways. The graph above it doesn't, which avoids NN/g's swipe ambiguity.
   - RN and the browser both lock a nested scroll to one direction; check this on an Android device.
5. **One-handed reach.** The top step sits at the top of its card, roughly mid-screen, which is
   reachable but not where the thumb rests. Mirror **the visible page's top step in the row above the
   log box** (Home's existing `HomeAboveLog` / P-35 context row), as "↳ sketch a hand · Load". Acting
   is then one tap where the thumb already is, and it still only *offers*, never attaches.
6. **Screen readers.**
   - The chips are the way through: role `tab` with a selected state on native, and `tablist`/`tab`
     on web.
   - Each page is a region headed by the child's name, with the top step as a labelled button: "sketch
     a hand, toward draw better hands. Load into log box."
   - Changing page announces by name: `accessibilityLiveRegion` on web, `announceForAccessibility` on
     native.
   - Don't rely on `adjustable`: on web it becomes a slider with no actions (react-native-web 0.21.4).
   - Extras on iOS: **Escape** (two-finger Z) goes up one anchor; **Magic Tap** loads the current
     page's top step (loading only, never logging).
7. **Reduce Motion.** Changing the anchor crossfades instead of zooming. A page change started by a
   chip jumps without animation (`scrollTo({ animated: false })`).
8. **Wide screens** (web or tablet) show the sibling stacks side by side, with no pager. That's
   OmniFocus's rule: drill down one level at a time on compact screens, show it all on wide ones.
9. **A wander that is a child of two whys** shows in both pagers. Mark it with one quiet line, "also
   toward feel productive", in words rather than Workflowy's diamond.
10. **Caps.** NN/g says the last page should be reachable in 3–4 swipes. Past about 5 siblings, the
    chips (which scroll) and "and more →" (to the Wanders tab) carry the rest.

**Size:** M for the pager, chips, anchor trail and context-row mirror. It's UI only (Light tier) and
needs no stored change, as long as the anchor isn't remembered. Stacks deeper than one layer need B-02
P-19 first. **Big: yes.** It changes Home's navigation and touches DESIGN.md's P-34 Interaction line,
so it belongs in B-06 as a revision.

---

## Borrowable ideas (best first)

1. **Sibling pager with named chips and a peeking next card** (Apple Weather, Material carousel, APG
   tabbed carousel). See the section above. **Fits if changed:** chips instead of dots, swiping only
   looks, fixed height, edge insets. **M. Big.**
2. **Tap a stack's base to go in; a crumb trail to go up** (Dynalist, Workflowy, Tana, Logseq, Bike,
   Notion).
   - Tapping a page's base name makes it the anchor, and its children become the pages. If it has no
     children, its own stack fills the card.
   - "All › feel productive › make apparel" sits above the pager, and every crumb is a button.
   - Long-pressing the anchor title lists the whole path (iOS back-button history).
   - **Fits.** Use words, never a depth number. **S–M. Big together with #1.**
3. **Mirror the visible stack's top step in the context row above the log box** (thumb reach; P-35's
   row; Tana's long-press to capture into a node). One tap to load, right above Log. **Fits if
   changed:** it must only offer, and a swipe must never set the doing. **S. Not big** on its own.
4. **Back goes up an anchor level** (iOS escape, Android back, browser back). The choice is between:
   - keeping the anchor in Home's URL search params, so browser and Android back work for free and
     predictive back keeps working; or
   - in-place state that clears when you leave Home (the panels' rule: "not remembered").

   **Fits if changed:** pick one (open question 2). **S.**
5. **Wallet-style layers: the top step whole, lower layers as edges** (Apple Wallet). Lower layers
   show as overlapping slivers, each with its "toward" text, up to about two plus "…". Tapping the
   stack fans it out into the full "toward" view (B-02's view on request). **Fits if changed:** no
   "+2 more" count, and the fan is read-only. **S.**
6. **Add on top, where it lands** (Things Magic Plus, without the drag). A quiet "+ a step toward
   this" at the *top* edge of the card, where the new layer appears. One step per tap (B-02 refinement
   3). **Fits. S.**
7. **Focus dims the rest of the graph, and a visible "All" exits** (MindNode Focus Mode with Refocus
   and the X bubble; OmniFocus Focus). This confirms B-06 option C: changing anchor *is* Refocus.
   **Fits** (already in B-06, so not new). It folds into #1.
8. **Accessibility pack:** chips as tabs; regions with headings; name-based announcements; iOS escape
   and magic tap; crossfade under Reduce Motion; tap alternatives for every swipe (WCAG 2.5.1 / 2.5.7).
   **Fits. S** alongside #1–2.
9. **Side by side on wide screens** (OmniFocus compact vs wide). **Fits. S.**
10. **"Also toward …" for a node with two parents** (Workflowy mirrors, in words). **Fits. S.**
11. **Pinch out to go up a level** (Photos, Muse). **Doesn't fit for now:**
    - it's hidden;
    - Apple itself scaled it back (iOS 26.2.1 user reports);
    - on web it fights the browser's zoom;
    - the graph would want the same gesture.

    It could come back later as an extra shortcut beside the crumbs.
12. **Page dots** (HIG page control). **Doesn't fit:** they're a count of siblings (the never list,
    and B-06's panel already read dots as a ledger). Named chips do the same job.
13. **Swipe a step to log or set it down** (Workflowy's swipe to complete, Dynalist's swipe to
    delete). **Doesn't fit:**
    - it clashes with the pager's swipe;
    - users of both apps report accidental triggers;
    - logging goes through the log box with a tap ("capture is sacred"; nothing completed by the
      gesture that loads it).
14. **Judging swipes** (Tinder piles). **Doesn't fit:** already refused. A swipe is a verdict on the
    item.
15. **Stories progress segments and auto-advance.** **Doesn't fit:** the segments are counts and the
    advance is a timer (the never list), and screen-reader users report the gestures don't work.
16. **Smart Rotate / relevance-ranked stacks** (iOS and watchOS Smart Stack). **Doesn't fit:** it
    reorders without a tap ("nothing applied silently"), and order is how people find their way back.
17. **Skia for the stack graphics.** **Doesn't fit:** +2.9 MB of WASM on web, and the first render is
    held until it loads.

---

## Open questions for the owner
1. **Which way does a stack read?** A literal pyramid puts the base at the bottom and the next step at
   the top, but on a phone the top of a card is further from the thumb. Keep the visual pyramid and
   mirror the top step into the row above the log box (idea 3), or flip it so the next step sits at
   the bottom of each card, nearest the thumb?
2. **Does the anchor stay put?** Should the anchor stay when you leave Home and come back, or reset
   to "All" (the panels' "not remembered")? If it stays, it can live in the URL, so back and Android
   predictive back work natively.
3. **Where does the pager open?** On the first sibling in graph order, or on the one you last *tapped*
   during this visit? (Choosing "the one you last logged toward" would be a quiet ranking.)
4. **Should a swipe light up the graph?** That's focus without a tap. Or should only a tap on a chip
   or node highlight it?
5. **What are the pages at the wander level?** "Feel productive" has wanders as children, but a wander
   has one chain. Do its pages become the steps that became wanders (B-02 slice 2), or does going into
   a wander just show its single stack full-size?
6. **Is a screen-reader position like "2 of 4" a count?** It isn't shown on screen, and position is
   arguably not a tally. Names are proposed instead; confirm.
