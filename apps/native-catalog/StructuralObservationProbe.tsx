// Copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT
// Private native dependency probe. No CardContent/CSS/timing completion claim.
import { forwardRef, memo, useCallback, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Pressable, Text, View, findNodeHandle, type ViewInstance } from 'react-native';

type Change = Readonly<{
  subscriptionId: number;
  lease: string;
  revision: number;
  closed: boolean;
}>;
type Client = {
  watch(
    tag: number,
    lease: string,
    mode: 'siblings' | 'children',
    listener: (change: Change) => void,
  ): () => void;
  dispose(): void;
};
type Props = { createClient: () => Client; diagnostics: () => unknown };
type Key = 'target' | 'a' | 'b' | 'c' | 'hidden';
const stages: ReadonlyArray<Readonly<{ name: string; order: readonly Key[]; width: number }>> = [
  { name: 'initial', order: ['target', 'a', 'b'], width: 40 },
  { name: 'zero-tail', order: ['target', 'a', 'b', 'c'], width: 40 },
  { name: 'pure-reorder', order: ['b', 'a', 'c', 'target'], width: 40 },
  {
    name: 'hidden-tail',
    order: ['b', 'a', 'c', 'target', 'hidden'],
    width: 40,
  },
  { name: 'remove-hidden', order: ['b', 'a', 'c', 'target'], width: 40 },
  { name: 'layout-only', order: ['b', 'a', 'c', 'target'], width: 48 },
  { name: 'restored', order: ['target', 'a', 'b'], width: 40 },
];
const Target = memo(
  forwardRef<ViewInstance, { width: number; onLayout: () => void }>(function Target(
    { width, onLayout },
    ref,
  ) {
    return (
      <View
        ref={ref}
        testID="structure-probe-target"
        onLayout={onLayout}
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          width,
          height: 40,
          backgroundColor: '#1565c0',
        }}
      />
    );
  }),
);

/** Receipts are observations, not a computed-style oracle or native hook count. */
export function StructuralObservationProbe(props: Props) {
  const [watchMode, setWatchMode] = useState<'siblings' | 'children'>('siblings');
  return (
    <View>
      <Pressable
        testID="structure-probe-mode"
        accessibilityRole="button"
        accessibilityLabel={'Observation mode: ' + watchMode + '. Switch mode'}
        onPress={() => setWatchMode((value) => (value === 'siblings' ? 'children' : 'siblings'))}
        style={{ minHeight: 44, padding: 12, marginHorizontal: 12 }}
      >
        <Text>Observe {watchMode}</Text>
      </Pressable>
      <StructuralObservationSession key={watchMode} {...props} watchMode={watchMode} />
    </View>
  );
}

