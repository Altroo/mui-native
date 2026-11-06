// Copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT
import { forwardRef, useState } from 'react';
import { View } from 'react-native';
import { nativeStyleTree } from '../packages/material/src/nativeStyleAncestry';
import { render, cleanup, act } from '@testing-library/react-native';
import Svg from 'react-native-svg';
import {
  MenuList,
  List,
  ListItemButton,
  MenuItem,
  ButtonBase,
  ListItemIcon,
  ThemeProvider,
  createTheme,
  styled,
} from '../packages/material/src';
import Check from '../packages/icons/src/Check';
import originalCascade from './fixtures/mui-menu-icon-cascade-9.5.0.json';
import { componentRootStyle, componentStyle } from '../packages/system/src';
afterEach(cleanup);
test('parent descendant class rules outrank child plain sx before native inline', () => {
  const theme = createTheme({
    components: {
      MuiMenuItem: {
        styleOverrides: { root: { '& .MuiListItemIcon-root': { minWidth: 61, color: 'green' } } },
      },
    },
  });
  const tree = render(
    <ThemeProvider theme={theme}>
      <MenuList>
        <MenuItem>
          <ListItemIcon testID="icon" sx={{ minWidth: 80, color: 'purple' }}>
            <Check />
          </ListItemIcon>
        </MenuItem>
      </MenuList>
    </ThemeProvider>,
  );
  expect(tree.getByTestId('icon')).toHaveStyle({ minWidth: 61 });
  expect(tree.UNSAFE_getByType(Svg).props.color).toBe('green');
});
test('parent rules use actual authored icon classes', () => {
  const tree = render(
    <MenuList>
      <MenuItem sx={{ '& .custom-icon': { minWidth: 67 } }}>
        <ListItemIcon testID="icon" classes={{ root: 'custom-icon' }}>
          <Check />
        </ListItemIcon>
      </MenuItem>
    </MenuList>,
  );
  expect(tree.getByTestId('icon')).toHaveStyle({ minWidth: 67 });
});
test('child genuine native inline remains above parent CSS', () => {
  const tree = render(
    <MenuList>
      <MenuItem sx={{ '& .MuiListItemIcon-root': { minWidth: 67 } }}>
        <ListItemIcon testID="icon" style={{ minWidth: 83 }}>
          <Check />
        </ListItemIcon>
      </MenuItem>
    </MenuList>,
  );
  expect(tree.getByTestId('icon')).toHaveStyle({ minWidth: 83 });
});

