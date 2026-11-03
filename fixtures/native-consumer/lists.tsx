import React from 'react';
import { View, type ViewInstance, type TextInstance } from 'react-native';
import { List as RootList, ListItemButton as RootButton, Typography } from '@mui/material';
import List, {
  type ListOwnProps,
  type ListProps,
  type NativeListRootProps,
} from '@mui/material/List';
import ListItem, {
  type ListItemProps,
  type ListItemOwnerState,
  type ListItemRootSlotPropsOverrides,
} from '@mui/material/ListItem';
import ListItemText, {
  type ListItemTextProps,
  type ListItemTextTypographySlotProps,
} from '@mui/material/ListItemText';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemAvatar from '@mui/material/ListItemAvatar';
import ListItemSecondaryAction from '@mui/material/ListItemSecondaryAction';
import ListSubheader, { type ListSubheaderProps } from '@mui/material/ListSubheader';
import ListItemButton, {
  type ListItemButtonProps,
  type ListItemButtonBaseProps,
} from '@mui/material/ListItemButton';
import type { ButtonBaseActions } from '@mui/material/ButtonBase';
declare module '@altroo/mui-native/ListItem' {
  interface ListItemRootSlotPropsOverrides {
    tone?: 'quiet' | 'strong';
  }
}
const root = React.forwardRef<ViewInstance, NativeListRootProps>((props, ref) => (
  <View {...props} ref={ref} />
));
const primary = React.forwardRef<TextInstance, ListItemTextTypographySlotProps>((props, ref) => (
  <Typography {...props} ref={ref} />
));
const ref = React.createRef<ViewInstance>(),
  text = React.createRef<TextInstance>(),
  action = React.createRef<ButtonBaseActions>();
const listOwn: ListOwnProps = { dense: true, scrollable: true };
const list: ListProps = {
  ...listOwn,
  ref,
  scrollViewProps: { keyboardShouldPersistTaps: 'handled' },
};
const item: ListItemProps = {
  alignItems: 'flex-start',
  slots: { root },
  slotProps: {
    root: (owner: ListItemOwnerState) => ({ tone: owner.dense ? 'quiet' : 'strong', ref }),
  },
};
const title: ListItemTextProps = {
  primary: 0,
  secondary: 'Detail',
  slots: { primary },
  slotProps: { primary: { ref: text, variant: 'body2' } },
};
const base: ListItemButtonBaseProps = {
  selected: true,
  action,
  onClick: (event) => event.preventDefault(),
};
const button: ListItemButtonProps = { ...base, dense: false };
const header: ListSubheaderProps = { color: 'primary', inset: true };
const custom: ListItemRootSlotPropsOverrides = { tone: 'strong' };
void custom;
export const content = (
  <List
    {...list}
    sx={{ maxHeight: 320 }}
    subheader={<ListSubheader {...header}>Accounts</ListSubheader>}
  >
    <ListItem
      {...item}
      secondaryAction={<RootButton accessibilityLabel="More actions">More</RootButton>}
    >
      <ListItemButton {...button}>
        <ListItemIcon>I</ListItemIcon>
        <ListItemAvatar>A</ListItemAvatar>
        <ListItemText {...title} />
      </ListItemButton>
    </ListItem>
    <ListItem>
      <ListItemText primary="Other" />
      <ListItemSecondaryAction>End</ListItemSecondaryAction>
    </ListItem>
  </List>
);
export const unscrolled = <RootList component={root} disablePadding ref={ref} />;
export function focus() {
  action.current?.focusVisible();
  ref.current?.measureInWindow(() => {});
}
// @ts-expect-error Native list roots use native view refs.
export const browserRef = <List ref={React.createRef<HTMLUListElement>()} />;
// @ts-expect-error Unknown native list text slots are rejected.
export const unknownSlot = <ListItemText slots={{ footer: root }} />;
// @ts-expect-error Native ListItemButton does not submit browser forms.
export const browserButton = <ListItemButton type="submit" />;
// @ts-expect-error ListSubheader has the pinned eligible color set.
export const invalidColor = <ListSubheader color="error" />;
