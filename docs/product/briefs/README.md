# Product briefs

A **brief** is how `/product` proposes a big feature instead of building it. Big means any of:

- a new screen or navigation entry;
- a new concept in the data model, or a stored field;
- a schema, export or backup format change;
- a change to how capture works beyond polish;
- anything near a DESIGN.md rule, or a new setting;
- a new dependency with native code;
- size L, or more than about a day of careful human work.

Each brief lives at `B-##-short-name.md`, copied from [`TEMPLATE.md`](TEMPLATE.md), and is linked
from a `D-##` entry under *Decisions needed 🙋* in [`../../ROADMAP.md`](../../ROADMAP.md).

The owner decides by answering when `/product` asks, or by writing under the D-## entry: **go**,
**go with changes** (say which), **not now**, or **no**. On **go**, `/product` turns the brief's
first slice into roadmap items and builds it. The other slices queue behind it.

Status line at the top of each brief: `proposed` · `go` · `building` · `shipped` · `not now` · `no`.
