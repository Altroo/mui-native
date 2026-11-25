// Copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT
// Isolated retained-row regression, not a catalog screen or a performance workload.
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
  type TextInstance,
  type TextProps,
  type TextStyle,
  type ViewInstance,
} from 'react-native';
import {
  Accordion,
  AccordionSummary,
  Box,
  Button,
  ThemeProvider,
  Typography,
  createTheme,
  type BoxProps,
} from '@mui/material';

type TextLayoutEvent = Parameters<NonNullable<TextProps['onTextLayout']>>[0];
type TextLayoutLine = TextLayoutEvent['nativeEvent']['lines'][number];
type Job = { cancelled: boolean; frame?: number; timeout?: ReturnType<typeof setTimeout> };
type Mode = 'default' | 'forwarded';
type FontScenario = 'composite' | 'family' | 'variant' | 'variation';
type Id = 'a' | 'b' | 'c';
type Kind = 'inherited' | 'small' | 'large' | 'explicit' | 'default-axis';
type ControlKind = Exclude<Kind, 'inherited' | 'default-axis'>;
type CounterHandle = { bump(): void; read(): number };
type Rect = { x: number; y: number; width: number; height: number };
type Line = Pick<
  TextLayoutLine,
  'width' | 'height' | 'ascender' | 'descender' | 'capHeight' | 'xHeight'
