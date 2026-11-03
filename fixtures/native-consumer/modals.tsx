import React from 'react';
import { View, Text, Pressable, type ViewInstance } from 'react-native';
import Modal, {
  type ModalProps,
  type ModalRootProps,
  type ModalOwnerState,
} from '@mui/material/Modal';
import Backdrop, { type BackdropProps } from '@mui/material/Backdrop';
import Dialog, { type DialogProps } from '@mui/material/Dialog';
import { Modal as RootModal, Backdrop as RootBackdrop } from '@mui/material';
const root = React.createRef<ViewInstance>(),
  content = React.createRef<ViewInstance>();
const Root = React.forwardRef<ViewInstance, ModalRootProps>(function Root(
  { ownerState, sx, ...props },
  ref,
) {
  return <View {...props} ref={ref} accessibilityLabel={ownerState?.open ? 'Open' : 'Closed'} />;
});
const BackdropSlot = React.forwardRef<ViewInstance, BackdropProps>(function Custom(
  { open, invisible, sx, onClick, ...props },
  ref,
) {
  return <Pressable {...props} ref={ref} />;
});
const close: NonNullable<ModalProps['onClose']> = (_event, reason) => {
  const value: 'backdropClick' | 'escapeKeyDown' = reason;
  void value;
};
const callbacks: NonNullable<ModalProps['slotProps']> = {
  root: (state: ModalOwnerState) => ({ testID: state.exited ? 'exited' : 'mounted' }),
  backdrop: () => ({ ref: root, invisible: true }),
};
export const native = (
  <Modal
    open
    ref={root}
    initialFocusRef={content}
    returnFocusRef={content}
    onClose={close}
    slots={{ root: Root, backdrop: BackdropSlot }}
    slotProps={callbacks}
  >
    <View ref={content}>
      <Text>Content</Text>
    </View>
  </Modal>
);
export const inline = (
  <RootModal open disablePortal keepMounted>
    <View />
  </RootModal>
);
export const backdrop = <RootBackdrop open invisible onClick={() => {}} />;
export const dialog = (
  <Dialog
    open
    ref={root}
    slotProps={{
      paper: { ref: content },
      root: { testID: 'root' },
      container: (state) => ({ testID: state.fullScreen ? 'full' : 'normal' }),
    }}
  >
    <Text>Dialog</Text>
  </Dialog>
);
const props: DialogProps = { open: true };
void props;
void Backdrop;
// @ts-expect-error Modal requires a single content element.
export const invalidChild = <Modal open>text</Modal>;
export const browserContainer = (
  // @ts-expect-error Browser containers are not native modal targets.
  <Modal open container={{}}>
    <View />
  </Modal>
);
export const browserRef = (
  // @ts-expect-error Browser root refs are not native View refs.
  <Modal open ref={React.createRef<HTMLDivElement>()}>
    <View />
  </Modal>
);
