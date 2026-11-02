import { createTheme } from '@mui/material';

// The catalog uses the same quiet surfaces and data hierarchy as Facturation Native.
// Library defaults remain Material defaults; applications choose their own theme.
export function createCatalogTheme(dark: boolean) {
  return createTheme({
    palette: {
      mode: dark ? 'dark' : 'light',
      primary: { main: dark ? '#8dc4ff' : '#0274d7', contrastText: dark ? '#121722' : '#ffffff' },
      background: { default: dark ? '#121722' : '#f5f5f5', paper: dark ? '#222c3d' : '#ffffff' },
      text: { primary: dark ? '#f1f5f9' : '#0d070b', secondary: dark ? '#a8b7ca' : '#64748b' },
      divider: dark ? '#475569' : '#e2e8f0',
      action: { selected: dark ? '#263c58' : '#e7f1fb' },
    },
    shape: { borderRadius: 16 },
    typography: {
      h5: { fontSize: 26, lineHeight: '34px', fontWeight: '600', letterSpacing: -0.5 },
      h6: { fontSize: 20, lineHeight: '28px', fontWeight: '600' },
      subtitle1: { fontSize: 16, lineHeight: '24px', fontWeight: '600' },
      subtitle2: { fontSize: 14, lineHeight: '22px', fontWeight: '600' },
    },
    components: {
      MuiButton: {
        styleOverrides: { root: { textTransform: 'none', fontWeight: '600', borderRadius: 10 } },
      },
    },
  });
}