>;
type Targets = {
  observationRevision: number;
  roots: Map<Id, ViewInstance>;
  counters: Map<Id, CounterHandle>;
  texts: Map<string, TextInstance>;
  lines: Map<string, { tag: number; revision: number; line: Line }>;
  lineRevisions: Map<string, number>;
  renders: Map<Id, number>;
};
type TextReceipt = { tag: number; lineTag: number; lineRevision: number; frame: Rect; line: Line };
type RowReceipt = {
  id: Id;
  tag: number;
  nativeType: string;
  frame: Rect;
  count: number;
  renders: number;
  text: Partial<Record<Kind, TextReceipt>>;
};
type Report = {
  schemaVersion: 1;
  development: boolean;
  fontScale: number;
  pixelRatio: number;
  mode: Mode;
  stage: number;
  naturalHeight: boolean;
  fontAttributes: boolean;
  fontScenario?: FontScenario;
  phase: 'idle' | 'sampling' | 'complete' | 'error';
  rows: RowReceipt[];
  error?: string;
};
const ids = ['a', 'b', 'c'] as const;
const kinds: readonly Kind[] = ['inherited', 'small', 'large', 'explicit'];
const variationKinds: readonly Kind[] = [...kinds, 'default-axis'];
const theme = createTheme({ motion: { reducedMotion: 'always' } });
const familyTheme = createTheme({
  motion: { reducedMotion: 'always' },
  typography: { fontFamily: 'Courier New' },
});
const paint = { a: '#ef9a9a', b: '#a5d6a7', c: '#90caf9' };
const stagePaint = [
  '#b71c1c',
  '#4a148c',
  '#006064',
  '#e65100',
  '#212121',
  '#283593',
  '#004d40',
  '#880e4f',
  '#33691e',
  '#3e2723',
];
type AxisOverride = 'light' | 'heavy' | 'inherit';
const axisOverrides: Record<AxisOverride, TextStyle | undefined> = {
  light: { fontVariationSettings: { wght: 100 } },
  heavy: { fontVariationSettings: { wght: 900 } },
  inherit: undefined,
};
// Keep fixture controls readable across profiles while the test glyphs scale normally.
function probeLabel(label: string, scenario?: FontScenario) {
  return scenario === 'variation' ? <Text allowFontScaling={false}>{label}</Text> : label;
}
const rootStyle = {
  fontSize: '16px',
  lineHeight: 1.5,
  minHeight: 96,
  '&:first-of-type': { fontSize: '24px', minHeight: 128, borderTopLeftRadius: 12 },
  '&::before': { display: 'none' },
};
// Keep numeric metrics constant so native font selection is independently observable.
const fontRootStyle = {
  ...rootStyle,
  fontSize: '20px',
  fontFamily: 'system-ui',
  fontWeight: 400,
  fontStyle: 'normal',
  fontVariant: 'small-caps',
  fontVariationSettings: "'wght' 400",
  '&:first-of-type': {
    ...rootStyle['&:first-of-type'],
    fontSize: '20px',
    fontFamily: 'serif',
    fontWeight: 700,
    fontStyle: 'italic',
    fontVariant: 'tabular-nums',
    fontVariationSettings: "'wght' 700",
  },
};
// Only the selector authors a family. The ordinary branch uses the theme family.
const familyRootStyle = {
  ...rootStyle,
  fontSize: '20px',
  '&:first-of-type': {
    ...rootStyle['&:first-of-type'],
    fontSize: '20px',
    fontFamily: 'serif',
  },
};
const variantRootStyle = {
  ...rootStyle,
  fontSize: '20px',
  fontFamily: 'system-ui',
  fontVariant: 'tabular-nums',
  '&:first-of-type': {
    ...rootStyle['&:first-of-type'],
    fontSize: '20px',
    fontVariant: 'proportional-nums',
  },
};
// Change only the variable weight axis, leaving the ordinary fontWeight fixed.
const variationRootStyle = {
  ...rootStyle,
  fontSize: '20px',
  fontFamily: 'system-ui',
  fontVariationSettings: "'wght' 100",
  '&:first-of-type': {
    ...rootStyle['&:first-of-type'],
    fontSize: '20px',
    fontVariationSettings: "'wght' 900",
  },
};
const rootFontStyles = {
  composite: fontRootStyle,
  family: familyRootStyle,
  variant: variantRootStyle,
  variation: variationRootStyle,
};
// Genuine native arrays/records reach stock Text without CSS normalization.
const nativeFontStyles = {
  small: {
    fontFamily: 'System',
    fontWeight: '400',
    fontStyle: 'normal',
    fontVariant: ['small-caps'],
    fontVariationSettings: { wght: 400 },
  },
  large: {
    fontFamily: 'Times New Roman',
    fontWeight: '700',
    fontStyle: 'italic',
    fontVariant: ['tabular-nums'],
    fontVariationSettings: { wght: 700 },
  },
  explicit: {
    fontFamily: 'System',
    fontWeight: '600',
    fontStyle: 'normal',
    fontVariant: ['lining-nums'],
    fontVariationSettings: { wght: 500 },
  },
} satisfies Record<ControlKind, TextStyle>;
const courier = { fontFamily: 'Courier New' } satisfies TextStyle;
const tabular = { fontFamily: 'System', fontVariant: ['tabular-nums'] } satisfies TextStyle;
const lightAxis = axisOverrides.light;
const fontControls: Record<FontScenario, Record<ControlKind, TextStyle>> = {
  composite: nativeFontStyles,
  family: { small: courier, large: { fontFamily: 'Times New Roman' }, explicit: courier },
  variant: {
    small: tabular,
    large: { fontFamily: 'System', fontVariant: ['proportional-nums'] },
    explicit: tabular,
  },
  variation: {
    small: { fontFamily: 'System', ...lightAxis },
    large: { fontFamily: 'System', ...axisOverrides.heavy },
    explicit: {},
  },
};
const fontGlyphs = { composite: 'Mm12', family: 'W1', variant: '111', variation: 'M1' };
const Slot = forwardRef<ViewInstance, BoxProps>(function Slot(props, ref) {
  return <Box {...props} ref={ref} />;
});
const Counter = forwardRef<CounterHandle, { id: Id; scale: boolean }>(function Counter(
  { id, scale },
  ref,
) {
  const [count, setCount] = useState(0);
  useImperativeHandle(ref, () => ({ bump: () => setCount((old) => old + 1), read: () => count }), [
    count,
  ]);
  return (
    <Text
      allowFontScaling={scale}
      testID={`accordion-metric-counter-${id}`}
      style={{ fontSize: 10, lineHeight: 14 }}
    >
      {id.toUpperCase()} {count}
    </Text>
  );
});

