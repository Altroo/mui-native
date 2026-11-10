// Copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT
import { forwardRef, useCallback, useMemo, useRef, useState } from 'react';
import {
  findNodeHandle,
  StyleSheet,
  Text,
  View,
  type ViewInstance,
  type ViewProps,
} from 'react-native';
import { Button, FormGroup, Typography, styled, useTheme } from '@mui/material';

const kinds = ['native', 'stock', 'custom', 'styled'] as const;
type Kind = (typeof kinds)[number];
type KindMap<T> = Partial<Record<Kind, T>>;
type Event =
  | Parameters<NonNullable<ViewProps['onFocus']>>[0]
  | Parameters<NonNullable<ViewProps['onKeyDown']>>[0]
  | Parameters<NonNullable<ViewProps['onAccessibilityAction']>>[0];
type EventType = 'focus' | 'blur' | 'key-down' | 'key-up' | 'accessibility';
type Phase = 'capture' | 'bubble' | 'direct';
type Entry = {
  sequence: number;
  eventId: number;
  kind: Kind;
  type: EventType;
  phase: Phase;
  target: number | null;
  currentTarget: number | null;
  expectedTarget: number | null;
  nativeTarget?: number;
  key?: string;
  code?: string;
  altKey?: boolean;
  ctrlKey?: boolean;
  metaKey?: boolean;
  shiftKey?: boolean;
  actionName?: string;
};
const actions = [{ name: 'inspect', label: 'Inspect control' }] as const;
const CustomRoot = forwardRef<ViewInstance, ViewProps & { className?: string | undefined }>(
  ({ className: _className, ...props }, ref) => <View {...props} ref={ref} />,
);
const StyledRoot = styled(FormGroup)({ borderStyle: 'solid' });
const styles = StyleSheet.create({
  section: { marginTop: 24, gap: 12 },
  root: { minHeight: 48, borderWidth: 1, borderRadius: 8, padding: 12 },
  text: { fontSize: 14 },
});

