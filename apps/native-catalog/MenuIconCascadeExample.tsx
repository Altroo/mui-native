// Copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type RefCallback,
} from 'react';
import { useWindowDimensions, type LayoutChangeEvent, type ViewInstance } from 'react-native';
import {
  Box,
  Button,
  ListItemIcon,
  MenuItem,
  MenuList,
  Stack,
  ThemeProvider,
  Typography,
  createTheme,
  useTheme,
  type SxProps,
} from '@mui/material';
import Check from '@mui/icons-material/Check';

const keys = [
  'parent-root',
  'parent-glyph',
  'inline-root',
  'inline-glyph',
  'dense-root',
  'dense-glyph',
] as const;
type Key = (typeof keys)[number];
type Row = 'parent' | 'inline' | 'dense';
type Rect = { x: number; y: number; width: number; height: number };
type Measured = Pick<ViewInstance, 'measureInWindow'>;
type Receipt = {
  local: Rect;
  window?: Rect;
  refRevision: number;
  sequence: number;
  error?: string;
};
const finiteRect = (rect: Rect) =>
  Object.values(rect).every(Number.isFinite) && rect.width > 0 && rect.height > 0;
const initialCounters = () =>
  Object.fromEntries(keys.map((key) => [key, { attached: 0, cleaned: 0, revision: 0 }])) as Record<
    Key,
    { attached: number; cleaned: number; revision: number }
  >;

/** @internal Catalog-only receipt collector; no expected geometry is substituted for native values. */
export function useMenuIconMeasurements() {
  const nodes = useRef<Partial<Record<Key, Measured>>>({}),
    first = useRef<Partial<Record<Key, Measured>>>({}),
    local = useRef<Partial<Record<Key, Rect>>>({});
  const counters = useRef(initialCounters()),
    epochs = useRef(Object.fromEntries(keys.map((key) => [key, 0])) as Record<Key, number>),
    revision = useRef(0),
    mounted = useRef(true);
  const [refRevision, setRefRevision] = useState(0),
    [receipts, setReceipts] = useState<Partial<Record<Key, Receipt>>>({});
  const publish = useCallback((key: Key, value: Receipt | undefined) => {
    if (!mounted.current) return;
    setReceipts((previous) => {
      if (JSON.stringify(previous[key]) === JSON.stringify(value)) return previous;
      const next = { ...previous };
      if (value) next[key] = value;
      else delete next[key];
      return next;
    });
  }, []);
  const measure = useCallback(
    (key: Key) => {
      const node = nodes.current[key],
        bounds = local.current[key];
      if (!node || !bounds) return;
      const token = ++epochs.current[key],
        refToken = counters.current[key].revision;
      const current = () =>
        mounted.current &&
        nodes.current[key] === node &&
        epochs.current[key] === token &&
        counters.current[key].revision === refToken;
      try {
        node.measureInWindow((x, y, width, height) => {
          if (!current()) return;
          const window = { x, y, width, height };
          publish(key, {
            local: bounds,
            ...(finiteRect(window)
              ? { window }
              : { error: 'Native measurement is empty or nonfinite' }),
            refRevision: refToken,
            sequence: token,
          });
        });
      } catch {
        if (current())
          publish(key, {
            local: bounds,
            refRevision: refToken,
            sequence: token,
            error: 'Native ref could not measure',
          });
      }
    },
    [publish],
  );
  const refs = useMemo(
    () =>
      Object.fromEntries(
        keys.map((key) => {
          let detach: (() => void) | undefined;
          const attach: RefCallback<Measured> = (node) => {
            detach?.();
            detach = undefined;
            if (!node) return;
            nodes.current[key] = node;
            first.current[key] ??= node;
            counters.current[key].attached++;
            counters.current[key].revision++;
            epochs.current[key]++;
            revision.current++;
            publish(key, undefined);
            if (mounted.current) setRefRevision(revision.current);
            let cleaned = false;
            const cleanup = () => {
              if (cleaned) return;
              cleaned = true;
              if (detach === cleanup) detach = undefined;
              if (nodes.current[key] !== node) return;
              delete nodes.current[key];
              counters.current[key].cleaned++;
              counters.current[key].revision++;
              epochs.current[key]++;
              revision.current++;
              publish(key, undefined);
              if (mounted.current) setRefRevision(revision.current);
            };
            detach = cleanup;
            return cleanup;
          };
          return [key, attach];
        }),
      ) as Record<Key, RefCallback<Measured>>,
    [publish],
  );
  const layouts = useMemo(
    () =>
      Object.fromEntries(
        keys.map((key) => [
          key,
          (event: LayoutChangeEvent) => {
            const bounds = { ...event.nativeEvent.layout };
            if (!finiteRect(bounds)) {
              delete local.current[key];
              epochs.current[key]++;
              publish(key, undefined);
              return;
            }
            local.current[key] = bounds;
            measure(key);
          },
        ]),
      ) as Record<Key, (event: LayoutChangeEvent) => void>,
    [measure, publish],
  );
  const measureAll = useCallback(() => {
    for (const key of keys) measure(key);
  }, [measure]);
  useLayoutEffect(() => {
    mounted.current = true;
    setRefRevision(revision.current);
    return () => {
      mounted.current = false;
      for (const key of keys) epochs.current[key]++;
    };
  }, []);
  // A replacement can have identical layout bounds, so onLayout alone cannot
  // acknowledge its new handle. The ref revision forces a fresh real measure.
  useEffect(measureAll, [refRevision, measureAll]);
  const refsSnapshot = Object.fromEntries(
    keys.map((key) => [
      key,
      {
        ...counters.current[key],
        sameRoot: nodes.current[key] !== undefined && nodes.current[key] === first.current[key],
      },
    ]),
  );
  return { refs, layouts, receipts, refRevision, refsSnapshot, measureAll };
}
const inlineRoot = Object.freeze({ minWidth: 84, color: '#204e9c' }),
  inlineGlyph = Object.freeze({ fontSize: 40, color: '#204e9c' });
