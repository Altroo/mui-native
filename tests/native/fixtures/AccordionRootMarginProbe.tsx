// Copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT
// A keyed native boundary changes position without rerendering the retained row.
import {
  forwardRef,
  memo,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
  type RefObject,
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
type Rect = { x: number; y: number; width: number; height: number };
type CounterHandle = { bump(): void; read(): number };
type Sample = {
  elapsed: number;
  stage: number;
  top: number;
  bottom: number;
  height: number;
  rootTag: number;
  boundaryTag: number;
  boundaryBefore: number;
  counter: number;
};
type Report = {
  schemaVersion: 1;
  scenario: 'root-reorder';
  development: boolean;
  fontScale: number;
  mode: Mode;
  peerSelectors: boolean;
  phase: 'idle' | 'sampling' | 'complete' | 'error';
  samples: Sample[];
  runtime?: { active: boolean; degraded: boolean; errors: string };
  nativeType?: string;
  error?: string;
};
type Job = {
  started: number;
  stage: number;
  changedAt: number;
  samples: Sample[];
  frame?: number;
  deadline?: ReturnType<typeof setTimeout>;
};
const duration = 900;
const theme = createTheme({
  motion: { reducedMotion: 'never' },
  transitions: { duration: { shortest: duration }, easing: { easeInOut: 'linear' } },
});
const round = (value: number) => Math.round(value * 1000) / 1000;
const Slot = forwardRef<ViewInstance, BoxProps>(function Slot(props, ref) {
  return <Box {...props} ref={ref} />;
});
const Counter = forwardRef<CounterHandle>(function Counter(_, ref) {
  const [count, setCount] = useState(0);
  useImperativeHandle(
    ref,
    () => ({ bump: () => setCount((value) => value + 1), read: () => count }),
    [count],
  );
  return (
    <Text testID="accordion-motion-counter" style={{ fontSize: 16, lineHeight: 24 }}>
      Retained {count}
    </Text>
  );
});
const Row = memo(function Row({
  mode,
  root,
  counter,
}: {
  mode: Mode;
  root: RefObject<ViewInstance | null>;
  counter: RefObject<CounterHandle | null>;
}) {
  return (
    <Accordion
      ref={root}
      expanded
      elevation={0}
      style={{ height: 140 }}
      slotProps={mode === 'forwarded' ? { root: { as: Slot } } : undefined}
    >
      <AccordionSummary>Retained panel</AccordionSummary>
      <Counter ref={counter} />
    </Accordion>
  );
});
function bounds(ref: RefObject<ViewInstance | null>): Promise<Rect> {
  return new Promise((resolve, reject) => {
    if (!ref.current) {
      reject(new Error('The native measurement target is detached'));
      return;
    }
    ref.current.measureInWindow((x, y, width, height) => {
      if (![x, y, width, height].every(Number.isFinite) || width <= 0 || height <= 0)
        reject(new Error('The native target has no finite visible bounds'));
      else resolve({ x, y, width, height });
    });
  });
}
function Panel({ mode }: { mode: Mode }) {
  const root = useRef<ViewInstance | null>(null),
    boundary = useRef<ViewInstance | null>(null),
    parent = useRef<ViewInstance | null>(null),
    counter = useRef<CounterHandle | null>(null);
  const job = useRef<Job | null>(null);
  const [before, setBefore] = useState(true);
  const metadata = {
    schemaVersion: 1 as const,
    scenario: 'root-reorder' as const,
    development: __DEV__,
    fontScale: PixelRatio.getFontScale(),
    mode,
    peerSelectors: ownedStructuralCases?.peerSelectors === true,
  };
  const [report, setReport] = useState<Report>({ ...metadata, phase: 'idle', samples: [] });
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
  const measure = async () => {
    const [panel, blue, container] = await Promise.all([
      bounds(root),
      bounds(boundary),
      bounds(parent),
    ]);
    const preceding = blue.y < panel.y;
    const rootTag = findNodeHandle(root.current),
      boundaryTag = findNodeHandle(boundary.current);
    if (rootTag == null || boundaryTag == null || !counter.current)
      throw new Error('A retained native target detached');
    // Infer boundary placement from native bounds, independently of JS state.
    return {
      top: round(panel.y - container.y - (preceding ? blue.height : 0)),
      bottom: round(
        container.y + container.height - panel.y - panel.height - (preceding ? 0 : blue.height),
      ),
      height: round(panel.height),
      rootTag,
      boundaryTag,
      boundaryBefore: preceding ? 1 : 0,
      counter: counter.current.read(),
    };
  };
  const start = () => {
    if (job.current || report.phase !== 'idle') return;
    const current: Job = { started: 0, stage: 0, changedAt: 0, samples: [] };
    job.current = current;
    setReport({ ...metadata, phase: 'sampling', samples: [] });
    const finish = (error?: unknown) => {
      if (job.current !== current) return;
      cancel(current);
      job.current = null;
      let runtime: Report['runtime'];
      try {
        const status = ownedStructuralCases?.activation.getStatus();
        if (!status) throw new Error('The native structural runtime is unavailable');
        runtime = { active: status.active, degraded: status.degraded, errors: status.errors };
      } catch (reason) {
        error ??= reason;
      }
      setReport({
        ...metadata,
        ...(runtime ? { runtime } : {}),
        nativeType:
          (root.current as (ViewInstance & { tagName?: string }) | null)?.tagName ?? 'unknown',
        phase: error ? 'error' : 'complete',
        samples: [...current.samples],
        ...(error ? { error: String(error) } : {}),
      });
    };
    const collect = () => {
      void measure().then((sample) => {
        if (job.current !== current) return;
        const elapsed = performance.now() - current.started;
        current.samples.push({ elapsed: round(elapsed), stage: current.stage, ...sample });
        if (
          current.stage === 1 &&
          elapsed - current.changedAt >= duration + 150 &&
          sample.boundaryBefore === 0 &&
          Math.abs(sample.top) <= 1 &&
          Math.abs(sample.bottom - 16) <= 1
        ) {
          current.stage = 2;
          current.changedAt = elapsed;
          setBefore(true);
        } else if (
          current.stage === 2 &&
          sample.boundaryBefore === 1 &&
          sample.top >= 4 &&
          sample.top <= 12 &&
          sample.bottom >= 4 &&
          sample.bottom <= 12
        ) {
          // Reverse only after observing an intermediate native presentation.
          current.stage = 3;
          current.changedAt = elapsed;
          setBefore(false);
        } else if (current.stage === 3 && elapsed - current.changedAt >= duration + 150) {
          finish();
          return;
        }
        current.frame = requestAnimationFrame(collect);
      }, finish);
    };
    current.deadline = setTimeout(
      () => finish(new Error('Root-margin sampling timed out')),
      duration * 5 + 3000,
    );
    void measure().then((initial) => {
      if (job.current !== current) return;
      current.started = performance.now();
      current.samples.push({ elapsed: 0, stage: 0, ...initial });
      current.stage = 1;
      setBefore(false);
      current.frame = requestAnimationFrame(collect);
    }, finish);
  };
  const blue = (
    <View
      key="boundary"
      ref={boundary}
      testID="accordion-motion-boundary"
      style={{ height: 8, backgroundColor: '#1565c0' }}
    />
  );
  return (
    <View style={{ gap: 16 }}>
      <View style={{ flexDirection: 'row', gap: 12 }}>
        <Button testID="accordion-motion-prime" onClick={() => counter.current?.bump()}>
          Prime counter
        </Button>
        <Button testID="accordion-motion-run" onClick={start} disabled={report.phase !== 'idle'}>
          Run reorder
        </Button>
      </View>
      <View ref={parent}>
        {before ? blue : null}
        <Row key="panel" mode={mode} root={root} counter={counter} />
        {before ? null : blue}
      </View>
      <Text
        testID="accordion-motion-receipt"
        accessibilityLabel={JSON.stringify(report)}
        numberOfLines={1}
        style={{ height: 24 }}
      >
        {report.phase}
      </Text>
    </View>
  );
}
/** Bounded native geometry only; this does not establish every painted frame. */
export function AccordionRootMarginProbe() {
  const [selection, setSelection] = useState({ mode: 'default' as Mode, epoch: 0 });
  return (
    <ThemeProvider theme={theme}>
      <View style={{ flex: 1, padding: 24, paddingTop: 64, backgroundColor: '#fff', gap: 16 }}>
        <Text style={{ fontSize: 20 }}>Accordion root margins</Text>
        <View style={{ flexDirection: 'row', gap: 12 }}>
          {(['default', 'forwarded'] as const).map((mode) => (
            <Button
              key={mode}
              testID={'accordion-motion-mode-' + mode}
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
