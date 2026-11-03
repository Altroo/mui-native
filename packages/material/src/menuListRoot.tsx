import React, { forwardRef } from 'react';
import { ScrollView, type ViewInstance, type ScrollViewProps } from 'react-native';
import { InteractiveView } from '@altroo/mui-native-host';
import type { NativeListRootProps } from './lists';
export interface MenuListRootProps
  extends NativeListRootProps,
    Omit<ScrollViewProps, 'ref' | 'style' | 'children'> {
  onNativeFocus?: ScrollViewProps['onFocus'];
  onNativeBlur?: ScrollViewProps['onBlur'];
  managedKeys?: readonly string[];
  nativeScrollable?: boolean;
  nativeScrollProps?: ScrollViewProps;
  nativeRootProps?: NativeListRootProps;
}
export const NativeMenuListRoot: React.ForwardRefExoticComponent<
  React.PropsWithoutRef<MenuListRootProps> & React.RefAttributes<ViewInstance>
> = forwardRef<ViewInstance, MenuListRootProps>(function NativeMenuListRoot(
  {
    nativeScrollable = false,
    nativeScrollProps,
    nativeRootProps,
    managedKeys,
    children,
    contentContainerStyle,
    stickyHeaderIndices,
    keyboardShouldPersistTaps,
    style,
    ...props
  },
  ref,
) {
  if (!nativeScrollable)
    return (
      <InteractiveView {...props} ref={ref} managedKeys={managedKeys} style={style}>
        {children}
      </InteractiveView>
    );
  const host = { ...props } as Record<string, unknown>;
  for (const key of Object.keys(nativeScrollProps ?? {})) delete host[key];
  const { sx: _sx, style: _style, children: _children, ...owner } = nativeRootProps ?? {};
  Object.assign(host, owner);
  return (
    <InteractiveView
      {...host}
      ref={ref}
      managedKeys={managedKeys}
      style={style}
      focusable={props.focusable ?? true}
      onFocus={props.onFocus}
      onBlur={props.onBlur}
      onNativeFocus={props.onNativeFocus}
      onNativeBlur={props.onNativeBlur}
      onKeyDown={props.onKeyDown}
      onKeyUp={props.onKeyUp}
      onKeyDownCapture={props.onKeyDownCapture}
      onKeyUpCapture={props.onKeyUpCapture}
      onFocusCapture={props.onFocusCapture}
      onBlurCapture={props.onBlurCapture}
    >
      <ScrollView
        {...nativeScrollProps}
        style={{ flexGrow: 1, flexShrink: 1 }}
        contentContainerStyle={contentContainerStyle}
        stickyHeaderIndices={stickyHeaderIndices}
        keyboardShouldPersistTaps={keyboardShouldPersistTaps}
        accessible={false}
        focusable={false}
        tabIndex={-1}
      >
        {children}
      </ScrollView>
    </InteractiveView>
  );
});
