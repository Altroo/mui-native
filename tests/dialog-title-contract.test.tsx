// Copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT
import { createRef, forwardRef } from 'react';
import { Text, View, type TextInstance, type TextProps } from 'react-native';
import { cleanup, render } from '@testing-library/react-native';
import {
  Box,
  Dialog,
  DialogTitle,
  Typography,
  ThemeProvider,
  createTheme,
  dialogTitleClasses,
  getDialogTitleUtilityClass,
  styled,
  type DialogTitleProps,
} from '@altroo/mui-native';
import Canonical from '../packages/material/src/DialogTitle/index';
import NativeClasses from '../packages/material/src/DialogTitle/dialogTitleClasses/index';
import { DialogContext } from '../packages/material/src/dialogContext';
import { unstable_ClassNameGenerator } from '../packages/material/src/classNameGenerator';
import { nativeStyleCallback } from './helpers/nativeStyleCallback';
import reference from './fixtures/mui-dialog-title-9.5.0.json';

// Motion has separate contracts; keep this suite focused on title/ID ownership.
beforeEach(() => jest.useFakeTimers());
afterEach(() => {
  cleanup();
  jest.clearAllTimers();
  jest.useRealTimers();
  unstable_ClassNameGenerator.reset();
});
const decode = (props: object = {}) =>
  Object.fromEntries(
    Object.entries(props).map(([key, value]) => [key, value === '$undefined' ? undefined : value]),
  );

test('root, deep and class-helper imports share their implementation', () => {
  expect(Canonical).toBe(DialogTitle);
  expect(NativeClasses).toBe(dialogTitleClasses);
  expect(dialogTitleClasses).toEqual(reference.classes);
  for (const [slot, value] of Object.entries(reference.utilities))
    expect(getDialogTitleUtilityClass(slot)).toBe(value);
});

test.each(reference.observations)(
  'original defaults and style stages: $input.name',
  (observation) => {
    const { input } = observation;
    const setting = input as {
      props?: object;
      context?: object;
      defaults?: object;
      typographyDefaults?: object;
      configured?: boolean;
      localTheme?: string;
      styled?: boolean;
      mergeStyle?: boolean;
    };
    const trace: unknown[] = [];
    let nativeClasses: unknown;
    const makeTheme = (titlePadding: number, primary?: string) =>
      createTheme({
        ...(primary
          ? { palette: { primary: { main: primary } }, typography: { h6: { fontSize: 38 } } }
          : {}),
        components: {
          ...(setting.mergeStyle ? { mergeClassNameAndStyle: true } : {}),
          MuiDialogTitle: {
            defaultProps: setting.defaults,
            styleOverrides: {
              root: nativeStyleCallback((args) => {
                trace.push({
                  stage: 'title',
                  ownerHasVariant: Object.hasOwn(args.ownerState, 'variant'),
                  ownerVariant: args.ownerState.variant ?? null,
                  id: args.id ?? null,
                  hasClasses: Boolean(args.classes),
                  themePrimary: args.theme.palette.primary.main,
                  hasStyle: Object.hasOwn(args, 'style'),
                  style: args.style ?? null,
                  ownerHasStyle: Object.hasOwn(args.ownerState, 'style'),
                  ownerStyle: args.ownerState.style ?? null,
                });
                return { paddingTop: titlePadding };
              }),
            },
          },
          MuiTypography: {
            defaultProps: setting.typographyDefaults,
            styleOverrides: {
              root: nativeStyleCallback((args) => {
                trace.push({
                  stage: 'typography',
                  variant: args.ownerState.variant,
                  component: args.ownerState.component ?? null,
                  hasClasses: Boolean(args.classes),
                  themePrimary: args.theme.palette.primary.main,
                  hasStyle: Object.hasOwn(args, 'style'),
                  style: args.style ?? null,
                  ownerHasStyle: Object.hasOwn(args.ownerState, 'style'),
                  ownerStyle: args.ownerState.style ?? null,
                });
                nativeClasses = args.className;
                return { paddingTop: 7 };
              }),
            },
          },
        },
      });
    const theme = makeTheme(13);
    const props = decode(setting.props);
    if (setting.localTheme) {
      const local = makeTheme(31, '#c43a18');
      props.theme =
        setting.localTheme === 'inherited'
          ? Object.create(local)
          : setting.localTheme === 'complete'
            ? local
            : setting.localTheme === 'scoped'
              ? { $$material: local }
              : setting.localTheme === 'empty'
                ? {}
                : setting.localTheme === 'null'
                  ? null
                  : undefined;
    }
    const Component = setting.styled ? styled(DialogTitle)({ opacity: 0.4 }) : DialogTitle;
    if (setting.configured) unstable_ClassNameGenerator.configure((name) => 'Consumer' + name);
    let content = (
      <Component {...(props as DialogTitleProps)} testID="title">
        Title
      </Component>
    );
    if (setting.context)
      content = (
        <DialogContext.Provider value={decode(setting.context)}>{content}</DialogContext.Provider>
      );
    const tree = render(<ThemeProvider theme={theme}>{content}</ThemeProvider>);
    expect(trace).toEqual(observation.trace);
    if (setting.styled) expect(tree.getByTestId('title')).toHaveStyle({ opacity: 0.4 });
    if (setting.localTheme) expect(tree.getByTestId('title')).toHaveStyle({ fontSize: 20 });
    expect(nativeClasses).toBe(observation.classes);
    expect(tree.getByTestId('title').props.id ?? null).toBe(observation.id);
    expect(tree.getByTestId('title').props.accessibilityRole).toBe('header');
    expect(tree.getByTestId('title')).toHaveStyle({
      paddingTop: observation.paddingTop,
      paddingLeft: observation.paddingLeft,
      paddingRight: 24,
      flex: 0,
    });
  },
);

