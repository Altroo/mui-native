// Copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT
import React, { createRef } from 'react';
import Svg, { Path, Circle, Ellipse, G, Defs, Use } from 'react-native-svg';
import { cleanup, fireEvent, render } from '@testing-library/react-native';
import {
  Box,
  ThemeProvider,
  createTheme,
  createSvgIcon,
  type SvgIconHandle,
  type SvgIconProps,
} from '@altroo/mui-native';
import Add from '../packages/icons/src/Add';
import AddOutlined from '../packages/icons/src/AddOutlined';
import AddRounded from '../packages/icons/src/AddRounded';
import AddSharp from '../packages/icons/src/AddSharp';
import AddTwoTone from '../packages/icons/src/AddTwoTone';
import AccessAlarmTwoTone from '../packages/icons/src/AccessAlarmTwoTone';
import AdminPanelSettingsOutlined from '../packages/icons/src/AdminPanelSettingsOutlined';
import MedicationLiquidTwoTone from '../packages/icons/src/MedicationLiquidTwoTone';
import factoryReference from './fixtures/mui-icon-factory-9.5.0.json';
import Battery20 from '../packages/icons/src/Battery20';
import JoinFull from '../packages/icons/src/JoinFull';

afterEach(cleanup);

test.each([Add, AddOutlined, AddRounded, AddSharp, AddTwoTone])(
  'each supplied Add style preserves native SvgIcon refs, props and defaults',
  (Icon) => {
    const ref = createRef<SvgIconHandle>(),
      pressed = jest.fn();
    const theme = createTheme({
      components: { MuiSvgIcon: { defaultProps: { color: 'success' } } },
    });
    const tree = render(
      <ThemeProvider theme={theme}>
        <Icon
          ref={ref}
          titleAccess="Add item"
          fontSize="small"
          viewBox="0 0 32 32"
          onClick={pressed}
          sx={{ opacity: 0.7 }}
        />
      </ThemeProvider>,
    );
    const root = tree.UNSAFE_getByType(Svg);
    expect(ref.current).toBeInstanceOf(Svg);
    expect(typeof ref.current?.toDataURL).toBe('function');
    expect(root.props).toMatchObject({
      color: theme.palette.success.main,
      width: 20,
      height: 20,
      viewBox: '0 0 32 32',
      opacity: 0.7,
    });
    fireEvent.press(tree.getByRole('image', { name: 'Add item' }));
    expect(pressed).toHaveBeenCalledTimes(1);
    const before = ref.current;
    tree.rerender(
      <ThemeProvider theme={theme}>
        <Icon ref={ref} titleAccess="Updated" style={{ fontSize: 31 }} />
      </ThemeProvider>,
    );
    expect(ref.current).toBe(before);
    expect(tree.UNSAFE_getByType(Svg).props).toMatchObject({ width: 31, height: 31 });
    tree.unmount();
    expect(ref.current).toBeNull();
  },
);

test('multi-path arrays retain original per-path opacity and ignore replacement children', () => {
  const tree = render(
    <AccessAlarmTwoTone>
      <Circle r={99} />
    </AccessAlarmTwoTone>,
  );
  expect(tree.UNSAFE_queryAllByType(Circle)).toHaveLength(0);
  const paths = tree.UNSAFE_getAllByType(Path);
  expect(paths).toHaveLength(2);
  expect(paths[0].props.opacity).toBe('.3');
  expect(paths[1].props.opacity).toBeUndefined();
  expect(tree.UNSAFE_getByType(Svg).props).toMatchObject({
    testID: 'AccessAlarmTwoToneIcon',
    viewBox: '0 0 24 24',
  });
});

test('original groups, fill rules and circle geometry survive native translation', () => {
  const tree = render(<AdminPanelSettingsOutlined />);
  expect(tree.UNSAFE_getAllByType(G).some((node) => node.props.fillRule === 'evenodd')).toBe(true);
  expect(tree.UNSAFE_getByType(Circle).props).toMatchObject({ cx: '17', cy: '15.5', r: '1.12' });
});

