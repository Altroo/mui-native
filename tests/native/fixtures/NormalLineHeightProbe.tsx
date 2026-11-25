// Copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT
// Isolated natural-height contract controls, not a catalog screen.
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  findNodeHandle,
  PixelRatio,
  Pressable,
  ScrollView,
  Text,
  View,
  type TextInstance,
  type TextProps,
} from 'react-native';
import { Box, ThemeProvider, Typography, createTheme } from '@mui/material';
type Event = Parameters<NonNullable<TextProps['onTextLayout']>>[0];
type Line = Pick<
  Event['nativeEvent']['lines'][number],
  'width' | 'height' | 'ascender' | 'descender' | 'capHeight' | 'xHeight'
>;
type Rect = { x: number; y: number; width: number; height: number };
type Receipt = {
  tag: number;
  lineTag: number;
  revision: number;
  attaches: number;
  cleanups: number;
  frame: Rect;
  line: Line;
};
type Targets = {
  generation: number;
  nodes: Map<string, TextInstance>;
  lines: Map<string, { tag: number; revision: number; line: Line }>;
  revisions: Map<string, number>;
  attaches: Map<string, number>;
  cleanups: Map<string, number>;
};
const kinds = ['mui', 'native', 'view', 'capped', 'unscaled'] as const;
type Report = {
  stage: number;
  phase: 'idle' | 'sampling' | 'complete' | 'error';
  schemaVersion?: 1;
  development?: boolean;
  fontScale?: number;
  rows?: { kind: (typeof kinds)[number]; source: Receipt; control: Receipt }[];
  error?: string;
};
const theme = createTheme();
function useProbe(id: string, targets: Targets) {
  const ref = useCallback(
    (node: TextInstance | null) => {
      if (!node) return;
      targets.generation++;
      targets.nodes.set(id, node);
      targets.lines.delete(id);
      targets.attaches.set(id, (targets.attaches.get(id) ?? 0) + 1);
      return () => {
        if (targets.nodes.get(id) !== node) return;
        targets.generation++;
        targets.nodes.delete(id);
        targets.lines.delete(id);
        targets.cleanups.set(id, (targets.cleanups.get(id) ?? 0) + 1);
      };
    },
    [id, targets],
  );
  const onTextLayout = useCallback(
    (event: Event) => {
      const tag =
        typeof event.currentTarget === 'number'
          ? event.currentTarget
          : findNodeHandle(event.currentTarget);
      const node = targets.nodes.get(id);
      if (!node || !tag || findNodeHandle(node) !== tag) return;
      targets.generation++;
      const revision = (targets.revisions.get(id) ?? 0) + 1;
      targets.revisions.set(id, revision);
      targets.lines.delete(id);
      const line = event.nativeEvent.lines[0];
      if (!line || event.nativeEvent.lines.length !== 1) return;
      const { width, height, ascender, descender, capHeight, xHeight } = line;
      if (![width, height, ascender, descender, capHeight, xHeight].every(Number.isFinite)) return;
      targets.lines.set(id, {
        tag,
        revision,
        line: { width, height, ascender, descender, capHeight, xHeight },
      });
    },
    [id, targets],
  );
  return { ref, onTextLayout, testID: 'normal-height-' + id };
}
function Pair({
  kind,
  stage,
  targets,
}: {
  kind: (typeof kinds)[number];
  stage: number;
  targets: Targets;
}) {
  const source = useProbe(kind + ':source', targets),
    control = useProbe(kind + ':control', targets);
  const fontSize = stage > 0 && stage < 4 ? 24 : 16;
  const normal = stage !== 3;
  const inline = stage === 2 ? { lineHeight: 13 } : undefined;
  const scaling = {
    allowFontScaling: kind !== 'unscaled',
    ...(kind === 'capped' ? { maxFontSizeMultiplier: 1.2 } : {}),
  };
  const leaf = (
    <Typography variant="inherit" sx={normal ? { lineHeight: 'normal' } : undefined} style={inline}>
      Mm
    </Typography>
  );
  const parent = { fontSize, lineHeight: fontSize * 4, width: 160 };
  return (
    <View style={{ gap: 4 }}>
      <Text allowFontScaling={false} style={{ fontSize: 10 }}>
        {kind}
      </Text>
      <View style={{ flexDirection: 'row', gap: 12, alignItems: 'flex-start' }}>
        {kind === 'native' ? (
          <Text {...source} {...scaling} style={parent}>
            {leaf}
          </Text>
        ) : kind === 'view' ? (
          <Box sx={{ fontSize: `${fontSize}px`, lineHeight: 4 }}>
            <Typography
              {...source}
              {...scaling}
              variant="inherit"
              sx={normal ? { lineHeight: 'normal' } : undefined}
              style={{ width: 160, ...inline }}
            >
              Mm
            </Typography>
          </Box>
        ) : (
          <Typography
            {...source}
            {...scaling}
            sx={{ fontSize: `${fontSize}px`, lineHeight: 4 }}
            style={{ width: 160 }}
          >
            {leaf}
          </Typography>
        )}
        {/* This core Text is created inside the opaque Pair and has no MUI scope props. */}
        <Text
          {...control}
          {...scaling}
          style={{
            fontSize,
            width: 160,
            ...(stage === 2 ? { lineHeight: 13 } : stage === 3 ? { lineHeight: fontSize * 4 } : {}),
          }}
        >
          Mm
        </Text>
      </View>
    </View>
  );
}
async function measure(id: string, targets: Targets): Promise<Receipt> {
  const node = targets.nodes.get(id),
    observation = targets.lines.get(id);
  const tag = node ? findNodeHandle(node) : null;
  if (!node || !tag || !observation || observation.tag !== tag)
    throw Error('Missing bound line: ' + id);
  const frame = await new Promise<Rect>((resolve, reject) =>
    node.measureInWindow((x, y, width, height) => {
      if (![x, y, width, height].every(Number.isFinite) || width <= 0 || height <= 0)
        reject(Error('Invalid measured frame: ' + id));
      else resolve({ x, y, width, height });
    }),
  );
  if (targets.nodes.get(id) !== node || targets.lines.get(id) !== observation)
    throw Error('Changed bound line: ' + id);
  return {
    tag,
    lineTag: observation.tag,
    revision: observation.revision,
    frame,
    line: { ...observation.line },
    attaches: targets.attaches.get(id) ?? 0,
    cleanups: targets.cleanups.get(id) ?? 0,
  };
}
export function NormalLineHeightProbe() {
  const targets = useRef<Targets>({
    generation: 0,
    nodes: new Map(),
    lines: new Map(),
    revisions: new Map(),
    attaches: new Map(),
    cleanups: new Map(),
  }).current;
  const [stage, setStage] = useState(0);
  const [report, setReport] = useState<Report>({ stage: 0, phase: 'idle' });
  const pending = useRef(false);
  const mounted = useRef(true);
  const cancelCapture = useRef<(() => void) | undefined>(undefined);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      cancelCapture.current?.();
    };
  }, []);
  const capture = async () => {
    if (pending.current) return;
    pending.current = true;
    const started = performance.now();
    setReport({ stage, phase: 'sampling' });
    let error: unknown;
    let stopped = false;
    let rejectDeadline: (reason: Error) => void = () => {};
    const deadline = new Promise<never>((_, reject) => {
      rejectDeadline = reject;
    });
    const cancel = () => {
      stopped = true;
      rejectDeadline(Error('Native height capture cancelled'));
    };
    cancelCapture.current = cancel;
    // A native measurement callback may never arrive. This deadline must settle
    // independently of Promise.all; the loop's elapsed-time check cannot do that.
    const timeout = setTimeout(() => {
      stopped = true;
      rejectDeadline(Error('Native height capture timed out'));
    }, 5000);
    try {
      while (mounted.current && performance.now() - started < 5000) {
        const observed = targets.generation;
        try {
          const rows = await Promise.race([
            Promise.all(
              kinds.map(async (kind) => ({
                kind,
                source: await measure(kind + ':source', targets),
                control: await measure(kind + ':control', targets),
              })),
            ),
            deadline,
          ]);
          if (
            mounted.current &&
            observed === targets.generation &&
            performance.now() - started >= 300
          ) {
            setReport({
              schemaVersion: 1,
              stage,
              phase: 'complete',
              development: __DEV__,
              fontScale: PixelRatio.getFontScale(),
              rows,
            });
            return;
          }
        } catch (value) {
          error = value;
          if (stopped) break;
        }
        try {
          await Promise.race([
            new Promise<void>((resolve) => requestAnimationFrame(() => resolve())),
            deadline,
          ]);
        } catch (value) {
          error = value;
          break;
        }
      }
      if (mounted.current) setReport({ stage, phase: 'error', error: String(error) });
    } finally {
      clearTimeout(timeout);
      if (cancelCapture.current === cancel) cancelCapture.current = undefined;
      pending.current = false;
    }
  };
  return (
    <ThemeProvider theme={theme}>
      <View style={{ flex: 1, padding: 24, paddingTop: 64, backgroundColor: '#fff', gap: 12 }}>
        <Text allowFontScaling={false} style={{ fontSize: 18 }}>
          Natural line height
        </Text>
        <View style={{ flexDirection: 'row', gap: 24 }}>
          <Pressable
            testID="normal-height-capture"
            disabled={report.phase === 'sampling'}
            onPress={() => void capture()}
          >
            <Text allowFontScaling={false}>Capture</Text>
          </Pressable>
          <Pressable
            testID="normal-height-next"
            disabled={stage === 4 || report.phase === 'sampling'}
            onPress={() => {
              if (pending.current) return;
              targets.generation++;
              targets.lines.clear();
              setStage(stage + 1);
              setReport({ stage: stage + 1, phase: 'idle' });
            }}
          >
            <Text allowFontScaling={false}>Next</Text>
          </Pressable>
        </View>
        <ScrollView removeClippedSubviews={false} contentContainerStyle={{ gap: 16 }}>
          {kinds.map((kind) => (
            <Pair key={kind} kind={kind} stage={stage} targets={targets} />
          ))}
        </ScrollView>
        <Text
          testID="normal-height-receipt"
          accessibilityLabel={JSON.stringify(report)}
          allowFontScaling={false}
          numberOfLines={1}
          style={{ height: 24, fontSize: 10 }}
        >
          Receipt
        </Text>
      </View>
    </ThemeProvider>
  );
}
