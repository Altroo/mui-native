// Copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT
// Host doubles verify declaration/ancestry bindings. Release iOS verifies paint.
jest.mock('react-native', () => {
  const actual = jest.requireActual('react-native');
  return Object.defineProperties(
    {},
    {
      ...Object.getOwnPropertyDescriptors(actual),
      View: { value: 'View', enumerable: true, configurable: true },
      findNodeHandle: { value: () => null, enumerable: true },
    },
  );
});
jest.mock('../packages/native-host/src/AltrooMUITextColorMarkerNativeComponent', () => ({
  __esModule: true,
  default: 'ColorMarker',
}));
jest.mock('../packages/native-host/src/ownedStyleBootstrap', () => {
  const profile = {
    schema: 1,
    rn: '0.88.1',
    platform: 'ios',
    styleKeys: require('../packages/native-host/src/ownedStyleVocabulary').ownedStyleVocabulary
      .sha256,
    nativeCSSParsing:
      require('react-native/Libraries/Components/View/ReactNativeStyleAttributes')
        .colorAttribute === true,
    cppPropsIteratorSetter: false,
    accumulatedRawPropsAndroid: false,
    exclusivePropsAndroid: false,
    propsReconciliationAndroid: false,
  };
  return {
    supportsInheritedTextColors: () => true,
    supportsPeerStyleIdentity: () => false,
    supportsStructuralCases: () => true,
    supportsParentStructuralCases: () => true,
    requireOwnedStyleProfile: () => profile,
  };
});
jest.mock('../packages/native-host/src/ownedStructuralCases', () => ({
  ownedStructuralCases: {
    parentSelectors: true,
    profile: require('../packages/native-host/src/ownedStyleBootstrap').requireOwnedStyleProfile(),
    activation: { acquire: () => () => {} },
    Native: require('react-native').View,
    encode: require('../packages/native-host/src/ownedStyleEncoding').encodeStructuralCases,
  },
}));
import { forwardRef, cloneElement, isValidElement, Children } from 'react';
import {
  Text,
  View,
  processColor,
  type ViewInstance,
  type ViewProps,
  type StyleProp,
  type TextStyle,
} from 'react-native';
import { render, cleanup } from '@testing-library/react-native';
import {
  Accordion,
  AccordionSummary,
  Typography,
  Box,
  ThemeProvider,
  createTheme,
} from '@altroo/mui-native';
import { styled } from '@altroo/mui-native-system';
const StyledText = styled(Text)({});
const Opaque = forwardRef<ViewInstance, Record<string, unknown>>(function Opaque(props, ref) {
  return <Box {...props} ref={ref} />;
});
afterEach(cleanup);
const theme = createTheme({ motion: { reducedMotion: 'always' } });
const source = { color: '#0000ff', '&:first-of-type': { color: '#ff0000' } };
function marker(node: ReturnType<typeof render>['root']) {
  return node.findByType('ColorMarker' as never).props.colorProgramme;
}
for (const Root of [undefined, Box, Opaque]) {
  test(
    'actual source root binds inherited text and keeps equal-valued overrides authored: ' +
      String(Root),
    () => {
      const tree = render(
        <ThemeProvider theme={theme}>
          <Accordion component={Root} testID="panel" sx={source}>
            <AccordionSummary>
              <Typography variant="inherit" testID="inherited">
                Inherited
              </Typography>
              <Typography variant="inherit" testID="native" style={{ color: '#0000ff' }}>
                Native
              </Typography>
              <Typography variant="inherit" testID="css" sx={{ color: '#0000ff' }}>
                CSS
              </Typography>
              <Box style={{ color: '#0000ff' }}>
                <Typography variant="inherit" testID="barrier">
                  Barrier
                </Typography>
              </Box>
              <StyledText testID="styled">Styled</StyledText>
            </AccordionSummary>
          </Accordion>
        </ThemeProvider>,
      );
      const programme = tree.getByTestId('panel').props.ownedProgramme;
      expect(programme.textColors.colors).toEqual(
        Array.from({ length: 8 }, (_, facts) => processColor(facts & 2 ? '#ff0000' : '#0000ff')),
      );
      expect(marker(tree.getByTestId('inherited'))).toMatchObject({
        owner: programme.owner,
        key: programme.textColors.key,
      });
      expect(marker(tree.getByTestId('styled'))).toMatchObject({
        owner: programme.owner,
        key: programme.textColors.key,
      });
      for (const id of ['native', 'css', 'barrier'])
        expect(marker(tree.getByTestId(id))).toMatchObject({
          owner: '',
          key: '',
          ordinary: processColor('#0000ff'),
        });
    },
  );
}
test('removing conditional colors clears bindings while preserving the actual Text root', () => {
  const renderTree = (conditional: boolean) => (
    <ThemeProvider theme={theme}>
      <Accordion testID="panel" sx={conditional ? source : { color: '#0000ff' }}>
        <AccordionSummary>
          <Typography variant="inherit" testID="glyph">
            Retained
          </Typography>
        </AccordionSummary>
      </Accordion>
    </ThemeProvider>
  );
  const tree = render(renderTree(true));
  const host = tree.getByTestId('glyph');
  expect(marker(host).owner).not.toBe('');
  tree.rerender(renderTree(false));
  expect(tree.getByTestId('glyph')).toBe(host);
  expect(marker(tree.getByTestId('glyph'))).toMatchObject({
    owner: '',
    key: '',
    ordinary: processColor('#0000ff'),
  });
  expect(tree.getByTestId('panel').props.ownedProgramme).not.toHaveProperty('textColors');
});

