// Copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { PaperBenchmark, type PaperBenchmarkMode } from '../native-benchmark/PaperBenchmark';

/** Each selection/sample owns a fresh cohort; retained updates stay inside it. */
export function PaperBenchmarkExample({ rowCount = 100 }: { rowCount?: number }) {
  if (!Number.isFinite(rowCount)) throw new RangeError('Paper rowCount must be finite');
  const rows = Math.max(1, Math.min(100, Math.trunc(rowCount)));
  const [{ mode, sample }, setSelection] = useState({
    mode: 'rn' as PaperBenchmarkMode,
    sample: 0,
  });
  const cohortId = `paper-benchmark-cohort-${sample}-${mode}-${rows}`;
  return (
    <View style={{ gap: 6, flexShrink: 1 }}>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        {(['rn', 'mui'] as const).map((value) => (
          <Pressable
            key={value}
            testID={`paper-benchmark-mode-${value}`}
            accessibilityRole="button"
            accessibilityState={{ selected: mode === value }}
            onPress={() => setSelection((s) => ({ mode: value, sample: s.sample + 1 }))}
            style={{
              minHeight: 44,
              flex: 1,
              padding: 8,
              justifyContent: 'center',
              backgroundColor: mode === value ? '#cfdfeb' : '#e6ebf0',
            }}
          >
            <Text style={{ fontSize: 14, color: '#203247' }}>
              {value === 'rn' ? 'Native View' : 'MUI Paper'}
            </Text>
          </Pressable>
        ))}
        <Pressable
          testID="paper-benchmark-new-sample"
          accessibilityRole="button"
          onPress={() => setSelection((s) => ({ ...s, sample: s.sample + 1 }))}
          style={{
            minHeight: 44,
            padding: 8,
            justifyContent: 'center',
            backgroundColor: '#e6ebf0',
          }}
        >
          <Text style={{ fontSize: 14, color: '#203247' }}>New sample</Text>
        </Pressable>
      </View>
      <Text
        testID="paper-benchmark-controller"
        accessibilityLabel={JSON.stringify({
          schemaVersion: 1,
          mode,
          sample,
          rowCount: rows,
          cohortId,
        })}
        style={{ fontSize: 11, color: '#203247' }}
      >
        Paper / {rows} roots / sample {sample}
      </Text>
      <View key={cohortId} testID={cohortId} collapsable={false}>
        <PaperBenchmark mode={mode} rowCount={rows} />
      </View>
    </View>
  );
}
