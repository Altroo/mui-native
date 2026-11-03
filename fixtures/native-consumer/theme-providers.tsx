import { View } from 'react-native';
import {
  ThemeProvider,
  useTheme,
  THEME_ID,
  createTheme,
  styled,
  type Theme,
  type ThemeProviderProps,
} from '@mui/material/styles';
import DeepThemeProvider from '@mui/material/styles/ThemeProvider';
import useMaterialTheme from '@mui/material/styles/useTheme';
import useMaterialThemeProps, {
  type ThemeWithProps,
  type ThemedProps,
} from '@mui/material/styles/useThemeProps';
import identifier from '@mui/material/styles/identifier';
import deepStyled from '@mui/material/styles/styled';
import SystemThemeProvider from '@mui/system/ThemeProvider';
import useSystemTheme, { systemDefaultTheme } from '@mui/system/useTheme';
import useThemeWithoutDefault from '@mui/system/useThemeWithoutDefault';
import RtlProvider, { useRtl } from '@mui/system/RtlProvider';
import { Button } from '@mui/material';
const theme = createTheme({ palette: { mode: 'dark' } });
const props: ThemeProviderProps = { theme: { direction: 'rtl' } };
const Styled = styled(View)(({ theme }) => ({ padding: theme.spacing(2) }));
const DeepStyled = deepStyled(View)(({ theme }) => ({
  backgroundColor: theme.palette.primary.main,
}));
function Probe() {
  const a: Theme = useTheme();
  const b: Theme = useMaterialTheme();
  const c: { stamp: string } = useSystemTheme<{ stamp: string }>();
  const d: { fallback: boolean } | null = useThemeWithoutDefault<{ fallback: boolean } | null>(
    null,
  );
  const defaults = useMaterialThemeProps({
    name: 'MuiButton',
    props: { disabled: undefined as boolean | undefined },
  });
  return (
    <Button
      disabled={defaults.disabled}
      accessibilityLabel={a.direction + b.direction + c.stamp + String(d) + String(useRtl())}
    />
  );
}
export const scoped = (
  <SystemThemeProvider<{ stamp: string }> theme={{ stamp: 'outer' }}>
    <ThemeProvider theme={{ [THEME_ID]: theme }}>
      <DeepThemeProvider {...props}>
        <Probe />
        <Styled />
        <DeepStyled />
      </DeepThemeProvider>
      <RtlProvider value={false} />
    </ThemeProvider>
  </SystemThemeProvider>
);
export const generic = <ThemeProvider<Theme> theme={(outer) => ({ ...outer, direction: 'rtl' })} />;
const exact: typeof THEME_ID = identifier;
void exact;
// @ts-expect-error Native providers do not implement browser document persistence.
export const browser = <ThemeProvider theme={theme} documentNode={{}} />;
// @ts-expect-error themeId belongs to the System provider, not Material's provider.
export const invalidScope = <ThemeProvider theme={theme} themeId="app" />;
// @ts-expect-error Invalid theme direction.
export const invalid = <ThemeProvider<Theme> theme={{ direction: 'sideways' }} />;

interface AppTheme extends ThemeWithProps {
  components: { MuiProbe: { defaultProps: { enabled: boolean } } };
}
type Supplied = { label: string };
function GenericDefaults() {
  const props = useMaterialThemeProps<AppTheme, Supplied, 'MuiProbe'>({
    name: 'MuiProbe',
    props: { label: 'probe' },
  });
  const enabled: boolean = props.enabled;
  const label: string = props.label;
  const inferred: ThemedProps<AppTheme, 'MuiProbe'> = { enabled };
  void inferred;
  const theme: Theme = systemDefaultTheme;
  void theme;
  return <Button disabled={!enabled}>{label}</Button>;
}
void GenericDefaults;
