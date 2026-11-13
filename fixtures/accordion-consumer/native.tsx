// Copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT
import {
  createRef,
  forwardRef,
  type HTMLAttributes,
  type Component,
  type ComponentClass,
} from 'react';
import { View, type ViewInstance, type ViewProps } from 'react-native';
import Accordion, { type AccordionProps, type AccordionTypeMap } from '@mui/material/Accordion';
import { Accordion as RootAccordion, AccordionSummary } from '@mui/material';
import Direct from '@altroo/mui-native/Accordion';
import { createTheme, styled, type ComponentsPropsList, type Theme } from '@mui/material/styles';

const Required = forwardRef<ViewInstance, ViewProps & { tracking: string }>(
  ({ tracking, ...props }, ref) => <View {...props} nativeID={tracking} ref={ref} />,
);
export const identities: [typeof Accordion, typeof Accordion] = [RootAccordion, Direct];
export const props: AccordionProps<typeof Required> = { tracking: 'panel', children: 'Body' };
export const map: AccordionTypeMap<{ tracking: string }, typeof Required> = {
  props: { tracking: 'panel', children: 'Body', elevation: 3 },
  defaultComponent: Required,
};
export const native = (
  <Accordion
    component={Required}
    tracking="panel"
    ref={createRef<ViewInstance>()}
    elevation={3}
    onChange={(event, expanded) => {
      void event.nativeEvent;
      void expanded;
    }}
  >
    <AccordionSummary>Summary</AccordionSummary>
  </Accordion>
);
export const alias = (
  <Accordion component="div" ref={createRef<ViewInstance>()}>
    Body
  </Accordion>
);
export const exact: AccordionProps = {
  children: 'Body',
  expanded: undefined,
  disabled: undefined,
  disableGutters: undefined,
  defaultExpanded: undefined,
  onChange: undefined,
  classes: undefined,
  className: undefined,
  component: undefined,
  elevation: undefined,
  square: undefined,
  sx: undefined,
  variant: undefined,
  style: undefined,
  ref: undefined,
};
export const defaults: Partial<ComponentsPropsList['MuiAccordion']> = {
  component: Required,
  expanded: true,
};
export const theme = createTheme({ components: { MuiAccordion: { defaultProps: defaults } } });
const Styled = styled(Accordion)({ opacity: 0.8 });
export const wrapped = <Styled {...exact} ref={createRef<ViewInstance>()} />;
type Union = ViewProps & ({ kind: 'a'; alpha: string } | { kind: 'b'; beta: number });
const UnionRoot = forwardRef<ViewInstance, Union>((p, r) => <View {...p} ref={r} />);
export const branch = (
  <Accordion component={UnionRoot} kind="a" alpha="yes">
    Body
  </Accordion>
);
const conditional =
  Math.random() > 0.5 ? { component: Required, tracking: 'conditional' } : { className: 'default' };
export const spread = <Accordion {...conditional}>Body</Accordion>;
const dom = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>((props, ref) => (
  <div {...props} ref={ref} />
));
// @ts-expect-error Custom native root data remains required.
export const missing = <Accordion component={Required}>Body</Accordion>;
export const badBranch = (
  // @ts-expect-error A union root still requires the selected branch's data.
  <Accordion component={UnionRoot} kind="a">
    Body
  </Accordion>
);
// @ts-expect-error A mobile component cannot declare a DOM root ref.
export const domRoot = <Accordion component={dom}>Body</Accordion>;
const domSpread = { component: dom, children: 'Body' };
// @ts-expect-error Spreading cannot erase the native root constraint.
export const domNode = <Accordion {...domSpread} />;
// @ts-expect-error Direct calls enforce the same native root constraint.
export const domCall = Accordion(domSpread);
// @ts-expect-error Native refs cannot target browser elements.
export const domRef = <Accordion ref={createRef<HTMLDivElement>()}>Body</Accordion>;
// @ts-expect-error Browser root aliases are limited to the supported div mapping.
export const section = <Accordion component="section">Body</Accordion>;
// @ts-expect-error Unknown root attributes cannot be inferred into the contract.
export const invented = <Accordion invented="bad">Body</Accordion>;
// @ts-expect-error Content is required for the default root.
export const noContent = <Accordion />;
// @ts-expect-error Content remains required for a custom root.
export const noCustomContent = <Accordion component={Required} tracking="id" />;

