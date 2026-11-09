// Copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT
// Transparent first-party owned host. Public refs remain genuine native refs.
import {
  forwardRef,
  memo,
  useInsertionEffect,
  type ComponentType,
  type RefAttributes,
  type ReactNode,
  type NamedExoticComponent,
  type PropsWithoutRef,
} from 'react';
import type { ViewProps, ViewInstance } from 'react-native';
import type { StructuralStyleActivation } from './structuralStyleActivation';
import type { OwnedProgramme } from './ownedStyleTypes';
export type StructuralProps = ViewProps & {
  normalPaddingBottom: number;
  lastPaddingBottom: number;
  ownedProgramme?: OwnedProgramme | null;
};
export type StructuralView = ComponentType<StructuralProps & RefAttributes<ViewInstance>>;
export function usePrelayoutActivation(activation: Pick<StructuralStyleActivation, 'acquire'>) {
  useInsertionEffect(() => activation.acquire(), [activation]);
}
type OwnedHostProps = {
  activation: Pick<StructuralStyleActivation, 'acquire'>;
  Native: StructuralView;
  children?: ReactNode;
} & StructuralProps;
// Name the public RN ref contract; inference otherwise leaks a private RN path
// from this first-party source module into emitted declarations.
export const OwnedStructuralHost: NamedExoticComponent<
  PropsWithoutRef<OwnedHostProps> & RefAttributes<ViewInstance>
> = memo(
  forwardRef<ViewInstance, OwnedHostProps>(function OwnedStructuralHost(
    { activation, Native, ...props },
    ref,
  ) {
    usePrelayoutActivation(activation);
    return <Native {...props} ref={ref} />;
  }),
);
