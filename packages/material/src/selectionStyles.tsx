import React from 'react';
import { NativePressable } from '@altroo/mui-native-host';
import { View, StyleSheet, useWindowDimensions, type StyleProp } from 'react-native';
import {
  resolveSx,
  isNativeTextStyleProperty,
  type NativeStyle,
  type SxProps,
} from '@altroo/mui-native-system';
import { useTheme, useSx } from './themeProvider';
interface StyleOwner {
  variant: string;
  disabled?: boolean;
  error?: boolean;
  multiple?: boolean;
  open?: boolean;
}
export function useNativeSelectionSlotStyle(
  name: 'MuiSelect' | 'MuiNativeSelect',
  slot: 'select' | 'icon',
  owner: StyleOwner,
  sx?: SxProps,
) {
  const theme = useTheme(),
    { width } = useWindowDimensions();
  const config = theme.components[name],
    overrides = config && typeof config === 'object' ? config.styleOverrides : undefined;
  const keys =
    slot === 'select'
      ? [
          'select',
          owner.variant,
          ...(owner.error ? ['error'] : []),
          ...(owner.multiple ? ['multiple'] : []),
        ]
      : [
          'icon',
          ...(name === 'MuiNativeSelect'
            ? ['icon' + owner.variant[0].toUpperCase() + owner.variant.slice(1)]
            : []),
          ...(owner.open ? ['iconOpen'] : []),
        ];
  const rules = keys.map((key) => {
    const raw = overrides?.[key];
    return typeof raw === 'function'
      ? raw({ theme, ownerState: owner as unknown as Record<string, unknown> })
      : raw;
  });
  const extra = useSx(sx);
  return [
    resolveSx(rules as SxProps, theme, {
      width,
      mode: 'css',
      slot: `${name}-${slot}`,
      states: [...(owner.disabled ? ['disabled'] : []), ...(owner.error ? ['error'] : [])],
    }),
    extra,
  ];
}
export const NativeSelectionIndicator = ({ style }: { style?: StyleProp<NativeStyle> }) => {
  const flat = StyleSheet.flatten(style) ?? {},
    color = flat.color;
  const size =
    typeof flat.fontSize === 'number' && Number.isFinite(flat.fontSize) ? flat.fontSize : 24;
  const view = Object.fromEntries(
    Object.entries(flat).filter(([key]) => !isNativeTextStyleProperty(key)),
  );
  return (
    <View
      accessible={false}
      style={[{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }, view]}
    >
      <View
        style={{
          width: 0,
          height: 0,
          borderLeftWidth: (size * 5) / 24,
          borderRightWidth: (size * 5) / 24,
          borderTopWidth: (size * 5) / 24,
          borderLeftColor: 'transparent',
          borderRightColor: 'transparent',
          borderTopColor: color as any,
        }}
      />
    </View>
  );
};

/** With an end adornment the caret is positioned in the Input root. */
export function NativeSelectionIconSurface({
  trailing,
  end,
  variant,
  disabled,
  onPress,
  children,
}: {
  trailing: boolean;
  end: 'left' | 'right';
  variant: string;
  disabled?: boolean;
  onPress: NonNullable<React.ComponentProps<typeof NativePressable>['onPress']>;
  children: React.ReactNode;
}) {
  const style = {
    position: 'absolute' as const,
    [end]: variant === 'standard' ? 0 : 7,
    top: 0,
    bottom: 0,
    justifyContent: 'center' as const,
  };
  return trailing ? (
    <NativePressable
      accessible={false}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      focusable={false}
      tabIndex={-1}
      disabled={disabled}
      onPress={onPress}
      style={style}
    >
      {children}
    </NativePressable>
  ) : (
    <View pointerEvents="none" accessible={false} style={style}>
      {children}
    </View>
  );
}
