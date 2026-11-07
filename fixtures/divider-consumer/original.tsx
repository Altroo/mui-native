// Copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT
import { createRef, forwardRef, type HTMLAttributes, type JSX } from 'react';
import Divider, {
  dividerClasses,
  getDividerUtilityClass,
  type DividerProps,
  type DividerOwnProps,
  type DividerTypeMap,
  type DividerClasses,
  type DividerClassKey,
} from '@mui/material/Divider';
import { Divider as RootDivider } from '@mui/material';
import { createTheme, styled, type ComponentsPropsList } from '@mui/material/styles';
declare module '@mui/material/Divider' {
  interface DividerPropsVariantOverrides {
    dashed: true;
    inset: false;
  }
  interface DividerClasses {
    contributorSlot?: string | undefined;
  }
}
export const exact: DividerProps = {
  absolute: undefined,
  children: undefined,
  classes: undefined,
  flexItem: undefined,
  orientation: undefined,
  sx: undefined,
  textAlign: undefined,
  variant: undefined,
  component: undefined,
};
export const own: DividerOwnProps = { absolute: true, textAlign: 'left', variant: 'dashed' };
export const key: DividerClassKey = 'contributorSlot';
export const classes: Partial<DividerClasses> = {
  root: 'chosen',
  wrapper: 'label',
  contributorSlot: 'custom',
};
export const identity: typeof Divider = RootDivider;
export const classIdentity: typeof dividerClasses = dividerClasses;
export const utility: string = getDividerUtilityClass('constructor');
const Root = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement> & { tracking: string }>(
  ({ tracking, ...props }, ref) => <div {...props} data-tracking={tracking} ref={ref} />,
);
export const props: DividerProps<typeof Root> = { tracking: 'delivery' };
export const map: DividerTypeMap<{ tracking: string }, typeof Root> = {
  props: { tracking: 'delivery' },
  defaultComponent: Root,
};
export const defaults: ComponentsPropsList['MuiDivider'] = {
  component: Root,
  classes,
  variant: 'dashed',
};
export const node = (
  <Divider
    component={Root}
    tracking="delivery"
    ref={createRef<HTMLDivElement>()}
    {...own}
    classes={classes}
    id="line"
    role="separator"
    onClick={(event) => event.currentTarget.getAttribute('id')}
    style={{ padding: 0 }}
  />
);
export const defaultRef = <Divider ref={createRef<HTMLHRElement>()} />;
const Wrapped = styled(Divider)({ opacity: 0.8 });
export const wrapped = <Wrapped {...exact}>Notes</Wrapped>;
export const renderDivider: (props: DividerProps) => JSX.Element | null = Divider;
// @ts-expect-error Custom roots retain required declared fields.
export const missing = <Divider component={Root} />;
// @ts-expect-error No expanded prop exists on Divider.
export const invalid = <Divider expanded />;
// @ts-expect-error Augmentation removes inset.
export const removed = <Divider variant="inset" />;
// @ts-expect-error Unknown class keys remain invalid.
export const wrongClass = <Divider classes={{ unknown: 'bad' }} />;
// @ts-expect-error No public class-leaf export exists.
export type PrivateLeaf = import('@mui/material/Divider/dividerClasses').DividerClasses;

// A conditional root keeps the props required by only its custom-root branch.
const conditionalRootProps =
  Math.random() > 0.5
    ? { component: Root, tracking: 'conditional', className: 'custom' }
    : { className: 'plain' };
export const conditionalRoot = <Divider {...conditionalRootProps} />;

// Pinned options accept explicit undefined under exact optional properties.
export const undefinedDividerDefaults = createTheme({
  components: { MuiDivider: { defaultProps: undefined } },
});
export const undefinedDividerOverrides = createTheme({
  components: { MuiDivider: { styleOverrides: undefined } },
});
export const undefinedDividerVariants = createTheme({
  components: { MuiDivider: { variants: undefined } },
});
export const undefinedMergeOption = createTheme({
  components: { mergeClassNameAndStyle: undefined },
});
export const undefinedComponents = createTheme({ components: undefined });
