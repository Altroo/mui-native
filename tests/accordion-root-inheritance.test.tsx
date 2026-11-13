// Copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT
import { createRef, forwardRef, memo, useState, useRef, useImperativeHandle } from 'react';
import { View, type ViewInstance } from 'react-native';
import { cleanup, fireEvent, render, screen } from '@testing-library/react-native';
import {
  Accordion,
  AccordionSummary,
  Box,
  Paper,
  ThemeProvider,
  Typography,
  createTheme,
} from '@altroo/mui-native';
import { nativeTextScopes } from '@altroo/mui-native-system';

afterEach(cleanup);
const theme = createTheme({ motion: { reducedMotion: 'always' } });
const BoxWrapper = forwardRef<ViewInstance, Record<string, any>>(function BoxWrapper(props, ref) {
  return <Box {...props} ref={ref} />;
});
const PaperWrapper = forwardRef<ViewInstance, Record<string, any>>(
  function PaperWrapper(props, ref) {
    return <Paper {...props} ref={ref} />;
  },
);
const ViewWrapper = forwardRef<ViewInstance, Record<string, any>>(function ViewWrapper(props, ref) {
  return <View {...props} ref={ref} />;
});
const roots = [
  ['wrapped View', ViewWrapper],
  ['memo View wrapper', memo(ViewWrapper)],
  ['memo Box', memo(Box)],
  ['memo Paper', memo(Paper)],
  ['wrapped Box', BoxWrapper],
  ['wrapped Paper', PaperWrapper],
] as const;
function Counter() {
  const [count, setCount] = useState(0);
  return (
    <Typography variant="inherit" testID="inherited-body" onPress={() => setCount(count + 1)}>
      {count}
    </Typography>
  );
}

for (const [name, Root] of roots) {
  for (const fontSize of ['2em', '200%'] as const) {
    test.each(['own', 'ancestor'] as const)(
      `${name} resolves ${fontSize} once from %s CSS and retains body state`,
      (source) => {
        const ref = createRef<ViewInstance>();
        const css = { fontSize, lineHeight: 1.5 };
        const tree = (basis: number) => (
          <ThemeProvider theme={theme}>
            <Box
              sx={{
                fontSize: basis,
                ...(source === 'ancestor' ? { '& .MuiAccordion-root': css } : {}),
              }}
            >
              <Accordion
                expanded
                ref={ref}
                sx={source === 'own' ? css : undefined}
                slotProps={{ root: { as: Root } }}
              >
                <AccordionSummary>Summary</AccordionSummary>
                <Counter />
              </Accordion>
            </Box>
          </ThemeProvider>
        );
        const result = render(tree(10));
        const host = ref.current!;
        expect(host).not.toBeNull();
        expect(screen.getByTestId('inherited-body')).toHaveStyle({ fontSize: 20, lineHeight: 30 });
        expect(nativeTextScopes.at(host)?.style).toMatchObject({ fontSize: 20, lineHeight: 30 });
        fireEvent.press(screen.getByTestId('inherited-body'));
        result.rerender(tree(12));
        expect(ref.current).toBe(host);
        expect(screen.getByTestId('inherited-body')).toHaveTextContent('1');
        expect(screen.getByTestId('inherited-body')).toHaveStyle({ fontSize: 24, lineHeight: 36 });
        expect(nativeTextScopes.at(host)?.style).toMatchObject({ fontSize: 24, lineHeight: 36 });
        result.unmount();
        expect(nativeTextScopes.at(host)).toBeUndefined();
      },
    );
  }
}

