// Copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT
import { forwardRef, useMemo, useRef, useState } from 'react';
import { findNodeHandle, View, type ViewInstance, type ViewProps } from 'react-native';
import { InteractiveView } from '@altroo/mui-native-host';
import { Box, Button, FormGroup, Typography, styled, useTheme } from '@mui/material';
const kinds = ['native', 'host', 'stock', 'custom', 'styled'] as const;
type Kind = (typeof kinds)[number];
type KeyEvent = Parameters<NonNullable<ViewProps['onKeyDown']>>[0];
type Phase = 'down-capture' | 'down' | 'up-capture' | 'up';
type Policy = 'observe' | 'prevent' | 'stop';
type Entry = {
  sequence: number;
  kind: Kind;
  scope: 'root' | 'button';
  phase: Phase;
  key: string;
  code: string;
  target: number | null;
  currentTarget: number | null;
  eventId: number;
  payloadId: number;
  prevented: boolean;
  stopped: boolean;
  targetKind: string;
  source: string | null;
};
const CustomRoot = forwardRef<ViewInstance, ViewProps & { className?: string | undefined }>(
  ({ className: _className, ...props }, ref) => <InteractiveView {...props} ref={ref} />,
);
const StyledRoot = styled(FormGroup)({ borderStyle: 'solid' });

/** Compare actual child input with root propagation, including capture cancellation. */
export function FormGroupKeyboardExample() {
  const theme = useTheme();
  const [policy, setPolicy] = useState<Policy>('observe');
  const [recorded, setRecorded] = useState<{
    entries: Entry[];
    clicks: Partial<Record<Kind, number>>;
  }>({ entries: [], clicks: {} });
  const [ready, setReady] = useState<Record<string, boolean>>({});
  const nodes = useRef<Record<string, ViewInstance>>({});
  const lifetimes = useRef<Record<string, { attached: number; cleaned: number }>>({});
  const sequence = useRef(0),
    eventId = useRef(0),
    payloadId = useRef(0);
  const events = useRef(new WeakMap<object, number>()),
    payloads = useRef(new WeakMap<object, number>());
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
  function record(kind: Kind, scope: 'root' | 'button', phase: Phase, event: KeyEvent) {
    // Cancel only the activation phase: Enter activates on down, Space on up.
    if (
      scope === 'root' &&
      phase.endsWith('capture') &&
      ((phase === 'down-capture' && event.nativeEvent.key === 'Enter') ||
        (phase === 'up-capture' && event.nativeEvent.key === ' '))
    ) {
      if (policy === 'prevent') event.preventDefault();
      if (policy === 'stop') event.stopPropagation();
    }
    let object = events.current.get(event);
    if (object === undefined) {
      object = ++eventId.current;
      events.current.set(event, object);
    }
    let payload = payloads.current.get(event.nativeEvent);
    if (payload === undefined) {
      payload = ++payloadId.current;
      payloads.current.set(event.nativeEvent, payload);
    }
    const value: Entry = {
      sequence: ++sequence.current,
      kind,
      scope,
      phase,
      key: event.nativeEvent.key,
      code: event.nativeEvent.code,
      target: findNodeHandle(event.target) ?? null,
      currentTarget: findNodeHandle(event.currentTarget) ?? null,
      eventId: object,
      payloadId: payload,
      prevented: Boolean(event.defaultPrevented || event.isDefaultPrevented?.()),
      stopped: Boolean(event.isPropagationStopped?.()),
      targetKind: typeof event.target,
      source: (event.nativeEvent as { muiKeySource?: string }).muiKeySource ?? null,
    };
    setRecorded((previous) => ({ ...previous, entries: [...previous.entries, value].slice(-64) }));
  }
  const metadata = {
    schemaVersion: 1,
    policy,
    ready: kinds.every((kind) => ready[kind] && ready[kind + '-button']),
    total: sequence.current,
    entries: recorded.entries,
    clicks: recorded.clicks,
    refs: lifetimes.current,
    nodes: Object.fromEntries(
      kinds
        .flatMap((kind) => [kind, kind + '-button'])
        .map((id) => [id, findNodeHandle(nodes.current[id] ?? null) ?? null]),
    ),
  };
  return (
    <Box sx={{ p: 1 }}>
      <Typography variant="h6">Group keyboard</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Compare child key delivery, parent propagation and capture cancellation.
      </Typography>
      <Button
        testID="form-group-keyboard-policy"
        size="small"
        style={{ minHeight: 44 }}
        onClick={() =>
          setPolicy((value) =>
            value === 'observe' ? 'prevent' : value === 'prevent' ? 'stop' : 'observe',
          )
        }
      >
        Policy: {policy}
      </Button>
      {kinds.map((kind) => {
        const rootProps = {
          ...bindings[kind],
          testID: 'form-group-keyboard-' + kind,
          collapsable: false,
          accessible: false,
          role: 'group' as const,
          onKeyDownCapture: (event: KeyEvent) => record(kind, 'root', 'down-capture', event),
          onKeyDown: (event: KeyEvent) => record(kind, 'root', 'down', event),
          onKeyUpCapture: (event: KeyEvent) => record(kind, 'root', 'up-capture', event),
          onKeyUp: (event: KeyEvent) => record(kind, 'root', 'up', event),
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
            testID={'form-group-keyboard-' + kind + '-button'}
            variant="outlined"
            onKeyDown={(event) => record(kind, 'button', 'down', event)}
            onKeyUp={(event) => record(kind, 'button', 'up', event)}
            onClick={() =>
              setRecorded((previous) => ({
                ...previous,
                clicks: { ...previous.clicks, [kind]: (previous.clicks[kind] ?? 0) + 1 },
              }))
            }
          >
            {kind} action {recorded.clicks[kind] ?? 0}
          </Button>
        );
        if (kind === 'native')
          return (
            <View key={kind} {...rootProps}>
              {child}
            </View>
          );
        if (kind === 'host')
          return (
            <InteractiveView key={kind} {...rootProps}>
              {child}
            </InteractiveView>
          );
        const Root = kind === 'styled' ? StyledRoot : FormGroup;
        return (
          <Root key={kind} {...rootProps} component={kind === 'custom' ? CustomRoot : undefined}>
            {child}
          </Root>
        );
      })}
      <Button
        testID="form-group-keyboard-reset"
        size="small"
        style={{ minHeight: 44 }}
        onClick={() => {
          sequence.current = eventId.current = payloadId.current = 0;
          events.current = new WeakMap();
          payloads.current = new WeakMap();
          setRecorded({ entries: [], clicks: {} });
        }}
      >
        Reset keyboard log
      </Button>
      <Typography
        testID="form-group-keyboard-receipt"
        variant="caption"
        accessibilityLabel={JSON.stringify(metadata)}
      >
        Keys {sequence.current} · policy {policy}
      </Typography>
    </Box>
  );
}
