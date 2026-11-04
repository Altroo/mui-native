import React, { forwardRef, useState } from 'react';
import { StyleSheet, processColor } from 'react-native';
import Svg, {
  Path,
  G,
  Circle,
  Text as SvgText,
  Defs,
  LinearGradient,
  Stop,
  RNSVGLinearGradient,
  RNSVGTSpan,
  type SvgProps,
} from 'react-native-svg';
import { cleanup, render, fireEvent } from '@testing-library/react-native';
import {
  SvgIcon,
  createSvgIcon,
  svgIconClasses,
  getSvgIconUtilityClass,
  ThemeProvider,
  createTheme,
  NativeTextStyleContext,
  NativeIconStyleContext,
  configureDiagnostics,
  Box,
  type SvgIconProps,
  type SvgIconHandle,
  type ThemeOptions,
} from '@altroo/mui-native';
import { Add, createSvgIcon as createLegacyIcon } from '../packages/icons/src';
import reference from './fixtures/mui-svg-icon-9.5.0.json';
afterEach(cleanup);
const PathElement = React.createElement('path', { d: 'M4 4h16v16H4z' });
const Factory = createSvgIcon(PathElement, 'Probe');
const CustomRoot = forwardRef<Svg, SvgProps>((props, ref) => (
  <Svg viewBox="0 0 48 12" {...props} ref={ref} />
));
type Observation = {
  input: {
    name: string;
    props: Record<string, unknown>;
    theme?: Record<string, unknown>;
    customRoot?: boolean;
    child?: Record<string, unknown>;
    factory?: boolean;
    authoredChildren?: boolean;
    nested?: boolean;
    callbackCase?: string;
  };
  attributes: Record<string, string | null>;
  computed: Record<string, string>;
  titles: string[];
  shapes: string[];
  utilityTokens: string[];
  nestedColors: string[];
};
const observations = reference.fixtures as unknown as Observation[];
const parent = { style: { fontSize: 28, color: '#654321' }, nativeText: false };
function native(input: Observation['input']) {
  let options = input.theme as ThemeOptions | undefined;
  if (input.callbackCase === 'component')
    options = {
      components: {
        MuiSvgIcon: {
          styleOverrides: {
            root: ({ ownerState }) => ({ opacity: ownerState.component === 'svg' ? 0.4 : 1 }),
          },
        },
      },
    };
  if (input.callbackCase === 'root-props')
    options = {
      components: {
        MuiSvgIcon: {
          styleOverrides: {
            root: ({ color, ownerState }) => ({
              fontSize: color === 'secondary' && ownerState.color === 'primary' ? 17 : 30,
            }),
          },
        },
      },
    };
  if (input.callbackCase === 'predicate')
    options = {
      components: {
        MuiSvgIcon: {
          variants: [
            {
              props: ({ component, color, ownerState }) =>
                component === 'svg' && color === 'primary' && ownerState.color === 'primary',
              style: { fontSize: 22, opacity: 0.6 },
            },
          ],
        },
      },
    };
  if (input.callbackCase === 'style')
    options = {
      components: {
        MuiSvgIcon: {
          variants: [
            {
              props: { color: 'secondary' },
              style: ({ theme, color, ownerState }) => ({
                fontSize: 26,
                color:
                  color === 'primary' && ownerState.color === 'primary'
                    ? theme.palette.success.main
                    : theme.palette.error.main,
              }),
            },
          ],
        },
      },
    };
  if (input.callbackCase === 'generated-root')
    options = {
      components: {
        MuiSvgIcon: {
          styleOverrides: {
            root: ({ viewBox, focusable, className, 'aria-hidden': hidden }) => ({
              opacity:
                viewBox === '0 0 24 24' &&
                focusable === 'false' &&
                hidden === true &&
                String(className).includes('MuiSvgIcon-root')
                  ? 0.35
                  : 1,
            }),
          },
        },
      },
    };
  const theme = createTheme(options);
  const ref = React.createRef<SvgIconHandle>();
  let children: React.ReactNode = input.authoredChildren ? <Circle r={3} /> : PathElement;
  if (input.nested) children = <SvgIcon>{PathElement}</SvgIcon>;
  if (input.child) children = React.createElement('svg', input.child, PathElement);
  const Component = input.factory ? Factory : SvgIcon;
  const props = input.props as SvgIconProps;
  const tree = render(
    <ThemeProvider theme={theme}>
      <NativeTextStyleContext.Provider value={parent}>
        {input.customRoot ? (
          <Component {...props} component={CustomRoot} ref={ref}>
            {children}
          </Component>
        ) : (
          <Component {...props} ref={ref}>
            {children}
          </Component>
        )}
      </NativeTextStyleContext.Provider>
    </ThemeProvider>,
  );
  return { tree, props: tree.UNSAFE_getByType(Svg).props, ref };
}
test.each(observations)('pinned original browser: $input.name', (observation) => {
  const { props, ref, tree } = native(observation.input),
    expected = observation.computed;
  // Chromium rounds layout lengths to subpixel grid units; compare the authored
  // native lengths within one twentieth of a pixel, not native screen geometry.
  for (const key of ['width', 'height', 'fontSize'])
    expect(Number(props[key as keyof SvgProps])).toBeCloseTo(parseFloat(expected[key]), 1);
  expect(processColor(props.color)).toEqual(processColor(expected.color));
  const fill = props.fill === 'currentColor' ? props.color : (props.fill ?? '#000');
  expect(fill === 'none' ? 'none' : processColor(fill)).toEqual(
    expected.fill === 'none' ? 'none' : processColor(expected.fill),
  );
  const stroke = props.stroke === 'currentColor' ? props.color : (props.stroke ?? 'none');
  expect(stroke === 'none' ? 'none' : processColor(stroke)).toEqual(
    expected.stroke === 'none' ? 'none' : processColor(expected.stroke),
  );
  expect(Number(props.strokeWidth ?? 1)).toBeCloseTo(parseFloat(expected.strokeWidth));
  expect(StyleSheet.flatten(props.style).opacity ?? 1).toBeCloseTo(Number(expected.opacity));
  expect(props.viewBox).toBe(observation.attributes.viewBox ?? undefined);
  expect(props.id ?? null).toBe(observation.attributes.id);
  expect(props.testID ?? null).toBe(observation.attributes['data-testid']);
  expect(props.accessibilityElementsHidden).toBe(observation.attributes['aria-hidden'] === 'true');
  if (observation.attributes.role === 'img') expect(props.accessibilityRole).toBe('image');
  if (observation.attributes.role === 'presentation') expect(props.accessibilityRole).toBe('none');
  expect(props.accessibilityLabel ?? null).toBe(observation.titles[0] ?? null);
  expect(ref.current).toBeInstanceOf(Svg);
  const roots = tree.UNSAFE_queryAllByType(Svg);
  for (const [index, color] of observation.nestedColors.entries())
    expect(processColor(roots[index + 1].props.color)).toEqual(processColor(color));
  expect(tree.UNSAFE_queryAllByType(Path)).toHaveLength(1);
  expect(tree.UNSAFE_queryAllByType(Circle)).toHaveLength(0);
});
test('utility identifiers preserve all pinned public keys and global states', () => {
  expect(svgIconClasses).toEqual(reference.classes.classes);
  expect(getSvgIconUtilityClass('disabled')).toBe(reference.classes.disabled);
  expect(getSvgIconUtilityClass('colorInfo')).toBe(reference.classes.info);
});
test('factory forwards SVG methods and keeps authored children fixed', () => {
  const ref = React.createRef<SvgIconHandle>();
  const Icon = createSvgIcon(<Path d="M1 1h4v4z" />, 'Owned');
  const tree = render(
    <Icon ref={ref}>
      <Circle r={3} />
    </Icon>,
  );
  expect(ref.current).toBeInstanceOf(Svg);
  expect(typeof ref.current?.measure).toBe('function');
  expect(typeof ref.current?.toDataURL).toBe('function');
  expect(tree.UNSAFE_queryAllByType(Circle)).toHaveLength(0);
  expect(tree.UNSAFE_getByType(Path).props.d).toBe('M1 1h4v4z');
  tree.unmount();
  expect(ref.current).toBeNull();
});
test('legacy path-string icons share Material defaults, refs and styling', () => {
  const ref = React.createRef<SvgIconHandle>();
  const theme = createTheme({
    components: { MuiSvgIcon: { defaultProps: { color: 'success', fontSize: 'small' } } },
  });
  const Icon = createLegacyIcon('M0 0h4v4z', 'Legacy');
  const tree = render(
    <ThemeProvider theme={theme}>
      <Icon ref={ref} sx={{ fontSize: 31 }} />
    </ThemeProvider>,
  );
  expect(ref.current).toBeInstanceOf(Svg);
  expect(tree.UNSAFE_getByType(Path).props.d).toBe('M0 0h4v4z');
  expect(tree.UNSAFE_getByType(Svg).props).toMatchObject({
    fill: 'currentColor',
    color: theme.palette.success.main,
    width: 31,
    height: 31,
  });
});
test('existing original artwork remains unchanged', () => {
  const tree = render(<Add />);
  expect(tree.UNSAFE_getByType(Path).props.d).toBe('M11 4h2v7h7v2h-7v7h-2v-7H4v-2h7Z');
});
test('composed control icon sizes outrank CSS font rules, while native inline sizing wins', () => {
  const tree = render(
    <NativeIconStyleContext.Provider value={{ fontSize: 20 }}>
      <SvgIcon fontSize="large" sx={{ fontSize: 31 }} style={{ fontSize: 38 }}>
        {PathElement}
      </SvgIcon>
    </NativeIconStyleContext.Provider>,
  );
  expect(tree.UNSAFE_getByType(Svg).props).toMatchObject({ width: 38, height: 38, fontSize: 38 });
  tree.rerender(
    <NativeIconStyleContext.Provider value={{ fontSize: 20 }}>
      <SvgIcon fontSize="large" sx={{ fontSize: 31 }}>
        {PathElement}
      </SvgIcon>
    </NativeIconStyleContext.Provider>,
  );
  expect(tree.UNSAFE_getByType(Svg).props).toMatchObject({ width: 20, height: 20, fontSize: 20 });
});
test('SVG paint styles stay off native View styles and ordinary Views keep diagnostics', () => {
  const issues: string[] = [];
  const restore = configureDiagnostics(({ message }) => issues.push(message));
  try {
    const tree = render(
      <SvgIcon sx={{ fill: 'none', stroke: '#123456', strokeWidth: 2 }}>{PathElement}</SvgIcon>,
    );
    const props = tree.UNSAFE_getByType(Svg).props;
    expect(props).toMatchObject({ fill: 'none', stroke: '#123456', strokeWidth: 2 });
    expect(StyleSheet.flatten(props.style)).not.toHaveProperty('fill');
    expect(StyleSheet.flatten(props.style)).not.toHaveProperty('strokeWidth');
    expect(issues).toHaveLength(0);
    tree.rerender(<Box sx={{ fill: 'red' }} />);
    expect(issues.some((x) => x.includes('Unsupported native style fill'))).toBe(true);
  } finally {
    restore();
  }
});
test('nested authored geometry and SVG text normalize without invoking component hooks', () => {
  const renders = jest.fn();
  function NativeChild() {
    const [value] = useState('Native');
    renders();
    return <SvgText>{value}</SvgText>;
  }
  const tree = render(
    <SvgIcon>
      <React.Fragment>
        {React.createElement(
          'g',
          { testID: 'group' },
          React.createElement('circle', { r: 3 }),
          React.createElement('text', {}, 'Authored'),
        )}
        <NativeChild />
      </React.Fragment>
    </SvgIcon>,
  );
  expect(tree.UNSAFE_queryAllByType(G).length).toBeGreaterThan(0);
  expect(tree.UNSAFE_getByType(Circle).props.r).toBe(3);
  expect(tree.UNSAFE_queryAllByType(SvgText)).toHaveLength(2);
  expect(renders).toHaveBeenCalledTimes(1);
});
test('a native SVG child replaces viewBox and presentation defaults without another SVG root', () => {
  const tree = render(
    <SvgIcon viewBox="0 0 24 24" htmlColor="#111111">
      <Svg viewBox="0 0 40 20" color="#246810" fill="none">
        <Path d="M0 0h4v4z" />
      </Svg>
    </SvgIcon>,
  );
  expect(tree.UNSAFE_queryAllByType(Svg)).toHaveLength(1);
  expect(tree.UNSAFE_getByType(Svg).props).toMatchObject({
    viewBox: '0 0 40 20',
    color: '#246810',
    fill: 'none',
  });
});
test('a single child ref replaces the wrapper ref and detaches correctly', () => {
  const wrapper = React.createRef<SvgIconHandle>(),
    child = React.createRef<SvgIconHandle>();
  const tree = render(
    <SvgIcon ref={wrapper}>
      <Svg ref={child}>{PathElement}</Svg>
    </SvgIcon>,
  );
  expect(wrapper.current).toBeNull();
  expect(child.current).toBeInstanceOf(Svg);
  tree.unmount();
  expect(child.current).toBeNull();
});
test('React 19 callback-ref cleanup runs once on custom-root unmount', () => {
  const detached = jest.fn(),
    attach = jest.fn(() => detached);
  const Root = forwardRef<Svg, SvgProps>((props, ref) => <Svg {...props} ref={ref} />);
  const tree = render(
    <SvgIcon component={Root} ref={attach}>
      {PathElement}
    </SvgIcon>,
  );
  expect(attach).toHaveBeenCalledTimes(1);
  tree.unmount();
  expect(detached).toHaveBeenCalledTimes(1);
  expect(attach).toHaveBeenCalledTimes(1);
});
test('custom native roots receive composed utility identifiers', () => {
  const received: Record<string, unknown>[] = [];
  const Root = forwardRef<Svg, SvgProps & { className?: string }>(
    ({ className, ...props }, ref) => {
      received.push({ className });
      return <Svg {...props} ref={ref} />;
    },
  );
  render(
    <SvgIcon
      component={Root}
      color="primary"
      fontSize="small"
      className="author"
      classes={{ root: 'root-author', fontSizeSmall: 'small-author' }}
    >
      {PathElement}
    </SvgIcon>,
  );
  expect(String(received[0].className).split(' ')).toEqual(
    expect.arrayContaining([
      'MuiSvgIcon-root',
      'root-author',
      'MuiSvgIcon-colorPrimary',
      'MuiSvgIcon-fontSizeSmall',
      'small-author',
      'author',
    ]),
  );
});
test('explicit undefined in a single SVG child clears authored presentation props', () => {
  const tree = render(
    <SvgIcon viewBox="0 0 30 30" htmlColor="#111111" fill="#333333">
      <Svg viewBox={undefined} color={undefined} fill={undefined}>
        {PathElement}
      </Svg>
    </SvgIcon>,
  );
  const props = tree.UNSAFE_getByType(Svg).props;
  expect(props.viewBox).toBeUndefined();
  expect(props.fill).toBeUndefined();
  expect(props.color).toBe(createTheme().palette.text.primary);
});
test('decorative and named native accessibility defaults remain overridable', () => {
  const tree = render(<SvgIcon>{PathElement}</SvgIcon>);
  expect(tree.UNSAFE_getByType(Svg).props).toMatchObject({
    accessible: false,
    accessibilityElementsHidden: true,
    focusable: false,
  });
  tree.rerender(<SvgIcon titleAccess="Available">{PathElement}</SvgIcon>);
  expect(tree.UNSAFE_getByType(Svg).props).toMatchObject({
    accessible: true,
    accessibilityLabel: 'Available',
    accessibilityRole: 'image',
    accessibilityElementsHidden: false,
  });
  tree.rerender(
    <SvgIcon titleAccess="Available" accessible={false} accessibilityLabel="Application name">
      {PathElement}
    </SvgIcon>,
  );
  expect(tree.UNSAFE_getByType(Svg).props).toMatchObject({
    accessible: false,
    accessibilityLabel: 'Application name',
  });
});
test.each(['div', 'not-svg'])('unsupported authored <%s> fails before native rendering', (tag) => {
  expect(() => render(<SvgIcon>{React.createElement(tag)}</SvgIcon>)).toThrow(/cannot render/);
});
test('bare SVG text reports its required native text container', () => {
  expect(() => render(<SvgIcon>Label</SvgIcon>)).toThrow(/text must be inside/);
});
test('a factory honors an explicitly cleared development test id', () => {
  const tree = render(<Factory data-testid={undefined} />);
  expect(tree.UNSAFE_getByType(Svg).props.testID).toBeUndefined();
});
test('source SVG props and child elements are not mutated', () => {
  const style = Object.freeze({ fill: 'none' as const, color: '#123456' });
  const path = Object.freeze(React.createElement('path', { d: 'M0 0h4v4z' }));
  const child = React.createElement('svg', { viewBox: '0 0 10 10', style }, path);
  render(<SvgIcon>{child}</SvgIcon>);
  expect(child.props.style).toBe(style);
  expect(child.props.children).toBe(path);
});