/** Observe actual host callbacks. The native collector supplies the input and target oracle. */
export function FormGroupEventsExample() {
  const theme = useTheme();
  const nodes = useRef<KindMap<ViewInstance>>({});
  const lifetimes = useRef<KindMap<{ attached: number; cleaned: number }>>({});
  const sequence = useRef(0),
    nextEventId = useRef(0);
  const eventIds = useRef(new WeakMap<object, number>());
  const [ready, setReady] = useState<KindMap<boolean>>({});
  const [entries, setEntries] = useState<Entry[]>([]);
  const record = useCallback((kind: Kind, type: EventType, phase: Phase, event: Event) => {
    let eventId = eventIds.current.get(event);
    if (eventId === undefined) {
      eventId = ++nextEventId.current;
      eventIds.current.set(event, eventId);
    }
    // Synthetic event targets are only valid during dispatch. Copy scalar values
    // before React clears currentTarget; never retain the event or native host.
    const data = event.nativeEvent;
    const entry: Entry = {
      sequence: ++sequence.current,
      eventId,
      kind,
      type,
      phase,
      target: findNodeHandle(event.target) ?? null,
      currentTarget: findNodeHandle(event.currentTarget) ?? null,
      expectedTarget: findNodeHandle(nodes.current[kind] ?? null) ?? null,
    };
    if ('target' in data && typeof data.target === 'number') entry.nativeTarget = data.target;
    if ('key' in data) {
      entry.key = data.key;
      entry.code = data.code;
      entry.altKey = data.altKey;
      entry.ctrlKey = data.ctrlKey;
      entry.metaKey = data.metaKey;
      entry.shiftKey = data.shiftKey;
    }
    if ('actionName' in data) entry.actionName = data.actionName;
    // Keep manual catalog use bounded. total identifies any truncated history,
    // which a collector must reject when claiming a complete dispatch sequence.
    setEntries((previous) => [...previous, entry].slice(-64));
  }, []);
  const bindings = useMemo(() => {
    const bind = (kind: Kind) => ({
      ref: (node: ViewInstance | null) => {
        if (!node) return;
        nodes.current[kind] = node;
        const lifetime = (lifetimes.current[kind] ??= { attached: 0, cleaned: 0 });
        lifetime.attached += 1;
        return () => {
          if (nodes.current[kind] !== node) return;
          delete nodes.current[kind];
          lifetime.cleaned += 1;
        };
      },
      onLayout: () =>
        setReady((previous) => (previous[kind] ? previous : { ...previous, [kind]: true })),
      onFocusCapture: (event: Parameters<NonNullable<ViewProps['onFocus']>>[0]) =>
        record(kind, 'focus', 'capture', event),
      onFocus: (event: Parameters<NonNullable<ViewProps['onFocus']>>[0]) =>
        record(kind, 'focus', 'bubble', event),
      onBlurCapture: (event: Parameters<NonNullable<ViewProps['onBlur']>>[0]) =>
        record(kind, 'blur', 'capture', event),
      onBlur: (event: Parameters<NonNullable<ViewProps['onBlur']>>[0]) =>
        record(kind, 'blur', 'bubble', event),
      onKeyDownCapture: (event: Parameters<NonNullable<ViewProps['onKeyDown']>>[0]) =>
        record(kind, 'key-down', 'capture', event),
      onKeyDown: (event: Parameters<NonNullable<ViewProps['onKeyDown']>>[0]) =>
        record(kind, 'key-down', 'bubble', event),
      onKeyUpCapture: (event: Parameters<NonNullable<ViewProps['onKeyUp']>>[0]) =>
        record(kind, 'key-up', 'capture', event),
      onKeyUp: (event: Parameters<NonNullable<ViewProps['onKeyUp']>>[0]) =>
        record(kind, 'key-up', 'bubble', event),
      onAccessibilityAction: (
        event: Parameters<NonNullable<ViewProps['onAccessibilityAction']>>[0],
      ) => record(kind, 'accessibility', 'direct', event),
    });
    return {
      native: bind('native'),
      stock: bind('stock'),
      custom: bind('custom'),
      styled: bind('styled'),
    };
  }, [record]);
  const metadata = {
    schemaVersion: 1,
    ready: kinds.every((kind) => ready[kind]),
    total: sequence.current,
    entries,
    refs: lifetimes.current,
    nodes: Object.fromEntries(
      kinds.map((kind) => [kind, findNodeHandle(nodes.current[kind] ?? null) ?? null]),
    ),
  };
  return (
    <View style={styles.section}>
      <Typography variant="h6">Native callbacks</Typography>
      <Typography variant="body2" color="text.secondary">
        Compare keyboard focus and the Inspect control action across native and FormGroup roots.
      </Typography>
      {kinds.map((kind) => {
        const props = {
          ...bindings[kind],
          testID: `form-group-events-${kind}`,
          nativeID: `form-group-events-${kind}`,
          collapsable: false,
          accessible: true,
          focusable: true,
          tabIndex: 0 as const,
          role: 'group' as const,
          accessibilityLabel: `${kind} event control`,
          accessibilityActions: actions,
          style: [
            styles.root,
            { borderColor: theme.palette.divider, backgroundColor: theme.palette.background.paper },
          ],
        };
        const content = (
          <Text style={[styles.text, { color: theme.palette.text.primary }]}>
            {kind} event control
          </Text>
        );
        const Root = kind === 'styled' ? StyledRoot : FormGroup;
        return kind === 'native' ? (
          <View key={kind} {...props}>
            {content}
          </View>
        ) : (
          <Root key={kind} {...props} component={kind === 'custom' ? CustomRoot : undefined}>
            {content}
          </Root>
        );
      })}
      <Button
        size="small"
        testID="form-group-events-reset"
        style={{ minHeight: 44 }}
        onClick={() => {
          sequence.current = nextEventId.current = 0;
          eventIds.current = new WeakMap();
          setEntries([]);
        }}
      >
        Reset callback log
      </Button>
      <Typography
        variant="caption"
        testID="form-group-events-receipt"
        accessibilityLabel={JSON.stringify(metadata)}
      >
        Events {sequence.current} · roots {kinds.filter((kind) => ready[kind]).length}/4
      </Typography>
    </View>
  );
}
