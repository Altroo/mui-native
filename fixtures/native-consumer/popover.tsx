import React from 'react';
import { View, type ViewInstance } from 'react-native';
import Popover, {
  PopoverRoot,
  PopoverPaper,
  getOffsetTop,
  getOffsetLeft,
  type PopoverProps,
  type PopoverActions,
  type PopoverOrigin,
  type PopoverPosition,
  type PopoverReference,
  type PopoverVirtualElement,
  type PopoverOwnerState,
  type PopoverRootProps,
  type PopoverPaperProps,
  type PopoverSlotsAndSlotProps,
} from '@mui/material/Popover';
import { Popover as RootPopover, Grow } from '@mui/material';
const ref = React.createRef<ViewInstance>(),
  paperRef = React.createRef<ViewInstance>();
const action = React.createRef<PopoverActions>();
const virtual: PopoverVirtualElement = {
  nodeType: 1,
  getBoundingClientRect: () => ({ top: 20, left: 30, width: 40, height: 25 }),
};
const origin: PopoverOrigin = { horizontal: 'right', vertical: 'bottom' };
const point: PopoverPosition = { top: 40, left: 50 };
const reference: PopoverReference = 'anchorEl';
const props: PopoverProps = {
  open: true,
  ref,
  action,
  anchorEl: () => virtual,
  anchorReference: reference,
  anchorOrigin: origin,
  anchorPosition: point,
};
const Root = React.forwardRef<ViewInstance, PopoverRootProps>((props, ref) => (
  <PopoverRoot {...props} ref={ref} />
));
const Paper = React.forwardRef<ViewInstance, PopoverPaperProps>((props, ref) => (
  <PopoverPaper {...props} ref={ref} />
));
const slots: PopoverSlotsAndSlotProps = {
  slots: { root: Root, paper: Paper, transition: Grow },
  slotProps: {
    paper: (state: PopoverOwnerState) => ({
      ref: paperRef,
      elevation: state.elevation,
      sx: { p: 2 },
    }),
    transition: {
      onEntered: (view, appearing) => {
        view.measureInWindow(() => {});
        void appearing;
      },
    },
  },
};
export const content = (
  <Popover {...props} {...slots}>
    Literal content
  </Popover>
);
export const nativeAnchor = (
  <RootPopover open anchorEl={ref.current} marginThreshold={null}>
    <View />
  </RootPopover>
);
export function updatePosition() {
  action.current?.updatePosition();
}
const offsets: number[] = [
  getOffsetTop({ height: 20, width: 10 }, 'center'),
  getOffsetLeft({ width: 20 }, 2),
];
void offsets;
// @ts-expect-error DOM containers are not native Popover targets.
export const browserContainer = <Popover open container={{}} />;
// @ts-expect-error Popover forwards a native View ref.
export const browserRef = <Popover open ref={React.createRef<HTMLDivElement>()} />;
// @ts-expect-error Anchor rectangles require native/virtual geometry.
export const browserAnchor = <Popover open anchorEl={{ clientTop: 1 }} />;
