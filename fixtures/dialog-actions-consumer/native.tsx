// Copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT
import { createRef, forwardRef, type JSX } from 'react';
import { View, type ViewInstance, type ViewProps } from 'react-native';
import Actions, {
  type DialogActionsProps,
  type DialogActionsClasses,
  type DialogActionsClassKey,
  dialogActionsClasses,
} from '@mui/material/DialogActions';
import { DialogActions as RootActions, createTheme } from '@mui/material';
import { styled, type ComponentsPropsList } from '@mui/material/styles';
import DirectActions from '@altroo/mui-native/DialogActions';
import DirectClasses from '@altroo/mui-native/DialogActions/dialogActionsClasses';

declare module '@mui/material/DialogActions' {
  interface DialogActionsClasses {
    contributorSlot?: string | undefined;
  }
}

type MissingHostProps = Exclude<keyof ViewProps, keyof DialogActionsProps>;
export const allNativeAttributes: MissingHostProps extends never ? true : false = true;
export const exactOptional: DialogActionsProps = {
  children: undefined,
  classes: undefined,
  className: undefined,
  disableSpacing: undefined,
  sx: undefined,
  style: undefined,
  component: undefined,
  ref: undefined,
};
export const jsxReturn: (props: DialogActionsProps) => JSX.Element = Actions;
export const rootIdentity: typeof Actions = RootActions;
export const directIdentity: typeof Actions = DirectActions;
export const leafIdentity: typeof dialogActionsClasses = DirectClasses;
export const augmentedKey: DialogActionsClassKey = 'contributorSlot';
const classes: Partial<DialogActionsClasses> = {
  spacing: 'custom-spacing',
  contributorSlot: 'contributor',
};
export const themeProps: ComponentsPropsList['MuiDialogActions'] = { classes };
const Custom = forwardRef<ViewInstance, ViewProps & { className?: string | undefined }>(
  function ActionsRoot({ className: _name, ...props }, ref) {
    return <View {...props} ref={ref} />;
  },
);
const Styled = styled(Actions)({ '&.MuiDialogActions-spacing': { paddingBottom: '12px' } });
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
// @ts-expect-error DialogActions does not invent a link API.
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

const declaredState = { disableSpacing: true, marker: 'caller' };
const declaredTheme = createTheme();
const ReservedRoot = forwardRef<
  ViewInstance,
  ViewProps & {
    ownerState?: typeof declaredState;
    theme?: typeof declaredTheme;
    as?: typeof Custom | undefined;
  }
>(({ ownerState: _state, theme: _theme, as: _as, ...native }, ref) => (
  <View {...native} ref={ref} />
));
export const reservedRoot = (
  <Actions component={ReservedRoot} ownerState={declaredState} theme={declaredTheme} as={Custom} />
);
export const undefinedAsRoot = <Actions component={ReservedRoot} as={undefined} />;

const NullableRoot = forwardRef<
  ViewInstance,
  ViewProps & { ownerState?: object | null | undefined }
>(({ ownerState: _state, ...native }, ref) => <View {...native} ref={ref} />);
export const nullableOwner = <Actions component={NullableRoot} ownerState={null} />;
export const undefinedOwner = <Actions component={NullableRoot} ownerState={undefined} />;
