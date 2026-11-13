// Copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT
import { forwardRef, useEffect, useRef, useState, type RefObject } from 'react';
import { PixelRatio, Text, View, type ViewInstance } from 'react-native';
import {
  Accordion,
  AccordionSummary,
  Box,
  Button,
  ThemeProvider,
  createTheme,
  type BoxProps,
  type ButtonBaseRootProps,
} from '@mui/material';
import { NativePressable } from '@altroo/mui-native-host';

type Mode = 'default' | 'forwarded';
type Rect = { x: number; y: number; width: number; height: number };
type Sample = { elapsed: number; height: number; contentTop: number; iconHeight: number };
type Report = {
  schemaVersion: 1;
  development: boolean;
  fontScale: number;
  mode: Mode;
  phase: 'idle' | 'sampling' | 'complete' | 'error';
  samples: Sample[];
  error?: string;
};
type Job = {
  started: number;
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
const Terminal = forwardRef<ViewInstance, ButtonBaseRootProps>(function Terminal(props, ref) {
  return <NativePressable {...props} ref={ref} />;
});
const Slot = forwardRef<ViewInstance, BoxProps>(function Slot(props, ref) {
  return <Box {...props} ref={ref} />;
});

function bounds(ref: RefObject<ViewInstance | null>): Promise<Rect> {
  return new Promise((resolve, reject) => {
    if (!ref.current) {
      reject(new Error('The native measurement target is detached'));
      return;
    }
    ref.current.measureInWindow((x, y, width, height) => {
      if (![x, y, width, height].every(Number.isFinite) || width <= 0 || height <= 0) {
        reject(new Error('The native measurement target has no finite visible bounds'));
      } else resolve({ x, y, width, height });
    });
  });
}

/** Public native bounds across a finite transition. These samples do not establish paint timing or frame deadlines. */
function Panel({ mode }: { mode: Mode }) {
  const summary = useRef<ViewInstance | null>(null);
  const content = useRef<ViewInstance | null>(null);
  const icon = useRef<ViewInstance | null>(null);
  const job = useRef<Job | null>(null);
  const [expanded, setExpanded] = useState(false);
  const metadata = {
    schemaVersion: 1 as const,
    development: __DEV__,
    fontScale: PixelRatio.getFontScale(),
  };
  const [report, setReport] = useState<Report>({
    ...metadata,
    mode,
    phase: 'idle',
    samples: [],
  });
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
    const [root, text, chevron] = await Promise.all([
      bounds(summary),
      bounds(content),
      bounds(icon),
    ]);
    return {
      height: round(root.height),
      contentTop: round(text.y - root.y),
      iconHeight: round(chevron.height),
    };
  };
  const start = () => {
    if (job.current || expanded) return;
    const current: Job = { started: 0, samples: [] };
    job.current = current;
    setReport({ ...metadata, mode, phase: 'sampling', samples: [] });
    const finish = (error?: unknown) => {
      if (job.current !== current) return;
      cancel(current);
      job.current = null;
      setReport({
        ...metadata,
        mode,
        phase: error ? 'error' : 'complete',
        samples: [...current.samples],
        ...(error ? { error: String(error) } : {}),
      });
    };
    const collect = () => {
      void measure().then((sample) => {
        if (job.current !== current) return;
        const elapsed = performance.now() - current.started;
        current.samples.push({ elapsed: round(elapsed), ...sample });
        if (elapsed < duration + 250) current.frame = requestAnimationFrame(collect);
        else finish();
      }, finish);
    };
    current.deadline = setTimeout(
      () => finish(new Error('Native bounds sampling timed out')),
      duration + 3000,
    );
    void measure().then((initial) => {
      if (job.current !== current) return;
      current.started = performance.now();
      current.samples.push({ elapsed: 0, ...initial });
      setExpanded(true);
      current.frame = requestAnimationFrame(collect);
    }, finish);
  };
  return (
    <View style={{ gap: 16 }}>
      <Button testID="accordion-motion-run" disabled={report.phase !== 'idle'} onClick={start}>
        Run transition
      </Button>
      <Accordion expanded={expanded} elevation={0}>
        <AccordionSummary
          ref={summary}
          testID="accordion-motion-summary"
          component={mode === 'forwarded' ? Terminal : undefined}
          expandIcon={<View style={{ width: 20, height: 8, backgroundColor: '#1565c0' }} />}
          slotProps={{
            content: { ref: content, ...(mode === 'forwarded' ? { component: Slot } : {}) },
            expandIconWrapper: { ref: icon, ...(mode === 'forwarded' ? { component: Slot } : {}) },
          }}
        >
          <Text style={{ fontSize: 16, lineHeight: 24 }}>Summary</Text>
        </AccordionSummary>
        <Text style={{ padding: 16 }}>Retained body</Text>
      </Accordion>
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

/** Isolated native fixture, registered by its collector rather than the catalog navigation. */
export function AccordionMotionProbe() {
  const [selection, setSelection] = useState({ mode: 'default' as Mode, epoch: 0 });
  return (
    <ThemeProvider theme={theme}>
      <View style={{ flex: 1, padding: 24, paddingTop: 64, backgroundColor: '#fff', gap: 16 }}>
        <Text style={{ fontSize: 20 }}>Accordion native motion</Text>
        <View style={{ flexDirection: 'row', gap: 12 }}>
          {(['default', 'forwarded'] as const).map((mode) => (
            <Button
              key={mode}
              testID={`accordion-motion-mode-${mode}`}
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
