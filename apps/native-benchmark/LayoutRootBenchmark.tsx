// Copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT
import { memo, useCallback, useEffect, useMemo, useRef, useState, type RefCallback } from 'react';
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type ViewInstance,
} from 'react-native';
import {
  Button,
  ButtonGroup,
  FormControl,
  FormGroup,
  List,
  ListItem,
  ListItemAvatar,
  ThemeProvider,
  createTheme,
  type Theme,
} from '@mui/material';

export type LayoutRootBenchmarkFamily = 'form-group' | 'list-item-avatar' | 'button-group';

export interface LayoutRootBenchmarkProps {
  mode?: 'rn' | 'mui';
  family?: LayoutRootBenchmarkFamily;
  operation?: 'mount' | 'update';
  rowCount?: number;
}
type Counters = {
  mounts: number;
  cleanups: number;
  rootAttachments: number;
  rootCleanups: number;
  rowEpochCommits: number;
  rowUpdateCommits: number;
};
type RowProps = {
  index: number;
  mode: 'rn' | 'mui';
  family: LayoutRootBenchmarkFamily;
  epoch: number;
  row: boolean;
  error: boolean;
  alternateStyle: boolean;
  theme: Theme;
  lifecycle: (index: number, event: 'mount' | 'cleanup') => void;
  rootEvent: (event: 'attach' | 'cleanup') => void;
  committed: (index: number, epoch: number) => void;
};
const themes = (['light', 'dark'] as const).map((mode) =>
  createTheme({
    palette: { mode },
    components: {
      MuiFormGroup: {
        styleOverrides: {
          root: ({ theme, ownerState }) => ({
            borderWidth: 1,
            borderColor: ownerState.error ? theme.palette.error.main : theme.palette.divider,
            backgroundColor: theme.palette.background.paper,
            marginTop: 8,
            paddingTop: 7,
          }),
        },
      },
      MuiButtonGroup: {
        styleOverrides: {
          root: ({ theme, ownerState }) => ({
            borderWidth: 1,
            borderColor: ownerState.disabled ? theme.palette.error.main : theme.palette.divider,
            backgroundColor: theme.palette.background.paper,
            marginTop: 8,
            paddingTop: 7,
          }),
        },
      },
      MuiListItemAvatar: {
        styleOverrides: {
          root: ({ theme }) => ({
            borderWidth: 1,
            borderColor: theme.palette.divider,
            backgroundColor: theme.palette.background.paper,
            paddingTop: 7,
            '&.layout-root-error': { borderColor: theme.palette.error.main },
          }),
        },
      },
    },
  }),
);

/** Both modes own real local action state; parent updates must preserve it. */
function GroupBenchmarkAction({
  mode,
  content,
  testID,
  disabled,
  theme,
}: {
  mode: 'rn' | 'mui';
  content: string;
  testID: string;
  disabled: boolean;
  theme: Theme;
}) {
  const [presses, setPresses] = useState(0);
  const onPress = () => setPresses((value) => value + 1);
  const label = (
    <Text testID={testID} style={[styles.text, { color: theme.palette.text.primary }]}>
      {content}
    </Text>
  );
  const props = {
    testID: testID + '-action',
    accessibilityLabel: `${content} presses ${presses}`,
    style: styles.groupAction,
  };
  return mode === 'mui' ? (
    <Button {...props} onClick={onPress}>
      {label}
    </Button>
  ) : (
    <Pressable {...props} disabled={disabled} accessibilityRole="button" onPress={onPress}>
      {label}
    </Pressable>
  );
}

