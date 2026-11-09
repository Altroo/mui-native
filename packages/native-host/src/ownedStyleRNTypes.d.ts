// Copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT
// RN0.88.1 exposes these runtime Libraries paths with types:null. Bounded input
// declarations describe only the existing payload functions used by this codec.
declare module 'react-native/Libraries/Components/View/ReactNativeStyleAttributes' {
  const attributes: Record<string, unknown>;
  export default attributes;
  export const colorAttribute: unknown;
}
declare module 'react-native/Libraries/ReactNative/ReactFabricPublicInstance/ReactNativeAttributePayload' {
  export function create(
    props: { style: Record<string, unknown> },
    attributes: { style: Record<string, unknown> },
  ): Record<string, unknown> | null;
}
