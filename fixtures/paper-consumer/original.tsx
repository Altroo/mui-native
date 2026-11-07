// Copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT
import { createRef, forwardRef, type HTMLAttributes } from 'react';
import Paper, {
  type PaperProps,
  type PaperOwnProps,
  type PaperTypeMap,
  type PaperPropsVariantOverrides,
  type PaperClassKey,
  paperClasses,
  getPaperUtilityClass,
} from '@mui/material/Paper';
import { createTheme } from '@mui/material/styles';
declare module '@mui/material/Paper' {
  interface PaperPropsVariantOverrides {
    glass: true;
    outlined: false;
  }
}
export const own: PaperOwnProps = {
  elevation: 24,
  square: true,
  variant: 'glass',
  classes: undefined,
  sx: undefined,
};
export const exact: PaperProps = {
  children: undefined,
  elevation: undefined,
  square: undefined,
  variant: undefined,
  classes: undefined,
  sx: undefined,
  style: undefined,
  component: undefined,
  ref: undefined,
};
export const klass: PaperClassKey = 'elevation24';
export const utility: string = getPaperUtilityClass('custom');
export const top: string = paperClasses.elevation24;
const Root = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement> & { tracking: string }>(
  ({ tracking, ...props }, ref) => <div {...props} data-tracking={tracking} ref={ref} />,
);
export const custom = <Paper component={Root} tracking="owned" ref={createRef<HTMLDivElement>()} />;
export const alias = <Paper component="section" />;
export const map: PaperTypeMap<{ tracking: string }, typeof Root> = {
  props: { tracking: 'owned' },
  defaultComponent: Root,
};
export const theme = createTheme({
  components: {
    MuiPaper: {
      defaultProps: { elevation: 3, square: true, variant: 'glass' },
      styleOverrides: undefined,
      variants: undefined,
    },
  },
});
export type Flags = PaperPropsVariantOverrides;
// @ts-expect-error Missing required custom root data.
export const missing = <Paper component={Root} />;
// @ts-expect-error Augmentation removes outlined.
export const removed = <Paper variant="outlined" />;
// @ts-expect-error Unknown variant requires augmentation.
export const unknown = <Paper variant="unknown" />;

// Accordion owns its class vocabulary instead of inheriting Paper's class keys.
export const accordionClasses: import('@mui/material').AccordionProps['classes'] = {
  expanded: 'expanded',
  region: 'region',
};
export const paperAsAccordionClass: import('@mui/material').AccordionProps['classes'] = {
  // @ts-expect-error Paper elevation classes do not become Accordion own class keys.
  elevation24: 'wrong',
};
export const dialogPaper: import('@mui/material').DialogProps['slotProps'] = {
  paper: { component: 'div', elevation: 3, classes: { elevation3: 'depth' } },
};

const common = { className: 'paper', invented: 'not-an-own-field' };
export const structuralSpread = <Paper {...common} />;
// @ts-expect-error Fresh unknown attributes remain rejected upstream.
export const freshUnknown = <Paper className="paper" invented="bad" />;

const customSpread = { component: Root, tracking: 'owned', invented: 'not-an-own-field' };
export const structuralCustomSpread = <Paper {...customSpread} />;
export const freshCustomUnknown = (
  // @ts-expect-error Fresh custom-root attributes remain checked upstream.
  <Paper component={Root} tracking="owned" invented="bad" className="paper" />
);