test('dense parent tag rule beats SvgIcon own sx and uses authored rem root only', () => {
  const theme = createTheme({ cssRootFontSize: 20 });
  const tree = render(
    <ThemeProvider theme={theme}>
      <MenuList dense>
        <MenuItem>
          <ListItemIcon>
            <Check sx={{ fontSize: 45 }} />
          </ListItemIcon>
        </MenuItem>
      </MenuList>
    </ThemeProvider>,
  );
  expect(tree.UNSAFE_getByType(Svg).props.width).toBe(25);
});
test('Icon descendants participate in the same class/tag specificity cascade', () => {
  const tree = render(
    <MenuList>
      <MenuItem sx={{ '& .MuiListItemIcon-root svg': { fontSize: 31 } }}>
        <ListItemIcon sx={{ '& .MuiSvgIcon-root': { fontSize: 35 } }}>
          <Check />
        </ListItemIcon>
      </MenuItem>
    </MenuList>,
  );
  expect(tree.UNSAFE_getByType(Svg).props.width).toBe(31);
});
test('parent self state guards descendant selectors without transferring state onto the child', () => {
  const tree = render(
    <MenuList>
      <MenuItem
        selected
        sx={{
          '&.Mui-selected .MuiListItemIcon-root': { minWidth: 65 },
          '& .MuiListItemIcon-root': { '&.Mui-selected': { minWidth: 99 } },
        }}
      >
        <ListItemIcon testID="icon" />
      </MenuItem>
    </MenuList>,
  );
  expect(tree.getByTestId('icon')).toHaveStyle({ minWidth: 65 });
  tree.rerender(
    <MenuList>
      <MenuItem sx={{ '&.Mui-selected .MuiListItemIcon-root': { minWidth: 65 } }}>
        <ListItemIcon testID="icon" />
      </MenuItem>
    </MenuList>,
  );
  expect(tree.getByTestId('icon')).toHaveStyle({ minWidth: 36 });
});
test('parent CSS root declarations do not leak onto its icon root', () => {
  const tree = render(
    <MenuList>
      <MenuItem sx={{ minWidth: 92, fontSize: 39, opacity: 0.2 }}>
        <ListItemIcon testID="icon">
          <Check />
        </ListItemIcon>
      </MenuItem>
    </MenuList>,
  );
  expect(tree.getByTestId('icon')).toHaveStyle({ minWidth: 36 });
  expect(tree.getByTestId('icon').props.style.opacity).toBeUndefined();
  expect(tree.UNSAFE_getByType(Svg).props.width).toBe(24);
});
test('own descendant rules apply outside a MenuItem too', () => {
  const tree = render(
    <ListItemIcon sx={{ '& .MuiSvgIcon-root': { fontSize: 35, color: 'orange' } }}>
      <Check />
    </ListItemIcon>,
  );
  expect(tree.UNSAFE_getByType(Svg).props.width).toBe(35);
  expect(tree.UNSAFE_getByType(Svg).props.color).toBe('orange');
});
test('parent variants and state callbacks prepare once despite multiple icon descendants', () => {
  const root = jest.fn(() => ({ '& .MuiListItemIcon-root': { minWidth: 63 } }));
  const variant = jest.fn(() => ({ '& .MuiListItemIcon-root svg': { fontSize: 32 } }));
  const theme = createTheme({
    components: {
      MuiMenuItem: {
        styleOverrides: { root },
        variants: [{ props: { selected: true }, style: variant }],
      },
    },
  });
  const tree = render(
    <ThemeProvider theme={theme}>
      <MenuList>
        <MenuItem selected>
          <ListItemIcon testID="one">
            <Check />
          </ListItemIcon>
          <ListItemIcon testID="two">
            <Check />
          </ListItemIcon>
        </MenuItem>
      </MenuList>
    </ThemeProvider>,
  );
  expect(tree.getByTestId('one')).toHaveStyle({ minWidth: 63 });
  expect(tree.getByTestId('two')).toHaveStyle({ minWidth: 63 });
  expect(root).toHaveBeenCalledTimes(1);
  expect(variant).toHaveBeenCalledTimes(1);
  expect(tree.UNSAFE_getAllByType(Svg).map((icon) => icon.props.width)).toEqual([32, 32]);
});
test('nested participating Icon root does not style its ancestor or unrelated sibling', () => {
  const tree = render(
    <MenuList>
      <MenuItem sx={{ '& .outer .inner .custom-svg': { fontSize: 41 } }}>
        <ListItemIcon testID="outer" className="outer">
          <ListItemIcon className="inner">
            <Check className="custom-svg" />
          </ListItemIcon>
        </ListItemIcon>
        <ListItemIcon>
          <Check testID="other" />
        </ListItemIcon>
      </MenuItem>
    </MenuList>,
  );
  expect(tree.getByTestId('outer')).toHaveStyle({ minWidth: 36 });
  expect(tree.UNSAFE_getAllByType(Svg).map((icon) => icon.props.width)).toEqual([41, 24]);
});

