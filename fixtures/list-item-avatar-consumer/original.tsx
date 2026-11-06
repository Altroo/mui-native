// Copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT
import ListItemAvatar, {
  type ListItemAvatarClasses,
  type ListItemAvatarClassKey,
  type ListItemAvatarProps,
  listItemAvatarClasses,
  getListItemAvatarUtilityClass,
} from '@mui/material/ListItemAvatar';
declare module '@mui/material/ListItemAvatar' {
  interface ListItemAvatarClasses {
    customSlot: string;
  }
}
const value: ListItemAvatarClasses = {
  root: 'root',
  alignItemsFlexStart: 'top',
  customSlot: 'custom',
};
const key: ListItemAvatarClassKey = 'customSlot';
const props: ListItemAvatarProps = {
  children: undefined,
  classes: undefined,
  sx: undefined,
  className: undefined,
};
export const original = (
  <ListItemAvatar
    {...props}
    classes={{ ...value, [key]: value[key] }}
    className={[listItemAvatarClasses.root, getListItemAvatarUtilityClass('root')].join(' ')}
  />
);
// @ts-expect-error The original published type has no undeclared class key.
export const invalid = <ListItemAvatar classes={{ invented: 'invalid' }} />;
