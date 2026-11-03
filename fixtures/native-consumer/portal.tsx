import React from 'react';
import { View, Text, type ViewInstance } from 'react-native';
import { Portal, type NativePortalHandle, type PortalProps } from '@mui/material';
import DeepPortal, {
  type NativePortalInlineHandle,
  type NativePortalBounds,
} from '@mui/material/Portal';
const container = React.createRef<ViewInstance>(),
  portal = React.createRef<NativePortalHandle>(),
  inline = React.createRef<NativePortalInlineHandle>();
const props: PortalProps = {
  container: () => container.current,
  layer: 10,
  onContainerLayout: (bounds: NativePortalBounds | null) => void bounds?.width,
};
export const fixture = (
  <View ref={container}>
    <Portal {...props} ref={portal}>
      <Text>Popup</Text>
    </Portal>
    <DeepPortal disablePortal ref={inline}>
      <View />
    </DeepPortal>
  </View>
);
portal.current?.measureInWindow((x, y, width, height) => void [x, y, width, height]);
portal.current?.node?.measure(() => {});
const dynamic: boolean = Boolean(Math.random());
export const dynamicFixture = (
  <Portal
    disablePortal={dynamic}
    ref={React.createRef<NativePortalHandle | NativePortalInlineHandle>()}
  />
);
// @ts-expect-error Portal uses native container instances, not DOM elements.
export const browserContainer = <Portal container={document.body} />;
// @ts-expect-error Default Portal exposes a native Portal handle, not a DOM ref.
export const browserRef = <Portal ref={React.createRef<HTMLDivElement>()} />;
// @ts-expect-error Default mode cannot claim a native View ref.
export const invalidRef = <Portal ref={container} />;
