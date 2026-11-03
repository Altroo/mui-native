import { codegenNativeComponent, type ViewProps, type CodegenTypes } from 'react-native';
export type PickerOption = Readonly<{
  id: string;
  label: string;
  groupId: string;
  groupLabel: string;
  enabled: boolean;
  selected: boolean;
}>;
type SelectionData = Readonly<{
  sessionId: string;
  revision: string;
  optionId: string;
  selected: boolean;
}>;
type DismissData = Readonly<{ sessionId: string; reason: string }>;
type PresentationData = Readonly<{
  sessionId: string;
  state: string;
  reason: string;
  terminal: boolean;
}>;
export interface NativeProps extends ViewProps {
  active?: CodegenTypes.WithDefault<boolean, false>;
  sessionId?: string;
  revision?: string;
  options?: ReadonlyArray<PickerOption>;
  multiple?: CodegenTypes.WithDefault<boolean, false>;
  title?: string;
  doneText?: string;
  cancelText?: string;
  colorScheme?: CodegenTypes.WithDefault<'system' | 'light' | 'dark', 'system'>;
  onPickerSelection?: CodegenTypes.DirectEventHandler<SelectionData>;
  onPickerDismiss?: CodegenTypes.DirectEventHandler<DismissData>;
  onPickerPresentation?: CodegenTypes.DirectEventHandler<PresentationData>;
}
export default codegenNativeComponent<NativeProps>('AltrooMUINativePicker');
