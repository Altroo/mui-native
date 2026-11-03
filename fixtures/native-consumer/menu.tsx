import React from 'react';
import { type ViewInstance } from 'react-native';
import {
  Menu as RootMenu,
  MenuPaper as RootPaper,
  MenuList,
  MenuItem,
  PopoverRoot,
  Grow,
} from '@mui/material';
import Menu, {
  MenuPaper,
  menuClasses,
  getMenuUtilityClass,
  type MenuProps,
  type MenuOwnerState,
  type MenuSlots,
  type MenuSlotsAndSlotProps,
  type MenuRootProps,
  type MenuPaperProps,
  type MenuListSlotProps,
  type MenuRootSlotPropsOverrides,
  type MenuPaperSlotPropsOverrides,
  type MenuListSlotPropsOverrides,
  type MenuTransitionSlotPropsOverrides,
  type MenuBackdropSlotPropsOverrides,
} from '@mui/material/Menu';
import classes, { type MenuClassKey } from '@mui/material/Menu/menuClasses';
import type { PopoverActions } from '@mui/material/Popover';
import { getNativeFocusedView } from '@altroo/mui-native-host';
declare module '@altroo/mui-native/Menu' {
  interface MenuRootSlotPropsOverrides {
    rootTone?: 'quiet' | 'strong';
  }
}
const Root = React.forwardRef<ViewInstance, MenuRootProps & MenuRootSlotPropsOverrides>(
  ({ rootTone, ...props }, ref) => <PopoverRoot {...props} ref={ref} />,
);
const Paper = React.forwardRef<ViewInstance, MenuPaperProps>((props, ref) => (
  <MenuPaper {...props} ref={ref} />
));
const List = React.forwardRef<ViewInstance, MenuListSlotProps>(({ ownerState, ...props }, ref) => (
  <MenuList {...props} ref={ref} />
));
const ref = React.createRef<ViewInstance>(),
  paper = React.createRef<ViewInstance>(),
  list = React.createRef<ViewInstance>(),
  action = React.createRef<PopoverActions>();
const slots: MenuSlots = { root: Root, paper: Paper, list: List, transition: Grow };
const overrides: [
  MenuRootSlotPropsOverrides,
  MenuPaperSlotPropsOverrides,
  MenuListSlotPropsOverrides,
  MenuTransitionSlotPropsOverrides,
  MenuBackdropSlotPropsOverrides,
] = [{ rootTone: 'quiet' }, {}, {}, {}, {}];
void overrides;
const slotProps: MenuSlotsAndSlotProps['slotProps'] = {
  root: (owner: MenuOwnerState) => ({ rootTone: owner.open ? 'strong' : 'quiet' }),
  paper: { ref: paper, sx: { maxWidth: 320 } },
  list: (owner) => ({
    ref: list,
    dense: owner.variant === 'menu',
    managedDescendantKeys: ['Tab'],
    onKeyDown: (event) => event.muiKeySource,
  }),
  transition: { onEntering: (node) => node.measureInWindow(() => {}) },
  backdrop: { invisible: true },
};
const props: MenuProps = {
  open: true,
  anchorEl: ref.current,
  action,
  slots,
  slotProps,
  autoFocus: true,
  disableAutoFocusItem: false,
  variant: 'selectedMenu',
  transitionDuration: 'auto',
  onClose: (event, reason) => {
    event?.preventDefault();
    if (reason === 'tabKeyDown') ref.current?.focus();
  },
};
export const content = (
  <Menu {...props} ref={ref}>
    <MenuItem selected>Account</MenuItem>
    <MenuItem disabled>Unavailable</MenuItem>
  </Menu>
);
export const rootImports = (
  <RootMenu open={false}>
    <MenuItem>Action</MenuItem>
  </RootMenu>
);
export const surfaces = (
  <>
    <RootPaper />
    <MenuPaper />
  </>
);
const key: MenuClassKey = 'paper';
export const identifier = [classes[key], menuClasses[key], getMenuUtilityClass('focusVisible')];
export function focus() {
  getNativeFocusedView()?.measureInWindow(() => {});
  ref.current?.focus();
  action.current?.updatePosition();
}
// @ts-expect-error Menu requires a controlled open state.
export const missingOpen = <Menu />;
// @ts-expect-error Native root refs are not DOM elements.
export const browserRef = <Menu open ref={React.createRef<HTMLDivElement>()} />;
// @ts-expect-error Only the pinned menu variant set is supported.
export const invalidVariant = <Menu open variant="context" />;
// @ts-expect-error Unknown named slots are rejected.
export const invalidSlot = <Menu open slots={{ footer: Paper }} />;
