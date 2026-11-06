// Copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT
import {
  forwardRef,
  useContext,
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
  unstable_TextAncestorContext as TextAncestorContext,
  type GestureResponderEvent,
  type LayoutChangeEvent,
  type TextInstance,
  type TextProps,
} from 'react-native';
import { Box, MenuItem, MenuList, ThemeProvider, Typography, createTheme } from '@mui/material';
import source from '../../tests/fixtures/mui-typography-9.5.0.json';

const standard = [
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'subtitle1',
  'subtitle2',
  'body1',
  'body2',
  'button',
  'caption',
  'overline',
] as const;
type Variant = (typeof standard)[number] | 'inherit';
const variants: readonly Variant[] = [...standard, 'inherit'];
// Verification data from the checked public source fixture, never render sizes.
export const typographySourceVariants = standard.map((variant) => {
  const data = source.cases[0].output[variant];
  if (!data || typeof data.fontSize !== 'string' || !/^\d+(\.\d+)?rem$/.test(data.fontSize))
    throw new Error('The pinned typography reference must contain rem variant sizes.');
  if (!Number.isFinite(Number(data.lineHeight)) || !Number.isFinite(Number(data.fontWeight)))
    throw new Error(
      'The pinned typography reference must contain finite line heights and weights.',
    );
  return {
    variant,
    fontSize: Number.parseFloat(data.fontSize) * 16,
    lineHeight: Number(data.lineHeight),
    weight: Number(data.fontWeight),
  };
});
type Frame = { x: number; y: number; width: number; height: number };
const keys = ['selected', 'custom', 'menu', 'paragraph', 'nowrap'] as const;
type Key = (typeof keys)[number];
type TextLayout = NonNullable<TextProps['onTextLayout']>;
type Line = Pick<
  Parameters<TextLayout>[0]['nativeEvent']['lines'][number],
  'text' | 'x' | 'y' | 'width' | 'height' | 'capHeight'
