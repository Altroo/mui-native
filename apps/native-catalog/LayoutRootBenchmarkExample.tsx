// Copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import {
  LayoutRootBenchmark,
  type LayoutRootBenchmarkFamily,
} from '../native-benchmark/LayoutRootBenchmark';

/** Selection creates a fresh measured cohort. Build identity/counters stay owned by the workload. */
export function LayoutRootBenchmarkExample({ rowCount = 100 }: { rowCount?: number }) {
  if (!Number.isFinite(rowCount)) throw new RangeError('Layout benchmark rowCount must be finite.');
  const rows = Math.max(1, Math.min(100, Math.trunc(rowCount)));
  const [selection, setSelection] = useState({
    mode: 'rn' as 'rn' | 'mui',
    family: 'form-group' as LayoutRootBenchmarkFamily,
    operation: 'update' as 'mount' | 'update',
    sample: 0,
  });
  const { mode, family, operation, sample } = selection;
  const cohortId = `layout-root-cohort-${sample}-${mode}-${family}-${operation}-${rows}`;
  const controls = [
    {
      id: 'layout-root-controller-mode',
      label: mode === 'rn' ? 'RN' : 'MUI',
      run: () =>
        setSelection((previous) => ({
          ...previous,
          mode: previous.mode === 'rn' ? 'mui' : 'rn',
          sample: previous.sample + 1,
        })),
    },
    {
      id: 'layout-root-controller-family',
      label:
        family === 'form-group' ? 'Form' : family === 'list-item-avatar' ? 'Avatar' : 'Buttons',
      run: () =>
        setSelection((previous) => ({
          ...previous,
          family:
            previous.family === 'form-group'
              ? 'list-item-avatar'
              : previous.family === 'list-item-avatar'
                ? 'button-group'
                : 'form-group',
          sample: previous.sample + 1,
        })),
    },
    {
      id: 'layout-root-controller-operation',
      label: operation === 'mount' ? 'Mount' : 'Update',
      run: () =>
        setSelection((previous) => ({
          ...previous,
          operation: previous.operation === 'mount' ? 'update' : 'mount',
          sample: previous.sample + 1,
        })),
    },
    {
      id: 'layout-root-new-sample',
      label: 'New sample',
      run: () => setSelection((previous) => ({ ...previous, sample: previous.sample + 1 })),
    },
  ];
  return (
    <View style={styles.screen}>
      <View style={styles.controls}>
        {controls.map(({ id, label, run }) => (
          <Pressable
            key={id}
            testID={id}
            accessibilityRole="button"
            style={styles.control}
            onPress={run}
          >
            <Text style={styles.label}>{label}</Text>
          </Pressable>
        ))}
      </View>
      <Text
        testID="layout-root-controller-receipt"
        accessibilityLabel={JSON.stringify({
          schemaVersion: 1,
          mode,
          family,
          operation,
          rowCount: rows,
          sample,
          cohortId,
        })}
        style={styles.status}
      >
        {rows} rows · sample {sample}
      </Text>
      <View key={cohortId} testID={cohortId} collapsable={false}>
        <LayoutRootBenchmark
          mode={mode}
          family={family}
          operation={operation}
          rowCount={rows}
          cohortId={cohortId}
        />
      </View>
    </View>
  );
}
const styles = StyleSheet.create({
  screen: { flex: 1 },
  controls: { flexDirection: 'row', gap: 6 },
  control: {
    flex: 1,
    minHeight: 44,
    paddingHorizontal: 4,
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#aab9b0',
    borderRadius: 6,
  },
  label: { fontSize: 12, fontWeight: '500', color: '#183c33', textAlign: 'center' },
  status: { fontSize: 11, lineHeight: 16, color: '#55645f' },
});
