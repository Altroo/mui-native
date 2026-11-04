/* Native contracts adapt MIT-licensed Material UI 9.5.0.
 * Copyright (c) MUI contributors. See NOTICE and upstream/svg-icon.json.
 * Native implementation: Copyright (c) 2026 Altroo and contributors. */
import type React from 'react';
import type { StyleProp } from 'react-native';
import type Svg from 'react-native-svg';
import type { SvgProps } from 'react-native-svg';
import type { NativeStyle, SxProps } from '@altroo/mui-native-system';
import type { SvgIconClasses } from './svgIconClasses';
export interface SvgIconPropsSizeOverrides {}
export interface SvgIconPropsColorOverrides {}
type OverrideUnion<Base extends string, Overrides> = Extract<
  {
    [K in keyof (Omit<Record<Base, true>, keyof Overrides> & Overrides)]: true extends (Omit<
      Record<Base, true>,
      keyof Overrides
    > &
      Overrides)[K]
      ? K
      : never;
  }[keyof (Omit<Record<Base, true>, keyof Overrides> & Overrides)],
  string
>;
export type SvgIconHandle = Svg;
export type NativeSvgIconStyle = NativeStyle &
  Pick<
    SvgProps,
    | 'fill'
    | 'fillOpacity'
    | 'fillRule'
    | 'stroke'
    | 'strokeOpacity'
    | 'strokeWidth'
    | 'strokeDasharray'
    | 'strokeDashoffset'
    | 'strokeLinecap'
    | 'strokeLinejoin'
    | 'strokeMiterlimit'
    | 'clipRule'
    | 'clipPath'
    | 'mask'
    | 'vectorEffect'
  >;
export interface SvgIconOwnProps {
  children?: React.ReactNode;
  classes?: Partial<SvgIconClasses>;
  className?: string;
  color?: OverrideUnion<
    | 'inherit'
    | 'action'
    | 'disabled'
    | 'primary'
    | 'secondary'
    | 'error'
    | 'info'
    | 'success'
    | 'warning',
    SvgIconPropsColorOverrides
  >;
  fontSize?: OverrideUnion<'inherit' | 'small' | 'medium' | 'large', SvgIconPropsSizeOverrides>;
  htmlColor?: SvgProps['color'];
  inheritViewBox?: boolean;
  titleAccess?: string;
  /** Native touch equivalent for the inherited SVG click handler. */
  onClick?: SvgProps['onPress'];
  viewBox?: string;
  /** Browser rasterization hints have no equivalent in the native SVG renderer. */
  shapeRendering?: string;
  sx?: SxProps;
  style?: StyleProp<NativeSvgIconStyle>;
  'data-testid'?: string;
}
type NativeRoot = React.ComponentType<any> | 'svg';
type RootProps<Root extends NativeRoot> = Root extends 'svg'
  ? SvgProps
  : Root extends React.ComponentType<any>
    ? React.ComponentPropsWithoutRef<Root>
    : never;
export interface SvgIconTypeMap<
  AdditionalProps = {},
  RootComponent extends NativeRoot = typeof Svg,
> {
  props: AdditionalProps & SvgIconOwnProps;
  defaultComponent: RootComponent;
}
export type SvgIconProps<
  RootComponent extends NativeRoot = typeof Svg,
  AdditionalProps = {},
> = SvgIconOwnProps &
  AdditionalProps &
  Omit<
    RootProps<RootComponent>,
    keyof SvgIconOwnProps | keyof AdditionalProps | 'ref' | 'component'
  > &
  (RootComponent extends 'svg'
    ? React.RefAttributes<SvgIconHandle>
    : RootComponent extends React.ComponentType<any>
      ? Pick<
          React.ComponentPropsWithRef<RootComponent>,
          Extract<'ref', keyof React.ComponentPropsWithRef<RootComponent>>
        >
      : never) &
  (RootComponent extends typeof Svg | 'svg'
    ? { component?: RootComponent }
    : { component: RootComponent });
export interface NativeSvgIconComponent {
  <Root extends NativeRoot>(props: SvgIconProps<Root> & { component: Root }): React.ReactNode;
  (props: SvgIconProps): React.ReactNode;
  muiName: string;
  displayName?: string;
}
export interface SvgIconOwnerState extends SvgIconOwnProps {
  color: NonNullable<SvgIconOwnProps['color']>;
  fontSize: NonNullable<SvgIconOwnProps['fontSize']>;
  instanceFontSize: SvgIconOwnProps['fontSize'];
  component: React.ComponentType<any> | 'svg';
  inheritViewBox: boolean;
  viewBox: string;
  hasSvgAsChild: boolean;
}