test('styled MenuItem keeps genuine theme/default inline props and final-root descendant CSS', () => {
  const native = Object.freeze({ opacity: 0.3 });
  const observer = jest.fn((_args: { ownerState: Record<string, unknown> }) => ({
    '& .MuiListItemIcon-root': { minWidth: 63 },
  }));
  const theme = createTheme({
    components: {
      MuiMenuItem: { defaultProps: { style: native }, styleOverrides: { root: observer } },
    },
  });
  const Styled = styled(styled(MenuItem)({ opacity: 0.6 }))({
    '&.Mui-selected .MuiListItemIcon-root': { minWidth: 67 },
  });
  const ref = jest.fn();
  const tree = render(
    <ThemeProvider theme={theme}>
      <MenuList>
        <Styled testID="item" selected ref={ref}>
          <ListItemIcon testID="icon" />
        </Styled>
      </MenuList>
    </ThemeProvider>,
  );
  expect(tree.getByTestId('item')).toHaveStyle({ opacity: 0.3 });
  expect(tree.getByTestId('icon')).toHaveStyle({ minWidth: 67 });
  expect(observer.mock.calls).toHaveLength(1);
  const config = theme.components.MuiMenuItem;
  expect(observer.mock.calls[0][0].ownerState.style).toBe(
    config && typeof config === 'object' ? config.defaultProps?.style : undefined,
  );
  expect(ref).toHaveBeenCalledTimes(1);
});
test('a prepared MenuItem preserves native default callback state and runs it once before descendant collection', () => {
  const callback = jest.fn((state: { pressed: boolean }) => ({
    opacity: state.pressed ? 0.25 : 0.4,
  }));
  const observer = jest.fn((_args: { ownerState: Record<string, unknown> }) => ({
    '& .MuiListItemIcon-root': { minWidth: 63 },
  }));
  const theme = createTheme({
    components: {
      MuiMenuItem: { defaultProps: { style: callback }, styleOverrides: { root: observer } },
    },
  });
  const Styled = styled(MenuItem)({ '& .MuiListItemIcon-root svg': { fontSize: 31 } });
  const tree = render(
    <ThemeProvider theme={theme}>
      <MenuList>
        <Styled testID="item" testOnly_pressed>
          <ListItemIcon>
            <Check />
          </ListItemIcon>
          <ListItemIcon>
            <Check />
          </ListItemIcon>
        </Styled>
      </MenuList>
    </ThemeProvider>,
  );
  expect(tree.getByTestId('item')).toHaveStyle({ opacity: 0.25 });
  expect(callback).toHaveBeenCalledTimes(1);
  expect(callback.mock.calls[0][0].pressed).toBe(true);
  expect(observer.mock.calls[0][0].ownerState.style).toBe(callback);
  expect(tree.UNSAFE_getAllByType(Svg).map((icon) => icon.props.width)).toEqual([31, 31]);
});

test('live equal-specificity selector reordering updates retained parent CSS', () => {
  const first = { '& .MuiListItemIcon-root': { minWidth: 61 }, '& .custom-icon': { minWidth: 67 } };
  const second = {
    '& .custom-icon': { minWidth: 67 },
    '& .MuiListItemIcon-root': { minWidth: 61 },
  };
  const scene = (sx: typeof first) => (
    <MenuList>
      <MenuItem sx={sx}>
        <ListItemIcon testID="icon" className="custom-icon" />
      </MenuItem>
    </MenuList>
  );
  const tree = render(scene(first));
  expect(tree.getByTestId('icon')).toHaveStyle({ minWidth: 67 });
  tree.rerender(scene(second));
  expect(tree.getByTestId('icon')).toHaveStyle({ minWidth: 61 });
});

