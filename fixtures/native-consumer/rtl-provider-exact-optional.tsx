// Copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT
import React from 'react';
import { RtlProvider as Root, useRtl as rootUseRtl } from '@mui/system';
import RtlProvider, { useRtl } from '@mui/system/RtlProvider';
import NativeProvider from '@altroo/mui-native-system/RtlProvider';
import type { RtlProviderProps } from '@altroo/mui-native-system';

// Checked against installed declarations with exactOptionalPropertyTypes.
export const omitted: RtlProviderProps = {};
export const explicitUndefined: RtlProviderProps = { value: undefined, children: undefined };
export const callable: React.FC<RtlProviderProps> = RtlProvider;
export const nativeCallable: typeof RtlProvider = NativeProvider;
export const publicName: string | undefined = RtlProvider.displayName;
export const originalHook: () => boolean = useRtl;
export const rootHook: typeof useRtl = rootUseRtl;
export const values = (
  <Root value={false}>
    <RtlProvider value={undefined}>
      <NativeProvider value>{null}</NativeProvider>
    </RtlProvider>
  </Root>
);
// @ts-expect-error The public value is boolean or omitted, not a direction string.
export const invalidValue = <RtlProvider value="rtl" />;
// @ts-expect-error This context provider has no native or DOM host ref.
export const invalidRef = <RtlProvider ref={React.createRef()} />;
// @ts-expect-error Styling belongs to a rendering component, not the context provider.
export const invalidStyle = <RtlProvider style={{ direction: 'rtl' }} />;