// Changing the test mode remounts this session. Layout cleanup releases its
// native owner before another session can start on the same private module.
function StructuralObservationSession({
  createClient,
  diagnostics,
  watchMode,
}: Props & { watchMode: 'siblings' | 'children' }) {
  const [stage, setStage] = useState(0),
    [receipt, setReceipt] = useState('{}');
  const parent = useRef<ViewInstance | null>(null);
  const refs = useRef(new Map<Key, ViewInstance>());
  const names = useRef(new WeakMap<object, Key>());
  const refTokens = useRef(new Map<Key, symbol>());
  const leases = useRef(new Map<Key, { attached: number; cleaned: number }>());
  const committedStage = useRef(0),
    targetLayouts = useRef(0),
    requests = useRef(0),
    epoch = useRef(0);
  const alive = useRef(true),
    client = useRef<Client | null>(null),
    release = useRef<(() => void) | null>(null);
  const events = useRef<Array<Change & { committedStage: number }>>([]),
    errors = useRef<string[]>([]);
  const factory = useRef(createClient),
    readDiagnostics = useRef(diagnostics);
  useLayoutEffect(() => {
    factory.current = createClient;
    readDiagnostics.current = diagnostics;
  }, [createClient, diagnostics]);
  const callbacks = useMemo(
    () =>
      Object.fromEntries(
        (['target', 'a', 'b', 'c', 'hidden'] as const).map((key) => [
          key,
          (value: ViewInstance | null) => {
            if (!value) return;
            const count = leases.current.get(key) ?? {
              attached: 0,
              cleaned: 0,
            };
            count.attached++;
            leases.current.set(key, count);
            const token = Symbol(key);
            refTokens.current.set(key, token);
            refs.current.set(key, value);
            names.current.set(value, key);
            let cleaned = false;
            return () => {
              if (cleaned) return;
              cleaned = true;
              count.cleaned++;
              if (refTokens.current.get(key) === token) {
                refTokens.current.delete(key);
                refs.current.delete(key);
              }
            };
          },
        ]),
      ) as Record<Key, (value: ViewInstance | null) => (() => void) | undefined>,
    [],
  );

  const capture = useCallback(() => {
    if (!alive.current) return;
    try {
      const target = refs.current.get('target');
      const actualParent = target?.parentElement ?? null;
      const actualChildren = actualParent ? Array.from(actualParent.children) : [];
      const observedOrder = actualChildren.map((node) => names.current.get(node) ?? 'unmapped');
      const index = target ? actualChildren.indexOf(target) : -1;
      const value = {
        schemaVersion: 1,
        scenario: 'native-structure-observation-probe-v1',
        watchMode,
        request: ++requests.current,
        stage: committedStage.current,
        authored: stages[committedStage.current],
        active: release.current !== null,
        targetLayouts: targetLayouts.current,
        actual: {
          parentMatchesForwardedRef: actualParent === parent.current,
          targetIsCanonicalChild: index >= 0 && actualChildren[index] === target,
          order: observedOrder,
          index,
          count: actualChildren.length,
        },
        leases: Object.fromEntries(leases.current),
        events: events.current.slice(),
        nativeDiagnostics: readDiagnostics.current(),
        errors: errors.current.slice(),
        limits:
          'Native logical order and native dirty hints; no CSS/initial-paint/Portal semantic closure',
      };
      setReceipt(JSON.stringify(value));
    } catch (error) {
      errors.current.push(String(error));
      setReceipt(
        JSON.stringify({
          scenario: 'native-structure-observation-probe-v1',
          watchMode,
          error: String(error),
        }),
      );
    }
  }, [watchMode]);
  const layout = useCallback(() => {
    targetLayouts.current++;
    capture();
  }, [capture]);
  useLayoutEffect(() => {
    committedStage.current = stage;
    capture();
  }, [stage, capture]);
  const detach = useCallback(() => {
    const close = release.current,
      previous = client.current;
    release.current = null;
    client.current = null;
    const failures: unknown[] = [];
    try {
      close?.();
    } catch (error) {
      failures.push(error);
    }
    try {
      previous?.dispose();
    } catch (error) {
      failures.push(error);
    }
    return failures;
  }, []);
  useLayoutEffect(() => {
    alive.current = true;
    capture();
    return () => {
      alive.current = false;
      const failures = detach();
      if (failures.length) throw new AggregateError(failures, 'Structural probe teardown failed');
    };
  }, [capture, detach]);
  const start = () => {
    if (release.current) return;
    try {
      const node = watchMode === 'children' ? parent.current : refs.current.get('target'),
        tag = node ? findNodeHandle(node) : null;
      if (!tag) throw Error('Mount the target before starting the structural probe');
      const next = factory.current();
      client.current = next;
      const lease = 'structure-probe:' + ++epoch.current;
      release.current = next.watch(tag, lease, watchMode, (change) => {
        if (!alive.current || client.current !== next || change.lease !== lease) return;
        if (events.current.length >= 128) throw Error('Unexpected structural notification flood');
        events.current.push({
          ...change,
          committedStage: committedStage.current,
        });
        // A closed native record has already released the client's entry.
        // Detach the scene's own handle before publishing active=false.
        if (change.closed) errors.current.push(...detach().map(String));
        capture();
      });
      capture();
    } catch (error) {
      errors.current.push(String(error), ...detach().map(String));
      capture();
    }
  };
  const stop = () => {
    errors.current.push(...detach().map(String));
    capture();
  };
  const current = stages[stage]!;
  return (
    <View testID="structure-probe" style={{ padding: 12 }}>
      <Text style={{ fontSize: 16, lineHeight: 22, height: 22 }}>{current.name}</Text>
      <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
        {[
          ['start', start],
          ['next', () => setStage((value) => Math.min(value + 1, stages.length - 1))],
          ['measure', capture],
          ['stop', stop],
        ].map(([name, action]) => (
          <Pressable
            key={String(name)}
            testID={'structure-probe-' + String(name)}
            onPress={action as () => void}
            style={{ minHeight: 44, padding: 8, backgroundColor: '#e7edf2' }}
          >
            <Text>{String(name)}</Text>
          </Pressable>
        ))}
      </View>
      <View
        ref={parent}
        collapsable={false}
        testID="structure-probe-parent"
        style={{
          width: 240,
          height: 120,
          position: 'relative',
          backgroundColor: '#d6e3ed',
        }}
      >
        {current.order.map((key) =>
          key === 'target' ? (
            <Target key={key} ref={callbacks.target} width={current.width} onLayout={layout} />
          ) : (
            <View
              key={key}
              ref={callbacks[key]}
              style={
                key === 'hidden'
                  ? { display: 'none', width: 40, height: 40 }
                  : {
                      position: 'absolute',
                      left: key === 'a' ? 80 : key === 'b' ? 100 : 120,
                      top: 0,
                      width: 0,
                      height: 0,
                    }
              }
            />
          ),
        )}
      </View>
      <Text
        testID="structure-probe-receipt"
        accessibilityLabel={receipt}
        style={{ width: 1, height: 1 }}
      >
        Receipt
      </Text>
    </View>
  );
}