function originalCase(input: unknown) {
  const value = input as {
    name: string;
    dense?: boolean;
    inheritedDense?: boolean;
    selected?: boolean;
    htmlFontSize?: number;
    sx?: import('../packages/system/src').SxProps;
    override?: import('../packages/system/src').SxObject;
    baseOverride?: import('../packages/system/src').SxObject;
    variant?: import('../packages/system/src').SxObject;
    iconSx?: import('../packages/system/src').SxProps;
    svgSx?: import('../packages/system/src').SxProps;
    iconClasses?: { root: string };
    svgClasses?: { root: string };
    style?:
      | { opacity?: number; minWidth?: number; fontSize?: number; paddingLeft?: number }
      | null
      | '$undefined';
    iconStyle?: { minWidth: number; color: string };
    svgStyle?: { fontSize: number };
    defaultStyle?: { opacity: number; paddingLeft?: number };
    wrapped?: boolean;
    nested?: boolean;
    merge?: boolean;
    expected: { minWidth: number; fontSize?: number; color?: string };
  };
  let owner: unknown;
  const theme = createTheme({
    cssRootFontSize: value.htmlFontSize ?? 16,
    typography: { htmlFontSize: value.htmlFontSize ?? 16 },
    components: {
      mergeClassNameAndStyle: value.merge ?? false,
      MuiButtonBase: { styleOverrides: { root: value.baseOverride ?? {} } },
      MuiMenuItem: {
        defaultProps: Object.hasOwn(value, 'defaultStyle') ? { style: value.defaultStyle } : {},
        styleOverrides: {
          root: ({ ownerState }) => {
            owner = {
              hasStyle: Object.hasOwn(ownerState, 'style'),
              style: ownerState.style ?? null,
            };
            return value.override ?? {};
          },
        },
        variants: value.variant ? [{ props: { selected: true }, style: value.variant }] : [],
      },
    },
  });
  const Root = value.wrapped
    ? value.nested
      ? styled(styled(MenuItem)({ opacity: 0.6 }))({ opacity: 0.8 })
      : styled(MenuItem)({ opacity: 0.8 })
    : MenuItem;
  const tree = render(
    <ThemeProvider theme={theme}>
      <MenuList dense={value.inheritedDense}>
        <Root
          testID="item"
          dense={value.dense}
          selected={value.selected ?? Boolean(value.variant)}
          sx={value.sx}
          {...(Object.hasOwn(value, 'style')
            ? { style: value.style === '$undefined' ? undefined : value.style }
            : {})}
        >
          <ListItemIcon
            testID="icon"
            sx={value.iconSx}
            style={value.iconStyle}
            classes={value.iconClasses}
          >
            <Check sx={value.svgSx} style={value.svgStyle} classes={value.svgClasses} />
          </ListItemIcon>
        </Root>
      </MenuList>
    </ThemeProvider>,
  );
  return { tree, value, owner };
}
test.each(originalCascade.fixtures)(
  'native finite cascade matches original emitted CSS: $input.name',
  ({ input, owner }) => {
    const actual = originalCase(input);
    expect(actual.tree.getByTestId('icon')).toHaveStyle({
      minWidth: actual.value.expected.minWidth,
    });
    expect(actual.tree.UNSAFE_getByType(Svg).props.width).toBe(
      actual.value.expected.fontSize ?? 24,
    );
    if (actual.value.expected.color)
      expect(actual.tree.UNSAFE_getByType(Svg).props.color).toBe(actual.value.expected.color);
    expect(actual.owner).toEqual(owner);
  },
);

test('a custom root host replacement publishes physical ownership and preserves React 19 cleanup refs', () => {
  let replace = () => {};
  const Changing = forwardRef<
    import('react-native').ViewInstance,
    import('../packages/material/src').ListItemIconRootProps
  >((props, ref) => {
    const [revision, setRevision] = useState(0);
    replace = () => setRevision((value) => value + 1);
    return <View key={revision} {...props} ref={ref} />;
  });
  const cleanups: jest.Mock[] = [];
  const attached: import('react-native').ViewInstance[] = [];
  const ref = jest.fn((node: import('react-native').ViewInstance | null) => {
    if (node) attached.push(node);
    const cleanup = jest.fn();
    cleanups.push(cleanup);
    return cleanup;
  });
  const tree = render(<ListItemIcon component={Changing} ref={ref} />);
  const changed = jest.spyOn(nativeStyleTree, 'changed');
  act(replace);
  expect(attached).toHaveLength(2);
  expect(attached[1]).not.toBe(attached[0]);
  expect(changed).toHaveBeenCalledTimes(2);
  expect(cleanups[0]).toHaveBeenCalledTimes(1);
  expect(cleanups[1]).not.toHaveBeenCalled();
  expect(nativeStyleTree.groupRulesAt(attached[1])).toHaveLength(1);
  tree.unmount();
  expect(nativeStyleTree.groupRulesAt(attached[1])).toHaveLength(0);
  expect(cleanups[1]).toHaveBeenCalledTimes(1);
  changed.mockRestore();
});

test('an empty physical descendant path never applies the owning root declarations', () => {
  const theme = createTheme();
  const root = componentRootStyle(theme, '', {}, undefined, undefined, {
    baseStyle: { opacity: 0.2, '& .target': { minWidth: 63 } },
  });
  const child = componentStyle(theme, '', {}, undefined, {
    ancestors: [
      {
        theme,
        name: '',
        props: {},
        prepared: root.prepared,
        context: { descendantOnly: true, descendantPath: [] },
      },
    ],
  });
  expect(child.opacity).toBeUndefined();
  expect(child.minWidth).toBeUndefined();
});

