import { type GestureResponderEvent, type TextInputProps } from 'react-native';
import {
  createTheme,
  TextField,
  Button,
  useThemeProps,
  getThemeProps,
  mergeSlotProps,
} from '@mui/material';
import DefaultPropsProvider, { useDefaultProps } from '@mui/material/DefaultPropsProvider';
import SystemDefaults from '@mui/system/DefaultPropsProvider';
import useSystemThemeProps from '@mui/system/useThemeProps';
import { mergeSlotProps as deepMergeSlotProps } from '@mui/material/utils';
const theme = createTheme({
  components: {
    mergeClassNameAndStyle: true,
    MuiButton: { defaultProps: { size: 'small' } },
    MuiTextField: { defaultProps: { slotProps: { htmlInput: { placeholder: 'Default' } } } },
  },
});
export const slot = deepMergeSlotProps<TextInputProps>({ placeholder: 'App' }, { editable: false });
const ownerSlot = mergeSlotProps(
  (state: { disabled: boolean; id?: string }) => ({
    editable: !state.disabled,
    nativeID: state.id,
  }),
  { placeholder: 'Default' },
);
const result = ownerSlot({ disabled: true });
export const editable: boolean = result.editable;
export const props = getThemeProps({
  props: { size: undefined as 'small' | 'large' | undefined },
  theme,
  name: 'MuiButton',
});
function Probe() {
  const a = useDefaultProps({
    props: { size: undefined as string | undefined },
    name: 'MuiButton',
  });
  const b = useThemeProps({ props: { label: undefined as string | undefined }, name: 'Custom' });
  const c = useSystemThemeProps({
    props: { disabled: undefined as boolean | undefined },
    name: 'Custom',
  });
  return (
    <Button
      disabled={c.disabled}
      size={a.size === 'small' ? 'small' : 'large'}
      accessibilityLabel={b.label}
    />
  );
}
export const content = (
  <SystemDefaults value={theme.components}>
    <DefaultPropsProvider value={{ MuiButton: { defaultProps: { size: 'small' } } }}>
      <Probe />
      <TextField
        label="Name"
        slotProps={{
          htmlInput: (state) => ({
            editable: !state.disabled,
            testID: state.focused ? 'focused' : 'idle',
          }),
          inputLabel: (state) => ({ color: state.error ? 'error' : 'primary' }),
          formHelperText: (state) => ({ nativeID: state.focused ? 'active' : 'inactive' }),
        }}
      />
    </DefaultPropsProvider>
  </SystemDefaults>
);
export const eventSlot = mergeSlotProps(
  { onPress: (event: GestureResponderEvent) => event.nativeEvent.pageX },
  { onPress: (event: GestureResponderEvent) => event.nativeEvent.pageY },
);
// @ts-expect-error TextField callback state is typed, not an arbitrary bag.
export const bad = <TextField slotProps={{ htmlInput: (state) => ({ value: state.missing }) }} />;
// @ts-expect-error Native input-slot values must use native string types.
export const browserSlot = <TextField slotProps={{ htmlInput: (_state) => ({ value: 42 }) }} />;

const absentExternal = deepMergeSlotProps<TextInputProps>(undefined, { editable: false });
export const stillNative: boolean | undefined = absentExternal.editable;
