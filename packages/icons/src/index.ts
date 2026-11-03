import React, { useContext } from 'react';
import { NativeIconStyleContext, useNativeTextContext } from '@altroo/mui-native-system';
import Svg, { Path, type SvgProps } from 'react-native-svg';
import { useTheme } from '@altroo/mui-native/styles';
export interface SvgIconProps extends Omit<SvgProps, 'color'> {
  color?: 'inherit' | 'primary' | 'secondary' | 'error' | 'action' | 'disabled';
  fontSize?: 'inherit' | 'small' | 'medium' | 'large';
  titleAccess?: string;
}
export function createSvgIcon(path: string, displayName: string) {
  function Icon({ color = 'inherit', fontSize = 'medium', titleAccess, ...props }: SvgIconProps) {
    const theme = useTheme(),
      inherited = useNativeTextContext(),
      iconStyle = useContext(NativeIconStyleContext);
    const fill =
      color === 'inherit'
        ? (inherited?.style.color ?? theme.palette.text.primary)
        : color === 'action'
          ? theme.palette.text.secondary
          : color === 'disabled'
            ? theme.palette.text.disabled
            : theme.palette[color].main;
    const size =
      iconStyle?.fontSize ??
      (fontSize === 'inherit' && typeof inherited?.style.fontSize === 'number'
        ? inherited.style.fontSize
        : fontSize === 'small'
          ? 20
          : fontSize === 'large'
            ? 35
            : 24);
    return React.createElement(
      Svg,
      {
        width: size,
        height: size,
        viewBox: '0 0 24 24',
        fill,
        accessible: !!titleAccess,
        accessibilityLabel: titleAccess,
        accessibilityRole: 'image',
        ...props,
      },
      React.createElement(Path, { d: path }),
    );
  }
  Icon.displayName = displayName;
  return Icon;
}
// Original simple geometric paths. No upstream icon artwork has been copied.
export const Close = createSvgIcon(
  'M6 4.6 4.6 6 10.6 12 4.6 18 6 19.4 12 13.4 18 19.4 19.4 18 13.4 12 19.4 6 18 4.6 12 10.6Z',
  'Close',
);
export const Add = createSvgIcon('M11 4h2v7h7v2h-7v7h-2v-7H4v-2h7Z', 'Add');
export const Remove = createSvgIcon('M4 11h16v2H4Z', 'Remove');
export const Check = createSvgIcon('M3 12l5 5L21 4l1.4 1.4L8 19.8 1.6 13.4Z', 'Check');
