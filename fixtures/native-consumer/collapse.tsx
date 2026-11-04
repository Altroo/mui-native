import React from 'react';
import { View, Text, type ViewInstance } from 'react-native';
import { Collapse, type CollapseProps, type CollapseOwnerState } from '@altroo/mui-native';
import DeepCollapse, {
  collapseClasses,
  getCollapseUtilityClass,
  type CollapseSlotsAndSlotProps,
  type NativeCollapseSlotProps,
} from '@altroo/mui-native/Collapse';
const ref = React.createRef<ViewInstance>();
const callbacks: CollapseProps = {
  onEnter: (node, appearing) => {
    node.measure(() => {});
    void appearing;
  },
  timeout: 'auto',
  orientation: 'horizontal',
  collapsedSize: '12px',
};
const slots: CollapseSlotsAndSlotProps = {
  slotProps: {
    root: (owner: CollapseOwnerState) => ({ ref, accessibilityLabel: String(owner.orientation) }),
    wrapper: { testID: 'wrapper' },
  },
};
export const example = (
  <Collapse {...callbacks} {...slots} in ref={ref}>
    <Text>Details</Text>
    <View />
  </Collapse>
);
export const deep = (
  <DeepCollapse in={false} mountOnEnter unmountOnExit sx={{ mt: 1 }}>
    Content
  </DeepCollapse>
);
export const names = [collapseClasses.horizontal, getCollapseUtilityClass('entered')];
// @ts-expect-error Native callbacks and refs do not expose DOM style mutation.
export const invalid = <Collapse ref={React.createRef<HTMLDivElement>()} />;

const NativeSlot = React.forwardRef<ViewInstance, NativeCollapseSlotProps>(function NativeSlot(
  { as: Leaf = View, ownerState: _owner, ...props },
  slotRef,
) {
  return <Leaf {...props} ref={slotRef} />;
});
export const composedSlots = (
  <Collapse
    component={View}
    slots={{ root: NativeSlot, wrapper: NativeSlot }}
    slotProps={{
      root: { component: View, id: 'native-collapse' },
      wrapper: { component: View },
      wrapperInner: { as: View },
    }}
  />
);
