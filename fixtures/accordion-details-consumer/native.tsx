// Copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT
import { createRef, forwardRef, type JSX, type ComponentProps } from 'react';
import { View, StyleSheet, type ViewInstance, type ViewProps } from 'react-native';
import Details, {
  type AccordionDetailsProps,
  type AccordionDetailsClasses,
  type AccordionDetailsClassKey,
  accordionDetailsClasses,
  getAccordionDetailsUtilityClass,
} from '@mui/material/AccordionDetails';
import NativeDetails from '@altroo/mui-native/AccordionDetails';
import NativeClassLeaf from '@altroo/mui-native/AccordionDetails/accordionDetailsClasses';
import {
  AccordionDetails as RootDetails,
  accordionDetailsClasses as RootClasses,
} from '@mui/material';
import { createTheme, styled, type ComponentsPropsList } from '@mui/material/styles';

declare module '@mui/material/AccordionDetails' {
  interface AccordionDetailsClasses {
    contributorSlot?: string | undefined;
  }
}
type MissingHostProps = Exclude<keyof Omit<ViewProps, 'style'>, keyof AccordionDetailsProps>;
export const allNativeAttributes: MissingHostProps extends never ? true : false = true;
export const exactOptional: AccordionDetailsProps = {
  children: undefined,
  className: undefined,
  classes: undefined,
  sx: undefined,
  component: undefined,
  style: undefined,
};
export const key: AccordionDetailsClassKey = 'contributorSlot';
export const classes: Partial<AccordionDetailsClasses> = {
  root: 'chosen',
  contributorSlot: 'contributor',
};
export const rootIdentity: typeof Details = RootDetails;
export const nativeIdentity: typeof Details = NativeDetails;
export const rootClassIdentity: typeof accordionDetailsClasses = RootClasses;
export const leafIdentity: typeof accordionDetailsClasses = NativeClassLeaf;
export const renderDetails: (props: AccordionDetailsProps) => JSX.Element = Details;
export const utility: string = getAccordionDetailsUtilityClass('__proto__');
export const metadata: symbol = Details.$$typeof;
export const themeProps: ComponentsPropsList['MuiAccordionDetails'] = {
  classes,
  style: { padding: 0 },
};
const Root = forwardRef<ViewInstance, ViewProps & { className?: string | undefined }>(
  function DetailsRoot({ className: _className, ...native }, ref) {
    return <View {...native} ref={ref} />;
  },
);
const registered = StyleSheet.create({ edge: { paddingLeft: 7 } });
const Wrapped = styled(Details)((props) => ({ opacity: props.className ? 0.7 : 1 }));
export const theme = createTheme({
  components: {
    MuiAccordionDetails: {
      defaultProps: { className: 'default', classes },
      styleOverrides: { root: ({ ownerState }) => ({ opacity: ownerState.id ? 1 : 0.9 }) },
    },
  },
});
export const node = (
  <Wrapped
    {...exactOptional}
    component={Root}
    ref={createRef<ViewInstance>()}
    classes={classes}
    style={[registered.edge, { padding: 0 }]}
    id="details"
    testID="native-details"
    aria-label="Account details"
    accessibilityRole="group"
    onLayout={(event) => event.nativeEvent.layout.width}
    onTouchEnd={(event) => event.nativeEvent.pageX}
  >
    Body
  </Wrapped>
);
// @ts-expect-error Native wrappers do not accept HTML element refs.
export const invalidRef = <Details ref={createRef<HTMLDivElement>()} />;
// @ts-expect-error Source Details has no href prop; the native wrapper is not a link.
export const invalidHref = <Details href="/account" />;
// @ts-expect-error Source Details declares no expanded prop.
export const invalidExpanded = <Details expanded />;
// @ts-expect-error Only canonical augmented class keys are accepted.
export const invalidClass = <Details classes={{ unknown: 'bad' }} />;
// @ts-expect-error Native component replacement accepts a native component, not a DOM tag.
export const invalidComponent = <Details component="div" />;
// @ts-expect-error Details style is native StyleProp, not an interactive style callback.
export const invalidStyle = <Details style={() => ({ opacity: 1 })} />;
export const invalidEvent = (
  <Details
    onLayout={(event) => {
      // @ts-expect-error Layout events retain the real native event shape.
      return event.nativeEvent.missingGeometry;
    }}
  />
);

// @ts-expect-error A styled native wrapper must retain the underlying native ref type.
export const invalidStyledRef = <Wrapped ref={createRef<HTMLDivElement>()} />;

const UntypedTarget = ({ label }: { label: string }) => <View accessibilityLabel={label} />;
const StyledUntypedTarget = styled(UntypedTarget)({ opacity: 1 });
export const unchangedUntypedRefFallback: ComponentProps<typeof StyledUntypedTarget>['ref'] =
  createRef<unknown>();
