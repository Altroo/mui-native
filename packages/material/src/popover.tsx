import React, { createContext, forwardRef, useContext, useImperativeHandle, useMemo } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  type ViewInstance,
  type StyleProp,
} from 'react-native';
import {
  useDefaultProps,
  resolveSlotProps,
  resolveSx,
  diagnostic,
  NativeTextScope,
  type NativeStyle,
  type SlotProps,
  type SxProps,
} from '@altroo/mui-native-system';
import { InteractiveView } from '@altroo/mui-native-host';
import { useTheme, useComponentStyle } from './themeProvider';
import { Modal, type ModalProps, type ModalRootProps, type BackdropProps } from './modal';
import { Paper, type PaperProps } from './layout';
import { Grow, type GrowProps } from './grow';
import type { TransitionProps } from './transitions/types';
import { useForkRef } from './utils';
import { NativeTransitionReadiness } from './transitionReadiness';
import { usePopoverPosition } from './usePopoverPosition';
import type { NativePopoverAnchor } from './popoverMeasurement';
import type { PopoverOrigin, PopoverPosition, PopoverReference } from './popoverGeometry';
export type { PopoverOrigin, PopoverPosition, PopoverReference } from './popoverGeometry';
export type { PopoverVirtualElement, NativePopoverAnchor } from './popoverMeasurement';
export { getOffsetTop, getOffsetLeft } from './popoverGeometry';
export interface PopoverRootSlotPropsOverrides {}
export interface PopoverPaperSlotPropsOverrides {}
export interface PopoverTransitionSlotPropsOverrides {}
export interface PopoverBackdropSlotPropsOverrides {}
export interface PopoverActions {
  updatePosition(): void;
}
export interface PopoverRootProps extends ModalProps {
  ref?: React.Ref<ViewInstance>;
  ownerState?: PopoverOwnerState;
}
export interface PopoverPaperProps extends PaperProps {
  ref?: React.Ref<ViewInstance>;
  ownerState?: PopoverOwnerState;
}
export interface PopoverSlots {
  root?: React.ComponentType<PopoverRootProps>;
  paper?: React.ComponentType<PopoverPaperProps & React.RefAttributes<ViewInstance>>;
  transition?: React.ComponentType<TransitionProps & { children: React.ReactElement<any> }> & {
    muiSupportAuto?: boolean;
  };
  backdrop?: React.ComponentType<BackdropProps & React.RefAttributes<ViewInstance>>;
}
export interface PopoverProps extends Omit<ModalProps, 'children' | 'slots' | 'slotProps'> {
  children?: React.ReactNode;
  ref?: React.Ref<ViewInstance>;
  action?: React.Ref<PopoverActions>;
  anchorEl?: NativePopoverAnchor | null | (() => NativePopoverAnchor | null);
  anchorOrigin?: PopoverOrigin;
  anchorPosition?: PopoverPosition;
  anchorReference?: PopoverReference;
  transformOrigin?: PopoverOrigin;
  elevation?: number;
  marginThreshold?: number | null;
  transitionDuration?: GrowProps['timeout'];
  slots?: PopoverSlots;
  slotProps?: {
    root?: SlotProps<Partial<PopoverRootProps> & PopoverRootSlotPropsOverrides, PopoverOwnerState>;
    paper?: SlotProps<
      PopoverPaperProps & PopoverPaperSlotPropsOverrides & React.RefAttributes<ViewInstance>,
      PopoverOwnerState
    >;
    transition?: SlotProps<
      Partial<TransitionProps> &
        PopoverTransitionSlotPropsOverrides &
        React.RefAttributes<ViewInstance>,
      PopoverOwnerState
    >;
    backdrop?: SlotProps<
      Partial<BackdropProps> &
        PopoverBackdropSlotPropsOverrides &
        React.RefAttributes<ViewInstance>,
      PopoverOwnerState
    >;
  };
}
export interface PopoverOwnerState extends Omit<PopoverProps, 'slots' | 'slotProps'> {
  anchorOrigin: PopoverOrigin;
  anchorReference: PopoverReference;
  transformOrigin: PopoverOrigin;
  elevation: number;
  marginThreshold: number | null;
  transitionDuration: GrowProps['timeout'];
}
export type PopoverSlotsAndSlotProps = Pick<PopoverProps, 'slots' | 'slotProps'>;
const UpdatePosition = createContext<() => void>(() => {});
// Physical coordinates have an LTR containing block; content retains authored direction.
const PopoverCoordinates = createContext<
  | {
      surface?: React.ComponentType<ModalRootProps>;
      direction: 'ltr' | 'rtl';
    }
  | undefined
