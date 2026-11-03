/*
 * Copyright (c) 2026 Altroo and contributors.
 * SPDX-License-Identifier: MIT
 */
import { useRef, useState } from 'react';
import { Animated, Pressable, StyleSheet, Text, View, type ViewInstance } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import Popper from '@mui/material/Popper';
import { ThemeProvider, createTheme } from '@mui/material/styles';

type Mode = 'rn' | 'mui';
const theme = createTheme();
const modifiers = [{ name: 'offset', options: { offset: [0, 8] } }];
const identity = JSON.stringify({
  schemaVersion: 1,
  workload: 'popper-scroll-v1',
  sourceId: process.env.EXPO_PUBLIC_MUI_BENCHMARK_SOURCE_ID ?? 'unidentified',
  dev: __DEV__,
  hermes: Boolean((globalThis as { HermesInternal?: unknown }).HermesInternal),
});

function PopupContent() {
  const [count, setCount] = useState(0);
  return (
    <View testID="benchmark-popup" collapsable={false} style={styles.popup}>
      <Text style={styles.popupTitle}>Delivery note</Text>
      <Pressable
        testID="benchmark-confirm"
        accessibilityRole="button"
        onPress={() => setCount((value) => value + 1)}
        style={styles.confirm}
      >
        <Text testID="benchmark-count" style={styles.confirmText}>{`Read ${count}`}</Text>
      </Pressable>
    </View>
  );
}

/** A deliberately simple shared workload, not an equivalent for all Popper APIs. */
function Workload({ mode }: { mode: Mode }) {
  const scrollY = useRef(new Animated.Value(0)).current;
  const [anchor, setAnchor] = useState<ViewInstance | null>(null);
  return (
    <View style={styles.viewport} testID="benchmark-viewport" collapsable={false}>
      <Animated.ScrollView
        testID="benchmark-scroll"
        style={styles.scroll}
        contentContainerStyle={styles.content}
        bounces={false}
        overScrollMode="never"
        decelerationRate="fast"
        scrollEventThrottle={16}
        // Both modes install the same native event mapping. Only the baseline
        // consumes it as a native animation; MUI observes its actual anchor.
        onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], {
          useNativeDriver: true,
        })}
      >
        {Array.from({ length: 20 }, (_, index) => (
          <View key={index} style={styles.row}>
            <Text style={styles.rowText}>Shipment {String(index + 1).padStart(2, '0')}</Text>
          </View>
        ))}
        <View ref={setAnchor} testID="benchmark-anchor" collapsable={false} style={styles.anchor}>
          <Text style={styles.anchorText}>Dispatch details</Text>
        </View>
      </Animated.ScrollView>
      {mode === 'mui' ? (
        <Popper
          open={Boolean(anchor)}
          anchorEl={anchor}
          placement="bottom-start"
          modifiers={modifiers}
        >
          <PopupContent />
        </Popper>
      ) : (
        <Animated.View
          style={[styles.baseline, { transform: [{ translateY: Animated.multiply(scrollY, -1) }] }]}
        >
          <PopupContent />
        </Animated.View>
      )}
    </View>
  );
}

export default function App() {
  const [{ mode, epoch }, setSelection] = useState({ mode: 'rn' as Mode, epoch: 0 });
  return (
    <SafeAreaProvider>
      <ThemeProvider theme={theme}>
        <SafeAreaView style={styles.screen}>
          <Text style={styles.eyebrow}>ALTROO / NATIVE MEASUREMENTS</Text>
          <Text style={styles.title}>Positioning baseline</Text>
          <Text style={styles.description}>
            Same content, native gestures and release binary. Simple bottom-start placement.
          </Text>
          <View style={styles.modes}>
            {(['rn', 'mui'] as const).map((value) => (
              <Pressable
                key={value}
                testID={`benchmark-mode-${value}`}
                accessibilityRole="button"
                accessibilityState={{ selected: mode === value }}
                onPress={() =>
                  setSelection((previous) => ({ mode: value, epoch: previous.epoch + 1 }))
                }
                style={[styles.mode, mode === value && styles.selected]}
              >
                <Text style={[styles.modeText, mode === value && styles.selectedText]}>
                  {value === 'rn' ? 'Plain React Native' : 'MUI Popper'}
                </Text>
              </Pressable>
            ))}
          </View>
          <Text testID="benchmark-mode" style={styles.metadata}>
            {mode}
          </Text>
          <Text testID="benchmark-epoch" style={styles.metadata}>
            {epoch}
          </Text>
          <Workload key={epoch} mode={mode} />
          <Text style={styles.description}>
            This screen is a measurement fixture. Simulator results do not certify device
            performance.
          </Text>
          <Text testID="benchmark-identity" numberOfLines={1} style={styles.identity}>
            {identity}
          </Text>
        </SafeAreaView>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#f5f3ed', paddingHorizontal: 20, gap: 12 },
  eyebrow: { color: '#55645f', fontSize: 11, fontWeight: '700', letterSpacing: 1.5, marginTop: 12 },
  title: { color: '#183c33', fontSize: 28, fontWeight: '700' },
  description: { color: '#55645f', fontSize: 13, lineHeight: 19 },
  modes: { flexDirection: 'row', gap: 8 },
  mode: {
    flex: 1,
    minHeight: 48,
    justifyContent: 'center',
    padding: 10,
    borderWidth: 1,
    borderColor: '#aab9b0',
    borderRadius: 8,
  },
  selected: { backgroundColor: '#183c33', borderColor: '#183c33' },
  modeText: { color: '#183c33', fontSize: 13, fontWeight: '600', textAlign: 'center' },
  selectedText: { color: '#ffffff' },
  metadata: { color: '#55645f', fontSize: 12 },
  viewport: { height: 340, position: 'relative' },
  scroll: { flex: 1, backgroundColor: '#e6ebe4', borderRadius: 8 },
  content: { height: 1600 },
  row: { height: 80, borderBottomWidth: 1, borderBottomColor: '#cad5ca', padding: 12 },
  rowText: { color: '#637269', fontSize: 12 },
  anchor: {
    position: 'absolute',
    top: 140,
    left: 20,
    width: 180,
    height: 44,
    backgroundColor: '#d6e7dc',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  anchorText: { color: '#183c33', fontWeight: '600' },
  baseline: { position: 'absolute', top: 192, left: 20, zIndex: 1 },
  popup: {
    width: 200,
    height: 96,
    padding: 10,
    gap: 4,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#aab9b0',
    borderRadius: 8,
  },
  popupTitle: { fontSize: 14, fontWeight: '600', color: '#183c33' },
  confirm: {
    minHeight: 44,
    justifyContent: 'center',
    backgroundColor: '#e6ebe4',
    borderRadius: 4,
    paddingHorizontal: 12,
  },
  confirmText: { color: '#183c33', fontWeight: '600' },
  identity: { fontSize: 9, color: '#55645f', marginTop: 'auto', marginBottom: 8 },
});
