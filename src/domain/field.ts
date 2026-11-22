/**
 * A field that saves as you type (the activity sheet's text and note) keeps its own copy of the
 * text. When the saved value changes from elsewhere — another page's edit, taken in when this page
 * takes the data back (P-29), or an Undo — the field shows it, so the next keystroke adds to what's
 * saved instead of replacing it with an old copy (audit 2 F2). What the person is typing and hasn't
 * been saved is never replaced while the field has focus.
 *
 * `saved`: the value in the store now; `seen`: the stored value the field last took in; `shown`:
 * what the field shows. Returns the next `seen` and `shown` (the same values if nothing changes).
 */
export function syncField(f: { saved: string; seen: string; shown: string; focused: boolean }): { seen: string; shown: string } {
  if (f.saved === f.seen) return f;
  // Nothing of the person's that isn't saved: what the field shows is what it last took in.
  const unsaved = f.shown !== f.seen && f.shown !== f.saved;
  return { seen: f.saved, shown: f.focused && unsaved ? f.shown : f.saved };
}