>(undefined);
const coordinateStyle: NativeStyle = { direction: 'ltr' };
function authoredRootStyle(style: StyleProp<NativeStyle>): StyleProp<NativeStyle> {
  return style === coordinateStyle
    ? undefined
    : Array.isArray(style)
      ? style.map(authoredRootStyle)
      : style;
}
const CoordinateSurface = forwardRef<ViewInstance, ModalRootProps>(function CoordinateSurface(
  { style, ownerState, ...props },
  ref,
) {
  const coordinates = useContext(PopoverCoordinates),
    theme = useTheme();
  const Surface = coordinates?.surface ?? InteractiveView;
  const authored = StyleSheet.flatten(style);
  const direction =
    authored?.direction === 'rtl' || authored?.direction === 'ltr'
      ? authored.direction
      : (coordinates?.direction ?? theme.direction);
  return (
    <PopoverCoordinates.Provider value={{ ...coordinates, direction }}>
      <Surface
        {...props}
        {...(Surface === View || Surface === InteractiveView ? {} : { ownerState })}
        ref={ref}
        style={[style, coordinateStyle]}
      />
    </PopoverCoordinates.Provider>
  );
});
function ScrollContent({ children }: { children?: React.ReactNode }) {
  const theme = useTheme(),
    update = useContext(UpdatePosition);
  return (
    <NativeTextScope theme={theme} content={children}>
      {(_style, content) => (
        <ScrollView
          style={{ flexGrow: 0, flexShrink: 1 }}
          horizontal={false}
          keyboardShouldPersistTaps="handled"
          onContentSizeChange={update}
        >
          {content}
        </ScrollView>
      )}
    </NativeTextScope>
  );
}
export const PopoverRoot: React.ForwardRefExoticComponent<
  React.PropsWithoutRef<PopoverRootProps> & React.RefAttributes<ViewInstance>
> = forwardRef<ViewInstance, PopoverRootProps>(function PopoverRoot(
  { ownerState, style, sx, ...props },
  ref,
) {
  const computed = useComponentStyle('MuiPopover', ownerState ?? props, sx);
  const coordinates = useContext(PopoverCoordinates),
    theme = useTheme();
  const modalDefaults = useDefaultProps({ props, name: 'MuiModal' });
  const surface = modalDefaults.slots?.root ?? modalDefaults.component ?? InteractiveView;
  return (
    <PopoverCoordinates.Provider
      value={{ ...coordinates, direction: coordinates?.direction ?? theme.direction, surface }}
    >
      <Modal
        {...props}
        ref={ref}
        sx={sx}
        slots={{ ...props.slots, root: CoordinateSurface }}
        style={[computed, authoredRootStyle(style)]}
      />
    </PopoverCoordinates.Provider>
  );
});
export const PopoverPaper: React.ForwardRefExoticComponent<
  React.PropsWithoutRef<PopoverPaperProps> & React.RefAttributes<ViewInstance>
