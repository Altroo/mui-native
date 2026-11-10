// Copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT
import { forwardRef, useMemo, useRef, useState } from 'react';
import { findNodeHandle, PixelRatio, View, type ViewInstance, type ViewProps } from 'react-native';
import { InteractiveView, getNativeFocusedView } from '@altroo/mui-native-host';
import { Box, Button, FormGroup, Typography, styled, useTheme } from '@mui/material';

const kinds = ['native', 'host', 'stock', 'custom', 'styled'] as const;
type Kind = (typeof kinds)[number];
type FocusEvent = Parameters<NonNullable<ViewProps['onFocus']>>[0];
type Entry = {
  sequence: number;
  kind: Kind;
  type: 'focus' | 'blur';
  phase: 'capture' | 'child' | 'bubble';
  eventId: number;
  payloadId: number;
  target: number | null;
  currentTarget: number | null;
  nativeTarget: number;
  targetKind: string;
  focusSource: string | null;
};
const labels: Record<Kind, string> = {
  native: 'Native View',
  host: 'Host control',
  stock: 'FormGroup',
  custom: 'Custom host',
  styled: 'Styled group',
};
const CustomRoot = forwardRef<ViewInstance, ViewProps & { className?: string | undefined }>(
  ({ className: _className, ...props }, ref) => <InteractiveView {...props} ref={ref} />,
);
const StyledRoot = styled(FormGroup)({ borderStyle: 'solid' });

/** Request real child focus through public refs; only native callbacks enter the log. */
export function FormGroupFocusExample() {
  const theme = useTheme();
  const nodes = useRef<Record<string, ViewInstance>>({});
  const lifetimes = useRef<Record<string, { attached: number; cleaned: number }>>({});
  const sequence = useRef(0),
    eventId = useRef(0),
    payloadId = useRef(0);
  const events = useRef(new WeakMap<object, number>()),
    payloads = useRef(new WeakMap<object, number>());
  const [entries, setEntries] = useState<Entry[]>([]);
  const [requests, setRequests] = useState<Partial<Record<Kind, number>>>({});
  const [ready, setReady] = useState<Record<string, boolean>>({});
  const bindings = useMemo(() => {
    const bind = (id: string) => ({
      ref: (node: ViewInstance | null) => {
        if (!node) return;
        nodes.current[id] = node;
        const lifetime = (lifetimes.current[id] ??= { attached: 0, cleaned: 0 });
        lifetime.attached++;
        return () => {
          if (nodes.current[id] === node) {
            delete nodes.current[id];
            lifetime.cleaned++;
          }
        };
      },
      onLayout: () =>
        setReady((previous) => (previous[id] ? previous : { ...previous, [id]: true })),
    });
    return Object.fromEntries(
      kinds.flatMap((kind) => [
        [kind, bind(kind)],
        [kind + '-button', bind(kind + '-button')],
      ]),
    );
  }, []);
  function record(kind: Kind, type: Entry['type'], phase: Entry['phase'], event: FocusEvent) {
    let identity = events.current.get(event);
    if (identity === undefined) {
      identity = ++eventId.current;
      events.current.set(event, identity);
    }
    let payload = payloads.current.get(event.nativeEvent);
    if (payload === undefined) {
      payload = ++payloadId.current;
      payloads.current.set(event.nativeEvent, payload);
    }
    const value: Entry = {
      sequence: ++sequence.current,
      kind,
      type,
      phase,
      eventId: identity,
      payloadId: payload,
      target: findNodeHandle(event.target) ?? null,
      currentTarget: findNodeHandle(event.currentTarget) ?? null,
      nativeTarget: event.nativeEvent.target,
      targetKind: typeof event.target,
      focusSource: (event.nativeEvent as { muiFocusSource?: string }).muiFocusSource ?? null,
    };
    setEntries((previous) => [...previous, value].slice(-64));
  }
  const metadata = {
    schemaVersion: 1,
    ready: kinds.every((kind) => ready[kind] && ready[kind + '-button']),
    total: sequence.current,
    entries,
    requests,
    refs: lifetimes.current,
    fontScale: PixelRatio.getFontScale(),
    focused: findNodeHandle(getNativeFocusedView()) ?? null,
    nodes: Object.fromEntries(
      kinds
        .flatMap((kind) => [kind, kind + '-button'])
        .map((id) => [id, findNodeHandle(nodes.current[id] ?? null) ?? null]),
    ),
  };
  return (
    <Box sx={{ p: 1 }}>
      <Typography variant="h6">Group focus</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Focus each child and compare capture, child and bubble callbacks.
      </Typography>
      {kinds.map((kind) => {
        const props = {
          ...bindings[kind],
          testID: 'form-group-focus-' + kind,
          collapsable: false,
          accessible: false,
          role: 'group' as const,
          onFocusCapture: (event: FocusEvent) => record(kind, 'focus', 'capture', event),
          onFocus: (event: FocusEvent) => record(kind, 'focus', 'bubble', event),
          onBlurCapture: (event: FocusEvent) => record(kind, 'blur', 'capture', event),
          onBlur: (event: FocusEvent) => record(kind, 'blur', 'bubble', event),
          style: {
            marginTop: 12,
            padding: 8,
            borderWidth: 1,
            borderColor: theme.palette.divider,
            minHeight: 64,
          },
        };
        const child = (
          <Button
            {...bindings[kind + '-button']}
            testID={'form-group-focus-' + kind + '-button'}
            variant="outlined"
            onFocus={(event) => record(kind, 'focus', 'child', event)}
            onBlur={(event) => record(kind, 'blur', 'child', event)}
            onClick={() => {
              nodes.current[kind + '-button']?.focus();
              setRequests((previous) => ({ ...previous, [kind]: (previous[kind] ?? 0) + 1 }));
            }}
          >
            Focus {labels[kind]}
          </Button>
        );
        if (kind === 'native')
          return (
            <View key={kind} {...props}>
              {child}
            </View>
          );
        if (kind === 'host')
          return (
            <InteractiveView key={kind} {...props}>
              {child}
            </InteractiveView>
          );
        const Root = kind === 'styled' ? StyledRoot : FormGroup;
        return (
          <Root key={kind} {...props} component={kind === 'custom' ? CustomRoot : undefined}>
            {child}
          </Root>
        );
      })}
      <Button
        testID="form-group-focus-release"
        size="small"
        style={{ minHeight: 44, marginTop: 12 }}
        onClick={() => {
          for (const kind of kinds) nodes.current[kind + '-button']?.blur();
        }}
      >
        Release focus
      </Button>
      <Button
        testID="form-group-focus-clear"
        size="small"
        style={{ minHeight: 44 }}
        onClick={() => {
          sequence.current = eventId.current = payloadId.current = 0;
          events.current = new WeakMap();
          payloads.current = new WeakMap();
          setEntries([]);
        }}
      >
        Clear focus log
      </Button>
      <Typography
        testID="form-group-focus-receipt"
        variant="caption"
        accessibilityLabel={JSON.stringify(metadata)}
      >
        Callbacks {sequence.current}
      </Typography>
    </Box>
  );
}
