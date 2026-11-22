import { fromBackup } from '@/domain/backup';
import { ImportPlan, planImport } from '@/domain/importPlan';
import { Data } from '@/domain/types';

import { useStore } from './useStore';

/** A checked backup, and how it compares with the data it was compared against (P-04). */
export interface ImportPreview {
  incoming: Data;
  /** The data the plan was computed against: replacing from any other would use a stale plan. */
  basis: Data;
  plan: ImportPlan;
}

/** Checks a backup and compares it with what's here. Changes nothing; throws a readable message when the file is refused. */
export function previewImport(json: string): ImportPreview {
  return compareWith(useStore.getState().data, fromBackup(json));
}

/** The same backup, compared with `data` (what's here now); the same preview when that's what it was compared with. */
export const rebasePreview = (preview: ImportPreview, data: Data): ImportPreview => (preview.basis === data ? preview : compareWith(data, preview.incoming));

const compareWith = (basis: Data, incoming: Data): ImportPreview => ({ incoming, basis, plan: planImport(basis, incoming) });

export type ConfirmImport =
  | { ok: true; activities: number }
  /** What's here changed since the preview was shown: nothing replaced; this is the new comparison. */
  | { ok: false; reason: 'changed'; preview: ImportPreview }
  /** It's the same as what's here: nothing to replace. */
  | { ok: false; reason: 'identical' }
  /** The page doesn't hold the data (P-29): refused with the quiet note; try again when it's back. */
  | { ok: false; reason: 'reconnecting' };

/** Replaces what's here with a previewed backup — only when the preview still describes what's here. */
export function confirmImport(preview: ImportPreview): ConfirmImport {
  const { data, replaceData } = useStore.getState();
  if (data !== preview.basis) return { ok: false, reason: 'changed', preview: rebasePreview(preview, data) };
  if (preview.plan.identical) return { ok: false, reason: 'identical' };
  if (!replaceData(preview.incoming)) return { ok: false, reason: 'reconnecting' };
  return { ok: true, activities: Object.keys(preview.incoming.activities).length };
}
