import { render, cleanup } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';
import { Box, Typography } from '../packages/material/src';
afterEach(cleanup);
import { createTheme, resolveSx, configureDiagnostics } from '../packages/system/src';
test('CSS inherit stays a text keyword instead of resolving the inherit typography variant object', () => {
  const theme = createTheme(),
    warn = jest.fn(),
    restore = configureDiagnostics(warn);
  try {
    const style = resolveSx(
      { fontSize: 'inherit', fontFamily: 'inherit', fontWeight: 'inherit' },
      theme,
      { parentTextStyle: { fontSize: 23, fontFamily: 'monospace', fontWeight: '700' } },
    );
    expect(style).toEqual({});
    expect(warn).not.toHaveBeenCalled();
  } finally {
    restore();
  }
});

test('explicit inherit typography keeps the physical parent metrics at the native text host', () => {
  const warn = jest.fn(),
    restore = configureDiagnostics(warn);
  try {
    const tree = render(
      <Box sx={{ fontSize: 23, fontFamily: 'monospace', fontWeight: 700 }}>
        <Typography variant="inherit" testID="reference">
          Reference
        </Typography>
        <Typography
          testID="inherited"
          variant="inherit"
          sx={{ fontSize: 'inherit', fontFamily: 'inherit', fontWeight: 'inherit' }}
        >
          Inherited
        </Typography>
      </Box>,
    );
    expect(tree.getByTestId('inherited')).toHaveStyle({
      fontSize: 23,
      fontFamily: StyleSheet.flatten(tree.getByTestId('reference').props.style).fontFamily,
      fontWeight: '700',
    });
    expect(warn).not.toHaveBeenCalled();
  } finally {
    restore();
  }
});