test('symbolic SVG paint survives descendant color overrides and nested Material scope', () => {
  const tree = render(
    <SvgIcon color="primary">
      {React.createElement(
        'g',
        { color: '#993355' },
        React.createElement('path', { d: 'M0 0h4v4z' }),
        <SvgIcon>{PathElement}</SvgIcon>,
      )}
    </SvgIcon>,
  );
  const roots = tree.UNSAFE_queryAllByType(Svg);
  expect(roots[0].props.fill).toBe('currentColor');
  expect(roots[1].props.color).toBe('#993355');
  expect(roots[1].props.fill).toBe('currentColor');
});
test('theme opacity outranks an SVG presentation attribute', () => {
  const theme = createTheme({
    components: { MuiSvgIcon: { styleOverrides: { root: { opacity: 0.8 } } } },
  });
  const tree = render(
    <ThemeProvider theme={theme}>
      <SvgIcon opacity={0.2}>{PathElement}</SvgIcon>
    </ThemeProvider>,
  );
  expect(tree.UNSAFE_getByType(Svg).props.opacity).toBe(0.8);
});
test('native SVG press aliases preserve explicit native handler priority', () => {
  const web = jest.fn(),
    native = jest.fn();
  const tree = render(
    <SvgIcon titleAccess="Clickable" onClick={web}>
      {PathElement}
    </SvgIcon>,
  );
  fireEvent.press(tree.UNSAFE_getByType(Svg));
  expect(web).toHaveBeenCalledTimes(1);
  tree.rerender(
    <SvgIcon titleAccess="Clickable" onClick={web} onPress={native}>
      {PathElement}
    </SvgIcon>,
  );
  fireEvent.press(tree.UNSAFE_getByType(Svg));
  expect(native).toHaveBeenCalledTimes(1);
  expect(web).toHaveBeenCalledTimes(1);
});

