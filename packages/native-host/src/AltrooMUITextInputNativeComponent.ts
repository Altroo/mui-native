/* Copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT */
import { codegenNativeComponent, type ViewProps } from 'react-native';
/** Native registration only; the adapter retains the platform TextInput view configs. */
export interface NativeProps extends ViewProps {}
export default codegenNativeComponent<NativeProps>('AltrooMUITextInput', { interfaceOnly: true });
