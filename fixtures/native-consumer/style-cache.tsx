// Copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT
import { View, Text } from 'react-native';
import {
  Button,
  styled,
  NativeStyleCacheProvider,
  createNativeStyleCache,
  createTheme,
  type NativeStyleCache,
} from '@mui/material';
import {
  type SharedComponentStyleArgs,
  type ComponentStyleArgs,
  NativeStyleCacheProvider as SystemCacheProvider,
  createNativeStyleCache as createSystemCache,
} from '@mui/system';

const appCache: NativeStyleCache = createNativeStyleCache({ key: 'consumer' });
const isolated = createSystemCache({ key: 'isolated', prepend: true });

export const nativeCacheConsumer = (
  <NativeStyleCacheProvider value={appCache}>
    <Button>Shared history</Button>
    <SystemCacheProvider value={isolated}>
      <Button>Independent history</Button>
    </SystemCacheProvider>
  </NativeStyleCacheProvider>
);

export function disposeUnmountedConsumerCaches() {
  appCache.reset();
  appCache.dispose();
  isolated.dispose();
}

// @ts-expect-error Native cache keys are mandatory.
export const missingCacheKey = createNativeStyleCache({});
// @ts-expect-error Providers require a cache, not a theme.
export const invalidCacheProvider = <NativeStyleCacheProvider value={{ direction: 'rtl' }} />;

export function sharedCallbackState(input: SharedComponentStyleArgs) {
  // @ts-expect-error A generic styled component may omit ownerState or supply a primitive.
  const unsafe = input.ownerState.disabled;
  return unsafe;
}

const callbackTheme = createTheme();
export const genericCallbackArguments: SharedComponentStyleArgs[] = [
  { theme: callbackTheme },
  { theme: callbackTheme, ownerState: 'application-value' },
];

export function nativeCallbackState(input: ComponentStyleArgs) {
  return input.ownerState.disabled;
}

const NativeTarget = styled(View)({ opacity: 0.5 });
export const supportedStyledTarget = <NativeTarget as={Text}>Native text</NativeTarget>;
// @ts-expect-error React Native has no DOM span host; pass the native Text component.
export const unsupportedStyledTarget = <NativeTarget as="span" />;
