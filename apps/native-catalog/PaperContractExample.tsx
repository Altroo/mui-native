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
  type ViewInstance,
  type ViewProps,
} from 'react-native';
import { Box, Paper, ThemeProvider, createTheme } from '@mui/material';

// Authored inputs are kept separate from fresh ref measurements. Independent
// native collectors own actual bounds, raster and platform-policy observations.
const initial = {
  name: 'default',
  elevation: 1,
  variant: 'elevation',
  square: false,
  dark: false,
  rtl: false,
  reset: false,
} as const;
export const paperContractStates = [
  initial,
  { ...initial, name: 'outlined', variant: 'outlined' },
  { ...initial, name: 'square', square: true },
  { ...initial, name: 'light-zero', elevation: 0 },
  ...Array.from({ length: 25 }, (_, elevation) => ({
    ...initial,
    name: `dark-${elevation}`,
    elevation,
    dark: true,
  })),
  { ...initial, name: 'dark-square', elevation: 8, dark: true, square: true },
  { ...initial, name: 'rtl-dark', elevation: 8, dark: true, rtl: true },
  { ...initial, name: 'native-reset', elevation: 8, dark: true, reset: true },
  { ...initial, name: 'restored' },
] as const;
export const paperContractKeys = ['stock', 'custom'] as const;
export const paperNativeReset = {
  padding: 0,
  borderRadius: 0,
  boxShadow: 'none',
  backgroundImage: [],
  backgroundColor: '#243447',
} as const;
type Key = (typeof paperContractKeys)[number];
type Frame = { x: number; y: number; width: number; height: number };
type Receipt = { window: Frame; request: number; state: number; generation: number };
const finiteFrame = (frame: Frame) =>
  Object.values(frame).every(Number.isFinite) && frame.width > 0 && frame.height > 0;
