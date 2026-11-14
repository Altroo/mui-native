/* View prop normalization and text ancestry adapt MIT-licensed React Native 0.88.1 View.js.
 * Copyright (c) Meta Platforms, Inc. and affiliates. See NOTICE and structural-observation-baseline.json.
 * Native host: Copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT */
// Transparent first-party owned host. Public refs remain genuine native refs.
import {
  forwardRef,
  memo,
  useInsertionEffect,
  useContext,
  type ComponentType,
  type RefAttributes,
  type ReactNode,
  type NamedExoticComponent,
  type PropsWithoutRef,
} from 'react';
import {
  unstable_TextAncestorContext as TextAncestorContext,
  type ViewProps,
  type ViewInstance,
} from 'react-native';
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
// The codegen host accepts native attributes directly. Preserve View's public
// alias precedence while forwarding the owned programme and native style intact.
function normalizedViewProps(input: StructuralProps): StructuralProps {
  const {
    accessibilityState,
    accessibilityValue,
    'aria-busy': ariaBusy,
    'aria-checked': ariaChecked,
    'aria-disabled': ariaDisabled,
    'aria-expanded': ariaExpanded,
    'aria-hidden': ariaHidden,
    'aria-label': ariaLabel,
    'aria-labelledby': ariaLabelledBy,
    'aria-live': ariaLive,
    'aria-selected': ariaSelected,
    'aria-valuemax': ariaValueMax,
    'aria-valuemin': ariaValueMin,
    'aria-valuenow': ariaValueNow,
    'aria-valuetext': ariaValueText,
    id,
    tabIndex,
    ...otherProps
  } = input;

  const resolvedProps = otherProps as {
    -readonly [K in keyof StructuralProps]: StructuralProps[K];
  };

  const parsedAriaLabelledBy = ariaLabelledBy?.split(/\s*,\s*/g);
  if (parsedAriaLabelledBy !== undefined) {
    resolvedProps.accessibilityLabelledBy = parsedAriaLabelledBy;
  }

  if (ariaLabel !== undefined) {
    resolvedProps.accessibilityLabel = ariaLabel;
  }

  if (ariaLive !== undefined) {
    resolvedProps.accessibilityLiveRegion = ariaLive === 'off' ? 'none' : ariaLive;
  }

  if (ariaHidden !== undefined) {
    resolvedProps.accessibilityElementsHidden = ariaHidden;
    if (ariaHidden === true) {
      resolvedProps.importantForAccessibility = 'no-hide-descendants';
    }
  }

  if (id !== undefined) {
    resolvedProps.nativeID = id;
  }

  if (tabIndex !== undefined) {
    resolvedProps.focusable = !tabIndex;
  }

  if (
    accessibilityState != null ||
    ariaBusy != null ||
    ariaChecked != null ||
    ariaDisabled != null ||
    ariaExpanded != null ||
    ariaSelected != null
  ) {
    resolvedProps.accessibilityState = {
      busy: ariaBusy ?? accessibilityState?.busy,
      checked: ariaChecked ?? accessibilityState?.checked,
      disabled: ariaDisabled ?? accessibilityState?.disabled,
      expanded: ariaExpanded ?? accessibilityState?.expanded,
      selected: ariaSelected ?? accessibilityState?.selected,
    };
  }

  if (
    accessibilityValue != null ||
    ariaValueMax != null ||
    ariaValueMin != null ||
    ariaValueNow != null ||
    ariaValueText != null
  ) {
    resolvedProps.accessibilityValue = {
      max: ariaValueMax ?? accessibilityValue?.max,
      min: ariaValueMin ?? accessibilityValue?.min,
      now: ariaValueNow ?? accessibilityValue?.now,
      text: ariaValueText ?? accessibilityValue?.text,
    };
  }

  return resolvedProps;
}

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
    const hasTextAncestor = useContext(TextAncestorContext);
    const view = <Native {...normalizedViewProps(props)} ref={ref} />;
    return hasTextAncestor ? (
      <TextAncestorContext.Provider value={false}>{view}</TextAncestorContext.Provider>
    ) : (
      view
    );
  }),
);
