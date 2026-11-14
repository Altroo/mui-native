// Copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT
import {
  forwardRef,
  memo,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from 'react';
import { findNodeHandle, PixelRatio, Text, View, type ViewInstance } from 'react-native';
import {
  Accordion,
  AccordionSummary,
  Box,
  Button,
  ThemeProvider,
  createTheme,
  type BoxProps,
} from '@mui/material';

import { ownedStructuralCases } from '@altroo/mui-native-host/internal/structural-root';

type Mode = 'default' | 'forwarded';
type Id = 'a' | 'b' | 'c';
type CounterHandle = { bump(): void; read(): number };
type Targets = {
  roots: Map<Id, ViewInstance>;
  counters: Map<Id, CounterHandle>;
};
type RowBounds = {
  id: Id;
  tag: number;
  nativeType: string;
  count: number;
  x: number;
  y: number;
  width: number;
  height: number;
};
type Report = {
  schemaVersion: 1;
  development: boolean;
  fontScale: number;
  pixelRatio: number;
  mode: Mode;
  stage: number;
  phase: 'idle' | 'sampling' | 'complete' | 'error';
  rows: RowBounds[];
  runtime?: {
    active: boolean;
    degraded: boolean;
    errors: string;
    attempts: string;
    changedCandidates: string;
  };
  error?: string;
};
type Job = { frame?: number; deadline?: ReturnType<typeof setTimeout> };
const ids = ['a', 'b', 'c'] as const;
const theme = createTheme({ motion: { reducedMotion: 'always' } });
const rootStyle = {
  '&:first-of-type': { minHeight: 80 },
  '&:last-of-type': { minHeight: 100 },
};
// Distinct opaque fills let the display-frame collector identify each physical row.
const rowPaint = {
  a: { backgroundColor: '#ef9a9a' },
  b: { backgroundColor: '#a5d6a7' },
  c: { backgroundColor: '#90caf9' },
};
const stagePaint = ['#b71c1c', '#4a148c', '#006064', '#e65100', '#212121'];
const Slot = forwardRef<ViewInstance, BoxProps>(function Slot(props, ref) {
  return <Box {...props} ref={ref} />;
});
const Counter = forwardRef<CounterHandle, { id: Id }>(function Counter({ id }, ref) {
  const [count, setCount] = useState(0);
  useImperativeHandle(ref, () => ({ bump: () => setCount((old) => old + 1), read: () => count }), [
    count,
  ]);
  return (
    <Text testID={`accordion-grouping-counter-${id}`} style={{ fontSize: 16, lineHeight: 24 }}>
      {id.toUpperCase()} {count}
    </Text>
  );
});
// Stable row props make a pure keyed reorder exercise the native tree observer,
// rather than relying on a parent rerender to recompute every root's styles.
const Row = memo(function Row({ id, mode, targets }: { id: Id; mode: Mode; targets: Targets }) {
  const rootRef = useCallback(
    (node: ViewInstance | null) => {
      if (!node) return;
      targets.roots.set(id, node);
      return () => {
        if (targets.roots.get(id) === node) targets.roots.delete(id);
      };
    },
    [id, targets],
  );
  const counterRef = useCallback(
    (node: CounterHandle | null) => {
      if (!node) return;
      targets.counters.set(id, node);
      return () => {
        if (targets.counters.get(id) === node) targets.counters.delete(id);
      };
    },
    [id, targets],
  );
  return (
    <Accordion
      ref={rootRef}
      testID={`accordion-grouping-root-${id}`}
      component={mode === 'forwarded' ? Slot : undefined}
      expanded={false}
      elevation={0}
      sx={rootStyle}
      style={rowPaint[id]}
    >
      <AccordionSummary>
        <Counter ref={counterRef} id={id} />
      </AccordionSummary>
      <Text>Retained body {id}</Text>
    </Accordion>
  );
});
const round = (value: number) => Math.round(value * 1000) / 1000;
function measure(id: Id, targets: Targets): Promise<RowBounds> {
  return new Promise((resolve, reject) => {
    const node = targets.roots.get(id),
      counter = targets.counters.get(id);
    const tag = node ? findNodeHandle(node) : null;
    if (!node || !counter || typeof tag !== 'number') {
      reject(new Error(`Detached native row ${id}`));
      return;
    }
    node.measureInWindow((x, y, width, height) => {
      if (![x, y, width, height].every(Number.isFinite) || width <= 0 || height <= 0) {
        reject(new Error(`Invalid native row bounds ${id}`));
      } else
        resolve({
          id,
          tag,
          nativeType: String(
            (node as ViewInstance & { tagName?: string }).tagName ?? 'unavailable',
          ),
          count: counter.read(),
          x: round(x),
          y: round(y),
          width: round(width),
          height: round(height),
        });
    });
  });
}
function Panel({ mode }: { mode: Mode }) {
  const targets = useRef<Targets>({ roots: new Map(), counters: new Map() }).current;
  const job = useRef<Job | null>(null);
  const [stage, setStage] = useState(0);
  const metadata = {
    schemaVersion: 1 as const,
    development: __DEV__,
    fontScale: PixelRatio.getFontScale(),
    pixelRatio: PixelRatio.get(),
    mode,
  };
  const [report, setReport] = useState<Report>({ ...metadata, stage, phase: 'idle', rows: [] });
  const cancel = (current: Job) => {
    if (current.frame !== undefined) cancelAnimationFrame(current.frame);
    if (current.deadline !== undefined) clearTimeout(current.deadline);
  };
  useEffect(
    () => () => {
      if (job.current) cancel(job.current);
      job.current = null;
    },
    [],
  );
  const capture = () => {
    if (job.current) return;
    const current: Job = {};
    job.current = current;
    setReport({ ...metadata, stage, phase: 'sampling', rows: [] });
    const finish = (rows: RowBounds[], error?: unknown) => {
      if (job.current !== current) return;
      cancel(current);
      job.current = null;
      let runtime: Report['runtime'];
      try {
        const status = ownedStructuralCases?.activation.getStatus();
        if (!status) throw new Error('Native structural runtime is unavailable');
        const activity = status as typeof status & Record<string, unknown>;
        runtime = {
          active: status.active,
          degraded: status.degraded,
          errors: status.errors,
          attempts: String(activity.attempts ?? 'unavailable'),
          changedCandidates: String(activity.changedCandidates ?? 'unavailable'),
        };
      } catch (runtimeError) {
        error ??= runtimeError;
      }
      setReport({
        ...metadata,
        stage,
        phase: error ? 'error' : 'complete',
        rows,
        ...(runtime ? { runtime } : {}),
        ...(error ? { error: String(error) } : {}),
      });
    };
    const started = performance.now();
    const collect = () => {
      void Promise.all(ids.map((id) => measure(id, targets))).then(
        (rows) => {
          if (job.current !== current) return;
          if (performance.now() - started < 300) current.frame = requestAnimationFrame(collect);
          else finish(rows);
        },
        (error: unknown) => finish([], error),
      );
    };
    current.deadline = setTimeout(
      () => finish([], new Error('Native grouping measurement timed out')),
      3000,
    );
    current.frame = requestAnimationFrame(collect);
  };
  const next = () => {
    const value = stage + 1;
    setStage(value);
    setReport({ ...metadata, stage: value, phase: 'idle', rows: [] });
  };
  const order = stage === 0 || stage === 4 ? ids : (['c', 'a', 'b'] as const);
  const sampling = report.phase === 'sampling';
  return (
    <View style={{ gap: 16 }}>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <Button
          testID="accordion-grouping-bump"
          disabled={sampling}
          onClick={() => targets.counters.get('b')?.bump()}
        >
          B +1
        </Button>
        <Button testID="accordion-grouping-next" disabled={sampling || stage === 4} onClick={next}>
          Next
        </Button>
        <Button testID="accordion-grouping-capture" disabled={sampling} onClick={capture}>
          Capture
        </Button>
      </View>
      {/* Independent commit markers identify expected mode/stage without reading row geometry. */}
      <View collapsable={false}>
        <View style={{ height: 6, backgroundColor: mode === 'default' ? '#ffeb3b' : '#ff9800' }} />
        <View style={{ height: 6, backgroundColor: stagePaint[stage] }} />
      </View>
      <View collapsable={false}>
        {stage === 2 ? (
          <View
            key="leading"
            collapsable={false}
            style={{ height: 8, backgroundColor: '#1565c0' }}
          />
        ) : null}
        {order.map((id) => (
          <Row key={id} id={id} mode={mode} targets={targets} />
        ))}
        {stage === 2 ? (
          <View
            key="trailing"
            collapsable={false}
            style={{ height: 8, backgroundColor: '#1565c0' }}
          />
        ) : null}
      </View>
      <Text
        testID="accordion-grouping-receipt"
        accessibilityLabel={JSON.stringify(report)}
        numberOfLines={1}
        style={{ height: 24 }}
      >
        {report.phase}
      </Text>
    </View>
  );
}
/** Isolated endpoint geometry and retention checks, not a first-paint timing probe. */
export function AccordionGroupingProbe() {
  const [selection, setSelection] = useState({ mode: 'default' as Mode, epoch: 0 });
  return (
    <ThemeProvider theme={theme}>
      <View style={{ flex: 1, padding: 24, paddingTop: 64, backgroundColor: '#fff', gap: 16 }}>
        <Text style={{ fontSize: 20 }}>Accordion native grouping</Text>
        <View style={{ flexDirection: 'row', gap: 12 }}>
          {(['default', 'forwarded'] as const).map((mode) => (
            <Button
              key={mode}
              testID={`accordion-grouping-mode-${mode}`}
              onClick={() => setSelection((old) => ({ mode, epoch: old.epoch + 1 }))}
            >
              {mode}
            </Button>
          ))}
        </View>
        <Panel key={selection.epoch} mode={selection.mode} />
      </View>
    </ThemeProvider>
  );
}
