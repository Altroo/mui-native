// Copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT
import { createRef, forwardRef, type HTMLAttributes, type CSSProperties } from 'react';
import Box, {
  boxClasses,
  type BoxProps,
  type BoxClasses,
  type BoxClassKey,
} from '@mui/material/Box';
import { Box as RootBox, boxClasses as RootClasses } from '@mui/material';
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
export const root: typeof Box = RootBox;
export const classes: typeof boxClasses = RootClasses;
unstable_ClassNameGenerator.configure((name) => 'native-' + name);
unstable_ClassNameGenerator.reset();
type TrackedProps = HTMLAttributes<HTMLDivElement> & {
  tracking: string;
  theme?: Theme;
  as?: 'div';
};
export const Tracked = forwardRef<HTMLDivElement, TrackedProps>((p, ref) => (
  <div ref={ref} data-tracking={p.tracking} style={p.style}>
    {p.children}
  </div>
));
const ref = createRef<HTMLDivElement>();
export const plain = (
  <Box component="div" ref={ref} className={undefined} sx={undefined} style={undefined} />
);
export const tracked = (
  <Box
    component={Tracked}
    tracking="a"
    theme={themed}
    as="div"
    ref={ref}
    sx={(theme) => ({ opacity: theme.boxAccent })}
  />
);
export const typed: BoxProps<typeof Tracked> = {
  component: Tracked,
  tracking: 'a',
  className: undefined,
  style: { padding: 0 },
  sx: [false, null, { m: 1 }],
};
export const spread = <Box {...typed} />;
export const called = Box({ component: Tracked, tracking: 'a', ref });
export const optionalRoot: BoxProps<typeof Tracked> = { tracking: 'a' };
export const optionalSpread = <Box {...optionalRoot} />;
export const Styled = styled(Box)({ opacity: 0.3 });
export const styledUse = <Styled sx={{ p: 2 }} />;
const conditional =
  Math.random() > 0.5
    ? { component: Tracked, tracking: 'a', className: 'native' }
    : { className: 'default' };
export const conditionalSpread = <Box {...conditional} />;
type ChoiceProps = HTMLAttributes<HTMLDivElement> &
  ({ kind: 'a'; a: string } | { kind: 'b'; b: number });
const Choice = forwardRef<HTMLDivElement, ChoiceProps>((p, ref) => (
  <div ref={ref} data-kind={p.kind} />
));
export const choice = <Box component={Choice} kind="a" a="required" />;
const RequiredClass = (p: { id?: string; className: string }) => <div id={p.id} />;
const RequiredStyle = (p: { id?: string; style: { opacity: number } }) => (
  <div id={p.id} style={p.style} />
);
const NoStyle = (p: { id?: string }) => <div id={p.id} />;
export const requiredClass = <Box component={RequiredClass} className="owned" />;
export const requiredStyle = <Box component={RequiredStyle} style={{ opacity: 0.5 }} />;
// @ts-expect-error source root still requires its own className
export const missingClass = <Box component={RequiredClass} />;
// @ts-expect-error source root still requires its own style
export const missingStyle = <Box component={RequiredStyle} />;
// @ts-expect-error source Box does not invent style for a custom root without that prop
export const undeclaredStyle = <Box component={NoStyle} style={{ opacity: 0.5 }} />;
// @ts-expect-error source styles are object-shaped
export const stringStyle = <Box style="padding:0" />;
// @ts-expect-error declared optional Theme excludes null
export const nullTheme = <Box component={Tracked} tracking="a" theme={null} />;
// @ts-expect-error declared optional Theme excludes explicit undefined under exact optional properties
export const undefinedTheme = <Box component={Tracked} tracking="a" theme={undefined} />;
// @ts-expect-error default root does not own theme
export const defaultTheme = <Box theme={themed} />;
// @ts-expect-error source9.5 does not mix SystemProps into BoxOwnProps
export const systemProp = <Box p={2} />;
// @ts-expect-error required root prop cannot disappear
export const missing = <Box component={Tracked} />;
const missingExpanded = { component: Tracked, className: 'missing' };
// Original structural/default overload accepts this expanded missing-root-prop object.
// Native deliberately guards the same case; this is not a source negative fixture.
export const missingSpread = <Box {...missingExpanded} />;
// @ts-expect-error required root prop cannot disappear in a call
export const missingCall = Box({ component: Tracked });
// @ts-expect-error source root discriminants remain correlated
export const badChoice = <Box component={Choice} kind="a" b={2} />;
// @ts-expect-error optional known component does not remove required root props
export const badOptional: BoxProps<typeof Tracked> = { component: Tracked };
export const css: CSSProperties = { opacity: 0.5 };

// Actual source fallback accepts the missing custom data when a structural
// default-root alternative is present; native deliberately guards this case.
const mixedMissing = Math.random() > 0.5 ? { component: Tracked } : { className: 'default' };
export const mixedMissingSpread = <Box {...mixedMissing} />;
export const mixedMissingCall = Box(mixedMissing);
