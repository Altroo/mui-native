import React from 'react';
import { View, type ViewProps, type ViewInstance } from 'react-native';
import {
  Button,
  ButtonGroup as RootGroup,
  ButtonGroupContext,
  ButtonGroupButtonContext,
  type ButtonGroupTypeMap,
} from '@mui/material';
import ButtonGroup, {
  type ButtonGroupProps,
  buttonGroupClasses,
  getButtonGroupUtilityClass,
} from '@mui/material/ButtonGroup';
import classes from '@mui/material/ButtonGroup/buttonGroupClasses';
import defaults from '@mui/material/ButtonGroup/ButtonGroupContext';
import position from '@mui/material/ButtonGroup/ButtonGroupButtonContext';
declare module '@mui/material/ButtonGroup' {
  interface ButtonGroupPropsColorOverrides {
    brand: true;
  }
  interface ButtonGroupPropsVariantOverrides {
    segmented: true;
  }
  interface ButtonGroupPropsSizeOverrides {
    compact: true;
  }
}
const ref = React.createRef<ViewInstance>();
const Custom = React.forwardRef<ViewInstance, ViewProps & { resourceId: string }>(
  ({ resourceId, ...props }, forwarded) => (
    <View {...props} nativeID={resourceId} ref={forwarded} />
  ),
);
const options: ButtonGroupProps = {
  color: 'brand',
  size: 'compact',
  variant: 'segmented',
  orientation: 'vertical',
  ref,
  sx: { '& .MuiButtonGroup-firstButton': { minWidth: 48 } },
};
export const groups = (
  <>
    <RootGroup {...options}>
      <Button>First</Button>
      <Button>Second</Button>
    </RootGroup>
    <ButtonGroup component={Custom} resourceId="test" ref={ref} />
    <ButtonGroup component="div" ref={ref} />
  </>
);
export const contexts = [ButtonGroupContext, ButtonGroupButtonContext, defaults, position];
export const tokens = [buttonGroupClasses, classes, getButtonGroupUtilityClass('grouped')];
export const typeMap: ButtonGroupTypeMap<{ resourceId: string }>['props'] = { resourceId: 'typed' };
// @ts-expect-error Custom required native root props remain required.
export const missing = <ButtonGroup component={Custom} />;
// @ts-expect-error DOM refs are not native View handles.
export const wrongRef = <ButtonGroup ref={React.createRef<HTMLDivElement>()} />;
// @ts-expect-error Orientation is a finite source contract.
export const wrongOrientation = <ButtonGroup orientation="diagonal" />;
