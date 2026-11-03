import {
  useContext,
  useInsertionEffect,
  useLayoutEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from 'react';
import type { ViewInstance, NativeSyntheticEvent } from 'react-native';
import type {
  NativePickerPresentation,
  NativePickerPresentationContext,
} from '@altroo/mui-native-host';
import { nativeModalManager as manager, type NativeModalEntry } from './nativeModalManager';
import { NativeModalParentContext } from './nativeModalContext';
import { NativeOverlayReadiness } from './nativeOverlayReadiness';
import { NativeMenuFocusReadiness } from './menuContext';
import { useMenuEvent } from './useMenuEvent';
let sequence = 0;
export function useNativePickerLayer(
  trigger: React.RefObject<ViewInstance | null>,
  disabled: boolean,
  readOnly: boolean,
  finished: (restoring: boolean) => void,
) {
  const parent = useContext(NativeModalParentContext);
  const overlayReady = useContext(NativeOverlayReadiness),
    menuReady = useContext(NativeMenuFocusReadiness);
  useSyncExternalStore(manager.subscribe, manager.snapshot, manager.snapshot);
  const [requested, setRequested] = useState(false),
    [retained, setRetained] = useState(false),
    [requestKey, setRequestKey] = useState('');
  const currentKey = useRef(''),
    requestedRef = useRef(false),
    mounted = useRef(true);
  const committedRequest = useRef(''),
    restoreIntent = useRef(true);
  const entry = useRef<NativeModalEntry | undefined>(undefined);
  if (!entry.current) {
    const id = Symbol('native-picker');
    entry.current = {
      id,
      host: id,
      open: false,
      restore: true,
      contains: () => false,
      focus: () => {},
      escape: () => {
        requestedRef.current = false;
        setRequested(false);
      },
    };
  }
  const layer = entry.current,
    top = manager.top();
  const parentOpen = parent?.open !== false && parent?.presented !== false;
  const eligible = parentOpen && overlayReady && menuReady && (!top || top.id === parent?.id);
  const canRemain = parentOpen && (top === layer || eligible);
  const open = requested && canRemain && !disabled && !readOnly;
  const lease = retained && (open || committedRequest.current === requestKey);
  const latest = useRef({ eligible, parentOpen, disabled, readOnly, retained, finished });
  useInsertionEffect(() => {
    latest.current = { eligible, parentOpen, disabled, readOnly, retained, finished };
    requestedRef.current = open;
    if (open) committedRequest.current = requestKey;
    layer.open = lease;
    layer.restore = restoreIntent.current && !disabled && parentOpen;
  });
  useLayoutEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      layer.restore = false;
    };
  }, [layer]);
  useLayoutEffect(() => {
    if (retained && !lease) {
      requestedRef.current = false;
      setRetained(false);
      latest.current.finished(false);
    }
  }, [retained, lease]);
  useLayoutEffect(() => {
    if (requested && !open) {
      requestedRef.current = false;
      setRequested(false);
    }
  }, [requested, open]);
  useLayoutEffect(() => {
    if (!lease) return;
    layer.parent = parent?.id;
    layer.explicitRestore = () => trigger.current;
    manager.add(layer);
    return () => {
      const release = manager.remove(layer);
      queueMicrotask(() => {
        if (mounted.current) release();
      });
    };
  }, [lease, layer, parent?.id, trigger]);
  const show = useMenuEvent(() => {
    const state = latest.current,
      actualTop = manager.top();
    if (
      !mounted.current ||
      state.retained ||
      !state.eligible ||
      state.disabled ||
      state.readOnly ||
      (actualTop && actualTop.id !== parent?.id) ||
      !trigger.current ||
      trigger.current.isConnected === false
    )
      return false;
    const key = `native-select-${++sequence}`;
    currentKey.current = key;
    requestedRef.current = true;
    restoreIntent.current = true;
    setRequestKey(key);
    setRequested(true);
    setRetained(true);
    return true;
  });
  const close = useMenuEvent((restore = true) => {
    if (!restore) {
      restoreIntent.current = false;
      layer.restore = false;
    }
    requestedRef.current = false;
    setRequested(false);
  });
  const dismissed = useMenuEvent(() => {
    requestedRef.current = false;
    setRequested(false);
  });
  const presentation = useMenuEvent(
    (
      event: NativeSyntheticEvent<NativePickerPresentation>,
      context: NativePickerPresentationContext,
    ) => {
      if (
        !mounted.current ||
        context.requestKey !== currentKey.current ||
        event.nativeEvent.state !== 'dismissed' ||
        !event.nativeEvent.terminal
      )
        return;
      requestedRef.current = false;
      setRequested(false);
      const restoring =
        restoreIntent.current &&
        manager.isTop(layer) &&
        latest.current.parentOpen &&
        !latest.current.disabled &&
        trigger.current?.isConnected !== false;
      latest.current.finished(restoring);
      setRetained(false);
    },
  );
  const isActive = useMenuEvent(
    () =>
      requestedRef.current &&
      manager.isTop(layer) &&
      !latest.current.disabled &&
      !latest.current.readOnly &&
      latest.current.parentOpen,
  );
  const acceptFocus = useMenuEvent(() => {
    const current = manager.top();
    return (
      !latest.current.disabled &&
      latest.current.parentOpen &&
      (current === layer || (latest.current.eligible && (!current || current.id === parent?.id)))
    );
  });
  return {
    open,
    retained: lease,
    requestKey,
    eligible,
    show,
    close,
    dismissed,
    presentation,
    isActive,
    acceptFocus,
  };
}
