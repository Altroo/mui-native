// Copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT
import { useState } from 'react';
import { BackHandler, Keyboard, ScrollView, Text } from 'react-native';
import {
  act,
  cleanupAsync,
  fireEventAsync,
  renderAsync,
  screen,
} from '@testing-library/react-native';
import { ThemeProvider } from '../packages/material/src';
import { CatalogHome } from '../apps/native-catalog/CatalogHome';
import { useCatalogNavigation } from '../apps/native-catalog/useCatalogNavigation';
import { CatalogHeader } from '../apps/native-catalog/CatalogHeader';
import { catalogSections } from '../apps/native-catalog/catalogSections';
import { createCatalogTheme } from '../apps/native-catalog/catalogTheme';

jest.mock('@mui/material', () => jest.requireActual('../packages/material/src'), { virtual: true });
beforeEach(() => jest.useFakeTimers());
afterEach(async () => {
  await act(async () => jest.runOnlyPendingTimers());
  await cleanupAsync();
  jest.useRealTimers();
});
const theme = createCatalogTheme(false);

test('component search finds upstream names, opens the matching scene and recovers from no results', async () => {
  const navigate = jest.fn();
  function Browser() {
    const [query, setQuery] = useState('');
    return (
      <ThemeProvider theme={theme}>
        <CatalogHome query={query} onQueryChange={setQuery} onNavigate={navigate} />
      </ThemeProvider>
    );
  }
  await renderAsync(<Browser />);
  for (const { id } of catalogSections)
    expect(screen.getByTestId(`catalog-open-${id}`)).toBeTruthy();
  const search = async (text: string) =>
    fireEventAsync(screen.getByLabelText('Search components'), 'change', { nativeEvent: { text } });
  await search('  dAtEpIcKeR  ');
  expect(screen.getByTestId('catalog-open-Dates')).toBeTruthy();
  expect(screen.queryByTestId('catalog-open-Form')).toBeNull();
  await fireEventAsync.press(screen.getByTestId('catalog-open-Dates'));
  expect(navigate).toHaveBeenLastCalledWith('Dates');
  await search('no such component');
  expect(screen.getByText('No matching examples')).toBeTruthy();
  await fireEventAsync.press(screen.getByText('Clear search'), { nativeEvent: {} });
  expect(screen.getByTestId('catalog-open-Form')).toBeTruthy();
  expect(screen.queryByText('No matching examples')).toBeNull();
});

test('the landing specimen is interactive and links to its full collection', async () => {
  const navigate = jest.fn();
  await renderAsync(
    <ThemeProvider theme={theme}>
      <CatalogHome query="" onQueryChange={jest.fn()} onNavigate={navigate} />
    </ThemeProvider>,
  );
  expect(screen.getByRole('button', { name: 'Reset' })).toBeDisabled();
  await fireEventAsync.press(screen.getByText('Try it'), { nativeEvent: {} });
  await fireEventAsync.press(screen.getByText('Try it'), { nativeEvent: {} });
  expect(screen.getByText('Pressed 2 times.')).toBeTruthy();
  await fireEventAsync.press(screen.getByText('Reset'), { nativeEvent: {} });
  expect(screen.getByRole('button', { name: 'Reset' })).toBeDisabled();
  await fireEventAsync.press(screen.getByText('View examples'), { nativeEvent: {} });
  expect(navigate).toHaveBeenLastCalledWith('Groups');
});

