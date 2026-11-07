// Copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT
import { createRef, forwardRef, type HTMLAttributes } from 'react';
import Card, {
  type CardProps,
  type CardOwnProps,
  type CardTypeMap,
  type CardPropsColorOverrides,
  type CardClasses,
  type CardClassKey,
  cardClasses,
  getCardUtilityClass,
} from '@mui/material/Card';
import { createTheme } from '@mui/material/styles';
declare module '@mui/material/Paper' {
  interface PaperPropsVariantOverrides {
    glass: true;
    outlined: false;
  }
}
declare module '@mui/material/Card' {
  interface CardClasses {
    contributorSlot?: string | undefined;
  }
  interface CardPropsColorOverrides {
    contributor: true;
  }
}
export const exact: CardProps = {
  raised: undefined,
  elevation: undefined,
  square: undefined,
  variant: undefined,
  classes: undefined,
  sx: undefined,
  style: undefined,
  className: undefined,
  component: undefined,
  ref: undefined,
  children: undefined,
};
export const own: CardOwnProps = { raised: true, variant: 'glass', classes: { root: 'root' } };
export const key: CardClassKey = 'contributorSlot';
export const classes: Partial<CardClasses> = { root: 'root', contributorSlot: 'extra' };
export const utility: string = getCardUtilityClass('constructor');
export const klass: string = cardClasses.root;
export type Unused = CardPropsColorOverrides;
const Required = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement> & { tracking: string }>(
  ({ tracking, ...props }, ref) => <div {...props} data-tracking={tracking} ref={ref} />,
);
export const props: CardProps<typeof Required> = { tracking: 'owned', raised: true };
export const map: CardTypeMap<{ tracking: string }, typeof Required> = {
  props: { tracking: 'owned' },
  defaultComponent: Required,
};
export const node = (
  <Card
    component={Required}
    tracking="owned"
    ref={createRef<HTMLDivElement>()}
    raised
    elevation={0}
    square
    variant="glass"
    classes={classes}
    sx={{ p: 2 }}
  >
    Body
  </Card>
);
export const alias = <Card component="section" />;
export const theme = createTheme({
  components: {
    MuiCard: {
      defaultProps: { raised: true, variant: 'glass', classes },
      styleOverrides: { root: ({ ownerState }) => ({ opacity: ownerState.raised ? 0.5 : 1 }) },
      variants: [{ props: { raised: true }, style: { padding: 3 } }],
    },
  },
});
// @ts-expect-error Missing custom root requirement.
export const missing = <Card component={Required} />;
// @ts-expect-error Paper variant augmentation is inherited by Card.
export const removed = <Card variant="outlined" />;
// @ts-expect-error Unknown variants need augmentation.
export const unknown = <Card variant="unknown" />;
// @ts-expect-error Card classes do not inherit Paper slots.
export const paperClass = <Card classes={{ elevation8: 'bad' }} />;
// @ts-expect-error Augmentation does not add an own Card color prop.
export type OwnColor = CardOwnProps['color'];
// The DOM host independently admits the deprecated HTML color attribute.
export const hostColor = <Card color="contributor" />;
// @ts-expect-error Fresh attributes are checked.
export const invented = <Card invented="bad" />;
// Ordinary conditional spreads retain the original structural assignment boundary.
const conditionalMissing = Math.random() > 0.5 ? { component: Required } : { className: 'default' };
export const structuralConditional = <Card {...conditionalMissing} />;
const Alternate = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>((p, r) => (
  <div {...p} ref={r} />
));
const Reserved = forwardRef<
  HTMLDivElement,
  HTMLAttributes<HTMLDivElement> & {
    theme?: ReturnType<typeof createTheme> | undefined;
    as?: typeof Alternate | 'div' | null | undefined;
    ownerState?: { marker: string } | null | undefined;
  }
>((p, r) => <div {...p} ref={r} />);
export const reserved = (
  <Card component={Reserved} theme={theme} as={Alternate} ownerState={{ marker: 'authored' }} />
);
export const undefinedReserved = (
  <Card component={Reserved} theme={undefined} as={undefined} ownerState={undefined} />
);
export const nullOwner = <Card component={Reserved} as={null} ownerState={null} />;
export const asAlias = <Card component={Reserved} as="div" />;
// @ts-expect-error Reserved inputs are derived from a selected root, not own Card props.
export const inventedAs = <Card as={Alternate} />;
