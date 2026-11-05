// Copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT
import {
  forwardRef,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type RefCallback,
} from 'react';
import {
  View,
  useWindowDimensions,
  type GestureResponderEvent,
  type LayoutChangeEvent,
  type TextProps,
  type ViewInstance,
  type ViewProps,
} from 'react-native';
import {
  AccordionDetails,
  Box,
  Button,
  ThemeProvider,
  Typography,
  createTheme,
  useTheme,
} from '@mui/material';

type Frame = { x: number; y: number; width: number; height: number };
type Receipt = { local: Frame; window?: Frame };
const keys = ['stock', 'custom'] as const;
type RootKey = (typeof keys)[number];
type TextLayout = NonNullable<TextProps['onTextLayout']>;
type Line = Pick<
  Parameters<TextLayout>[0]['nativeEvent']['lines'][number],
  'text' | 'x' | 'y' | 'width' | 'height' | 'capHeight'
>;
type Touch = { count: number; pageX: number; pageY: number; target: number; timestamp: number };
const resetPadding = { padding: 0 };
const CustomRoot = forwardRef<ViewInstance, ViewProps & { className?: string | undefined }>(
  ({ className: _className, ...native }, ref) => <View {...native} ref={ref} />,
);
function StatefulMark({ onCount }: { onCount: (count: number) => void }) {
  const [count, setCount] = useState(0);
  useEffect(() => onCount(count), [count, onCount]);
  return (
    <Button
      testID="details-contract-child"
      accessibilityLabel={`Marked ${count}`}
      variant="outlined"
      color="inherit"
      onClick={() => setCount((value) => value + 1)}
      sx={{ minWidth: 44, minHeight: 44, maxWidth: '100%', alignSelf: 'flex-start' }}
    >
      Mark {count}
    </Button>
  );
}

