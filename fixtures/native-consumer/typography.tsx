import React from 'react';
import { Text, type TextInstance } from 'react-native';
import { Typography as RootTypography } from '@mui/material';
import Typography, { type TypographyProps } from '@mui/material/Typography';
import { createTheme, type TypographyStyle, type TypographyVariants } from '@mui/material/styles';

declare module '@mui/material/styles' {
  interface TypographyVariants {
    poster: TypographyStyle;
  }
  interface TypographyVariantsOptions {
    poster?: TypographyStyle;
  }
}
declare module '@mui/material/Typography' {
  interface TypographyPropsVariantOverrides {
    poster: true;
    h3: false;
  }
}
const theme = createTheme({
  typography: (palette) => ({
    fontSize: 18,
    fontFamily: 'Inter, sans-serif',
    allVariants: { fontWeight: 600 },
    poster: { fontSize: '3rem', lineHeight: 1.2, color: palette.primary.main },
    h3: undefined,
    pxToRem: (value) => `${value / 16}rem`,
  }),
});
const variants: TypographyVariants = theme.typography;
export const posterSize: TypographyStyle['fontSize'] = variants.poster.fontSize;
export const rem: string = theme.typography.pxToRem(24);
const props: TypographyProps = {
  variant: 'poster',
  align: 'inherit',
  variantMapping: { poster: 'h1' },
};
const CustomText = React.forwardRef<TextInstance, React.ComponentProps<typeof Text>>(
  (props, ref) => <Text {...props} ref={ref} />,
);
export const content = (
  <>
    <RootTypography {...props} color="textSecondary">
      Root
    </RootTypography>
    <Typography
      variant="poster"
      component={CustomText}
      ref={React.createRef<TextInstance>()}
      noWrap
    >
      Deep
    </Typography>
    <Typography variant="inherit" component="span">
      Inherited
    </Typography>
  </>
);
// @ts-expect-error Disabled default variants must be rejected through both original imports.
export const disabled = <RootTypography variant="h3" />;
// @ts-expect-error Unregistered custom variants must not silently become strings.
export const unregistered = <Typography variant="unregistered" />;
// @ts-expect-error Native style keeps native length types; CSS units belong in sx or theme variants.
export const cssNativeStyle = <Typography style={{ fontSize: '2rem' }} />;
// @ts-expect-error Browser node refs are incompatible with native Text refs.
export const browserRef = <Typography ref={React.createRef<{ innerHTML: string }>()} />;