for (const kind of ['generated', 'stock'] as const) {
  test(
    'a custom root can reauthor normalized ' + kind + ' text without stale or duplicate bindings',
    () => {
      const Rewrite = forwardRef<ViewInstance, ViewProps>(function Rewrite(
        { children, ...props },
        ref,
      ) {
        const rewritten = Children.map(children, (child) =>
          isValidElement<{ style?: StyleProp<TextStyle> }>(child)
            ? cloneElement(child, { style: [child.props.style, { color: '#0000ff' }] })
            : child,
        );
        return kind === 'generated' ? (
          <View {...props} ref={ref}>
            {rewritten}
          </View>
        ) : (
          <Box {...props} ref={ref}>
            {rewritten}
          </Box>
        );
      });
      const tree = render(
        <ThemeProvider theme={theme}>
          <Accordion expanded sx={source}>
            <AccordionSummary>Summary</AccordionSummary>
            <Box component={Rewrite} testID="rewritten">
              {kind === 'generated' ? 'Literal' : <Text>Literal</Text>}
            </Box>
          </Accordion>
        </ThemeProvider>,
      );
      const node = tree.getByTestId('rewritten');
      const markers = node.findAllByType('ColorMarker' as never);
      expect(markers).toHaveLength(1);
      expect(markers[0].props.colorProgramme).toMatchObject({
        owner: '',
        key: '',
        ordinary: processColor('#0000ff'),
      });
    },
  );
}

for (const keyword of ['inherit', 'unset', 'currentColor']) {
  test('CSS color ' + keyword + ' keeps the source binding', () => {
    const tree = render(
      <ThemeProvider theme={theme}>
        <Accordion testID="panel" sx={source}>
          <AccordionSummary>
            <Typography variant="inherit" testID="keyword" sx={{ color: keyword }}>
              Keyword
            </Typography>
          </AccordionSummary>
        </Accordion>
      </ThemeProvider>,
    );
    expect(marker(tree.getByTestId('keyword'))).toMatchObject({
      owner: tree.getByTestId('panel').props.ownedProgramme.owner,
    });
  });
}