const LayoutBenchmarkRow = memo(function LayoutBenchmarkRow({
  index,
  mode,
  family,
  epoch,
  row,
  error,
  alternateStyle,
  theme,
  lifecycle,
  rootEvent,
  committed,
}: RowProps) {
  useEffect(() => {
    lifecycle(index, 'mount');
    return () => lifecycle(index, 'cleanup');
  }, [index, lifecycle]);
  useEffect(() => committed(index, epoch), [index, epoch, committed]);
  const cleanup = useRef<(() => void) | undefined>(undefined);
  const rootRef = useCallback<RefCallback<ViewInstance>>(
    (node) => {
      if (!node) {
        cleanup.current?.();
        cleanup.current = undefined;
        return;
      }
      rootEvent('attach');
      let released = false;
      const release = () => {
        if (!released) {
          released = true;
          rootEvent('cleanup');
        }
      };
      cleanup.current = release;
      return release;
    },
    [rootEvent],
  );
  const id = String(index).padStart(3, '0');
  const inline = {
    margin: 0,
    padding: 0,
    width: '100%' as const,
    minHeight: family === 'button-group' ? (alternateStyle ? 56 : 48) : alternateStyle ? 52 : 44,
    borderRadius: alternateStyle ? 8 : 4,
  };
  const children = [
    <Text
      key="label"
      testID={`layout-root-label-${id}`}
      style={[styles.text, { color: theme.palette.text.primary }]}
    >{`Row ${String(index + 1).padStart(3, '0')}`}</Text>,
    <Text
      key="detail"
      testID={`layout-root-detail-${id}`}
      style={[styles.text, { color: theme.palette.text.primary }]}
    >{`Stage ${String(epoch % 16).padStart(2, '0')}`}</Text>,
  ];
  // The baseline supplies equivalent final native styles; MUI computes its real defaults,
  // inherited error/alignment, theme overrides and native inline shorthand normalization.
  const groupChildren =
    family === 'button-group'
      ? [
          <GroupBenchmarkAction
            key="label"
            mode={mode}
            content={`Row ${String(index + 1).padStart(3, '0')}`}
            testID={`layout-root-label-${id}`}
            disabled={error}
            theme={theme}
          />,
          <GroupBenchmarkAction
            key="detail"
            mode={mode}
            content={`Stage ${String(epoch % 16).padStart(2, '0')}`}
            testID={`layout-root-detail-${id}`}
            disabled={error}
            theme={theme}
          />,
        ]
      : undefined;
  const measured =
    family === 'button-group' && mode === 'mui' ? (
      <ButtonGroup
        ref={rootRef}
        testID={`layout-root-row-${id}`}
        collapsable={false}
        fullWidth
        disableElevation
        disabled={error}
        variant={row ? 'contained' : 'outlined'}
        size="small"
        style={inline}
      >
        {groupChildren}
      </ButtonGroup>
    ) : mode === 'rn' ? (
      <View
        ref={rootRef}
        testID={`layout-root-row-${id}`}
        collapsable={false}
        style={[
          {
            borderWidth: 1,
            borderColor: error ? theme.palette.error.main : theme.palette.divider,
            backgroundColor: theme.palette.background.paper,
            flexDirection:
              family === 'button-group' || (family === 'form-group' && row) ? 'row' : 'column',
            flexWrap: family === 'form-group' ? 'wrap' : 'nowrap',
            minWidth: family === 'list-item-avatar' ? 56 : 0,
            flexShrink: 0,
            marginTop: 0,
            paddingTop: 0,
          },
          inline,
        ]}
      >
        {groupChildren ?? children}
      </View>
    ) : family === 'form-group' ? (
      <FormGroup
        ref={rootRef}
        testID={`layout-root-row-${id}`}
        collapsable={false}
        row={row}
        style={inline}
      >
        {children}
      </FormGroup>
    ) : (
      <ListItemAvatar
        ref={rootRef}
        testID={`layout-root-row-${id}`}
        collapsable={false}
        className={error ? 'layout-root-error' : undefined}
        style={inline}
      >
        {children}
      </ListItemAvatar>
    );
  // Public scaffolding is identical in both modes; private context values are never injected.
  return family === 'list-item-avatar' ? (
    <ListItem
      disablePadding
      disableGutters
      alignItems={row ? 'flex-start' : 'center'}
      style={styles.avatarRow}
    >
      {measured}
    </ListItem>
  ) : (
    measured
  );
});

/** Initial mount samples require a fresh component key/relaunch. Update keeps the cohort mounted.
 * Configuration changes also require a fresh key for independent samples. Counters observe
 * committed row effects/ref leases, not render attempts, native allocations or elapsed time.
 * Receipt readiness acknowledges React commits; it is not a native frame completion signal.
 */
