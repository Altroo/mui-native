// Copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT
import { createRef, forwardRef, type JSX } from 'react';
import Details, {
  type AccordionDetailsProps,
  type AccordionDetailsClasses,
  type AccordionDetailsClassKey,
  accordionDetailsClasses,
  getAccordionDetailsUtilityClass,
} from '@mui/material/AccordionDetails';
import {
  AccordionDetails as RootDetails,
  accordionDetailsClasses as RootClasses,
} from '@mui/material';
import { createTheme, styled } from '@mui/material/styles';
declare module '@mui/material/AccordionDetails' {
  interface AccordionDetailsClasses {
    contributorSlot?: string | undefined;
  }
}
export const exactOptional: AccordionDetailsProps = {
  children: undefined,
  classes: undefined,
  className: undefined,
  sx: undefined,
  style: undefined,
};
export const key: AccordionDetailsClassKey = 'contributorSlot';
export const classes: Partial<AccordionDetailsClasses> = {
  root: 'chosen',
  contributorSlot: 'contributor',
};
export const rootIdentity: typeof Details = RootDetails;
export const rootClasses: typeof accordionDetailsClasses = RootClasses;
export const renderDetails: (props: AccordionDetailsProps) => JSX.Element = Details;
export const utility: string = getAccordionDetailsUtilityClass('__proto__');
export const theme = createTheme({
  components: {
    MuiAccordionDetails: {
      defaultProps: { classes },
      styleOverrides: { root: ({ ownerState }) => ({ opacity: ownerState.id ? 1 : 0.9 }) },
    },
  },
});
const Wrapped = styled(Details)({ padding: 0 });
export const node = (
  <Wrapped
    {...exactOptional}
    ref={createRef<HTMLDivElement>()}
    id="details"
    className="authored"
    onClick={(event) => event.currentTarget.id}
  >
    Body
  </Wrapped>
);
// @ts-expect-error Source Details has no component replacement in its exported declaration.
export const invalidComponent = <Details component="section" />;
// @ts-expect-error Source Details has no expanded prop.
export const invalidExpanded = <Details expanded />;
// @ts-expect-error Source class keys are constrained to declared/augmented names.
export const invalidClass = <Details classes={{ unknown: 'bad' }} />;
// @ts-expect-error Source Details is not a link.
export const invalidHref = <Details href="/account" />;
// @ts-expect-error React DOM style does not accept React Native array composition.
export const nativeArrayIsAdapterOnly = <Details style={[{ padding: 0 }]} />;
// @ts-expect-error The pinned original internal class file is not a public package export.
import UnpublishedClassLeaf from '@mui/material/AccordionDetails/accordionDetailsClasses';
export { UnpublishedClassLeaf };

// InternalStandardProps explicitly falls back to Ref<unknown> for Details.
export const originalBroadRef = <Wrapped ref={createRef<SVGSVGElement>()} />;
const TypedHost = forwardRef<HTMLDivElement, { title?: string | undefined }>((props, ref) => (
  <div {...props} ref={ref} />
));
const StyledTypedHost = styled(TypedHost)({ opacity: 1 });
export const originalTypedRef = <StyledTypedHost ref={createRef<HTMLDivElement>()} />;
// @ts-expect-error Original styled preserves a target component's declared ref type.
export const invalidTypedHostRef = <StyledTypedHost ref={createRef<SVGSVGElement>()} />;
