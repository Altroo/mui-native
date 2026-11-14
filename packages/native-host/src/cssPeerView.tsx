// Copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT
// Immutable backend selection. Plain CSS peers never acquire a resolver lease.
import {
  forwardRef,
  type ForwardRefExoticComponent,
  type PropsWithoutRef,
  type RefAttributes,
} from 'react';
import { View, type ViewInstance, type ViewProps } from 'react-native';
import { requireOwnedStyleProfile, supportsPeerStyleIdentity } from './ownedStyleBootstrap';
import type { StructuralView } from './ownedStructuralHost';
import type { StructuralStyleActivation } from './structuralStyleActivation';
import type { OwnedProgramme, CSSPeerIdentity } from './ownedStyleTypes';
const runtime = supportsPeerStyleIdentity()
  ? Object.freeze({
      Host: (require('./ownedStructuralHost') as typeof import('./ownedStructuralHost'))
        .OwnedStructuralHost,
      profile: requireOwnedStyleProfile(),
      Native: (
        require('./AltrooMUIStructuralViewNativeComponent') as typeof import('./AltrooMUIStructuralViewNativeComponent')
      ).default as StructuralView,
    })
  : undefined;
export type CSSSelectorPresentation = Readonly<{
  Host: typeof import('./ownedStructuralHost').OwnedStructuralHost;
  Native: StructuralView;
  activation: Pick<StructuralStyleActivation, 'acquire'>;
  programme: OwnedProgramme;
}>;
export const supportsCSSPeerView = runtime !== undefined;
type Props = ViewProps & {
  identity: CSSPeerIdentity | null;
  selector?: CSSSelectorPresentation | undefined;
};
export const CSSPeerView: ForwardRefExoticComponent<
  PropsWithoutRef<Props> & RefAttributes<ViewInstance>
> = forwardRef<ViewInstance, Props>(function CSSPeerView({ identity, selector, ...props }, ref) {
  const Host = runtime?.Host ?? selector?.Host;
  const Native = runtime?.Native ?? selector?.Native;
  const programme =
    selector?.programme ??
    (runtime ? { schema: 4 as const, profile: runtime.profile, peer: identity } : undefined);
  return Host && Native && programme ? (
    <Host
      {...props}
      ref={ref}
      Native={Native}
      normalPaddingBottom={0}
      lastPaddingBottom={0}
      activation={selector?.activation}
      ownedProgramme={programme}
    />
  ) : (
    <View {...props} ref={ref} />
  );
});