test('default padding is 16 by 24 and classes belong only to the title layer', () => {
  let reads = 0;
  const classes = {
    get root() {
      reads += 1;
      return 'own-title';
    },
  };
  const tree = render(
    <DialogTitle testID="title" classes={classes}>
      Heading
    </DialogTitle>,
  );
  expect(reads).toBe(2);
  expect(tree.getByTestId('title')).toHaveStyle({
    paddingTop: 16,
    paddingBottom: 16,
    paddingLeft: 24,
    paddingRight: 24,
    fontSize: 20,
    flex: 0,
  });
  expect(tree.UNSAFE_getByType(Typography).props.classes).toBeUndefined();
  expect(tree.UNSAFE_getByType(Typography).props.className).toBe('MuiDialogTitle-root own-title');
});

test('authored sx and native styles follow the named layer and preserve text metrics', () => {
  const theme = createTheme({
    components: {
      MuiDialogTitle: { styleOverrides: { root: { paddingTop: 13, fontSize: '2rem' } } },
    },
  });
  const tree = render(
    <ThemeProvider theme={theme}>
      <DialogTitle
        testID="title"
        sx={{ paddingTop: 2, lineHeight: '1.5em' }}
        style={{ paddingTop: 29 }}
      >
        Heading
      </DialogTitle>
    </ThemeProvider>,
  );
  expect(tree.getByTestId('title')).toHaveStyle({ paddingTop: 29, fontSize: 32, lineHeight: 48 });
});

test('incoming class selectors and styled self selectors reach the same native Text', () => {
  const Styled = styled(DialogTitle)({ '&.MuiDialogTitle-root': { opacity: 0.4 } });
  const tree = render(
    <Box sx={{ '& .MuiDialogTitle-root': { paddingLeft: '31px' } }}>
      <Styled testID="title">Heading</Styled>
    </Box>,
  );
  expect(tree.getByTestId('title')).toHaveStyle({ paddingLeft: 31, opacity: 0.4 });
});

test('custom Text roots retain native refs and authored props across title updates', () => {
  const Root = forwardRef<
    TextInstance,
    TextProps & { tone: string; className?: string | undefined }
  >(({ tone, className: _name, ...props }, ref) => (
    <Text {...props} ref={ref} accessibilityHint={tone} />
  ));
  const ref = createRef<TextInstance>();
  const tree = render(
    <DialogTitle component={Root} tone="quiet" ref={ref} testID="title">
      Heading
    </DialogTitle>,
  );
  const first = ref.current;
  expect(first).not.toBeNull();
  expect(tree.getByTestId('title').props.accessibilityHint).toBe('quiet');
  tree.rerender(
    <DialogTitle component={Root} tone="loud" ref={ref} testID="title" variant="body1">
      Updated
    </DialogTitle>,
  );
  expect(ref.current).toBe(first);
  expect(tree.getByTestId('title').props.accessibilityHint).toBe('loud');
  tree.unmount();
  expect(ref.current).toBeNull();
});

