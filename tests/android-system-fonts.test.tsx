// Copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT
import { Platform, StyleSheet, Text } from 'react-native';
import { cleanup, render } from '@testing-library/react-native';
import { Typography } from '../packages/material/src/typography';
import { Box } from '../packages/material/src/layout';
import { ThemeProvider } from '../packages/material/src/themeProvider';
import { createTheme, resolveSx } from '../packages/system/src';

const ownedDefault = '__AltrooMUIPlatformDefaultSansSerif';
const weights = [100, 200, 300, 400, 500, 600, 700, 800, 900] as const;
afterEach(() => {
  cleanup();
  jest.restoreAllMocks();
});

describe.each(['android', 'ios'] as const)(
  '%s CSS/default-font and native-font boundaries',
  (platform) => {
    beforeEach(() => jest.replaceProperty(Platform, 'OS', platform));

    test.each(weights)(
      'keeps CSS default weight %i with the platform-specific native family',
      (weight) => {
        expect(
          resolveSx({ fontFamily: 'System', fontWeight: weight }, createTheme()),
        ).toMatchObject({
          fontFamily: platform === 'android' ? ownedDefault : 'System',
          fontWeight: String(weight),
        });
      },
    );

    test('default-family aliases and custom family names keep their existing mapping', () => {
      const theme = createTheme();
      for (const family of ['System', 'system-ui', '-apple-system', 'sans-serif'])
        expect(resolveSx({ fontFamily: family }, theme)).toMatchObject({
          fontFamily: platform === 'android' ? ownedDefault : 'System',
        });
      expect(
        resolveSx({ fontFamily: '"App Font", sans-serif', fontWeight: 500 }, theme),
      ).toMatchObject({
        fontFamily: 'App Font',
        fontWeight: '500',
      });
      expect(resolveSx({ fontFamily: 'serif' }, theme)).toMatchObject({
        fontFamily: platform === 'ios' ? 'Times New Roman' : 'serif',
      });
    });

    test('explicit System stays a native font-family reset inside an authored custom-font Text', () => {
      const tree = render(
        <Text style={{ fontFamily: 'App Font', fontWeight: '700' }}>
          <Typography testID="reset" sx={{ fontFamily: 'System', fontWeight: 500 }}>
            Reset
          </Typography>
        </Text>,
      );
      expect(tree.getByTestId('reset')).toHaveStyle({
        fontFamily: platform === 'android' ? ownedDefault : 'System',
        fontWeight: '500',
      });
    });

    test('tracked custom-font inheritance and an explicit default-family reset stay distinct', () => {
      const tree = render(
        <Typography testID="custom-parent" style={{ fontFamily: 'App Font', fontWeight: '700' }}>
          <Typography variant="inherit" testID="inherited">
            Inherited
          </Typography>
          <Typography
            variant="inherit"
            testID="reset"
            sx={{ fontFamily: 'System', fontWeight: 500 }}
          >
            Reset
          </Typography>
        </Typography>,
      );
      expect(tree.getByTestId('custom-parent')).toHaveStyle({
        fontFamily: 'App Font',
        fontWeight: '700',
      });
      // Virtual Text inherits its real paragraph; an explicit reset must remain
      // emitted rather than disappearing with those redundant inherited fields.
      const inherited = StyleSheet.flatten(tree.getByTestId('inherited').props.style);
      expect(inherited.fontFamily).toBeUndefined();
      expect(inherited.fontWeight).toBeUndefined();
      expect(tree.getByTestId('reset')).toHaveStyle({
        fontFamily: platform === 'android' ? ownedDefault : 'System',
        fontWeight: '500',
      });
    });

    test('genuine native inline family/weight and frozen caller styles retain final precedence', () => {
      const authored = Object.freeze({ fontFamily: 'Native App Font', fontWeight: '300' as const });
      const tree = render(
        <Typography testID="inline" sx={{ fontFamily: 'System', fontWeight: 500 }} style={authored}>
          Inline
        </Typography>,
      );
      expect(tree.getByTestId('inline')).toHaveStyle(authored);
      expect(authored).toEqual({ fontFamily: 'Native App Font', fontWeight: '300' });
    });

    test.each(['System', 'App Font', 'sans-serif'])(
      'literal native family %s survives CSS defaults and nested native arrays',
      (family) => {
        const registered = StyleSheet.create({
          literal: { fontFamily: family, fontWeight: '300' as const },
        });
        const authored = Object.freeze({ fontSize: 17 });
        const tree = render(
          <Typography
            testID="literal"
            sx={{ fontFamily: 'System', fontWeight: 500 }}
            style={[[registered.literal], null, false, authored]}
          >
            Native
          </Typography>,
        );
        expect(tree.getByTestId('literal')).toHaveStyle({
          fontFamily: family,
          fontWeight: '300',
          fontSize: 17,
        });
        expect(authored).toEqual({ fontSize: 17 });
      },
    );

    test('a native System font scope stays literal when inherited through a View boundary', () => {
      const tree = render(
        <Box style={{ fontFamily: 'System', fontWeight: '300' }}>
          <Typography variant="inherit" testID="native-scope">
            Native
          </Typography>
        </Box>,
      );
      expect(tree.getByTestId('native-scope')).toHaveStyle({
        fontFamily: 'System',
        fontWeight: '300',
      });
    });

    test('quoted System is a literal custom family rather than a CSS default-family alias', () => {
      expect(
        resolveSx({ fontFamily: '"System", sans-serif', fontWeight: 500 }, createTheme()),
      ).toMatchObject({ fontFamily: 'System', fontWeight: '500' });
    });

    test('the actual createTheme default body1 uses the platform family despite its quoted Roboto prefix', () => {
      const theme = createTheme();
      const original = { ...theme.typography.body1 };
      expect(theme.typography.body1.fontFamily).toBe('"Roboto", "Helvetica", "Arial", sans-serif');
      expect(resolveSx(theme.typography.body1, theme)).toMatchObject({
        fontFamily: platform === 'android' ? ownedDefault : 'System',
      });
      expect(theme.typography.body1).toEqual(original);
    });

    test('stored theme font stacks stay unchanged while CSS default output selects its Android-only family', () => {
      const stack = '"Roboto", "Helvetica", "Arial", sans-serif';
      const theme = createTheme({ typography: { fontFamily: stack } });
      expect(resolveSx(theme.typography.body1, theme)).toMatchObject({
        fontFamily: platform === 'android' ? ownedDefault : 'System',
      });
      expect(theme.typography.fontFamily).toBe(stack);
      expect(theme.typography.body1.fontFamily).toBe(stack);
    });

    test('a custom theme family remains explicit on the actual Text root', () => {
      const theme = createTheme({ typography: { fontFamily: '"Theme Font", sans-serif' } });
      const tree = render(
        <ThemeProvider theme={theme}>
          <Typography testID="theme">Theme</Typography>
        </ThemeProvider>,
      );
      expect(StyleSheet.flatten(tree.getByTestId('theme').props.style).fontFamily).toBe(
        'Theme Font',
      );
    });
  },
);