export function LayoutRootBenchmark({
  mode = 'rn',
  family = 'form-group',
  operation = 'update',
  rowCount = 40,
}: LayoutRootBenchmarkProps) {
  if (!Number.isFinite(rowCount)) throw new RangeError('Layout benchmark rowCount must be finite.');
  if (
    !['rn', 'mui'].includes(mode) ||
    !['form-group', 'list-item-avatar', 'button-group'].includes(family) ||
    !['mount', 'update'].includes(operation)
  )
    throw new RangeError('Unknown layout benchmark configuration.');
  const rows = Math.max(1, Math.min(100, Math.trunc(rowCount)));
  const [epoch, setEpoch] = useState(0);
  const [counts, setCounts] = useState<Counters>({
    mounts: 0,
    cleanups: 0,
    rootAttachments: 0,
    rootCleanups: 0,
    rowEpochCommits: 0,
    rowUpdateCommits: 0,
  });
  const epochs = useRef(new Map<number, number>());
  const lifecycle = useCallback((index: number, event: 'mount' | 'cleanup') => {
    if (event === 'cleanup') epochs.current.delete(index);
    setCounts((previous) => ({
      ...previous,
      mounts: previous.mounts + Number(event === 'mount'),
      cleanups: previous.cleanups + Number(event === 'cleanup'),
    }));
  }, []);
  const rootEvent = useCallback((event: 'attach' | 'cleanup') => {
    setCounts((previous) => ({
      ...previous,
      rootAttachments: previous.rootAttachments + Number(event === 'attach'),
      rootCleanups: previous.rootCleanups + Number(event === 'cleanup'),
    }));
  }, []);
  const committed = useCallback((index: number, current: number) => {
    const previous = epochs.current.get(index);
    if (previous === current) return;
    epochs.current.set(index, current);
    setCounts((counts) => ({
      ...counts,
      rowEpochCommits: counts.rowEpochCommits + 1,
      rowUpdateCommits: counts.rowUpdateCommits + Number(previous !== undefined),
    }));
  }, []);
  const row = epoch % 2 === 1,
    error = Math.floor(epoch / 2) % 2 === 1,
    alternateTheme = Math.floor(epoch / 4) % 2 === 1,
    alternateStyle = Math.floor(epoch / 8) % 2 === 1;
  const theme = themes[Number(alternateTheme)];
  const content = useMemo(
    () =>
      Array.from({ length: rows }, (_, index) => (
        <LayoutBenchmarkRow
          key={`layout-root-${index}`}
          index={index}
          mode={mode}
          family={family}
          epoch={epoch}
          row={row}
          error={error}
          alternateStyle={alternateStyle}
          theme={theme}
          lifecycle={lifecycle}
          rootEvent={rootEvent}
          committed={committed}
        />
      )),
    [rows, mode, family, epoch, row, error, alternateStyle, theme, lifecycle, rootEvent, committed],
  );
  const completedRows = [...epochs.current.values()].filter((value) => value === epoch).length;
  const activeRows = counts.mounts - counts.cleanups,
    activeRoots = counts.rootAttachments - counts.rootCleanups;
  const receipt = {
    schemaVersion: 1,
    workload: 'layout-root-v1',
    sourceId: process.env.EXPO_PUBLIC_MUI_BENCHMARK_SOURCE_ID ?? 'unidentified',
    dev: __DEV__,
    hermes: Boolean((globalThis as { HermesInternal?: unknown }).HermesInternal),
    mode,
    family,
    operation,
    rowCount: rows,
    updateEpoch: epoch,
    row,
    error,
    alternateTheme,
    alternateStyle,
    ...counts,
    activeRows,
    activeRoots,
    completedRows,
    ready: activeRows === rows && activeRoots === rows && completedRows === rows,
  };
  return (
    <ThemeProvider theme={theme}>
      <View style={styles.screen}>
        <Text style={styles.title}>Layout root workload</Text>
        <Text style={styles.note}>
          {operation === 'mount'
            ? 'Mount cohort. Remount for the next sample.'
            : 'Advance one epoch on the same mounted roots.'}
        </Text>
        <Pressable
          testID="layout-root-advance"
          accessibilityRole="button"
          accessibilityState={{ disabled: operation === 'mount' }}
          disabled={operation === 'mount'}
          style={styles.advance}
          onPress={() => {
            if (operation === 'update') setEpoch((value) => value + 1);
          }}
        >
          <Text style={styles.buttonText}>Advance update</Text>
        </Pressable>
        <FormControl fullWidth error={error}>
          <ScrollView
            testID="layout-root-viewport"
            style={styles.viewport}
            contentContainerStyle={styles.content}
            removeClippedSubviews={false}
          >
            {family === 'list-item-avatar' ? (
              <List disablePadding style={styles.content}>
                {content}
              </List>
            ) : (
              content
            )}
          </ScrollView>
        </FormControl>
        <Text
          testID="layout-root-receipt"
          accessibilityLabel={JSON.stringify(receipt)}
          style={styles.note}
        >
          {receipt.ready ? 'Ready' : 'Committing'} · {rows} rows · epoch {epoch} · mounts/cleanups{' '}
          {counts.mounts}/{counts.cleanups}
        </Text>
        <Text style={styles.note}>
          No timings are collected here. Native CPU, memory and frames require an optimized-build
          collector.
        </Text>
      </View>
    </ThemeProvider>
  );
}
const styles = StyleSheet.create({
  screen: { padding: 12, gap: 8, backgroundColor: '#f5f3ed' },
  title: { fontSize: 18, fontWeight: '600', color: '#183c33' },
  note: { fontSize: 12, lineHeight: 17, color: '#55645f' },
  advance: {
    minHeight: 44,
    padding: 10,
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#aab9b0',
    borderRadius: 6,
  },
  buttonText: { fontSize: 14, color: '#183c33' },
  viewport: { height: 340 },
  content: { gap: 4 },
  avatarRow: { minHeight: 64 },
  // Match the baseline's final flat action geometry. MUI still resolves real
  // group defaults, variant/disabled context and theme sheets before inline styles.
  groupAction: {
    margin: 0,
    borderWidth: 0,
    borderRadius: 0,
    backgroundColor: 'transparent',
    flexGrow: 1,
    flexBasis: 0,
    minWidth: 40,
    minHeight: 44,
    paddingHorizontal: 8,
    paddingVertical: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
    fontSize: 14,
    lineHeight: 18,
    fontWeight: '400',
  },
});
