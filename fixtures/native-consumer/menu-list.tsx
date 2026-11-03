import React from 'react';
import { TextInput, type ViewInstance } from 'react-native';
import {
  MenuList as RootList,
  MenuItem as RootItem,
  ListItemText,
  ListSubheader,
} from '@mui/material';
import MenuList, {
  MenuListRoot,
  type MenuListProps,
  type MenuListOwnProps,
  type MenuListActions,
  type MenuListRootProps,
} from '@mui/material/MenuList';
import MenuItem, { type MenuItemProps, type MenuItemOwnProps } from '@mui/material/MenuItem';
const root = React.forwardRef<ViewInstance, MenuListRootProps>((props, ref) => (
  <MenuListRoot {...props} ref={ref} />
));
const ref = React.createRef<ViewInstance>(),
  actions = React.createRef<MenuListActions>();
const own: MenuListOwnProps = {
  autoFocusItem: true,
  variant: 'selectedMenu',
  disabledItemsFocusable: true,
  disableListWrap: false,
  focusSource: 'keyboard',
};
const list: MenuListProps = {
  ...own,
  actions,
  onKeyDown: (event) => {
    if (event.key === 'Escape') event.preventDefault();
    if (typeof event.currentTarget !== 'number') event.currentTarget.measureInWindow(() => {});
  },
};
const itemOwn: MenuItemOwnProps = {
  dense: true,
  selected: true,
  divider: true,
  textValue: 'Account',
  role: 'menuitemcheckbox',
};
const item: MenuItemProps = {
  ...itemOwn,
  'aria-checked': true,
  onClick: (event) => {
    if (typeof event.currentTarget !== 'number') event.currentTarget.focus();
  },
};
export const menu = (
  <MenuList
    {...list}
    component={root}
    ref={ref}
    scrollable
    scrollViewProps={{ keyboardShouldPersistTaps: 'handled' }}
    sx={{ maxHeight: 320 }}
    subheader={
      <ListSubheader>
        <TextInput accessibilityLabel="Filter" />
      </ListSubheader>
    }
  >
    <MenuItem {...item}>
      <ListItemText primary="Account" />
    </MenuItem>
    <RootItem disabled>Unavailable</RootItem>
  </MenuList>
);
export const rootImports = (
  <RootList role="menu">
    <RootItem>Action</RootItem>
  </RootList>
);
export function focus() {
  actions.current?.focusInitialTarget()?.focus();
  actions.current?.adjustStyleForScrollbar(ref.current, { direction: 'rtl' });
}
// @ts-expect-error Native menu refs expose native views.
export const browserRef = <MenuList ref={React.createRef<HTMLUListElement>()} />;
// @ts-expect-error Browser key events require a migration to the native event contract.
const browserKey: NonNullable<MenuListProps['onKeyDown']> = (
  event: React.KeyboardEvent<HTMLUListElement>,
) => event.preventDefault();
export const browserEvent = <MenuList onKeyDown={browserKey} />;
// @ts-expect-error The pinned menu variant set is closed.
export const invalidVariant = <MenuList variant="context" />;
// @ts-expect-error Unsupported native roles are rejected.
export const invalidRole = <MenuItem role="native-menuitem" />;
