import { createRef, forwardRef, useEffect, type ReactElement } from 'react';
import { Text, View, type ViewInstance } from 'react-native';
import { cleanup, render } from '@testing-library/react-native';
import {
  Box,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  ListItemAvatar,
  ListSubheader,
  ListItemSecondaryAction,
  ButtonBase,
  Chip,
  ThemeProvider,
  createTheme,
  Select,
  NativeSelect,
  MenuItem,
  type SelectInputHandle,
  type NativeSelectInputHandle,
} from '../packages/material/src';
import { nativeTextScopes, useNativeTextContext } from '../packages/system/src';

afterEach(cleanup);

const roots = [
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  ListItemAvatar,
  ListSubheader,
  ListItemSecondaryAction,
];

test.each([false, true])(
  'Chip relative metrics resolve once on its owned root, clickable=%s',
  (clickable) => {
    const root = createRef<ViewInstance>(),
      label = createRef<ViewInstance>();
    const tree = render(
      <Box sx={{ fontSize: 10 }}>
        <Chip
          clickable={clickable}
          ref={root}
          label="Relative"
          sx={{ fontSize: '2em', lineHeight: 1.5 }}
          slotProps={{ label: { ref: label } }}
        />
      </Box>,
    );
    expect(tree.getByText('Relative')).toHaveStyle({ fontSize: 20, lineHeight: 30 });
    expect(nativeTextScopes.at(root.current!)?.style).toMatchObject({
      fontSize: 20,
      lineHeight: 30,
    });
    expect(nativeTextScopes.at(label.current!)?.style).toMatchObject({
      fontSize: 20,
      lineHeight: 30,
    });
  },
);
test.each(roots.map((Component, index) => [index, Component] as const))(
  'owned List-family host %s updates physical inheritance without ref or child churn',
  (_index, Component) => {
    let host: ViewInstance | null = null;
    const release = jest.fn(),
      mounted = jest.fn(),
      unmounted = jest.fn();
    const ref = jest.fn((value: ViewInstance | null) => {
      host = value;
      return release;
    });
    function Child() {
      useEffect(() => {
        mounted();
        return unmounted;
      }, []);
      return <Text>Stable</Text>;
    }
    const child = <Child />;
    const field = (color: string): ReactElement => (
      <ThemeProvider theme={createTheme()}>
        <Component ref={ref} style={{ color, fontSize: 24 }}>
          {child}
        </Component>
      </ThemeProvider>
    );
    const tree = render(field('#123456'));
    const actual = host!;
    expect(nativeTextScopes.at(actual)?.style).toMatchObject({ color: '#123456', fontSize: 24 });
    tree.rerender(field('#abcdef'));
    expect(host).toBe(actual);
    expect(nativeTextScopes.at(actual)?.style.color).toBe('#abcdef');
    expect(ref).toHaveBeenCalledTimes(1);
    expect(mounted).toHaveBeenCalledTimes(1);
    expect(unmounted).not.toHaveBeenCalled();
    tree.unmount();
    expect(release).toHaveBeenCalledTimes(1);
    expect(ref).not.toHaveBeenCalledWith(null);
    expect(nativeTextScopes.at(actual)).toBeUndefined();
  },
);

test('ButtonBase publishes its actual outer host rather than assigning a label wrapper to that host', () => {
  const ref = createRef<ViewInstance>();
  const tree = render(
    <ButtonBase ref={ref} style={{ color: '#123456', fontSize: 22 }}>
      <View>
        <Text>Action</Text>
      </View>
    </ButtonBase>,
  );
  const actual = ref.current!;
  expect(nativeTextScopes.at(actual)?.style).toMatchObject({ color: '#123456', fontSize: 22 });
  tree.unmount();
  expect(nativeTextScopes.at(actual)).toBeUndefined();
});

test('scrollable List registers the public native scroll host and releases it on unmount', () => {
  const ref = createRef<ViewInstance>();
  const tree = render(
    <List scrollable ref={ref} style={{ color: '#123456', fontSize: 23 }}>
      <Text>Scroll</Text>
    </List>,
  );
  const host = ref.current! as ViewInstance & { getNativeScrollRef?: () => object | null };
  const actual = host.getNativeScrollRef?.() ?? host;
  expect(nativeTextScopes.at(actual)?.style).toMatchObject({ color: '#123456', fontSize: 23 });
  tree.unmount();
  expect(nativeTextScopes.at(actual)).toBeUndefined();
});

test('Chip labels publish on their own declared slot host and keep the display root separate', () => {
  const root = createRef<ViewInstance>(),
    label = createRef<ViewInstance>();
  const tree = render(
    <Chip
      ref={root}
      label="Chip"
      slotProps={{ label: { ref: label, style: { color: '#123456', fontSize: 27 } } }}
    />,
  );
  const outer = root.current!,
    actualLabel = label.current!;
  expect(actualLabel).not.toBe(outer);
  expect(nativeTextScopes.at(actualLabel)?.style).toMatchObject({ color: '#123456', fontSize: 27 });
  expect(nativeTextScopes.at(outer)?.style.fontSize).not.toBe(27);
  tree.unmount();
  expect(nativeTextScopes.at(actualLabel)).toBeUndefined();
});