test('explicit visible ARIA naming also makes a native icon accessible', () => {
  const tree = render(
    <SvgIcon aria-hidden={false} aria-label="Available" role="img">
      {PathElement}
    </SvgIcon>,
  );
  expect(tree.UNSAFE_getByType(Svg).props).toMatchObject({
    accessible: true,
    accessibilityLabel: 'Available',
    accessibilityRole: 'image',
    accessibilityElementsHidden: false,
  });
});

test('nested native SVG roots inherit relative font declarations once in their renderer', () => {
  const tree = render(
    <SvgIcon fontWeight="bolder" fontStyle="oblique">
      <SvgIcon>
        <SvgText>Nested</SvgText>
      </SvgIcon>
    </SvgIcon>,
  );
  const roots = tree.UNSAFE_queryAllByType(Svg);
  expect(roots[0].props.fontWeight).toBe('bolder');
  expect(roots[0].props.fontStyle).toBe('oblique');
  expect(roots[1].props.fontWeight).toBeUndefined();
  expect(roots[1].props.fontStyle).toBeUndefined();
});

test('resolved font values reach the actual backend group, with CSS over attributes', () => {
  const tree = render(
    <SvgIcon
      fontFamily="Attribute"
      font={{ fontFamily: 'Object', fontSize: 10 }}
      sx={{ fontFamily: 'Styled', fontSize: 30, fontWeight: 700 }}
    >
      <SvgText>AB</SvgText>
    </SvgIcon>,
  );
  expect(tree.UNSAFE_queryAllByType(G)[0].props.font).toMatchObject({
    fontFamily: 'Styled',
    fontSize: 30,
    fontWeight: '700',
  });
  expect(tree.UNSAFE_getByType(RNSVGTSpan).props.content).toBe('AB');
});
test('scoped SVG text keeps literal children visible to the native text extractor', () => {
  const tree = render(<SvgIcon>{React.createElement('text', { color: 'red' }, 'Hello')}</SvgIcon>);
  expect(tree.UNSAFE_getByType(RNSVGTSpan).props.content).toBe('Hello');
});
test('gradient stops remain immediate children for native gradient extraction', () => {
  const tree = render(
    <SvgIcon>
      <Defs>
        {React.createElement(
          'linearGradient',
          { id: 'paint', color: 'red' },
          <Stop offset={0} stopColor="#123456" />,
          <Stop offset={1} stopColor="#abcdef" />,
        )}
      </Defs>
      {PathElement}
    </SvgIcon>,
  );
  const gradient = tree.UNSAFE_getByType(RNSVGLinearGradient).props.gradient;
  expect(gradient).toHaveLength(4);
  expect(gradient[0]).toBe(0);
  expect(gradient[2]).toBe(1);
  expect(gradient[1] >>> 0).toBe((processColor('#123456') as number) >>> 0);
  expect(gradient[3] >>> 0).toBe((processColor('#abcdef') as number) >>> 0);
});

