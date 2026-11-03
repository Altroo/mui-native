/* Native lifecycle adapts Material UI Popper under the MIT license.
 * Copyright (c) 2014 Call-Em-All. See NOTICE and upstream/reuse.json.
 * Native adaptation copyright (c) 2026 Altroo and contributors.
 * SPDX-License-Identifier: MIT
 */
import React, {
  useContext,
  useEffect,
  useInsertionEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  useImperativeHandle,
} from 'react';
import { findNodeHandle, PixelRatio, type ViewInstance } from 'react-native';
import { NativePortalHost } from '@altroo/mui-native-host';
import { diagnostic } from '@altroo/mui-native-system';
import { NativePortalContext } from './portalContext';
import { NativeOverlayReadiness } from './nativeOverlayReadiness';
import { PortalObservationRegistry, type PortalObservationLease } from './portalObservation';
import { useMenuEvent } from './useMenuEvent';
import { createNativePopper } from './nativePopper/engine';
import {
  NativePopperAdapter,
  sameNativeValue,
  type NativePositionRequest,
} from './nativePopper/nativeAdapter';
import type {
  NativePopperAnchor,
  NativePopperInstance,
  NativePopperModifier,
  NativePopperOptions,
  PopperPlacementType,
} from './nativePopper/types';
import type { NativeStyle } from '@altroo/mui-native-system';
let sequence = 0;
const nativeTag = (node: ViewInstance) => {
  const tag = findNodeHandle(node);
  if (!tag || !Number.isInteger(tag) || tag < 0)
    throw new Error('MUI Native: Popper requires mounted native view refs.');
  return tag;
};
function InlineObservation({
  request,
  active,
  receive,
}: {
  request: NativePositionRequest;
  active: boolean;
  receive: NativePopperAdapter['receive'];
}) {
  const [revision] = useState(() => `mui-inline-position-${++sequence}`),
    [lease, setLease] = useState<PortalObservationLease | null>(null),
    [registry] = useState(() => new PortalObservationRegistry(setLease));
  const mounted = useRef(false);
  useInsertionEffect(() => {
    registry.activate();
    return () => registry.deactivate();
  }, [registry]);
  useLayoutEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      registry.clear();
    };
  }, [registry]);
  useLayoutEffect(() => {
    if (!active) return;
    return registry.observe(
      request.reference,
      request.reference ? nativeTag(request.reference) : 0,
      receive,
      {
        popperTag: nativeTag(request.popper),
        arrowTag: request.arrow ? nativeTag(request.arrow) : 0,
        boundaryTags: request.boundaries.map(nativeTag),
      },
    );
  }, [active, request, receive, registry]);
  useLayoutEffect(() => {
    registry.invalidate();
  }, [active, registry]);
  const report = useMenuEvent(
    (
      event: Parameters<
        NonNullable<React.ComponentProps<typeof NativePortalHost>['onPortalObservation']>
      >[0],
    ) => {
      if (!mounted.current) return;
      if (registry.receive(event.nativeEvent, revision, active) === 'invalid')
        diagnostic(
          'popper-observation',
          'Popper requires valid positioning geometry from native host 0.0.5; rebuild the application.',
        );
    },
  );
  // Observe the existing inline containing block without attaching another Portal root.
  return (
    <NativePortalHost
      observationOnly
      active={active}
      revision={revision}
      observedTag={lease?.tag ?? 0}
      popperTag={lease?.popperTag ?? 0}
      arrowTag={lease?.arrowTag ?? 0}
      boundaryTags={lease?.boundaryTags as number[] | undefined}
      observationRevision={lease?.revision ?? ''}
      onPortalObservation={report}
      pointerEvents="none"
      collapsable={false}
      style={{ position: 'absolute', left: 0, top: 0, width: 0, height: 0 }}
    />
  );
}
export function flipNativePopperPlacement(
  placement: PopperPlacementType,
  direction: 'ltr' | 'rtl',
): PopperPlacementType {
  if (direction === 'ltr') return placement;
  return (
    (
      {
        'bottom-start': 'bottom-end',
        'bottom-end': 'bottom-start',
        'top-start': 'top-end',
        'top-end': 'top-start',
      } as Partial<Record<PopperPlacementType, PopperPlacementType>>
    )[placement] ?? placement
  );
}
const emptyOptions: Partial<NativePopperOptions> = {};
export function useNativePopper({
  anchorEl,
  root,
  open,
  disablePortal,
  placement,
  direction,
  modifiers,
  popperOptions = emptyOptions,
  popperRef,
}: {
  anchorEl?: NativePopperAnchor | null | (() => NativePopperAnchor | null);
  root: ViewInstance | null;
  open: boolean;
  disablePortal: boolean;
  placement: PopperPlacementType;
  direction: 'ltr' | 'rtl';
  modifiers?: NativePopperModifier[];
  popperOptions?: Partial<NativePopperOptions>;
  popperRef?: React.Ref<NativePopperInstance>;
}) {
  const surface = useContext(NativePortalContext),
    overlayReady = useContext(NativeOverlayReadiness),
    alive = useRef(false),
    live = useRef<NativePopperInstance | null>(null);
  const [request, setRequest] = useState<NativePositionRequest | null>(null),
    [style, setStyle] = useState<NativeStyle>({}),
    [positioned, setPositioned] = useState(false),
    [error, setError] = useState<unknown>(null),
    [instance, setInstance] = useState<NativePopperInstance | null>(null);
  const rtlPlacement = flipNativePopperPlacement(placement, direction),
    [resolvedPlacement, setPlacement] = useState(rtlPlacement);
  const reference = useMemo(
    () => (typeof anchorEl === 'function' ? anchorEl() : anchorEl),
    [anchorEl],
  );
  const [adapter] = useState(
    () =>
      new NativePopperAdapter({
        tag: nativeTag,
        pixelRatio: () => PixelRatio.get(),
        configure: (value) => {
          if (alive.current) setRequest(value);
        },
        publish: (value) => {
          if (alive.current)
            setStyle((previous) => (sameNativeValue(previous, value) ? previous : value));
        },
        ready: (value) => {
          if (alive.current) setPositioned(value);
        },
        report: (value) => {
          if (alive.current) setError(value instanceof Error ? value : new Error(String(value)));
        },
      }),
  );
  useLayoutEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
      adapter.dispose();
    };
  }, [adapter]);
  useImperativeHandle(popperRef, () => instance as NativePopperInstance, [instance]);
  const active = open && overlayReady;
  useLayoutEffect(() => {
    if (!active || !root || !reference) return;
    adapter.setActive(true);
    const options = {
      placement: rtlPlacement,
      ...popperOptions,
      modifiers: [
        { name: 'preventOverflow', options: { altBoundary: disablePortal } },
        { name: 'flip', options: { altBoundary: disablePortal } },
        {
          name: 'onUpdate',
          enabled: true,
          phase: 'afterWrite' as const,
          fn: ({ state }: any) => setPlacement(state.placement),
        },
        ...(modifiers ?? []),
        ...(popperOptions.modifiers ?? []),
      ],
    };
    const next = createNativePopper(reference, root, options, adapter);
    live.current = next;
    setInstance(next);
    return () => {
      next.destroy();
      if (live.current === next) {
        live.current = null;
        adapter.setActive(false);
        if (alive.current) setInstance((previous) => (previous === next ? null : previous));
      }
    };
  }, [active, root, reference, rtlPlacement, disablePortal, modifiers, popperOptions, adapter]);
  useLayoutEffect(() => {
    if (disablePortal || !active || !surface || !request) return;
    return surface.observeAnchor(request.reference, adapter.receive, {
      popper: request.popper,
      arrow: request.arrow,
      boundaries: request.boundaries,
    });
  }, [disablePortal, active, surface?.observeAnchor, request, adapter]);
  useEffect(() => {
    try {
      live.current?.forceUpdate();
    } catch (error) {
      adapter.report(error);
    }
  });
  const layout = useMenuEvent(() => {
    try {
      live.current?.forceUpdate();
    } catch (error) {
      adapter.report(error);
    }
  });
  if (error) throw error;
  return {
    style,
    placement: resolvedPlacement,
    positioned: active && positioned,
    onLayout: layout,
    observer:
      disablePortal && request ? (
        <InlineObservation request={request} active={active} receive={adapter.receive} />
      ) : null,
  };
}