/** Standalone wrapper receipts. OS text profiles and route mounting belong to the catalog runner. */
export function AccordionDetailsContractExample() {
  const [spacing, setSpacing] = useState<'source' | 'ten' | 'tuple'>('source');
  const [inline, setInline] = useState(false);
  const [adjusted, setAdjusted] = useState(false);
  const [rtl, setRtl] = useState(false);
  const [large, setLarge] = useState(false);
  const [childCount, setChildCount] = useState(0);
  const [receipts, setReceipts] = useState<Partial<Record<RootKey, Receipt>>>({});
  const [textFrames, setTextFrames] = useState<Record<string, Frame>>({});
  const [metrics, setMetrics] = useState<Record<string, Line[]>>({});
  const [touches, setTouches] = useState<Partial<Record<RootKey, Touch>>>({});
  const [refRevision, setRefRevision] = useState(0);
  const nodes = useRef<Partial<Record<RootKey, ViewInstance>>>({});
  const initialNodes = useRef<Partial<Record<RootKey, ViewInstance>>>({});
  const revisions = useRef<Record<RootKey, number>>({ stock: 0, custom: 0 });
  const refs = useRef<Record<RootKey, { attached: number; cleaned: number }>>({
    stock: { attached: 0, cleaned: 0 },
    custom: { attached: 0, cleaned: 0 },
  });
  const rootRefs = useMemo(() => {
    const track =
      (key: RootKey): RefCallback<ViewInstance> =>
      (node) => {
        const release = () => {
          if (nodes.current[key]) {
            delete nodes.current[key];
            refs.current[key].cleaned++;
            revisions.current[key]++;
            setRefRevision((value) => value + 1);
          }
        };
        if (!node) {
          release();
          return;
        }
        nodes.current[key] = node;
        initialNodes.current[key] ??= node;
        refs.current[key].attached++;
        setRefRevision((value) => value + 1);
        return () => {
          if (nodes.current[key] === node) release();
        };
      };
    return { stock: track('stock'), custom: track('custom') };
  }, []);
  const publish = useCallback((key: RootKey, next: Receipt) => {
    setReceipts((previous) =>
      JSON.stringify(previous[key]) === JSON.stringify(next)
        ? previous
        : { ...previous, [key]: next },
    );
  }, []);
  const layouts = useMemo(() => {
    const track = (key: RootKey) => (event: LayoutChangeEvent) => {
      const local = { ...event.nativeEvent.layout };
      const revision = ++revisions.current[key];
      const node = nodes.current[key];
      if (!node) publish(key, { local });
      else
        node.measureInWindow((x, y, width, height) => {
          // A late callback may belong to an older layout or a released ref lease.
          if (revisions.current[key] === revision && nodes.current[key] === node)
            publish(key, { local, window: { x, y, width, height } });
        });
    };
    return { stock: track('stock'), custom: track('custom') };
  }, [publish]);
  const touchHandlers = useMemo(() => {
    const track = (key: RootKey) => (event: GestureResponderEvent) => {
      const { pageX, pageY, target } = event.nativeEvent;
      const timestamp = event.timeStamp;
      setTouches((previous) => ({
        ...previous,
        [key]: {
          count: (previous[key]?.count ?? 0) + 1,
          pageX,
          pageY,
          target,
          timestamp,
        },
      }));
    };
    return { stock: track('stock'), custom: track('custom') };
  }, []);
  const onTextFrame = useCallback((key: string, event: LayoutChangeEvent) => {
    const next = { ...event.nativeEvent.layout };
    setTextFrames((previous) =>
      JSON.stringify(previous[key]) === JSON.stringify(next)
        ? previous
        : { ...previous, [key]: next },
    );
  }, []);
  const onLines = useCallback((key: string, event: Parameters<TextLayout>[0]) => {
    const next = event.nativeEvent.lines.map(({ text, x, y, width, height, capHeight }) => ({
      text,
      x,
      y,
      width,
      height,
      capHeight,
    }));
    setMetrics((previous) =>
      JSON.stringify(previous[key]) === JSON.stringify(next)
        ? previous
        : { ...previous, [key]: next },
    );
  }, []);
  const { fontScale } = useWindowDimensions();
  const outer = useTheme();
  const theme = useMemo(() => {
    const outerDetails = outer.components?.MuiAccordionDetails;
    const result = createTheme({
      ...outer,
      direction: rtl ? 'rtl' : 'ltr',
      spacing: spacing === 'ten' ? 10 : 8,
      components: {
        ...outer.components,
        MuiAccordionDetails: {
          defaultProps: {
            ...(typeof outerDetails === 'object' ? outerDetails.defaultProps : {}),
            classes: { root: adjusted ? 'details-adjusted' : 'details-regular' },
            style: adjusted ? { paddingBottom: 13 } : undefined,
          },
          styleOverrides: {
            root: {
              '&.details-adjusted': { paddingTop: 11 },
              '&.details-urgent': { paddingRight: 21 },
            },
          },
        },
      },
    });
    if (spacing === 'tuple') {
      const base = result.spacing;
      result.spacing = (...args: (number | string)[]) => {
        // Exercise Details' complete three-argument call, not three scalar calls.
        if (args.length === 3) return '5px 7px 9px';
        if (args.length === 0) return base();
        if (args.length === 1) return base(args[0]);
        if (args.length === 2) return base(args[0], args[1]);
        return base(args[0], args[1], args[2], args[3]);
      };
    }
    return result;
  }, [outer, spacing, adjusted, rtl]);
  return (
    <ThemeProvider theme={theme}>
      <Box sx={{ padding: 1 }}>
        <Typography variant="subtitle1">Delivery notes</Typography>
        <Box sx={{ flexDirection: 'row', flexWrap: 'wrap', gap: 1, marginBottom: 1 }}>
          <Button
            testID="details-contract-spacing"
            style={{ maxWidth: '100%' }}
            onClick={() =>
              setSpacing((value) =>
                value === 'source' ? 'ten' : value === 'ten' ? 'tuple' : 'source',
              )
            }
          >
            Space: {spacing === 'source' ? '8' : spacing === 'ten' ? '10' : 'tuple'}
          </Button>
          <Button
            testID="details-contract-inline"
            style={{ maxWidth: '100%' }}
            onClick={() => setInline((value) => !value)}
          >
            Inset: {inline ? 'zero' : 'theme'}
          </Button>
          <Button
            testID="details-contract-style"
            style={{ maxWidth: '100%' }}
            onClick={() => setAdjusted((value) => !value)}
          >
            Style: {adjusted ? 'custom' : 'plain'}
          </Button>
          <Button
            testID="details-contract-rtl"
            style={{ maxWidth: '100%' }}
            onClick={() => setRtl((value) => !value)}
          >
            Read: {rtl ? 'RTL' : 'LTR'}
          </Button>
          <Button
            testID="details-contract-font"
            style={{ maxWidth: '100%' }}
            onClick={() => setLarge((value) => !value)}
          >
            Type: {large ? '24' : '20'}
          </Button>
        </Box>
        <Box
          testID="details-contract-font-scope"
          sx={{
            fontFamily: 'System',
            fontWeight: 400,
            fontSize: large ? 24 : 20,
            lineHeight: 1.25,
            textAlign: 'start',
            direction: rtl ? 'rtl' : 'ltr',
          }}
        >
          {keys.map((key) => (
            <AccordionDetails
              key={key}
              ref={rootRefs[key]}
              {...(key === 'custom' ? { component: CustomRoot } : {})}
              testID={`details-contract-${key}`}
              collapsable={false}
              accessible={false}
              className={adjusted ? 'details-urgent' : 'details-ordinary'}
              style={inline ? resetPadding : undefined}
              onLayout={layouts[key]}
              onTouchEnd={touchHandlers[key]}
            >
              <Box
                testID={`details-contract-content-${key}`}
                collapsable={false}
                style={{ alignSelf: 'stretch', minWidth: 0, gap: 4 }}
              >
                <Typography
                  testID={`details-contract-primary-${key}`}
                  variant="inherit"
                  onLayout={(event) => onTextFrame(`primary-${key}`, event)}
                  onTextLayout={(event) => onLines(`primary-${key}`, event)}
                >
                  {key === 'stock' ? 'Dock 3.' : 'Notes.'}
                </Typography>
                <Typography
                  testID={`details-contract-small-${key}`}
                  variant="inherit"
                  sx={{ fontSize: '0.5em' }}
                  onLayout={(event) => onTextFrame(`small-${key}`, event)}
                  onTextLayout={(event) => onLines(`small-${key}`, event)}
                >
                  {key === 'stock' ? 'Keep dry.' : 'Fragile.'}
                </Typography>
                {key === 'custom' ? <StatefulMark onCount={setChildCount} /> : null}
              </Box>
            </AccordionDetails>
          ))}
        </Box>
        <Typography
          testID="details-contract-receipt"
          variant="caption"
          accessibilityLabel={JSON.stringify({
            spacing,
            inline,
            adjusted,
            rtl,
            large,
            fontScale,
            childCount,
            receipts,
            refRevision,
            textFrames,
            metrics,
            touches,
            refs: Object.fromEntries(
              keys.map((key) => [
                key,
                {
                  ...refs.current[key],
                  sameRoot:
                    Boolean(nodes.current[key]) && nodes.current[key] === initialNodes.current[key],
                },
              ]),
            ),
          })}
        >
          Notes {childCount} · Roots {Object.keys(receipts).length}/2
        </Typography>
      </Box>
    </ThemeProvider>
  );
}
