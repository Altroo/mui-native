import { View } from 'react-native';
import {
  createTheme,
  styled,
  type FocusVisible,
  type Shadows,
  type ThemeOptions,
} from '@mui/material/styles';
import { resolveSx } from '@mui/system';

const shadows: Shadows = [...createTheme().shadows];
shadows[2] = '0 2px 4px 1px rgba(0,0,0,0.25)';
const focusVisible: FocusVisible = { outlineWidth: '0.125rem', boxShadow: '0 0 2px currentColor' };
const options: ThemeOptions = {
  shadows,
  focusVisible,
  components: {
    MuiConsumer: {
      styleOverrides: {
        root: ({ theme, ownerState }) => [
          {
            color: theme.palette.primary.main,
            variants: [
              {
                props: (input) =>
                  input.disabled ===
                  (ownerState && typeof ownerState === 'object' && 'disabled' in ownerState
                    ? ownerState.disabled
                    : undefined),
                style: (input) => [
                  { padding: input.theme.spacing(1) },
                  // Styled variant callbacks expose the theme through their genuine theme prop.
                  { color: input.theme.palette.primary.main },
                ],
              },
            ],
          },
        ],
      },
    },
  },
};
const theme = createTheme(options);
export const Surface = styled(View, { name: 'MuiConsumer' })({ boxShadow: 2 });
export const styles = resolveSx({ boxShadow: 2 }, theme);
export const withoutRing = createTheme({ focusVisible: false });
export const defaultRing = createTheme({ focusVisible: true });
// @ts-expect-error MUI's shadows tuple must declare all 25 levels.
export const incomplete: Shadows = ['none', '0 1px 2px red'];
// @ts-expect-error Level zero retains the source 'none' contract.
export const invalidZero: Shadows = ['0 1px 2px red', ...shadows.slice(1)];
