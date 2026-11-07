// Copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT
import { createRef, forwardRef, type HTMLAttributes, type RefAttributes } from 'react';
import { View, type ViewInstance, type ViewProps, type StyleProp } from 'react-native';
import Box, {
  Box as DeepBox,
  boxClasses,
  type BoxProps,
  type BoxClasses,
  type BoxClassKey,
  type BoxTypeMap,
} from '@mui/material/Box';
import Direct from '@altroo/mui-native/Box';
import { Box as RootBox, boxClasses as RootClasses, type NativeStyle } from '@mui/material';
import { createTheme, styled, type Theme } from '@mui/material/styles';
import { unstable_ClassNameGenerator } from '@mui/material/className';
declare module '@mui/material/styles' {
  interface Theme {
    boxAccent: number;
  }
  interface ThemeOptions {
    boxAccent?: number;
  }
}
declare module '@mui/material/Box' {
  interface BoxClasses {
    branded: string;
  }
}
export const classMap: BoxClasses = { root: 'root', branded: 'brand' };
export const key: BoxClassKey = 'branded';
export const themed = createTheme({ boxAccent: 0.4 });
export const accent: number = themed.boxAccent;
export const alias: typeof Box = Direct;
export const deep: typeof Box = DeepBox;
export const root: typeof Box = RootBox;
export const classes: typeof boxClasses = RootClasses;
unstable_ClassNameGenerator.configure((name) => 'native-' + name);
unstable_ClassNameGenerator.reset();
type TrackedProps = Omit<ViewProps, 'style'> & {
  tracking: string;
  className?: string | undefined;
  style?: StyleProp<NativeStyle> | undefined;
  theme?: Theme;
  as?: typeof View;
};
export const Tracked = forwardRef<ViewInstance, TrackedProps>((p, ref) => (
  <View ref={ref} nativeID={p.tracking} testID={p.testID} style={p.style}>
    {p.children}
  </View>
));
const ref = createRef<ViewInstance>();
export const plain = (
  <Box
    component="div"
    ref={ref}
    testID="box"
    className={undefined}
    sx={undefined}
    style={undefined}
    onLayout={(event) => event.nativeEvent.layout.width}
  />
);
export const nativeView = <Box component={View} ref={ref} style={{ fontSize: 20 }} />;
export const tracked = (
  <Box
    component={Tracked}
    tracking="a"
    theme={themed}
    as={View}
    ref={ref}
    sx={(theme) => ({ opacity: theme.boxAccent })}
  />
);
export const typed: BoxProps<typeof Tracked> = {
  component: Tracked,
  tracking: 'a',
  className: undefined,
  style: [{ padding: 0 }],
  sx: [false, null, { m: 1 }],
};
export const spread = <Box {...typed} />;
export const called = Box({ component: Tracked, tracking: 'a', ref });
export const optionalRoot: BoxProps<typeof Tracked> = { tracking: 'a' };
export const optionalSpread = <Box {...optionalRoot} />;
export const Styled = styled(Box)({ opacity: 0.3 });
export const styledUse = <Styled testID="styled" sx={{ p: 2 }} />;
export const map: BoxTypeMap<{ marker: string }, 'div', Theme & { second: number }>['props'] = {
  marker: 'a',
  ref,
  sx: (theme) => ({ opacity: theme.second }),
};
const conditional =
  Math.random() > 0.5
    ? { component: Tracked, tracking: 'a', testID: 'native' }
    : { testID: 'default' };
