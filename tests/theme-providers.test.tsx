import { Text, View, StyleSheet } from 'react-native';
import { render, screen } from '@testing-library/react-native';
import * as system from '../packages/system/src';
import * as material from '../packages/material/src';
import reference from './fixtures/mui-theme-providers-9.5.0.json';
const summarize = (theme: any) =>
  !theme
    ? null
    : Object.fromEntries(
        Object.entries(theme).filter(([key]) =>
          [
            'stamp',
            'nested',
            'direction',
            'components',
            'received',
            'receivedScope',
            '$$material',
            'design',
            'vars',
            'fallback',
          ].includes(key),
        ),
      );
const themeInput = (input: any) =>
  input.operation
    ? (outer: any) =>
        input.operation === 'replace'
          ? {
              stamp: 'callback',
              received: outer.stamp ?? null,
              receivedScope: outer['$$material']?.stamp ?? null,
            }
          : {
              ...outer,
              stamp: 'callback',
              nested: { ...outer.nested, third: 4 },
              components: { Probe: { defaultProps: { value: 'callback' } } },
            }
    : input;
test.each(reference.fixtures)('pinned provider contract: $name', ({ layers, output }) => {
  let actual: any;
  function Probe() {
    actual = {
      system: summarize(system.useTheme({ fallback: true })),
      material: summarize(material.useTheme()),
      withoutDefault: summarize(system.useThemeWithoutDefault()),
      defaults: system.useDefaultProps({ name: 'Probe', props: {} }),
      systemDefaults: system.useThemeProps({ name: 'Probe', props: {} }),
      materialDefaults: material.useThemeProps({ name: 'Probe', props: {} }),
      rtl: system.useRtl(),
    };
    return null;
  }
  let tree = <Probe />;
  for (const item of [...layers].reverse()) {
    const Provider = item.provider === 'system' ? system.ThemeProvider : material.ThemeProvider;
    tree = (
      <Provider
        theme={themeInput(item.theme)}
        {...('themeId' in item ? { themeId: item.themeId } : {})}
      >
        {tree}
      </Provider>
    );
  }
  const diagnostics: system.Diagnostic[] = [];
  const restore = system.configureDiagnostics((value) => diagnostics.push(value));
  try {
    render(tree);
    expect(actual).toEqual(output);
  } finally {
    restore();
  }
});
test('native Material components and styles select the scoped theme', () => {
  const outer = system.createTheme({ palette: { primary: { main: '#112233' } }, spacing: 3 });
  const inner = system.createTheme({
    palette: { primary: { main: '#abcdef' } },
    spacing: 5,
    components: {
      MuiButton: {
        defaultProps: { variant: 'contained' },
        styleOverrides: { root: { borderRadius: 11 } },
      },
    },
  });
  const Styled = material.styled(View)(({ theme }) => ({
    backgroundColor: theme.palette.primary.main,
    padding: theme.spacing(2),
  }));
  render(
    <system.ThemeProvider theme={outer}>
      <material.ThemeProvider theme={{ $$material: inner }}>
        <material.Button testID="button">Scoped</material.Button>
        <material.Box testID="box" sx={{ p: 2, bgcolor: 'primary.main' }} />
        <Styled testID="styled" />
        <material.TextField label="Name" />
      </material.ThemeProvider>
    </system.ThemeProvider>,
  );
  for (const id of ['box', 'styled'])
    expect(StyleSheet.flatten(screen.getByTestId(id).props.style)).toMatchObject({
      padding: 10,
      backgroundColor: '#abcdef',
    });
  expect(StyleSheet.flatten(screen.getByTestId('button').props.style)).toMatchObject({
    backgroundColor: '#abcdef',
    borderRadius: 11,
  });
  expect(screen.getByLabelText('Name')).toBeTruthy();
});

