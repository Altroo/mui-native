// Copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT
import { createRef } from 'react';
import { cleanup, render } from '@testing-library/react-native';
import { type ViewInstance } from 'react-native';
import {
  FormGroup,
  ListItemAvatar,
  ThemeProvider,
  createTheme,
  styled,
} from '../packages/material/src';
afterEach(cleanup);
const roots = [
  ['MuiFormGroup', FormGroup],
  ['MuiListItemAvatar', ListItemAvatar],
] as const;

test.each(roots)(
  '%s preserves genuine default inline style through a stable styled element',
  (name, Root) => {
    const callbacks: unknown[] = [];
    const outer = jest.fn(() => ({ opacity: 0.8 }));
    const Styled = styled(Root)(outer);
    const ref = createRef<ViewInstance>();
    const child = <Styled testID="root" ref={ref} />;
    const content = (opacity: number) => {
      const defaultStyle = { opacity, paddingLeft: 7 };
      const theme = createTheme({
        components: {
          [name]: {
            defaultProps: { style: defaultStyle },
            styleOverrides: {
              root: ({ ownerState, style }) => {
                callbacks.push({ owner: ownerState.style, root: style });
                return {};
              },
            },
          },
        },
      });
      return <ThemeProvider theme={theme}>{child}</ThemeProvider>;
    };
    const tree = render(content(0.2));
    const host = ref.current;
    expect(tree.getByTestId('root')).toHaveStyle({ opacity: 0.2, paddingLeft: 7 });
    expect(callbacks.at(-1)).toEqual({
      owner: { opacity: 0.2, paddingLeft: 7 },
      root: { opacity: 0.2, paddingLeft: 7 },
    });
    tree.rerender(content(0.4));
    expect(tree.getByTestId('root')).toHaveStyle({ opacity: 0.4, paddingLeft: 7 });
    expect(callbacks.at(-1)).toEqual({
      owner: { opacity: 0.4, paddingLeft: 7 },
      root: { opacity: 0.4, paddingLeft: 7 },
    });
    // A new theme reevaluates the outer sheet once; the native root stays mounted.
    expect(outer).toHaveBeenCalledTimes(2);
    expect(ref.current).toBe(host);
  },
);

test.each(roots)(
  '%s distinguishes explicit null from undefined when resolving styled inline defaults',
  (name, Root) => {
    const styles: unknown[] = [];
    const Styled = styled(Root)({ opacity: 0.8 });
    const theme = createTheme({
      components: {
        [name]: {
          defaultProps: { style: { opacity: 0.2 } },
          styleOverrides: {
            root: ({ ownerState }) => {
              styles.push(ownerState.style);
              return {};
            },
          },
        },
      },
    });
    const tree = render(
      <ThemeProvider theme={theme}>
        <Styled testID="root" style={null} />
      </ThemeProvider>,
    );
    expect(tree.getByTestId('root')).toHaveStyle({ opacity: 0.8 });
    expect(styles.at(-1)).toBeNull();
    tree.rerender(
      <ThemeProvider theme={theme}>
        <Styled testID="root" style={undefined} />
      </ThemeProvider>,
    );
    expect(tree.getByTestId('root')).toHaveStyle({ opacity: 0.2 });
    expect(styles.at(-1)).toEqual({ opacity: 0.2 });
  },
);