test('a nested inherited Accordion keeps outer color authority while its default Paper is a barrier', () => {
  const tree = render(
    <ThemeProvider theme={theme}>
      <Accordion expanded testID="outer" sx={source}>
        <AccordionSummary>Outer</AccordionSummary>
        <Accordion expanded testID="inner-inherit" sx={{ color: 'inherit' }}>
          <AccordionSummary>
            <Typography variant="inherit" testID="nested-inherit">
              Nested
            </Typography>
          </AccordionSummary>
        </Accordion>
        <Accordion expanded testID="inner-default">
          <AccordionSummary>
            <Typography variant="inherit" testID="nested-default">
              Default
            </Typography>
          </AccordionSummary>
        </Accordion>
      </Accordion>
    </ThemeProvider>,
  );
  expect(marker(tree.getByTestId('nested-inherit')).owner).toBe(
    tree.getByTestId('outer').props.ownedProgramme.owner,
  );
  expect(marker(tree.getByTestId('nested-default')).owner).toBe('');
});

for (const wrap of ['fragment', 'array'] as const) {
  test('rebase retained normalized Text children through ' + wrap, () => {
    const Rewrite = forwardRef<ViewInstance, ViewProps>(function Rewrite(
      { children, ...props },
      ref,
    ) {
      return (
        <Box {...props} ref={ref}>
          {Children.map(children, (child) =>
            isValidElement<{ style?: StyleProp<TextStyle>; children?: React.ReactNode }>(child)
              ? cloneElement(child, {
                  style: [child.props.style, { color: '#0000ff' }],
                  children:
                    wrap === 'fragment' ? (
                      <>{child.props.children}</>
                    ) : (
                      [child.props.children, ' suffix']
                    ),
                })
              : child,
          )}
        </Box>
      );
    });
    const tree = render(
      <ThemeProvider theme={theme}>
        <Accordion expanded sx={source}>
          <AccordionSummary>Summary</AccordionSummary>
          <Box component={Rewrite} testID="wrapped">
            <Text>Literal</Text>
          </Box>
        </Accordion>
      </ThemeProvider>,
    );
    const markers = tree.getByTestId('wrapped').findAllByType('ColorMarker' as never);
    expect(markers).toHaveLength(1);
    expect(markers[0].props.colorProgramme).toMatchObject({
      owner: '',
      key: '',
      ordinary: processColor('#0000ff'),
    });
  });
}

test('cloning normalized Text with the same emitted style reauthors that native color', () => {
  const Rewrite = forwardRef<ViewInstance, ViewProps>(function Rewrite(
    { children, ...props },
    ref,
  ) {
    return (
      <Box {...props} ref={ref}>
        {Children.map(children, (child) =>
          isValidElement<{ style?: StyleProp<TextStyle> }>(child)
            ? cloneElement(child, { style: child.props.style })
            : child,
        )}
      </Box>
    );
  });
  const tree = render(
    <ThemeProvider theme={theme}>
      <Accordion expanded sx={source}>
        <AccordionSummary>Summary</AccordionSummary>
        <Box component={Rewrite} testID="same-style">
          <Text>Literal</Text>
        </Box>
      </Accordion>
    </ThemeProvider>,
  );
  const markers = tree.getByTestId('same-style').findAllByType('ColorMarker' as never);
  expect(markers).toHaveLength(1);
  expect(markers[0].props.colorProgramme).toMatchObject({
    owner: '',
    key: '',
    ordinary: processColor('#0000ff'),
  });
});
test.each(['inherit', 'unset', 'currentColor'])(
  'a root %s branch materializes its actual blue parent rather than native default',
  (keyword) => {
    const tree = render(
      <ThemeProvider theme={theme}>
        <Box sx={{ color: '#0000ff' }}>
          <Accordion
            testID="inherited-root"
            sx={{ color: keyword, '&:first-of-type': { color: '#ff0000' } }}
          >
            <AccordionSummary>
              <Typography variant="inherit">Inherited</Typography>
            </AccordionSummary>
          </Accordion>
        </Box>
      </ThemeProvider>,
    );
    const bank = tree.getByTestId('inherited-root').props.ownedProgramme.textColors;
    expect(bank.ordinary).toBe(processColor('#0000ff'));
    expect(bank.colors).toEqual(
      Array.from({ length: 8 }, (_, facts) => processColor(facts & 2 ? '#ff0000' : '#0000ff')),
    );
  },
);
test('equal colors with changing authored inheritance still prepare a source bank', () => {
  const tree = render(
    <ThemeProvider theme={theme}>
      <Accordion expanded sx={source}>
        <AccordionSummary>Outer</AccordionSummary>
        <Accordion
          testID="switching"
          sx={{ color: '#0000ff', '&:first-of-type': { color: 'inherit' } }}
        >
          <AccordionSummary>
            <Typography variant="inherit" testID="switching-text">
              Inner
            </Typography>
          </AccordionSummary>
        </Accordion>
      </Accordion>
    </ThemeProvider>,
  );
  const programme = tree.getByTestId('switching').props.ownedProgramme;
  expect(programme.textColors.colors).toEqual(Array(8).fill(processColor('#0000ff')));
  expect(programme.textColorBarriers & 4).toBe(0);
  expect(programme.textColorBarriers & 1).toBe(1);
  expect(marker(tree.getByTestId('switching-text')).owner).toBe(programme.owner);
});