>;
type Receipt = { local: Frame; window?: Frame; signature: string };
type CustomProps = TextProps & {
  tone: 'quiet';
  className?: string | undefined;
  onKind: (virtual: boolean) => void;
};
const CustomText = forwardRef<TextInstance, CustomProps>(
  ({ tone, className: _className, onKind, ...props }, ref) => {
    const virtual = useContext(TextAncestorContext);
    useEffect(() => onKind(virtual), [onKind, virtual]);
    return <Text {...props} accessibilityHint={tone} ref={ref} />;
  },
);
function Counter({ onCount }: { onCount: (count: number) => void }) {
  const [count, setCount] = useState(0);
  useEffect(() => onCount(count), [count, onCount]);
  return (
    <Text
      testID="type-contract-child"
      accessibilityRole="button"
      accessible
      accessibilityLabel={`Count ${count}`}
      onPress={() => setCount((value) => value + 1)}
    >
      Count {count}
    </Text>
  );
}
function Control({ id, children, onPress }: { id: string; children: string; onPress: () => void }) {
  return (
    <Pressable
      testID={`type-contract-${id}`}
      accessibilityRole="button"
      onPress={onPress}
      style={{
        minHeight: 44,
        minWidth: 48,
        paddingHorizontal: 8,
        justifyContent: 'center',
        backgroundColor: '#e6ebf0',
        borderRadius: 4,
      }}
    >
      <Text allowFontScaling={false} style={{ fontSize: 14, color: '#203247' }}>
        {children}
      </Text>
    </Pressable>
  );
}
/** One selected source variant keeps baseline and OS-largest profiles usable. */
export function TypographyContractExample() {
  const [variant, setVariant] = useState<Variant>('body1');
  const [mode, setMode] = useState(0),
    [rtl, setRtl] = useState(false);
  const [childCount, setChildCount] = useState(0);
  const [textKinds, setTextKinds] = useState<Partial<Record<'custom' | 'virtual', boolean>>>({});
  const [receipts, setReceipts] = useState<Partial<Record<Key, Receipt>>>({});
  const [metrics, setMetrics] = useState<
    Partial<Record<Key, { signature: string; lines: Line[] }>>
  >({});
  const [touch, setTouch] = useState<{
    count: number;
    target: number | undefined;
    pageX: number;
    pageY: number;
    timestamp: number;
  }>();
  const [refRevision, setRefRevision] = useState(0);
  const nodes = useRef<Partial<Record<Key, TextInstance>>>({});
  const initial = useRef<Partial<Record<Key, TextInstance>>>({});
  const revisions = useRef<Record<Key, number>>({
    selected: 0,
    custom: 0,
    menu: 0,
    paragraph: 0,
    nowrap: 0,
  });
  const refs = useRef<Record<Key, { attached: number; cleaned: number }>>({
    selected: { attached: 0, cleaned: 0 },
    custom: { attached: 0, cleaned: 0 },
    menu: { attached: 0, cleaned: 0 },
    paragraph: { attached: 0, cleaned: 0 },
    nowrap: { attached: 0, cleaned: 0 },
  });
  const signature = `${variant}/${mode}/${rtl}`;
  // A new token also invalidates old callbacks after controls return to an
  // earlier configuration with identical dimensions and the same visible label.
  const config = useMemo(() => ({ signature }), [signature]);
  const current = useRef(config);
  useLayoutEffect(() => {
    current.current = config;
  }, [config]);
  const rootRefs = useMemo(
    () =>
      Object.fromEntries(
        keys.map((key) => {
          const track: RefCallback<TextInstance> = (node) => {
            const release = () => {
              if (!nodes.current[key]) return;
              delete nodes.current[key];
              refs.current[key].cleaned++;
              revisions.current[key]++;
              setRefRevision((value) => value + 1);
              setReceipts((previous) => {
                const next = { ...previous };
                delete next[key];
                return next;
              });
            };
            if (!node) {
              release();
              return;
            }
            nodes.current[key] = node;
            initial.current[key] ??= node;
            refs.current[key].attached++;
            revisions.current[key]++;
            setRefRevision((value) => value + 1);
            return () => {
              if (nodes.current[key] === node) release();
            };
          };
          return [key, track];
        }),
      ) as Record<Key, RefCallback<TextInstance>>,
    [],
  );
  const layouts = useMemo(
    () =>
      Object.fromEntries(
        keys.map((key) => [
          key,
          (event: LayoutChangeEvent) => {
            if (current.current !== config) return;
            const local = { ...event.nativeEvent.layout };
            const revision = ++revisions.current[key],
              node = nodes.current[key];
            const publish = (window?: Frame) => {
              if (
                current.current !== config ||
                revisions.current[key] !== revision ||
                nodes.current[key] !== node
              )
                return;
              const next = { local, ...(window ? { window } : {}), signature };
              setReceipts((previous) =>
                JSON.stringify(previous[key]) === JSON.stringify(next)
                  ? previous
                  : { ...previous, [key]: next },
              );
            };
            if (!node) publish();
            else node.measureInWindow((x, y, width, height) => publish({ x, y, width, height }));
          },
        ]),
      ) as Record<Key, (event: LayoutChangeEvent) => void>,
    [config, signature],
  );
  const lineHandlers = useMemo(
    () =>
      Object.fromEntries(
        keys.map((key) => [
          key,
          (event: Parameters<TextLayout>[0]) => {
            if (current.current !== config) return;
            const lines = event.nativeEvent.lines.map(
              ({ text, x, y, width, height, capHeight }) => ({
                text,
                x,
                y,
                width,
                height,
                capHeight,
              }),
            );
            const next = { signature, lines };
            setMetrics((previous) =>
              JSON.stringify(previous[key]) === JSON.stringify(next)
                ? previous
                : { ...previous, [key]: next },
            );
          },
        ]),
      ) as Record<Key, TextLayout>,
    [config, signature],
  );
  const kinds = useMemo(
    () => ({
      custom: (value: boolean) =>
        setTextKinds((previous) =>
          previous.custom === value ? previous : { ...previous, custom: value },
        ),
      virtual: (value: boolean) =>
        setTextKinds((previous) =>
          previous.virtual === value ? previous : { ...previous, virtual: value },
        ),
    }),
    [],
  );
  const onPress = useMemo(
    () => (event: GestureResponderEvent) => {
      const { target, pageX, pageY } = event.nativeEvent;
      const timestamp = event.timeStamp;
      setTouch((previous) => ({
        count: (previous?.count ?? 0) + 1,
        target,
        pageX,
        pageY,
        timestamp,
      }));
    },
    [],
  );
  const theme = useMemo(
    () =>
      createTheme({
        typography: { fontFamily: 'System' },
        palette: { text: { primary: '#172431' } },
        components: {
          MuiTypography: {
            defaultProps: {
              selectable: true,
              allowFontScaling: true,
              maxFontSizeMultiplier: 0,
              classes: { root: 'type-default' },
            },
            styleOverrides: {
              root: {
                '&.type-selected': { paddingTop: mode ? '5px' : 0, paddingLeft: mode ? '7px' : 0 },
              },
            },
          },
          MuiMenuItem: {
            styleOverrides: { root: { '& .MuiTypography-root': { color: '#264f78' } } },
          },
        },
      }),
    [mode],
  );
  const { fontScale } = useWindowDimensions();
  const expected =
    variant === 'inherit'
      ? { variant, fontSize: 16, lineHeight: 1.5, weight: 400 }
      : typographySourceVariants.find((entry) => entry.variant === variant)!;
  const inline = mode === 2;
  return (
    <ThemeProvider theme={theme}>
      <View style={{ padding: 8, gap: 8, backgroundColor: '#ffffff' }}>
        <Text allowFontScaling={false} style={{ color: '#203247', fontSize: 16 }}>
          Native typography
        </Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4 }}>
          <Control
            id="next"
            onPress={() =>
              setVariant((value) => variants[(variants.indexOf(value) + 1) % variants.length])
            }
          >
            Next
          </Control>
          {(['body1', 'caption', 'h6', 'inherit'] as const).map((name) => (
            <Control key={name} id={`choose-${name}`} onPress={() => setVariant(name)}>
              {name}
            </Control>
          ))}
          <Control id="style" onPress={() => setMode((value) => (value + 1) % 3)}>
            {['Style: base', 'Style: theme', 'Style: inline'][mode]}
          </Control>
          <Control id="rtl" onPress={() => setRtl((value) => !value)}>
            {rtl ? 'Read: RTL' : 'Read: LTR'}
          </Control>
        </View>
        <Box
          testID="type-contract-sample-stack"
          sx={{ direction: rtl ? 'rtl' : 'ltr', fontSize: '16px', lineHeight: 1.5 }}
        >
          <Typography
            ref={rootRefs.selected}
            testID="type-contract-selected"
            variant={variant}
            classes={{ root: 'type-selected' }}
            gutterBottom
            onLayout={layouts.selected}
            onTextLayout={lineHandlers.selected}
            onPress={onPress}
            sx={{ textAlign: 'start', backgroundColor: '#ffffff' }}
            style={inline ? { margin: 0, padding: 0, textAlign: 'right' } : undefined}
          >
            Mm
          </Typography>
          <View
            testID="type-contract-after"
            collapsable={false}
            style={{ height: 1, backgroundColor: '#dfe5eb' }}
          />
        </Box>
        <Box sx={{ fontSize: '16px', lineHeight: 1.5, direction: rtl ? 'rtl' : 'ltr' }}>
          <Typography
            component={CustomText}
            tone="quiet"
            onKind={kinds.custom}
            variant="inherit"
            ref={rootRefs.custom}
            testID="type-contract-custom"
            accessible
            onLayout={layouts.custom}
            onTextLayout={lineHandlers.custom}
          >
            <Counter key="retained" onCount={setChildCount} />
          </Typography>
          <Typography
            ref={rootRefs.paragraph}
            testID="type-contract-paragraph"
            variant="inherit"
            onLayout={layouts.paragraph}
            onTextLayout={lineHandlers.paragraph}
            sx={{ textAlign: 'left', backgroundColor: '#ffffff' }}
          >
            <Typography
              component={CustomText}
              tone="quiet"
              onKind={kinds.virtual}
              variant="inherit"
              sx={{ direction: rtl ? 'ltr' : 'rtl', textAlign: 'left' }}
            >
              Ink.
            </Typography>
          </Typography>
        </Box>
        <MenuList dense>
          <MenuItem testID="type-contract-menu-item" accessible={false}>
            <Typography
              ref={rootRefs.menu}
              testID="type-contract-menu"
              variant="body2"
              onLayout={layouts.menu}
              onTextLayout={lineHandlers.menu}
              sx={{ color: '#b33e3e', backgroundColor: '#ffffff' }}
              style={inline ? { color: '#276749' } : undefined}
            >
              Menu
            </Typography>
          </MenuItem>
        </MenuList>
        <Typography
          ref={rootRefs.nowrap}
          testID="type-contract-nowrap"
          noWrap
          onLayout={layouts.nowrap}
          onTextLayout={lineHandlers.nowrap}
          sx={{
            width: '180px',
            direction: 'ltr',
            textAlign: 'left',
            color: '#172431',
            backgroundColor: '#ffffff',
          }}
        >
          WWWWWWWWWWWWWWWWWWWWWWWWW
        </Typography>
        <Text
          testID="type-contract-receipt"
          allowFontScaling={false}
          accessibilityLabel={JSON.stringify({
            variant,
            mode,
            rtl,
            fontScale,
            expected,
            childCount,
            textKinds,
            refs: Object.fromEntries(
              keys.map((key) => [
                key,
                {
                  ...refs.current[key],
                  sameRoot:
                    Boolean(nodes.current[key]) && nodes.current[key] === initial.current[key],
                },
              ]),
            ),
            refRevision,
            receipts,
            metrics,
            touch,
          })}
          style={{ color: '#526274', fontSize: 12 }}
        >
          {variant} · {['base', 'theme', 'inline'][mode]} · {rtl ? 'RTL' : 'LTR'} · Count{' '}
          {childCount} · OS {fontScale.toFixed(2)}×
        </Text>
      </View>
    </ThemeProvider>
  );
}