test('the catalog defs/use glyph preserves references, group opacity and ellipse geometry', () => {
  const tree = render(<MedicationLiquidTwoTone />);
  expect(tree.UNSAFE_getByType(Defs)).toBeTruthy();
  expect(tree.UNSAFE_getByType(Use).props).toMatchObject({ xlinkHref: '#a', overflow: 'visible' });
  expect(tree.UNSAFE_getAllByType(G).some((node) => node.props.opacity === '.3')).toBe(true);
  expect(tree.UNSAFE_getAllByType(Path).some((node) => node.props.id === 'a')).toBe(true);
  expect(tree.UNSAFE_getByType(Ellipse).props).toMatchObject({
    cx: '20',
    cy: '10',
    rx: '1',
    ry: '2',
    opacity: '.3',
  });
});

test('fragment and ellipse icons inherit scoped native color and font metrics', () => {
  const tree = render(
    <Box sx={{ color: '#123456', fontSize: 32 }}>
      <Battery20 fontSize="inherit" />
      <JoinFull fontSize="inherit" />
    </Box>,
  );
  for (const node of tree.UNSAFE_getAllByType(Svg))
    expect(node.props).toMatchObject({ color: '#123456', width: 32, height: 32 });
  expect(tree.UNSAFE_getByType(Ellipse).props).toMatchObject({ rx: '3', ry: '5.74' });
  expect(tree.UNSAFE_getAllByType(Path).length).toBeGreaterThan(1);
});

test.each(factoryReference.cases)(
  'factory source contract: $mode, authored=$authored',
  ({ mode, authored, observation }) => {
    const restore = process.env.NODE_ENV;
    process.env.NODE_ENV = mode;
    try {
      const path = <Path d="M0 0h4v4z" />,
        ref = createRef<SvgIconHandle>();
      const Custom = () => null;
      const Icon = createSvgIcon(path, 'Probe') as unknown as {
        muiName?: string;
        displayName?: string;
        type: {
          muiName?: string;
          displayName?: string;
          render: ((
            props: SvgIconProps | SvgIconProps<typeof Custom>,
            ref: React.Ref<SvgIconHandle>,
          ) => React.ReactElement<Record<string, unknown>>) & {
            muiName?: string;
            displayName?: string;
          };
        };
      };
      const inner = Icon.type.render;
      const props: SvgIconProps | SvgIconProps<typeof Custom> = authored
        ? {
            'data-testid': 'Authored',
            children: 'replacement',
            color: 'secondary',
            component: Custom,
            fontSize: 'large',
            viewBox: '0 0 48 12',
          }
        : {};
      const element = inner(props, ref);
      expect({
        outerMuiName: Icon.muiName ?? null,
        outerDisplayName: Icon.displayName ?? null,
        forwardMuiName: Icon.type.muiName ?? null,
        forwardDisplayName: Icon.type.displayName ?? null,
        renderMuiName: inner.muiName ?? null,
        renderDisplayName: inner.displayName ?? null,
        testId: element.props['data-testid'] ?? null,
        refPreserved: element.props.ref === ref,
        childrenFixed: element.props.children === path,
        customRootPreserved: !authored || element.props.component === Custom,
        color: element.props.color ?? null,
        fontSize: element.props.fontSize ?? null,
        viewBox: element.props.viewBox ?? null,
      }).toEqual(observation);
    } finally {
      process.env.NODE_ENV = restore;
    }
  },
);

test('a generated icon keeps a custom native root, inherited viewBox and React 19 ref cleanup', () => {
  const released = jest.fn(),
    attach = jest.fn(() => released);
  const Root = React.forwardRef<Svg, React.ComponentProps<typeof Svg> & { badge: string }>(
    function Root({ badge, ...props }, ref) {
      return <Svg viewBox="0 0 48 12" {...props} ref={ref} accessibilityLabel={badge} />;
    },
  );
  const tree = render(
    <Add component={Root} badge="Custom" ref={attach} inheritViewBox viewBox="0 0 99 99" />,
  );
  expect(tree.UNSAFE_getByType(Svg).props).toMatchObject({
    viewBox: '0 0 48 12',
    accessibilityLabel: 'Custom',
  });
  expect(tree.UNSAFE_getByType(Path).props.d).toBe('M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6z');
  expect(attach).toHaveBeenCalledTimes(1);
  tree.unmount();
  expect(released).toHaveBeenCalledTimes(1);
});
