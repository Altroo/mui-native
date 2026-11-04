import React from 'react';
import { View, type ViewInstance } from 'react-native';
import Svg, { Path, type SvgProps } from 'react-native-svg';
import {
  SvgIcon as RootSvgIcon,
  createSvgIcon as rootFactory,
  type SvgIconHandle,
  createTheme,
} from '@mui/material';
import SvgIcon, {
  createSvgIcon,
  svgIconClasses,
  getSvgIconUtilityClass,
  type SvgIconProps,
  type SvgIconTypeMap,
} from '@mui/material/SvgIcon';
import deepClasses from '@mui/material/SvgIcon/svgIconClasses';
import deepFactory from '@mui/material/SvgIcon/createSvgIcon';
import legacyFactory from '@mui/material/utils/createSvgIcon';
import { createSvgIcon as utilitiesFactory } from '@mui/material/utils';
import { Add, SvgIcon as IconPackageSvg, createSvgIcon as iconFactory } from '@mui/icons-material';
declare module '@mui/material/SvgIcon' {
  interface SvgIconPropsColorOverrides {
    brand: true;
  }
  interface SvgIconPropsSizeOverrides {
    compact: true;
  }
}
const ref = React.createRef<SvgIconHandle>();
const options: SvgIconProps = {
  fontSize: 'compact',
  color: 'brand',
  htmlColor: '#123456',
  ref,
  sx: { fontSize: 28, fill: 'none', stroke: 'currentColor' },
  style: { strokeWidth: 2 },
  titleAccess: 'Delivery',
};
const Example = createSvgIcon(<Path d="M0 0h8v8z" />, 'Example');
const Root = React.forwardRef<Svg, SvgProps & { resourceId: string }>(
  ({ resourceId, ...props }, forwarded) => <Svg {...props} nativeID={resourceId} ref={forwarded} />,
);
const Wrapper = React.forwardRef<ViewInstance, SvgProps>(({ children }, forwarded) => (
  <View ref={forwarded}>
    <Svg>{children}</Svg>
  </View>
));
const wrapperRef = React.createRef<ViewInstance>();
export const icons = (
  <>
    <SvgIcon {...options}>
      <Path d="M0 0h8v8z" />
    </SvgIcon>
    <RootSvgIcon component="svg" ref={ref} />
    <SvgIcon component={Root} resourceId="resource" ref={ref} />
    <SvgIcon component={Wrapper} ref={wrapperRef} />
    <Example ref={ref} color="info" />
    <Add ref={ref} />
    <IconPackageSvg color="success" />
  </>
);
export const factories = [
  rootFactory,
  createSvgIcon,
  deepFactory,
  legacyFactory,
  utilitiesFactory,
  iconFactory,
];
export const classes = [deepClasses, svgIconClasses, getSvgIconUtilityClass('root')];
export const nativeRootTheme = createTheme({
  cssRootFontSize: 20,
  typography: { htmlFontSize: 20 },
});
export const typeMap: SvgIconTypeMap<{ resourceId: string }>['props'] = {
  resourceId: 'typed',
  fontSize: 'small',
};
// @ts-expect-error DOM SVG refs are not the native SVG handle.
export const browserRef = <SvgIcon ref={React.createRef<SVGSVGElement>()} />;
// @ts-expect-error Custom required root props remain required.
export const missingRootProp = <SvgIcon component={Root} />;
// @ts-expect-error Unknown color names require explicit augmentation.
export const unknownColor = <SvgIcon color="notRegistered" />;
// @ts-expect-error A View wrapper exposes its actual View ref, not the default SVG handle.
export const wrongWrapperRef = <SvgIcon component={Wrapper} ref={ref} />;
