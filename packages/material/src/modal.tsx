import { NativeModalParentContext as ParentContext } from './nativeModalContext';
import React, {
  forwardRef,
  useContext,
  useEffect,
  useLayoutEffect,
  useInsertionEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from 'react';
import {
  View,
  Pressable,
  Modal as NativeModal,
  TextInput,
  BackHandler,
  Platform,
  type ViewProps,
  type ViewInstance,
  type PressableProps,
  type ModalProps as NativeWindowProps,
  type GestureResponderEvent,
} from 'react-native';
import {
  useDefaultProps,
  NativeTextScope,
  renderNativeTextChildren,
  resolveSlotProps,
  diagnostic,
  type SlotProps,
  type SxProps,
} from '@altroo/mui-native-system';
import {
  InteractiveView,
  getNativeFocusedView,
  type InteractiveViewProps,
} from '@altroo/mui-native-host';
import { NativeOverlayReadiness } from './nativeOverlayReadiness';
import { useTheme, useComponentStyle, useSx } from './themeProvider';
import { useForkRef } from './utils';
import { Fade, type FadeProps } from './fade';
import type { TransitionProps, TransitionStyle } from './transitions/types';
import {
  nativeModalManager as manager,
  type NativeModalEntry,
  type NativeFocusTarget,
} from './nativeModalManager';
export type { NativeFocusTarget } from './nativeModalManager';
type NativeKeyEvent = Parameters<NonNullable<ViewProps['onKeyDown']>>[0];
export type ModalCloseEvent = GestureResponderEvent | NativeKeyEvent | null;
export interface BackdropComponentsPropsOverrides {}
export interface BackdropTransitionSlotPropsOverrides {}
export interface BackdropRootProps
  extends Omit<PressableProps, 'onClick'>,
    BackdropComponentsPropsOverrides {
  ref?: React.Ref<ViewInstance>;
  sx?: SxProps;
  onClick?: (event: GestureResponderEvent) => void;
  ownerState?: BackdropOwnerState;
}
export interface BackdropSlots {
  root?: React.ComponentType<BackdropRootProps>;
  transition?: React.ComponentType<FadeProps>;
}
export interface BackdropProps
  extends Omit<PressableProps, 'children' | 'style' | 'onClick'>,
    Omit<TransitionProps, keyof PressableProps | 'children' | 'style'> {
  open: boolean;
  invisible?: boolean;
  children?: React.ReactNode;
  sx?: SxProps;
  style?: TransitionStyle;
  onClick?: (event: GestureResponderEvent) => void;
  component?: React.ComponentType<BackdropRootProps>;
  transitionDuration?: TransitionProps['timeout'];
  slots?: BackdropSlots;
  slotProps?: {
    root?: SlotProps<BackdropRootProps, BackdropOwnerState>;
    transition?: SlotProps<
      Partial<FadeProps> & BackdropTransitionSlotPropsOverrides,
      BackdropOwnerState
    >;
  };
}
export interface BackdropOwnerState extends BackdropProps {
  invisible: boolean;
}
interface SurfaceProps extends BackdropRootProps {
  surface: React.ComponentType<BackdropRootProps>;
  nativeBaseStyle: ViewProps['style'];
}
const BackdropSurface = forwardRef<ViewInstance, SurfaceProps>(function BackdropSurface(
  { surface: Root, nativeBaseStyle, ownerState, sx, onClick, ...native },
  ref,
) {
  const style = native.style;
  const contentProp = native.children;
  const theme = useTheme();
  return (
    <NativeTextScope
      theme={theme}
      style={[nativeBaseStyle, typeof style === 'function' ? undefined : style]}
      content={typeof contentProp === 'function' ? undefined : contentProp}
    >
      {(scopeStyle, content, scope) => (
        <Root
          {...native}
          {...(Root === Pressable ? {} : { ownerState })}
          ref={ref}
          accessible={native.accessible ?? false}
          onPress={native.onPress ?? onClick}
          style={typeof style === 'function' ? (state) => [scopeStyle, style(state)] : scopeStyle}
        >
          {typeof contentProp === 'function'
            ? (state) => renderNativeTextChildren(contentProp(state), theme, scope)
            : content}
        </Root>
      )}
    </NativeTextScope>
  );
});
export const Backdrop: React.ForwardRefExoticComponent<
  React.PropsWithoutRef<BackdropProps> & React.RefAttributes<ViewInstance>
> = forwardRef<ViewInstance, BackdropProps>(function Backdrop(inProps, ref) {
  const props = useDefaultProps({ props: inProps, name: 'MuiBackdrop' });
  const {
    open,
    invisible = false,
    children,
    sx,
    style,
    onClick,
    onPress,
    component,
    slots = {},
    slotProps = {},
    transitionDuration,
    ...other
  } = props;
  const ownerState = { ...props, invisible };
  const root = resolveSlotProps(slotProps.root, ownerState) ?? {};
  const transition = resolveSlotProps(slotProps.transition, ownerState) ?? {};
  const Root = slots.root ?? component ?? Pressable,
    Transition = slots.transition ?? Fade;
  const rootRef = useForkRef(ref, root.ref);
  const effectiveSx = Object.hasOwn(props, 'sx') ? sx : root.sx;
  const computed = useComponentStyle('MuiBackdrop', ownerState, effectiveSx, {
    overrideKeys: invisible ? ['invisible'] : [],
    baseStyle: {
      position: 'absolute',
      top: 0,
      right: 0,
      bottom: 0,
      left: 0,
      backgroundColor: invisible ? 'transparent' : 'rgba(0,0,0,0.5)',
    },
  });
  const press = Object.hasOwn(props, 'onPress')
    ? { onPress }
    : Object.hasOwn(props, 'onClick')
      ? { onPress: onClick }
      : {};
  return (
    <Transition
      in={open}
      timeout={transitionDuration}
      {...other}
      {...press}
      style={style}
      {...transition}
      {...(Transition === Fade ? {} : { ownerState })}
    >
      <BackdropSurface
        {...root}
        surface={Root}
        ownerState={ownerState}
        nativeBaseStyle={computed}
        ref={rootRef}
      >
        {children}
      </BackdropSurface>
    </Transition>
  );
});
export interface NativeModalControlProps {
  open: boolean;
  onClose?: (event: ModalCloseEvent, reason: 'backdropClick' | 'escapeKeyDown') => void;
  /** Native compatibility extension retained from the prototype. */
  disableEscapeKeyDown?: boolean;
  disableAutoFocus?: boolean;
  disableEnforceFocus?: boolean;
  disableRestoreFocus?: boolean;
  disablePortal?: boolean;
  hideBackdrop?: boolean;
  keepMounted?: boolean;
  initialFocusRef?: React.RefObject<NativeFocusTarget | null>;
  returnFocusRef?: React.RefObject<NativeFocusTarget | null>;
  nativeModalProps?: Omit<
    NativeWindowProps,
    'children' | 'visible' | 'onRequestClose' | 'onShow' | 'onDismiss'
  >;
  onShow?: NativeWindowProps['onShow'];
  onDismiss?: NativeWindowProps['onDismiss'];
}
export interface ModalComponentsPropsOverrides {}
export interface ModalRootProps extends InteractiveViewProps, ModalComponentsPropsOverrides {
  ownerState?: ModalOwnerState;
  sx?: SxProps;
  ref?: React.Ref<ViewInstance>;
}
export interface ModalOwnerState extends NativeModalControlProps {
  exited: boolean;
  closeAfterTransition?: boolean;
}
export interface ModalSlots {
  root?: React.ComponentType<ModalRootProps>;
  backdrop?: React.ComponentType<
    BackdropProps & React.RefAttributes<ViewInstance> & { ownerState?: ModalOwnerState }
  >;
}
export interface ModalProps
  extends Omit<InteractiveViewProps, 'children' | 'onClick'>,
    NativeModalControlProps {
  children: React.ReactElement<any>;
  sx?: SxProps;
  closeAfterTransition?: boolean;
  onTransitionEnter?: () => void;
  onTransitionExited?: () => void;
  component?: React.ComponentType<ModalRootProps>;
  slots?: ModalSlots;
  slotProps?: {
    root?: SlotProps<ModalRootProps, ModalOwnerState>;
    backdrop?: SlotProps<
      Partial<BackdropProps> & React.RefAttributes<ViewInstance> & ModalComponentsPropsOverrides,
      ModalOwnerState
    >;
  };
}
export type ModalOwnProps = ModalProps;
const noSubscribe = () => () => {};
function contains(root: ViewInstance | null, target: NativeFocusTarget) {
  return (
    root === target ||
    Boolean(
      root &&
        typeof root.contains === 'function' &&
        typeof (target as Partial<ViewInstance>).nodeType === 'number' &&
        root.contains(target as ViewInstance),
    )
  );
}
export const Modal: React.ForwardRefExoticComponent<
  React.PropsWithoutRef<ModalProps> & React.RefAttributes<ViewInstance>
> = forwardRef<ViewInstance, ModalProps>(function Modal(inProps, forwardedRef) {
  const props = useDefaultProps({ props: inProps, name: 'MuiModal' });
  const modalTheme = useTheme();
  const {
    open,
    children,
    onClose,
    disableEscapeKeyDown = false,
    disableAutoFocus = false,
    disableEnforceFocus = false,
    disableRestoreFocus = false,
    disablePortal = false,
    hideBackdrop = false,
    keepMounted = false,
    closeAfterTransition = false,
    onTransitionEnter,
    onTransitionExited,
    initialFocusRef,
    returnFocusRef,
    nativeModalProps,
    onShow,
    onDismiss,
    slots = {},
    slotProps = {},
    component,
    sx,
    style,
    ...native
  } = props;
  const parent = useContext(ParentContext);
  const id = useRef(Symbol('native-modal')).current;
  const nativeWindowHost = !disablePortal || Boolean(parent?.nativeWindow);
  const root = useRef<ViewInstance | null>(null),
    content = useRef<ViewInstance | null>(null);
  const lastFocus = useRef<NativeFocusTarget | null>(null);
  const active = useRef(false),
    activated = useRef(false),
    focused = useRef(false),
    pendingInlineFocus = useRef(false);
  const restore = useRef<(() => void) | undefined>(undefined);
  const hasTransition = Object.hasOwn(children.props, 'in');
  const [exited, setExited] = useState(!open);
  const [windowShown, setWindowShown] = useState(open);
  const [presented, setPresented] = useState(false);
  const presentationReady = disablePortal ? (parent?.presented ?? true) : presented;
  const currentPresentation = useRef(presentationReady);
  const retained = open || (hasTransition && !exited);
  const registered = open || (hasTransition && !exited && closeAfterTransition);
  useLayoutEffect(() => {
    // Android does not deliver onDismiss; a fully hidden host needs a new onShow.
    // An interrupted exit retains its existing presented native window.
    if (!retained && Platform.OS !== 'ios') setPresented(false);
  }, [retained]);
  const previousFocus = useMemo(
    () =>
      registered ? (getNativeFocusedView() ?? TextInput.State.currentlyFocusedInput()) : undefined,
    [registered],
  );
  const parentValue = useMemo(
    () => ({
      id,
      host: disablePortal ? (parent?.host ?? id) : id,
      nativeWindow: nativeWindowHost,
      presented: presentationReady,
      open,
    }),
    [id, disablePortal, parent?.host, nativeWindowHost, presentationReady, open],
  );
  const committed = useRef(props);
  const transitionCycle = useMemo(() => Symbol('transition-cycle'), [open]);
  const committedCycle = useRef(transitionCycle);
  const entry = useRef<NativeModalEntry | undefined>(undefined);
  if (!entry.current)
    entry.current = {
      id,
      parent: parent?.id,
      host: disablePortal ? (parent?.host ?? id) : id,
      open,
      restore: true,
      contains: (target) =>
        content.current === target ||
        contains(
          typeof content.current?.contains === 'function' ? content.current : root.current,
          target,
        ),
      focus: () => {
        const current = committed.current;
        if (!active.current || !currentPresentation.current) return;
        const target = [
          current.initialFocusRef?.current,
          lastFocus.current,
          root.current,
          content.current,
        ].find((node) => node && typeof node.focus === 'function' && node.isConnected !== false);
        target?.focus();
      },
      escape: (event) => {
        const current = committed.current;
        if (active.current && !current.disableEscapeKeyDown)
          current.onClose?.(event as ModalCloseEvent, 'escapeKeyDown');
      },
    };
  const layer = entry.current;
  // Publish only committed metadata before descendant layout callbacks run.
  // No focus or state updates run in this insertion effect.
  useInsertionEffect(() => {
    committed.current = props;
    currentPresentation.current = presentationReady;
    active.current = open;
    committedCycle.current = transitionCycle;
    layer.open = open;
    layer.restore = !disableRestoreFocus;
  });
  useSyncExternalStore(
    registered ? manager.subscribe : noSubscribe,
    manager.snapshot,
    manager.snapshot,
  );
  const top = manager.top();
  const covered = Boolean(top && top !== layer && !manager.isDescendant(top, id));
  useLayoutEffect(() => {
    if (!registered) return;
    restore.current = undefined;
    focused.current = false;
    activated.current = !committed.current.disableAutoFocus;
    layer.parent = parent?.id;
    layer.host = disablePortal ? (parent?.host ?? id) : id;
    layer.restoreTarget = previousFocus;
    layer.explicitRestore = committed.current.returnFocusRef
      ? () => committed.current.returnFocusRef?.current
      : undefined;
    manager.add(layer);
    return () => {
      const release = manager.remove(layer);
      restore.current = release;
      // Normal iOS dismissal waits for onDismiss. Inline/Android and unmount use
      // a guarded microtask; a newly opened layer invalidates stale restoration.
      if (disablePortal || Platform.OS !== 'ios')
        queueMicrotask(() => {
          if (restore.current === release) {
            restore.current = undefined;
            release();
          }
        });
    };
  }, [registered, disablePortal, layer, id]);
  useEffect(
    () => () => {
      const release = restore.current;
      restore.current = undefined;
      release?.();
    },
    [],
  );
  useEffect(() => {
    if (!registered || !disablePortal) return;
    const listener = BackHandler.addEventListener('hardwareBackPress', () => {
      if (manager.top() !== layer || !active.current) return false;
      manager.requestFrom(layer, null);
      return true;
    });
    return () => listener.remove();
  }, [registered, disablePortal, layer]);
  useEffect(() => {
    if (keepMounted && !disablePortal)
      diagnostic(
        'modal-keep-mounted',
        'React Native window modals unmount after dismissal. Use disablePortal for keepMounted state preservation.',
      );
  }, [keepMounted, disablePortal]);
  useLayoutEffect(() => {
    if (open && !disablePortal) setWindowShown(true);
  }, [open, disablePortal]);
  const ownerState = {
    ...props,
    exited,
    closeAfterTransition,
    disableAutoFocus,
    disableEnforceFocus,
    disablePortal,
    disableRestoreFocus,
    hideBackdrop,
    keepMounted,
  };
  const rootProps = resolveSlotProps(slotProps.root, ownerState) ?? {};
  const backdropProps = resolveSlotProps(slotProps.backdrop, ownerState) ?? {};
  const rootRef = useForkRef(root, forwardedRef, rootProps.ref);
  const childRef = useForkRef(content, children.props.ref);
  const computed = useComponentStyle('MuiModal', ownerState, sx, {
    overrideKeys: !retained && exited ? ['hidden'] : [],
    baseStyle: {
      position: 'absolute',
      top: 0,
      right: 0,
      bottom: 0,
      left: 0,
      zIndex: 1300 + manager.index(layer),
    },
  });
  const Root = slots.root ?? component ?? InteractiveView,
    BackdropSlot = slots.backdrop ?? Backdrop;
  const rootNative = { ...native, ...rootProps };
  const {
    sx: rootSx,
    style: rootStyle,
    ref: _ref,
    ownerState: _ownerState,
    ...rootRest
  } = rootNative as ModalRootProps;
  const slotStyle = useSx(rootSx);
  const focusInitial = () => {
    if (
      !active.current ||
      focused.current ||
      !manager.isTop(layer) ||
      committed.current.disableAutoFocus ||
      !currentPresentation.current
    )
      return false;
    focused.current = true;
    const current = getNativeFocusedView() ?? TextInput.State.currentlyFocusedInput();
    if (!current || !layer.contains(current)) layer.focus();
    return true;
  };
  useLayoutEffect(() => {
    if (disablePortal && presentationReady && pendingInlineFocus.current && focusInitial())
      pendingInlineFocus.current = false;
  }, [disablePortal, presentationReady, open, top]);
  const enforcement = useRef(0);
  const observeFocus: NonNullable<ViewProps['onFocus']> = (event) => {
    if (!active.current || !manager.isTop(layer)) return;
    activated.current = true;
    const target = event.target;
    if (
      target &&
      typeof target === 'object' &&
      typeof target.focus === 'function' &&
      layer.contains(target)
    ) {
      lastFocus.current = target;
      enforcement.current++;
    }
  };
  const enforceFocus = () => {
    const generation = ++enforcement.current;
    queueMicrotask(() => {
      if (
        generation !== enforcement.current ||
        !active.current ||
        !activated.current ||
        !manager.isTop(layer) ||
        committed.current.disableEnforceFocus
      )
        return;
      const current = getNativeFocusedView() ?? TextInput.State.currentlyFocusedInput();
      if (!current || !layer.contains(current)) layer.focus();
    });
  };
  const childProps: Record<string, unknown> = {
    ref: childRef,
    tabIndex: children.props.tabIndex === undefined ? -1 : children.props.tabIndex,
  };
  if (hasTransition) {
    childProps.onEnter = (...args: unknown[]) => {
      if (!open || committedCycle.current !== transitionCycle) return;
      setExited(false);
      committed.current.onTransitionEnter?.();
      children.props.onEnter?.(...args);
    };
    childProps.onExited = (...args: unknown[]) => {
      if (open || committedCycle.current !== transitionCycle) return;
      setExited(true);
      committed.current.onTransitionExited?.();
      children.props.onExited?.(...args);
    };
  }
  const rendering = retained || (keepMounted && disablePortal) || (!disablePortal && windowShown);
  const tree = rendering ? (
    <NativeOverlayReadiness.Provider value={open && presentationReady && manager.isTop(layer)}>
      <ParentContext.Provider value={parentValue}>
        <NativeTextScope
          theme={modalTheme}
          reset={!disablePortal}
          content={React.cloneElement(children, childProps)}
          style={[
            computed,
            style,
            slotStyle,
            rootStyle,
            !retained && (disablePortal || !windowShown) && { display: 'none' },
          ]}
        >
          {(scopedStyle, scopedContent) => (
            <Root
              {...rootRest}
              {...(Root === View || Root === InteractiveView ? {} : { ownerState })}
              ref={rootRef}
              {...(Root === View
                ? {}
                : {
                    managedKeys: [...new Set(['Escape', ...(rootRest.managedKeys ?? [])])],
                    managedDescendantKeys:
                      open && presentationReady && manager.isTop(layer)
                        ? [
                            ...new Set([
                              'Escape' as const,
                              ...(rootRest.managedDescendantKeys ?? []),
                            ]),
                          ]
                        : [],
                    focusable: rootRest.focusable ?? true,
                    tabIndex: rootRest.tabIndex ?? -1,
                  })}
              collapsable={false}
              accessible={rootRest.accessible ?? false}
              accessibilityViewIsModal={retained && !covered}
              accessibilityElementsHidden={
                covered || !retained || rootRest.accessibilityElementsHidden
              }
              importantForAccessibility={
                covered || !retained ? 'no-hide-descendants' : rootRest.importantForAccessibility
              }
              pointerEvents={covered || !retained ? 'none' : rootRest.pointerEvents}
              style={scopedStyle}
              onLayout={(event) => {
                rootRest.onLayout?.(event);
                if (disablePortal) {
                  if (!presentationReady) pendingInlineFocus.current = true;
                  else if (focusInitial()) pendingInlineFocus.current = false;
                }
              }}
              onAccessibilityEscape={() => {
                rootRest.onAccessibilityEscape?.();
                manager.requestFrom(layer, null);
              }}
              onKeyDown={(event) => {
                rootRest.onKeyDown?.(event);
                if (
                  event.nativeEvent.key === 'Escape' &&
                  !event.nativeEvent.isComposing &&
                  !(event.nativeEvent as { isCanceled?: boolean }).isCanceled &&
                  active.current &&
                  // Android Dialog owns Escape key-up and reports onRequestClose.
                  // Defer window-hosted layers to that route to avoid two requests.
                  !(Platform.OS === 'android' && nativeWindowHost) &&
                  manager.isTop(layer)
                ) {
                  event.stopPropagation();
                  manager.requestFrom(layer, event);
                }
              }}
              onFocusCapture={(event) => {
                rootRest.onFocusCapture?.(event);
                observeFocus(event);
              }}
              onBlurCapture={(event) => {
                rootRest.onBlurCapture?.(event);
                enforceFocus();
              }}
              {...(Root === View
                ? {}
                : {
                    onNativeFocus: (event: Parameters<NonNullable<ViewProps['onFocus']>>[0]) => {
                      rootRest.onNativeFocus?.(event);
                      observeFocus(event);
                    },
                    onNativeBlur: (event: Parameters<NonNullable<ViewProps['onBlur']>>[0]) => {
                      rootRest.onNativeBlur?.(event);
                      enforceFocus();
                    },
                  })}
            >
              {!hideBackdrop && (
                <BackdropSlot
                  {...backdropProps}
                  {...(BackdropSlot === Backdrop ? {} : { ownerState })}
                  open={open}
                  onPress={(event) => {
                    (backdropProps.onPress ?? backdropProps.onClick)?.(event);
                    if (!active.current || !manager.isTop(layer)) return;
                    if (
                      event.target !== undefined &&
                      event.currentTarget !== undefined &&
                      event.target !== event.currentTarget
                    )
                      return;
                    committed.current.onClose?.(event, 'backdropClick');
                  }}
                />
              )}
              {scopedContent}
            </Root>
          )}
        </NativeTextScope>
      </ParentContext.Provider>
    </NativeOverlayReadiness.Provider>
  ) : null;
  if (disablePortal) return tree;
  return (
    <NativeModal
      {...nativeModalProps}
      transparent={nativeModalProps?.transparent ?? true}
      animationType={nativeModalProps?.animationType ?? 'none'}
      visible={retained}
      onRequestClose={() => manager.requestFrom(layer, null)}
      onShow={(event) => {
        if (!active.current) return;
        currentPresentation.current = true;
        setPresented(true);
        focusInitial();
        committed.current.onShow?.(event);
      }}
      onDismiss={() => {
        if (active.current) return;
        currentPresentation.current = false;
        setWindowShown(false);
        setPresented(false);
        const release = restore.current;
        restore.current = undefined;
        release?.();
        committed.current.onDismiss?.();
      }}
    >
      {tree}
    </NativeModal>
  );
});
