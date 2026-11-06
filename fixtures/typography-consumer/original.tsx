// Copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT
import React from 'react';
import Typography, {
  type TypographyOwnProps,
  type TypographyProps,
  type TypographyTypeMap,
  type TypographyClasses,
  type TypographyClassKey,
  typographyClasses,
  getTypographyUtilityClass,
} from '@mui/material/Typography';
declare module '@mui/material/Typography' {
  interface TypographyPropsVariantOverrides {
    poster: true;
    h3: false;
  }
  interface TypographyClasses {
    poster?: string | undefined;
  }
  interface TypographyPropsColorOverrides {
    brand: true;
  }
}
const Root = React.forwardRef<
  HTMLSpanElement,
  React.HTMLAttributes<HTMLSpanElement> & { tone: 'quiet' }
>(({ tone, ...props }, ref) => <span {...props} data-tone={tone} ref={ref} />);
export const props: TypographyProps = {
  align: undefined,
  classes: undefined,
  color: undefined,
  component: undefined,
  gutterBottom: undefined,
  noWrap: undefined,
  sx: undefined,
  variant: undefined,
  variantMapping: undefined,
};
export const own: TypographyOwnProps = { variant: 'poster', classes: { poster: 'poster' } };
export const map: TypographyTypeMap<{ marker: 'source' }, typeof Root>['props'] = {
  ...own,
  marker: 'source',
};
export const classes: TypographyClasses = { ...typographyClasses, poster: 'poster' };
export const key: TypographyClassKey = 'poster';
export const token: string = getTypographyUtilityClass(key);
export const content = (
  <>
    <Typography {...props} />
    <Typography component={Root} tone="quiet" ref={React.createRef<HTMLSpanElement>()} />
  </>
);
// @ts-expect-error Original custom-root required props are retained.
export const missing = <Typography component={Root} />;
// @ts-expect-error Original variant augmentation can disable defaults.
export const disabled = <Typography variant="h3" />;
// @ts-expect-error Paragraph is absent from the pinned9.5 declaration.
export const paragraph = <Typography paragraph />;
