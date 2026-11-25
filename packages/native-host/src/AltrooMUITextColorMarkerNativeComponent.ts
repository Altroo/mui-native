// Copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT
// Private virtual metadata. This component never creates a platform View.
import { codegenNativeComponent, type ViewProps, type CodegenTypes } from 'react-native';
export interface NativeProps extends ViewProps {
  colorProgramme?: CodegenTypes.UnsafeMixed;
  metricProgramme?: CodegenTypes.UnsafeMixed;
  fontProgramme?: CodegenTypes.UnsafeMixed;
}
export default codegenNativeComponent<NativeProps>('AltrooMUITextColorMarker', {
  interfaceOnly: true,
});
