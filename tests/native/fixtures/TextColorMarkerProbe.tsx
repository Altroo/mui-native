// Copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT
// First MUI host creation is the virtual marker, before any owned View exists.
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  findNodeHandle,
  PixelRatio,
  Pressable,
  Text,
  View,
  processColor,
  type TextInstance,
  type TextLayoutEvent,
} from 'react-native';
import Marker from '../../../packages/native-host/src/AltrooMUITextColorMarkerNativeComponent';
import { requireOwnedStyleProfile } from '../../../packages/native-host/src/ownedStyleBootstrap';
import probe from '../../../packages/native-host/src/NativeAltrooPrelayoutProbe';
const text = 'Marker preserves native text';
const style = { width: 280, fontSize: 16, lineHeight: 24, color: '#0000ff' };
export function TextColorMarkerProbe() {
  const node = useRef<TextInstance | null>(null),
    attaches = useRef(0),
    cleanups = useRef(0);
  const [epoch, setEpoch] = useState(0);
  const [parser, setParser] = useState<{
    checks: number;
    ordinaryConversionOnly: boolean;
    mountedOrDrawnProved: boolean;
  } | null>(null);
  useEffect(() => {
    try {
      probe.enable();
      const report = JSON.parse(probe.getReport());
      setParser(report.ownedProgrammeDiagnostic.textColors);
    } finally {
      probe.disable();
    }
  }, []);

  const [plain, setPlain] = useState<string[]>([]),
    [marked, setMarked] = useState<string[]>([]);
  const ref = useCallback((value: TextInstance | null) => {
    if (!value) return;
    node.current = value;
    attaches.current++;
    return () => {
      if (node.current === value) node.current = null;
      cleanups.current++;
    };
  }, []);
  const plainLayout = useCallback(
    (event: TextLayoutEvent) => setPlain(event.nativeEvent.lines.map((line) => line.text)),
    [],
  );
  const markedLayout = useCallback(
    (event: TextLayoutEvent) => setMarked(event.nativeEvent.lines.map((line) => line.text)),
    [],
  );
  const profile = requireOwnedStyleProfile();
  const colour = profile.nativeCSSParsing ? '#ff0000' : processColor('#ff0000');
  const programme =
    epoch % 2
      ? {
          schema: 1,
          profile,
          owner: 'unmatched-source',
          key: 'registration-control',
          ordinary: colour,
        }
      : null;
  const receipt = {
    schemaVersion: 1,
    parser,
    development: __DEV__,
    fontScale: PixelRatio.getFontScale(),
    epoch,
    plain,
    marked,
    attaches: attaches.current,
    cleanups: cleanups.current,
    nativeTag: findNodeHandle(node.current) ?? null,
    nativeID: (node.current as (TextInstance & { id?: string }) | null)?.id ?? null,
    phase:
      plain.join('') === text && marked.join('') === text && node.current && parser
        ? 'ready'
        : 'waiting',
  };
  return (
    <View style={{ flex: 1, padding: 24, paddingTop: 64, gap: 24, backgroundColor: '#fff' }}>
      <Text style={{ fontSize: 20 }}>Empty native text marker</Text>
      <Text testID="color-marker-plain" style={style} onTextLayout={plainLayout}>
        {text}
      </Text>
      <Text
        testID="color-marker-marked"
        nativeID="kept-public-native-id"
        ref={ref}
        style={style}
        onTextLayout={markedLayout}
      >
        {text}
        <Marker colorProgramme={programme} />
      </Text>
      <Pressable
        testID="color-marker-update"
        onPress={() => setEpoch((value) => value + 1)}
        style={{ minHeight: 44, padding: 12 }}
      >
        <Text>Update metadata</Text>
      </Pressable>
      <Text
        testID="color-marker-receipt"
        accessibilityLabel={JSON.stringify(receipt)}
        numberOfLines={1}
      >
        {receipt.phase}
      </Text>
    </View>
  );
}
