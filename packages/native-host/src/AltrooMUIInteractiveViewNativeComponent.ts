import type React from 'react';
import {
  codegenNativeComponent,
  codegenNativeCommands,
  type HostComponent,
  type ViewProps,
  type ColorValue,
  type CodegenTypes,
} from 'react-native';
type KeyData = Readonly<{
  key: string;
  code: string;
  altKey: boolean;
  ctrlKey: boolean;
  metaKey: boolean;
  shiftKey: boolean;
  repeat: boolean;
  isComposing: boolean;
  isCanceled: boolean;
}>;
type DescendantKeyData = Readonly<{
  key: string;
  code: string;
  altKey: boolean;
  ctrlKey: boolean;
  metaKey: boolean;
  shiftKey: boolean;
  repeat?: boolean;
  isComposing?: boolean;
  isCanceled?: boolean;
  muiKeySource?: string;
  isEditable?: boolean;
}>;
type FocusData = Readonly<{ target: CodegenTypes.Int32 }>;
export interface NativeProps extends ViewProps {
  nativeFocusable?: CodegenTypes.WithDefault<boolean, true>;
  nativeTabIndex?: CodegenTypes.WithDefault<CodegenTypes.Int32, 0>;
  managedKeys?: ReadonlyArray<string>;
  managedDescendantKeys?: ReadonlyArray<string>;
  onKeyDown?: CodegenTypes.BubblingEventHandler<DescendantKeyData>;
  onKeyUp?: CodegenTypes.BubblingEventHandler<DescendantKeyData>;
  rippleEnabled?: CodegenTypes.WithDefault<boolean, false>;
  rippleColor?: ColorValue;
  rippleRadius?: CodegenTypes.WithDefault<CodegenTypes.Float, -1>;
  rippleForeground?: CodegenTypes.WithDefault<boolean, false>;
  rippleBorderless?: CodegenTypes.WithDefault<boolean, false>;
  onMUIFocus?: CodegenTypes.BubblingEventHandler<FocusData>;
  onMUIBlur?: CodegenTypes.BubblingEventHandler<FocusData>;
  onMUIKeyDown?: CodegenTypes.BubblingEventHandler<KeyData>;
  onMUIKeyUp?: CodegenTypes.BubblingEventHandler<KeyData>;
}
type NativeType = HostComponent<NativeProps>;
interface NativeCommands {
  focus: (viewRef: React.ElementRef<NativeType>) => void;
  blur: (viewRef: React.ElementRef<NativeType>) => void;
  setPressed: (viewRef: React.ElementRef<NativeType>, pressed: boolean) => void;
  setHotspot: (
    viewRef: React.ElementRef<NativeType>,
    x: CodegenTypes.Double,
    y: CodegenTypes.Double,
  ) => void;
}
export const Commands = codegenNativeCommands<NativeCommands>({
  supportedCommands: ['focus', 'blur', 'setPressed', 'setHotspot'],
});
export default codegenNativeComponent<NativeProps>('AltrooMUIInteractiveView');
