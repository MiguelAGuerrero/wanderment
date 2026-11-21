import { useState } from 'react';
import { LayoutChangeEvent, Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Line } from 'react-native-svg';

import { GraphNode, Neighbourhood } from '@/domain/graph';
import { Id } from '@/domain/types';
import { C } from '@/theme';

const ROW = 112;
const NODE_W = 100;
const SIDE_W = 84;
const MORE_W = 52;
const NODE_H = 48;

interface Placed {
  id: Id;
  label: string;
  x: number;
  y: number;
  node?: GraphNode;
  /** "+N" overflow chip. */
  more?: number;
}

/** Spreads a row across the width; if it doesn't fit, the last slot becomes a "+N" chip. */
function row(nodes: GraphNode[], y: number, width: number): Placed[] {
  const fit = Math.max(1, Math.floor((width + 8) / (NODE_W + 8)));
  const shown = nodes.length > fit ? nodes.slice(0, Math.max(1, Math.floor((width - MORE_W - 8) / (NODE_W + 8)))) : nodes;
  const extra = nodes.length - shown.length;
  const items: Placed[] = shown.map((n) => ({ id: n.thread.id, label: n.thread.name, x: 0, y, node: n }));
  if (extra > 0) items.push({ id: `more-${y}`, label: `+${extra}`, x: 0, y, more: extra });
  const widths = items.map((it) => (it.more ? MORE_W : NODE_W));
  const gap = Math.max(8, (width - widths.reduce((a, b) => a + b, 0)) / (items.length + 1));
  let x = gap;
  items.forEach((it, i) => {
    it.x = x + widths[i] / 2;
    x += widths[i] + gap;
  });
  return items;
}

const strokeFor = (weight: number) => 1 + Math.min(4, Math.log2(1 + weight));

/**
 * The centre thread, what it flows to (above), what flows into it (below) and siblings at the
 * sides. Edges are drawn with react-native-svg; nodes are Pressables so they stay accessible.
 */
