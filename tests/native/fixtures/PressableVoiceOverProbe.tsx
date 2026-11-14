// Copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT
import { useState } from 'react';
import { PixelRatio, Pressable, Text, View } from 'react-native';
import { NativePressable } from '@altroo/mui-native-host';

/** Independent stock control distinguishes VoiceOver gesture delivery from a host regression. */
export function PressableVoiceOverProbe() {
  const [counts, setCounts] = useState({ stock: 0, native: 0 });
  const report = { development: __DEV__, fontScale: PixelRatio.getFontScale(), ...counts };
  const style = { minHeight: 56, padding: 16, backgroundColor: '#e3f2fd' };
  return (
    <View style={{ flex: 1, padding: 24, paddingTop: 64, gap: 24, backgroundColor: '#fff' }}>
      <Text>VoiceOver activation control</Text>
      <Pressable
        testID="pressable-vo-stock"
        accessibilityRole="button"
        accessibilityLabel={`Stock presses ${counts.stock}`}
        style={style}
        onPress={() => setCounts((old) => ({ ...old, stock: old.stock + 1 }))}
      >
        <Text>Stock control</Text>
      </Pressable>
      <NativePressable
        testID="pressable-vo-native"
        accessibilityRole="button"
        accessibilityLabel={`Native presses ${counts.native}`}
        style={style}
        onPress={() => setCounts((old) => ({ ...old, native: old.native + 1 }))}
      >
        <Text>Native control</Text>
      </NativePressable>
      <Text testID="pressable-vo-receipt" accessibilityLabel={JSON.stringify(report)}>
        Stock {counts.stock}; Native {counts.native}
      </Text>
    </View>
  );
}