test('navigation retains native scene identifiers, selected semantics and programmatic tab visibility', async () => {
  const navigate = jest.fn(),
    changeDark = jest.fn();
  const header = (section: 'Explore' | 'Wrappers') => (
    <ThemeProvider theme={theme}>
      <CatalogHeader
        section={section}
        onNavigate={navigate}
        dark={false}
        onDarkChange={changeDark}
      />
    </ThemeProvider>
  );
  const tree = await renderAsync(header('Explore'));
  for (const { id } of catalogSections)
    expect(screen.getByTestId(`catalog-tab-${id}`)).toBeTruthy();
  const tabs = screen.UNSAFE_getByType(ScrollView);
  const scrollTo = jest.spyOn(tabs.instance, 'scrollTo');
  await fireEventAsync(screen.getByTestId('catalog-tab-Wrappers'), 'layout', {
    nativeEvent: { layout: { x: 1200, y: 0, width: 150, height: 44 } },
  });
  await tree.rerenderAsync(header('Wrappers'));
  expect(screen.getByTestId('catalog-tab-Wrappers')).toBeSelected();
  expect(scrollTo).toHaveBeenCalledWith({ x: 1180, animated: false });
  await fireEventAsync.press(screen.getByTestId('catalog-home'));
  expect(navigate).toHaveBeenLastCalledWith('Explore');
  await fireEventAsync.press(screen.getByRole('switch', { name: 'Dark mode' }), {
    nativeEvent: {},
  });
  expect(changeDark).toHaveBeenCalledWith(true);
});

test.each([
  ['ListItemAvatar', 'Wrappers'],
  ['ListItemIcon', 'Wrappers'],
  ['Snackbar', 'Form'],
  ['FormControlLabel', 'Form'],
])('search for %s opens its actual collection', async (query, route) => {
  const navigate = jest.fn();
  await renderAsync(
    <ThemeProvider theme={theme}>
      <CatalogHome query={query} onQueryChange={jest.fn()} onNavigate={navigate} />
    </ThemeProvider>,
  );
  await fireEventAsync.press(screen.getByTestId(`catalog-open-${route}`));
  expect(navigate).toHaveBeenCalledWith(route);
  if (query === 'Snackbar') expect(screen.queryByTestId('catalog-open-Overlays')).toBeNull();
});

test('Android Back returns from a specimen to Explore and releases its listener', async () => {
  const remove = jest.fn();
  let back: Parameters<typeof BackHandler.addEventListener>[1] | undefined;
  const backEvent = { type: 'hardwareBackPress', timeStamp: 1 };
  jest.spyOn(BackHandler, 'addEventListener').mockImplementation((_event, callback) => {
    back = callback;
    return { remove };
  });
  const dismiss = jest.spyOn(Keyboard, 'dismiss');
  function Navigation() {
    const { section, navigate } = useCatalogNavigation();
    return (
      <ThemeProvider theme={theme}>
        <CatalogHeader
          section={section}
          onNavigate={navigate}
          dark={false}
          onDarkChange={jest.fn()}
        />
        <Text testID="current-route">{section}</Text>
      </ThemeProvider>
    );
  }
  const tree = await renderAsync(<Navigation />);
  expect(back!(backEvent)).toBe(false);
  await fireEventAsync.press(screen.getByTestId('catalog-tab-Wrappers'));
  expect(screen.getByTestId('current-route')).toHaveTextContent('Wrappers');
  expect(dismiss).toHaveBeenCalled();
  await act(async () => {
    expect(back!(backEvent)).toBe(true);
  });
  expect(screen.getByTestId('current-route')).toHaveTextContent('Explore');
  expect(back!(backEvent)).toBe(false);
  await tree.unmountAsync();
  expect(remove).toHaveBeenCalledTimes(3);
});

test.each([2, 3.571])(
  'large text %s keeps concise navigation and an accessible appearance control',
  async (fontScale) => {
    jest
      .spyOn(require('react-native'), 'useWindowDimensions')
      .mockReturnValue({ width: 390, height: 844, scale: 3, fontScale });
    const navigate = jest.fn();
    await renderAsync(
      <ThemeProvider theme={theme}>
        <CatalogHeader
          section="Explore"
          onNavigate={navigate}
          dark={false}
          onDarkChange={jest.fn()}
        />
      </ThemeProvider>,
    );
    expect(screen.getByText('Native')).toBeTruthy();
    expect(screen.queryByText('COMPONENT LIBRARY · PRE-ALPHA')).toBeNull();
    expect(screen.getByRole('switch', { name: 'Dark mode' })).toBeTruthy();
    await fireEventAsync.press(screen.getByTestId('catalog-home'));
    expect(navigate).toHaveBeenCalledWith('Explore');
  },
);