const CustomRoot = forwardRef<ViewInstance, ViewProps & { className?: string; tone: 'quiet' }>(
  ({ className: _className, tone, ...props }, ref) => (
    <View {...props} accessibilityHint={tone} ref={ref} />
  ),
);
function Counter({
  id,
  onCount,
  color,
}: {
  id: 'counter' | 'customtouch';
  onCount: (value: number) => void;
  color: string;
}) {
  const [count, setCount] = useState(0);
  useEffect(() => onCount(count), [count, onCount]);
  return (
    <Pressable
      testID={`paper-contract-${id}`}
      accessible
      accessibilityRole="button"
      accessibilityLabel={`${id === 'counter' ? 'Count' : 'Custom'} ${count}`}
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
        {id === 'counter' ? count : 'Custom'}
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
      testID={`paper-contract-${id}`}
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
/** Two persistent public Paper roots, real inputs and explicitly requested measurements. */
export function PaperContractExample() {
  const [state, setState] = useState(0),
    [count, setCount] = useState(0),
    [customCount, setCustomCount] = useState(0);
  const [request, setRequest] = useState(0),
    [receipts, setReceipts] = useState<Partial<Record<Key, Receipt>>>({});
  const [refRevision, setRefRevision] = useState(0);
  const [touch, setTouch] = useState<{
    count: number;
    target: number | undefined;
    pageX: number;
    pageY: number;
    timestamp: number;
  }>();
  const input = paperContractStates[state],
    { fontScale, width, height, scale } = useWindowDimensions();
  const config = useMemo(() => ({}), [state, fontScale, width, height, scale]);
  const active = useRef<object | null>(config),
    mounted = useRef(true),
    currentRequest = useRef(0);
  const nodes = useRef<Partial<Record<Key, ViewInstance>>>({}),
    first = useRef<Partial<Record<Key, ViewInstance>>>({});
  const lifecycle = useRef(
    Object.fromEntries(
      paperContractKeys.map((key) => [key, { attached: 0, cleaned: 0, generation: 0 }]),
    ) as Record<Key, { attached: number; cleaned: number; generation: number }>,
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
    return () => {
      if (active.current === config) active.current = null;
    };
  }, [config]);
  const refs = useMemo(
    () =>
      Object.fromEntries(
        paperContractKeys.map((key) => {
          const callback: RefCallback<ViewInstance> = (node) => {
            const release = () => {
              if (!nodes.current[key]) return;
              delete nodes.current[key];
              lifecycle.current[key].cleaned++;
              lifecycle.current[key].generation++;
              if (mounted.current) setRefRevision((value) => value + 1);
            };
            if (!node) {
              release();
              return;
            }
            nodes.current[key] = node;
            first.current[key] ??= node;
            lifecycle.current[key].attached++;
            lifecycle.current[key].generation++;
            if (mounted.current) setRefRevision((value) => value + 1);
            return () => {
              if (nodes.current[key] === node) release();
            };
          };
          return [key, callback];
        }),
      ) as Record<Key, RefCallback<ViewInstance>>,
    [],
  );
  const measure = () => {
    const next = ++currentRequest.current;
    setRequest(next);
    setReceipts({});
    for (const key of paperContractKeys) {
      const node = nodes.current[key],
        generation = lifecycle.current[key].generation;
      node?.measureInWindow((x, y, width, height) => {
        const window = { x, y, width, height };
        if (
          !mounted.current ||
          active.current !== config ||
          currentRequest.current !== next ||
          nodes.current[key] !== node ||
          lifecycle.current[key].generation !== generation ||
          !finiteFrame(window)
        )
          return;
        setReceipts((previous) => ({
          ...previous,
          [key]: { window, request: next, state, generation },
        }));
      });
    }
  };
  const onTouchEnd = useCallback(
    (event: GestureResponderEvent) =>
      setTouch((previous) => ({
        count: (previous?.count ?? 0) + 1,
        target: event.nativeEvent.target,
        pageX: event.nativeEvent.pageX,
        pageY: event.nativeEvent.pageY,
        timestamp: event.timeStamp,
      })),
    [],
  );
  const theme = useMemo(
    () =>
      createTheme({
        direction: input.rtl ? 'rtl' : 'ltr',
        palette: { mode: input.dark ? 'dark' : 'light' },
      }),
    [input.rtl, input.dark],
  );
  const nativeReset = input.reset ? paperNativeReset : undefined;
  return (
    <ThemeProvider theme={theme}>
      <View style={{ padding: 8, gap: 8, backgroundColor: input.dark ? '#121212' : '#ffffff' }}>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          <Control
            id="next"
            onPress={() => setState((value) => Math.min(value + 1, paperContractStates.length - 1))}
          >
            Next
          </Control>
          <Control id="measure" onPress={measure}>
            Measure
          </Control>
        </View>
        <Text allowFontScaling style={{ fontSize: 14, color: theme.palette.text.primary }}>
          {state + 1}/{paperContractStates.length} {input.name}
        </Text>
        <Box
          sx={{ direction: input.rtl ? 'rtl' : 'ltr', width: '280px', maxWidth: '100%', gap: 2 }}
        >
          <View
            testID="paper-contract-stock-frame"
            collapsable={false}
            style={{ padding: 24, backgroundColor: input.dark ? '#0b1016' : '#d6e3ed' }}
          >
            <Paper
              testID="paper-contract-stock"
              collapsable={false}
              ref={refs.stock}
              elevation={input.elevation}
              variant={input.variant}
              square={input.square}
              sx={{ p: 2, minHeight: 88, justifyContent: 'center' }}
              style={nativeReset}
            >
              <Counter
                key="retained-stock"
                id="counter"
                onCount={setCount}
                color={theme.palette.text.primary}
              />
            </Paper>
          </View>
          <View
            testID="paper-contract-custom-frame"
            collapsable={false}
            style={{ padding: 24, backgroundColor: input.dark ? '#0b1016' : '#d6e3ed' }}
          >
            <Paper
              component={CustomRoot}
              tone="quiet"
              testID="paper-contract-custom"
              collapsable={false}
              ref={refs.custom}
              elevation={input.elevation}
              variant={input.variant}
              square={input.square}
              onTouchEnd={onTouchEnd}
              sx={{ p: 2, minHeight: 88, justifyContent: 'center' }}
              style={nativeReset}
            >
              <Counter
                key="retained-custom"
                id="customtouch"
                onCount={setCustomCount}
                color={theme.palette.text.primary}
              />
            </Paper>
          </View>
        </Box>
        <Text
          testID="paper-contract-receipt"
          allowFontScaling
          accessibilityLabel={JSON.stringify({
            schemaVersion: 1,
            state,
            input,
            sequenceLength: paperContractStates.length,
            fontScale,
            windowProfile: { width, height, scale },
            count,
            customCount,
            request,
            receipts,
            touch,
            refRevision,
            authoredNativeReset: input.reset ? paperNativeReset : null,
            refs: Object.fromEntries(
              paperContractKeys.map((key) => [
                key,
                {
                  ...lifecycle.current[key],
                  sameRoot:
                    Boolean(nodes.current[key]) && nodes.current[key] === first.current[key],
                },
              ]),
            ),
          })}
          style={{ fontSize: 12, color: theme.palette.text.primary }}
        >
          Count {count} · request {request}
        </Text>
      </View>
    </ThemeProvider>
  );
}
