// Copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT
import { Dimensions } from 'react-native';
import { render, act, cleanup } from '@testing-library/react-native';
import Svg from 'react-native-svg';
import {
  ListItemIcon,
  MenuItem,
  MenuList,
  ThemeProvider,
  createTheme,
} from '../packages/material/src';
import Check from '../packages/icons/src/Check';
import reference from './fixtures/mui-list-item-icon-9.5.0.json';
afterEach(cleanup);
test.each([16, 20, 24])('dense SVG uses the original1.25rem at CSS root%s', (root) => {
  const theme = createTheme({ cssRootFontSize: root });
  const tree = render(
    <ThemeProvider theme={theme}>
      <MenuList dense>
        <MenuItem>
          <ListItemIcon>
            <Check fontSize="large" />
          </ListItemIcon>
        </MenuItem>
      </MenuList>
    </ThemeProvider>,
  );
  expect(reference.denseMenu.fontSize).toBe('1.25rem');
  const size = Number.parseFloat(reference.denseMenu.fontSize) * root;
  expect(tree.UNSAFE_getByType(Svg).props).toMatchObject({ width: size, height: size });
});
test('OS font scale is not multiplied into authored dense SVG dimensions', () => {
  const window = Dimensions.get('window'),
    screen = Dimensions.get('screen');
  const tree = render(
    <ThemeProvider theme={createTheme({ cssRootFontSize: 24 })}>
      <MenuList dense>
        <MenuItem>
          <ListItemIcon>
            <Check />
          </ListItemIcon>
        </MenuItem>
      </MenuList>
    </ThemeProvider>,
  );
  try {
    act(() =>
      Dimensions.set({
        window: { ...window, fontScale: 2.5 },
        screen: { ...screen, fontScale: 2.5 },
      }),
    );
    expect(tree.UNSAFE_getByType(Svg).props).toMatchObject({ width: 30, height: 30 });
  } finally {
    tree.unmount();
    act(() => Dimensions.set({ window, screen }));
  }
});
test('genuine native SVG font size remains above the parent dense CSS scope', () => {
  const tree = render(
    <ThemeProvider theme={createTheme({ cssRootFontSize: 24 })}>
      <MenuList dense>
        <MenuItem>
          <ListItemIcon>
            <Check style={{ fontSize: 41 }} />
          </ListItemIcon>
        </MenuItem>
      </MenuList>
    </ThemeProvider>,
  );
  expect(tree.UNSAFE_getByType(Svg).props).toMatchObject({ width: 41, height: 41 });
});
