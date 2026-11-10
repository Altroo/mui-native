// Copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT
import { forwardRef, useMemo, useRef, useState } from 'react';
import {
  findNodeHandle,
  PixelRatio,
  View,
  TextInput as RNTextInput,
  type TextInputInstance,
  type ViewInstance,
  type ViewProps,
} from 'react-native';
import { InteractiveView, NativeTextInput, type NativeHostKeyEvent } from '@altroo/mui-native-host';
import { Box, Button, FormGroup, TextField, Typography, styled, useTheme } from '@mui/material';

const controls = [
  'stock-native',
  'stock-field',
  'custom-native',
  'custom-field',
  'styled-native',
  'styled-field',
] as const;
type Control = (typeof controls)[number];
type Policy = 'observe' | 'prevent' | 'stop';
type Scope = 'capture' | 'input' | 'owner' | 'bubble';
type Node = ViewInstance | TextInputInstance;
type Entry = {
  sequence: number;
  control: Control | 'baseline';
  phase: 'down' | 'up';
  scope: Scope;
  key: string;
  code: string;
  source: string | null;
  target: number | null;
  currentTarget: number | null;
  nativeTarget: number | null;
  targetKind: string;
  editable: boolean | null;
  composing: boolean | null;
  canceled: boolean | null;
  keySequence: string | null;
  eventId: number;
  payloadId: number;
  prevented: boolean;
  stopped: boolean;
};
const hostIds = [
  ...controls.flatMap((control) => ['', '-input', '-owner'].map((suffix) => control + suffix)),
  'baseline',
  'baseline-input',
];
const managedKeys = ['ArrowDown', 'Enter'] as const;
const CustomRoot = forwardRef<ViewInstance, ViewProps & { className?: string | undefined }>(
  ({ className: _className, ...props }, ref) => <InteractiveView {...props} ref={ref} />,
);
const StyledRoot = styled(FormGroup)({ borderStyle: 'solid' });

