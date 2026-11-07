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
import { Box, Typography, ThemeProvider, createTheme, styled, type Theme } from '@mui/material';

// Authored cases only. Independent collectors own actual native bounds/paint.
const initial = {
  name: 'default',
  rtl: false,
  ignoredConfig: false,
  explicitTheme: false,
  reset: false,
  divAlias: false,
} as const;
export const boxContractStates = [
  initial,
  { ...initial, name: 'ignored-config', ignoredConfig: true },
  { ...initial, name: 'sx-array' },
  { ...initial, name: 'inline-final' },
  { ...initial, name: 'div-alias', divAlias: true },
  { ...initial, name: 'rtl-physical', rtl: true },
  { ...initial, name: 'text-inheritance' },
  { ...initial, name: 'ancestor-styled' },
  { ...initial, name: 'explicit-theme', explicitTheme: true },
  { ...initial, name: 'native-reset', reset: true },
  { ...initial, name: 'restored' },
] as const;
export const boxContractKeys = ['stock', 'custom', 'styled'] as const;
export const boxNativeReset = {
  padding: 0,
  margin: 0,
  borderWidth: 0,
  backgroundColor: '#243447',
  color: '#f5f7fa',
  fontSize: 16,
  lineHeight: 24,
} as const;
const inlineFinal = {
  padding: 4,
  backgroundColor: '#243447',
  color: '#f5f7fa',
  fontSize: 20,
  lineHeight: 28,
} as const;
type Key = (typeof boxContractKeys)[number];
type Target = Key | `${Key}-text`;
type NativeNode = ViewInstance | TextInstance;
type Frame = { x: number; y: number; width: number; height: number };
type Receipt = { window: Frame; request: number; state: number; generation: number };
const targets = boxContractKeys.flatMap((key): Target[] => [key, `${key}-text`]);
const textTarget = (key: Key): Target => `${key}-text`;
const finiteFrame = (frame: Frame) =>
  Object.values(frame).every(Number.isFinite) && frame.width > 0 && frame.height > 0;
const CustomRoot = forwardRef<
  ViewInstance,
  ViewProps & { className?: string; tone: 'quiet'; theme?: Theme }
