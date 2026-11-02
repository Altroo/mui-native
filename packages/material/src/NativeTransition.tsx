import React, {
  useCallback,
  useContext,
  useInsertionEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import type { ViewInstance } from 'react-native';
import { diagnostic } from '@altroo/mui-native-system';
import { completionTimeout, nativeMilliseconds } from './nativeTransitionTiming';
import { NativeTransitionReadiness } from './transitionReadiness';
import type { TransitionActions, TransitionProps, TransitionStatus } from './transitions/types';
interface Props extends TransitionActions {
  in?: boolean;
  mountOnEnter?: boolean;
  unmountOnExit?: boolean;
  timeout?: TransitionProps['timeout'];
  getAutoTimeout?: () => number | null | undefined;
  nodeRef: React.RefObject<ViewInstance | null>;
  reduceMotion: boolean;
  addEndListener?: (node: ViewInstance, done: () => void) => void;
  onEnter?: (appearing: boolean) => void;
  onEntering?: (appearing: boolean) => void;
  onEntered?: (appearing: boolean) => void;
  onExit?: () => void;
  onExiting?: () => void;
  onExited?: () => void;
  children: (status: Exclude<TransitionStatus, 'unmounted'>, phase: number) => React.ReactNode;
}
type NativeStatus = TransitionStatus | 'waiting';
export default function NativeTransition(props: Props) {
  const ready = useContext(NativeTransitionReadiness);
  const committedReady = useRef(ready);
  const { in: inProp = false, appear = false, mountOnEnter = false, unmountOnExit = false } = props;
  const [status, setStatus] = useState<NativeStatus>(() =>
    inProp
      ? appear
        ? ready
          ? 'exited'
          : 'waiting'
        : 'entered'
      : mountOnEnter || unmountOnExit
        ? 'unmounted'
        : 'exited',
  );
  const statusRef = useRef(status);
  statusRef.current = status;
  if (inProp && status === 'unmounted') {
    statusRef.current = 'exited';
    setStatus('exited');
  }
  const current = useRef(props);
  useInsertionEffect(() => {
    current.current = props;
    committedReady.current = ready;
  });
  const mounted = useRef(false),
    shouldAppear = useRef(inProp && appear),
    appearing = useRef(false),
    lastFired = useRef(status),
    phase = useRef(0);
  const pending = useRef<{ cancel(): void; finish(): void } | undefined>(undefined);
  const cancel = useCallback(() => {
    pending.current?.cancel();
    pending.current = undefined;
  }, []);
  const schedule = useCallback((next: 'entered' | 'exited', state: 'entering' | 'exiting') => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    let active = true;
    const clear = () => {
      if (timer !== undefined) clearTimeout(timer);
      timer = undefined;
    };
    const work = {
      cancel: () => {
        active = false;
        clear();
      },
      finish: () => {
        if (!active || !mounted.current) return;
        if ((next === 'entered') !== Boolean(current.current.in)) {
          work.cancel();
          if (pending.current === work) pending.current = undefined;
          return;
        }
        active = false;
        clear();
        if (pending.current === work) pending.current = undefined;
        statusRef.current = next;
        setStatus(next);
      },
    };
    pending.current = work;
    const p = current.current,
      timeout =
        p.getAutoTimeout?.() ??
        completionTimeout(p.timeout, state === 'entering', appearing.current);
    const node = p.nodeRef.current;
    if (!node) {
      diagnostic('transition-child', 'A native transition child must forward a native ref.');
      timer = setTimeout(work.finish, 0);
      return;
    }
    if (p.reduceMotion) timer = setTimeout(work.finish, 0);
    else if (timeout !== undefined) timer = setTimeout(work.finish, nativeMilliseconds(timeout));
    else if (!p.addEndListener) timer = setTimeout(work.finish, 0);
    p.addEndListener?.(node, work.finish);
  }, []);
  const update = useCallback(
    (entering: boolean, mounting = false) => {
      cancel();
      phase.current++;
      const p = current.current;
      if (entering) {
        appearing.current = mounting;
        if (!mounting && p.enter === false) {
          statusRef.current = 'entered';
          setStatus('entered');
          return;
        }
        p.onEnter?.(mounting);
        statusRef.current = 'entering';
        setStatus('entering');
      } else {
        if (p.exit === false) {
          statusRef.current = 'exited';
          setStatus('exited');
          return;
        }
        p.onExit?.();
        statusRef.current = 'exiting';
        setStatus('exiting');
      }
    },
    [cancel],
  );
  useLayoutEffect(() => {
    mounted.current = true;
    if (shouldAppear.current && committedReady.current && current.current.in) {
      shouldAppear.current = false;
      update(true, true);
    }
    return () => {
      mounted.current = false;
      cancel();
    };
  }, [cancel, update]);
  useLayoutEffect(() => {
    if (!mounted.current) return;
    const state = statusRef.current;
    if (inProp) {
      if (state !== 'entering' && state !== 'entered') {
        if (!ready) {
          if (state !== 'waiting') {
            statusRef.current = 'waiting';
            setStatus('waiting');
          }
        } else {
          const initial = shouldAppear.current;
          shouldAppear.current = false;
          update(true, initial);
        }
      }
    } else if (state === 'waiting') {
      shouldAppear.current = false;
      update(false);
    } else if (state === 'entering' || state === 'entered') update(false);
    else if (state === 'exited' && unmountOnExit) {
      statusRef.current = 'unmounted';
      setStatus('unmounted');
    }
  }, [inProp, status, unmountOnExit, update, ready]);
  useLayoutEffect(() => {
    if (status === 'unmounted' || lastFired.current === 'unmounted') {
      lastFired.current = status;
      return;
    }
    const changed = lastFired.current !== status;
    if (changed) lastFired.current = status;
    const p = current.current;
    if (status === 'entering') {
      if (changed) p.onEntering?.(appearing.current);
      if (!pending.current && statusRef.current === status) schedule('entered', 'entering');
    } else if (status === 'exiting') {
      if (changed) p.onExiting?.();
      if (!pending.current && statusRef.current === status) schedule('exited', 'exiting');
    } else if (status === 'entered' && changed) p.onEntered?.(appearing.current);
    else if (status === 'exited' && changed) p.onExited?.();
  }, [status, schedule]);
  // Native preference changes stop active motion promptly. A canceled generation
  // cannot complete a reopened transition through either timer or listener.
  const previousReduction = useRef(props.reduceMotion);
  useLayoutEffect(() => {
    const newlyReduced = !previousReduction.current && props.reduceMotion;
    previousReduction.current = props.reduceMotion;
    if (newlyReduced && (status === 'entering' || status === 'exiting')) {
      cancel();
      schedule(status === 'entering' ? 'entered' : 'exited', status);
    }
  }, [props.reduceMotion, status, cancel, schedule]);
  return status === 'unmounted'
    ? null
    : props.children(status === 'waiting' ? 'exited' : status, phase.current);
}
