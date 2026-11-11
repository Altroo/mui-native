// Copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT
import { createRef, forwardRef, type JSX } from 'react';
import { View, type ViewInstance, type ViewProps } from 'react-native';
import Actions, {
  type AccordionActionsProps,
  type AccordionActionsClasses,
  type AccordionActionsClassKey,
  accordionActionsClasses,
} from '@mui/material/AccordionActions';
import { AccordionActions as RootActions } from '@mui/material';
import { styled, type ComponentsPropsList } from '@mui/material/styles';
import DirectActions from '@altroo/mui-native/AccordionActions';
import DirectClasses from '@altroo/mui-native/AccordionActions/accordionActionsClasses';

declare module '@mui/material/AccordionActions' {
  interface AccordionActionsClasses {
    contributorSlot?: string | undefined;
  }
}

type MissingHostProps = Exclude<keyof ViewProps, keyof AccordionActionsProps>;
export const allNativeAttributes: MissingHostProps extends never ? true : false = true;
export const exactOptional: AccordionActionsProps = {
  children: undefined,
  classes: undefined,
  className: undefined,
  disableSpacing: undefined,
  sx: undefined,
  style: undefined,
  component: undefined,
  ref: undefined,
};
export const jsxReturn: (props: AccordionActionsProps) => JSX.Element = Actions;
export const rootIdentity: typeof Actions = RootActions;
export const directIdentity: typeof Actions = DirectActions;
export const leafIdentity: typeof accordionActionsClasses = DirectClasses;
export const augmentedKey: AccordionActionsClassKey = 'contributorSlot';
const classes: Partial<AccordionActionsClasses> = {
  spacing: 'custom-spacing',
  contributorSlot: 'contributor',
};
export const themeProps: ComponentsPropsList['MuiAccordionActions'] = { classes };
const Custom = forwardRef<ViewInstance, ViewProps & { className?: string | undefined }>(
  function ActionsRoot({ className: _name, ...props }, ref) {
    return <View {...props} ref={ref} />;
  },
);
const Styled = styled(Actions)({ '&.MuiAccordionActions-spacing': { paddingBottom: '12px' } });
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
// @ts-expect-error AccordionActions does not invent a link API.
export const link = <Actions href="/save" />;
// @ts-expect-error Source disableSpacing is a boolean.
export const stringSpacing = <Actions disableSpacing="off" />;
// @ts-expect-error Only the declared or augmented class names are accepted.
export const unknownClass = <Actions classes={{ unknown: 'invalid' }} />;
