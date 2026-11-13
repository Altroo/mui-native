// Copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT
import React from 'react';
import { Text, type TextInstance, type TextProps } from 'react-native';
import { DialogTitle as Root, dialogTitleClasses as rootClasses } from '@mui/material';
import DialogTitle, {
  type DialogTitleProps,
  type DialogTitleOwnProps,
  type DialogTitleTypeMap,
  type DialogTitleClasses,
  type DialogTitleClassKey,
} from '@mui/material/DialogTitle';
import Native from '@altroo/mui-native/DialogTitle';
// Load the canonical augmentation target even when only Title is rendered.
import type {} from '@mui/material/Typography';
import Classes, { getDialogTitleUtilityClass } from '@mui/material/DialogTitle/dialogTitleClasses';
import { createTheme, type ComponentsPropsList } from '@mui/material/styles';
declare module '@mui/material/Typography' {
  interface TypographyPropsVariantOverrides {
    poster: true;
    h3: false;
  }
}
declare module '@mui/material/DialogTitle' {
  interface DialogTitleClasses {
    badge?: string | undefined;
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
type RootProps = TextProps & { tone: 'quiet' | 'loud'; className?: string | undefined };
const TextRoot = React.forwardRef<TextInstance, RootProps>(
  ({ tone, className: _name, ...props }, ref) => (
    <Text {...props} accessibilityHint={tone} ref={ref} />
  ),
);
const ref: React.RefCallback<TextInstance> = (node) => {
  node?.measureInWindow(() => {});
  return () => {};
};
export const optional: DialogTitleProps = {
  component: undefined,
  classes: undefined,
  className: undefined,
  variant: undefined,
  color: undefined,
  sx: undefined,
  style: undefined,
  children: undefined,
  ref: undefined,
};
export const custom: DialogTitleProps<typeof TextRoot> = {
  component: TextRoot,
  tone: 'quiet',
  ref,
};
export const own: DialogTitleOwnProps = { variant: 'poster', classes: { root: 'heading' } };
export const map: DialogTitleTypeMap<{ marker: 'native' }, typeof TextRoot>['props'] = {
  ...own,
  marker: 'native',
};
export const classes: DialogTitleClasses = { ...rootClasses, badge: 'badge' };
export const key: DialogTitleClassKey = 'badge';
export const utility: string = getDialogTitleUtilityClass(key);
export const canonicalClasses: typeof rootClasses = Classes;
export const defaults: ComponentsPropsList['MuiDialogTitle'] = {
  variant: 'poster',
  classes: { badge: 'badge' },
};
export const theme = createTheme({
  typography: { poster: { fontSize: '2rem' } },
  components: {
    MuiDialogTitle: {
      defaultProps: defaults,
      styleOverrides: { root: { paddingTop: 16 } },
      variants: [{ props: { variant: 'poster' }, style: { opacity: 0.8 } }],
    },
  },
});
export const roots = (
  <>
    <Root testID="root" ref={ref}>
      Heading
    </Root>
    <DialogTitle component={TextRoot} tone="loud" ref={ref} />
    <Native component="h2" ref={ref} variant="poster">
      Native
    </Native>
  </>
);
// @ts-expect-error A custom native Text root retains its required props.
export const missingTone = <DialogTitle component={TextRoot} />;
// @ts-expect-error Custom native root values keep their declared union.
export const wrongTone = <DialogTitle component={TextRoot} tone="other" />;
// @ts-expect-error Default Text roots do not accept arbitrary custom-root fields.
export const unknownProp = <DialogTitle tone="quiet" />;
// @ts-expect-error Title classes do not accept inherited Typography-only slot keys.
export const typographyClasses = <DialogTitle classes={{ h6: 'h6' }} />;
export const browserRef = (
  // @ts-expect-error Semantic native aliases retain native Text refs.
  <DialogTitle component="h2" ref={React.createRef<HTMLHeadingElement>()} />
);
// @ts-expect-error Browser attributes do not become native Text props.
export const browserAttribute = <DialogTitle component="a" href="/account" />;
// @ts-expect-error Inherited Typography variant augmentation remains active.
export const disabledVariant = <DialogTitle variant="h3" />;
const HtmlRoot = React.forwardRef<HTMLSpanElement, React.HTMLAttributes<HTMLSpanElement>>(
  (props, ref) => <span {...props} ref={ref} />,
);
// @ts-expect-error Custom title roots require native Text-compatible refs and styles.
export const browserRoot = <DialogTitle component={HtmlRoot} />;
