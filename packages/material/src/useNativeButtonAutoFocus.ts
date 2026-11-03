import { useContext, useLayoutEffect, useRef, useSyncExternalStore, type RefObject } from 'react';
import { TextInput, type ViewInstance } from 'react-native';
import { getNativeFocusedView } from '@altroo/mui-native-host';
import { NativeModalParentContext } from './nativeModalContext';
import { NativeOverlayReadiness } from './nativeOverlayReadiness';
import { NativeMenuFocusReadiness } from './menuContext';
import { nativeModalManager as manager } from './nativeModalManager';
const noSubscribe = () => () => {};
const zero = () => 0;
/** Only autofocus opts into overlay subscriptions; never steal focus on a later prop toggle. */
export function useNativeButtonAutoFocus(
  enabled: boolean,
  node: RefObject<ViewInstance | null>,
  disabled: boolean,
) {
  const parent = useContext(NativeModalParentContext),
    overlayReady = useContext(NativeOverlayReadiness),
    menuReady = useContext(NativeMenuFocusReadiness);
  const revision = useSyncExternalStore(
    enabled ? manager.subscribe : noSubscribe,
    enabled ? manager.snapshot : zero,
    zero,
  );
  const request = useRef({ previous: enabled, pending: enabled, initial: enabled });
  useLayoutEffect(() => {
    const current = request.current;
    if (!enabled) {
      current.previous = false;
      current.pending = false;
      return;
    }
    if (!current.previous) {
      current.pending = true;
      current.initial = false;
    }
    current.previous = true;
    if (
      !current.pending ||
      !overlayReady ||
      !menuReady ||
      parent?.open === false ||
      parent?.presented === false
    )
      return;
    const target = node.current,
      top = manager.top();
    if (!target || target.isConnected === false || (top && !top.contains(target))) return;
    current.pending = false;
    if (
      !disabled &&
      (current.initial || (!getNativeFocusedView() && !TextInput.State.currentlyFocusedInput()))
    )
      target.focus();
  }, [enabled, disabled, parent, overlayReady, menuReady, revision, node]);
}