test('Dialog shares a stable generated title ID with its paper', () => {
  const scene = (text: string) => (
    <Dialog
      open
      disablePortal
      transitionDuration={0}
      disableAutoFocus
      disableRestoreFocus
      slotProps={{ paper: { testID: 'paper' } }}
    >
      <DialogTitle testID="title">{text}</DialogTitle>
    </Dialog>
  );
  const tree = render(scene('Heading'));
  const id = tree.getByTestId('title').props.id;
  expect(typeof id).toBe('string');
  expect(id.length).toBeGreaterThan(0);
  expect(tree.getByTestId('paper').props['aria-labelledby']).toBe(id);
  tree.rerender(scene('Updated'));
  expect(tree.getByTestId('title').props.id).toBe(id);
  expect(tree.getByTestId('paper').props['aria-labelledby']).toBe(id);
});

test('Dialog preserves explicit and empty title relationships and paper slot priority', () => {
  const scene = (id: string) => (
    <Dialog
      open
      disablePortal
      transitionDuration={0}
      disableAutoFocus
      disableRestoreFocus
      aria-labelledby={id}
      slotProps={{ paper: { testID: 'paper', 'aria-labelledby': 'paper-only' } }}
    >
      <DialogTitle testID="title">Heading</DialogTitle>
    </Dialog>
  );
  const tree = render(scene('authored-title'));
  expect(tree.getByTestId('title').props.id).toBe('authored-title');
  expect(tree.getByTestId('paper').props['aria-labelledby']).toBe('paper-only');
  tree.rerender(scene(''));
  expect(tree.getByTestId('title').props.id).toBe('');
  expect(tree.getByTestId('paper').props['aria-labelledby']).toBe('paper-only');
});

test('nested dialogs isolate their generated title context', () => {
  const tree = render(
    <Dialog
      open
      disablePortal
      transitionDuration={0}
      disableAutoFocus
      disableRestoreFocus
      slotProps={{ paper: { testID: 'outer-paper' } }}
    >
      <DialogTitle testID="outer-title">Outer</DialogTitle>
      <Dialog
        open
        disablePortal
        transitionDuration={0}
        disableAutoFocus
        disableRestoreFocus
        slotProps={{ paper: { testID: 'inner-paper' } }}
      >
        <DialogTitle testID="inner-title">Inner</DialogTitle>
      </Dialog>
    </Dialog>,
  );
  const outer = tree.getByTestId('outer-title', { includeHiddenElements: true }).props.id;
  const inner = tree.getByTestId('inner-title').props.id;
  expect(outer).not.toBe(inner);
  expect(
    tree.getByTestId('outer-paper', { includeHiddenElements: true }).props['aria-labelledby'],
  ).toBe(outer);
  expect(tree.getByTestId('inner-paper').props['aria-labelledby']).toBe(inner);
});

test.each(reference.compositions)(
  'adjacent styled theme attachment: $input',
  ({ input, trace: expected }) => {
    const trace: string[] = [];
    const local = createTheme({ palette: { primary: { main: '#c43a18' } } });
    const next = createTheme({ palette: { primary: { main: '#6a1b9a' } } });
    const envelope = {
      get $$material() {
        trace.push('scope');
        return local;
      },
    };
    const theme =
      input === 'inherited-theme'
        ? Object.create(local)
        : input === 'empty'
          ? {}
          : input === 'null'
            ? null
            : envelope;
    const Inner = styled(View)((props) => {
      trace.push('inner:' + props.theme.palette.primary.main);
      if (input === 'mutated-theme')
        Object.assign(props, {
          theme: {
            get $$material() {
              trace.push('next-scope');
              return next;
            },
          },
        });
      if (input === 'mutated-null') Object.assign(props, { theme: null });
      if (input === 'mutated-missing') delete (props as { theme?: unknown }).theme;
      return { fontSize: 28 };
    });
    const Outer = styled(Inner)((props) => {
      trace.push('outer:' + props.theme.palette.primary.main);
      return { lineHeight: '1.5em' };
    });
    const tree = render(
      <ThemeProvider theme={createTheme({ palette: { primary: { main: '#2e7d32' } } })}>
        <Outer {...({ theme } as object)} testID="composed-root">
          Styled title
        </Outer>
      </ThemeProvider>,
    );
    expect(trace).toEqual(expected);
    // Native View text styles belong to its generated Text child.
    expect(tree.getByText('Styled title')).toHaveStyle({ fontSize: 28, lineHeight: 42 });
  },
);