> = forwardRef<ViewInstance, PopoverPaperProps>(function PopoverPaper(
  { ownerState, style, sx, children, ...props },
  ref,
) {
  const theme = useTheme(),
    { width, height } = useWindowDimensions();
  const coordinates = useContext(PopoverCoordinates);
  const config = theme.components.MuiPopover;
  const raw = typeof config === 'object' ? config.styleOverrides?.paper : undefined;
  const override =
    typeof raw === 'function'
      ? raw({ theme, ownerState: (ownerState ?? props) as unknown as Record<string, unknown> })
      : raw;
  const computed = [
    resolveSx(
      [
        {
          direction: coordinates?.direction ?? theme.direction,
          position: 'absolute',
          minWidth: 16,
          minHeight: 16,
          maxWidth: Math.max(0, width - 32),
          maxHeight: Math.max(0, height - 32),
        },
        ...(Array.isArray(override) ? override : [override]),
      ] as SxProps,
      theme,
      { width, mode: 'css' },
    ),
    resolveSx(sx, theme, { width }),
  ];
  return (
    <Paper {...props} ref={ref} sx={sx} style={[computed, style]}>
      <ScrollContent>{children}</ScrollContent>
    </Paper>
  );
});
interface PositionedPaperProps extends PopoverPaperProps {
  surface: React.ComponentType<PopoverPaperProps & React.RefAttributes<ViewInstance>>;
  nativePosition: StyleProp<NativeStyle>;
  nativeHidden: boolean;
}
const PositionedPaper = forwardRef<ViewInstance, PositionedPaperProps>(function PositionedPaper(
  { surface: Component, nativePosition, nativeHidden, ownerState, ...props },
  ref,
) {
  return (
    <Component
      {...props}
      {...(Component === View ? {} : { ownerState })}
      ref={ref}
      style={[props.style, nativePosition, nativeHidden && { opacity: 0 }]}
      pointerEvents={nativeHidden ? 'none' : props.pointerEvents}
      accessibilityElementsHidden={nativeHidden || props.accessibilityElementsHidden}
      importantForAccessibility={
        nativeHidden ? 'no-hide-descendants' : props.importantForAccessibility
      }
    />
  );
});
export const Popover: React.ForwardRefExoticComponent<
  React.PropsWithoutRef<PopoverProps> & React.RefAttributes<ViewInstance>
