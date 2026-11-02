import React from 'react';
import { Pressable, type ViewInstance } from 'react-native';
import { NativePressable } from '@altroo/mui-native-host';
import ButtonBase, {
  type ButtonBaseProps,
  type ButtonBaseOwnProps,
  type ButtonBaseActions,
  type ButtonBaseRootProps,
  type ButtonBaseState,
  type ButtonBaseKeyEvent,
  type ButtonBaseActivationEvent,
} from '@mui/material/ButtonBase';
import { ButtonBase as RootButtonBase } from '@mui/material';
const ref = React.createRef<ViewInstance>(),
  action = React.createRef<ButtonBaseActions>();
const own: ButtonBaseOwnProps = {
  disabled: false,
  disableRipple: true,
  onKeyDown: (event) => event.key,
};
const props: ButtonBaseProps = {
  ...own,
  ref,
  action,
  sx: { '&.Mui-focusVisible': { backgroundColor: 'primary.light' } },
};
const Root = React.forwardRef<ViewInstance, ButtonBaseRootProps>(function Root(props, ref) {
  return <NativePressable {...props} ref={ref} />;
});
const activate = (event: ButtonBaseActivationEvent) => {
  event.preventDefault();
  if ('key' in event) {
    const key: string = event.nativeEvent.key;
    void key;
  } else {
    const point: number = event.nativeEvent.pageX;
    void point;
  }
};
const key = (event: ButtonBaseKeyEvent) => {
  const value: string = event.key;
  event.persist();
  void value;
};
export const control = (
  <ButtonBase
    {...props}
    component={Root}
    onClick={activate}
    onKeyDown={key}
    style={(state: ButtonBaseState) => ({ opacity: state.disabled ? 0.4 : 1 })}
  >
    {(state) => (state.pressed ? 'Pressed' : 'Action')}
  </ButtonBase>
);
export const link = (
  <RootButtonBase component={Pressable} href="https://example.com" ref={ref}>
    Open
  </RootButtonBase>
);
export const composite = (
  <RootButtonBase disabled focusableWhenDisabled tabIndex={-1}>
    Unavailable
  </RootButtonBase>
);
export function focus() {
  action.current?.focusVisible();
}
// @ts-expect-error ButtonBase exposes a native View ref.
export const browserRef = <ButtonBase ref={React.createRef<HTMLButtonElement>()} />;
// @ts-expect-error DOM form submission is not a native ButtonBase contract.
export const browserForm = <ButtonBase type="submit" />;
// @ts-expect-error DOM programmable ripple props are not native ripple controls.
export const browserRipple = <ButtonBase TouchRippleProps={{ center: true }} />;
