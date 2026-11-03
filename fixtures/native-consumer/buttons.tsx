import React from 'react';
import { type ViewInstance } from 'react-native';
import { NativePressable } from '@altroo/mui-native-host';
import {
  Button as RootButton,
  IconButton as RootIconButton,
  type ButtonBaseRootProps,
  type ButtonBaseActions,
  buttonClasses,
  iconButtonClasses,
} from '@mui/material';
import Button, { type ButtonProps, getButtonUtilityClass } from '@mui/material/Button';
import IconButton, {
  type IconButtonProps,
  getIconButtonUtilityClass,
} from '@mui/material/IconButton';
import deepButtonClasses from '@mui/material/Button/buttonClasses';
import deepIconClasses from '@mui/material/IconButton/iconButtonClasses';
declare module '@mui/material/Button' {
  interface ButtonPropsVariantOverrides {
    soft: true;
  }
  interface ButtonPropsColorOverrides {
    brand: true;
  }
  interface ButtonPropsSizeOverrides {
    compact: true;
  }
}
declare module '@mui/material/IconButton' {
  interface IconButtonPropsColorOverrides {
    brand: true;
  }
  interface IconButtonPropsSizeOverrides {
    compact: true;
  }
}
const ref = React.createRef<ViewInstance>(),
  action = React.createRef<ButtonBaseActions>();
const button: ButtonProps = {
  ref,
  action,
  autoFocus: true,
  disableFocusRipple: true,
  color: 'brand',
  variant: 'soft',
  size: 'compact',
  onClick(event) {
    event.persist();
    if ('key' in event) event.key.toUpperCase();
    if ('pageX' in event.nativeEvent) event.nativeEvent.pageX.toFixed();
  },
  onKeyDown: (event) => event.key.toUpperCase(),
  style: (state) => ({ opacity: state.focusVisible ? 1 : 0.9 }),
};
const icon: IconButtonProps = {
  ref,
  action,
  color: 'brand',
  size: 'compact',
  edge: 'start',
  loading: false,
  onKeyUp: (event) => event.code,
  classes: { loading: 'native-id-only' },
};
export const controls = (
  <>
    <Button {...button}>Save</Button>
    <RootButton loadingPosition="end" loading>
      Send
    </RootButton>
    <IconButton {...icon}>Icon</IconButton>
    <RootIconButton aria-label="Delete" />
  </>
);
const Link = React.forwardRef<ViewInstance, ButtonBaseRootProps & { route: string }>(function Link(
  { route, ...props },
  ref,
) {
  void route;
  return <NativePressable {...props} ref={ref} />;
});
const linked: ButtonProps<typeof Link> = {
  component: Link,
  route: '/invoices',
  href: 'app://invoices',
  ref,
};
export const custom = (
  <>
    <Button {...linked}>Invoices</Button>
    <IconButton component={Link} route="/settings" aria-label="Settings" ref={ref} />
  </>
);
void [
  buttonClasses === deepButtonClasses,
  iconButtonClasses === deepIconClasses,
  getButtonUtilityClass('focusVisible'),
  getIconButtonUtilityClass('loading'),
];
action.current?.focusVisible();
// @ts-expect-error Native roots expose a ViewInstance, not an HTML button.
export const browserRef = <Button ref={React.createRef<HTMLButtonElement>()} />;
// @ts-expect-error Native custom roots are components, not DOM element names.
export const browserRoot = <Button component="button" />;
// @ts-expect-error Browser form submission is not a native Button contract.
export const browserForm = <Button type="submit" />;
// @ts-expect-error IconButton has its own API rather than Button loading positions.
export const buttonOnly = <IconButton loadingPosition="start" />;
// @ts-expect-error Native custom root required props are checked.
export const missingRoute = <Button component={Link} />;
