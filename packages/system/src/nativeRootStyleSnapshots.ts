// Copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT
// Immutable React-props snapshots, not a global latest-value channel.
import { useId, useMemo, isValidElement, type ReactNode } from 'react';

export type NativeRootSnapshot<T> = Readonly<{ token: string; value: T }>;
export type NativeRootSnapshotScope<T> = Readonly<{
  prefix: string;
  publish(value: T): NativeRootSnapshot<T>;
  resolve(className: unknown): NativeRootSnapshot<T>;
  prune(): number;
}>;
const pendingProps = new WeakMap<object, readonly NativeRootSnapshot<unknown>[]>();

/** Emitted props keep pending records alive without changing those props.
 * Returned consumer element props retain accepted records across memo bailouts.
 */
export function retainNativeRootSnapshotProps(
  props: object,
  ...records: readonly (NativeRootSnapshot<unknown> | undefined)[]
): void {
  const present = records.filter((record): record is NativeRootSnapshot<unknown> => !!record);
  if (present.length) pendingProps.set(props, [...(pendingProps.get(props) ?? []), ...present]);
}

export function createNativeRootSnapshotScope<T>(
  prefix: string,
  same: (left: T, right: T) => boolean,
): NativeRootSnapshotScope<T> {
  if (typeof WeakRef !== 'function') throw Error('Known root snapshots require WeakRef support');
  const entries = new Map<string, WeakRef<NativeRootSnapshot<T>>>();
  let serial = 0;
  const prune = () => {
    for (const [token, ref] of entries) if (!ref.deref()) entries.delete(token);
    return entries.size;
  };
  return Object.freeze({
    prefix,
    prune,
    publish(value: T) {
      for (const [token, ref] of entries) {
        const record = ref.deref();
        if (!record) entries.delete(token);
        else if (same(record.value, value)) return record;
      }
      if (serial === Number.MAX_SAFE_INTEGER)
        throw Error('Known root snapshot token budget exhausted');
      const record = Object.freeze({ token: prefix + ++serial, value });
      entries.set(record.token, new WeakRef(record));
      return record;
    },
    resolve(className: unknown) {
      const tokens =
        typeof className === 'string'
          ? className.split(/\s+/).filter((token) => token.startsWith(prefix))
          : [];
      if (tokens.length !== 1) throw Error('Expected one accepted known-root snapshot token');
      const record = entries.get(tokens[0])?.deref();
      if (!record) throw Error('Accepted known-root snapshot is unavailable');
      return record;
    },
  });
}

/** Instance-local weak registration. No effect cleanup destroys live StrictMode
 * snapshots; the complete table becomes unreachable with its owner/context.
 */
export function useNativeRootSnapshotScope<T>(
  kind: 'css' | 'handoff',
  same: (left: T, right: T) => boolean,
): NativeRootSnapshotScope<T> {
  const id = useId();
  return useMemo(() => {
    const encoded = Array.from(id, (char) => char.codePointAt(0)!.toString(16)).join('_');
    return createNativeRootSnapshotScope('altroo-root-' + kind + '-v1-' + encoded + '-', same);
  }, [id, kind, same]);
}

/** Lookup is pure; strong lifetime belongs to emitted/returned real props. */
export function readNativeRootSnapshot<T>(
  scope: NativeRootSnapshotScope<T> | null,
  className: unknown,
): NativeRootSnapshot<T> | undefined {
  return scope?.resolve(className);
}
export function retainNativeRootSnapshotElement<T extends ReactNode>(
  node: T,
  ...records: readonly (NativeRootSnapshot<unknown> | undefined)[]
): T {
  if (isValidElement(node) && node.props && typeof node.props === 'object')
    retainNativeRootSnapshotProps(node.props, ...records);
  return node;
}

/** Native generated class-name adaptation, preserving all authored class text. */
export function nativeRootSnapshotClassName(
  className: unknown,
  record: NativeRootSnapshot<unknown>,
): string {
  return typeof className === 'string' && className.length
    ? className + ' ' + record.token
    : record.token;
}