> = forwardRef<ViewInstance, PopoverProps>(function Popover(inProps, ref) {
  const props = useDefaultProps({ props: inProps, name: 'MuiPopover' });
  const {
    action,
    anchorEl,
    anchorOrigin = { vertical: 'top', horizontal: 'left' },
    anchorPosition,
    anchorReference = 'anchorEl',
    children,
    disableAutoFocus = false,
    elevation = 8,
    marginThreshold = 16,
    transformOrigin = { vertical: 'top', horizontal: 'left' },
    transitionDuration = 'auto',
    open,
    slots = {},
    slotProps = {},
    ...other
  } = props;
  const { width, height } = useWindowDimensions();
  const theme = useTheme();
  const ownerState = {
    ...props,
    anchorOrigin,
    anchorReference,
    elevation,
    marginThreshold,
    transformOrigin,
    transitionDuration,
  };
  const rootSlot = resolveSlotProps(slotProps.root, ownerState) ?? {},
    paperSlot = resolveSlotProps(slotProps.paper, ownerState) ?? {},
    transitionSlot = resolveSlotProps(slotProps.transition, ownerState) ?? {},
    backdropSlot = resolveSlotProps(slotProps.backdrop, ownerState) ?? {};
  // React reconciliation keys belong on JSX, outside the forwarded slot props.
  const { key: transitionKey, ...transitionProps } = transitionSlot as GrowProps & {
    key?: React.Key;
  };
  const Root = slots.root ?? PopoverRoot,
    PaperSlot = slots.paper ?? PopoverPaper,
    Transition = slots.transition ?? Grow;
  const mergedRoot = {
    open,
    slots: { backdrop: slots.backdrop },
    slotProps: { backdrop: { invisible: true, ...backdropSlot } },
    ...other,
    ...rootSlot,
    style: [other.style, rootSlot.style],
    disableAutoFocus,
  };
  const component = rootSlot.component || other.component;
  const identity = useMemo(
    () => Symbol('popover-surface'),
    [
      Root,
      component,
      (rootSlot as any).key,
      PaperSlot,
      Transition,
      transitionKey,
      paperSlot.component,
      (paperSlot as any).key,
    ],
  );
  const position = usePopoverPosition({
    open,
    identity,
    anchorEl,
    anchorOrigin,
    transformOrigin,
    anchorReference,
    anchorPosition,
    marginThreshold,
    viewport: { width, height },
  });
  const rootRef = useForkRef(position.root, ref, rootSlot.ref),
    paperRef = useForkRef(position.paper, paperSlot.ref);
  useImperativeHandle<PopoverActions | null, PopoverActions | null>(
    action,
    () => (open ? { updatePosition: position.request } : null),
    [open, position.request],
  );
  const {
    style: rootNativeStyle,
    onLayout: rootLayout,
    onShow: rootShow,
    ...rootRest
  } = mergedRoot;
  const { style: paperStyle, onLayout: paperLayout, ...paperRest } = paperSlot;
  const onEntering: TransitionProps['onEntering'] = (node, appearing) => {
    transitionSlot.onEntering?.(node, appearing);
    position.request();
  };
  const onExited: TransitionProps['onExited'] = (node) => {
    transitionSlot.onExited?.(node);
    position.exited(position.cycle);
  };
  const duration =
    transitionDuration === 'auto' && !Transition.muiSupportAuto ? undefined : transitionDuration;
  const Renderer = Transition as React.ComponentType<GrowProps>;
  const coordinates = position.placement;
  const nativePosition: NativeStyle = coordinates
    ? {
        ...(coordinates.top == null ? {} : { top: coordinates.top }),
        ...(coordinates.left == null ? {} : { left: coordinates.left }),
        transformOrigin: [coordinates.origin.horizontal, coordinates.origin.vertical, 0],
      }
    : {};
  const {
    container: unsupportedContainer,
    disableScrollLock: unsupportedScroll,
    classes: unsupportedClasses,
    className: unsupportedClassName,
    ...nativeRoot
  } = rootRest as typeof rootRest & Record<string, unknown>;
  if (unsupportedContainer != null)
    diagnostic('popover-container', 'DOM container portals are not a native Popover target.');
  if (unsupportedScroll === true)
    diagnostic('popover-scroll', 'Native Popover does not implement browser body scroll locking.');
  if (unsupportedClasses || unsupportedClassName)
    diagnostic(
      'popover-classes',
      'Use native sx/styles and slots instead of browser Popover classes.',
    );
  return (
    <PopoverCoordinates.Provider value={{ direction: theme.direction }}>
      <NativeTransitionReadiness.Provider value={position.positioned || !open}>
        <UpdatePosition.Provider value={position.request}>
          <Root
            {...nativeRoot}
            component={component}
            {...(Root === View
              ? {}
              : { ownerState: { ...(rootSlot.ownerState ?? {}), ...ownerState } })}
            ref={rootRef}
            style={[rootNativeStyle, coordinateStyle]}
            onLayout={(event) => {
              rootLayout?.(event);
              position.request();
            }}
            onShow={(event) => {
              rootShow?.(event);
              position.request();
            }}
          >
            <Renderer
              key={transitionKey}
              appear
              in={open}
              {...transitionProps}
              onLayout={(event) => {
                if (Object.hasOwn(transitionSlot, 'onLayout')) transitionSlot.onLayout?.(event);
                else paperLayout?.(event);
                position.onPaperLayout(event, identity);
              }}
              onEntering={onEntering}
              onExited={onExited}
              timeout={duration}
            >
              <PositionedPaper
                elevation={elevation}
                {...paperRest}
                surface={PaperSlot}
                ownerState={{ ...(paperSlot.ownerState ?? {}), ...ownerState }}
                ref={paperRef}
                style={paperStyle}
                nativePosition={nativePosition}
                nativeHidden={!position.positioned}
                onLayout={(event) => {
                  paperLayout?.(event);
                  position.onPaperLayout(event, identity);
                }}
              >
                {children}
              </PositionedPaper>
            </Renderer>
          </Root>
        </UpdatePosition.Provider>
      </NativeTransitionReadiness.Provider>
    </PopoverCoordinates.Provider>
  );
});
