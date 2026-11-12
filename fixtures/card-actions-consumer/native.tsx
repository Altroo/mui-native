// Copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT
import { createRef, forwardRef, type JSX } from 'react';
import { View, type ViewInstance, type ViewProps } from 'react-native';
import Actions, {
  type CardActionsProps,
  type CardActionsClasses,
  type CardActionsClassKey,
  cardActionsClasses,
} from '@mui/material/CardActions';
import { CardActions as RootActions } from '@mui/material';
import { styled, type ComponentsPropsList } from '@mui/material/styles';
import DirectActions from '@altroo/mui-native/CardActions';
import DirectClasses from '@altroo/mui-native/CardActions/cardActionsClasses';

declare module '@mui/material/CardActions' {
  interface CardActionsClasses {
    contributorSlot?: string | undefined;
  }
}

type MissingHostProps = Exclude<keyof ViewProps, keyof CardActionsProps>;
export const allNativeAttributes: MissingHostProps extends never ? true : false = true;
export const exactOptional: CardActionsProps = {
  children: undefined,
  classes: undefined,
  className: undefined,
  disableSpacing: undefined,
  sx: undefined,
  style: undefined,
  component: undefined,
  ref: undefined,
};
export const jsxReturn: (props: CardActionsProps) => JSX.Element = Actions;
export const rootIdentity: typeof Actions = RootActions;
export const directIdentity: typeof Actions = DirectActions;
export const leafIdentity: typeof cardActionsClasses = DirectClasses;
export const augmentedKey: CardActionsClassKey = 'contributorSlot';
const classes: Partial<CardActionsClasses> = {
  spacing: 'custom-spacing',
  contributorSlot: 'contributor',
};
export const themeProps: ComponentsPropsList['MuiCardActions'] = { classes };
const Custom = forwardRef<ViewInstance, ViewProps & { className?: string | undefined }>(
  function ActionsRoot({ className: _name, ...props }, ref) {
    return <View {...props} ref={ref} />;
  },
);
const Styled = styled(Actions)({ '&.MuiCardActions-spacing': { paddingBottom: '12px' } });
export const node = (
  <Styled
    {...exactOptional}
    component={Custom}
    ref={createRef<ViewInstance>()}
    classes={classes}
    onTouchStart={(event) => event.nativeEvent.pageX}
  >
    Save
  </Styled>
);
// @ts-expect-error Native wrappers expose a View, not an HTML element.
export const browserRef = <Actions ref={createRef<HTMLDivElement>()} />;
// @ts-expect-error CardActions does not invent a link API.
export const link = <Actions href="/save" />;
// @ts-expect-error Source disableSpacing is a boolean.
export const stringSpacing = <Actions disableSpacing="off" />;
// @ts-expect-error Only the declared or augmented class names are accepted.
export const unknownClass = <Actions classes={{ unknown: 'invalid' }} />;

export const nativeAlias = <Actions component="div" ref={createRef<ViewInstance>()} />;
const BrowserRoot = forwardRef<HTMLDivElement>(() => null);
// @ts-expect-error A configured root must expose a native View instance.
export const browserRoot = <Actions component={BrowserRoot} />;

const browserProps = { component: BrowserRoot };
// @ts-expect-error Spreading props must retain the configured root's native ref requirement.
export const browserSpread = <Actions {...browserProps} />;
export const nativeSpread = <Actions {...{ component: Custom, classes }} />;