test('text fragments retain strings at the backend text boundary', () => {
  const tree = render(
    <SvgIcon>
      {React.createElement(
        'text',
        { color: 'red' },
        <React.Fragment key="text">Fragment text</React.Fragment>,
      )}
    </SvgIcon>,
  );
  expect(tree.UNSAFE_getByType(RNSVGTSpan).props.content).toBe('Fragment text');
});
test('gradient fragments flatten to actual stops before backend inspection', () => {
  const tree = render(
    <SvgIcon>
      <Defs>
        <LinearGradient id="fragment-paint">
          {[
            <React.Fragment key="stops">
              <Stop offset={0} stopColor="#123456" />
              <Stop offset={1} stopColor="#abcdef" />
            </React.Fragment>,
          ]}
        </LinearGradient>
      </Defs>
      {PathElement}
    </SvgIcon>,
  );
  expect(tree.UNSAFE_getByType(RNSVGLinearGradient).props.gradient).toHaveLength(4);
});

test('gradient currentColor stops bind actual native colors from the owned SVG scope', () => {
  const tree = render(
    <SvgIcon>
      {React.createElement(
        'linearGradient',
        { id: 'current-paint', color: '#993355' },
        React.createElement('stop', { offset: 0, stopColor: 'currentColor' }),
        React.createElement('stop', { offset: 1, stopColor: '#ffffff' }),
      )}
    </SvgIcon>,
  );
  const gradient = tree.UNSAFE_getByType(RNSVGLinearGradient).props.gradient;
  expect(gradient).toHaveLength(4);
  expect(gradient[1] >>> 0).toBe((processColor('#993355') as number) >>> 0);
});

test.each([true, false])(
  'gradient inline paint priority respects authored SVG tags: %s',
  (authored) => {
    const props = {
      offset: 0,
      stopColor: '#123456',
      stopOpacity: 0.1,
      style: { stopColor: '#abcdef', stopOpacity: 0.8 },
    };
    const tree = render(
      <SvgIcon>
        <LinearGradient id="inline-paint">
          {authored ? React.createElement('stop', props) : <Stop {...props} />}
          <Stop offset={1} stopColor="#ffffff" />
        </LinearGradient>
      </SvgIcon>,
    );
    const gradient = tree.UNSAFE_getByType(RNSVGLinearGradient).props.gradient;
    expect(gradient).toHaveLength(4);
    expect(gradient[1] >>> 0).toBe(authored ? 0xccabcdef : 0x1a123456);
  },
);
