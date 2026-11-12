// Copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT
import { render, cleanup } from '@testing-library/react-native';
import { View, StyleSheet, type StyleProp } from 'react-native';
import {
  styled,
  ThemeProvider,
  createTheme,
  type NativeStyle,
  type SxObject,
} from '../packages/system/src';
import {
  nativeStyledStyles,
  nativeCssProgram,
} from '../packages/system/src/internal/prepared-style';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import original from './fixtures/mui-button-group-cache-9.5.0.json';
const { serializeStyles } = createRequire(resolve('packages/system/package.json'))(
  '@emotion/serialize',
) as {
  serializeStyles: (values: readonly unknown[]) => { name: string };
};
afterEach(cleanup);

test.each(original.styledPrograms)(
  'styled construction matches original $name CSS and getter timing',
  (expected) => {
    const trace: string[] = [];
    const rootStyle: SxObject = {
      get padding() {
        trace.push('css:padding');
        return 2;
      },
    };
    if (expected.name.endsWith('variants'))
      rootStyle.variants = [
        {
          props: { active: true },
          get style(): unknown {
            trace.push('get:variant-style');
            return { color: 'red' };
          },
          set style(value: unknown) {
            Object.defineProperty(this, 'style', { value, writable: true });
          },
        },
      ];
    let css: string | undefined;
    const Root = ({
      style,
    }: {
      style?: StyleProp<NativeStyle>;
      ownerState?: unknown;
      row?: boolean;
    }) => {
      const descriptor = nativeStyledStyles.get(style as object)!;
      css = nativeCssProgram(descriptor.sheets);
      return <View testID="target" style={style} />;
    };
    const Probe = styled(Root, { name: 'MuiCacheProbe' })(
      expected.name.includes('static')
        ? rootStyle
        : () => {
            trace.push('call:base');
            return rootStyle;
          },
    );
    const Second =
      expected.name === 'shared-static-variants'
        ? styled(Root, { name: 'MuiCacheProbe' })(rootStyle)
        : undefined;
    expect(trace).toEqual(expected.definitionTrace);
    const themed = expected.name === 'themed-variant-no-owner';
    const theme = createTheme(
      themed
        ? {
            components: {
              MuiCacheProbe: {
                variants: [
                  {
                    props: (props) => {
                      trace.push(
                        'predicate:' +
                          String(props.ownerState === undefined) +
                          ':' +
                          String(props.row) +
                          ':' +
                          String(props.direction),
                      );
                      return props.direction === undefined;
                    },
                    style: (props) => {
                      trace.push(
                        'variant:' +
                          String(props.ownerState === undefined) +
                          ':' +
                          String(props.row) +
                          ':' +
                          String(props.direction),
                      );
                      return { color: 'red' };
                    },
                  },
                ],
              },
            },
          }
        : {},
    );
    const tree = render(
      <ThemeProvider theme={theme}>
        <Probe {...(themed ? { row: true } : { ownerState: { active: true } })} />
        {Second && <Second ownerState={{ active: true }} />}
      </ThemeProvider>,
    );
    expect(trace).toEqual(expected.renderTrace);
    expect(css).toBe(expected.css);
    expect('constructor-css-' + serializeStyles([css]).name).toBe(expected.className);
    for (const target of tree.getAllByTestId('target')) {
      expect(StyleSheet.flatten(target.props.style)).toMatchObject({
        padding: 2,
        ...(expected.name.endsWith('variants') || themed ? { color: 'red' } : {}),
      });
    }
    if (Second) {
      expect(tree.getAllByTestId('target')).toHaveLength(2);
      expect(expected.secondClassName).toBe(expected.className);
    }
  },
);

test.each([undefined, null, false, 0, 'app-state', Object.freeze({ token: 'authored' })])(
  'generic named styled callbacks preserve genuine application owner state (%p)',
  (ownerState) => {
    const overrides: unknown[] = [];
    const variants: unknown[] = [];
    const theme = createTheme({
      components: {
        MuiArgumentProbe: {
          styleOverrides: {
            root: (props) => {
              overrides.push(props.ownerState);
              return { minHeight: 42 };
            },
          },
          variants: [
            {
              props: (props) => {
                variants.push(props.ownerState);
                if (typeof ownerState === 'string') expect(props[0]).toBe('a');
                if (ownerState && typeof ownerState === 'object')
                  expect(props.token).toBe('authored');
                return true;
              },
              style: { opacity: 0.7 },
            },
          ],
        },
      },
    });
    const Probe = styled(View, { name: 'MuiArgumentProbe' })({ minWidth: 12 });
    const tree = render(
      <ThemeProvider theme={theme}>
        <Probe testID="genuine-owner" ownerState={ownerState} />
      </ThemeProvider>,
    );
    expect(overrides).toEqual([ownerState]);
    expect(variants).toEqual([ownerState]);
    expect(tree.getByTestId('genuine-owner')).toHaveStyle({
      minWidth: 12,
      minHeight: 42,
      opacity: 0.7,
    });
  },
);
