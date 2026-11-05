jest.mock('@mui/material', () => jest.requireActual('../packages/material/src'), { virtual: true });
import { cleanup, fireEvent, render } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';
import {
  ButtonGroupContext,
  ButtonGroupButtonContext,
  ThemeProvider,
  configureDiagnostics,
} from '../packages/material/src';
import { NativeTextStyleContext } from '../packages/system/src';
import {
  ButtonGroupExamples,
  PortalSurfaceAction,
} from '../apps/native-catalog/ButtonGroupExamples';
import { createCatalogTheme } from '../apps/native-catalog/catalogTheme';
import { Commands } from '../packages/native-host/src/AltrooMUIInteractiveViewNativeComponent';

afterEach(() => {
  cleanup();
  jest.restoreAllMocks();
});
const scene = () => (
  <ThemeProvider theme={createCatalogTheme(false)}>
    <ButtonGroupExamples />
  </ThemeProvider>
);

test.each([
  [16, '#0d070b'],
  [18, '#9c27b0'],
  [22, '#1565c0'],
] as const)(
  'the custom Portal payload uses Box to apply physical text context %ipx/%s',
  (fontSize, color) => {
    const diagnostics: string[] = [];
    const restore = configureDiagnostics((entry) => diagnostics.push(entry.code));
    try {
      const tree = render(
        <ThemeProvider theme={createCatalogTheme(false)}>
          <NativeTextStyleContext.Provider
            value={{ style: { fontSize, color }, nativeText: false }}
          >
            <ButtonGroupContext.Provider
              value={{ variant: 'text', color: 'inherit', size: 'large' }}
            >
              <ButtonGroupButtonContext.Provider value="MuiButtonGroup-lastButton">
                <PortalSurfaceAction />
              </ButtonGroupButtonContext.Provider>
            </ButtonGroupContext.Provider>
          </NativeTextStyleContext.Provider>
        </ThemeProvider>,
      );
      expect(
        StyleSheet.flatten(tree.getByTestId('group-closure-portal-text').props.style),
      ).toMatchObject({ fontSize, color });
      expect(tree.getByTestId('group-closure-portal-context')).toHaveTextContent(
        'Defaults text/inherit/large · last',
      );
      expect(diagnostics).toEqual([]);
    } finally {
      restore();
    }
  },
);

test('the surface expander preserves baseline actions and local counters through theme and nested updates', () => {
  const focus = jest.spyOn(Commands, 'focus').mockImplementation(() => {});
  const tree = render(scene());
  expect(tree.queryByTestId('group-closure-scene')).toBeNull();
  fireEvent.press(tree.getByTestId('group-save'));
  expect(tree.getByText('Save 1')).toBeTruthy();
  fireEvent.press(tree.getByTestId('group-closure-toggle'));
  expect(tree.getByTestId('group-closure-scene')).toBeTruthy();
  const radius = () =>
    StyleSheet.flatten(tree.getByTestId('group-closure-themed-actions').props.style).borderRadius;
  expect(radius()).toBe(12);
  fireEvent.press(tree.getByTestId('group-closure-themed-first'));
  fireEvent.press(tree.getByTestId('group-closure-theme-toggle'));
  expect(radius()).toBe(16);
  expect(tree.getByLabelText('Review count 1')).toBeTruthy();
  fireEvent.press(tree.getByTestId('group-closure-focus-first'));
  expect(tree.getByTestId('group-closure-theme-status')).toHaveTextContent(/focus requests 1/);
  expect(focus).toHaveBeenCalledTimes(1);
  expect(tree.getByTestId('group-closure-focus-status')).toHaveTextContent(
    'focus 0 · blur 0 · blurred',
  );
  const focusedNode = {};
  const focusEvent = {
    target: focusedNode,
    currentTarget: focusedNode,
    nativeEvent: { target: 1 },
  };
  fireEvent(tree.getByTestId('group-closure-themed-first'), 'onMUIFocus', focusEvent);
  expect(tree.getByTestId('group-closure-focus-status')).toHaveTextContent(
    'focus 1 · blur 0 · focused',
  );
  fireEvent(tree.getByTestId('group-closure-themed-first'), 'onMUIBlur', focusEvent);
  expect(tree.getByTestId('group-closure-focus-status')).toHaveTextContent(
    'focus 1 · blur 1 · blurred',
  );
  const nestedWidth = () =>
    StyleSheet.flatten(tree.getByTestId('group-closure-nested').props.style).minWidth;
  expect(nestedWidth()).toBe(180);
  fireEvent.press(tree.getByTestId('group-closure-nested-first'));
  fireEvent.press(tree.getByTestId('group-closure-nested-toggle'));
  expect(nestedWidth()).toBe(220);
  expect(tree.getByLabelText('Nested count 1')).toBeTruthy();
  expect(tree.getByTestId('group-closure-nested-status')).toHaveTextContent(
    /outlined\/error\/large/,
  );
  fireEvent.press(tree.getByTestId('group-closure-toggle'));
  expect(tree.queryByTestId('group-closure-scene')).toBeNull();
  expect(tree.getByText('Save 1')).toBeTruthy();
});

test('Portal route controls wait for positive layout from both mounted native destinations', () => {
  const tree = render(scene(), {
    createNodeMock: () => ({ measureInWindow: () => {} }),
  });
  fireEvent.press(tree.getByTestId('group-closure-toggle'));
  const route = () => tree.getByTestId('group-closure-portal-inside');
  const layout = (testID: string, width: number, height: number) =>
    fireEvent(tree.getByTestId(testID), 'layout', {
      nativeEvent: { layout: { x: 0, y: 0, width, height } },
    });
  expect(route().props.accessibilityState.disabled).toBe(true);
  expect(tree.getByTestId('group-closure-portal-status')).toHaveTextContent(
    'Waiting for destination layout',
  );
  layout('group-closure-portal-sibling-target', 240, 144);
  layout('group-closure-portal-inside-target', 0, 144);
  expect(route().props.accessibilityState.disabled).toBe(true);
  layout('group-closure-portal-inside-target', 240, 144);
  expect(route().props.accessibilityState.disabled).toBe(false);
  expect(tree.getByTestId('group-closure-portal-status')).toHaveTextContent(
    'Targets ready · route closed · not presented · paint default',
  );
  fireEvent.press(tree.getByTestId('group-closure-portal-paint-toggle'));
  expect(tree.getByTestId('group-closure-portal-status')).toHaveTextContent(
    /route closed · not presented · paint alternate/,
  );
  fireEvent.press(tree.getByTestId('group-closure-portal-paint-toggle'));
  expect(tree.getByTestId('group-closure-portal-status')).toHaveTextContent(
    /route closed · not presented · paint default/,
  );
});
