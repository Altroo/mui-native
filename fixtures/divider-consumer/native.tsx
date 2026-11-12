// Copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT
import { createRef, forwardRef, type HTMLAttributes, type JSX } from 'react';
import { View, StyleSheet, type ViewProps, type ViewInstance } from 'react-native';
import Divider, {
  dividerClasses,
  getDividerUtilityClass,
  type DividerProps,
  type DividerOwnProps,
  type DividerTypeMap,
  type DividerClasses,
  type DividerClassKey,
} from '@mui/material/Divider';
import DirectDivider, {
  Box as DividerBox,
  Typography as DividerTypography,
  Stack as DividerStack,
} from '@altroo/mui-native/Divider';
import {
  Divider as RootDivider,
  dividerClasses as RootClasses,
  Box,
  Typography,
  Stack,
} from '@mui/material';
import { createTheme, styled, type ComponentsPropsList } from '@mui/material/styles';
import Defaults from '@altroo/mui-native/DefaultPropsProvider';
declare module '@mui/material/Divider' {
  interface DividerPropsVariantOverrides {
    dashed: true;
    inset: false;
  }
  interface DividerClasses {
    contributorSlot?: string | undefined;
  }
}
export const exact: DividerProps = {
  absolute: undefined,
  children: undefined,
  classes: undefined,
  className: undefined,
  flexItem: undefined,
  orientation: undefined,
  sx: undefined,
  textAlign: undefined,
  variant: undefined,
  style: undefined,
  component: undefined,
  ref: undefined,
};
export const allAttrs: Exclude<keyof Omit<ViewProps, 'style'>, keyof DividerProps> extends never
  ? true
  : false = true;
export const own: DividerOwnProps = { absolute: true, textAlign: 'left', variant: 'dashed' };
export const key: DividerClassKey = 'contributorSlot';
export const classes: Partial<DividerClasses> = {
  root: 'chosen',
  wrapper: 'label',
  contributorSlot: 'custom',
};
export const identity: typeof Divider = RootDivider;
export const legacyBox: typeof Box = DividerBox;
export const legacyTypography: typeof Typography = DividerTypography;
export const legacyStack: typeof Stack = DividerStack;
export const directIdentity: typeof Divider = DirectDivider;
export const classIdentity: typeof dividerClasses = RootClasses;
export const helper: string = getDividerUtilityClass('constructor');
const Root = forwardRef<
  ViewInstance,
  ViewProps & { tracking: string; className?: string | undefined }
>(({ tracking, className: _className, ...native }, ref) => (
  <View {...native} nativeID={tracking} ref={ref} />
));
export const props: DividerProps<typeof Root> = { tracking: 'delivery' };
export const map: DividerTypeMap<{ tracking: string }, typeof Root> = {
  props: { tracking: 'delivery' },
  defaultComponent: Root,
};
export const defaults: ComponentsPropsList['MuiDivider'] = {
  component: Root,
  classes,
  variant: 'dashed',
};
export const provider = (
  <Defaults value={{ MuiDivider: { defaultProps: { component: Root, classes } } }}>
    <Divider />
  </Defaults>
);
export const theme = createTheme({
  components: {
    MuiDivider: {
      defaultProps: { classes, orientation: 'vertical' },
      styleOverrides: {
        root: ({ ownerState }) => ({
          opacity:
            ownerState &&
            typeof ownerState === 'object' &&
            Reflect.get(ownerState, 'variant') === 'dashed'
              ? 0.7
              : 1,
        }),
        wrapper: { paddingLeft: 7 },
      },
    },
  },
});
const registered = StyleSheet.create({ edge: { paddingLeft: 4 } });
const Styled = styled(Divider)({ opacity: 0.8 });
export const renderDivider: (props: Omit<DividerProps, 'component'>) => JSX.Element = Divider;
export const node = (
  <Divider
    component={Root}
    tracking="delivery"
    ref={createRef<ViewInstance>()}
    {...own}
    classes={classes}
    testID="divider"
    nativeID="line"
    role="separator"
    accessibilityLabel="Delivery"
    onLayout={(event) => event.nativeEvent.layout.width}
    onTouchEnd={(event) => event.nativeEvent.pageX}
    style={[registered.edge, { padding: 0 }]}
  />
);
export const wrapped = (
  <Styled {...exact} ref={createRef<ViewInstance>()}>
    Notes
  </Styled>
);
export const alias = <Divider component="hr" ref={createRef<ViewInstance>()} />;
type UnionProps = ViewProps & ({ kind: 'a'; alpha: string } | { kind: 'b'; beta: number });
const Union = forwardRef<ViewInstance, UnionProps>((props, ref) => <View {...props} ref={ref} />);
export const unionA = <Divider component={Union} kind="a" alpha="yes" />;
// @ts-expect-error Missing required discriminated branch data.
export const unionMissing = <Divider component={Union} kind="a" />;
// @ts-expect-error Custom root requires its declared tracking prop.
export const missing = <Divider component={Root} />;
// @ts-expect-error Native aliases carry View refs, not DOM refs.
export const wrongRef = <Divider ref={createRef<HTMLHRElement>()} />;
// @ts-expect-error Unknown native props are not source Divider fields.
export const wrongProp = <Divider expanded />;
// @ts-expect-error Augmentation removed the source inset variant.
export const removed = <Divider variant="inset" />;
// @ts-expect-error Unknown class keys stay rejected.
export const wrongClass = <Divider classes={{ unknown: 'bad' }} />;
// @ts-expect-error The original public export map has no class-leaf module.
export type PrivateLeaf = import('@mui/material/Divider/dividerClasses').DividerClasses;

