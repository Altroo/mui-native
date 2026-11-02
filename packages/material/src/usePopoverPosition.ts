import { useCallback, useInsertionEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { RefCallback } from 'react';
import type { LayoutChangeEvent, ViewInstance } from 'react-native';
import { diagnostic } from '@altroo/mui-native-system';
import {
  positionPopover,
  type NativePopoverRect,
  type PopoverOrigin,
  type PopoverPosition,
  type PopoverReference,
} from './popoverGeometry';
import { measurePopoverWindow, type NativePopoverAnchor } from './popoverMeasurement';
interface Parameters {
  open: boolean;
  identity: symbol;
  anchorEl?: NativePopoverAnchor | null | (() => NativePopoverAnchor | null);
  anchorOrigin: PopoverOrigin;
  transformOrigin: PopoverOrigin;
  anchorPosition?: PopoverPosition;
  anchorReference: PopoverReference;
  marginThreshold: number | null;
  viewport: { width: number; height: number };
}
interface Placement {
  top: number | null;
  left: number | null;
  origin: { vertical: number; horizontal: number };
  cycle: symbol;
  identity: symbol;
  root: ViewInstance;
  paper: ViewInstance;
}
interface PositionController {
  root: RefCallback<ViewInstance>;
  paper: RefCallback<ViewInstance>;
  request: () => void;
  onPaperLayout: (event: LayoutChangeEvent, identity: symbol) => void;
  exited: (cycle: symbol) => void;
  cycle: symbol;
  positioned: boolean;
  placement: Placement | undefined;
}
export function usePopoverPosition(parameters: Parameters): PositionController {
  const root = useRef<ViewInstance | null>(null),
    paper = useRef<ViewInstance | null>(null);
  const [, refreshNodes] = useState(0);
  const layouts = useRef(new WeakMap<ViewInstance, { width: number; height: number }>());
  const cycle = useMemo(() => Symbol('popover-cycle'), [parameters.open]);
  const [placement, setPlacement] = useState<Placement | undefined>(undefined);
  const current = useRef({ ...parameters, cycle }),
    alive = useRef(false),
    generation = useRef(0);
  useInsertionEffect(() => {
    current.current = { ...parameters, cycle };
    generation.current++;
  });
  const attached = useRef<{ root: ViewInstance | null; paper: ViewInstance | null }>({
    root: null,
    paper: null,
  });
  const rootRef = useCallback((node: ViewInstance | null) => {
    root.current = node;
    if (node && attached.current.root !== node) {
      attached.current.root = node;
      if (alive.current) refreshNodes((value) => value + 1);
    }
  }, []);
  const paperRef = useCallback((node: ViewInstance | null) => {
    paper.current = node;
    if (node && attached.current.paper !== node) {
      attached.current.paper = node;
      if (alive.current) refreshNodes((value) => value + 1);
    }
  }, []);
  const request = useCallback(() => {
    const p = current.current,
      rootNode = root.current,
      paperNode = paper.current;
    if (!alive.current || !p.open || !rootNode || !paperNode) return;
    const token = ++generation.current;
    const valid = () =>
      alive.current &&
      current.current.open &&
      generation.current === token &&
      root.current === rootNode &&
      paper.current === paperNode &&
      current.current.cycle === p.cycle &&
      current.current.identity === p.identity;
    let size: { width: number; height: number } | undefined;
    try {
      const width = paperNode.offsetWidth,
        height = paperNode.offsetHeight;
      if (Number.isFinite(width) && Number.isFinite(height) && width > 0 && height > 0)
        size = { width, height };
    } catch {
      /* Custom handles can use the committed native layout fallback. */
    }
    size ??= layouts.current.get(paperNode);
    if (!size) return;
    if (
      !Number.isFinite(p.marginThreshold ?? 0) ||
      ![
        p.anchorOrigin.vertical,
        p.anchorOrigin.horizontal,
        p.transformOrigin.vertical,
        p.transformOrigin.horizontal,
      ].every((value) => typeof value !== 'number' || Number.isFinite(value))
    ) {
      diagnostic('popover-position', 'Popover origins and margin threshold must be finite.');
      return;
    }
    let rootRect: NativePopoverRect | undefined,
      anchorRect: NativePopoverRect | undefined,
      published = false;
    const publish = () => {
      if (!valid() || published || !rootRect || !anchorRect) return;
      if (rootRect.width <= 0 || rootRect.height <= 0) return;
      published = true;
      const result = positionPopover({ ...p, size: size!, anchor: anchorRect });
      const next: Placement = {
        ...result,
        top: result.top == null ? null : result.top - rootRect.top,
        left: result.left == null ? null : result.left - rootRect.left,
        cycle: p.cycle,
        identity: p.identity,
        root: rootNode,
        paper: paperNode,
      };
      setPlacement((previous) =>
        previous &&
        previous.cycle === next.cycle &&
        previous.identity === next.identity &&
        previous.root === next.root &&
        previous.paper === next.paper &&
        previous.top === next.top &&
        previous.left === next.left &&
        previous.origin.vertical === next.origin.vertical &&
        previous.origin.horizontal === next.origin.horizontal
          ? previous
          : next,
      );
    };
    if (
      p.anchorReference === 'anchorPosition' &&
      (!p.anchorPosition || ![p.anchorPosition.top, p.anchorPosition.left].every(Number.isFinite))
    ) {
      diagnostic(
        'popover-position',
        'anchorReference=anchorPosition requires finite top/left coordinates.',
      );
      return;
    }
    measurePopoverWindow(rootNode, (rect) => {
      if (!valid()) return;
      rootRect = rect;
      publish();
    });
    if (p.anchorReference !== 'anchorEl') {
      anchorRect = { top: 0, left: 0, ...p.viewport };
      publish();
      return;
    }
    let anchor: NativePopoverAnchor | null | undefined;
    try {
      anchor = typeof p.anchorEl === 'function' ? p.anchorEl() : p.anchorEl;
    } catch {
      diagnostic('popover-anchor', 'Popover anchor function failed to resolve a native node.');
      return;
    }
    if (!anchor) {
      anchorRect = { top: 0, left: 0, ...p.viewport };
      publish();
      return;
    }
    if ('isConnected' in anchor && anchor.isConnected === false) {
      diagnostic('popover-anchor', 'Popover anchor is disconnected.');
      return;
    }
    measurePopoverWindow(anchor, (rect) => {
      if (!valid()) return;
      anchorRect = rect;
      publish();
    });
  }, []);
  useLayoutEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
      generation.current++;
    };
  }, []);
  // Match upstream updates after commits, but publish only changed coordinates.
  useLayoutEffect(() => {
    request();
  });
  const onPaperLayout = useCallback(
    (event: LayoutChangeEvent, identity: symbol) => {
      if (current.current.identity !== identity) return;
      const { width, height } = event.nativeEvent.layout;
      if (paper.current && [width, height].every((value) => Number.isFinite(value) && value >= 0))
        layouts.current.set(paper.current, { width, height });
      request();
    },
    [request],
  );
  const exited = useCallback((eventCycle: symbol) => {
    if (current.current.cycle !== eventCycle || current.current.open) return;
    generation.current++;
    setPlacement(undefined);
  }, []);
  const positioned = Boolean(
    placement &&
      placement.identity === parameters.identity &&
      placement.root === root.current &&
      placement.paper === paper.current &&
      (!parameters.open || placement.cycle === cycle),
  );
  return {
    root: rootRef,
    paper: paperRef,
    request,
    onPaperLayout,
    exited,
    cycle,
    positioned,
    placement: positioned ? placement : undefined,
  };
}