>(({ className: _className, tone, ...props }, ref) => (
  <View {...props} accessibilityHint={tone} ref={ref} />
));
// Keep white inherited copy legible while a distinct green still proves the
// styled self-selector outranks the blue sx declaration in the array case.
const StyledBox = styled(Box)(({ ownerState }) => ({
  '&.MuiBox-root': {
    backgroundColor: ownerState === 'sx-array' ? '#0b5d44' : '#e8f0fa',
    border: '2px solid #546e7a',
  },
  '& .box-contract-copy': { letterSpacing: '1px' },
}));
const Ancestor = styled(Box)(({ ownerState }) =>
  ownerState === 'ancestor-styled'
    ? { '& .MuiBox-root': { paddingLeft: '20px', color: '#6a1b9a' } }
    : {},
);
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
      testID={`box-contract-${id}-counter`}
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
      testID={`box-contract-${id}`}
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
/** Three retained public roots and six fresh native measurements, with no JS paint oracle. */
export function BoxContractExample() {
  const [state, setState] = useState(0),
    [request, setRequest] = useState(0),
    [refRevision, setRefRevision] = useState(0);
  const [counts, setCounts] = useState<Record<Key, number>>({ stock: 0, custom: 0, styled: 0 });
  const [receipts, setReceipts] = useState<Partial<Record<Key, Receipt>>>({}),
    [textReceipts, setTextReceipts] = useState<Partial<Record<Key, Receipt>>>({});
  const [touch, setTouch] = useState<{
    count: number;
    target: number | undefined;
    pageX: number;
    pageY: number;
    timestamp: number;
  }>();
  const input = boxContractStates[state],
    { fontScale, width, height, scale } = useWindowDimensions();
  const config = useMemo(
    () => ({}),
    [
      state,
      fontScale,
      width,
      height,
      scale,
      refRevision,
      counts.stock,
      counts.custom,
      counts.styled,
    ],
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
        boxContractKeys.map((key) => [
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
        const key = target.replace(/-text$/, '') as Key,
          update = target.endsWith('-text') ? setTextReceipts : setReceipts;
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
        direction: input.rtl ? 'rtl' : 'ltr',
        palette: {
          primary: { main: '#1565c0' },
          background: { paper: '#ffffff' },
          text: { primary: '#203247' },
        },
        ...(input.ignoredConfig
          ? {
              components: {
                MuiBox: {
                  defaultProps: { className: 'invented-box', style: { opacity: 0.1 } },
                  styleOverrides: { root: { padding: 40, opacity: 0.2, border: '17px solid red' } },
                  variants: [{ props: {}, style: { margin: 30 } }],
                },
              },
            }
          : {}),
      }),
    [input.rtl, input.ignoredConfig],
  );
  const explicit = useMemo(
    () =>
      createTheme({
        palette: {
          mode: 'dark',
          primary: { main: '#ffb74d' },
          background: { paper: '#27384a' },
          text: { primary: '#f5f7fa' },
        },
      }),
    [],
  );
  const arrayCase = ['sx-array', 'inline-final', 'native-reset'].includes(input.name);
  const rootSx = [
    false,
    null,
    (selected: Theme) => ({
      minHeight: 88,
      bgcolor: selected.palette.background.paper,
      color: selected.palette.text.primary,
      fontSize: '16px',
      lineHeight: '24px',
      ...(arrayCase
        ? {
            p: 2,
            bgcolor: selected.palette.primary.main,
            color: '#ffffff',
            fontSize: '18px',
            lineHeight: '26px',
          }
        : {}),
      ...(['inline-final', 'native-reset'].includes(input.name) ? { paddingLeft: '40px' } : {}),
      ...(input.divAlias ? { p: 1 } : {}),
      // Deliberately physical only: do not conceal the stock RN mixed-margin gap.
      ...(input.rtl
        ? {
            direction: 'rtl',
            marginLeft: '12px',
            marginRight: '4px',
            paddingLeft: '24px',
            paddingRight: '8px',
          }
        : {}),
      ...(input.name === 'text-inheritance'
        ? { p: 1, fontSize: '24px', lineHeight: '32px', color: '#7542a6' }
        : {}),
    }),
    { opacity: 1 },
  ] as const;
  const nativeStyle = input.reset
    ? boxNativeReset
    : input.name === 'inline-final'
      ? inlineFinal
      : undefined;
  const color = (key: Key) =>
    input.reset || input.name === 'inline-final'
      ? '#f5f7fa'
      : input.name === 'ancestor-styled'
        ? '#6a1b9a'
        : input.name === 'text-inheritance'
          ? '#7542a6'
          : arrayCase
            ? '#ffffff'
            : key === 'custom' && input.explicitTheme
              ? '#f5f7fa'
              : '#203247';
  const children = (key: Key) => (
    <>
      <Counter key={`counter-${key}`} id={key} onCount={onCounts[key]} color={color(key)} />
      <Typography
        key={`copy-${key}`}
        variant="inherit"
        className="box-contract-copy"
        testID={`box-contract-${key}-text`}
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
    <ThemeProvider theme={theme}>
      <View style={{ padding: 8, gap: 8, backgroundColor: '#ffffff' }}>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          <Control
            id="next"
            onPress={() => setState((value) => Math.min(value + 1, boxContractStates.length - 1))}
          >
            Next
          </Control>
          <Control id="measure" onPress={measure}>
            Measure
          </Control>
        </View>
        <Text allowFontScaling style={{ fontSize: 14, color: '#203247' }}>
          {state + 1}/{boxContractStates.length} {input.name}
        </Text>
        <Ancestor
          ownerState={input.name}
          sx={{ direction: input.rtl ? 'rtl' : 'ltr', width: '280px', maxWidth: '100%', gap: 2 }}
        >
          <View
            testID="box-contract-stock-frame"
            collapsable={false}
            style={{ padding: 12, backgroundColor: '#d6e3ed' }}
          >
            <Box
              component={input.divAlias ? 'div' : undefined}
              testID="box-contract-stock"
              collapsable={false}
              ref={refs.stock}
              sx={rootSx}
              style={nativeStyle}
            >
              {children('stock')}
            </Box>
          </View>
          <View
            testID="box-contract-custom-frame"
            collapsable={false}
            style={{ padding: 12, backgroundColor: '#d6e3ed' }}
          >
            <Box
              component={CustomRoot}
              tone="quiet"
              {...(input.explicitTheme ? { theme: explicit } : {})}
              testID="box-contract-custom"
              collapsable={false}
              ref={refs.custom}
              onTouchEnd={onTouchEnd}
              sx={rootSx}
              style={nativeStyle}
            >
              {children('custom')}
            </Box>
          </View>
          <View
            testID="box-contract-styled-frame"
            collapsable={false}
            style={{ padding: 12, backgroundColor: '#d6e3ed' }}
          >
            <StyledBox
              ownerState={input.name}
              testID="box-contract-styled"
              collapsable={false}
              ref={refs.styled}
              sx={rootSx}
              style={nativeStyle}
            >
              {children('styled')}
            </StyledBox>
          </View>
        </Ancestor>
        <Text
          testID="box-contract-receipt"
          allowFontScaling
          accessibilityLabel={JSON.stringify({
            schemaVersion: 1,
            scenario: 'box-v1',
            state,
            input,
            sequenceLength: boxContractStates.length,
            fontScale,
            windowProfile: { width, height, scale },
            counts,
            request,
            receipts,
            textReceipts,
            touch,
            refRevision,
            authoredNativeReset: input.reset ? boxNativeReset : null,
            refs: Object.fromEntries(boxContractKeys.map((key) => [key, refData(key)])),
            textRefs: Object.fromEntries(
              boxContractKeys.map((key) => [key, refData(textTarget(key))]),
            ),
          })}
          style={{ fontSize: 12, color: '#203247' }}
        >
          Counts {counts.stock}/{counts.custom}/{counts.styled} · request {request}
        </Text>
      </View>
    </ThemeProvider>
  );
}