test('rebasing uses React child traversal without calling a caller array map', () => {
  const content = ['Literal', ' text'];
  Object.defineProperty(content, 'map', {
    value: () => {
      throw Error('caller map must not run');
    },
  });
  const tree = render(
    <ThemeProvider theme={theme}>
      <Accordion expanded sx={source}>
        <AccordionSummary>Summary</AccordionSummary>
        <Box>
          <Text testID="array-children">{content}</Text>
        </Box>
      </Accordion>
    </ThemeProvider>,
  );
  expect(tree.getByTestId('array-children')).toBeTruthy();
});

for (const value of [undefined, null]) {
  test(
    'a normalized View color reset preserves effective outer inheritance: ' + String(value),
    () => {
      const tree = render(
        <ThemeProvider theme={theme}>
          <Accordion expanded testID="reset-source" sx={source}>
            <AccordionSummary>Outer</AccordionSummary>
            <Box style={{ color: value }}>
              <Typography variant="inherit" testID="reset-box">
                Reset
              </Typography>
            </Box>
            <Accordion expanded testID="reset-inner" style={{ color: value }}>
              <AccordionSummary>
                <Typography variant="inherit" testID="reset-inner-text">
                  Inner
                </Typography>
              </AccordionSummary>
            </Accordion>
          </Accordion>
        </ThemeProvider>,
      );
      const owner = tree.getByTestId('reset-source').props.ownedProgramme.owner;
      expect(marker(tree.getByTestId('reset-box')).owner).toBe(owner);
      expect(marker(tree.getByTestId('reset-inner-text')).owner).toBe(owner);
      expect(tree.getByTestId('reset-inner').props.ownedProgramme.textColorBarriers).toBe(0);
    },
  );
}

test('an inner bank below a passive authored color scope binds no outer parent palette', () => {
  const tree = render(
    <ThemeProvider theme={theme}>
      <Accordion expanded sx={source}>
        <AccordionSummary>Outer</AccordionSummary>
        <Box sx={{ color: '#0000ff' }}>
          <Accordion
            testID="passive-inner"
            sx={{ color: 'inherit', '&:first-of-type': { color: '#ff0000' } }}
          >
            <AccordionSummary>
              <Typography variant="inherit">Inner</Typography>
            </AccordionSummary>
          </Accordion>
        </Box>
      </Accordion>
    </ThemeProvider>,
  );
  expect(tree.getByTestId('passive-inner').props.ownedProgramme.textColors.parent).toBeNull();
});
