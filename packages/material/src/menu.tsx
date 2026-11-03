import React, { forwardRef, useContext, useRef } from 'react';
import { useWindowDimensions, type ViewInstance, type StyleProp } from 'react-native';
import {
  useDefaultProps,
  useRtl,
  resolveSlotProps,
  resolveSx,
  diagnostic,
  type NativeStyle,
  type SlotProps,
  type SxProps,
} from '@altroo/mui-native-system';
import {
  Popover,
  PopoverPaper,
  type PopoverProps,
  type PopoverRootProps,
  type PopoverPaperProps,
  type PopoverSlots,
  type PopoverOwnerState,
} from './popover';
import { MenuList, type MenuListProps, type MenuListActions } from './menuList';
import type { BackdropProps, ModalCloseEvent } from './modal';
import type { TransitionProps } from './transitions/types';
import { useTheme, useComponentStyle } from './themeProvider';
import { NativeOverlayReadiness } from './nativeOverlayReadiness';
import { NativeTransitionReadiness } from './transitionReadiness';
import { NativeMenuFocusReadiness } from './menuContext';
import { useForkRef } from './utils';
import type { ButtonBaseKeyEvent } from './nativeButtonEvents';
export interface MenuClasses {
  root: string;
  paper: string;
  list: string;
}
export type MenuClassKey = keyof MenuClasses;
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
export function getMenuUtilityClass(slot: string): string {
  return `${globalStates.has(slot) ? 'Mui' : 'MuiMenu'}-${slot}`;
}
export const menuClasses: MenuClasses = {
  root: getMenuUtilityClass('root'),
  paper: getMenuUtilityClass('paper'),
  list: getMenuUtilityClass('list'),
};
export interface MenuRootSlotPropsOverrides {}
export interface MenuPaperSlotPropsOverrides {}
export interface MenuListSlotPropsOverrides {}
export interface MenuTransitionSlotPropsOverrides {}
export interface MenuBackdropSlotPropsOverrides {}
export interface MenuRootProps extends PopoverRootProps {
  ownerState?: MenuOwnerState & PopoverOwnerState;
}
export interface MenuPaperProps extends PopoverPaperProps {
  ownerState?: MenuOwnerState & PopoverOwnerState;
}
export interface MenuListSlotProps extends MenuListProps {
  ref?: React.Ref<ViewInstance>;
  ownerState?: MenuOwnerState;
}
export interface MenuSlots {
  root?: React.ComponentType<MenuRootProps>;
  paper?: React.ComponentType<MenuPaperProps & React.RefAttributes<ViewInstance>>;
  list?: React.ComponentType<MenuListSlotProps>;
  transition?: PopoverSlots['transition'];
  backdrop?: PopoverSlots['backdrop'];
}
export interface MenuProps extends Omit<PopoverProps, 'slots' | 'slotProps' | 'onClose'> {
  autoFocus?: boolean;
  disableAutoFocusItem?: boolean;
  variant?: 'menu' | 'selectedMenu';
  onClose?: (
    event: ModalCloseEvent | ButtonBaseKeyEvent,
    reason: 'backdropClick' | 'escapeKeyDown' | 'tabKeyDown',
  ) => void;
  classes?: Partial<MenuClasses>;
  PopoverClasses?: Record<string, string>;
  slots?: MenuSlots;
  slotProps?: {
    root?: SlotProps<Partial<MenuRootProps> & MenuRootSlotPropsOverrides, MenuOwnerState>;
    paper?: SlotProps<
      MenuPaperProps & MenuPaperSlotPropsOverrides & React.RefAttributes<ViewInstance>,
      MenuOwnerState
    >;
    list?: SlotProps<MenuListSlotProps & MenuListSlotPropsOverrides, MenuOwnerState>;
    transition?: SlotProps<
      Partial<TransitionProps> &
        MenuTransitionSlotPropsOverrides &
        React.RefAttributes<ViewInstance>,
      MenuOwnerState
    >;
    backdrop?: SlotProps<
      Partial<BackdropProps> & MenuBackdropSlotPropsOverrides & React.RefAttributes<ViewInstance>,
      MenuOwnerState
    >;
  };
}
export interface MenuOwnerState extends Omit<MenuProps, 'slots' | 'slotProps'> {
  autoFocus: boolean;
  disableAutoFocusItem: boolean;
  transitionDuration: NonNullable<MenuProps['transitionDuration']>;
  variant: 'menu' | 'selectedMenu';
}
export type MenuSlotsAndSlotProps = Pick<MenuProps, 'slots' | 'slotProps'>;
function useMenuSlotStyle(
  slot: 'paper' | 'list',
  ownerState: object,
  sx: SxProps | undefined,
  base: Record<string, unknown> = {},
): StyleProp<NativeStyle> {
  const theme = useTheme(),
    { width } = useWindowDimensions();
  const config = theme.components.MuiMenu;
  const raw = typeof config === 'object' ? config.styleOverrides?.[slot] : undefined;
  const override =
    typeof raw === 'function'
      ? raw({ theme, ownerState: ownerState as Record<string, unknown> })
      : raw;
  return [
    resolveSx([base, ...(Array.isArray(override) ? override : [override])] as SxProps, theme, {
      width,
      mode: 'css',
    }),
    resolveSx(sx, theme, { width }),
  ];
}
export const MenuPaper: React.ForwardRefExoticComponent<
  React.PropsWithoutRef<MenuPaperProps> & React.RefAttributes<ViewInstance>