export function GraphCanvas({
  hood,
  depth,
  onPick,
  onCenter,
  onMore,
  highlight,
}: {
  hood: Neighbourhood;
  depth: 1 | 2;
  onPick: (id: Id) => void;
  onCenter: () => void;
  onMore: () => void;
  /** Attach mode: every node is a target, these ones are suggested. */
  highlight?: { all: boolean; suggested: Set<Id> };
}) {
  const [width, setWidth] = useState(0);
  const onLayout = (e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width);

  const rows = depth === 2 ? 5 : 3;
  const yUp2 = ROW * 0.5;
  const yUp = depth === 2 ? ROW * 1.5 : ROW * 0.5;
  const yCenter = yUp + ROW;
  const yDown = yCenter + ROW;
  const yDown2 = yDown + ROW;
  const height = ROW * rows;

  const up = row(hood.up, yUp, width);
  const down = row(hood.down, yDown, width);
  const up2 = depth === 2 ? row(hood.up2, yUp2, width) : [];
  const down2 = depth === 2 ? row(hood.down2, yDown2, width) : [];
  const cx = width / 2;
  const diameter = 96 + Math.min(32, hood.steps * 2);
  // Siblings sit either side of the centre (the rest are in the list view).
  const sideX = cx - diameter / 2 - 8 - SIDE_W / 2;
  const sideRoom = sideX >= SIDE_W / 2 + 2;
  const sides: Placed[] = (sideRoom ? hood.siblings.slice(0, 2) : []).map((n, i) => ({
    id: n.thread.id,
    label: n.thread.name,
    x: i % 2 === 0 ? sideX : width - sideX,
    y: yCenter,
    node: n,
  }));
  const moreSides = hood.siblings.length - sides.length + hood.moreSiblings;
  const isSide = new Set(sides.map((p) => p.id));

  // A thread can sit both above and below (A⇄B), so each side has its own positions.
  const placedOn = (items: Placed[]) => new Map(items.filter((p) => p.node).map((p) => [p.id, p]));
  const upPos = placedOn(up);
  const downPos = placedOn(down);

  const edges: { from: { x: number; y: number }; to: { x: number; y: number }; w: number; dashed?: boolean; key: string }[] = [];
  const center = { x: cx, y: yCenter };
  for (const p of [...up, ...down]) if (p.node) edges.push({ from: center, to: p, w: p.node.weight, key: `c-${p.id}-${p.y}` });
  for (const [items, side] of [
    [up2, upPos],
    [down2, downPos],
  ] as const) {
    for (const p of items) {
      const via = p.node?.via && side.get(p.node.via);
      if (p.node && via) edges.push({ from: via, to: p, w: p.node.weight, key: `v-${p.id}-${p.y}` });
    }
  }
  for (const p of sides) {
    const via = p.node?.via && upPos.get(p.node.via);
    if (p.node && via) edges.push({ from: p, to: via, w: p.node.weight, dashed: true, key: `s-${p.id}` });
  }

  return (
    <View style={{ height }} onLayout={onLayout}>
      {width > 0 && (
        <>
          <Svg width={width} height={height} style={StyleSheet.absoluteFill} pointerEvents="none" aria-hidden>
            {edges.map((e) => (
              <Line
                key={e.key}
                x1={e.from.x}
                y1={e.from.y}
                x2={e.to.x}
                y2={e.to.y}
                stroke={e.dashed ? C.dashed : C.accent}
                strokeOpacity={e.dashed ? 1 : 0.45}
                strokeWidth={e.dashed ? 1.5 : strokeFor(e.w)}
                strokeDasharray={e.dashed ? '4 4' : undefined}
              />
            ))}
          </Svg>

          <Pressable
            onPress={onCenter}
            style={[
              styles.center,
              {
                width: diameter,
                height: diameter,
                borderRadius: diameter / 2,
                left: cx - diameter / 2,
                top: yCenter - diameter / 2,
                borderWidth: hood.recentSteps ? 4 : 1,
                borderColor: hood.recentSteps ? C.accent : C.line,
              },
              highlight?.suggested.has(hood.center.id) && { backgroundColor: C.accentTint },
            ]}
            accessibilityRole="button"
            accessibilityLabel={`${hood.center.name}, ${hood.steps} steps${hood.recentSteps ? `, ${hood.recentSteps} in the last two weeks` : ''}. ${highlight ? 'Attach here.' : 'Opens the thread.'}`}>
            <Text style={styles.centerText} numberOfLines={3}>
              {hood.center.name}
            </Text>
          </Pressable>

          {[...up2, ...up, ...sides, ...down, ...down2].map((p) => {
            const suggested = highlight?.suggested.has(p.id);
            const target = highlight?.all && !p.more;
            return (
              <Pressable
                key={`${p.id}-${p.y}`}
                onPress={() => (p.more ? onMore() : onPick(p.id))}
                style={[
                  styles.node,
                  (() => {
                    const w = p.more ? MORE_W : isSide.has(p.id) && p.y === yCenter ? SIDE_W : NODE_W;
                    return { width: w, left: p.x - w / 2, top: p.y - NODE_H / 2 };
                  })(),
                  p.more !== undefined && styles.more,
                  target && styles.target,
                  suggested && styles.suggested,
                ]}
                accessibilityRole="button"
                accessibilityLabel={
                  p.more
                    ? `${p.label} more. Shows the list.`
                    : `${p.label}, ${p.node!.count} ${p.node!.count === 1 ? 'link' : 'links'}${highlight ? '. Attach here.' : ''}`
                }>
                <Text style={[styles.nodeText, suggested && { color: '#fff' }]} numberOfLines={2}>
                  {p.label}
                </Text>
              </Pressable>
            );
          })}
          {moreSides > 0 && (
            <Pressable
              onPress={onMore}
              style={[styles.node, styles.more, { width: MORE_W, left: width - MORE_W - 4, top: yCenter + NODE_H / 2 + 8 }]}
              accessibilityRole="button"
              accessibilityLabel={`+${moreSides} more alongside. Shows the list.`}>
              <Text style={styles.nodeText}>+{moreSides}</Text>
            </Pressable>
          )}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  center: { position: 'absolute', alignItems: 'center', justifyContent: 'center', padding: 8, backgroundColor: C.surface },
  centerText: { fontSize: 14, fontWeight: '600', color: C.ink, textAlign: 'center' },
  node: { position: 'absolute', width: NODE_W, minHeight: NODE_H, paddingHorizontal: 8, paddingVertical: 6, borderRadius: 14, borderWidth: 1, borderColor: C.line, backgroundColor: C.surface, alignItems: 'center', justifyContent: 'center' },
  nodeText: { fontSize: 13, fontWeight: '500', color: C.ink, textAlign: 'center' },
  more: { backgroundColor: C.quietBg, borderStyle: 'dashed' },
  target: { borderColor: C.accent, borderWidth: 2 },
  suggested: { backgroundColor: C.accent },
});
