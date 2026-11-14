// Copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT
// Stable View backend; class carriers can change without replacing native state.
import {
  forwardRef,
  useMemo,
  type ForwardRefExoticComponent,
  type PropsWithoutRef,
  type RefAttributes,
} from 'react';
import type { ViewProps, ViewInstance } from 'react-native';
import {
  CSSPeerView,
  supportsCSSPeerView,
  type CSSSelectorPresentation,
} from '@altroo/mui-native-host/internal/css-peer';
import type { NativePreparedStyle } from './nativeStyledMetadata';
import { nativeCssPeerIdentity } from './nativeCssPeerIdentity';
type Props = ViewProps & {
  prepared: NativePreparedStyle;
  classNames: readonly string[];
  selector?: CSSSelectorPresentation | undefined;
};
export const NativeCssPeerView: ForwardRefExoticComponent<
  PropsWithoutRef<Props> & RefAttributes<ViewInstance>
> = forwardRef<ViewInstance, Props>(function NativeCssPeerView(
  { prepared, classNames, selector, ...props },
  ref,
) {
  const expanded = classNames.includes('Mui-expanded');
  const owner = selector?.programme.schema === 2 ? selector.programme.owner : undefined;
  const identity = useMemo(
    () => (supportsCSSPeerView ? nativeCssPeerIdentity(prepared, expanded, owner) : null),
    [prepared, expanded, owner],
  );
  const acceptedSelector =
    selector && supportsCSSPeerView && selector.programme.schema === 2 && !selector.programme.basis
      ? { ...selector, programme: { ...selector.programme, peer: identity } }
      : selector;
  return <CSSPeerView {...props} ref={ref} identity={identity} selector={acceptedSelector} />;
});
