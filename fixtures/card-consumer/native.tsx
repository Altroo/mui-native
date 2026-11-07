// Copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT
import { createRef, forwardRef, type HTMLAttributes, type JSX } from 'react';
import { View, StyleSheet, type ViewProps, type ViewInstance } from 'react-native';
import Card, {
  type CardProps,
  type CardOwnProps,
  type CardTypeMap,
  type CardPropsColorOverrides,
  type CardClasses,
  type CardClassKey,
  cardClasses,
  getCardUtilityClass,
  Paper as LegacyPaper,
} from '@mui/material/Card';
import Direct from '@altroo/mui-native/Card';
import type { PaperPropsVariantOverrides } from '@mui/material/Paper';
export type PaperFlags = PaperPropsVariantOverrides;
import { Card as RootCard, Paper } from '@mui/material';
import { styled, createTheme, type ComponentsPropsList } from '@mui/material/styles';
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
export const inherited: Exclude<keyof Omit<ViewProps, 'style'>, keyof CardProps> extends never
  ? true
  : false = true;
export const own: CardOwnProps = { raised: true, variant: 'glass', classes: { root: 'root' } };
export const key: CardClassKey = 'contributorSlot';
export const classes: Partial<CardClasses> = { root: 'root', contributorSlot: 'extra' };
export const utility: string = getCardUtilityClass('constructor');
export const klass: string = cardClasses.root;
export const identities: [typeof Card, typeof Card, typeof Paper] = [RootCard, Direct, LegacyPaper];
export type Unused = CardPropsColorOverrides;
const Required = forwardRef<
  ViewInstance,
  ViewProps & { tracking: string; className?: string | undefined }
>(({ tracking, className: _className, ...props }, ref) => (
  <View {...props} nativeID={tracking} ref={ref} />
));
export const props: CardProps<typeof Required> = { tracking: 'owned', raised: true };
export const map: CardTypeMap<{ tracking: string }, typeof Required> = {
  props: { tracking: 'owned' },
  defaultComponent: Required,
};
export const defaults: ComponentsPropsList['MuiCard'] = {
  component: Required,
  raised: true,
  variant: 'glass',
  classes,
};
export const theme = createTheme({
  components: {
    MuiCard: {
      defaultProps: defaults,
      styleOverrides: { root: ({ ownerState }) => ({ opacity: ownerState.raised ? 0.5 : 1 }) },
      variants: [{ props: { raised: true }, style: { padding: 3 } }],
    },
  },
});
export const undef = createTheme({
  components: {
    MuiCard: { defaultProps: undefined, styleOverrides: undefined, variants: undefined },
  },
});
const registered = StyleSheet.create({ pad: { paddingLeft: 7 } }),
  Styled = styled(Card)({ opacity: 0.8 });
export const callable: (props: Omit<CardProps, 'component'>) => JSX.Element = Card;
export const node = (
  <Card
    component={Required}
    tracking="owned"
    ref={createRef<ViewInstance>()}
    testID="card"
    nativeID="id"
    raised
    elevation={0}
    square
    variant="glass"
    classes={classes}
    sx={{ p: 2 }}
    style={[registered.pad, { padding: 0 }]}
    onLayout={(e) => e.nativeEvent.layout.width}
    onTouchEnd={(e) => e.nativeEvent.pageX}
  >
    Body
  </Card>
);
export const alias = <Card component="div" ref={createRef<ViewInstance>()} />;
export const styledNode = <Styled {...exact} />;
type Branch = ViewProps & ({ kind: 'a'; alpha: string } | { kind: 'b'; beta: number });
const Union = forwardRef<ViewInstance, Branch>((p, r) => <View {...p} ref={r} />);
export const branch = <Card component={Union} kind="a" alpha="yes" />;
const conditional =
  Math.random() > 0.5 ? { component: Required, tracking: 'owned' } : { className: 'default' };
export const spread = <Card {...conditional} />;
const dom = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>((p, r) => (
  <div {...p} ref={r} />
));
// @ts-expect-error Missing custom root requirement.
export const missing = <Card component={Required} />;
// @ts-expect-error Missing discriminated branch requirement.
export const badBranch = <Card component={Union} kind="a" />;
// @ts-expect-error DOM root/ref is not a native host.
export const badRoot = <Card component={dom} />;
// @ts-expect-error DOM refs do not refer to native hosts.
export const badRef = <Card ref={createRef<HTMLDivElement>()} />;
// @ts-expect-error Actual non-div roots use native components.
export const section = <Card component="section" />;
// @ts-expect-error Paper variant augmentation is inherited by Card.
export const removed = <Card variant="outlined" />;
// @ts-expect-error Unknown variants need augmentation.
export const unknown = <Card variant="unknown" />;
// @ts-expect-error Card classes do not inherit Paper slot keys.
export const paperClass = <Card classes={{ elevation8: 'bad' }} />;
// @ts-expect-error Native View has no HTML color attribute; augmentation adds no own prop.
export const color = <Card color="contributor" />;
// @ts-expect-error Fresh attributes are checked.
export const invented = <Card invented="bad" />;
export const badDefaults = createTheme({
  components: {
    MuiCard: {
      defaultProps: {
        // @ts-expect-error Named defaults preserve native root constraints.
        component: dom,
      },
    },
  },
});
// Ordinary conditional spreads retain the original structural assignment boundary.
const conditionalMissing = Math.random() > 0.5 ? { component: Required } : { className: 'default' };
export const structuralConditional = <Card {...conditionalMissing} />;
export const selectedProps: CardProps<typeof Required> = {
  component: Required,
  tracking: 'selected',
};
export const selectedSpread = <Card {...selectedProps} />;
const Alternate = forwardRef<ViewInstance, ViewProps>((p, r) => <View {...p} ref={r} />);
const Reserved = forwardRef<
  ViewInstance,
  ViewProps & {
    theme?: ReturnType<typeof createTheme> | undefined;
    as?: typeof Alternate | 'div' | null | undefined;
    ownerState?: { marker: string } | null | undefined;
  }
>((p, r) => <View {...p} ref={r} />);
export const reserved = (
  <Card component={Reserved} theme={theme} as={Alternate} ownerState={{ marker: 'authored' }} />
);
export const undefinedReserved = (
  <Card component={Reserved} theme={undefined} as={undefined} ownerState={undefined} />
);
export const nullOwner = <Card component={Reserved} as={null} ownerState={null} />;
export const asAlias = <Card component={Reserved} as="div" />;
const BrowserAs = forwardRef<ViewInstance, ViewProps & { as?: typeof dom }>((p, r) => (
  <View {...p} ref={r} />
));
// @ts-expect-error A custom root's alternate host still needs a native ref.
export const invalidAlternate = <Card component={BrowserAs} as={dom} />;
const BrowserTheme = forwardRef<ViewInstance, ViewProps & { theme?: { browserOnly: true } }>(
  (p, r) => <View {...p} ref={r} />,
);
// @ts-expect-error Reserved theme inputs must be complete native themes.
export const invalidTheme = <Card component={BrowserTheme} theme={{ browserOnly: true }} />;
// @ts-expect-error Reserved inputs are derived from a selected root, not invented own Card props.
export const inventedAs = <Card as={Alternate} />;
