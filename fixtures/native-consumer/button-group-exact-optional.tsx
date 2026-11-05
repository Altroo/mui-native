import React from 'react';
import { View, type ViewInstance, type ViewProps } from 'react-native';
import { ButtonGroupContext, ButtonGroupButtonContext } from '@mui/material';
import ButtonGroup, {
  type ButtonGroupClassKey,
  type ButtonGroupClasses,
  type ButtonGroupOwnProps,
  type ButtonGroupProps,
} from '@mui/material/ButtonGroup';
import type { ButtonGroupClasses as DeepButtonGroupClasses } from '@mui/material/ButtonGroup/buttonGroupClasses';

declare module '@mui/material/ButtonGroup/buttonGroupClasses' {
  interface ButtonGroupClasses {
    consumerTypedSlot: string;
  }
}
export const augmentedClassKey: ButtonGroupClassKey = 'consumerTypedSlot';
export const augmentedClasses: Partial<ButtonGroupClasses> = {
  consumerTypedSlot: 'consumer-slot',
};
export const deepClassIdentity: Partial<DeepButtonGroupClasses> = augmentedClasses;
export const rootClassIdentity: Partial<ButtonGroupClasses> = deepClassIdentity;

// The original declarations explicitly permit undefined for optional group props.
// Keep this consumer isolated so exactOptionalPropertyTypes checks emitted APIs.
export const undefinedOwnProps: ButtonGroupOwnProps = {
  children: undefined,
  classes: undefined,
  className: undefined,
  color: undefined,
  size: undefined,
  variant: undefined,
  disabled: undefined,
  disableElevation: undefined,
  disableFocusRipple: undefined,
  disableRipple: undefined,
  fullWidth: undefined,
  orientation: undefined,
  sx: undefined,
  style: undefined,
  id: undefined,
  'data-testid': undefined,
};
export const undefinedProps: ButtonGroupProps = {
  ...undefinedOwnProps,
  component: undefined,
  ref: undefined,
};
export const groupCallable: (props: ButtonGroupProps) => React.JSX.Element | null = ButtonGroup;
export const optionalPropMetadata: unknown = ButtonGroup.propTypes;
const Custom = React.forwardRef<ViewInstance, ViewProps & { resourceId: string }>(
  ({ resourceId, ...props }, ref) => <View {...props} nativeID={resourceId} ref={ref} />,
);
type UnionRootProps = ViewProps &
  ({ mode: 'named'; resourceId: string } | { mode: 'numbered'; sequence: number });
const UnionRoot = React.forwardRef<ViewInstance, UnionRootProps>((props, ref) => (
  <View nativeID={props.mode === 'named' ? props.resourceId : String(props.sequence)} ref={ref} />
));
export const customProps: ButtonGroupProps<typeof Custom> = {
  ...undefinedOwnProps,
  component: Custom,
  resourceId: 'exact-optional',
};
export const exactOptionalGroups = (
  <ButtonGroupContext.Provider
    value={{
      className: undefined,
      color: undefined,
      disabled: undefined,
      disableElevation: undefined,
      disableFocusRipple: undefined,
      disableRipple: undefined,
      fullWidth: undefined,
      size: undefined,
      variant: undefined,
    }}
  >
    <ButtonGroupButtonContext.Provider value={undefined}>
      <ButtonGroup {...undefinedProps} />
      <ButtonGroup {...customProps} />
      <ButtonGroup component="div" color={undefined} orientation={undefined} sx={undefined} />
      <ButtonGroup classes={augmentedClasses} />
      <ButtonGroup component={UnionRoot} mode="named" resourceId="typed" />
      <ButtonGroup component={UnionRoot} mode="numbered" sequence={3} />
    </ButtonGroupButtonContext.Provider>
  </ButtonGroupContext.Provider>
);
// @ts-expect-error A custom root still requires its own props under exact optional semantics.
export const missingCustomProp = <ButtonGroup component={Custom} color={undefined} />;
// @ts-expect-error Explicit undefined support must not widen the finite orientation contract.
export const invalidExactOrientation = <ButtonGroup orientation="diagonal" />;
// @ts-expect-error A discriminated native custom root still requires its selected branch's prop.
export const missingUnionProp = <ButtonGroup component={UnionRoot} mode="named" />;
export const mismatchedUnionProps = (
  // @ts-expect-error Props from a different discriminated root branch must remain invalid.
  <ButtonGroup component={UnionRoot} mode="named" resourceId="typed" sequence={3} />
);