const DomRoot = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>((props, ref) => (
  <div {...props} ref={ref} />
));
// @ts-expect-error DOM custom roots cannot supply a native Divider host/ref.
export const wrongCustomRoot = <Divider component={DomRoot} ref={createRef<HTMLDivElement>()} />;
// @ts-expect-error The native host requirement also applies when no ref is passed.
export const wrongCustomRootWithoutRef = <Divider component={DomRoot} />;
// @ts-expect-error The generic native Props alias rejects declared DOM root refs.
export const wrongCustomProps: DividerProps<typeof DomRoot> = { component: DomRoot };
const NoRefRoot = ({ tracking, ...props }: ViewProps & { tracking: string }) => (
  <View {...props} nativeID={tracking} />
);
export const customWithoutRef = <Divider component={NoRefRoot} tracking="plain" />;
// @ts-expect-error Non-forwarding roots still keep their required native props.
export const missingWithoutRef = <Divider component={NoRefRoot} />;

// @ts-expect-error Default Props also reject a root with a declared DOM ref.
export const wrongDefaultProps: DividerProps = { component: DomRoot };
// @ts-expect-error Component defaults cannot bypass the native root contract.
export const wrongMappedDefaults: ComponentsPropsList['MuiDivider'] = { component: DomRoot };
export const wrongThemeDefaults = createTheme({
  components: {
    MuiDivider: {
      defaultProps: {
        // @ts-expect-error Theme defaults cannot install a DOM root.
        component: DomRoot,
      },
    },
  },
});
export const requiredNativeThemeRoot = createTheme({
  components: { MuiDivider: { defaultProps: { component: Root, classes } } },
});
export const refLessNativeDefaults: DividerProps = { component: NoRefRoot };

export const wrongThemeOverride = createTheme(
  {},
  {
    components: {
      MuiDivider: {
        defaultProps: {
          // @ts-expect-error Later theme arguments preserve the native root contract.
          component: DomRoot,
        },
      },
    },
  },
);
export const customThemeDefaults = createTheme({
  components: { AppOwned: { defaultProps: { arbitrary: 1 } } },
});

const domSpread = { component: DomRoot, testID: 'rejected' };
// @ts-expect-error Spreading props cannot bypass the native root contract.
export const wrongSpread = <Divider {...domSpread} />;
// @ts-expect-error Callable component use cannot bypass native root validation.
export const wrongCall = Divider(domSpread);

// @ts-expect-error A common native prop cannot hide an unknown attribute.
export const wrongPropWithID = <Divider expanded testID="rejected" />;
export const wrongCustomPropWithID = (
  // @ts-expect-error Concrete custom roots reject unknown attributes too.
  <Divider component={Root} tracking="ok" expanded testID="rejected" />
);
const optionalNativeRoot: { component?: typeof Root; testID: string } = {
  component: Root,
  testID: 'rejected',
};
// @ts-expect-error An optional but known custom root still requires tracking.
export const wrongOptionalNativeRoot = <Divider {...optionalNativeRoot} />;

declare module '@mui/material/styles' {
  interface ThemeOptions {
    dividerConsumerMarker?: string;
  }
}
export const augmentedTheme = createTheme({ dividerConsumerMarker: 'native' });
export const augmentedOptionsMarker: string | undefined = (
  {} as import('@mui/material/styles').ThemeOptions
).dividerConsumerMarker;

// A conditional root keeps the props required by only its custom-root branch.
const conditionalRootProps =
  Math.random() > 0.5
    ? { component: Root, tracking: 'conditional', className: 'custom' }
    : { className: 'plain' };
export const conditionalRoot = <Divider {...conditionalRootProps} />;

// Pinned options accept explicit undefined under exact optional properties.
export const undefinedDividerDefaults = createTheme({
  components: { MuiDivider: { defaultProps: undefined } },
});
export const undefinedDividerOverrides = createTheme({
  components: { MuiDivider: { styleOverrides: undefined } },
});
export const undefinedDividerVariants = createTheme({
  components: { MuiDivider: { variants: undefined } },
});
export const undefinedMergeOption = createTheme({
  components: { mergeClassNameAndStyle: undefined },
});
export const undefinedComponents = createTheme({ components: undefined });