> = forwardRef<ViewInstance, MenuPaperProps>(function MenuPaper(
  { ownerState, sx, style, ...props },
  ref,
) {
  const { height } = useWindowDimensions();
  const computed = useMenuSlotStyle('paper', ownerState ?? props, sx, {
    maxHeight: Math.max(0, height - 96),
  });
  return (
    <PopoverPaper {...props} ownerState={ownerState} ref={ref} sx={sx} style={[computed, style]} />
  );
});
const MenuListSurface = forwardRef<ViewInstance, MenuListSlotProps>(function MenuListSurface(
  { ownerState, sx, style, ...props },
  ref,
) {
  const computed = useMenuSlotStyle('list', ownerState ?? props, sx);
  return <MenuList {...props} ref={ref} sx={sx} style={[computed, style]} />;
});
interface ListBridgeProps {
  surface: NonNullable<MenuSlots['list']>;
  listProps: MenuListSlotProps;
  open: boolean;
  onTab: (event: ButtonBaseKeyEvent) => void;
}
function MenuListBridge({ surface: List, listProps, open, onTab }: ListBridgeProps) {
  const overlayReady = useContext(NativeOverlayReadiness),
    transitionReady = useContext(NativeTransitionReadiness);
  return (
    <NativeMenuFocusReadiness.Provider value={open && overlayReady && transitionReady}>
      <List
        {...listProps}
        managedKeys={[...new Set(['Tab', ...(listProps.managedKeys ?? [])])]}
        onKeyDown={(event) => {
          if (
            open &&
            overlayReady &&
            event.key === 'Tab' &&
            !event.isComposing &&
            !event.isCanceled
          ) {
            event.preventDefault();
            onTab(event);
          }
          listProps.onKeyDown?.(event);
        }}
      />
    </NativeMenuFocusReadiness.Provider>
  );
}
export const Menu: React.ForwardRefExoticComponent<
  React.PropsWithoutRef<MenuProps> & React.RefAttributes<ViewInstance>
> = forwardRef<ViewInstance, MenuProps>(function Menu(inProps, ref) {
  const props = useDefaultProps({ props: inProps, name: 'MuiMenu' });
  const {
    autoFocus = true,
    disableAutoFocusItem = false,
    variant = 'selectedMenu',
    transitionDuration = 'auto',
    children,
    onClose,
    open,
    slots = {},
    slotProps = {},
    sx,
    style,
    classes,
    PopoverClasses,
    ...other
  } = props;
  const ownerState: MenuOwnerState = {
    ...props,
    autoFocus,
    disableAutoFocusItem,
    variant,
    transitionDuration,
  };
  const root = resolveSlotProps(slotProps.root, ownerState) ?? {},
    paper = resolveSlotProps(slotProps.paper, ownerState) ?? {},
    list = resolveSlotProps(slotProps.list, ownerState) ?? {},
    transition = resolveSlotProps(slotProps.transition, ownerState) ?? {},
    backdrop = resolveSlotProps(slotProps.backdrop, ownerState) ?? {};
  const actions = useRef<MenuListActions | null>(null),
    actionRef = useForkRef(actions, list.actions);
  const rtl = useRtl();
  const computed = useComponentStyle('MuiMenu', ownerState, sx);
  const initial = autoFocus && open;
  if (classes || PopoverClasses)
    diagnostic(
      'menu-classes',
      'Menu class helpers identify familiar slots; use native sx/styles and slots instead of browser CSS classes.',
    );
  return (
    <Popover
      disableAutoFocus={autoFocus}
      onClose={onClose}
      anchorOrigin={{ vertical: 'bottom', horizontal: rtl ? 'right' : 'left' }}
      transformOrigin={{ vertical: 'top', horizontal: rtl ? 'right' : 'left' }}
      open={open}
      ref={ref}
      transitionDuration={transitionDuration}
      {...other}
      sx={sx}
      style={[computed, style]}
      slots={{
        root: slots.root as PopoverSlots['root'],
        paper: (slots.paper ?? MenuPaper) as PopoverSlots['paper'],
        transition: slots.transition,
        backdrop: slots.backdrop,
      }}
      slotProps={{
        root: { ...root, ownerState } as NonNullable<PopoverProps['slotProps']>['root'],
        paper: { ...paper, ownerState } as NonNullable<PopoverProps['slotProps']>['paper'],
        backdrop: backdrop,
        transition: {
          ...transition,
          onEntering: (node, appearing) => {
            actions.current?.adjustStyleForScrollbar(node, { direction: rtl ? 'rtl' : 'ltr' });
            if (initial) actions.current?.focusInitialTarget();
            transition.onEntering?.(node, appearing);
          },
        },
      }}
    >
      <MenuListBridge
        surface={slots.list ?? MenuListSurface}
        open={open}
        onTab={(event) => onClose?.(event, 'tabKeyDown')}
        listProps={{
          autoFocus: initial,
          autoFocusItem: initial && !disableAutoFocusItem,
          variant,
          ...list,
          actions: actionRef,
          ownerState,
          children,
        }}
      />
    </Popover>
  );
});
