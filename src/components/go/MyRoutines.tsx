/**
 * P-97 (owner, 2026-11-26: "maybe tags and alphabetical sorting might be good start in a 'my routines' page"):
 * My routines — every named routine, A–Z under letter headings. The top is context: ⌂ Home, the one way out,
 * top-left, then the title. Find (part of a name or a tag) and the tags, each a toggle that narrows the list
 * (all chosen must be on a routine). A row's body opens its Plan; its ··· is a small anchored menu — Start (or
 * Resume, for a routine with a run going), Plan, Tags…, a line, Remove (asked first; with no run going). The
 * lowest, filled button is + New routine.
 *
 * P-104 (B-17 journey 1): two views, a tab list under Find — **Yours** (the list above) and **Library** (the
 * methods and templates that ship with the app, under their headings). It opens on Yours, every time; with nothing in
 * Yours yet, on Library. Find, while it has text, shows both under "Yours" and "Library" headings (names only). A
 * library row opens its preview sheet (Copy / Copy… / Open yours); Copy stays here, with its notice and Undo, so
 * several can be copied in a row.
 */
import { router, useIsFocused } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { findLibrary, LibraryRow, libraryRows, librarySections } from '@/domain/library';
import { allTags, findRows, myRoutines, RoutineRow, routineSections } from '@/domain/routines';
import { callersOf, routineNamed } from '@/domain/run';
import { leftOff } from '@/domain/runView';
import { tagKey } from '@/domain/tags';
import { useStore } from '@/store/useStore';

import { decorative } from '../a11y';
import { copyName, CopySheet, removeBody } from './Calls';
import { NewSheet } from './GoHome';
import { LibraryRowView, LibrarySheet, TemplateCopySheet } from './Library';
import { Notice, useRunUndo } from './Notice';
import { TagsSheet, tagWords } from './Tags';
import { G, hueOf, SP, TARGET } from './tokens';
import { Btn, Confirm, Field, focusOn, focusSoon, GoScreen, H1, Menu, MenuItem, MenuSep, T, TextRef, useKeys, ViewRef } from './ui';

/** A row's second line: its tags, what it gives, what it asks. */
export function rowLine(r: Pick<RoutineRow, 'tags' | 'gives' | 'asks' | 'going'>): string {
  const names = (ns: string[]) => ns.map((n) => `{${n}}`).join(', ');
  // (P-97 audit F5: its run going first, in words — never ❚❚, which is the runner's Pause alone.)
  return [r.going ?? '', tagWords(r.tags), r.gives.length ? `gives ${names(r.gives)}` : '', r.asks.length ? `asks ${names(r.asks)}` : ''].filter(Boolean).join(' · ');
}

