// Copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT
import type { Spec, StructuralChange } from './NativeAltrooStructuralObserver';

// Observation-only injections retain their original transport contract.
type ObservationModule = Pick<
  Spec,
  'connect' | 'observe' | 'unobserve' | 'takeRecords' | 'disconnect' | 'getDiagnostics'
>;
type Mode = 'siblings' | 'children';
type Listener = (change: StructuralChange) => void;
type Entry = { id: number; lease: string; revision: number; listener: Listener; released: boolean };
const integer = (value: unknown): value is number =>
  typeof value === 'number' && Number.isSafeInteger(value) && value > 0;
const validLease = (value: unknown): value is string =>
  typeof value === 'string' && value.length > 0 && value.length <= 256;
const validChange = (value: unknown): value is StructuralChange => {
  if (value === null || typeof value !== 'object') return false;
  const item = value as Partial<StructuralChange>;
  return (
    integer(item.subscriptionId) &&
    integer(item.revision) &&
    validLease(item.lease) &&
    typeof item.closed === 'boolean'
  );
};

/** Private transport only. A dirty hint is not a sibling/CSS/paint snapshot.
 * The caller owns one shared client per native module and reads actual refs. */
export function createStructuralObserverClient(injected?: ObservationModule) {
  let native = injected;
  const entries = new Map<number, Entry>();
  let connected = false,
    disposed = false,
    draining = false,
    drainAgain = false;
  const module = () => {
    native ??= require('./NativeAltrooStructuralObserver').default as ObservationModule | undefined;
    if (!native)
      throw Error('Structural observation requires the matching native development build');
    return native;
  };
  const disconnectEmpty = () => {
    if (entries.size || !connected) return;
    connected = false;
    module().disconnect();
  };
  const release = (entry: Entry) => {
    if (entry.released || entries.get(entry.id) !== entry) return;
    entry.released = true;
    entries.delete(entry.id);
    const errors: unknown[] = [];
    try {
      if (!module().unobserve(entry.id, entry.lease))
        throw Error('Native structural observation rejected its current lease cleanup');
    } catch (error) {
      errors.push(error);
      // We cannot prove one native lease was released. Close our whole private
      // connection rather than leave an unowned watcher running indefinitely.
      disposed = true;
      for (const other of entries.values()) other.released = true;
      entries.clear();
    }
    try {
      disconnectEmpty();
    } catch (error) {
      errors.push(error);
    }
    if (errors.length === 1) throw errors[0];
    if (errors.length) throw new AggregateError(errors, 'Structural observation cleanup failed');
  };
  const invalidate = () => {
    disposed = true;
    for (const entry of entries.values()) entry.released = true;
    entries.clear();
    disconnectEmpty();
  };
  const drain = () => {
    if (disposed || !connected) return;
    if (draining) {
      drainAgain = true;
      return;
    }
    draining = true;
    const errors: unknown[] = [];
    try {
      do {
        drainAgain = false;
        let records: unknown;
        try {
          records = module().takeRecords();
        } catch (error) {
          errors.push(error);
          try {
            invalidate();
          } catch (cleanupError) {
            errors.push(cleanupError);
          }
          break;
        }
        if (!Array.isArray(records) || !records.every(validChange)) {
          errors.push(Error('Malformed native structural observation records'));
          try {
            invalidate();
          } catch (error) {
            errors.push(error);
          }
          break;
        }
        for (const record of records) {
          const entry = entries.get(record.subscriptionId);
          if (
            !entry ||
            entry.released ||
            entry.lease !== record.lease ||
            record.revision <= entry.revision
          )
            continue;
          entry.revision = record.revision;
          if (record.closed) {
            try {
              release(entry);
            } catch (error) {
              errors.push(error);
            }
          }
          try {
            entry.listener(record);
          } catch (error) {
            errors.push(error);
          }
        }
      } while (drainAgain && connected && !disposed);
    } finally {
      draining = false;
    }
    if (errors.length) throw new AggregateError(errors, 'Structural observation callbacks failed');
  };
  return {
    watch(tag: number, lease: string, mode: Mode, listener: Listener): () => void {
      if (disposed) throw Error('Structural observation client is disposed');
      if (
        !integer(tag) ||
        tag > 0x7fffffff ||
        !validLease(lease) ||
        !['siblings', 'children'].includes(mode) ||
        typeof listener !== 'function'
      )
        throw TypeError('Expected a native tag, bounded lease, finite mode and callback');
      const host = module();
      if (!connected) {
        host.connect(drain);
        connected = true;
      }
      let id: number;
      try {
        id = host.observe(tag, lease, mode);
      } catch (error) {
        try {
          disconnectEmpty();
        } catch (cleanupError) {
          throw new AggregateError(
            [error, cleanupError],
            'Structural registration and cleanup failed',
          );
        }
        throw error;
      }
      if (!integer(id) || entries.has(id)) {
        const error = Error('Native structural observation returned an invalid or duplicate ID');
        try {
          invalidate();
        } catch (cleanupError) {
          throw new AggregateError([error, cleanupError], 'Structural protocol and cleanup failed');
        }
        throw error;
      }
      const entry: Entry = { id, lease, revision: 0, listener, released: false };
      entries.set(id, entry);
      // Native uses AsyncCallback, so no notification can enter during observe.
      // The semantic caller still reads its snapshot after subscribing.
      return () => release(entry);
    },
    dispose: invalidate,
    get disposed() {
      return disposed;
    },
  };
}

// All first-party observers share the module's one native callback/record queue.
// Each returned facade owns only its watches, so a diagnostic fixture cannot
// disconnect another mounted component when it disposes its own subscriptions.
const sharedClients = new WeakMap<
  ObservationModule,
  ReturnType<typeof createStructuralObserverClient>
>();
export function createNativeStructuralObservation(injected?: ObservationModule | null) {
  const native =
    injected === undefined
      ? (require('./NativeAltrooStructuralObserver').default as ObservationModule | null)
      : injected;
  if (!native) return undefined;
  let shared = sharedClients.get(native);
  if (!shared || shared.disposed) {
    shared = createStructuralObserverClient(native);
    sharedClients.set(native, shared);
  }
  const owned = new Set<() => void>();
  let disposed = false;
  return {
    watch(...args: Parameters<NonNullable<typeof shared>['watch']>) {
      if (disposed) throw Error('Structural observation owner is disposed');
      const release = shared!.watch(...args);
      let active = true;
      const stop = () => {
        if (!active) return;
        active = false;
        owned.delete(stop);
        release();
      };
      owned.add(stop);
      return stop;
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      const errors: unknown[] = [];
      for (const stop of [...owned]) {
        try {
          stop();
        } catch (error) {
          errors.push(error);
        }
      }
      if (errors.length) throw new AggregateError(errors, 'Structural observation cleanup failed');
    },
  };
}
