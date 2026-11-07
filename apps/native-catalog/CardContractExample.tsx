// Copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT
import {
  forwardRef,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type RefCallback,
} from 'react';
import {
  Pressable,
  Text,
  View,
  useWindowDimensions,
  type GestureResponderEvent,
  type TextInstance,
  type ViewInstance,
  type ViewProps,
} from 'react-native';
import {
  Card,
  Typography,
  ThemeProvider,
  createTheme,
  type CardProps,
  type Theme,
} from '@mui/material';

// Authored inputs only. The independent private protocol owns paint/geometry expectations.
const initial = {
  name: 'default',
  raisedInput: 'absent',
  elevationInput: 'absent',
  paperDefault: false,
  cardDefault: false,
  dark: false,
  square: false,
  outlined: false,
  themeSx: false,
  nativeReset: false,
} as const;
export const cardContractStates = [
  initial,
  { ...initial, name: 'raised', raisedInput: 'true' },
  { ...initial, name: 'explicit-zero', raisedInput: 'true', elevationInput: 'zero' },
  { ...initial, name: 'explicit-three', raisedInput: 'true', elevationInput: 'three' },
  { ...initial, name: 'explicit-undefined', raisedInput: 'true', elevationInput: 'undefined' },
  {
    ...initial,
    name: 'paper-default',
    raisedInput: 'true',
    elevationInput: 'undefined',
    paperDefault: true,
  },
  {
    ...initial,
    name: 'card-default',
    elevationInput: 'undefined',
    paperDefault: true,
    cardDefault: true,
  },
  { ...initial, name: 'dark-raised', raisedInput: 'true', dark: true },
  { ...initial, name: 'outlined-raised', raisedInput: 'true', outlined: true },
  { ...initial, name: 'square', square: true },
  { ...initial, name: 'theme-sx', raisedInput: 'true', themeSx: true },
  {
    ...initial,
    name: 'native-reset',
    raisedInput: 'true',
    themeSx: true,
    nativeReset: true,
    dark: true,
  },
  { ...initial, name: 'restored' },
] as const;
export const cardContractKeys = ['stock', 'custom'] as const;
export const cardNativeReset = {
  padding: 16,
  borderWidth: 0,
  borderRadius: 2,
  boxShadow: 'none',
  backgroundImage: [],
  backgroundColor: '#243447',
  color: '#f5f7fa',
  fontSize: 22,
  lineHeight: 30,
} as const;
export const cardProbeKeys = ['theme', 'owner', 'as'] as const;
export const cardProbeInputs = {
  theme: {
    providerOpacity: 0.2,
    explicitOpacity: 0.7,
    paperProviderBackground: '#1565c0',
    unusedExplicitPaperBackground: '#b71c1c',
    elevation: 0,
  },
  owner: {
    marker: 'authored',
    matchedBackground: '#0b5d44',
    unmatchedBackground: '#b71c1c',
    elevation: 0,
  },
  as: {
    background: '#4527a0',
    elevation: 0,
    paperTrapStyle: { padding: 40, borderRadius: 17, opacity: 0.2 },
    originalHostID: 'card-contract-probe-as-original',
    alternateHostID: 'card-contract-probe-as-alternate',
  },
} as const;
type ProbeKey = (typeof cardProbeKeys)[number];
type Key = (typeof cardContractKeys)[number];
type Target = Key | `${Key}-text` | `probe-${ProbeKey}`;
type NativeNode = ViewInstance | TextInstance;
type Frame = { x: number; y: number; width: number; height: number };
type Receipt = { window: Frame; request: number; state: number; generation: number };
type Receipts = Partial<Record<Key | ProbeKey, Receipt>>;
const targets: Target[] = [
  ...cardContractKeys.flatMap((key): Target[] => [key, `${key}-text`]),
  ...cardProbeKeys.map((key): Target => `probe-${key}`),
];
const textTarget = (key: Key): Target => `${key}-text`;
const finiteFrame = (frame: Frame) =>
  Object.values(frame).every(Number.isFinite) && frame.width > 0 && frame.height > 0;