export function MyRoutines() {
  const data = useStore((s) => s.data);
  const focused = useIsFocused();
  const act = useStore.getState;
  const title = useRef<TextRef>(null);
  const newBtn = useRef<ViewRef>(null);
  useEffect(() => {
    if (focused) focusSoon(title);
  }, [focused]);

  const rows = myRoutines(data);
  const tags = allTags(rows);
  const [find, setFind] = useState('');
  const [chosen, setChosen] = useState<string[]>([]);
  // A tag no routine carries any more is no longer chosen.
  const on = chosen.filter((c) => tags.some((t) => tagKey(t) === tagKey(c)));
  const shown = findRows(rows, find, on);
  const sections = routineSections(shown);
  const toggle = (t: string) => setChosen(on.some((c) => tagKey(c) === tagKey(t)) ? on.filter((c) => tagKey(c) !== tagKey(t)) : [...on, t]);

  // P-104: the two views — Yours (on opening, every time) or, with nothing in Yours yet, Library.
  const [viewing, setViewing] = useState<'yours' | 'library'>(() => (rows.length ? 'yours' : 'library'));
  const finding = !!find.trim();
  const lib = libraryRows(data);
  // (The library's routines carry no tags: a chosen tag leaves none of them.)
  const libShown = on.length ? [] : finding ? findLibrary(lib, find) : lib;
  const libSections = librarySections(libShown);
  /** P-104: a library row's preview open; P-106: a template's Copy… (its Name). */
  const [previewing, setPreviewing] = useState<LibraryRow | null>(null);
  const [namingCopy, setNamingCopy] = useState<LibraryRow | null>(null);
  /** Each library row (focus comes back to it after Close and after Copy). */
  const [libBodies] = useState<Record<string, unknown>>(() => ({}));
  const backToRow = (id: string) => focusSoon({ current: libBodies[id] ?? null });

  // One thing runs at a time: while another run is running, Start and Resume here are unavailable.
  const now = leftOff(data);
  const runningId = now.kind === 'runner' ? now.runId : undefined;
  const busy = (r: RoutineRow) => !!runningId && r.runId !== runningId;

  const [menu, setMenu] = useState<RoutineRow | null>(null);
  const [tagging, setTagging] = useState<RoutineRow | null>(null);
  const [removing, setRemoving] = useState<RoutineRow | null>(null);
  /** P-98: Copy… open on this routine. */
  const [copying, setCopying] = useState<RoutineRow | null>(null);
  const [naming, setNaming] = useState(false);
  const [mores] = useState<Record<string, unknown>>(() => ({}));
  /** Each row's body (its Plan), by routine: where the focus goes after a Remove (P-97 audit F3). */
  const [bodies] = useState<Record<string, unknown>>(() => ({}));
  const findRef = useRef<unknown>(null);
  /** After a Remove: the routine whose row takes the focus ('' = Find, else the heading), once the confirm has gone. */
  const focusNext = useRef<string | null>(null);
  useEffect(() => {
    const next = focusNext.current;
    if (next === null || removing) return;
    focusNext.current = null;
    focusSoon(next && bodies[next] ? { current: bodies[next] } : findRef.current ? findRef : title);
  }, [removing, bodies]);

  /** Its Plan: its run's (the run is put in Plan first, as from a tile), or — with no run — the routine's own. */
  const toPlan = (r: RoutineRow) => {
    if (r.runId && !act().planRun(r.runId).ok) return;
    router.push(r.runId ? `/go/run/${r.runId}/plan?from=routines` : `/go/routine/${r.routineId}?from=routines`);
  };
  /** Start (a routine with a run going: that run is resumed). Nothing to start or resume at: its Plan. */
  const start = (r: RoutineRow) => {
    const did = act().startRoutine(r.routineId);
    if (did.ok && did.runId) return router.push(`/go/run/${did.runId}`);
    if (!did.ok && (did.reason === 'empty' || did.reason === 'asking')) toPlan(r);
  };
  const create = (words: string) => {
    const did = act().createRoutine(words);
    if (!did.ok || !did.routineId) return;
    setNaming(false);
    router.push(`/go/routine/${did.routineId}?from=routines`);
  };

  const can = useRunUndo();
  useKeys(
    focused && !menu && !tagging && !removing && !naming && !copying && !previewing && !namingCopy,
    {
      'mod+z': () => {
        if (!can) return;
        can.undo();
        focusOn(title);
      },
    },
    true,
  );

  const layer = namingCopy ? (
    // P-106: Copy… on a template — its name first; the copy and what it calls, one Undo.
    <TemplateCopySheet
      row={namingCopy}
      fallback={title}
      onClose={() => setNamingCopy(null)}
      onCopy={(words) => {
        const did = act().copyFromLibrary(namingCopy.id, words);
        if (did.ok) {
          const id = namingCopy.id;
          setNamingCopy(null);
          backToRow(id);
        }
        return did;
      }}
    />
  ) : previewing ? (
    <LibrarySheet
      row={previewing}
      mode="copy"
      fallback={title}
      onClose={() => setPreviewing(null)}
      onOpenYours={() => {
        const yours = previewing.yours;
        setPreviewing(null);
        if (yours) router.push(`/go/routine/${yours}?from=routines`);
      }}
      onCopy={() => {
        if (previewing.template) {
          setNamingCopy(previewing);
          setPreviewing(null);
          return;
        }
        // Copy closes the sheet and stays on the library (several can be copied in a row): its notice says it, with Undo.
        if (act().copyFromLibrary(previewing.id).ok) setPreviewing(null);
      }}
    />
  ) : copying ? (
    <CopySheet
      name={copying.name}
      suggested={copyName(copying.name, (w) => !!routineNamed(data, w))}
      fallback={title}
      onClose={() => setCopying(null)}
      onCopy={(words) => {
        const did = act().editRoutine(copying.routineId, { kind: 'copy', words });
        if (did.ok) setCopying(null);
        return did;
      }}
    />
  ) : naming ? (
    <NewSheet onMake={create} onClose={() => setNaming(false)} fallback={newBtn} />
  ) : tagging ? (
    <TagsSheet
      name={tagging.name}
      tags={tagging.tags}
      fallback={title}
      onClose={() => setTagging(null)}
      onKeep={(next) => {
        if (act().editRoutine(tagging.routineId, { kind: 'tags', tags: next }).ok) setTagging(null);
      }}
    />
  ) : removing ? (
    // P-103 (5): the one confirm — it reaches beyond this screen (every routine using it).
    <Confirm
      title={`Remove “${removing.name}”?`}
      body={removeBody(callersOf(data, removing.routineId).map((c) => c.words))}
      action="Remove"
      testID="go-remove-routine-confirm"
      onCancel={() => setRemoving(null)}
      onAct={() => {
        // The next row (or, the last, the one before) takes the focus; with none left, Find or the heading.
        const i = shown.findIndex((r) => r.routineId === removing.routineId);
        const next = shown[i + 1] ?? shown[i - 1];
        const did = act().editRoutine(removing.routineId, { kind: 'removeRoutine' });
        focusNext.current = did.ok && next ? next.routineId : '';
        setRemoving(null);
      }}
    />
  ) : menu ? (
    <Menu anchor={() => mores[menu.routineId]} label={menu.name} onClose={() => setMenu(null)} testID="go-routine-menu" fallback={title}>
      {!menu.empty && (
        <MenuItem
          label={menu.runId ? 'Resume' : 'Start'}
          spoken={`${menu.runId ? 'Resume' : 'Start'} ${menu.name}`}
          disabled={busy(menu)}
          testID="go-routine-start"
          onPress={() => {
            setMenu(null);
            start(menu);
          }}
        />
      )}
      <MenuItem
        label="Plan"
        spoken={`Plan ${menu.name}`}
        onPress={() => {
          setMenu(null);
          toPlan(menu);
        }}
      />
      {!menu.tagsLocked && (
      <MenuItem
        label="Tags…"
        spoken={`Tags for ${menu.name}`}
        testID="go-routine-tags"
        onPress={() => {
          setTagging(menu);
          setMenu(null);
        }}
      />
      )}
      {/* P-98: Copy — the same routine under a new name. */}
      <MenuItem
        label="Copy…"
        spoken={`Copy ${menu.name}`}
        testID="go-routine-copy"
        onPress={() => {
          setCopying(menu);
          setMenu(null);
        }}
      />
      {/* (Removing a routine with a run going is refused by the engine: end the run first, from home.) */}
      {!menu.runId && (
        <>
          <MenuSep />
          <MenuItem
            label="Remove"
            spoken={`Remove ${menu.name}`}
            danger
            testID="go-routine-remove"
            onPress={() => {
              setRemoving(menu);
              setMenu(null);
            }}
          />
        </>
      )}
    </Menu>
  ) : null;

  return (
    <GoScreen testID="go-routines" layer={layer}>
      <View style={styles.bar}>
        {/* The one way out, top-left (P-103). */}
        <Btn mark="home" label="Home" onPress={() => (router.canGoBack() ? router.back() : router.replace('/go'))} testID="go-routines-home" />
        <H1 ref={title} style={styles.title}>
          My routines
        </H1>
      </View>
      <ScrollView style={styles.flex} contentContainerStyle={styles.list} keyboardShouldPersistTaps="handled" testID="go-routines-list">
        <Field ref={(el) => void (findRef.current = el)} value={find} onChangeText={setFind} accessibilityLabel="Find a routine" placeholder="Find a routine" autoCapitalize="none" autoCorrect={false} returnKeyType="search" testID="go-routines-find" />
        {/* P-104: Yours | Library — a tab list; the chosen one underlined. */}
        <View style={styles.tabs} role="tablist" aria-label="Routines" testID="go-routines-views">
          {(['yours', 'library'] as const).map((v) => {
            const on1 = viewing === v;
            return (
              <Pressable
                key={v}
                role="tab"
                aria-selected={on1}
                accessibilityRole="tab"
                accessibilityState={{ selected: on1 }}
                onPress={() => setViewing(v)}
                testID={`go-routines-view-${v}`}
                style={(state) => [styles.tab, on1 && styles.tabOn, (state as { focused?: boolean }).focused && styles.ring]}>
                <T bold={on1} dim={!on1} size={18}>
                  {v === 'yours' ? 'Yours' : 'Library'}
                </T>
              </Pressable>
            );
          })}
        </View>
        {tags.length > 0 && (viewing === 'yours' || finding) && (
          <View style={styles.tags} role="group" aria-label="Tags" accessibilityLabel="Tags" testID="go-routines-tags">
            {tags.map((t) => {
              const pressed = on.some((c) => tagKey(c) === tagKey(t));
              // (Never filled: + New routine is this screen's one filled button. Chosen: underlined on the raised surface, and pressed.)
              return <Btn key={tagKey(t)} label={`#${t}`} pressed={pressed} onPress={() => toggle(t)} style={[styles.tag, pressed && styles.tagOn]} testID="go-routines-tag" />;
            })}
          </View>
        )}
        {rows.length === 0 && viewing === 'yours' && !finding && (
          <T dim size={18} style={styles.empty} testID="go-routines-empty">
            No routines yet.
          </T>
        )}
        {(finding ? shown.length === 0 && libShown.length === 0 : viewing === 'yours' && rows.length > 0 && shown.length === 0) && (
          <View style={styles.none}>
            <T dim size={18} style={styles.empty} testID="go-routines-none">
              No routines match.
            </T>
            <Btn
              kind="plain"
              label="Clear"
              spoken="Clear Find and tags"
              onPress={() => {
                setFind('');
                setChosen([]);
              }}
              testID="go-routines-clear"
            />
          </View>
        )}
        {finding && (shown.length > 0 || libShown.length > 0) && (
          <View style={styles.section}>
            <T bold role="heading" aria-level={2} accessibilityRole="header" size={18} testID="go-routines-view-heading">
              Yours
            </T>
            {shown.length === 0 && (
              <T dim testID="go-routines-yours-none">
                None of yours match.
              </T>
            )}
          </View>
        )}
        {(finding || viewing === 'yours') && sections.map((s) => (
          <View key={s.letter} style={styles.section}>
            <T bold dim role="heading" aria-level={2} accessibilityRole="header" testID="go-routines-letter">
              {s.letter}
            </T>
            {s.rows.map((r) => (
              <Row key={r.routineId} row={r} onPlan={() => toPlan(r)} onMore={() => setMenu(r)} moreRef={(el) => (mores[r.routineId] = el)} bodyRef={(el) => (bodies[r.routineId] = el)} />
            ))}
          </View>
        ))}
        {finding && libShown.length > 0 && (
          <T bold role="heading" aria-level={2} accessibilityRole="header" size={18} testID="go-routines-view-heading">
            Library
          </T>
        )}
        {(finding || viewing === 'library') &&
          libSections.map((s) => (
            <View key={s.heading} style={styles.section} testID="go-lib-section">
              <T bold dim role="heading" aria-level={finding ? 3 : 2} accessibilityRole="header" testID="go-lib-heading">
                {s.heading}
              </T>
              {s.rows.map((r) => (
                <LibraryRowView key={r.id} row={r} onPress={() => setPreviewing(r)} bodyRef={(el) => (libBodies[r.id] = el)} />
              ))}
            </View>
          ))}
      </ScrollView>
      <Notice onUndone={() => focusOn(title)} />
      <View style={styles.foot}>
        <Btn ref={newBtn} kind="filled" mark="add" label="New routine" onPress={() => setNaming(true)} size={18} testID="go-routines-new" />
      </View>
    </GoScreen>
  );
}

