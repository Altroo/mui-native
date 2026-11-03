/* Component composition adapts MIT-licensed Material UI 9.5.0 Popper.
 * Copyright (c) 2014 Call-Em-All. See NOTICE and upstream/reuse.json.
 * Native adaptation copyright (c) 2026 Altroo and contributors.
 * SPDX-License-Identifier: MIT
 */
import React, { forwardRef, useCallback, useContext, useLayoutEffect, useState } from 'react';
import { View, StyleSheet, type ViewInstance, type StyleProp } from 'react-native';
import { InteractiveView, type InteractiveViewProps } from '@altroo/mui-native-host';
import {
  useDefaultProps,
  useRtl,
  resolveSlotProps,
  NativeTextScope,
  type NativeStyle,
  type SlotProps,
  type SxProps,
} from '@altroo/mui-native-system';
import { Portal, type NativePortalContainer } from './portal';
import { useTheme, useComponentStyle } from './themeProvider';
import { useForkRef } from './utils';
import { NativeOverlayReadiness } from './nativeOverlayReadiness';
import { useNativePopper } from './useNativePopper';
import type {
  NativePopperAnchor,
  NativePopperInstance,
  NativePopperModifier,
  NativePopperOptions,
  PopperPlacementType,
} from './nativePopper/types';
export type {
  NativePopperAnchor,
  NativePopperInstance,
  NativePopperModifier,
  NativePopperOptions,
  NativePopperState,
  NativePopperBoundary,
  NativePopperRect,
  NativePopperOverflowOptions,
  PopperPlacementType,
  PopperVirtualElement,
} from './nativePopper/types';
export interface PopperClasses {
  root: string;
}
export type PopperClassKey = keyof PopperClasses;
const globalStates = new Set([
  'active',
  'checked',
  'completed',
  'disabled',
  'error',
  'expanded',
  'focused',
  'focusVisible',
  'open',
  'readOnly',
  'required',
  'selected',
]);
export const getPopperUtilityClass = (slot: string) =>
  `${globalStates.has(slot) ? 'Mui' : 'MuiPopper'}-${slot}`;
export const popperClasses: PopperClasses = { root: getPopperUtilityClass('root') };
export interface PopperTransitionProps {
  in: boolean;
  onEnter: () => void;
  onExited: () => void;
}
export interface PopperChildrenProps {
  placement: PopperPlacementType;
  TransitionProps?: PopperTransitionProps;
}
export interface PopperRootSlotPropsOverrides {}
export interface PopperRootProps extends Omit<InteractiveViewProps, 'children' | 'style'> {
  children?: React.ReactNode;
  style?: StyleProp<NativeStyle>;
  sx?: SxProps;
  className?: string;
  ownerState?: PopperOwnerState;
  ref?: React.Ref<ViewInstance>;
}
export interface PopperSlots {
  root?: React.ComponentType<PopperRootProps>;
}
export interface PopperOwnProps {
  anchorEl?: NativePopperAnchor | null | (() => NativePopperAnchor | null);
  children?: React.ReactNode | ((props: PopperChildrenProps) => React.ReactNode);
  container?: NativePortalContainer;
  direction?: 'ltr' | 'rtl';
  disablePortal?: boolean;
  keepMounted?: boolean;
  modifiers?: NativePopperModifier[];
  open: boolean;
  placement?: PopperPlacementType;
  popperOptions?: Partial<NativePopperOptions>;
  popperRef?: React.Ref<NativePopperInstance>;
  slots?: PopperSlots;
  slotProps?: {
    root?: SlotProps<Partial<PopperRootProps> & PopperRootSlotPropsOverrides, PopperOwnerState>;
  };
  transition?: boolean;
}
export interface NativePopperProps
  extends Omit<PopperRootProps, 'children' | 'ownerState'>,
    PopperOwnProps {
  component?: React.ComponentType<any>;
  classes?: Partial<PopperClasses>;
}
export type PopperProps<
  Root extends React.ComponentType<any> = React.ComponentType<PopperRootProps>,
> = NativePopperProps & Omit<React.ComponentPropsWithRef<Root>, keyof NativePopperProps>;
export interface PopperTypeMap<
  AdditionalProps = {},
  Root extends React.ComponentType<any> = React.ComponentType<PopperRootProps>,
