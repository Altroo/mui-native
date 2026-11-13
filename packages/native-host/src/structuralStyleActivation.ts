// Copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT
// Internal owned-host leases. No native read or activation belongs in render.
import type { Spec } from './NativeAltrooStructuralObserver';
type Native = Pick<
  Spec,
  | 'enableStructuralStyleRuntime'
  | 'disableStructuralStyleRuntime'
  | 'getStructuralStyleRuntimeStatus'
>;
export type StructuralStyleStatus = Readonly<{
  schema: 1;
  service: 'owned-structural-style';
  errorNotification: 'async-once-per-generation-v1';
  active: boolean;
  hookRegistered: boolean;
  owner: string;
  generation: string;
  degraded: boolean;
  errors: string;
  lastErrorCode: string;
  lastError: string;
}>;
export type StructuralStyleError = Readonly<{
  generation: string;
  errors: string;
  code: string;
  lastError: string;
}>;
export type StructuralStyleErrorReporter = (error: StructuralStyleError) => void;
export interface StructuralStyleActivation {
  acquire(reportError?: StructuralStyleErrorReporter): () => void;
  getStatus(): StructuralStyleStatus;
}
const maximum = 18446744073709551615n;
const owner = 'mui-owned-structural-style';
const managers = new WeakMap<Native, StructuralStyleActivation>();
function read(native: Native): StructuralStyleStatus {
  const raw = native.getStructuralStyleRuntimeStatus();
  if (typeof raw !== 'string' || raw.length > 8192)
    throw Error('Structural style runtime status is unsupported');
  const parsed = JSON.parse(raw) as Record<string, unknown>;
  const decimal = (x: unknown): x is string =>
    typeof x === 'string' && /^(0|[1-9][0-9]{0,19})$/.test(x) && BigInt(x) <= maximum;
  if (
    !parsed ||
    parsed.schema !== 1 ||
    parsed.service !== 'owned-structural-style' ||
    parsed.errorNotification !== 'async-once-per-generation-v1' ||
    typeof parsed.active !== 'boolean' ||
    parsed.hookRegistered !== parsed.active ||
    typeof parsed.owner !== 'string' ||
    parsed.owner.length > 96 ||
    !decimal(parsed.generation) ||
    typeof parsed.degraded !== 'boolean' ||
    !decimal(parsed.errors) ||
    typeof parsed.lastErrorCode !== 'string' ||
    typeof parsed.lastError !== 'string' ||
    parsed.lastError.length > 192
  )
    throw Error('Structural style runtime status is unsupported');
  return parsed as StructuralStyleStatus;
}
export function structuralStyleActivation(native: Native): StructuralStyleActivation {
  if (
    !native ||
    typeof native.enableStructuralStyleRuntime !== 'function' ||
    typeof native.disableStructuralStyleRuntime !== 'function' ||
    typeof native.getStructuralStyleRuntimeStatus !== 'function'
  )
    throw Error('Structural style runtime binary support is missing');
  const previous = managers.get(native);
  if (previous) return previous;
  type Session = {
    generation: string;
    owners: Map<symbol, StructuralStyleErrorReporter | undefined>;
    reported: WeakSet<StructuralStyleErrorReporter>;
    notified: boolean;
  };
  let current: Session | undefined,
    busy = false;
  const transition = <T>(fn: () => T): T => {
    if (busy) throw Error('Reentrant structural style lease transition');
    busy = true;
    try {
      return fn();
    } finally {
      busy = false;
    }
  };
  const drain = (session: Session) => {
    native.disableStructuralStyleRuntime(owner, session.generation);
    if (current === session) current = undefined;
  };
  const lease = (session: Session, reportError?: StructuralStyleErrorReporter) => {
    const token = Symbol('owned structural style');
    let released = false;
    const release = () => {
      if (current !== session) {
        session.owners.delete(token);
        released = true;
        return;
      }
      if (released && session.owners.size) return;
      transition(() => {
        if (!released) {
          session.owners.delete(token);
          released = true;
        }
        if (!session.owners.size) drain(session);
      });
    };
    // The cleanup closure exists before ownership is published or native starts.
    session.owners.set(token, reportError);
    return release;
  };
  const notifyError = (session: Session) => {
    if (busy || current !== session || !session.owners.size || session.notified) return;
    const status = read(native);
    if (
      current !== session ||
      !session.owners.size ||
      session.notified ||
      !status.active ||
      status.owner !== owner ||
      status.generation !== session.generation ||
      !status.degraded
    )
      return;
    const error: StructuralStyleError = Object.freeze({
      generation: status.generation,
      errors: status.errors,
      code: status.lastErrorCode,
      lastError: status.lastError,
    });
    session.notified = true;
    let failed = false;
    let failure: unknown;
    // Only leases active at delivery participate. No history or released reporter
    // is retained, and one reporter shared by hosts is called once per generation.
    for (const [token, reporter] of [...session.owners]) {
      if (current !== session || !session.owners.has(token)) continue;
      if (!reporter || session.reported.has(reporter)) continue;
      session.reported.add(reporter);
      try {
        reporter(error);
      } catch (caught) {
        if (!failed) {
          failed = true;
          failure = caught;
        }
      }
    }
    if (failed) throw failure;
  };
  // Construct the native-held closure outside the reporter environment of acquire.
  // Otherwise, its lexical outer context can retain a released reporter.
  const notificationFor = (session: Session) => () => notifyError(session);
  const result: StructuralStyleActivation = Object.freeze({
    getStatus: () => read(native),
    acquire(reportError?: StructuralStyleErrorReporter) {
      if (reportError !== undefined && typeof reportError !== 'function')
        throw Error('Structural style error reporter must be a function');
      return transition(() => {
        if (current && !current.owners.size) drain(current);
        if (current) {
          const status = read(native);
          if (
            !status.active ||
            status.owner !== owner ||
            status.generation !== current.generation
          ) {
            current.owners.clear();
            current = undefined;
            throw Error('Structural style ownership was replaced');
          }
          return lease(current, reportError);
        }
        const status = read(native);
        if (status.active) throw Error('Foreign structural style runtime is active');
        if (BigInt(status.generation) === maximum)
          throw Error('Structural style generation exhausted');
        const session: Session = {
          generation: (BigInt(status.generation) + 1n).toString(),
          owners: new Map(),
          reported: new WeakSet(),
          notified: false,
        };
        const release = lease(session, reportError);
        const notify = notificationFor(session);
        current = session;
        try {
          native.enableStructuralStyleRuntime(owner, session.generation, notify);
        } catch (error) {
          session.owners.clear();
          current = undefined;
          throw error;
        }
        // No fallible post-enable read or newly allocated cleanup can orphan it.
        return release;
      });
    },
  });
  managers.set(native, result);
  return result;
}
