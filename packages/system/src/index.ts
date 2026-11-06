export * from './theme';
export * from './sx';
export * from './diagnostics';
export * from './provider';
export * from './colorManipulator';
export { createSpacing } from './spacing';
export { createBreakpoints, breakpointKeys } from './breakpoints';

export {
  inheritedTextStyle,
  getTextStyleInheritance,
  nativeStyleTextMetrics,
  applyNativeTextMetrics,
  nativeTextAlignmentStyle,
  nativeTextParagraphDirection,
  isNativeTextStyleProperty,
} from './nativeText';

export {
  DefaultPropsProvider,
  useDefaultProps,
  getThemeProps,
  resolveSlotProps,
  joinClassNames,
  mergeNativeStyles,
} from './defaultProps';
export type { DefaultPropsMap, SlotProps } from './defaultProps';

export { default as RtlProvider, useRtl } from './RtlProvider';
export type { RtlProviderProps } from './RtlProvider';

export * from './transitions';

export {
  NativeTextScope,
  NativeTextStyleContext,
  useNativeTextContext,
  nativeTextStyleContext,
  renderNativeTextChildren,
} from './textScope';
export type { NativeTextScopeValue, NativeTextScopeProps } from './textScope';

export { NativeIconStyleContext } from './iconContext';
export type { NativeIconStyle } from './iconContext';

export {
  nativeTextScopes,
  useNativeTextChildRoots,
  useNativeTextScopeRoot,
  useNativeTextRootRef,
  setNativeTextScopeParent,
} from './nativeTextRegistry';

/** @internal Keep prepared root CSS outside genuine props across composing native defaults. */
export { separateNativeRootProps, restoreNativeRootStyle } from './nativeStyledMetadata';
