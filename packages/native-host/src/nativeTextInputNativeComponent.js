/* Copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT
 * This pinned adapter reuses React Native's text-input view attributes and commands.
 * See upstream/native-text-input.json for the reviewed private ABI. */
import { Platform } from 'react-native';
import * as registryApi from 'react-native/Libraries/NativeComponent/NativeComponentRegistry';
// The reviewed registry is Flow-only. Keep its small interop surface explicit
// while the public NativeTextInput facade supplies the editor's props/ref types.
const nativeRegistry =
  /** @type {{get: (name: string, config: () => object) => import('react').ComponentType<Record<string, unknown>>}} */ (
    registryApi
  );
let config;
let commands;
if (Platform.OS === 'android') {
  const core = require('react-native/Libraries/Components/TextInput/AndroidTextInputNativeComponent');
  config = core.__INTERNAL_VIEW_CONFIG;
  commands = core.Commands;
} else {
  const single = require('react-native/Libraries/Components/TextInput/RCTSingelineTextInputNativeComponent');
  const multi = require('react-native/Libraries/Components/TextInput/RCTMultilineTextInputNativeComponent');
  config = {
    ...single.__INTERNAL_VIEW_CONFIG,
    validAttributes: {
      ...single.__INTERNAL_VIEW_CONFIG.validAttributes,
      ...multi.__INTERNAL_VIEW_CONFIG.validAttributes,
    },
    bubblingEventTypes: {
      ...single.__INTERNAL_VIEW_CONFIG.bubblingEventTypes,
      ...multi.__INTERNAL_VIEW_CONFIG.bubblingEventTypes,
    },
    directEventTypes: {
      ...single.__INTERNAL_VIEW_CONFIG.directEventTypes,
      ...multi.__INTERNAL_VIEW_CONFIG.directEventTypes,
    },
  };
  commands = single.Commands;
}
// Reserve the name Commands for codegenNativeCommands in registration specs.
export const EditorCommands = commands;
export default nativeRegistry.get('AltrooMUITextInput', () => ({
  ...config,
  uiViewClassName: 'AltrooMUITextInput',
}));