test('callbacks update with their selected outer theme, remain memoized and never mutate inputs', () => {
  const first = system.createTheme({ spacing: 3 });
  const second = system.createTheme({ spacing: 7 });
  const callback = jest.fn((outer: system.Theme) => ({
    ...outer,
    shape: { borderRadius: outer.spacing(1).length },
  }));
  const local = { direction: 'rtl' as const };
  function Probe() {
    const value = material.useTheme();
    return (
      <Text>
        {value.spacing(2)}:{value.direction}
      </Text>
    );
  }
  function Tree({ outer }: { outer: system.Theme }) {
    return (
      <system.ThemeProvider theme={outer}>
        <system.ThemeProvider theme={callback}>
          <material.ThemeProvider theme={local}>
            <Probe />
          </material.ThemeProvider>
        </system.ThemeProvider>
      </system.ThemeProvider>
    );
  }
  const { rerender } = render(<Tree outer={first} />);
  expect(screen.getByText('6px:rtl')).toBeTruthy();
  expect(callback).toHaveBeenCalledTimes(1);
  rerender(<Tree outer={first} />);
  expect(callback).toHaveBeenCalledTimes(1);
  rerender(<Tree outer={second} />);
  expect(screen.getByText('14px:rtl')).toBeTruthy();
  expect(callback).toHaveBeenCalledTimes(2);
  expect(first.direction).toBe('ltr');
  expect(local).toEqual({ direction: 'rtl' });
});
test('native theme hooks and default maps remain isolated between scopes and siblings', () => {
  const outer = system.createTheme({
    palette: { primary: { main: '#112233' } },
    components: { Probe: { defaultProps: { value: 'outer' } } },
  });
  const inner = system.createTheme({
    palette: { primary: { main: '#abcdef' } },
    components: { Probe: { defaultProps: { value: 'inner' } } },
  });
  function Probe({ name }: { name: string }) {
    const raw = system.useTheme();
    const theme = material.useTheme();
    const defaults = system.useDefaultProps({
      name: 'Probe',
      props: { value: undefined as string | undefined },
    });
    return (
      <Text>
        {name}:{raw.palette.primary.main}:{theme.palette.primary.main}:{defaults.value}
      </Text>
    );
  }
  render(
    <system.ThemeProvider theme={outer}>
      <Probe name="before" />
      <material.ThemeProvider theme={{ [material.THEME_ID]: inner }}>
        <Probe name="inside" />
      </material.ThemeProvider>
      <Probe name="after" />
    </system.ThemeProvider>,
  );
  expect(screen.getByText('before:#112233:#112233:outer')).toBeTruthy();
  expect(screen.getByText('inside:#112233:#abcdef:inner')).toBeTruthy();
  expect(screen.getByText('after:#112233:#112233:outer')).toBeTruthy();
});
test('RTL defaults, explicit overrides and empty theme fallbacks follow provider boundaries', () => {
  function Probe({ name }: { name: string }) {
    const direction = system.useRtl();
    const fallback = system.useThemeWithoutDefault({ missing: true });
    return (
      <Text>
        {name}:{String(direction)}:{String('missing' in fallback)}
      </Text>
    );
  }
  render(
    <>
      <Probe name="root" />
      <system.RtlProvider>
        <Probe name="rtl" />
        <system.RtlProvider value={false}>
          <Probe name="override" />
        </system.RtlProvider>
        <system.ThemeProvider theme={{}}>
          <Probe name="empty" />
        </system.ThemeProvider>
      </system.RtlProvider>
    </>,
  );
  for (const text of [
    'root:false:true',
    'rtl:true:true',
    'override:false:true',
    'empty:false:true',
  ])
    expect(screen.getByText(text)).toBeTruthy();
});
test('icons and X charts consume the Material scope without a browser dependency', () => {
  const inner = system.createTheme({
    palette: { primary: { main: '#abcdef' }, divider: '#123456' },
  });
  const { Add } = require('../packages/icons/src');
  const { LineChart } = require('../packages/x-charts/src');
  const { UNSAFE_getByType } = render(
    <material.ThemeProvider theme={{ [material.THEME_ID]: inner }}>
      <Add color="primary" testID="icon" />
      <LineChart series={[{ data: [1, 2] }]} />
    </material.ThemeProvider>,
  );
  expect(screen.getByTestId('icon', { includeHiddenElements: true }).props.color).toBe('#abcdef');
  const { Line } = require('react-native-svg');
  expect(UNSAFE_getByType(Line).props.stroke).toBe('#123456');
});

test('the named System fallback is the singleton consumed by the default hook', () => {
  let actual: system.Theme | undefined;
  function Probe() {
    actual = system.useTheme();
    return null;
  }
  render(<Probe />);
  expect(actual).toBe(system.systemDefaultTheme);
});
