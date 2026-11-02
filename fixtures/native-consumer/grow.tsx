import React from 'react';
import { View, type ViewInstance } from 'react-native';
import Grow, { type GrowProps } from '@mui/material/Grow';
import { Grow as RootGrow, Modal, Dialog } from '@mui/material';
const ref = React.createRef<ViewInstance>();
const props: GrowProps = { in: true, timeout: 'auto', children: <View />, ref };
export const automatic = (
  <Grow
    {...props}
    onEntered={(node, appearing) => {
      node.measure(() => {});
      const flag: boolean = appearing;
      void flag;
    }}
  />
);
export const phases = (
  <RootGrow
    in
    timeout={{ appear: 10, enter: 20, exit: 30 }}
    easing={{ enter: 'linear', exit: 'ease-out' }}
    ref={ref}
  >
    <View />
  </RootGrow>
);
export const modal = (
  <Modal open closeAfterTransition>
    <Grow in timeout="auto">
      <View />
    </Grow>
  </Modal>
);
const support: true = Grow.muiSupportAuto;
void support;
// @ts-expect-error Grow needs one ref-forwarding element.
export const invalid = <Grow in>text</Grow>;
export const browserRef = (
  // @ts-expect-error Native Grow does not expose a browser ref.
  <Grow in ref={React.createRef<HTMLDivElement>()}>
    <View />
  </Grow>
);

export const dialog = (
  <Dialog open slots={{ transition: Grow }}>
    <View />
  </Dialog>
);
