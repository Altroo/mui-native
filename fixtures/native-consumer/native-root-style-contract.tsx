// Copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT
import { View } from 'react-native';
import { useNativeRootProps } from '@altroo/mui-native-system';

export function NarrowStaticRoot() {
  const result = useNativeRootProps({ props: { style: { opacity: 0.3 } }, name: 'MuiProbe' });
  // @ts-expect-error The separate retained carrier is a full StyleProp, not the original narrow object.
  const unsafeOpacity: number = result.style.opacity;
  return { props: result.props, valid: <View style={result.style} />, rejected: unsafeOpacity };
}
export function NativeCallbackRoot() {
  const result = useNativeRootProps({
    props: {
      style: (state: { pressed: boolean; disabled?: boolean | undefined }) => ({
        opacity: state.pressed ? 0.3 : 1,
      }),
    },
    name: 'MuiProbe',
  });
  const valid = <View style={result.style({ pressed: true, disabled: undefined })} />;
  // @ts-expect-error Preserve the callback's required state shape rather than infer Material's state into System.
  const rejected = result.style({ focused: true });
  return { valid, rejected };
}
export function FrozenTupleRoot() {
  const props = { style: [{ opacity: 0.3 }, null] as const };
  const result = useNativeRootProps({ props, name: 'MuiProbe' });
  // @ts-expect-error The library may return a carrier array, not the caller's exact readonly tuple.
  const rejected: typeof props.style = result.style;
  return { valid: <View style={result.style} />, rejected };
}
