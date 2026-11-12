// Copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT
import { createRef, forwardRef, type HTMLAttributes, type JSX } from 'react';
import { View, StyleSheet, type ViewInstance, type ViewProps } from 'react-native';
import Paper, {
  paperClasses,
  getPaperUtilityClass,
  type PaperProps,
  type PaperOwnProps,
  type PaperTypeMap,
  type PaperClasses,
  type PaperClassKey,
  Box as LegacyBox,
  Card as LegacyCard,
} from '@mui/material/Paper';
import Direct from '@altroo/mui-native/Paper';
import { Paper as RootPaper, Box, Card } from '@mui/material';
import { createTheme, styled, type ComponentsPropsList } from '@mui/material/styles';
declare module '@mui/material/Paper' {
  interface PaperPropsVariantOverrides {
    glass: true;
    outlined: false;
  }
  interface PaperClasses {
    contributorSlot?: string | undefined;
  }
}
export const exact: PaperProps = {
  elevation: undefined,
  square: undefined,
  children: undefined,
  classes: undefined,
  className: undefined,
  sx: undefined,
  variant: undefined,
  style: undefined,
  component: undefined,
  ref: undefined,
};
export const attrs: Exclude<keyof Omit<ViewProps, 'style'>, keyof PaperProps> extends never
  ? true
  : false = true;
export const own: PaperOwnProps = { elevation: 3, square: true, variant: 'glass' };
export const key: PaperClassKey = 'contributorSlot';
export const classes: Partial<PaperClasses> = {
  root: 'root',
  elevation24: 'top',
  contributorSlot: 'extra',
};
export const identities: [typeof Paper, typeof Paper, typeof Box, typeof Card] = [
  RootPaper,
  Direct,
  LegacyBox,
  LegacyCard,
];
export const utility: string = getPaperUtilityClass('constructor');
export const knownClass: string = paperClasses.elevation24;
const Required = forwardRef<
  ViewInstance,
  ViewProps & { tracking: string; className?: string | undefined }
>(({ tracking, className: _className, ...props }, ref) => (
  <View {...props} nativeID={tracking} ref={ref} />
));
export const requiredProps: PaperProps<typeof Required> = { tracking: 'id' };
export const map: PaperTypeMap<{ tracking: string }, typeof Required> = {
  props: { tracking: 'id' },
  defaultComponent: Required,
};
export const defaults: ComponentsPropsList['MuiPaper'] = {
  component: Required,
  classes,
  variant: 'glass',
};
export const theme = createTheme({
  components: {
    MuiPaper: {
      defaultProps: defaults,
      styleOverrides: {
        root: ({ ownerState }) => ({
          opacity:
            ownerState && typeof ownerState === 'object' && Reflect.get(ownerState, 'square')
              ? 0.8
              : 1,
        }),
        rounded: { padding: 2 },
      },
      variants: [{ props: { variant: 'glass' }, style: { opacity: 0.9 } }],
    },
  },
});
export const undefConfig = createTheme({
  components: {
    MuiPaper: { defaultProps: undefined, styleOverrides: undefined, variants: undefined },
  },
});
const registered = StyleSheet.create({ gap: { paddingLeft: 4 } });
const Styled = styled(Paper)({ opacity: 0.8 });
export const callable: (props: Omit<PaperProps, 'component'>) => JSX.Element = Paper;
export const node = (
  <Paper
    component={Required}
    tracking="id"
    ref={createRef<ViewInstance>()}
    testID="paper"
    nativeID="surface"
    elevation={24}
    square
    classes={classes}
    variant="glass"
    style={[registered.gap, { padding: 0, backgroundImage: [] }]}
    onLayout={(e) => e.nativeEvent.layout.width}
    onTouchEnd={(e) => e.nativeEvent.pageX}
  >
    Body
  </Paper>
);
export const alias = <Paper component="div" ref={createRef<ViewInstance>()} />;
export const wrapped = <Styled {...exact} ref={createRef<ViewInstance>()} />;
type Union = ViewProps & ({ kind: 'a'; alpha: string } | { kind: 'b'; beta: number });
const UnionRoot = forwardRef<ViewInstance, Union>((p, r) => <View {...p} ref={r} />);
export const branch = <Paper component={UnionRoot} kind="a" alpha="yes" />;
const conditional =
  Math.random() > 0.5 ? { component: Required, tracking: 'conditional' } : { className: 'default' };
export const spread = <Paper {...conditional} />;
const dom = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>((props, ref) => (
  <div {...props} ref={ref} />
));
// @ts-expect-error Missing required custom root data.
export const missing = <Paper component={Required} />;
// @ts-expect-error Missing discriminated branch data.
export const badBranch = <Paper component={UnionRoot} kind="a" />;
// @ts-expect-error A native root cannot declare a DOM ref.
export const domRoot = <Paper component={dom} testID="bad" />;
const domSpread = { component: dom, testID: 'bad' };
// @ts-expect-error Spreading does not erase the native-root constraint.
export const domNode = <Paper {...domSpread} />;
// @ts-expect-error Direct calls retain the native-root constraint.
export const domCall = Paper(domSpread);
// @ts-expect-error DOM refs do not refer to a native View.
export const domRef = <Paper ref={createRef<HTMLDivElement>()} />;
// @ts-expect-error Host aliases are bounded to div; actual mobile roots use components.
export const section = <Paper component="section" />;
// @ts-expect-error Augmentation removes outlined from the public union.
export const removed = <Paper variant="outlined" />;
// @ts-expect-error Unknown variant requires explicit augmentation.
export const unknown = <Paper variant="unknown" />;
// @ts-expect-error Unknown own field must not be inferred into accepted props.
export const invented = <Paper testID="paper" invented="bad" />;
const common = { testID: 'paper', invented: 'bad' };
// Ordinary default-root spreads follow TypeScript structural assignment, as upstream.
export const unknownSpread = <Paper {...common} />;
export const badDefaults = createTheme({
  components: {
    MuiPaper: {
      defaultProps: {
        // @ts-expect-error Known theme defaults validate native root ref types.
        component: dom,
      },
    },
  },
});

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

const customUnknown = { component: Required, tracking: 'owned', testID: 'paper', invented: 'bad' };
// Non-fresh custom-root spreads also retain upstream structural assignment.
export const customUnknownNode = <Paper {...customUnknown} />;
const optionalRoot: { component?: typeof Required; testID: string } = {
  component: Required,
  testID: 'paper',
};
// @ts-expect-error An optional custom root does not erase required tracking data.
export const optionalMissing = <Paper {...optionalRoot} />;
// @ts-expect-error Divider's hr alias is not a Paper alias.
export const wrongAlias = <Paper component="hr" />;

export const freshCustomUnknown = (
  // @ts-expect-error Fresh custom-root attributes remain checked.
  <Paper component={Required} tracking="owned" invented="bad" testID="paper" />
);
