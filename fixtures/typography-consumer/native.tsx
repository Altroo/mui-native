// Copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT
import React from 'react';
import { Text, type TextProps, type TextInstance } from 'react-native';
import {
  Typography as Root,
  typographyClasses as rootClasses,
  getTypographyUtilityClass,
} from '@mui/material';
import Typography, {
  type TypographyProps,
  type TypographyOwnProps,
  type TypographyTypeMap,
  type TypographyClasses,
  type TypographyClassKey,
} from '@mui/material/Typography';
import Native from '@altroo/mui-native/Typography';
import { createTheme, type ComponentsPropsList } from '@mui/material/styles';
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
declare module '@mui/material/styles' {
  interface TypographyVariants {
    poster: React.CSSProperties;
  }
  interface TypographyVariantsOptions {
    poster?: React.CSSProperties | undefined;
  }
}
type TextRootProps = TextProps & { tone: 'quiet' | 'loud'; className?: string | undefined };
const TextRoot = React.forwardRef<TextInstance, TextRootProps>(
  ({ tone, className: _className, ...props }, ref) => (
    <Text {...props} accessibilityHint={tone} ref={ref} />
  ),
);
const plainRoot = React.forwardRef<TextInstance, TextProps>((props, ref) => (
  <Text {...props} ref={ref} />
));
const ref: React.RefCallback<TextInstance> = (node) => {
  node?.measureInWindow(() => {});
  return () => {};
};
export const undefinedProps: TypographyProps = {
  align: undefined,
  classes: undefined,
  className: undefined,
  color: undefined,
  component: undefined,
  gutterBottom: undefined,
  noWrap: undefined,
  paragraph: undefined,
  sx: undefined,
  variant: undefined,
  variantMapping: undefined,
  style: undefined,
  children: undefined,
  ref: undefined,
};
export const semanticProps: TypographyProps = { component: 'h1', selectable: true };
export const customProps: TypographyProps<typeof TextRoot> = {
  component: TextRoot,
  tone: 'quiet',
  ref,
};
export const own: TypographyOwnProps = { variant: 'poster', classes: { poster: 'poster' } };
export const map: TypographyTypeMap<{ marker: 'native' }, typeof TextRoot>['props'] = {
  ...own,
  marker: 'native',
};
export const augmented: TypographyClasses = { ...rootClasses, poster: 'poster' };
export const key: TypographyClassKey = 'poster';
export const classValue: string = getTypographyUtilityClass(key);
export const defaults: ComponentsPropsList['MuiTypography'] = {
  variant: 'poster',
  component: 'h2',
  classes: { poster: 'poster' },
};
export const theme = createTheme({
  typography: { poster: { fontSize: '2rem', lineHeight: 1.25 } },
  components: {
    MuiTypography: {
      defaultProps: { ...defaults },
      styleOverrides: { root: ({ ownerState }) => ({ opacity: ownerState.noWrap ? 0.5 : 1 }) },
    },
  },
});
type NativeEvents = {
  [Key in keyof TextProps]-?: Key extends `on${string}` ? Key : never;
}[keyof TextProps];
export function allNativeEvents(
  events: Pick<TextProps, NativeEvents>,
): Pick<TypographyProps, NativeEvents> {
  return events;
}
export function allNativeAttributes(
  props: TextProps,
): Omit<TypographyProps, keyof TypographyOwnProps | 'component'> {
  return props;
}
export const content = (
  <>
    <Root {...undefinedProps} ref={ref} />
    <Typography component={TextRoot} tone="loud" ref={ref} classes={augmented} variant="poster" />
    <Typography component={plainRoot} ref={ref} />
    <Native
      component="h2"
      ref={ref}
      noWrap
      ellipsizeMode="middle"
      allowFontScaling={false}
      maxFontSizeMultiplier={1.2}
    />
  </>
);
// @ts-expect-error Required custom native root props stay required.
export const missingTone = <Typography component={TextRoot} />;
// @ts-expect-error Custom native root props retain their actual types.
export const wrongTone = <Typography component={TextRoot} tone="wrong" />;
// @ts-expect-error Default native text roots do not accept arbitrary root-only props.
export const unknownProp = <Typography tone="quiet" />;
// @ts-expect-error Semantic strings remain native Text roots with Text refs.
export const browserRef = <Typography component="h2" ref={React.createRef<HTMLHeadingElement>()} />;
// @ts-expect-error Browser attributes are not introduced by a semantic native string mapping.
export const browserAttribute = <Typography component="a" href="/account" />;
// @ts-expect-error Disabled variants retain source augmentation semantics.
export const disabledVariant = <Typography variant="h3" />;
const HtmlRoot = React.forwardRef<HTMLSpanElement, React.HTMLAttributes<HTMLSpanElement>>(
  (props, ref) => <span {...props} ref={ref} />,
);
// @ts-expect-error Custom roots must retain a native Text-compatible style/ref contract.
export const browserRoot = <Typography component={HtmlRoot} />;