> {
  props: NativePopperProps & AdditionalProps;
  defaultComponent: Root;
}
interface NativePopperComponent {
  <Root extends React.ComponentType<any>>(
    props: PopperProps<Root> & { component: Root },
  ): React.ReactNode;
  (props: Omit<PopperProps, 'component'> & { component?: undefined }): React.ReactNode;
  displayName?: string;
}
export type PopperOwnerState = PopperOwnProps & {
  open: boolean;
  placement: PopperPlacementType;
  direction: 'ltr' | 'rtl';
};
const DefaultRoot = forwardRef<ViewInstance, PopperRootProps>(function DefaultRoot(
  { ownerState, sx, ...props },
  ref,
) {
  return <InteractiveView {...props} ref={ref} />;
});
// Native measurements target this physical parent. Keeping it uncollapsed and free
// of borders/padding avoids applying authored ancestor offsets twice in inline mode.
const positioningSurface = {
  position: 'absolute',
  left: 0,
  top: 0,
  right: 0,
  bottom: 0,
  overflow: 'visible',
  borderWidth: 0,
  padding: 0,
  direction: 'ltr',
} as const;
interface ContentProps extends Omit<PopperProps, 'component'> {
  direction: 'ltr' | 'rtl';
  engineOpen: boolean;
  transitionProps?: PopperTransitionProps;
  forwarded: React.ForwardedRef<ViewInstance>;
  namedStyle: StyleProp<NativeStyle>;
  onLayer: (value: number) => void;
}
function PopperContent({
  anchorEl,
  children,
  direction,
  disablePortal = false,
  engineOpen,
  placement = 'bottom',
  modifiers,
  popperOptions,
  popperRef,
  slots = {},
  slotProps = {},
  transitionProps,
  forwarded,
  namedStyle,
  onLayer,
  classes,
  className,
  sx,
  style,
  open,
  keepMounted,
  transition,
  container,
  ...other
}: ContentProps) {
  const theme = useTheme(),
    [node, setNode] = useState<ViewInstance | null>(null);
  const position = useNativePopper({
    anchorEl,
    root: node,
    open: engineOpen,
    disablePortal,
    placement,
    direction,
    modifiers,
    popperOptions,
    popperRef,
  });
  const ownerState: PopperOwnerState = {
    anchorEl,
    children,
    direction,
    disablePortal,
    open: engineOpen,
    placement,
    modifiers,
    popperOptions,
    popperRef,
    slots,
    slotProps,
  };
  const root = resolveSlotProps(slotProps.root, ownerState) ?? {},
    Root = slots.root ?? DefaultRoot;
  const slotStyle = useComponentStyle('', ownerState, root.sx),
    handleRoot = useCallback((value: ViewInstance | null) => setNode(value), []),
    ref = useForkRef(handleRoot, forwarded, root.ref);
  // Gate child interaction while geometry is pending. Transition enter callbacks must
  // still run: they activate the engine, so gating those callbacks would deadlock entry.
  const inheritedReady = useContext(NativeOverlayReadiness),
    ready = inheritedReady && position.positioned;
  const hidden = !ready;
  const rootStyle: StyleProp<NativeStyle> = [
    { position: 'absolute', left: 0, top: 0, direction: 'ltr' },
    namedStyle,
    style,
    slotStyle,
    root.style,
    position.style,
    !open && keepMounted && (!transition || !engineOpen) ? { display: 'none' } : undefined,
    hidden ? { opacity: 0 } : undefined,
  ];
  const layer = StyleSheet.flatten(rootStyle)?.zIndex ?? 0;
  useLayoutEffect(() => {
    onLayer(typeof layer === 'number' && Number.isFinite(layer) ? layer : 0);
  }, [layer, onLayer]);
  const onLayout = (event: Parameters<NonNullable<PopperRootProps['onLayout']>>[0]) => {
    (root.onLayout ?? other.onLayout)?.(event);
    position.onLayout();
  };
  const childProps: PopperChildrenProps = {
    placement: position.placement,
    ...(transitionProps ? { TransitionProps: transitionProps } : {}),
  };
  const content = typeof children === 'function' ? children(childProps) : children;
  const resolvedClass = [popperClasses.root, classes?.root, className, root.className]
    .filter(Boolean)
    .join(' ');
  const element = (
    <NativeTextScope theme={theme} style={rootStyle} content={content}>
      {(textStyle, content) => (
        <Root
          role="tooltip"
          focusable={false}
          tabIndex={-1}
          {...other}
          {...root}
          className={resolvedClass}
          ownerState={ownerState}
          ref={ref}
          collapsable={false}
          style={textStyle}
          onLayout={onLayout}
          accessibilityElementsHidden={
            hidden ? true : (root.accessibilityElementsHidden ?? other.accessibilityElementsHidden)
          }
          importantForAccessibility={
            hidden
              ? 'no-hide-descendants'
              : (root.importantForAccessibility ?? other.importantForAccessibility)
          }
          pointerEvents={hidden ? 'none' : (root.pointerEvents ?? other.pointerEvents)}
        >
          <NativeOverlayReadiness.Provider value={ready}>{content}</NativeOverlayReadiness.Provider>
        </Root>
      )}
    </NativeTextScope>
  );
  return (
    <>
      {element}
      {position.observer}
    </>
  );
}
function PopperImplementation({
  direction = 'ltr',
  open,
  keepMounted = false,
  transition = false,
  disablePortal = false,
  forwarded,
  namedStyle,
  ...props
}: Omit<PopperProps, 'component'> & {
  forwarded: React.ForwardedRef<ViewInstance>;
  namedStyle: StyleProp<NativeStyle>;
}) {
  const [exited, setExited] = useState(true),
    [layer, setLayer] = useState(0),
    parentReady = useContext(NativeOverlayReadiness);
  const onEnter = useCallback(() => setExited(false), []),
    onExited = useCallback(() => setExited(true), []);
  if (!keepMounted && !open && (!transition || exited)) return null;
  const engineOpen = transition ? !exited : open,
    active = parentReady && (open || (transition && !exited));
  const transitionProps = transition ? { in: open, onEnter, onExited } : undefined;
  const content = (
    <PopperContent
      {...props}
      open={open}
      keepMounted={keepMounted}
      transition={transition}
      direction={direction}
      disablePortal={disablePortal}
      engineOpen={engineOpen}
      transitionProps={transitionProps}
      forwarded={forwarded}
      namedStyle={namedStyle}
      onLayer={setLayer}
    />
  );
  return (
    <NativeOverlayReadiness.Provider value={active}>
      <Portal disablePortal={disablePortal} container={props.container} layer={layer}>
        {disablePortal ? (
          <View
            collapsable={false}
            pointerEvents="box-none"
            style={[positioningSurface, { zIndex: layer }]}
          >
            {content}
          </View>
        ) : (
          content
        )}
      </Portal>
    </NativeOverlayReadiness.Provider>
  );
}
export const Popper: NativePopperComponent = forwardRef<ViewInstance, PopperProps>(
  function Popper(inProps, ref) {
    const props = useDefaultProps({ props: inProps, name: 'MuiPopper' }),
      rtl = useRtl(),
      direction = props.direction ?? (rtl ? 'rtl' : 'ltr');
    const namedStyle = useComponentStyle('MuiPopper', props, props.sx);
    const { component: Component, ...other } = props;
    if (Component) {
      if (typeof Component === 'string')
        throw new Error('MUI Native: Popper component must be a native React component.');
      const {
        anchorEl,
        container,
        disablePortal,
        keepMounted,
        modifiers,
        open,
        placement,
        popperOptions,
        popperRef,
        transition,
        slots,
        slotProps,
        sx: consumedSx,
        ...forwarded
      } = other;
      return (
        <Component
          direction={direction}
          slots={slots}
          slotProps={slotProps}
          anchorEl={anchorEl}
          container={container}
          disablePortal={disablePortal}
          keepMounted={keepMounted}
          modifiers={modifiers}
          open={open}
          placement={placement}
          popperOptions={popperOptions}
          popperRef={popperRef}
          transition={transition}
          {...forwarded}
          className={props.className}
          style={[namedStyle, props.style]}
          ref={ref}
        />
      );
    }
    return (
      <PopperImplementation
        {...other}
        direction={direction}
        forwarded={ref}
        namedStyle={namedStyle}
      />
    );
  },
) as NativePopperComponent;
