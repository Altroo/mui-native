// Copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT
import { codegenNativeComponent, type ViewProps, type CodegenTypes } from 'react-native';
export interface NativeProps extends ViewProps {
  normalPaddingBottom?: CodegenTypes.WithDefault<CodegenTypes.Double, 16>;
  lastPaddingBottom?: CodegenTypes.WithDefault<CodegenTypes.Double, 24>;
  // Private owned-host metadata. Native schema/profile validation is mandatory.
  ownedProgramme?: CodegenTypes.UnsafeMixed;
}
export default codegenNativeComponent<NativeProps>('AltrooMUIStructuralView', {
  interfaceOnly: true,
});
