// Copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT
import ListItemIcon, {
  type ListItemIconClasses,
  type ListItemIconClassKey,
  type ListItemIconProps,
  listItemIconClasses,
  getListItemIconUtilityClass,
} from '@mui/material/ListItemIcon';
declare module '@mui/material/ListItemIcon' {
  interface ListItemIconClasses {
    customSlot: string;
  }
}
const value: ListItemIconClasses = {
  root: 'root',
  alignItemsFlexStart: 'top',
  customSlot: 'custom',
};
const key: ListItemIconClassKey = 'customSlot';
const props: ListItemIconProps = {
  children: undefined,
  classes: undefined,
  sx: undefined,
  className: undefined,
};
export const original = (
  <ListItemIcon
    {...props}
    classes={{ ...value, [key]: value[key] }}
    className={[listItemIconClasses.root, getListItemIconUtilityClass('root')].join(' ')}
  />
);
// @ts-expect-error The original published type has no undeclared class key.
export const invalid = <ListItemIcon classes={{ invented: 'invalid' }} />;

export const callable: (props: ListItemIconProps) => React.JSX.Element = ListItemIcon;
