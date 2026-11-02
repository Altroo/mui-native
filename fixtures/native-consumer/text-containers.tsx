import React from 'react';
import { View, Text, type ViewInstance } from 'react-native';
import { Box, Paper, Stack, Dialog, DialogContent, Typography } from '@mui/material';
import { createTheme, styled } from '@mui/material/styles';
import {
  NativeTextScope,
  type NativeTextScopeValue,
  type NativeStyle,
} from '@altroo/mui-native-system';
const ref = React.createRef<ViewInstance>();
const Surface = styled(View)({ fontSize: '1.25rem', lineHeight: 1.5, color: 'primary.main' });
export const content = (
  <Box ref={ref} sx={{ fontSize: 24, lineHeight: 1.5 }} style={{ color: '#112233' }}>
    Hello {0}
    {1n}
    <Paper>
      <Stack>
        <Typography variant="inherit">Inherited</Typography>Raw
      </Stack>
    </Paper>
    <Surface>Styled native text</Surface>
    <Dialog open slotProps={{ transition: { appear: false } }}>
      <DialogContent>Dialog copy</DialogContent>
    </Dialog>
  </Box>
);
const theme = createTheme();
export const custom = (
  <NativeTextScope theme={theme} style={{ fontSize: 20, color: 'red' }} content={['Custom ', 0]}>
    {(style: NativeStyle, children: React.ReactNode, scope: NativeTextScopeValue) => (
      <View ref={ref} style={style} accessibilityLabel={scope.style.color ? 'Colored' : undefined}>
        {children}
      </View>
    )}
  </NativeTextScope>
);
void Text;
