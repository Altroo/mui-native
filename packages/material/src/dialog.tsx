import React, { forwardRef, useRef, useImperativeHandle } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  useWindowDimensions,
  type ViewInstance,
  type ViewProps,
  type StyleProp,
  type ViewStyle,
  type KeyboardAvoidingViewProps,
} from 'react-native';
import {
  useDefaultProps,
  resolveSx,
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
export interface DialogPaperSlotPropsOverrides {}
export interface DialogContainerSlotPropsOverrides {}
export interface DialogBackdropSlotPropsOverrides {}
export interface DialogRootSlotPropsOverrides {}
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
}
export interface DialogProps extends BoxProps, NativeModalControlProps {
  fullWidth?: boolean;
  fullScreen?: boolean;
  maxWidth?: Breakpoint | false;
  slots?: DialogSlots;
  slotProps?: {
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
const NativeDialogContainer = forwardRef<ViewInstance, ContainerProps>(
  function NativeDialogContainer({ sx, ...props }, ref) {
    const keyboard = useRef<React.ComponentRef<typeof KeyboardAvoidingView> | null>(null);
    useImperativeHandle(ref, () => keyboard.current?.viewRef.current as ViewInstance, [
      props.behavior,
    ]);
    return <KeyboardAvoidingView {...props} ref={keyboard} />;
  },
);
function sxList(...values: Array<SxProps | undefined>): SxProps {
  return values.flatMap((value) => (Array.isArray(value) ? value : [value])) as SxProps;
}
function useDialogSlotStyle(
  ownerState: DialogOwnerState,
  keys: string[],
  sx: SxProps | undefined,
  base: Record<string, unknown> = {},
): StyleProp<ViewStyle> {
  const theme = useTheme();
  const { width } = useWindowDimensions();
  const config = theme.components.MuiDialog;
  const overrides = typeof config === 'object' ? config.styleOverrides : undefined;
  const styles = keys.map((key) => {
    const value = overrides?.[key];
    return typeof value === 'function'
      ? value({ theme, ownerState: ownerState as unknown as Record<string, unknown> })
      : value;
  });
  return [
    resolveSx(sxList(base, ...styles), theme, { width, mode: 'css' }),
    resolveSx(sx, theme, { width }),
  ];
}
export const Dialog: React.ForwardRefExoticComponent<
  React.PropsWithoutRef<DialogProps> & React.RefAttributes<ViewInstance>
> = forwardRef<ViewInstance, DialogProps>(function Dialog(inProps, ref) {
  const props = useDefaultProps({ props: inProps, name: 'MuiDialog' });
  const {
    open,
    onClose,
    fullWidth = false,
    fullScreen = false,
    maxWidth = 'sm' as Breakpoint,
    children,
    sx,
    slots = {},
    slotProps = {},
    ...rootNative
  } = props;
  const theme = useTheme();
  const { width } = useWindowDimensions();
  const availableWidth = Math.max(0, width - 48);
  const unit = theme.breakpoints.unit ?? 'px';
  const multiplier =
    unit === 'px'
      ? 1
      : unit === 'rem'
        ? theme.typography.htmlFontSize
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
    Container = slots.container ?? NativeDialogContainer,
    PaperSlot = slots.paper ?? Paper;
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
        animationType: 'fade',
        ...effectiveWindowProps,
      }}
      {...(Root === Modal ? {} : { ownerState })}
      ref={rootRef}
      style={[rootStyle, effectiveRootStyle]}
    >
      <Container
        pointerEvents="box-none"
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        {...containerRest}
        {...(Container === NativeDialogContainer ? {} : { ownerState })}
        style={[containerStyle, containerNativeStyle]}
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
      </Container>
    </Root>
  );
});
