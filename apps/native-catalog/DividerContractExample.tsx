// Copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT
import {
  forwardRef,
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
import { Box, Divider, ThemeProvider, createTheme, styled } from '@mui/material';

// These are authored inputs, not claimed native observations. The independent
// Android collector checks its own native bounds/paint against this sequence.
const initial = {
  name: 'default',
  variant: 'fullWidth',
  vertical: false,
  flexItem: false,
  align: 'center',
  dark: false,
  rtl: false,
  reset: false,
} as const;
export const dividerContractStates = [
  initial,
  { ...initial, name: 'inset', variant: 'inset' },
  { ...initial, name: 'middle', variant: 'middle' },
  { ...initial, name: 'vertical', vertical: true },
  { ...initial, name: 'vertical-flex', variant: 'middle', vertical: true, flexItem: true },
  { ...initial, name: 'left', align: 'left' },
  { ...initial, name: 'right', align: 'right' },
  { ...initial, name: 'dark', dark: true },
  { ...initial, name: 'rtl-left', variant: 'inset', align: 'left', dark: true, rtl: true },
  { ...initial, name: 'rtl-right', variant: 'middle', align: 'right', dark: true, rtl: true },
  { ...initial, name: 'native-reset', reset: true },
  { ...initial, name: 'restored' },
] as const;
export const dividerContractKeys = ['plain', 'label', 'paint', 'custom'] as const;
type Key = (typeof dividerContractKeys)[number];
type Frame = { x: number; y: number; width: number; height: number };
type Receipt = { window: Frame; request: number; state: number; generation: number };
const finiteFrame = (frame: Frame) =>
  Object.values(frame).every(Number.isFinite) && frame.width >= 0 && frame.height >= 0;
const HiddenDivider = styled(Divider)({ borderStyle: 'none' });
const CustomRoot = forwardRef<ViewInstance, ViewProps & { className?: string; tone: 'quiet' }>(
  ({ className: _className, tone, ...props }, ref) => (
    <View {...props} accessibilityHint={tone} ref={ref} />
  ),
);
function Counter({ onCount, color }: { onCount: (value: number) => void; color: string }) {
  const [count, setCount] = useState(0);
  useEffect(() => onCount(count), [count, onCount]);
  return (
    <Pressable
      testID="divider-contract-counter"
      accessible
      accessibilityRole="button"
      accessibilityLabel={`Count ${count}`}
      onPress={() => setCount((value) => value + 1)}
      style={{ minWidth: 44, minHeight: 44, justifyContent: 'center', alignItems: 'center' }}
    >
      <Text allowFontScaling maxFontSizeMultiplier={0} style={{ fontSize: 14, color }}>
        {count}
      </Text>
    </Pressable>
  );
}
function Control({ id, children, onPress }: { id: string; children: string; onPress: () => void }) {
  return (
    <Pressable
      testID={`divider-contract-${id}`}
      accessibilityRole="button"
      onPress={onPress}
      style={{
        minHeight: 44,
        paddingHorizontal: 12,
        justifyContent: 'center',
        backgroundColor: '#e6ebf0',
      }}
    >
      <Text allowFontScaling={false} style={{ color: '#203247', fontSize: 14 }}>
        {children}
      </Text>
    </Pressable>
  );
}
/** Four retained hosts and explicit fresh ref measurements, independent of onLayout. */
export function DividerContractExample() {
  const [state, setState] = useState(0),
    [count, setCount] = useState(0);
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
  const input = dividerContractStates[state],
    { fontScale } = useWindowDimensions();
  const config = useMemo(() => ({}), [state, fontScale]);
  const active = useRef(config),
    currentRequest = useRef(0);
  const nodes = useRef<Partial<Record<Key, ViewInstance>>>({}),
    first = useRef<Partial<Record<Key, ViewInstance>>>({});
  const lifecycle = useRef(
    Object.fromEntries(
      dividerContractKeys.map((key) => [key, { attached: 0, cleaned: 0, generation: 0 }]),
    ) as Record<Key, { attached: number; cleaned: number; generation: number }>,
  );
  useLayoutEffect(() => {
    active.current = config;
    setReceipts({});
  }, [config]);
  const refs = useMemo(
    () =>
      Object.fromEntries(
        dividerContractKeys.map((key) => {
          const callback: RefCallback<ViewInstance> = (node) => {
            const release = () => {
              if (!nodes.current[key]) return;
              delete nodes.current[key];
              lifecycle.current[key].cleaned++;
              lifecycle.current[key].generation++;
              setRefRevision((value) => value + 1);
            };
            if (!node) {
              release();
              return;
            }
            nodes.current[key] = node;
            first.current[key] ??= node;
            lifecycle.current[key].attached++;
            lifecycle.current[key].generation++;
            setRefRevision((value) => value + 1);
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
    for (const key of dividerContractKeys) {
      const node = nodes.current[key],
        generation = lifecycle.current[key].generation;
      node?.measureInWindow((x, y, width, height) => {
        const window = { x, y, width, height };
        if (
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
  const onTouchEnd = (event: GestureResponderEvent) =>
    setTouch((previous) => ({
      count: (previous?.count ?? 0) + 1,
      target: event.nativeEvent.target,
      pageX: event.nativeEvent.pageX,
      pageY: event.nativeEvent.pageY,
      timestamp: event.timeStamp,
    }));
  const theme = useMemo(
    () =>
      createTheme({
        direction: input.rtl ? 'rtl' : 'ltr',
        palette: { mode: input.dark ? 'dark' : 'light' },
      }),
    [input.rtl, input.dark],
  );
  return (
    <ThemeProvider theme={theme}>
      <View style={{ padding: 8, gap: 8, backgroundColor: input.dark ? '#121212' : '#ffffff' }}>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <Control
            id="next"
            onPress={() =>
              setState((value) => Math.min(value + 1, dividerContractStates.length - 1))
            }
          >
            Next state
          </Control>
          <Control id="measure" onPress={measure}>
            Measure
          </Control>
        </View>
        <Text allowFontScaling={false} style={{ color: input.dark ? '#ffffff' : '#203247' }}>
          {state + 1}/{dividerContractStates.length} {input.name}
        </Text>
        <Box
          sx={{
            direction: input.rtl ? 'rtl' : 'ltr',
            width: '280px',
            maxWidth: '100%',
          }}
        >
          <View
            testID="divider-contract-frame-plain"
            collapsable={false}
            style={{
              height: 72,
              justifyContent: 'center',
              flexDirection: input.vertical ? 'row' : 'column',
            }}
          >
            <Divider
              testID="divider-contract-plain"
              collapsable={false}
              ref={refs.plain}
              variant={input.variant}
              orientation={input.vertical ? 'vertical' : 'horizontal'}
              flexItem={input.flexItem}
            />
          </View>
          <View
            testID="divider-contract-frame-label"
            collapsable={false}
            style={{ height: 80, justifyContent: 'center' }}
          >
            <Divider
              testID="divider-contract-label"
              collapsable={false}
              ref={refs.label}
              textAlign={input.align}
            >
              <Counter key="retained" onCount={setCount} color={theme.palette.text.primary} />
            </Divider>
          </View>
          <View
            testID="divider-contract-frame-paint"
            collapsable={false}
            style={{ height: 64, justifyContent: 'center' }}
          >
            <HiddenDivider
              testID="divider-contract-paint"
              collapsable={false}
              ref={refs.paint}
              className="divider-paint-probe"
              style={input.reset ? { borderStyle: 'solid' } : undefined}
            >
              Ink
            </HiddenDivider>
          </View>
          <View
            testID="divider-contract-frame-custom"
            collapsable={false}
            style={{ height: 64, justifyContent: 'center' }}
          >
            <Divider
              component={CustomRoot}
              tone="quiet"
              testID="divider-contract-custom"
              collapsable={false}
              ref={refs.custom}
              accessible
              accessibilityRole="button"
              onTouchEnd={onTouchEnd}
              style={{ minHeight: 44 }}
            >
              Custom
            </Divider>
          </View>
        </Box>
        <Text
          testID="divider-contract-receipt"
          allowFontScaling={false}
          accessibilityLabel={JSON.stringify({
            schemaVersion: 1,
            state,
            input,
            fontScale,
            count,
            request,
            receipts,
            touch,
            refRevision,
            refs: Object.fromEntries(
              dividerContractKeys.map((key) => [
                key,
                {
                  ...lifecycle.current[key],
                  sameRoot:
                    Boolean(nodes.current[key]) && nodes.current[key] === first.current[key],
                },
              ]),
            ),
          })}
          style={{ fontSize: 12, color: input.dark ? '#ffffff' : '#526274' }}
        >
          Count {count} · request {request} · OS {fontScale.toFixed(2)}×
        </Text>
      </View>
    </ThemeProvider>
  );
}