test('Select publishes its native display host while retaining the public selection handle', () => {
  const inputRef = createRef<SelectInputHandle<string>>();
  const tree = render(
    <Select
      value="one"
      inputRef={inputRef}
      SelectDisplayProps={{ style: { color: '#123456', fontSize: 25 } }}
    >
      <MenuItem value="one">One</MenuItem>
    </Select>,
  );
  const node = inputRef.current!.node!;
  expect(nativeTextScopes.at(node)?.style).toMatchObject({ color: '#123456', fontSize: 25 });
  tree.unmount();
  expect(nativeTextScopes.at(node)).toBeUndefined();
});

test('NativeSelect publishes its framework-picker trigger rather than its outer Input root', () => {
  const inputRef = createRef<NativeSelectInputHandle>();
  const tree = render(
    <NativeSelect
      value="one"
      inputRef={inputRef}
      inputProps={{ style: { color: '#123456', fontSize: 26 } }}
    >
      <option value="one">One</option>
    </NativeSelect>,
  );
  const node = inputRef.current!.node!;
  expect(nativeTextScopes.at(node)?.style).toMatchObject({ color: '#123456', fontSize: 26 });
  tree.unmount();
  expect(nativeTextScopes.at(node)).toBeUndefined();
});

test('opaque user decoration refs and child state remain application-owned through scope updates', () => {
  const release = jest.fn(),
    mounted = jest.fn(),
    unmounted = jest.fn();
  const ref = jest.fn(() => release);
  const Decoration = forwardRef<ViewInstance>(function Decoration(_props, forwarded) {
    useEffect(() => {
      mounted();
      return unmounted;
    }, []);
    return <View ref={forwarded} />;
  });
  const decoration = <Decoration ref={ref} />;
  const field = (color: string) => (
    <Chip label="Chip" onDelete={() => {}} deleteIcon={decoration} sx={{ color }} />
  );
  const tree = render(field('#123456'));
  tree.rerender(field('#abcdef'));
  expect(mounted).toHaveBeenCalledTimes(1);
  expect(unmounted).not.toHaveBeenCalled();
  expect(ref).toHaveBeenCalledTimes(1);
  tree.unmount();
  expect(release).toHaveBeenCalledTimes(1);
  expect(ref).not.toHaveBeenCalledWith(null);
});

test('display Chip root is a physical text owner while label and decoration keep their own scope', () => {
  const root = createRef<ViewInstance>(),
    label = createRef<ViewInstance>();
  const release = jest.fn(),
    mounted = jest.fn(),
    unmounted = jest.fn();
  const iconRef = jest.fn(() => release);
  const seen: Array<{ color?: unknown; fontSize?: number }> = [];
  const Icon = forwardRef<ViewInstance>(function Icon(_props, ref) {
    const scope = useNativeTextContext();
    seen.push({ color: scope?.style.color, fontSize: scope?.style.fontSize });
    useEffect(() => {
      mounted();
      return unmounted;
    }, []);
    return <View ref={ref} />;
  });
  const icon = <Icon ref={iconRef} />;
  const theme = createTheme({
    components: {
      MuiChip: { styleOverrides: { icon: { color: 'inherit', fontSize: 'inherit' } } },
    },
  });
  const field = (color: string) => (
    <ThemeProvider theme={theme}>
      <Chip
        ref={root}
        label="Chip"
        icon={icon}
        sx={{ color, fontSize: 40 }}
        slotProps={{ label: { ref: label, style: { fontSize: 27 } } }}
      />
    </ThemeProvider>
  );
  const tree = render(field('#123456'));
  const host = root.current!;
  expect(nativeTextScopes.at(host)?.style).toMatchObject({ color: '#123456', fontSize: 40 });
  expect(nativeTextScopes.at(label.current!)?.style.fontSize).toBe(27);
  expect(seen.at(-1)).toEqual({ color: '#123456', fontSize: 40 });
  tree.rerender(field('#abcdef'));
  expect(root.current).toBe(host);
  expect(nativeTextScopes.at(host)?.style.color).toBe('#abcdef');
  expect(seen.at(-1)).toEqual({ color: '#abcdef', fontSize: 40 });
  expect(mounted).toHaveBeenCalledTimes(1);
  expect(unmounted).not.toHaveBeenCalled();
  expect(iconRef).toHaveBeenCalledTimes(1);
  tree.unmount();
  expect(release).toHaveBeenCalledTimes(1);
  expect(nativeTextScopes.at(host)).toBeUndefined();
});
