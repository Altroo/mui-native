// Copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT
import React from 'react';
import { type ViewInstance } from 'react-native';
import { CircularProgress as Root, circularProgressClasses as rootClasses } from '@mui/material';
import CircularProgress, {
  type CircularProgressProps,
  type CircularProgressClasses,
  type CircularProgressClassKey,
} from '@mui/material/CircularProgress';
import Native from '@altroo/mui-native/CircularProgress';
import Classes, {
  getCircularProgressUtilityClass,
} from '@mui/material/CircularProgress/circularProgressClasses';
import {
  createTheme,
  type ComponentsPropsList,
  type PaletteColor,
  type SimplePaletteColorOptions,
} from '@mui/material/styles';

declare module '@mui/material/CircularProgress' {
  interface CircularProgressPropsColorOverrides {
    brand: true;
    error: false;
  }
  interface CircularProgressPropsVariantOverrides {
    paused: true;
  }
  interface CircularProgressClasses {
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
export const optional: CircularProgressProps = {
  classes: undefined,
  className: undefined,
  color: undefined,
  variant: undefined,
  disableShrink: undefined,
  enableTrackSlot: undefined,
  min: undefined,
  max: undefined,
  value: undefined,
  size: undefined,
  thickness: undefined,
  sx: undefined,
  style: undefined,
  ref: undefined,
};
export const classes: CircularProgressClasses = { ...rootClasses, badge: 'badge' };
export const classKey: CircularProgressClassKey = 'badge';
export const utility: string = getCircularProgressUtilityClass(classKey);
export const nativeClasses: typeof rootClasses = Classes;
export const defaults: ComponentsPropsList['MuiCircularProgress'] = {
  color: 'brand',
  variant: 'paused',
  enableTrackSlot: true,
};
export const theme = createTheme({
  palette: { brand: { main: '#156b5f' } },
  components: {
    MuiCircularProgress: {
      defaultProps: defaults,
      styleOverrides: { root: { opacity: 0.8 }, circle: { strokeLinecap: 'round' } },
      variants: [{ props: { variant: 'paused' }, style: { opacity: 0.5 } }],
    },
  },
});
export const examples = (
  <>
    <CircularProgress
      {...optional}
      ref={ref}
      color="brand"
      variant="determinate"
      min={20}
      max={80}
      value={50}
      size="2rem"
      thickness={4}
      enableTrackSlot
      disableShrink
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
    <Native ref={React.createRef<ViewInstance>()} size={32} />
  </>
);
// @ts-expect-error Color augmentation removes error.
export const removedColor = <CircularProgress color="error" />;
// @ts-expect-error Buffer belongs to LinearProgress.
export const wrongVariant = <CircularProgress variant="buffer" />;
// @ts-expect-error CircularProgress's fixed root is not polymorphic.
export const browserComponent = <CircularProgress component="span" />;
// @ts-expect-error Caller children do not replace the SVG slots.
export const ignoredChildren = <CircularProgress>Loading</CircularProgress>;
// @ts-expect-error A DOM ref cannot observe a native View.
export const wrongRef = <CircularProgress ref={React.createRef<HTMLSpanElement>()} />;
// @ts-expect-error The component deep entry exports no unrelated feedback component.
import { Alert as WrongScope } from '@mui/material/CircularProgress';
export const rejectedLegacyEntry = WrongScope;
