// Copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT
import React from 'react';
import { type ViewInstance } from 'react-native';
import { LinearProgress as Root, linearProgressClasses as rootClasses } from '@mui/material';
import LinearProgress, {
  type LinearProgressProps,
  type LinearProgressClasses,
  type LinearProgressClassKey,
} from '@mui/material/LinearProgress';
import Native from '@altroo/mui-native/LinearProgress';
import Classes, {
  getLinearProgressUtilityClass,
} from '@mui/material/LinearProgress/linearProgressClasses';
import {
  createTheme,
  type ComponentsPropsList,
  type PaletteColor,
  type SimplePaletteColorOptions,
} from '@mui/material/styles';

declare module '@mui/material/LinearProgress' {
  interface LinearProgressPropsColorOverrides {
    brand: true;
    error: false;
  }
  interface LinearProgressPropsVariantOverrides {
    paused: true;
  }
  interface LinearProgressClasses {
    badge?: string | undefined;
  }
}
declare module '@mui/material/styles' {
  interface Palette {
    brand: PaletteColor;
  }
  interface PaletteOptions {
    brand?: SimplePaletteColorOptions | undefined;
  }
}
const ref: React.RefCallback<ViewInstance> = (node) => {
  node?.measureInWindow(() => {});
  return () => {};
};
export const optional: LinearProgressProps = {
  classes: undefined,
  className: undefined,
  color: undefined,
  variant: undefined,
  min: undefined,
  max: undefined,
  value: undefined,
  valueBuffer: undefined,
  sx: undefined,
  style: undefined,
  ref: undefined,
};
export const classes: LinearProgressClasses = { ...rootClasses, badge: 'badge' };
export const classKey: LinearProgressClassKey = 'badge';
export const utility: string = getLinearProgressUtilityClass(classKey);
export const nativeClasses: typeof rootClasses = Classes;
export const defaults: ComponentsPropsList['MuiLinearProgress'] = {
  color: 'brand',
  variant: 'paused',
};
export const theme = createTheme({
  palette: { brand: { main: '#156b5f' } },
  components: {
    MuiLinearProgress: {
      defaultProps: defaults,
      styleOverrides: { root: { opacity: 0.8 }, bar1: { opacity: 0.9 } },
      variants: [{ props: { variant: 'paused' }, style: { opacity: 0.5 } }],
    },
  },
});
export const examples = (
  <>
    <LinearProgress
      {...optional}
      ref={ref}
      color="brand"
      variant="determinate"
      min={20}
      max={80}
      value={50}
      valueBuffer={70}
      onLayout={(event) => {
        void event.nativeEvent.layout.width;
      }}
      onClick={(event) => {
        void event.nativeEvent;
      }}
    />
    <Root
      variant="paused"
      style={[{ opacity: 0.8 }, { margin: 4 }]}
      accessibilityLabel="Loading records"
    />
    <Native ref={React.createRef<ViewInstance>()} variant="query" />
  </>
);
// @ts-expect-error Color augmentation removes error.
export const removedColor = <LinearProgress color="error" />;
// @ts-expect-error LinearProgress does not support circular-only variants.
export const wrongVariant = <LinearProgress variant="circular" />;
// @ts-expect-error The original component owns its generated bars.
export const wrongChildren = <LinearProgress>Child</LinearProgress>;
// @ts-expect-error Default root refs expose a native View rather than a DOM element.
export const browserRef = <LinearProgress ref={React.createRef<HTMLSpanElement>()} />;
// @ts-expect-error Progress roots are not polymorphic.
export const rootOverride = <LinearProgress component="div" />;
