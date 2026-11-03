import { forwardRef } from 'react';
import { View, StyleSheet, type ViewInstance } from 'react-native';
import { render, act, cleanup } from '@testing-library/react-native';
import { Modal, Dialog, ThemeProvider, createTheme } from '../packages/material/src';
import reference from './fixtures/mui-modals-9.5.0.json';
test.each(reference.fixtures)(
  'pinned modal contract: $props transition=$transition',
  ({ props, transition, defaults, output }) => {
    let root: any, backdrop: any, child: any;
    const trace: string[] = [];
    const Root = forwardRef<ViewInstance, any>(function Root(p, ref) {
      root = p;
      return <View ref={ref}>{p.children}</View>;
    });
    const Backdrop = forwardRef<ViewInstance, any>(function Backdrop(p, ref) {
      backdrop = p;
      return <View ref={ref} />;
    });
    const Child = forwardRef<ViewInstance, any>(function Child(p, ref) {
      child = p;
      return <View ref={ref} />;
    });
    render(
      <ThemeProvider theme={createTheme({ components: { MuiModal: { defaultProps: defaults } } })}>
        <Modal
          {...props}
          disablePortal
          slots={{ root: Root, backdrop: Backdrop }}
          slotProps={{ backdrop: { onClick: () => trace.push('slot') } }}
          onClose={(_event, reason) => trace.push(reason)}
        >
          <Child {...(transition ? { in: props.open } : {})} />
        </Modal>
      </ThemeProvider>,
    );
    if (backdrop && props.open) {
      act(() => {
        backdrop.onPress({ target: 1, currentTarget: 2, defaultPrevented: false });
        backdrop.onPress({ target: 2, currentTarget: 2, defaultPrevented: true });
      });
    }
    const keys = [
      'open',
      'exited',
      'closeAfterTransition',
      'disableAutoFocus',
      'disableEnforceFocus',
      'disablePortal',
      'disableRestoreFocus',
      'hideBackdrop',
      'keepMounted',
    ];
    expect({
      root: Boolean(root),
      backdrop: Boolean(backdrop),
      ownerState: root ? Object.fromEntries(keys.map((key) => [key, root.ownerState[key]])) : null,
      tabIndex: child?.tabIndex === -1 ? '-1' : (child?.tabIndex ?? null),
      transitionHooks: child ? Boolean(child.onEnter && child.onExited) : false,
      trace,
    }).toEqual(output);
    cleanup();
  },
);

test.each(reference.dialogRouting)('pinned Dialog routing: $name', (input) => {
  let root: any, paper: any;
  const Root = forwardRef<ViewInstance, any>(function Root(p, _ref) {
    root = p;
    return p.children;
  });
  const Paper = forwardRef<ViewInstance, any>(function Paper(p, ref) {
    paper = p;
    return <View ref={ref} />;
  });
  let props: any =
    'explicitUndefined' in input && input.explicitUndefined
      ? { ...input.props, id: undefined, style: undefined, sx: undefined }
      : input.props;
  const controlKeys = [
    'disableAutoFocus',
    'disableEnforceFocus',
    'disableRestoreFocus',
    'disablePortal',
    'hideBackdrop',
    'keepMounted',
  ];
  if ('explicitUndefinedControls' in input && input.explicitUndefinedControls)
    props = { ...props, ...Object.fromEntries(controlKeys.map((key) => [key, undefined])) };
  render(
    <Dialog {...props} slots={{ root: Root, paper: Paper }}>
      Content
    </Dialog>,
  );
  const rootStyle = StyleSheet.flatten(root.style),
    paperStyle = StyleSheet.flatten(paper.style);
  expect({
    rootOpen: root.open,
    controls: Object.fromEntries(controlKeys.map((key) => [key, root[key] ?? null])),
    rootId: root.id ?? null,
    paperId: paper.id ?? null,
    rootOpacity: rootStyle?.opacity ?? null,
    rootPadding: rootStyle?.padding ?? null,
    paperOpacity: paperStyle?.opacity ?? null,
    paperMargin: paperStyle?.margin ?? null,
    rootSx: root.sx ?? null,
    paperSx: paper.sx ?? null,
  }).toEqual(input.output);
});
