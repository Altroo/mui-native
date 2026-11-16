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
import {
  findNodeHandle,
  PixelRatio,
  Text,
  View,
  type ViewInstance,
  type TextInstance,
} from 'react-native';
import {
  Accordion,
  AccordionSummary,
  Box,
  Button,
  CircularProgress,
  LinearProgress,
  Typography,
  ThemeProvider,
  createTheme,
  type BoxProps,
} from '@mui/material';

import { ownedStructuralCases } from '@altroo/mui-native-host/internal/structural-root';

type Mode = 'default' | 'forwarded';
type Scenario = 'position' | 'adjacency';
type BoundaryPeer = 'view' | 'progress';
type Id = 'a' | 'b' | 'c';
type CounterHandle = { bump(): void; read(): number };
type Targets = {
  roots: Map<Id, ViewInstance>;
  counters: Map<Id, CounterHandle>;
  boundary: ViewInstance | null;
  glyphs: Map<Id, TextInstance>;
};
type RowBounds = {
  id: Id;
  tag: number;
  nativeType: string;
  ornamentNativeType: string;
  count: number;
  glyphTag: number | null;
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
  scenario: Scenario;
  textPaint: boolean;
  boundaryPeer: 'view' | 'circular' | 'linear';
  boundary?: { kind: string; nativeType: string; tag: number | null };
  stage: number;
  phase: 'idle' | 'sampling' | 'complete' | 'error';
  rows: RowBounds[];
  runtime?: {
    parentSelectors: boolean;
    peerSelectors: boolean;
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
  // Magnify the source ornament without overriding its display/opacity states.
  '&::before': { height: 4, backgroundColor: '#ff00ff' },
  '&:first-of-type': { minHeight: 80 },
  '&:last-of-type': { minHeight: 100 },
};
// Reordering changes inherited color while ordinary View geometry stays eligible.
// The fixed green sibling is a paint control independent of conditional text.
const textRootStyle = {
  ...rootStyle,
  color: '#0000ff',
  '&:first-of-type': { ...rootStyle['&:first-of-type'], color: '#ff0000' },
};
// Reveal source display suppression independently of expanded opacity. All
// matched rows share this programme; a changed peer adds its own CSS class.
const adjacencyStyle = {
  '&::before': { height: 4, backgroundColor: '#ff00ff', opacity: 1 },
  '&.Mui-expanded::before': { opacity: 1 },
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
const Counter = forwardRef<CounterHandle, { id: Id; textPaint: boolean }>(function Counter(
  { id, textPaint },
  ref,
) {
  const [count, setCount] = useState(0);
  useImperativeHandle(ref, () => ({ bump: () => setCount((old) => old + 1), read: () => count }), [
    count,
  ]);
  return (
    <Text
      testID={`accordion-grouping-counter-${id}`}
      style={{ fontSize: 16, lineHeight: 24, ...(textPaint ? { width: 32 } : {}) }}
    >
      {id.toUpperCase()} {count}
    </Text>
  );
});
// Stable row props make a pure keyed reorder exercise the native tree observer,
// rather than relying on a parent rerender to recompute every root's styles.
const Row = memo(function Row({
  id,
  mode,
  scenario,
  differentClass,
  textPaint,
  targets,
}: {
  id: Id;
  mode: Mode;
  scenario: Scenario;
  differentClass: boolean;
  textPaint: boolean;
  targets: Targets;
}) {
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
  const glyphRef = useCallback(
    (node: TextInstance | null) => {
      if (!node) return;
      targets.glyphs.set(id, node);
      return () => {
        if (targets.glyphs.get(id) === node) targets.glyphs.delete(id);
      };
    },
    [id, targets],
  );
  return (
    <Accordion
      ref={rootRef}
      testID={`accordion-grouping-root-${id}`}
      component={mode === 'forwarded' ? Slot : undefined}
      expanded={scenario === 'adjacency'}
      elevation={0}
      sx={
        scenario === 'position'
          ? textPaint
            ? textRootStyle
            : rootStyle
          : differentClass
            ? { ...adjacencyStyle, paddingTop: '3px' }
            : adjacencyStyle
      }
      style={rowPaint[id]}
    >
      <AccordionSummary>
        <Counter ref={counterRef} id={id} textPaint={textPaint} />
        {textPaint ? (
          <>
            <Typography
              ref={glyphRef}
              variant="inherit"
              testID={`accordion-text-glyph-${id}`}
              sx={{ fontSize: 16, lineHeight: '24px' }}
              style={{ width: 64 }}
            >
              MMMM
            </Typography>
            <Typography
              variant="inherit"
              testID={`accordion-text-control-${id}`}
              sx={{ fontSize: 16, lineHeight: '24px' }}
              style={{ width: 64, color: '#00aa00' }}
            >
              MMMM
            </Typography>
            <Typography
              variant="inherit"
              testID={`accordion-text-explicit-${id}`}
              sx={{ fontSize: 16, lineHeight: '24px' }}
              style={{ width: 64, color: '#0000ff' }}
            >
              MMMM
            </Typography>
          </>
        ) : null}
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
          ornamentNativeType: String(
            Array.from(
              (
                node as ViewInstance & {
                  children?: ArrayLike<{ id?: string; tagName?: string }>;
                }
              ).children ?? [],
            ).find((child) => child.id === 'altroo:accordion-before:v1:')?.tagName ?? 'unavailable',
          ),
          count: counter.read(),
          glyphTag: findNodeHandle(targets.glyphs.get(id) ?? null) ?? null,
          x: round(x),
          y: round(y),
          width: round(width),
          height: round(height),
        });
    });
  });
}
function Panel({
  mode,
  scenario,
  boundaryPeer,
  textPaint,
}: {
  mode: Mode;
  scenario: Scenario;
  boundaryPeer: BoundaryPeer;
  textPaint: boolean;
}) {
  const targets = useRef<Targets>({
    roots: new Map(),
    counters: new Map(),
    boundary: null,
    glyphs: new Map(),
  }).current;
  const job = useRef<Job | null>(null);
  const [stage, setStage] = useState(0);
  const metadata = {
    schemaVersion: 1 as const,
    development: __DEV__,
    fontScale: PixelRatio.getFontScale(),
    pixelRatio: PixelRatio.get(),
    mode,
    scenario,
    textPaint,
    boundaryPeer:
      boundaryPeer === 'progress'
        ? mode === 'default'
          ? ('circular' as const)
          : ('linear' as const)
        : ('view' as const),
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
          parentSelectors: ownedStructuralCases?.parentSelectors === true,
          peerSelectors: ownedStructuralCases?.peerSelectors === true,
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
        ...(targets.boundary
          ? {
              boundary: {
                kind: metadata.boundaryPeer,
                nativeType: String(
                  (targets.boundary as ViewInstance & { tagName?: string }).tagName ??
                    'unavailable',
                ),
                tag: findNodeHandle(targets.boundary) ?? null,
              },
            }
          : {}),
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
  const order =
    scenario === 'adjacency' || stage === 0 || stage === 4 ? ids : (['c', 'a', 'b'] as const);
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
        {scenario === 'position' && stage === 2 ? (
          <View
            key="leading"
            collapsable={false}
            style={{ height: 8, backgroundColor: '#1565c0' }}
          />
        ) : null}
        {order.map((id) => (
          <ViewBoundaryRow
            key={id}
            id={id}
            mode={mode}
            scenario={scenario}
            boundaryPeer={boundaryPeer}
            textPaint={textPaint}
            stage={stage}
            targets={targets}
          />
        ))}
        {scenario === 'position' && stage === 2 ? (
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
// A real intervening host breaks adjacency without remounting keyed rows.
function ViewBoundaryRow({
  id,
  mode,
  scenario,
  boundaryPeer,
  textPaint,
  stage,
  targets,
}: {
  id: Id;
  mode: Mode;
  scenario: Scenario;
  boundaryPeer: BoundaryPeer;
  textPaint: boolean;
  stage: number;
  targets: Targets;
}) {
  const boundaryRef = useCallback(
    (node: ViewInstance | null) => {
      targets.boundary = node;
      return () => {
        if (targets.boundary === node) targets.boundary = null;
      };
    },
    [targets],
  );
  return (
    <>
      {scenario === 'adjacency' && stage === 3 && id === 'b' ? (
        boundaryPeer === 'progress' ? (
          mode === 'default' ? (
            <CircularProgress
              ref={boundaryRef}
              testID="accordion-grouping-boundary"
              className="Mui-expanded"
              size={8}
              variant="determinate"
              value={25}
              // Its inline size/rotation outrank sx, matching MUI. Author the
              // full-width horizontal band needed by the independent paint scan.
              style={{ width: '100%', transform: [] }}
              sx={{ height: 8, backgroundColor: '#1565c0' }}
            />
          ) : (
            <LinearProgress
              ref={boundaryRef}
              testID="accordion-grouping-boundary"
              className="Mui-expanded"
              variant="determinate"
              value={25}
              sx={{ height: 8, backgroundColor: '#1565c0' }}
            />
          )
        ) : (
          <View
            ref={boundaryRef}
            testID="accordion-grouping-boundary"
            collapsable={false}
            style={{ height: 8, backgroundColor: '#1565c0' }}
          />
        )
      ) : null}
      <Row
        id={id}
        mode={mode}
        scenario={scenario}
        differentClass={scenario === 'adjacency' && stage === 1 && id === 'b'}
        textPaint={textPaint}
        targets={targets}
      />
    </>
  );
}
/** Independent native geometry, retention and source-class paint scenarios. */
export function AccordionGroupingProbe({
  scenario = 'position',
  boundaryPeer = 'view',
  textPaint = false,
}: { scenario?: Scenario; boundaryPeer?: BoundaryPeer; textPaint?: boolean } = {}) {
  const [selection, setSelection] = useState({ mode: 'default' as Mode, epoch: 0 });
  return (
    <ThemeProvider theme={theme}>
      <View style={{ flex: 1, padding: 24, paddingTop: 64, backgroundColor: '#fff', gap: 16 }}>
        <Text style={{ fontSize: 20 }}>Accordion native {scenario}</Text>
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
        <Panel
          key={selection.epoch}
          mode={selection.mode}
          scenario={scenario}
          boundaryPeer={boundaryPeer}
          textPaint={textPaint}
        />
      </View>
    </ThemeProvider>
  );
}