export const conditionalSpread = <Box {...conditional} />;
type ChoiceProps = ViewProps & ({ kind: 'a'; a: string } | { kind: 'b'; b: number });
const Choice = forwardRef<ViewInstance, ChoiceProps>((p, ref) => (
  <View ref={ref} testID={p.testID} />
));
export const choice = <Box component={Choice} kind="a" a="required" />;
const RequiredClass = (p: { testID?: string; className: string }) => <View testID={p.testID} />;
const RequiredStyle = (p: { testID?: string; style: { opacity: number } }) => (
  <View testID={p.testID} style={p.style} />
);
const NoStyle = (p: { testID?: string }) => <View testID={p.testID} />;
export const requiredClass = <Box component={RequiredClass} className="owned" />;
export const requiredStyle = <Box component={RequiredStyle} style={{ opacity: 0.5 }} />;
// @ts-expect-error source custom root still requires its own className prop
export const missingClass = <Box component={RequiredClass} />;
// @ts-expect-error source custom root still requires its own style prop
export const missingStyle = <Box component={RequiredStyle} />;
// @ts-expect-error style is root-derived rather than invented for a root that does not declare it
export const undeclaredStyle = <Box component={NoStyle} style={{ opacity: 0.5 }} />;
// @ts-expect-error native styles cannot be DOM CSS text
export const stringStyle = <Box style="padding:0" />;
// @ts-expect-error raw web scoped envelopes are not complete native theme overrides
export const rawTheme = <Box component={Tracked} tracking="a" theme={{ $$material: themed }} />;
// @ts-expect-error null reserved themes are outside the native override contract
export const nullTheme = <Box component={Tracked} tracking="a" theme={null} />;
// @ts-expect-error an explicitly undefined reserved override is excluded under exact optional properties
export const undefinedTheme = <Box component={Tracked} tracking="a" theme={undefined} />;
// @ts-expect-error default Box does not own a theme prop
export const defaultTheme = <Box theme={themed} />;
// @ts-expect-error pinned9.5 Box does not mix top-level system props into its native root
export const systemProp = <Box p={2} />;
// @ts-expect-error root prop remains required
export const missing = <Box component={Tracked} />;
const missingExpanded = { component: Tracked, testID: 'missing' };
// @ts-expect-error required root prop cannot disappear in an expanded object
export const missingSpread = <Box {...missingExpanded} />;
// @ts-expect-error function-call overload keeps required root props
export const missingCall = Box({ component: Tracked });
// @ts-expect-error discriminated native root branches remain correlated
export const badChoice = <Box component={Choice} kind="a" b={2} />;
// @ts-expect-error an optional known component still requires its declared props
export const badOptional: BoxProps<typeof Tracked> = { component: Tracked };
// @ts-expect-error DOM tags other than the documented div alias are not native roots
export const browserTag = <Box component="section" />;
// @ts-expect-error DOM refs are not native host refs
export const browserRef = <Box ref={createRef<HTMLDivElement>()} />;
const DOM = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>((props, ref) => (
  <div {...props} ref={ref} />
));
// @ts-expect-error explicit DOM-ref components are not native roots
export const dom = <Box component={DOM} />;
const domSpread = { component: DOM, testID: 'dom' };
// @ts-expect-error expanded DOM roots cannot pass through the object overload
export const domExpanded = <Box {...domSpread} />;
// @ts-expect-error explicit browser ref roots remain rejected in direct calls
export const domCalled = Box({ component: DOM, testID: 'dom' });
const unknown = { testID: 'box', mystery: 'no' };
// Default-root spreads retain ordinary structural assignment, as upstream.
export const unknownExpanded = <Box {...unknown} />;
// @ts-expect-error fresh unknown native fields are rejected
export const unknownFresh = <Box testID="box" mystery="no" />;
// @ts-expect-error fields on explicit custom roots remain checked
export const unknownCustom = <Box component={Tracked} tracking="a" mystery="no" />;
export type NativeRef = RefAttributes<ViewInstance>;

const mixedMissing = Math.random() > 0.5 ? { component: Tracked } : { testID: 'default' };
// @ts-expect-error a default-root alternative cannot absorb missing custom-root requirements
export const mixedMissingSpread = <Box {...mixedMissing} />;
// @ts-expect-error direct calls retain the same mixed custom/default correlation
export const mixedMissingCall = Box(mixedMissing);
const structuralCustom = {
  component: Tracked,
  tracking: 'owned',
  testID: 'custom',
  extraData: 'structural',
};
export const structuralCustomSpread = <Box {...structuralCustom} />;

const mixedDOM = Math.random() > 0.5 ? { component: DOM } : { testID: 'default' };
// @ts-expect-error a native default alternative cannot absorb an explicit DOM-ref root
export const mixedDOMSpread = <Box {...mixedDOM} />;