const Reserved = forwardRef<ViewInstance, ViewProps & { as?: typeof View; theme?: Theme }>(
  ({ as: _as, theme: _theme, ...props }, ref) => <View {...props} ref={ref} />,
);
export const reserved = (
  <Accordion component={Reserved} as={View} theme={theme}>
    Body
  </Accordion>
);
const BrowserAlternate = forwardRef<ViewInstance, ViewProps & { as?: typeof dom }>(
  ({ as: _as, ...props }, ref) => <View {...props} ref={ref} />,
);
export const badAlternate = (
  // @ts-expect-error Reserved alternate hosts cannot expose browser refs.
  <Accordion component={BrowserAlternate} as={dom}>
    Body
  </Accordion>
);
const IncompleteTheme = forwardRef<
  ViewInstance,
  ViewProps & { theme?: { palette: { mode: string } } }
>(({ theme: _theme, ...props }, ref) => <View {...props} ref={ref} />);
export const badTheme = (
  // @ts-expect-error A styled root requires a complete native theme.
  <Accordion component={IncompleteTheme} theme={{ palette: { mode: 'dark' } }}>
    Body
  </Accordion>
);

const spreadInput: any = { testID: 'spread' };
export const spreadCallback = (
  <Accordion
    {...spreadInput}
    onChange={(event, expanded) => {
      void event.nativeEvent;
      const result: boolean = expanded;
      void result;
    }}
  >
    Body
  </Accordion>
);

// @ts-expect-error The expanded callback value is boolean for every root.
export const wrongCallback: AccordionProps['onChange'] = (_event: unknown, expanded: string) => {
  void expanded;
};
const missingOptional: { component?: typeof Required; children: string } = {
  component: Required,
  children: 'Body',
};
// @ts-expect-error An optional known custom component still requires its own data.
export const missingOptionalData = <Accordion {...missingOptional} />;
const validOptional: AccordionProps<typeof Required> = {
  component: Required,
  tracking: 'optional',
  children: 'Body',
};
export const optionalData = <Accordion {...validOptional} />;
const invalidConditional = Math.random() > 0.5 ? { component: Required } : { className: 'default' };
// @ts-expect-error Every possible custom-root branch requires tracking.
export const invalidSpread = <Accordion {...invalidConditional}>Body</Accordion>;
const callbackProps: AccordionProps = {
  children: 'Body',
  onChange: (event, expanded) => {
    void event.nativeEvent;
    const next: boolean = expanded;
    void next;
  },
};
export const callbackObject = <Accordion {...callbackProps} />;

type NativeClassProps = ViewProps & { tracking: string };
declare const NativeClass: ComponentClass<NativeClassProps> &
  (new (props: NativeClassProps) => Component<NativeClassProps> & ViewInstance);
export const nativeClassProps: AccordionProps<typeof NativeClass> = {
  tracking: 'class',
  children: 'Body',
};
export const nativeClass = (
  <Accordion
    component={NativeClass}
    tracking="class"
    ref={createRef<Component<NativeClassProps> & ViewInstance>()}
  >
    Body
  </Accordion>
);
// @ts-expect-error Native class roots retain their required data.
export const missingClassData = <Accordion component={NativeClass}>Body</Accordion>;
declare const OrdinaryClass: ComponentClass<ViewProps>;
// @ts-expect-error React class instances without native host methods are not native refs.
export const ordinaryClass = <Accordion component={OrdinaryClass}>Body</Accordion>;
declare const DOMClass: ComponentClass<HTMLAttributes<HTMLDivElement>> &
  (new (
    props: HTMLAttributes<HTMLDivElement>,
  ) => Component<HTMLAttributes<HTMLDivElement>> & HTMLDivElement);
// @ts-expect-error A browser class instance does not implement the native View contract.
export const browserClass = <Accordion component={DOMClass}>Body</Accordion>;
const RefLess = ({ tracking, ...props }: ViewProps & { tracking: string }) => (
  <View {...props} nativeID={tracking} />
);
export const refLess = (
  <Accordion component={RefLess} tracking="wrapper">
    Body
  </Accordion>
);
// @ts-expect-error Ref-less wrappers still retain required data.
export const missingRefLessData = <Accordion component={RefLess}>Body</Accordion>;
