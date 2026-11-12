import { nativeStyleCallback } from './helpers/nativeStyleCallback';
import { forwardRef } from 'react';
import { View, type ViewInstance } from 'react-native';
import { cleanup, render } from '@testing-library/react-native';
import {
  Dialog,
  InputLabel,
  ThemeProvider,
  createTheme,
  configureDiagnostics,
} from '../packages/material/src';
import { listSlotStyle } from '../packages/material/src/listStyles';

afterEach(cleanup);

test('list slot overrides process callback arrays and embedded variants without component root variants', () => {
  const theme = createTheme({
    components: {
      MuiListItemText: {
        styleOverrides: {
          primary: [
            nativeStyleCallback(({ ownerState }) => ({
              padding: 1,
              variants: [
                {
                  props: { dense: true },
                  style: [({ theme }) => ({ color: theme.palette.error.main, padding: 2 })],
                },
              ],
              opacity: ownerState.dense ? 0.5 : 1,
            })),
          ],
        },
        variants: [{ props: {}, style: { margin: 99 } }],
      },
    },
  });
  expect(listSlotStyle(theme, 'MuiListItemText', 'primary', { dense: true }, 400)).toEqual({
    padding: 2,
    opacity: 0.5,
    color: theme.palette.error.main,
  });
});

test('InputLabel asterisk preserves FormLabel and InputLabel callback/variant layers as CSS units', () => {
  const theme = createTheme({
    components: {
      MuiFormLabel: {
        styleOverrides: {
          asterisk: [
            {
              paddingRight: 2,
              variants: [
                {
                  props: { required: true },
                  style: { color: '#123456', fontWeight: 400 },
                },
              ],
            },
          ],
        },
      },
      MuiInputLabel: {
        styleOverrides: {
          asterisk: [
            nativeStyleCallback(({ ownerState }) => ({
              marginLeft: ownerState.required ? 3 : 0,
              variants: [
                {
                  props: { shrink: true },
                  style: ({ theme }) => ({ color: theme.palette.error.main, fontWeight: 700 }),
                },
              ],
            })),
          ],
        },
      },
    },
  });
  const tree = render(
    <ThemeProvider theme={theme}>
      <InputLabel required shrink disableAnimation>
        Name
      </InputLabel>
    </ThemeProvider>,
  );
  expect(tree.getByText('\u2009*')).toHaveStyle({
    paddingRight: 2,
    marginLeft: 3,
    color: theme.palette.error.main,
    fontWeight: '700',
  });
});

test('Dialog named slot arrays and embedded variants retain their source order and scoped sx', () => {
  const reset = configureDiagnostics(() => {});
  const Slot = forwardRef<ViewInstance, any>(function Slot(
    { ownerState: _owner, sx: _sx, ...props },
    ref,
  ) {
    return <View {...props} ref={ref} />;
  });
  const Root = forwardRef<ViewInstance, any>(function Root({ children }, ref) {
    return <View ref={ref}>{children}</View>;
  });
  const Transition = ({ children }: any) => children;
  try {
    const theme = createTheme({
      components: {
        MuiDialog: {
          styleOverrides: {
            container: [
              nativeStyleCallback(({ ownerState }) => ({
                padding: ownerState.fullWidth ? 2 : 1,
                variants: [
                  {
                    props: { fullWidth: true },
                    style: { padding: 3 },
                  },
                ],
              })),
            ],
            paper: { variants: [{ props: { fullWidth: true }, style: { borderRadius: 10 } }] },
            paperFullWidth: [
              {
                borderRadius: 11,
                variants: [{ props: { fullWidth: true }, style: { borderRadius: 12 } }],
              },
            ],
          },
        },
      },
    });
    const tree = render(
      <ThemeProvider theme={theme}>
        <Dialog
          open
          fullWidth
          slots={{ root: Root, container: Slot, paper: Slot, transition: Transition }}
          slotProps={{
            container: { testID: 'container', sx: { p: 1 } },
            paper: { testID: 'paper' },
          }}
        >
          Content
        </Dialog>
      </ThemeProvider>,
    );
    expect(tree.getByTestId('container')).toHaveStyle({ padding: 8 });
    expect(tree.getByTestId('paper')).toHaveStyle({ borderRadius: 12 });
  } finally {
    reset();
  }
});
