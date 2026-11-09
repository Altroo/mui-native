// Copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT
// Pinned React 19.3 / react-is 19.3 interop only; never Fiber/renderer state.
// React.memo creates own data kind/type fields. Its public MemoExoticComponent
// type is readonly. Inspect descriptors without invoking arbitrary metadata
// accessors, constructing diagnostic elements or observing defaultProps/names.
const { Memo } = require('react-is') as { Memo: symbol };
export function nativeMemoType(value: object): unknown {
  const kind = Object.getOwnPropertyDescriptor(value, '$$typeof');
  if (!kind || !('value' in kind) || kind.value !== Memo) return;
  const type = Object.getOwnPropertyDescriptor(value, 'type');
  return type && 'value' in type ? type.value : undefined;
}
