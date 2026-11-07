// Copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT
import { memo, useCallback, useEffect, useMemo, useRef, useState, type RefCallback } from 'react';
import {
  I18nManager,
  Pressable,
  ScrollView,
  Text,
  View,
  useWindowDimensions,
  type ViewInstance,
  type ViewStyle,
  type NativeSyntheticEvent,
  type NativeScrollEvent,
} from 'react-native';
import { Paper, ThemeProvider, createTheme } from '@mui/material';

export type PaperBenchmarkMode = 'rn' | 'mui';
export const paperBenchmarkStages = [
  { name: 'initial', elevation: 1, dark: false, square: false, variant: 'elevation' },
  { name: 'zero', elevation: 0, dark: false, square: false, variant: 'elevation' },
  { name: 'raised', elevation: 8, dark: false, square: false, variant: 'elevation' },
  { name: 'high', elevation: 24, dark: false, square: false, variant: 'elevation' },
  { name: 'dark-high', elevation: 24, dark: true, square: false, variant: 'elevation' },
  { name: 'dark-raised', elevation: 8, dark: true, square: false, variant: 'elevation' },
  { name: 'dark-square', elevation: 1, dark: true, square: true, variant: 'elevation' },
  { name: 'outlined', elevation: 1, dark: true, square: true, variant: 'outlined' },
  { name: 'restored', elevation: 1, dark: false, square: false, variant: 'elevation' },
] as const;
const themes = [createTheme(), createTheme({ palette: { mode: 'dark' } })];
// Finite original MIT MUI9.5.0 observations, verified against the pinned fixture
// by the workload tests. The baseline never invokes Paper or the CSS resolver.
const overlayAlphas: Record<number, number> = { 0: 0, 1: 0.051, 8: 0.119, 24: 0.165 };
const nativeSurfaces = paperBenchmarkStages.map((stage): ViewStyle => {
  const theme = themes[Number(stage.dark)];
  const color = `rgba(255, 255, 255, ${overlayAlphas[stage.elevation]})`;
  return {
    backgroundColor: theme.palette.background.paper,
    ...(!stage.square ? { borderRadius: 4 } : {}),
    ...(stage.variant === 'outlined'
      ? ({ borderWidth: 1, borderStyle: 'solid', borderColor: theme.palette.divider } as const)
      : {
          boxShadow: theme.shadows[stage.elevation],
          ...(stage.dark
            ? {
                backgroundImage: [
                  { type: 'linear-gradient' as const, colorStops: [{ color }, { color }] },
                ],
              }
            : {}),
        }),
  };
});
type Counts = {
  mounts: number;
  cleanups: number;
  rootAttachments: number;
  rootCleanups: number;
  rootReplacements: number;
  rowEpochCommits: number;
  rowUpdateCommits: number;
};
type RowProps = {
  index: number;
  mode: PaperBenchmarkMode;
  epoch: number;
  lifecycle: (event: 'mounts' | 'cleanups') => void;
  rootEvent: (event: 'rootAttachments' | 'rootCleanups' | 'rootReplacements') => void;
  committed: (index: number, epoch: number) => void;
};
const inline: ViewStyle = { width: '100%', minHeight: 72, padding: 12, margin: 0 };
const Row = memo(function Row({ index, mode, epoch, lifecycle, rootEvent, committed }: RowProps) {
  useEffect(() => {
    lifecycle('mounts');
    return () => lifecycle('cleanups');
  }, [lifecycle]);
  useEffect(() => committed(index, epoch), [index, epoch, committed]);
  const first = useRef<ViewInstance | null>(null),
    release = useRef<(() => void) | undefined>(undefined);
  const ref = useCallback<RefCallback<ViewInstance>>(
    (node) => {
      if (!node) {
        release.current?.();
        release.current = undefined;
        return;
      }
      if (first.current && first.current !== node) rootEvent('rootReplacements');
      first.current ??= node;
      rootEvent('rootAttachments');
      let released = false;
      const cleanup = () => {
        if (!released) {
          released = true;
          rootEvent('rootCleanups');
        }
      };
      release.current = cleanup;
      return cleanup;
    },
    [rootEvent],
  );
  const stage = paperBenchmarkStages[epoch],
    theme = themes[Number(stage.dark)],
    id = String(index).padStart(3, '0');
  const content = (
    <>
      <Text
        testID={`paper-benchmark-label-${id}`}
        style={{
          fontFamily: 'System',
          fontSize: 14,
          lineHeight: 20,
          color: theme.palette.text.primary,
        }}
      >{`Surface ${id}`}</Text>
      <Text
        testID={`paper-benchmark-detail-${id}`}
        style={{
          fontFamily: 'System',
          fontSize: 14,
          lineHeight: 20,
          color: theme.palette.text.primary,
        }}
      >{`Epoch ${epoch} / ${stage.name}`}</Text>
    </>
  );
  return mode === 'rn' ? (
    <View
      ref={ref}
      testID={`paper-benchmark-row-${id}`}
      collapsable={false}
      style={[nativeSurfaces[epoch], inline]}
    >
      {content}
    </View>
  ) : (
    <Paper
      ref={ref}
      testID={`paper-benchmark-row-${id}`}
      collapsable={false}
      elevation={stage.elevation}
      square={stage.square}
      variant={stage.variant}
      style={inline}
    >
      {content}
    </Paper>
  );
});
/** Counts acknowledge React commits/ref leases. They are not native timings or UIView identity. */
export function PaperBenchmark({
  mode = 'rn',
  rowCount = 100,
}: {
  mode?: PaperBenchmarkMode;
  rowCount?: number;
}) {
  if (!['rn', 'mui'].includes(mode) || !Number.isFinite(rowCount))
    throw new RangeError('Invalid Paper benchmark configuration');
  const rows = Math.max(1, Math.min(100, Math.trunc(rowCount))),
    [epoch, setEpoch] = useState(0);
  const [counts, setCounts] = useState<Counts>({
    mounts: 0,
    cleanups: 0,
    rootAttachments: 0,
    rootCleanups: 0,
    rootReplacements: 0,
    rowEpochCommits: 0,
    rowUpdateCommits: 0,
  });
  const [scroll, setScroll] = useState({ sequence: 0, offsetY: 0 }),
    epochs = useRef(new Map<number, number>());
  const lifecycle = useCallback(
    (event: 'mounts' | 'cleanups') => setCounts((c) => ({ ...c, [event]: c[event] + 1 })),
    [],
  );
  const rootEvent = useCallback(
    (event: 'rootAttachments' | 'rootCleanups' | 'rootReplacements') =>
      setCounts((c) => ({ ...c, [event]: c[event] + 1 })),
    [],
  );
  const committed = useCallback((index: number, current: number) => {
    const previous = epochs.current.get(index);
    if (previous === current) return;
    epochs.current.set(index, current);
    setCounts((c) => ({
      ...c,
      rowEpochCommits: c.rowEpochCommits + 1,
      rowUpdateCommits: c.rowUpdateCommits + Number(previous !== undefined),
    }));
  }, []);
  const finishedScroll = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
    // End events carry their own final offset; a throttled scroll event may be
    // older. Snapshot before a deferred updater can observe a released event.
    const offsetY = event.nativeEvent.contentOffset.y;
    setScroll((s) => ({ sequence: s.sequence + 1, offsetY }));
  }, []);
  const { fontScale } = useWindowDimensions(),
    stage = paperBenchmarkStages[epoch],
    theme = themes[Number(stage.dark)];
  const content = useMemo(
    () =>
      Array.from({ length: rows }, (_, index) => (
        <Row
          key={index}
          index={index}
          mode={mode}
          epoch={epoch}
          lifecycle={lifecycle}
          rootEvent={rootEvent}
          committed={committed}
        />
      )),
    [rows, mode, epoch, lifecycle, rootEvent, committed],
  );
  const completedRows = [...epochs.current.values()].filter((value) => value === epoch).length;
  const receipt = {
    schemaVersion: 1,
    workload: 'paper-surface-v1',
    sourceId: process.env.EXPO_PUBLIC_MUI_BENCHMARK_SOURCE_ID ?? 'unidentified',
    dev: __DEV__,
    hermes: Boolean((globalThis as { HermesInternal?: unknown }).HermesInternal),
    mode,
    rowCount: rows,
    epoch,
    stage,
    fontScale,
    globalRtl: I18nManager.isRTL,
    swapInRtl: I18nManager.doLeftAndRightSwapInRTL,
    ...counts,
    completedRows,
    scroll,
    ready:
      counts.mounts - counts.cleanups === rows &&
      counts.rootAttachments - counts.rootCleanups === rows &&
      completedRows === rows,
  };
  return (
    <ThemeProvider theme={theme}>
      <View style={{ gap: 6, flexShrink: 1 }}>
        <Pressable
          testID="paper-benchmark-advance"
          accessibilityRole="button"
          accessibilityState={{ disabled: epoch === 8 }}
          disabled={epoch === 8}
          onPress={() => setEpoch((value) => Math.min(8, value + 1))}
          style={{
            minHeight: 44,
            padding: 8,
            backgroundColor: '#e6ebf0',
            justifyContent: 'center',
          }}
        >
          <Text style={{ fontSize: 14, color: '#203247' }}>Advance update</Text>
        </Pressable>
        <ScrollView
          testID="paper-benchmark-viewport"
          style={{ height: 320, flexGrow: 0 }}
          contentContainerStyle={{ padding: 12, gap: 8 }}
          removeClippedSubviews={false}
          bounces={false}
          overScrollMode="never"
          automaticallyAdjustContentInsets={false}
          contentInsetAdjustmentBehavior="never"
          onScrollEndDrag={finishedScroll}
          onMomentumScrollEnd={finishedScroll}
        >
          {content}
        </ScrollView>
        <Text
          testID="paper-benchmark-receipt"
          accessibilityLabel={JSON.stringify(receipt)}
          style={{ fontSize: 11, color: '#203247' }}
        >
          {receipt.ready ? 'Ready' : 'Committing'} / {mode} / epoch {epoch}
        </Text>
      </View>
    </ThemeProvider>
  );
}
