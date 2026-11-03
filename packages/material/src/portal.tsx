import React, {
  forwardRef,
  useCallback,
  useContext,
  useImperativeHandle,
  useInsertionEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from 'react';
import {
  View,
  findNodeHandle,
  type ViewInstance,
  type TextInstance,
  type TextInputInstance,
} from 'react-native';
import { NativePortalHost, type NativePortalLayout } from '@altroo/mui-native-host';
import { NativeTextScope, diagnostic } from '@altroo/mui-native-system';
import { useTheme } from './themeProvider';
import { useForkRef } from './utils';
import { useMenuEvent } from './useMenuEvent';
import { NativeOverlayReadiness } from './nativeOverlayReadiness';
import { NativeModalParentContext } from './nativeModalContext';
import { nativeModalManager as manager } from './nativeModalManager';
import { NativePortalContext } from './portalContext';
import {
  PortalObservationRegistry,
  type PortalObservationLease,
  type PortalObservationListener,
} from './portalObservation';
import { portalBounds, portalWindowRect, type NativePortalBounds } from './portalGeometry';
export type { NativePortalBounds } from './portalGeometry';
export type NativePortalInlineHandle = ViewInstance | TextInstance | TextInputInstance;
export type NativePortalContainer = ViewInstance | (() => ViewInstance | null) | null;
export interface NativePortalHandle {
  readonly node: ViewInstance | null;
  readonly container: ViewInstance | null;
  readonly bounds: NativePortalBounds | null;
  readonly presented: boolean;
  measureInWindow(callback: (x: number, y: number, width: number, height: number) => void): void;
}
interface SharedPortalProps {
  children?: React.ReactNode;
  container?: NativePortalContainer;
  /** Native sibling-root order within the same window/container. */
  layer?: number;
  /** Native bounds are delivered after attachment and when the container moves. */
  onContainerLayout?: (bounds: NativePortalBounds | null) => void;
}
export type PortalProps<DisablePortal extends boolean | undefined = boolean> = SharedPortalProps & {
  disablePortal?: DisablePortal;
  ref?: React.Ref<DisablePortal extends true ? NativePortalInlineHandle : NativePortalHandle>;
};
interface NativePortalComponent {
  <DisablePortal extends boolean | undefined = undefined>(
    props: PortalProps<DisablePortal>,
  ): React.ReactNode;
  displayName?: string;
}
let sequence = 0;
const token = () => `mui-portal-${++sequence}`;
const placeholderStyle = {
  position: 'absolute',
  left: 0,
  top: 0,
  width: 0,
  height: 0,
  overflow: 'hidden',
} as const;
export const Portal = forwardRef<
  NativePortalHandle | NativePortalInlineHandle,
  SharedPortalProps & { disablePortal?: boolean }
>(function Portal(
  { children, container, disablePortal = false, layer = 0, onContainerLayout },
  forwarded,
) {
  const theme = useTheme(),
    parent = useContext(NativeModalParentContext),
    inheritedReady = useContext(NativeOverlayReadiness);
  useSyncExternalStore(manager.subscribe, manager.snapshot, manager.snapshot);
  const [target, setTarget] = useState<{
    resolved: boolean;
    node: ViewInstance | null;
    tag: number;
    revision: string;
  }>({ resolved: false, node: null, tag: 0, revision: '' });
  const [host, setHost] = useState<ViewInstance | null>(null),
    canvas = useRef<ViewInstance | null>(null);
  const [layout, setLayout] = useState<NativePortalLayout | null>(null);
  const [observation, setObservation] = useState<PortalObservationLease | null>(null);
  const [observations] = useState(() => new PortalObservationRegistry(setObservation));
  const observeAnchor = useCallback(
    (node: ViewInstance | null, listener: PortalObservationListener) => {
      const tag = node == null ? 0 : (findNodeHandle(node) ?? -1);
      return observations.observe(node, tag, listener);
    },
    [observations],
  );
  // Insertion cleanup only closes the registration gate. Notifications stay in layout cleanup,
  // where state publication is permitted; StrictMode's layout replay can then register again.
  useInsertionEffect(() => {
    observations.activate();
    return () => observations.deactivate();
  }, [observations]);
  const mounted = useRef(false);
  useLayoutEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      observations.clear();
    };
  }, [observations]);
  useLayoutEffect(() => {
    if (disablePortal) return;
    const node = (typeof container === 'function' ? container() : container) ?? null;
    let tag = 0;
    if (node != null) {
      tag = findNodeHandle(node) ?? -1;
      if (!Number.isInteger(tag) || tag <= 0)
        throw new Error(
          'MUI Native: Portal container must be a mounted native ViewInstance or null.',
        );
    }
    setTarget((previous) =>
      previous.resolved && previous.node === node && previous.tag === tag
        ? previous
        : { resolved: true, node, tag, revision: token() },
    );
  }, [container, disablePortal]);
  const top = manager.top();
  const eligible = Boolean(
    !disablePortal &&
      target.resolved &&
      inheritedReady &&
      parent?.open !== false &&
      parent?.presented !== false &&
      (!top || (host ? top.contains(host) : parent?.id === top.id)),
  );
  useLayoutEffect(() => {
    observations.invalidate();
  }, [eligible, target.revision, observations]);
  const bounds = useMemo(
    () => (layout?.revision === target.revision ? portalBounds(layout) : null),
    [layout, target.revision],
  );
  const presented = eligible && bounds != null;
  const current = useRef({ container: target.node, bounds: presented ? bounds : null, presented });
  useInsertionEffect(() => {
    current.current = { container: target.node, bounds: presented ? bounds : null, presented };
  });
  const handle = useMemo<NativePortalHandle>(
    () => ({
      get node() {
        return canvas.current;
      },
      get container() {
        return current.current.container;
      },
      get bounds() {
        return current.current.bounds;
      },
      get presented() {
        return mounted.current && current.current.presented;
      },
      measureInWindow(callback) {
        if (mounted.current && current.current.presented && current.current.bounds) {
          const rect = portalWindowRect(current.current.bounds);
          callback(rect.x, rect.y, rect.width, rect.height);
        }
      },
    }),
    [],
  );
  useImperativeHandle(
    disablePortal || !target.resolved ? undefined : (forwarded as React.Ref<NativePortalHandle>),
    () => handle,
    [handle, disablePortal, target.resolved, target.revision],
  );
  const validChild = React.isValidElement<{ ref?: React.Ref<NativePortalInlineHandle> }>(children);
  const inlineRef = useForkRef(
    validChild ? children.props.ref : undefined,
    forwarded as React.Ref<NativePortalInlineHandle>,
  );
  const report = useMenuEvent(
    (
      event: Parameters<
        NonNullable<React.ComponentProps<typeof NativePortalHost>['onPortalLayout']>
      >[0],
    ) => {
      if (!mounted.current || disablePortal || event.nativeEvent.revision !== target.revision)
        return;
      const value = event.nativeEvent;
      if (value.presented && !portalBounds(value)) {
        diagnostic('portal-layout', 'The native Portal reported invalid container geometry.');
        setLayout(null);
        return;
      }
      setLayout({ ...value });
    },
  );
  const reportObservation = useMenuEvent(
    (
      event: Parameters<
        NonNullable<React.ComponentProps<typeof NativePortalHost>['onPortalObservation']>
      >[0],
    ) => {
      if (!mounted.current || disablePortal) return;
      const result = observations.receive(event.nativeEvent, target.revision, eligible);
      if (result === 'invalid')
        diagnostic(
          'portal-observation',
          'The native Portal reported invalid observation geometry.',
        );
    },
  );
  const layoutCallback = useMenuEvent(onContainerLayout ?? (() => {}));
  const publicBounds = presented ? bounds : null;
  useLayoutEffect(() => {
    if (!disablePortal && target.resolved) layoutCallback(publicBounds);
  }, [publicBounds, disablePortal, target.resolved, layoutCallback]);
  const hostRef = useCallback((node: ViewInstance | null) => {
    setHost(node);
  }, []);
  const surface = useMemo(
    () => ({
      get node() {
        return canvas.current;
      },
      bounds: publicBounds,
      presented,
      observeAnchor,
    }),
    [publicBounds, presented, observeAnchor],
  );
  if (!Number.isFinite(layer)) throw new Error('MUI Native: Portal layer must be finite.');
  if (disablePortal) {
    if (validChild) return React.cloneElement(children, { ref: inlineRef });
    return (
      <NativeTextScope theme={theme} content={children}>
        {(_style, content) => content}
      </NativeTextScope>
    );
  }
  if (!target.resolved) return null;
  return (
    <NativePortalHost
      ref={hostRef}
      active={eligible}
      revision={target.revision}
      containerTag={target.tag}
      layer={layer}
      geometry={presented ? layout : null}
      surfaceRef={canvas}
      presented={presented}
      onPortalLayout={report}
      observedTag={observation?.tag ?? 0}
      observationRevision={observation?.revision ?? ''}
      onPortalObservation={reportObservation}
      collapsable={false}
      pointerEvents="none"
      style={placeholderStyle}
    >
      <NativePortalContext.Provider value={surface}>
        <NativeOverlayReadiness.Provider value={presented}>
          <NativeTextScope theme={theme} content={children}>
            {(_style, content) => <>{content}</>}
          </NativeTextScope>
        </NativeOverlayReadiness.Provider>
      </NativePortalContext.Provider>
    </NativePortalHost>
  );
}) as NativePortalComponent;