interface RowProps {
  row: Row;
  accent: boolean;
  selected: boolean;
  compact: boolean;
  rules?: SxProps;
  measurements: ReturnType<typeof useMenuIconMeasurements>;
  onCount: (row: Row, count: number) => void;
}
function StatefulRow({ row, accent, selected, compact, rules, measurements, onCount }: RowProps) {
  const [count, setCount] = useState(0);
  useEffect(() => onCount(row, count), [row, count, onCount]);
  const title =
    row === 'parent' ? 'Parent rules' : row === 'inline' ? 'Inline style' : 'Dense vector';
  const root = `${row}-root` as Key,
    glyph = `${row}-glyph` as Key;
  return (
    <MenuItem
      testID={`menu-style-${row}-row`}
      selected={selected}
      style={{ minHeight: 44 }}
      sx={rules}
      accessibilityLabel={`${title} count ${count}`}
      onClick={() => setCount((value) => value + 1)}
    >
      <ListItemIcon
        testID={`menu-style-${root}`}
        ref={measurements.refs[root]}
        onLayout={measurements.layouts[root]}
        accessible={false}
        classes={accent ? { root: 'menu-style-accent' } : undefined}
        sx={row === 'dense' ? undefined : { minWidth: 90, color: '#bc2a43' }}
        style={row === 'inline' ? inlineRoot : undefined}
      >
        <Check
          testID={`menu-style-${glyph}`}
          titleAccess={row === 'dense' ? 'Dense vector' : `${title} vector`}
          ref={measurements.refs[glyph]}
          onLayout={measurements.layouts[glyph]}
          sx={row === 'dense' ? undefined : { fontSize: 45, color: '#bc2a43' }}
          style={row === 'inline' ? inlineGlyph : undefined}
        />
      </ListItemIcon>
      <Box sx={{ flex: 1, minWidth: 0, marginLeft: 1.5 }}>
        <Typography variant="body2">
          {compact ? (row === 'parent' ? 'CSS' : row === 'inline' ? 'Inline' : 'Dense') : title}
        </Typography>
        <Typography variant="caption" testID={`menu-style-${row}-count`}>
          {compact ? count : `Activated ${count}`}
        </Typography>
      </Box>
    </MenuItem>
  );
}
/** Focused measured scene, mounted by the catalog's existing wrapper navigation. */
export function MenuIconCascadeExample() {
  const outer = useTheme(),
    { width, fontScale } = useWindowDimensions();
  const [accent, setAccent] = useState(false),
    [selected, setSelected] = useState(false),
    [cssRoot, setCssRoot] = useState<16 | 24>(16),
    [counts, setCounts] = useState<Partial<Record<Row, number>>>({}),
    [measureRequests, setMeasureRequests] = useState(0);
  const measurements = useMenuIconMeasurements();
  const compact = fontScale >= 1.6 || width < 350;
  const theme = useMemo(
    () => createTheme({ ...outer, cssRootFontSize: cssRoot }),
    [outer, cssRoot],
  );
  const onCount = useCallback(
    (row: Row, count: number) =>
      setCounts((previous) => (previous[row] === count ? previous : { ...previous, [row]: count })),
    [],
  );
  const rules = useMemo<SxProps>(
    () => ({
      '& .MuiListItemIcon-root': { minWidth: 56, color: '#2f6f4f' },
      '& .MuiListItemIcon-root svg': { fontSize: '31px', color: '#2f6f4f' },
      '& .MuiListItemIcon-root.menu-style-accent': { minWidth: 68, color: '#8f3f71' },
      '& .MuiListItemIcon-root.menu-style-accent svg': { fontSize: '35px', color: '#8f3f71' },
      '&.Mui-selected .MuiListItemIcon-root': { minWidth: 72, color: '#2b667e' },
      '&.Mui-selected .MuiListItemIcon-root svg': { fontSize: '37px', color: '#2b667e' },
    }),
    [],
  );
  useEffect(measurements.measureAll, [
    measurements.measureAll,
    accent,
    selected,
    cssRoot,
    width,
    fontScale,
  ]);
  const complete = keys.filter((key) => measurements.receipts[key]?.window).length;
  const receipt = {
    fontScale,
    cssRoot,
    accent,
    selected,
    counts,
    measureRequests,
    refRevision: measurements.refRevision,
    refs: measurements.refsSnapshot,
    receipts: measurements.receipts,
  };
  return (
    <ThemeProvider theme={theme}>
      <Stack testID="menu-style-scene" spacing={2.5} sx={{ padding: 1 }}>
        <Stack spacing={0.75}>
          <Typography testID="menu-style-heading" variant={compact ? 'body1' : 'h6'}>
            {compact ? 'Styles' : 'One menu, shared styles'}
          </Typography>
          {compact ? null : (
            <Typography variant="body2" color="text.secondary">
              Parent rules, child preferences and a final native style.
            </Typography>
          )}
        </Stack>
        <Stack spacing={1}>
          <Button
            testID="menu-style-class"
            variant="outlined"
            style={{ minHeight: 44 }}
            onClick={() => setAccent((value) => !value)}
          >
            {compact ? 'Class' : `Class: ${accent ? 'accent' : 'standard'}`}
          </Button>
          <Button
            testID="menu-style-selected"
            variant="outlined"
            style={{ minHeight: 44 }}
            onClick={() => setSelected((value) => !value)}
          >
            {compact ? 'State' : `Selected: ${selected ? 'yes' : 'no'}`}
          </Button>
          <Button
            testID="menu-style-root"
            variant="outlined"
            style={{ minHeight: 44 }}
            onClick={() => setCssRoot((value) => (value === 16 ? 24 : 16))}
          >
            {compact ? `Root ${cssRoot}` : `CSS root: ${cssRoot}`}
          </Button>
          <Button
            testID="menu-style-measure"
            style={{ minHeight: 44 }}
            onClick={() => {
              setMeasureRequests((value) => value + 1);
              measurements.measureAll();
            }}
          >
            {compact ? 'Measure' : 'Measure roots'}
          </Button>
        </Stack>
        <Box sx={{ borderTopWidth: 1, borderColor: 'divider', paddingTop: 2 }}>
          <Typography variant="subtitle2">{compact ? 'CSS' : 'Parent CSS wins'}</Typography>
          <MenuList>
            <StatefulRow
              compact={compact}
              row="parent"
              accent={accent}
              selected={selected}
              rules={rules}
              measurements={measurements}
              onCount={onCount}
            />
          </MenuList>
        </Box>
        <Box sx={{ borderTopWidth: 1, borderColor: 'divider', paddingTop: 2 }}>
          <Typography variant="subtitle2">{compact ? 'Inline' : 'Native inline wins'}</Typography>
          <MenuList>
            <StatefulRow
              compact={compact}
              row="inline"
              accent={accent}
              selected={selected}
              rules={rules}
              measurements={measurements}
              onCount={onCount}
            />
          </MenuList>
        </Box>
        <Box sx={{ borderTopWidth: 1, borderColor: 'divider', paddingTop: 2 }}>
          <Typography variant="subtitle2">{compact ? 'Dense' : 'Dense rem calibration'}</Typography>
          {compact ? null : (
            <Typography variant="body2" color="text.secondary">
              1.25rem follows the CSS root.
            </Typography>
          )}
          <MenuList dense>
            <StatefulRow
              compact={compact}
              row="dense"
              accent={false}
              selected={false}
              measurements={measurements}
              onCount={onCount}
            />
          </MenuList>
        </Box>
        <Typography
          testID="menu-style-receipt"
          variant="caption"
          accessibilityLabel={JSON.stringify(receipt)}
        >
          {compact
            ? `Measured ${complete}/6`
            : `${complete}/6 native roots measured · OS ${fontScale.toFixed(2)}×`}
        </Typography>
      </Stack>
    </ThemeProvider>
  );
}
