import React, { forwardRef, useRef, useImperativeHandle } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  useWindowDimensions,
  type ViewInstance,
  type StyleProp,
  type ViewStyle,
  type KeyboardAvoidingViewProps,
} from 'react-native';
import {
  useDefaultProps,
  resolveSx,
  componentStyle,
  resolveSlotProps,
  diagnostic,
  type SxProps,
  type SlotProps,
  type Breakpoint,
} from '@altroo/mui-native-system';
import { useTheme, useComponentStyle } from './themeProvider';
import { Paper, type PaperProps, type BoxProps } from './layout';
import { Modal, type ModalProps, type NativeModalControlProps, type BackdropProps } from './modal';
import { useForkRef } from './utils';
import { Fade, type FadeProps } from './fade';
import type { TransitionProps } from './transitions/types';
export interface DialogPaperSlotPropsOverrides {}
export interface DialogContainerSlotPropsOverrides {}
export interface DialogBackdropSlotPropsOverrides {}
export interface DialogRootSlotPropsOverrides {}
export interface DialogTransitionSlotPropsOverrides {}
export interface DialogOwnerState extends NativeModalControlProps {
  fullWidth: boolean;
  fullScreen: boolean;
  maxWidth: Breakpoint | false;
}
type PaperSlotProps = PaperProps &
  DialogPaperSlotPropsOverrides & { ref?: React.Ref<ViewInstance> };
type ContainerProps = KeyboardAvoidingViewProps &
  DialogContainerSlotPropsOverrides & { ref?: React.Ref<ViewInstance>; sx?: SxProps };
export interface DialogSlots {
  root?: React.ComponentType<ModalProps>;
  paper?: React.ComponentType<PaperSlotProps>;
  container?: React.ComponentType<ContainerProps>;
  backdrop?: React.ComponentType<BackdropProps & React.RefAttributes<ViewInstance>>;
  transition?: React.ComponentType<FadeProps>;
}
export interface DialogProps extends BoxProps, NativeModalControlProps {
  fullWidth?: boolean;
  fullScreen?: boolean;
  maxWidth?: Breakpoint | false;
  transitionDuration?: TransitionProps['timeout'];
  slots?: DialogSlots;
  slotProps?: {
    transition?: SlotProps<
      Partial<FadeProps> & DialogTransitionSlotPropsOverrides,
      DialogOwnerState
    >;
    root?: SlotProps<
      Partial<ModalProps> & DialogRootSlotPropsOverrides & { ref?: React.Ref<ViewInstance> },
      DialogOwnerState
    >;
    paper?: SlotProps<PaperSlotProps, DialogOwnerState>;
    container?: SlotProps<ContainerProps, DialogOwnerState>;
    backdrop?: SlotProps<
      Partial<BackdropProps> & DialogBackdropSlotPropsOverrides,
      DialogOwnerState
    >;
  };
}
// KeyboardAvoidingView's class instance is not a native focus handle. Its
// public viewRef exposes the native root in the pinned React Native version.
interface NativeContainerProps extends ContainerProps {
  surface: React.ComponentType<ContainerProps>;
  nativeBaseStyle: StyleProp<ViewStyle>;
  ownerState: DialogOwnerState;
}
const NativeDialogContainer = forwardRef<ViewInstance, NativeContainerProps>(
  function NativeDialogContainer(
    { surface: Component, nativeBaseStyle, ownerState, sx, ...props },
    ref,
  ) {
    const target = useRef<any>(null);
    useImperativeHandle(
      ref,
      () => (Component === KeyboardAvoidingView ? target.current?.viewRef.current : target.current),
      [Component, props.behavior],
    );
    return (
      <Component
        {...props}
        {...(Component === KeyboardAvoidingView ? {} : { ownerState })}
        ref={target}
        style={[nativeBaseStyle, props.style]}
      />
    );
  },
);
function useDialogSlotStyle(
  ownerState: DialogOwnerState,
  keys: string[],
  sx: SxProps | undefined,
  base: Record<string, unknown> = {},
): StyleProp<ViewStyle> {
  const theme = useTheme();
  const { width } = useWindowDimensions();
  return componentStyle(theme, 'MuiDialog', ownerState as unknown as Record<string, unknown>, sx, {
    width,
    rootSlot: keys[0],
    overrideKeys: keys.slice(1),
    skipVariants: true,
    baseStyle: base,
  });
}
export const Dialog: React.ForwardRefExoticComponent<
  React.PropsWithoutRef<DialogProps> & React.RefAttributes<ViewInstance>