const CustomRoot = forwardRef<ViewInstance, ViewProps & { className?: string; tone: 'quiet' }>(
  ({ className: _className, tone, ...props }, ref) => (
    <View {...props} accessibilityHint={tone} ref={ref} />
  ),
);
const AlternateProbeRoot = forwardRef<
  ViewInstance,
  ViewProps & { className?: string; component?: unknown; elevation?: number; probe?: ProbeKey }
>(
  (
    {
      className: _className,
      component: _component,
      elevation: _elevation,
      probe: _probe,
      ...native
    },
    ref,
  ) => (
    <View
      {...native}
      testID="card-contract-probe-as-alternate"
      nativeID="card-contract-probe-as-alternate"
      ref={ref}
    />
  ),
);
const ProbeRoot = forwardRef<
  ViewInstance,
  ViewProps & {
    className?: string;
    probe: ProbeKey;
    theme?: Theme | undefined;
    as?: typeof AlternateProbeRoot | 'div' | null | undefined;
    ownerState?: { marker: string } | null | undefined;
  }
>(({ className: _className, probe, ...native }, ref) => (
  <View
    {...native}
    testID={probe === 'as' ? 'card-contract-probe-as-original' : native.testID}
    nativeID={probe === 'as' ? 'card-contract-probe-as-original' : native.nativeID}
    ref={ref}
  />
));
function Counter({
  id,
  onCount,
  color,
}: {
  id: Key;
  onCount: (value: number) => void;
  color: string;
}) {
  const [count, setCount] = useState(0);
  useEffect(() => onCount(count), [count, onCount]);
  return (
    <Pressable
      testID={`card-contract-${id}-counter`}
      accessible
      accessibilityRole="button"
      accessibilityLabel={`${id} ${count}`}
      onPress={() => setCount((value) => value + 1)}
      style={{
        minWidth: 44,
        minHeight: 44,
        padding: 8,
        justifyContent: 'center',
        alignItems: 'center',
      }}
    >
      <Text allowFontScaling style={{ fontSize: 14, color }}>
        {id} {count}
      </Text>
    </Pressable>
  );
}
function Control({
  id,
  children,
  onPress,
}: {
  id: 'next' | 'measure';
  children: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      testID={`card-contract-${id}`}
      accessibilityRole="button"
      onPress={onPress}
      style={{
        minWidth: 44,
        minHeight: 44,
        maxWidth: '100%',
        flexShrink: 1,
        paddingHorizontal: 12,
        paddingVertical: 8,
        justifyContent: 'center',
        backgroundColor: '#e6ebf0',
      }}
    >
      <Text allowFontScaling style={{ color: '#203247', fontSize: 14 }}>
        {children}
      </Text>
    </Pressable>
  );
}
/** Two retained Card roots and seven fresh native measurements, with no JS paint oracle. */
export function CardContractExample() {
  const [state, setState] = useState(0),
    [request, setRequest] = useState(0),
    [refRevision, setRefRevision] = useState(0);
  const [counts, setCounts] = useState<Record<Key, number>>({ stock: 0, custom: 0 });
  const [receipts, setReceipts] = useState<Receipts>({}),
    [textReceipts, setTextReceipts] = useState<Receipts>({}),
    [probeReceipts, setProbeReceipts] = useState<Receipts>({});
  const [touch, setTouch] = useState<{
    count: number;
    target: number | undefined;
    pageX: number;
    pageY: number;
    timestamp: number;
  }>();
  const input = cardContractStates[state],
    { fontScale, width, height, scale } = useWindowDimensions();
  const config = useMemo(
    () => ({}),
    [state, fontScale, width, height, scale, refRevision, counts.stock, counts.custom],
  );
  const active = useRef<object | null>(config),
    mounted = useRef(true),
    currentRequest = useRef(0);
  const nodes = useRef<Partial<Record<Target, NativeNode>>>({}),
    first = useRef<Partial<Record<Target, NativeNode>>>({});
  const lifecycle = useRef(
    Object.fromEntries(
      targets.map((key) => [key, { attached: 0, cleaned: 0, generation: 0 }]),
    ) as Record<Target, { attached: number; cleaned: number; generation: number }>,
  );
  useLayoutEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      active.current = null;
    };
  }, []);
  useLayoutEffect(() => {
    active.current = config;
    setReceipts({});
    setTextReceipts({});
    setProbeReceipts({});
    return () => {
      if (active.current === config) active.current = null;
    };
  }, [config]);
  const refs = useMemo(
    () =>
      Object.fromEntries(
        targets.map((key) => {
          const revised = () => {
            active.current = null;
            if (mounted.current) setRefRevision((value) => value + 1);
          };
          const callback: RefCallback<NativeNode> = (node) => {
            const release = () => {
              if (!nodes.current[key]) return;
              delete nodes.current[key];
              lifecycle.current[key].cleaned++;
              lifecycle.current[key].generation++;
              revised();
            };
            if (!node) {
              release();
              return;
            }
            nodes.current[key] = node;
            first.current[key] ??= node;
            lifecycle.current[key].attached++;
            lifecycle.current[key].generation++;
            revised();
            return () => {
              if (nodes.current[key] === node) release();
            };
          };
          return [key, callback];
        }),
      ) as Record<Target, RefCallback<NativeNode>>,
    [],
  );
  const onCounts = useMemo(
    () =>
      Object.fromEntries(
        cardContractKeys.map((key) => [
          key,
          (value: number) =>
            setCounts((previous) =>
              previous[key] === value ? previous : { ...previous, [key]: value },
            ),
        ]),
      ) as Record<Key, (value: number) => void>,
    [],
  );
  const measure = () => {
    const next = ++currentRequest.current;
    setRequest(next);
    setReceipts({});
    setTextReceipts({});
    setProbeReceipts({});
    for (const target of targets) {
      const node = nodes.current[target],
        generation = lifecycle.current[target].generation;
      const current = () =>
        mounted.current &&
        active.current === config &&
        currentRequest.current === next &&
        nodes.current[target] === node &&
        lifecycle.current[target].generation === generation;
      node?.measureInWindow((x, y, width, height) => {
        const window = { x, y, width, height };
        if (!current() || !finiteFrame(window)) return;
        const probe = target.startsWith('probe-');
        const key = (probe ? target.slice(6) : target.replace(/-text$/, '')) as Key | ProbeKey,
          update = probe
            ? setProbeReceipts
            : target.endsWith('-text')
              ? setTextReceipts
              : setReceipts;
        // React may defer an updater beyond the callback's first freshness check.
        update((previous) =>
          current()
            ? { ...previous, [key]: { window, request: next, state, generation } }
            : previous,
        );
      });
    }
  };
  const onTouchEnd = useCallback((event: GestureResponderEvent) => {
    // Retain the first real raw event only, including if a later reveal-scroll
    // legitimately bubbles another touchEnd. count=1 is not a lifetime total.
    const captured = {
      count: 1,
      target: event.nativeEvent.target,
      pageX: event.nativeEvent.pageX,
      pageY: event.nativeEvent.pageY,
      timestamp: event.timeStamp,
    };
    setTouch((previous) => previous ?? captured);
  }, []);
  const theme = useMemo(
    () =>
      createTheme({
        palette: {
          mode: input.dark ? 'dark' : 'light',
          primary: { main: '#0b5d44' },
          background: { paper: input.dark ? '#121212' : '#ffffff' },
          text: { primary: input.dark ? '#ffffff' : '#203247' },
        },
        components: {
          MuiPaper: {
            ...(input.paperDefault
              ? { defaultProps: { elevation: 5, classes: { root: 'qa-paper-default' } } }
              : {}),
            ...(input.themeSx
              ? {
                  styleOverrides: {
                    root: {
                      padding: 8,
                      backgroundColor: '#e6ebf0',
                      color: '#203247',
                      fontSize: '20px',
                      lineHeight: '28px',
                    },
                  },
                }
              : {}),
          },
          MuiCard: {
            ...(input.cardDefault
              ? {
                  defaultProps: {
                    raised: true,
                    elevation: 3,
                    classes: { root: 'qa-card-default' },
                  },
                }
              : {}),
            ...(input.themeSx
              ? {
                  styleOverrides: {
                    root: {
                      padding: 20,
                      backgroundColor: '#1565c0',
                      color: '#ffffff',
                      fontSize: '20px',
                      lineHeight: '28px',
                    },
                  },
                }
              : {}),
          },
        },
      }),
    [input.dark, input.paperDefault, input.cardDefault, input.themeSx],
  );
  const probeThemes = useMemo(
    () => ({
      provider: createTheme({
        components: {
          MuiCard: { styleOverrides: { root: { opacity: cardProbeInputs.theme.providerOpacity } } },
          MuiPaper: {
            styleOverrides: {
              root: { backgroundColor: cardProbeInputs.theme.paperProviderBackground },
            },
          },
        },
      }),
      explicit: createTheme({
        components: {
          MuiCard: { styleOverrides: { root: { opacity: cardProbeInputs.theme.explicitOpacity } } },
          MuiPaper: {
            styleOverrides: {
              root: { backgroundColor: cardProbeInputs.theme.unusedExplicitPaperBackground },
            },
          },
        },
      }),
      owner: createTheme({
        components: {
          MuiCard: {
            styleOverrides: {
              root: ({ ownerState }) => ({
                backgroundColor:
                  ownerState?.marker === cardProbeInputs.owner.marker
                    ? cardProbeInputs.owner.matchedBackground
                    : cardProbeInputs.owner.unmatchedBackground,
              }),
            },
          },
        },
      }),
      as: createTheme({
        components: {
          MuiCard: { styleOverrides: { root: { backgroundColor: cardProbeInputs.as.background } } },
          MuiPaper: {
            defaultProps: {
              nativeID: cardProbeInputs.as.originalHostID,
              style: cardProbeInputs.as.paperTrapStyle,
            },
          },
        },
      }),
    }),
    [],
  );
  const probeOwnerState = useMemo(
    () => Object.freeze({ marker: cardProbeInputs.owner.marker }),
    [],
  );
  const probeSx = { width: '80px', minHeight: '44px', p: 0 } as const;
  const cardProps: Pick<CardProps, 'raised' | 'elevation' | 'variant' | 'square'> = {
    ...(input.raisedInput === 'absent' ? {} : { raised: input.raisedInput === 'true' }),
    ...(input.elevationInput === 'absent'
      ? {}
      : {
          elevation:
            input.elevationInput === 'zero' ? 0 : input.elevationInput === 'three' ? 3 : undefined,
        }),
    ...(input.outlined ? { variant: 'outlined' } : {}),
    ...(input.square ? { square: true } : {}),
  };
  const rootSx = [
    false,
    null,
    (selected: Theme) => ({
      minHeight: 88,
      p: 2,
      fontSize: '16px',
      lineHeight: '24px',
      ...(input.themeSx
        ? {
            p: 2,
            bgcolor: selected.palette.primary.main,
            color: '#ffffff',
            fontSize: '18px',
            lineHeight: '26px',
          }
        : {}),
    }),
  ] as const;
  const nativeStyle = input.nativeReset ? cardNativeReset : undefined;
  const counterColor = input.nativeReset
    ? '#f5f7fa'
    : input.themeSx || input.dark
      ? '#ffffff'
      : '#203247';
  const children = (key: Key) => (
    <>
      <Counter key={`counter-${key}`} id={key} onCount={onCounts[key]} color={counterColor} />
      <Typography
        key={`copy-${key}`}
        variant="inherit"
        testID={`card-contract-${key}-text`}
        ref={refs[textTarget(key)]}
      >
        Copy
      </Typography>
    </>
  );
  const refData = (target: Target) => ({
    ...lifecycle.current[target],
    sameRoot: Boolean(nodes.current[target]) && nodes.current[target] === first.current[target],
  });
  return (
    <View style={{ padding: 8, gap: 8, backgroundColor: '#ffffff' }}>
      <ThemeProvider theme={theme}>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          <Control
            id="next"
            onPress={() => setState((value) => Math.min(value + 1, cardContractStates.length - 1))}
          >
            Next
          </Control>
          <Control id="measure" onPress={measure}>
            Measure
          </Control>
        </View>
        <Text allowFontScaling style={{ fontSize: 14, color: '#203247' }}>
          {state + 1}/{cardContractStates.length} {input.name}
        </Text>
        <View style={{ width: 280, maxWidth: '100%', gap: 16 }}>
          <View
            testID="card-contract-stock-frame"
            collapsable={false}
            style={{ padding: 12, backgroundColor: input.dark ? '#0b1016' : '#d6e3ed' }}
          >
            <Card
              {...cardProps}
              testID="card-contract-stock"
              collapsable={false}
              ref={refs.stock}
              sx={rootSx}
              style={nativeStyle}
            >
              {children('stock')}
            </Card>
          </View>
          <View
            testID="card-contract-custom-frame"
            collapsable={false}
            style={{ padding: 12, backgroundColor: input.dark ? '#0b1016' : '#d6e3ed' }}
          >
            <Card
              {...cardProps}
              component={CustomRoot}
              tone="quiet"
              testID="card-contract-custom"
              collapsable={false}
              ref={refs.custom}
              onTouchEnd={onTouchEnd}
              sx={rootSx}
              style={nativeStyle}
            >
              {children('custom')}
            </Card>
          </View>
        </View>
      </ThemeProvider>
      <View style={{ width: 280, maxWidth: '100%', gap: 8 }}>
        <Text allowFontScaling style={{ fontSize: 14, color: '#203247' }}>
          Native theme probe
        </Text>
        <ThemeProvider theme={probeThemes.provider}>
          <View
            testID="card-contract-probe-theme-frame"
            collapsable={false}
            style={{ padding: 12, alignSelf: 'flex-start', backgroundColor: '#ffffff' }}
          >
            <Card
              component={ProbeRoot}
              probe="theme"
              theme={probeThemes.explicit}
              elevation={cardProbeInputs.theme.elevation}
              testID="card-contract-probe-theme"
              nativeID="card-contract-probe-theme"
              accessible
              accessibilityLabel="Native theme probe"
              collapsable={false}
              ref={refs['probe-theme']}
              sx={probeSx}
            />
          </View>
        </ThemeProvider>
        <Text allowFontScaling style={{ fontSize: 14, color: '#203247' }}>
          Authored owner state probe
        </Text>
        <ThemeProvider theme={probeThemes.owner}>
          <View
            testID="card-contract-probe-owner-frame"
            collapsable={false}
            style={{ padding: 12, alignSelf: 'flex-start', backgroundColor: '#ffffff' }}
          >
            <Card
              component={ProbeRoot}
              probe="owner"
              ownerState={probeOwnerState}
              elevation={cardProbeInputs.owner.elevation}
              testID="card-contract-probe-owner"
              nativeID="card-contract-probe-owner"
              accessible
              accessibilityLabel="Authored owner state probe"
              collapsable={false}
              ref={refs['probe-owner']}
              sx={probeSx}
            />
          </View>
        </ThemeProvider>
        <Text allowFontScaling style={{ fontSize: 14, color: '#203247' }}>
          Alternate native root probe
        </Text>
        <ThemeProvider theme={probeThemes.as}>
          <View
            testID="card-contract-probe-as-frame"
            collapsable={false}
            style={{ padding: 12, alignSelf: 'flex-start', backgroundColor: '#ffffff' }}
          >
            <Card
              component={ProbeRoot}
              probe="as"
              as={AlternateProbeRoot}
              elevation={cardProbeInputs.as.elevation}
              testID="card-contract-probe-as"
              accessible
              accessibilityLabel="Alternate native root probe"
              collapsable={false}
              ref={refs['probe-as']}
              sx={probeSx}
            />
          </View>
        </ThemeProvider>
      </View>
      <Text
        testID="card-contract-receipt"
        allowFontScaling
        accessibilityLabel={JSON.stringify({
          schemaVersion: 1,
          scenario: 'card-v1',
          state,
          input,
          sequenceLength: cardContractStates.length,
          fontScale,
          windowProfile: { width, height, scale },
          counts,
          request,
          receipts,
          textReceipts,
          touch,
          refRevision,
          authoredNativeReset: input.nativeReset ? cardNativeReset : null,
          authoredProbeInputs: cardProbeInputs,
          refs: Object.fromEntries(cardContractKeys.map((key) => [key, refData(key)])),
          textRefs: Object.fromEntries(
            cardContractKeys.map((key) => [key, refData(textTarget(key))]),
          ),
          probeRefs: Object.fromEntries(cardProbeKeys.map((key) => [key, refData(`probe-${key}`)])),
          probeReceipts,
        })}
        style={{ fontSize: 12, color: '#203247' }}
      >
        Counts {counts.stock}/{counts.custom} · request {request}
      </Text>
    </View>
  );
}
