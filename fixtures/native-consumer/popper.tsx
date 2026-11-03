import React from 'react';
import { View, Text, type ViewInstance } from 'react-native';
import {
  Popper,
  type NativePopperInstance,
  type NativePopperModifier,
  type PopperProps,
} from '@mui/material';
import DeepPopper, {
  type PopperRootProps,
  type PopperRootSlotPropsOverrides,
} from '@mui/material/Popper';
import classes from '@mui/material/Popper/popperClasses';
declare module '@mui/material/Popper' {
  interface PopperRootSlotPropsOverrides {
    trackingName?: string;
  }
}
const anchor = React.createRef<ViewInstance>(),
  root = React.createRef<ViewInstance>(),
  instance = React.createRef<NativePopperInstance>();
const modifiers: NativePopperModifier[] = [
  { name: 'offset', options: { offset: [0, 8] } },
  {
    name: 'inspect',
    enabled: true,
    phase: 'afterWrite',
    fn: ({ state }) => {
      void state.elements.popper.measureInWindow;
      void state.placement;
    },
  },
];
const Slot = React.forwardRef<ViewInstance, PopperRootProps & PopperRootSlotPropsOverrides>(
  ({ ownerState, sx, trackingName, ...props }, ref) => <View {...props} ref={ref} />,
);
export const fixture = (
  <View ref={anchor}>
    <Popper
      open
      ref={root}
      popperRef={instance}
      anchorEl={() => anchor.current}
      modifiers={modifiers}
      slots={{ root: Slot }}
      slotProps={{
        root: (ownerState) => ({
          trackingName: 'popup',
          accessibilityLabel: ownerState.open ? 'Open' : 'Closed',
        }),
      }}
    >
      {({ placement, TransitionProps }) => (
        <Text>
          {placement}
          {String(TransitionProps?.in)}
        </Text>
      )}
    </Popper>
    <DeepPopper
      open
      disablePortal
      anchorEl={{ getBoundingClientRect: () => ({ x: 10, y: 20, width: 100, height: 40 }) }}
    />
  </View>
);
instance.current?.forceUpdate();
instance.current?.update();
instance.current?.setOptions((options) => ({ ...options, placement: 'top-start' }));
const Custom = React.forwardRef<ViewInstance, { open: boolean; accountId: string }>(
  ({ accountId }, ref) => (
    <View ref={ref}>
      <Text>{accountId}</Text>
    </View>
  ),
);
export const custom = <DeepPopper component={Custom} open accountId="account" />;
const props: PopperProps<typeof Custom> = { open: true, component: Custom, accountId: 'typed' };
void props;
void classes.root;
// @ts-expect-error Native Popper root refs are actual native views.
export const domRef = <Popper open ref={React.createRef<HTMLDivElement>()} />;
// @ts-expect-error A DOM anchor is not a native View or a native virtual element.
export const domAnchor = <Popper open anchorEl={document.body} />;
// @ts-expect-error Native replacement components cannot be browser intrinsic tags.
export const domRoot = <Popper open component="div" />;
// @ts-expect-error Typed replacement components retain their required props.
export const missingCustomProp = <DeepPopper component={Custom} open />;

const browserLikeNode = {
  nodeType: 1 as const,
  getBoundingClientRect: () => ({ x: 0, y: 0, width: 100, height: 40 }),
};
// @ts-expect-error A structurally DOM-like node is not a native virtual anchor.
export const browserLikeAnchor = <Popper open anchorEl={browserLikeNode} />;
// @ts-expect-error Foreign node refs cannot replace an actual native view ref.
export const browserLikeRef = <Popper open ref={React.createRef<typeof browserLikeNode>()} />;