> = forwardRef<ViewInstance, DialogProps>(function Dialog(inProps, ref) {
  const props = useDefaultProps({ props: inProps, name: 'MuiDialog' });
  const theme = useTheme();
  const {
    open,
    onClose,
    fullWidth = false,
    fullScreen = false,
    maxWidth = 'sm' as Breakpoint,
    transitionDuration = {
      enter: theme.transitions.duration.enteringScreen,
      exit: theme.transitions.duration.leavingScreen,
    },
    children,
    sx,
    slots = {},
    slotProps = {},
    ...rootNative
  } = props;
  const { width } = useWindowDimensions();
  const availableWidth = Math.max(0, width - 48);
  const unit = theme.breakpoints.unit ?? 'px';
  const multiplier =
    unit === 'px'
      ? 1
      : unit === 'rem'
        ? (theme.cssRootFontSize ?? 16)
        : unit === 'em'
          ? (resolveSx(theme.typography.body1, theme, { mode: 'css' }).fontSize ?? 16)
          : undefined;
  const configuredWidth = maxWidth ? theme.breakpoints.values[maxWidth] : undefined;
  if (maxWidth && configuredWidth !== undefined && multiplier === undefined)
    diagnostic('breakpoint-unit', `Unsupported native Dialog breakpoint unit: ${unit}`);
  const scaledWidth =
    configuredWidth !== undefined && multiplier !== undefined
      ? configuredWidth * multiplier
      : availableWidth;
  const maximumWidth = Number.isFinite(scaledWidth)
    ? maxWidth === 'xs'
      ? Math.max(scaledWidth, 444)
      : Math.max(0, scaledWidth)
    : availableWidth;
  const ownerState = { ...props, fullScreen, fullWidth, maxWidth };
  const rootProps = resolveSlotProps(slotProps.root, ownerState) ?? {};
  const containerProps = resolveSlotProps(slotProps.container, ownerState) ?? {};
  const paperProps = resolveSlotProps(slotProps.paper, ownerState) ?? {};
  const backdropProps = resolveSlotProps(slotProps.backdrop, ownerState) ?? {};
  const transitionProps = resolveSlotProps(slotProps.transition, ownerState) ?? {};
  const rootRef = useForkRef(ref, rootProps.ref);
  const effectiveRootSx = Object.hasOwn(props, 'sx') ? sx : rootProps.sx;
  const effectiveRootStyle = Object.hasOwn(rootNative, 'style')
    ? rootNative.style
    : rootProps.style;
  const effectiveWindowProps = Object.hasOwn(props, 'nativeModalProps')
    ? props.nativeModalProps
    : rootProps.nativeModalProps;
  const rootStyle = useComponentStyle('MuiDialog', ownerState, effectiveRootSx);
  const containerStyle = useDialogSlotStyle(ownerState, ['container'], containerProps.sx, {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  });
  const paperStyle = useDialogSlotStyle(
    ownerState,
    [
      'paper',
      `paperWidth${String(maxWidth)[0].toUpperCase() + String(maxWidth).slice(1)}`,
      ...(fullWidth ? ['paperFullWidth'] : []),
      ...(fullScreen ? ['paperFullScreen'] : []),
    ],
    paperProps.sx,
  );
  const Root = slots.root ?? Modal,
    Container = slots.container ?? KeyboardAvoidingView,
    Transition = slots.transition ?? Fade,
    // A resolved slot has its declared slot props rather than a public generic
    // overload; conditional ownerState stays limited to authored custom slots.
    PaperSlot = slots.paper ?? (Paper as React.ComponentType<PaperSlotProps>);
  const { sx: containerSx, style: containerNativeStyle, ...containerRest } = containerProps;
  const { style: paperSlotStyle, ...paperRest } = paperProps;
  return (
    <Root
      open={open}
      onClose={onClose}
      closeAfterTransition
      slots={slots.backdrop ? { backdrop: slots.backdrop } : undefined}
      slotProps={{
        backdrop: {
          transitionDuration,
          accessibilityLabel: 'Dismiss dialog',
          accessibilityRole: 'button',
          accessible: true,
          ...backdropProps,
        },
      }}
      {...rootProps}
      {...rootNative}
      sx={effectiveRootSx}
      nativeModalProps={{
        transparent: !fullScreen,
        animationType: 'none',
        ...effectiveWindowProps,
      }}
      {...(Root === Modal ? {} : { ownerState })}
      ref={rootRef}
      style={[rootStyle, effectiveRootStyle]}
    >
      <Transition
        appear
        in={open}
        timeout={transitionDuration}
        {...transitionProps}
        {...(Transition === Fade ? {} : { ownerState })}
      >
        <NativeDialogContainer
          pointerEvents="box-none"
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          {...containerRest}
          surface={Container}
          ownerState={ownerState}
          nativeBaseStyle={containerStyle}
          style={containerNativeStyle}
        >
          <PaperSlot
            {...paperRest}
            {...(PaperSlot === Paper ? {} : { ownerState })}
            sx={paperProps.sx}
            style={[
              {
                margin: fullScreen ? 0 : 24,
                width: fullScreen ? '100%' : fullWidth ? availableWidth : undefined,
                minWidth: fullScreen ? undefined : Math.min(280, availableWidth, maximumWidth),
                maxWidth: fullScreen ? undefined : Math.min(availableWidth, maximumWidth),
                ...(fullScreen ? { borderRadius: 0 } : {}),
                alignSelf: fullScreen ? 'stretch' : undefined,
                flex: fullScreen ? 1 : undefined,
              },
              paperStyle,
              paperSlotStyle,
            ]}
          >
            {children}
          </PaperSlot>
        </NativeDialogContainer>
      </Transition>
    </Root>
  );
});
