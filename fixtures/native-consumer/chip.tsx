import React from 'react';
import { View, Text, type ViewInstance } from 'react-native';
import { NativePressable } from '@altroo/mui-native-host';
import {
  Chip,
  type ChipProps,
  type NativeChipLabelProps,
  type ChipOwnerState,
  type ButtonBaseRootProps,
} from '@mui/material';
import DeepChip, { type ChipPropsColorOverrides } from '@mui/material/Chip';
import chipClasses, { getChipUtilityClass } from '@mui/material/Chip/chipClasses';
declare module '@mui/material/Chip' {
  interface ChipPropsColorOverrides {
    brand: true;
  }
  interface ChipPropsVariantOverrides {
    soft: true;
  }
  interface ChipPropsSizeOverrides {
    compact: true;
  }
  interface ChipRootSlotPropsOverrides {
    tag?: string;
  }
  interface ChipLabelSlotPropsOverrides {
    tag?: string;
  }
}
const root = React.createRef<ViewInstance>(),
  label = React.createRef<ViewInstance>();
const Label = React.forwardRef<ViewInstance, NativeChipLabelProps>(function Label(
  { ownerState, ...props },
  ref,
) {
  void ownerState;
  return <View {...props} ref={ref} />;
});
const Custom = React.forwardRef<ViewInstance, ButtonBaseRootProps & { tagName: string }>(
  function Custom({ tagName, ...props }, ref) {
    void tagName;
    return <NativePressable {...props} ref={ref} />;
  },
);
const props: ChipProps = {
  label: 'Filter',
  color: 'brand',
  variant: 'soft',
  size: 'compact',
  clickable: true,
  avatar: <Text>A</Text>,
  deleteIcon: <Text>X</Text>,
  onDelete: (event) => {
    event.persist();
    event.stopPropagation();
    if ('actionName' in event.nativeEvent) event.nativeEvent.actionName.toUpperCase();
    void event.nativeEvent;
  },
  slots: { label: Label },
  slotProps: {
    root: (owner) => ({
      tag: owner.color,
      sx: [{ mx: 1 }, (theme) => ({ mb: theme.spacing(1) })],
      style: (state) => ({ opacity: state.focusVisible ? 1 : 0.9 }),
    }),
    label: (owner) => ({ ref: label, tag: owner.size, sx: { color: 'primary.main' } }),
  },
};
export const chips = (
  <View>
    <Chip {...props} ref={root} />
    <DeepChip label="Remove" onDelete={(event) => event.preventDefault()} />
    <Chip
      component={Custom}
      tagName="native"
      label="Custom"
      onClick={(event) => event.preventDefault()}
    />
  </View>
);
root.current?.focus();
void [chipClasses, getChipUtilityClass('root')];
const color: ChipPropsColorOverrides = { brand: true };
void color;
// @ts-expect-error Custom native components retain required props.
export const missing = <Chip component={Custom} label="Missing" />;
// @ts-expect-error Chip content is supplied through label rather than children.
export const children = <Chip children={<Text>Wrong</Text>} />;
// @ts-expect-error Native Chip refs are ViewInstance rather than DOM nodes.
export const browserRef = <Chip ref={React.createRef<HTMLDivElement>()} />;
// @ts-expect-error Native custom components cannot be HTML tag strings.
export const browserRoot = <Chip component="div" label="Wrong" />;