test.each([Box, Paper])(
  'a styling-aware root owns its final text after native inline overrides',
  (Base) => {
    const Root = forwardRef<ViewInstance, Record<string, any>>(function Root(
      { style, ...props },
      ref,
    ) {
      return (
        <Base
          {...props}
          ref={ref}
          style={[style, { fontSize: 30, lineHeight: 45, color: '#123456' }]}
        />
      );
    });
    const ref = createRef<ViewInstance>();
    const result = render(
      <ThemeProvider theme={theme}>
        <Box sx={{ fontSize: 10 }}>
          <Accordion
            expanded
            ref={ref}
            sx={{ fontSize: '2em', lineHeight: 1.5 }}
            slotProps={{ root: { as: Root } }}
          >
            <AccordionSummary>Summary</AccordionSummary>
            <Counter />
          </Accordion>
        </Box>
      </ThemeProvider>,
    );
    const host = ref.current!;
    expect(screen.getByTestId('inherited-body')).toHaveStyle({
      fontSize: 30,
      lineHeight: 45,
      color: '#123456',
    });
    expect(nativeTextScopes.at(host)?.style).toMatchObject({
      fontSize: 30,
      lineHeight: 45,
      color: '#123456',
    });
    result.unmount();
    expect(nativeTextScopes.at(host)).toBeUndefined();
  },
);

test('an opaque root can retarget its ref without leaving text ownership on its former host', () => {
  const outer = createRef<ViewInstance>();
  const inner = createRef<ViewInstance>();
  const forwarded = createRef<ViewInstance>();
  const Root = forwardRef<ViewInstance, Record<string, any>>(function Root(
    { style, children },
    ref,
  ) {
    const [inside, setInside] = useState(false);
    const outerNode = useRef<ViewInstance | null>(null);
    const innerNode = useRef<ViewInstance | null>(null);
    useImperativeHandle(ref, () => (inside ? innerNode.current! : outerNode.current!), [inside]);
    return (
      <View
        ref={(node) => {
          outerNode.current = node;
          outer.current = node;
        }}
        style={inside ? undefined : style}
      >
        <View
          ref={(node) => {
            innerNode.current = node;
            inner.current = node;
          }}
          style={inside ? style : undefined}
        >
          <Typography testID="retarget-root" onPress={() => setInside(!inside)}>
            Retarget
          </Typography>
          {children}
        </View>
      </View>
    );
  });
  const tree = (basis: number) => (
    <ThemeProvider theme={theme}>
      <Box sx={{ fontSize: basis }}>
        <Accordion
          expanded
          ref={forwarded}
          sx={{ fontSize: '2em', lineHeight: 1.5 }}
          slotProps={{ root: { as: Root } }}
        >
          <AccordionSummary>Summary</AccordionSummary>
          <Counter />
        </Accordion>
      </Box>
    </ThemeProvider>
  );
  const result = render(tree(10));
  const first = outer.current!,
    second = inner.current!;
  const rootOnly = () => null;
  expect(forwarded.current).toBe(first);
  expect(nativeTextScopes.at(first, rootOnly)?.style).toMatchObject({
    fontSize: 20,
    lineHeight: 30,
  });
  fireEvent.press(screen.getByTestId('inherited-body'));
  result.rerender(tree(12));
  expect(nativeTextScopes.at(first, rootOnly)?.style.fontSize).toBe(24);
  fireEvent.press(screen.getByTestId('retarget-root'));
  expect(forwarded.current).toBe(second);
  expect(outer.current).toBe(first);
  expect(inner.current).toBe(second);
  expect(nativeTextScopes.at(first, rootOnly)).toBeUndefined();
  expect(nativeTextScopes.at(second, rootOnly)?.style).toMatchObject({
    fontSize: 24,
    lineHeight: 36,
  });
  expect(screen.getByTestId('inherited-body')).toHaveTextContent('1');
  fireEvent.press(screen.getByTestId('retarget-root'));
  expect(forwarded.current).toBe(first);
  expect(nativeTextScopes.at(second, rootOnly)).toBeUndefined();
  expect(nativeTextScopes.at(first, rootOnly)?.style.fontSize).toBe(24);
  result.unmount();
  expect(nativeTextScopes.at(first, rootOnly)).toBeUndefined();
  expect(nativeTextScopes.at(second, rootOnly)).toBeUndefined();
});