/** Stable props ensure a keyed reorder cannot refresh the row's captured input. */
const Row = memo(function Row({
  id,
  mode,
  targets,
  naturalHeight,
  fontScenario,
  axisOverride,
}: {
  id: Id;
  mode: Mode;
  targets: Targets;
  naturalHeight: boolean;
  fontScenario?: FontScenario;
  axisOverride: AxisOverride;
}) {
  targets.renders.set(id, (targets.renders.get(id) ?? 0) + 1);
  targets.observationRevision++;
  const rootRef = useCallback(
    (node: ViewInstance | null) => {
      if (!node) return;
      targets.observationRevision++;
      targets.roots.set(id, node);
      return () => {
        if (targets.roots.get(id) === node) {
          targets.observationRevision++;
          targets.roots.delete(id);
        }
      };
    },
    [id, targets],
  );
  const counterRef = useCallback(
    (node: CounterHandle | null) => {
      if (!node) return;
      targets.observationRevision++;
      targets.counters.set(id, node);
      return () => {
        if (targets.counters.get(id) === node) {
          targets.observationRevision++;
          targets.counters.delete(id);
        }
      };
    },
    [id, targets],
  );
  return (
    <Accordion
      ref={rootRef}
      component={mode === 'forwarded' ? Slot : undefined}
      testID={`accordion-metric-root-${id}`}
      elevation={0}
      disableGutters
      expanded
      slotProps={{ transition: { timeout: 0 } }}
      sx={
        fontScenario
          ? rootFontStyles[fontScenario]
          : naturalHeight
            ? {
                ...rootStyle,
                '&:first-of-type': { ...rootStyle['&:first-of-type'], lineHeight: 'normal' },
              }
            : rootStyle
      }
      style={{ backgroundColor: paint[id] }}
    >
      <AccordionSummary
        slotProps={{ content: { style: { margin: 0, gap: 4, alignItems: 'center' } } }}
      >
        {(fontScenario === 'variation' ? variationKinds : kinds).map((kind) => (
          <Glyph
            key={kind}
            id={id}
            kind={kind}
            targets={targets}
            naturalHeight={naturalHeight}
            fontScenario={fontScenario}
            axisOverride={axisOverride}
          />
        ))}
      </AccordionSummary>
      <Counter ref={counterRef} id={id} scale={fontScenario !== 'variation'} />
    </Accordion>
  );
});
/** Compare inherited and explicitly authored Text with independent core Text controls. */
function Glyph({
  id,
  kind,
  targets,
  naturalHeight,
  fontScenario,
  axisOverride,
}: {
  id: Id;
  kind: Kind;
  targets: Targets;
  naturalHeight: boolean;
  fontScenario?: FontScenario;
  axisOverride: AxisOverride;
}) {
  const key = id + ':' + kind;
  const ref = useCallback(
    (node: TextInstance | null) => {
      if (!node) return;
      targets.observationRevision++;
      targets.lines.delete(key);
      targets.texts.set(key, node);
      return () => {
        if (targets.texts.get(key) === node) {
          targets.observationRevision++;
          targets.texts.delete(key);
          targets.lines.delete(key);
        }
      };
    },
    [key, targets],
  );
  const onTextLayout = useCallback(
    (event: TextLayoutEvent) => {
      const source = event.currentTarget;
      const tag = typeof source === 'number' ? source : findNodeHandle(source);
      const node = targets.texts.get(key);
      // Ignore an event from a detached host instead of relabeling it with a new ref.
      if (!node || !tag || tag !== findNodeHandle(node)) return;
      targets.observationRevision++;
      const revision = (targets.lineRevisions.get(key) ?? 0) + 1;
      targets.lineRevisions.set(key, revision);
      const line = event.nativeEvent.lines[0];
      targets.lines.delete(key);
      if (!line || event.nativeEvent.lines.length !== 1) return;
      const { width, height, ascender, descender, capHeight, xHeight } = line;
      if (![width, height, ascender, descender, capHeight, xHeight].every(Number.isFinite)) return;
      targets.lines.set(key, {
        tag,
        revision,
        line: { width, height, ascender, descender, capHeight, xHeight },
      });
    },
    [key, targets],
  );
  const common = {
    ref,
    onTextLayout,
    nativeID: `accordion-metric-${key}`,
    testID: `accordion-metric-${key}`,
  };
  const checkInlineOverride =
    fontScenario !== undefined && fontScenario !== 'composite' && kind === 'explicit';
  const glyph = fontScenario ? fontGlyphs[fontScenario] : 'MMMM';
  // Independent core Text controls bypass CSS font and metric normalization.
  if (kind !== 'inherited' && !checkInlineOverride)
    return (
      <Text
        {...common}
        style={{
          width: 60,
          color: '#000',
          ...(fontScenario
            ? {
                ...(kind === 'default-axis'
                  ? { fontFamily: 'System' }
                  : fontControls[fontScenario][kind]),
                fontSize: 10,
                lineHeight: 15,
              }
            : {
                fontSize: kind === 'small' ? 8 : kind === 'large' ? 12 : 10,
                lineHeight:
                  kind === 'small' ? 12 : kind === 'large' ? (naturalHeight ? undefined : 18) : 13,
              }),
        }}
      >
        {glyph}
      </Text>
    );
  // Keep one override path in each retained row while its selector state changes.
  const variationOverride = fontScenario === 'variation' && kind === 'explicit';
  const throughView = variationOverride && id === 'b';
  const throughVirtualText = variationOverride && id === 'c';
  const inlineStyle = checkInlineOverride
    ? variationOverride
      ? axisOverrides[axisOverride]
      : fontControls[fontScenario].explicit
    : undefined;
  const text = (
    <Typography
      {...common}
      variant="inherit"
      sx={{ fontSize: '0.5em' }}
      style={{
        width: 60,
        color: '#000',
        ...(!throughView ? inlineStyle : undefined),
      }}
    >
      {throughVirtualText ? <Typography variant="inherit">{glyph}</Typography> : glyph}
    </Typography>
  );
  return throughView ? <Box style={inlineStyle}>{text}</Box> : text;
}
function measure(node: ViewInstance | TextInstance): Promise<Rect> {
  return new Promise((resolve, reject) =>
    node.measureInWindow((x, y, width, height) => {
      if (![x, y, width, height].every(Number.isFinite) || width <= 0 || height <= 0)
        reject(new Error('Invalid native metric frame'));
      else resolve({ x, y, width, height });
    }),
  );
}
async function rowReceipt(
  id: Id,
  targets: Targets,
  fontScenario?: FontScenario,
): Promise<RowReceipt> {
  const root = targets.roots.get(id),
    counter = targets.counters.get(id);
  const tag = root ? findNodeHandle(root) : null;
  if (!root || !counter || !tag) throw new Error('Detached native metric root');
  const text: RowReceipt['text'] = {};
  for (const kind of fontScenario === 'variation' ? variationKinds : kinds) {
    const key = id + ':' + kind,
      node = targets.texts.get(key),
      observation = targets.lines.get(key);
    const nativeTag = node ? findNodeHandle(node) : null;
    if (!node || !observation || !nativeTag || observation.tag !== nativeTag)
      throw new Error('Missing native glyph/line: ' + key);
    const frame = await measure(node);
    if (targets.texts.get(key) !== node || targets.lines.get(key) !== observation)
      throw new Error('Native line changed during measurement: ' + key);
    text[kind] = {
      tag: nativeTag,
      lineTag: observation.tag,
      lineRevision: observation.revision,
      frame,
      line: { ...observation.line },
    };
  }
  return {
    id,
    tag,
    nativeType: String((root as ViewInstance & { tagName?: string }).tagName ?? 'unavailable'),
    frame: await measure(root),
    count: counter.read(),
    renders: targets.renders.get(id) ?? 0,
    text,
  };
}
function Panel({
  mode,
  naturalHeight,
  fontScenario,
}: {
  mode: Mode;
  naturalHeight: boolean;
  fontScenario?: FontScenario;
}) {
  const targets = useRef<Targets>({
    observationRevision: 0,
    roots: new Map(),
    counters: new Map(),
    texts: new Map(),
    lines: new Map(),
    lineRevisions: new Map(),
    renders: new Map(),
  }).current;
  const [stage, setStage] = useState(0);
  const metadata = {
    schemaVersion: 1 as const,
    development: __DEV__,
    fontScale: PixelRatio.getFontScale(),
    pixelRatio: PixelRatio.get(),
    mode,
    stage,
    naturalHeight,
    fontAttributes: fontScenario !== undefined,
    fontScenario,
  };
  const [report, setReport] = useState<Report>({ ...metadata, phase: 'idle', rows: [] });
  const job = useRef<Job | null>(null);
  useEffect(
    () => () => {
      const current = job.current;
      if (!current) return;
      current.cancelled = true;
      if (current.frame !== undefined) cancelAnimationFrame(current.frame);
      if (current.timeout !== undefined) clearTimeout(current.timeout);
    },
    [],
  );
  const capture = () => {
    if (job.current) return;
    const current: Job = { cancelled: false };
    job.current = current;
    const started = performance.now();
    setReport({ ...metadata, phase: 'sampling', rows: [] });
    const finish = (rows: RowReceipt[], error?: unknown) => {
      if (current.cancelled || job.current !== current) return;
      current.cancelled = true;
      if (current.frame !== undefined) cancelAnimationFrame(current.frame);
      if (current.timeout !== undefined) clearTimeout(current.timeout);
      job.current = null;
      setReport({
        ...metadata,
        phase: error ? 'error' : 'complete',
        rows,
        ...(error ? { error: String(error) } : {}),
      });
    };
    let lastError: string | undefined;
    const collect = () => {
      // Every ref, counter handle and native line change advances this private
      // revision. Recheck after ALL async measurements, including root frames.
      const observed = targets.observationRevision;
      void Promise.all(ids.map((id) => rowReceipt(id, targets, fontScenario))).then(
        (rows) => {
          if (current.cancelled) return;
          if (targets.observationRevision !== observed) {
            current.frame = requestAnimationFrame(collect);
            return;
          }
          if (performance.now() - started < 300) current.frame = requestAnimationFrame(collect);
          else finish(rows);
        },
        (error: unknown) => {
          if (current.cancelled) return;
          lastError = String(error);
          current.frame = requestAnimationFrame(collect);
        },
      );
    };
    current.timeout = setTimeout(
      () =>
        finish(
          [],
          new Error('Native metric capture timed out: ' + (lastError ?? 'no complete sample')),
        ),
      5000,
    );
    current.frame = requestAnimationFrame(collect);
  };
  // Each variation row must enter the selector case at least once to test its override.
  const variation = fontScenario === 'variation';
  const order =
    (variation && stage === 8) || (variation && (stage === 1 || stage === 2))
      ? (['b', 'a', 'c'] as const)
      : stage === 3 || (!variation && (stage === 1 || stage === 2)) || stage === 9
        ? (['c', 'a', 'b'] as const)
        : ids;
  const boundaries = stage === 2 || (variation && stage === 6);
  // The first five stages keep row props stable. Only deliberate override changes rerender.
  const axisOverride: AxisOverride = stage === 5 ? 'heavy' : stage === 6 ? 'inherit' : 'light';
  const lastStage = variation ? 9 : 4;
  const sampling = report.phase === 'sampling';
  return (
    <View style={{ gap: 12 }}>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <Button
          testID="accordion-metric-bump"
          disabled={sampling}
          onClick={() => targets.counters.get('b')?.bump()}
        >
          {probeLabel('B +1', fontScenario)}
        </Button>
        <Button
          testID="accordion-metric-next"
          disabled={sampling || stage === lastStage}
          onClick={() => {
            setStage(stage + 1);
            setReport({ ...metadata, stage: stage + 1, phase: 'idle', rows: [] });
          }}
        >
          {probeLabel('Next', fontScenario)}
        </Button>
        <Button testID="accordion-metric-capture" disabled={sampling} onClick={capture}>
          {probeLabel('Capture', fontScenario)}
        </Button>
      </View>
      <View collapsable={false}>
        <View style={{ height: 6, backgroundColor: mode === 'default' ? '#ffeb3b' : '#ff9800' }} />
        <View style={{ height: 6, backgroundColor: stagePaint[stage] }} />
      </View>
      <View collapsable={false}>
        {boundaries ? (
          <View
            key="leading"
            collapsable={false}
            style={{ height: 8, backgroundColor: '#1565c0' }}
          />
        ) : null}
        {order.map((id) => (
          <Row
            key={id}
            id={id}
            mode={mode}
            targets={targets}
            naturalHeight={naturalHeight}
            fontScenario={fontScenario}
            axisOverride={axisOverride}
          />
        ))}
        {boundaries ? (
          <View
            key="trailing"
            collapsable={false}
            style={{ height: 8, backgroundColor: '#1565c0' }}
          />
        ) : null}
      </View>
      <Text
        testID="accordion-metric-receipt"
        accessibilityLabel={JSON.stringify(report)}
        numberOfLines={1}
        style={{ height: 24, fontSize: 10 }}
      >
        {report.phase}
      </Text>
    </View>
  );
}
export function AccordionTextMetricsProbe({
  naturalHeight = false,
  fontScenario,
}: { naturalHeight?: boolean; fontScenario?: FontScenario } = {}) {
  const [selection, setSelection] = useState({ mode: 'default' as Mode, epoch: 0 });
  return (
    <ThemeProvider theme={fontScenario === 'family' ? familyTheme : theme}>
      <View style={{ flex: 1, padding: 24, paddingTop: 64, backgroundColor: '#fff', gap: 12 }}>
        <Text allowFontScaling={fontScenario !== 'variation'} style={{ fontSize: 18 }}>
          {fontScenario ? 'Accordion inherited fonts' : 'Accordion inherited text metrics'}
        </Text>
        <View style={{ flexDirection: 'row', gap: 12 }}>
          {(['default', 'forwarded'] as const).map((mode) => (
            <Button
              key={mode}
              testID={`accordion-metric-mode-${mode}`}
              onClick={() => setSelection((old) => ({ mode, epoch: old.epoch + 1 }))}
            >
              {probeLabel(mode, fontScenario)}
            </Button>
          ))}
        </View>
        {naturalHeight ? (
          <Box sx={{ fontSize: '16px', lineHeight: 4 }}>
            <Panel
              key={selection.epoch}
              mode={selection.mode}
              naturalHeight
              fontScenario={fontScenario}
            />
          </Box>
        ) : (
          <Panel
            key={selection.epoch}
            mode={selection.mode}
            naturalHeight={false}
            fontScenario={fontScenario}
          />
        )}
      </View>
    </ThemeProvider>
  );
}
