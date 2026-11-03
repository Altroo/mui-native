import React, {
  forwardRef,
  useContext,
  useImperativeHandle,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import type { ViewInstance, ViewProps } from 'react-native';
import { useDefaultProps } from '@altroo/mui-native-system';
import { List, type ListProps } from './lists';
import { NativeMenuListRoot, type MenuListRootProps } from './menuListRoot';
import {
  NativeMenuRegistry,
  menuNavigationKeys,
  menuFocusable,
  menuTextMatches,
  nextMenuItem,
  resolveMenuActive,
  type MenuTextCriteria,
  type MenuFocusSource,
  type NativeMenuRecord,
} from './nativeMenuRegistry';
import {
  NativeMenuContext,
  NativeMenuFocusSource,
  NativeMenuFocusReadiness,
  type NativeMenuContextValue,
} from './menuContext';
import { NativeCompositeKeys } from './nativeCompositeKeys';
import { nativeButtonModality } from './nativeButtonModality';
import { buttonKeyEvent, type ButtonBaseKeyEvent } from './nativeButtonEvents';
import { useMenuEvent } from './useMenuEvent';
import { useForkRef } from './utils';
export type { MenuListRootProps } from './menuListRoot';
export { NativeMenuListRoot as MenuListRoot } from './menuListRoot';
export interface MenuListActions {
  focusInitialTarget(): ViewInstance | null;
  /** Native scroll indicators overlay content and need no browser-width compensation. */
  adjustStyleForScrollbar(
    container?: ViewInstance | null,
    options?: { direction?: 'ltr' | 'rtl' },
  ): ViewInstance | null;
}
export interface MenuListOwnProps {
  autoFocus?: boolean;
  autoFocusItem?: boolean;
  disabledItemsFocusable?: boolean;
  disableListWrap?: boolean;
  variant?: 'menu' | 'selectedMenu';
  actions?: React.Ref<MenuListActions>;
  /** Optional native initial-input signal; Select also supplies this internally. */
  focusSource?: MenuFocusSource;
  managedKeys?: readonly string[];
  onKeyDown?: (event: ButtonBaseKeyEvent) => void;
  onKeyDownCapture?: (event: ButtonBaseKeyEvent) => void;
}
export interface MenuListProps
  extends Omit<ListProps, 'onKeyDown' | 'onKeyDownCapture'>,
    MenuListOwnProps {}
// React Native key events bubble through nested composites. Only the innermost
// MenuList owns navigation/typeahead; ancestor consumer callbacks still run.
const handledMenuKeys = new WeakSet<object>();
function targetNode(value: unknown): ViewInstance | null {
  return value && typeof value === 'object' && 'focus' in value ? (value as ViewInstance) : null;
}
export const MenuList: React.ForwardRefExoticComponent<
  React.PropsWithoutRef<MenuListProps> & React.RefAttributes<ViewInstance>
> = forwardRef<ViewInstance, MenuListProps>(function MenuList(inProps, forwarded) {
  const props = useDefaultProps({ props: inProps, name: 'MuiMenuList' });
  const {
    actions,
    autoFocus = false,
    autoFocusItem = false,
    disabledItemsFocusable = false,
    disableListWrap = false,
    variant = 'selectedMenu',
    focusSource: sourceProp,
    managedKeys,
    children,
    onKeyDown,
    onKeyDownCapture,
    onFocus,
    onBlur,
    component,
    scrollable: scrollableProp,
    scrollViewProps,
    tabIndex = -1,
    ...other
  } = props;
  const listDefaults = useDefaultProps({
    props: {
      component,
      onBlur,
      onFocus,
      onKeyDownCapture,
      focusable: other.focusable,
      scrollable: scrollableProp,
      scrollViewProps,
    },
    name: 'MuiList',
  });
  const scrollable = listDefaults.scrollable ?? false;
  const effectiveScrollProps = listDefaults.scrollViewProps;
  const focusReady = useContext(NativeMenuFocusReadiness);
  const inheritedSource = useContext(NativeMenuFocusSource),
    focusSource = sourceProp === undefined ? inheritedSource : sourceProp;
  const node = useRef<ViewInstance | null>(null),
    ref = useForkRef(node, forwarded),
    alive = useRef(true);
  const [, setTick] = useState(0),
    registryRef = useRef<NativeMenuRegistry | null>(null);
  if (!registryRef.current)
    registryRef.current = new NativeMenuRegistry(() => {
      if (alive.current) setTick((tick) => tick + 1);
    });
  const registry = registryRef.current;
  const [candidate, setCandidate] = useState<string | null>(null),
    [suppressInitialFocusVisible, setSuppressInitialFocusVisible] = useState(false);
  const activeId = resolveMenuActive(candidate, registry.ordered(), variant),
    activeRef = useRef(activeId);
  activeRef.current = activeId;
  const focused = useRef<{ id: string | null; element: ViewInstance } | null>(null),
    initial = useRef(false);
  const criteria = useRef<MenuTextCriteria>({
    keys: [],
    repeating: true,
    previousKeyMatched: true,
    lastTime: null,
  });
  useLayoutEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);
  useLayoutEffect(() => {
    registry.refreshOrder();
  });
  const getActive = useMenuEvent(() => {
    const items = registry.ordered(),
      id = resolveMenuActive(activeRef.current, items, variant);
    return items.find((item) => item.id === id) ?? null;
  });
  const focusItem = useMenuEvent((id: string, source: MenuFocusSource = null) => {
    const item = registry.items.get(id);
    if (!item || !menuFocusable(item)) return null;
    item.focus(source);
    focused.current = { id, element: item.element };
    setCandidate(id);
    return item.element;
  });
  const reportFocus = useMenuEvent((id: string, element: ViewInstance) => {
    focused.current = { id, element };
    setCandidate(id);
  });
  const reportBlur = useMenuEvent((id: string, element: ViewInstance) => {
    if (focused.current?.id === id && focused.current.element === element) focused.current = null;
  });
  const initialTarget = useMenuEvent((force = false) => {
    if (!focusReady || !node.current || (!force && initial.current)) return null;
    if (autoFocusItem) {
      const item = getActive();
      if (item) {
        const suppress =
          variant === 'menu' &&
          [...registry.items.values()].some((value) => value.selected) &&
          !item.selected &&
          focusSource == null;
        setSuppressInitialFocusVisible(suppress);
        if (suppress) nativeButtonModality.pointer();
        focusItem(item.id, focusSource);
        initial.current = true;
        return item.element;
      }
      if (!autoFocus) return null;
      setSuppressInitialFocusVisible(false);
      node.current.focus();
      focused.current = { id: null, element: node.current };
      return node.current;
    }
    if (!autoFocus) {
      setSuppressInitialFocusVisible(false);
      return null;
    }
    setSuppressInitialFocusVisible(false);
    node.current.focus();
    focused.current = { id: null, element: node.current };
    initial.current = true;
    return node.current;
  });
  useLayoutEffect(() => {
    if (!autoFocus && !autoFocusItem) {
      initial.current = false;
      setSuppressInitialFocusVisible(false);
    } else initialTarget();
  }, [activeId, autoFocus, autoFocusItem, initialTarget, focusReady]);
  useImperativeHandle(
    actions,
    () => ({
      focusInitialTarget() {
        if (!focusReady) return null;
        const current = focused.current;
        if (
          current?.element.isConnected &&
          (current.element === node.current || node.current?.contains(current.element))
        )
          return current.element;
        return initialTarget(true);
      },
      adjustStyleForScrollbar() {
        return node.current;
      },
    }),
    [initialTarget, focusReady],
  );
  const currentIndex = (items: NativeMenuRecord[]) => {
    const current = focused.current;
    if (current?.id == null && current?.element === node.current) return -1;
    const index = items.findIndex(
      (item) =>
        item.id === current?.id ||
        (current?.element &&
          (item.element === current.element || item.element.contains(current.element))),
    );
    return index >= 0 ? index : items.findIndex((item) => item.id === activeRef.current);
  };
  const move = (
    items: NativeMenuRecord[],
    index: number,
    direction: 'next' | 'previous',
    wrap: boolean,
    filter = menuFocusable,
  ) => {
    const item = nextMenuItem(items, index, direction, wrap, filter);
    return item ? focusItem(item.id, 'keyboard') : null;
  };
  const handleKeyDown = (native: Parameters<NonNullable<ViewProps['onKeyDown']>>[0]) => {
    const event = buttonKeyEvent(native);
    if (handledMenuKeys.has(native)) {
      onKeyDown?.(event);
      return;
    }
    // Native SyntheticEvents are pooled. Persist before tagging so a later
    // dispatch cannot reuse this object and inherit a prior owner.
    native.persist();
    handledMenuKeys.add(native);
    if (suppressInitialFocusVisible) setSuppressInitialFocusVisible(false);
    if (event.isComposing || event.isCanceled || typeof event.key !== 'string') {
      onKeyDown?.(event);
      return;
    }
    nativeButtonModality.keyboard();
    if ((event.ctrlKey || event.metaKey || event.altKey) && onKeyDown) {
      onKeyDown(event);
      return;
    }
    if (
      !event.defaultPrevented &&
      !event.altKey &&
      !event.shiftKey &&
      !event.ctrlKey &&
      !event.metaKey &&
      menuNavigationKeys.includes(event.key as any)
    ) {
      const items = registry.ordered();
      let index = currentIndex(items),
        direction: 'next' | 'previous' = 'next';
      const containerFocused =
        focused.current?.id == null && focused.current?.element === node.current;
      if (event.key === 'ArrowUp') {
        direction = 'previous';
        if (containerFocused) index = items.length;
      } else if (event.key === 'ArrowDown') {
        if (containerFocused) index = -1;
      } else if (event.key === 'Home') index = -1;
      else {
        direction = 'previous';
        index = items.length;
      }
      event.preventDefault();
      move(items, index, direction, !disableListWrap);
    }
    if (event.key.length === 1) {
      const state = criteria.current,
        key = event.key.toLowerCase(),
        now = performance.now();
      if (state.keys.length) {
        if (state.lastTime != null && now - state.lastTime > 500) {
          state.keys = [];
          state.repeating = true;
          state.previousKeyMatched = true;
        } else if (state.repeating && key !== state.keys[0]) state.repeating = false;
      }
      state.lastTime = now;
      state.keys.push(key);
      const items = registry.ordered(),
        current = focused.current,
        record = current?.id ? registry.items.get(current.id) : undefined;
      const keep = record && !state.repeating && menuTextMatches(record, state);
      if (
        state.previousKeyMatched &&
        (keep ||
          move(
            items,
            currentIndex(items),
            'next',
            true,
            (item) => menuFocusable(item) && menuTextMatches(item, state),
          ))
      )
        event.preventDefault();
      else state.previousKeyMatched = false;
    }
    onKeyDown?.(event);
  };
  const context = useMemo<NativeMenuContextValue>(
    () => ({
      registry,
      activeId,
      variant,
      disabledItemsFocusable,
      suppressInitialFocusVisible,
      focusSource,
      focusItem,
      reportFocus,
      reportBlur,
    }),
    [
      registry,
      activeId,
      variant,
      disabledItemsFocusable,
      suppressInitialFocusVisible,
      focusSource,
      focusItem,
      reportFocus,
      reportBlur,
    ],
  );
  const lastFocusTarget = useRef<ViewInstance | null>(null),
    lastBlurTarget = useRef<ViewInstance | null>(null);
  const handleFocus: NonNullable<ViewProps['onFocus']> = (event) => {
    const target = targetNode(event.target);
    if (target && node.current && (target === node.current || node.current.contains(target))) {
      if (lastFocusTarget.current === target) return;
      lastFocusTarget.current = target;
      lastBlurTarget.current = null;
      const item = registry
        .ordered()
        .find((value) => value.element === target || value.element.contains(target));
      focused.current = { id: item?.id ?? null, element: target };
      if (item) setCandidate(item.id);
    }
    listDefaults.onFocus?.(event);
  };
  const handleBlur: NonNullable<ViewProps['onBlur']> = (event) => {
    const target = targetNode(event.target);
    if (target) {
      if (lastBlurTarget.current === target) return;
      lastBlurTarget.current = target;
      if (lastFocusTarget.current === target) lastFocusTarget.current = null;
      if (focused.current?.element === target) focused.current = null;
    }
    listDefaults.onBlur?.(event);
  };
  const keys = useMemo(
    () => [...new Set([...menuNavigationKeys, ...(managedKeys ?? [])])],
    [managedKeys],
  );
  const safeScroll = { ...effectiveScrollProps };
  for (const key of [
    'onKeyDown',
    'onKeyUp',
    'onKeyDownCapture',
    'onKeyUpCapture',
    'onFocus',
    'onBlur',
    'onFocusCapture',
    'onBlurCapture',
    'role',
    'accessibilityRole',
    'tabIndex',
    'focusable',
  ] as const)
    delete safeScroll[key];
  return (
    <NativeMenuContext.Provider value={context}>
      <NativeCompositeKeys.Provider value={menuNavigationKeys}>
        <List
          {...other}
          ref={ref}
          component={listDefaults.component ?? NativeMenuListRoot}
          role={other.role ?? 'menu'}
          focusable={listDefaults.focusable ?? true}
          tabIndex={tabIndex}
          scrollable={scrollable}
          scrollViewProps={safeScroll}
          {...{
            managedKeys: keys,
            nativeScrollable: scrollable,
            nativeScrollProps: effectiveScrollProps,
            nativeRootProps: {
              ...other,
              role: other.role ?? 'menu',
              tabIndex,
              focusable: listDefaults.focusable ?? true,
            },
            onNativeFocus: handleFocus,
            onNativeBlur: handleBlur,
          }}
          onKeyDown={handleKeyDown}
          onKeyDownCapture={(event) => listDefaults.onKeyDownCapture?.(buttonKeyEvent(event))}
          onFocus={handleFocus}
          onBlur={handleBlur}
        >
          {children ?? null}
        </List>
      </NativeCompositeKeys.Provider>
    </NativeMenuContext.Provider>
  );
});