test.each(['plain', 'prepared'] as const)(
  'merged ButtonBase defaults evaluate the %s authored callback once with one native layer',
  (kind) => {
    const authored = Object.freeze({ opacity: 0.25 });
    const callback = jest.fn(
      (_state: import('../packages/material/src').ButtonBaseState) => authored,
    );
    const theme = createTheme({
      components: {
        mergeClassNameAndStyle: true,
        MuiButtonBase: { defaultProps: { style: { paddingLeft: 12 } } },
        ...(kind === 'prepared' ? { MuiMenuItem: { defaultProps: { style: callback } } } : {}),
      },
    });
    const Styled = styled(MenuItem)({ '& .MuiListItemIcon-root': { minWidth: 69 } });
    const content = <ListItemIcon testID="icon" />;
    const body =
      kind === 'plain' ? (
        <MenuItem
          testID="item"
          style={callback}
          sx={{ '& .MuiListItemIcon-root': { minWidth: 69 } }}
        >
          {content}
        </MenuItem>
      ) : (
        <Styled testID="item">{content}</Styled>
      );
    const tree = render(
      <ThemeProvider theme={theme}>
        <MenuList>{body}</MenuList>
      </ThemeProvider>,
    );
    expect(tree.getByTestId('item')).toHaveStyle({ opacity: 0.25, paddingLeft: 12 });
    expect(tree.getByTestId('icon')).toHaveStyle({ minWidth: 69 });
    expect(callback).toHaveBeenCalledTimes(1);
    // Inspect the already cached host result: equal pixels alone would miss a
    // duplicated authored layer from separately evaluating the pre-Base style.
    const result = tree
      .UNSAFE_getByType(ButtonBase)
      .props._muiNativeStyle({ pressed: false, focusVisible: false, disabled: false });
    const layers = (value: unknown): unknown[] =>
      Array.isArray(value) ? value.flatMap(layers) : value ? [value] : [];
    expect(layers(result.authored).filter((layer) => layer === authored)).toHaveLength(1);
    expect(
      layers(result.authored).filter(
        (layer) =>
          typeof layer === 'object' &&
          layer !== null &&
          'paddingLeft' in layer &&
          layer.paddingLeft === 12,
      ),
    ).toHaveLength(1);
    expect(callback).toHaveBeenCalledTimes(1);
  },
);
test.each(['static', 'callback'] as const)(
  'native %s direction reaches ListContext and nested list roots',
  (kind) => {
    const callback = jest.fn(() => ({ direction: 'rtl' as const }));
    const style = kind === 'callback' ? callback : Object.freeze([{ direction: 'rtl' as const }]);
    const tree = render(
      <MenuList>
        <MenuItem testID="item" style={style}>
          <List testID="nested-list">
            <ListItemButton testID="nested-row">Nested</ListItemButton>
          </List>
        </MenuItem>
      </MenuList>,
    );
    expect(tree.getByTestId('item')).toHaveStyle({ direction: 'rtl' });
    expect(tree.getByTestId('nested-list')).toHaveStyle({ direction: 'rtl' });
    expect(tree.getByTestId('nested-row')).toHaveStyle({ direction: 'rtl' });
    if (kind === 'callback') expect(callback).toHaveBeenCalledTimes(1);
  },
);

test.each([false, true])(
  'Menu and Base callback defaults retain existing merge policy %s without repeating the authored callback',
  (merge) => {
    const base = jest.fn(() => ({ opacity: 0.6 }));
    const menu = jest.fn(() => ({ minHeight: 41 }));
    const authored = jest.fn(() => Object.freeze([{ opacity: 0.25 }]));
    const theme = createTheme({
      components: {
        mergeClassNameAndStyle: merge,
        MuiButtonBase: { defaultProps: { style: base } },
        MuiMenuItem: { defaultProps: { style: menu } },
      },
    });
    const tree = render(
      <ThemeProvider theme={theme}>
        <MenuList>
          <MenuItem testID="item" style={authored}>
            <ListItemIcon>
              <Check />
            </ListItemIcon>
            <ListItemIcon>
              <Check />
            </ListItemIcon>
          </MenuItem>
        </MenuList>
      </ThemeProvider>,
    );
    expect(tree.getByTestId('item')).toHaveStyle({ opacity: 0.25, minHeight: merge ? 41 : 48 });
    expect(authored).toHaveBeenCalledTimes(1);
    expect(base).toHaveBeenCalledTimes(merge ? 1 : 0);
    expect(menu).toHaveBeenCalledTimes(merge ? 1 : 0);
  },
);
