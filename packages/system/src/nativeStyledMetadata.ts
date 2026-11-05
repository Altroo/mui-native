// Copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT
import type { StyleProp } from 'react-native';
import type { NativeStyle, StyleContext } from './sx';

export type NativePreparedNode = {
  readonly base: Readonly<Record<string, unknown>>;
  readonly conditions?: ReadonlyMap<string, readonly NativePreparedNode[] | undefined>;
};
export type NativeSelectorContext = Pick<
  StyleContext,
  | 'classes'
  | 'states'
  | 'descendantClasses'
  | 'descendantOnly'
  | 'slot'
  | 'width'
  | 'protectPhysicalGeometry'
>;
export type NativePreparedSheet = {
  readonly nodes: readonly NativePreparedNode[];
  readonly context: NativeSelectorContext;
  readonly ancestor?: boolean;
};
interface NativeStyledStyleDescriptor {
  readonly sheets: readonly NativePreparedSheet[];
  readonly authored: StyleProp<NativeStyle>;
  readonly hasAuthoredStyle: boolean;
}
// Library-created arrays are the only keys. Metadata never appears on native
// payloads or caller objects, and retained sheets are never changed by defaults.
export const nativeStyledStyles = new WeakMap<object, NativeStyledStyleDescriptor>();
interface StyleInput {
  readonly sheets: readonly NativePreparedSheet[];
  readonly style: StyleProp<NativeStyle>;
  readonly supplied: boolean;
}
function separateStyle(style: StyleProp<NativeStyle>, supplied: boolean): StyleInput {
  const descriptor = style && typeof style === 'object' ? nativeStyledStyles.get(style) : undefined;
  if (descriptor) {
    const nested = separateStyle(descriptor.authored, descriptor.hasAuthoredStyle);
    return { ...nested, sheets: [...descriptor.sheets, ...nested.sheets] };
  }
  if (Array.isArray(style)) {
    const nested = style.map((layer) => separateStyle(layer, true));
    const sheets = nested.flatMap((layer) => layer.sheets);
    return { sheets, style: sheets.length ? nested.map((layer) => layer.style) : style, supplied };
  }
  return { sheets: [], style, supplied };
}
interface NativeStyleProps {
  style?: StyleProp<NativeStyle> | undefined;
}
interface NativeRootPreparation<Props> {
  readonly props: Props;
  readonly prepared:
    | {
        readonly sheets: readonly NativePreparedSheet[];
        readonly fallback: StyleProp<NativeStyle>;
      }
    | undefined;
}
/** Root-local split before default resolution; do not send prepared CSS through public props. */
export function separateNativeRootProps<Props extends NativeStyleProps>(
  props: Props,
): NativeRootPreparation<Props> {
  const descriptor = Object.getOwnPropertyDescriptor(props, 'style');
  if (descriptor && !descriptor.enumerable) {
    // Source prop spreads ignore hidden styles. Omit the carrier without
    // observing an accessor or retaining its prepared CSS for the final root.
    const descriptors = Object.getOwnPropertyDescriptors(props);
    delete descriptors.style;
    return { props: Object.create(Object.getPrototypeOf(props), descriptors), prepared: undefined };
  }
  const supplied = descriptor !== undefined;
  const style = supplied ? props.style : undefined;
  const separated = separateStyle(style, supplied);
  // An accessor has already been observed while checking for prepared CSS.
  // Cache that value so the following default spread does not invoke it again;
  // ordinary data props retain their original identity.
  if (!separated.sheets.length && (!descriptor || 'value' in descriptor))
    return { props, prepared: undefined };
  // Keep other accessors lazy, and replace this one already-observed style value.
  // In particular, deleting absent style allows defaultProps.style to apply;
  // explicit undefined and null retain their distinct source presence semantics.
  const descriptors = Object.getOwnPropertyDescriptors(props);
  if (separated.supplied)
    descriptors.style = {
      value: separated.style,
      enumerable: descriptor?.enumerable ?? false,
      writable: true,
      configurable: true,
    };
  else delete descriptors.style;
  const clean: Props = Object.create(Object.getPrototypeOf(props), descriptors);
  return {
    props: clean,
    prepared: separated.sheets.length
      ? Object.freeze({ sheets: Object.freeze(separated.sheets), fallback: style })
      : undefined,
  };
}
/** Reattach immutable sheets outside resolved public props for the final CSS root resolver. */
export function restoreNativeRootStyle<Props extends NativeStyleProps>(
  input: NativeRootPreparation<Props>,
  props: Props,
): StyleProp<NativeStyle> {
  const authored = props.style;
  if (!input.prepared) return authored;
  // This remains a valid eager style array. Participating roots consume its
  // descriptor, recomputing the final CSS cascade with the resolved inline style.
  const style = [input.prepared.fallback, authored];
  nativeStyledStyles.set(
    style,
    Object.freeze({
      sheets: input.prepared.sheets,
      authored,
      hasAuthoredStyle: Object.hasOwn(props, 'style'),
    }),
  );
  return style;
}