/** A row: its colour, its name and its second line — the body opens its Plan — and its ···. */
function Row({ row, onPlan, onMore, moreRef, bodyRef }: { row: RoutineRow; onPlan: () => void; onMore: () => void; moreRef: (el: ViewRef | null) => void; bodyRef: (el: ViewRef | null) => void }) {
  const line = rowLine(row);
  return (
    <View style={styles.row} testID="go-routine-row" {...{ dataSet: { routine: row.routineId, going: row.runId ? 'true' : 'false' } }}>
      <Pressable
        ref={bodyRef}
        onPress={onPlan}
        accessibilityRole="button"
        accessibilityLabel={[`Plan ${row.name}`, line].filter(Boolean).join(', ')}
        testID="go-routine-body"
        style={(state) => [styles.body, (state as { focused?: boolean }).focused && styles.ring]}>
        <View style={[styles.hue, { backgroundColor: hueOf(row.hue).c }]} {...decorative} />
        <View style={styles.words}>
          <T bold size={18} testID="go-routine-name">
            {row.name}
          </T>
          {!!line && (
            <T dim testID="go-routine-line">
              {line}
            </T>
          )}
        </View>
      </Pressable>
      <Btn ref={moreRef} kind="plain" mark="more" spoken={`More for ${row.name}`} onPress={onMore} style={styles.more} testID="go-routine-more" />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, minHeight: 0 },
  bar: { minHeight: 56, flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: SP.s3, paddingHorizontal: SP.s3, paddingTop: SP.s2 },
  title: { flexShrink: 1 },
  list: { paddingHorizontal: SP.s3, paddingTop: SP.s2, paddingBottom: SP.s3, gap: SP.s3 },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: SP.s2 },
  tag: { paddingHorizontal: SP.s3 },
  tagOn: { backgroundColor: G.surf2, borderColor: G.text, borderBottomWidth: 4 },
  tabs: { flexDirection: 'row', flexWrap: 'wrap', borderBottomWidth: 1, borderBottomColor: G.line },
  tab: { minHeight: TARGET, minWidth: TARGET, justifyContent: 'center', paddingHorizontal: SP.s3, borderBottomWidth: 4, borderBottomColor: 'transparent' },
  tabOn: { borderBottomColor: G.text },
  empty: { textAlign: 'center', paddingVertical: SP.s4 },
  none: { alignItems: 'center', gap: SP.s2 },
  section: { gap: SP.s2 },
  row: { flexDirection: 'row', alignItems: 'stretch', borderWidth: 2, borderColor: G.line, backgroundColor: G.surf },
  body: { flex: 1, minWidth: 0, minHeight: TARGET, flexDirection: 'row', alignItems: 'center', gap: SP.s3, paddingHorizontal: SP.s3, paddingVertical: SP.s2 },
  hue: { width: 16, height: 16 },
  words: { flex: 1, minWidth: 0 },
  more: { alignSelf: 'center' },
  ring: { outlineStyle: 'solid', outlineWidth: 2, outlineColor: G.text, outlineOffset: -4 } as object,
  foot: { paddingHorizontal: SP.s3, paddingTop: SP.s1, paddingBottom: SP.s3 },
});
