# Adjacency brief (fill the blanks; send as a `polish-scout` prompt)

<objective>
Before a feature is built, map everything it touches and find what's already rough there. Weak
features next to new work make the new work feel broken too; this decides whether a polish pass
should come first.
</objective>

<feature>
____ (the roadmap items or brief slice, verbatim)
</feature>

<method>
1. List the screens, components, store actions, domain functions and stored data the feature will
   touch or depend on (file:line), including everything that reads or writes the same data.
2. For each one, check how it behaves today: run the app (`npm run build:web`, `node e2e/serve.mjs`,
   Playwright at 390×844) and the relevant tests. Look for edge cases, UX friction, accessibility
   gaps, slowness with lots of data (`bigBlob`), and things the roadmap already lists as open.
3. Classify each rough spot:
   - **blocks** — the feature would be broken or misleading on top of it;
   - **drags** — the feature works, but feels worse because of it;
   - **unrelated** — rough, but this feature doesn't depend on it.
</method>

<boundaries>
Don't edit tracked files, commit or push. Stop any server you start.
</boundaries>

<output>
Write the report to ____ (`.polish/product/adjacency-<slug>.md`) with these sections:
**Touches** · **Rough spots** (each with class, evidence, an existing P-## if any, a size and a
proposed *done when*) · **Recommendation** (polish first, bundle with the feature, or proceed).

Reply with only the path and a summary of 2,000 tokens or less.
</output>