/** Observe editable descendants independently of ButtonBase's activation facade. */
export function FormGroupEditorExample() {
  const theme = useTheme();
  const [baselineValue, setBaselineValue] = useState('Rabat');
  const [policy, setPolicy] = useState<Policy>('observe');
  const [entries, setEntries] = useState<Entry[]>([]);
  const [focused, setFocused] = useState<number | null>(null);
  const [values, setValues] = useState<Partial<Record<Control, string>>>({});
  const [submissions, setSubmissions] = useState<Partial<Record<Control, number>>>({});
  const [ready, setReady] = useState<Record<string, boolean>>({});
  const nodes = useRef<Record<string, Node>>({});
  const refs = useRef<Record<string, { attached: number; cleaned: number }>>({});
  const sequence = useRef(0),
    eventId = useRef(0),
    payloadId = useRef(0);
  const events = useRef(new WeakMap<object, number>()),
    payloads = useRef(new WeakMap<object, number>());
  const bindings = useMemo(
    () =>
      Object.fromEntries(
        hostIds.map((id) => [
          id,
          {
            ref: (node: Node | null) => {
              if (!node) return;
              nodes.current[id] = node;
              const lifetime = (refs.current[id] ??= { attached: 0, cleaned: 0 });
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
          },
        ]),
      ),
    [],
  );
  function record(
    control: Control | 'baseline',
    scope: Scope,
    phase: 'down' | 'up',
    event: NativeHostKeyEvent,
  ) {
    // Native command ownership is independent of JS capture cancellation.
    if (scope === 'capture' && managedKeys.some((key) => key === event.nativeEvent.key)) {
      if (policy === 'prevent') event.preventDefault();
      if (policy === 'stop') event.stopPropagation();
    }
    let object = events.current.get(event),
      payload = payloads.current.get(event.nativeEvent);
    if (object === undefined) {
      object = ++eventId.current;
      events.current.set(event, object);
    }
    if (payload === undefined) {
      payload = ++payloadId.current;
      payloads.current.set(event.nativeEvent, payload);
    }
    const entry: Entry = {
      sequence: ++sequence.current,
      control,
      scope,
      phase,
      key: event.nativeEvent.key,
      code: event.nativeEvent.code,
      source: event.nativeEvent.muiKeySource ?? null,
      target: findNodeHandle(event.target) ?? null,
      currentTarget: findNodeHandle(event.currentTarget) ?? null,
      nativeTarget: (event.nativeEvent as { target?: number }).target ?? null,
      targetKind: typeof event.target,
      editable: event.nativeEvent.isEditable ?? null,
      composing: event.nativeEvent.isComposing ?? null,
      canceled: event.nativeEvent.isCanceled ?? null,
      keySequence: event.nativeEvent.muiKeySequence ?? null,
      eventId: object,
      payloadId: payload,
      prevented: Boolean(event.defaultPrevented || event.isDefaultPrevented?.()),
      stopped: Boolean(event.isPropagationStopped?.()),
    };
    setEntries((previous) => [...previous, entry].slice(-64));
  }
  const metadata = {
    schemaVersion: 1,
    fontScale: PixelRatio.getFontScale(),
    policy,
    ready: hostIds.every((id) => ready[id]),
    total: sequence.current,
    entries,
    focused,
    refs: refs.current,
    values,
    baselineValue,
    submissions,
    nodes: Object.fromEntries(
      hostIds.map((id) => [id, findNodeHandle(nodes.current[id] ?? null) ?? null]),
    ),
  };
  return (
    <Box sx={{ p: 1 }}>
      <Typography variant="h6">Group editor events</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
        Compare managed commands with ordinary native editing.
      </Typography>
      <View
        {...bindings.baseline}
        testID="form-group-editor-baseline"
        collapsable={false}
        style={{ padding: 8, marginBottom: 12 }}
        onKeyDownCapture={(event) => record('baseline', 'capture', 'down', event)}
        onKeyDown={(event) => record('baseline', 'bubble', 'down', event)}
        onKeyUpCapture={(event) => record('baseline', 'capture', 'up', event)}
        onKeyUp={(event) => record('baseline', 'bubble', 'up', event)}
      >
        <Typography variant="caption">Original React Native input</Typography>
        <RNTextInput
          {...bindings['baseline-input']}
          testID="form-group-editor-baseline-input"
          defaultValue="Rabat"
          showSoftInputOnFocus={false}
          onFocus={(event) => setFocused(findNodeHandle(event.target) ?? null)}
          onBlur={(event) => {
            const target = findNodeHandle(event.target) ?? null;
            setFocused((previous) => (previous === target ? null : previous));
          }}
          onChangeText={setBaselineValue}
          style={{ minHeight: 44, padding: 8, fontSize: 16, color: theme.palette.text.primary }}
        />
      </View>
      <Button
        testID="form-group-editor-policy"
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
      {controls.map((control) => {
        const inputProps = {
          ...bindings[control + '-input'],
          testID: 'form-group-editor-' + control + '-input',
          showSoftInputOnFocus: false,
          onFocus: (event: Parameters<NonNullable<ViewProps['onFocus']>>[0]) =>
            setFocused(findNodeHandle(event.target) ?? null),
          onBlur: (event: Parameters<NonNullable<ViewProps['onBlur']>>[0]) => {
            const target = findNodeHandle(event.target) ?? null;
            setFocused((previous) => (previous === target ? null : previous));
          },
          onKeyDown: (event: NativeHostKeyEvent) => record(control, 'input', 'down', event),
          onKeyUp: (event: NativeHostKeyEvent) => record(control, 'input', 'up', event),
          onSubmitEditing: () =>
            setSubmissions((previous) => ({
              ...previous,
              [control]: (previous[control] ?? 0) + 1,
            })),
        };
        const Root = control.startsWith('styled') ? StyledRoot : FormGroup;
        return (
          <Root
            key={control}
            {...bindings[control]}
            testID={'form-group-editor-' + control}
            component={control.startsWith('custom') ? CustomRoot : undefined}
            collapsable={false}
            accessible={false}
            role="group"
            onKeyDownCapture={(event) => record(control, 'capture', 'down', event)}
            onKeyUpCapture={(event) => record(control, 'capture', 'up', event)}
            onKeyDown={(event) => record(control, 'bubble', 'down', event)}
            onKeyUp={(event) => record(control, 'bubble', 'up', event)}
            sx={{ mt: 2, p: 1, borderWidth: 1, borderColor: 'divider' }}
          >
            <Typography variant="caption">{control}</Typography>
            <Button
              testID={'form-group-editor-' + control + '-focus'}
              size="small"
              style={{ minHeight: 44 }}
              onClick={() => nodes.current[control + '-input']?.focus()}
            >
              Focus editor
            </Button>
            <InteractiveView
              {...bindings[control + '-owner']}
              testID={'form-group-editor-' + control + '-owner'}
              focusable={false}
              style={{ width: '100%' }}
              managedDescendantKeys={managedKeys}
              onKeyDown={(event) => record(control, 'owner', 'down', event)}
              onKeyUp={(event) => record(control, 'owner', 'up', event)}
            >
              {control.endsWith('field') ? (
                <TextField
                  label="City"
                  defaultValue="Rabat"
                  fullWidth
                  inputRef={inputProps.ref}
                  onChange={(event) =>
                    setValues((previous) => ({ ...previous, [control]: event.target.value }))
                  }
                  slotProps={{ htmlInput: { ...inputProps, ref: undefined } }}
                />
              ) : (
                <NativeTextInput
                  {...inputProps}
                  defaultValue="Rabat"
                  onChangeText={(value) =>
                    setValues((previous) => ({ ...previous, [control]: value }))
                  }
                  style={{
                    minHeight: 44,
                    padding: 8,
                    fontSize: 16,
                    color: theme.palette.text.primary,
                  }}
                />
              )}
            </InteractiveView>
          </Root>
        );
      })}
      <Button
        testID="form-group-editor-reset"
        size="small"
        style={{ minHeight: 44 }}
        onClick={() => {
          sequence.current = eventId.current = payloadId.current = 0;
          events.current = new WeakMap();
          payloads.current = new WeakMap();
          setEntries([]);
          setSubmissions({});
        }}
      >
        Reset editor log
      </Button>
      <Typography
        testID="form-group-editor-receipt"
        variant="caption"
        accessibilityLabel={JSON.stringify(metadata)}
      >
        Keys {sequence.current} · policy {policy}
      </Typography>
    </Box>
  );
}
