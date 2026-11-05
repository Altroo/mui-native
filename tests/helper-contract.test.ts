// Copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT
import {
  createSpacing,
  createBreakpoints,
  configureDiagnostics,
  type SpacingArgument,
} from '../packages/system/src';
import reference from './fixtures/mui-helper-contract-9.5.0.json';

const decode = (value: unknown): unknown =>
  value && typeof value === 'object' && 'undefined' in value && value.undefined === true
    ? undefined
    : value;
function spacingInput(spec: { input?: unknown; kind?: string; transform?: string }) {
  let input = decode(spec.input);
  if (spec.kind === 'function')
    input = (value: SpacingArgument) =>
      typeof value === 'number' ? value * 3 : 'fn:' + String(value);
  if (spec.kind === 'number-only')
    input = (value: SpacingArgument) => {
      if (typeof value !== 'number') throw TypeError('number-only');
      return value * 3;
    };
  if (spec.kind === 'marked-function')
    input = Object.assign((value: SpacingArgument) => `${value}px`, { mui: true });
  if (spec.kind === 'marked-array') input = Object.assign([0, 4], { mui: true });
  const transform =
    spec.transform === 'custom'
      ? (value: SpacingArgument) => 'custom:' + String(value)
      : spec.transform === 'empty'
        ? () => undefined
        : undefined;
  return { input, transform };
}
test.each(reference.spacing)('spacing source contract: $name', (spec) => {
  const diagnostics: unknown[] = [],
    restore = configureDiagnostics((value) => diagnostics.push(value));
  const { input, transform } = spacingInput(spec);
  let stage = 'create',
    error: { name: string; stage: string } | undefined,
    observation;
  try {
    try {
      const result: unknown = Reflect.apply(createSpacing, undefined, [input, transform]);
      observation = {
        helperType: typeof result,
        sameInput: result === input,
        mui: (result as { mui?: unknown }).mui,
        ...(typeof result === 'function' ? { output: undefined as string | undefined } : {}),
      };
      stage = 'call';
      if (typeof result === 'function')
        observation.output = Reflect.apply(result, undefined, spec.args.map(decode));
    } catch (failure) {
      error = { name: (failure as Error).name, stage };
    }
    if ('error' in spec) expect(error).toEqual(spec.error);
    else {
      expect(error).toBeUndefined();
      expect(observation).toEqual(spec.observation);
    }
    expect(diagnostics).toHaveLength(spec.diagnostics);
  } finally {
    restore();
  }
});

test.each(reference.breakpoints)('breakpoint source contract: $name', (spec) => {
  const input =
    spec.input === null
      ? null
      : Object.fromEntries(Object.entries(spec.input).map(([key, value]) => [key, decode(value)]));
  if ('error' in spec) {
    expect(() => Reflect.apply(createBreakpoints, undefined, [input])).toThrow(TypeError);
    return;
  }
  const result = Reflect.apply(createBreakpoints, undefined, [input]) as ReturnType<
    typeof createBreakpoints
  >;
  expect({
    keys: result.keys,
    values: result.values,
    unit: result.unit,
    mediaKeys: result.internal_mediaKeys,
  }).toEqual(spec.observation);
  for (const call of spec.calls) {
    const invoke = () => Reflect.apply(result[call.method as 'up'], result, call.args.map(decode));
    if ('error' in call) expect(invoke).toThrow(expect.objectContaining({ name: call.error }));
    else expect(invoke()).toBe(call.output);
  }
});

test('breakpoint query closures retain original values while sorted values are snapshots', () => {
  const values = { xs: 0, sm: 600, md: 900, lg: 1200, xl: 1536 };
  const result = createBreakpoints({ values });
  expect(result.values).not.toBe(values);
  values.sm = 700;
  expect(result.up('sm')).toBe('@media (min-width:700px)');
  expect(result.values.sm).toBe(600);
  result.values.sm = 800;
  expect(result.down('sm')).toBe('@media (max-width:699.95px)');
});
test('explicit method/keys/media overrides retain identity without changing internal query closures', () => {
  const up = jest.fn(() => 'custom-up'),
    keys: ReturnType<typeof createBreakpoints>['keys'] = ['sm'],
    internal_mediaKeys = ['custom-query'];
  const result = createBreakpoints({ up, keys, internal_mediaKeys, only: undefined });
  expect(result.up).toBe(up);
  expect(result.keys).toBe(keys);
  expect(result.internal_mediaKeys).toBe(internal_mediaKeys);
  expect(result.only).toBeUndefined();
  expect(result.between('xs', 'sm')).toBe('@media (min-width:0px) and (max-width:599.95px)');
  expect(up).not.toHaveBeenCalled();
});
test('native no-argument breakpoint convenience is retained', () => {
  expect(createBreakpoints().values).toEqual(createBreakpoints({}).values);
  expect(createBreakpoints(undefined).up('md')).toBe('@media (min-width:900px)');
});

test('published createBreakpoints deep route preserves the named unstable export and factory identity', () => {
  const deep = require('../packages/system/src/createBreakpoints');
  const { resolveMuiImport, createNativeTsconfig } = require('../packages/compat/index.cjs');
  expect(Object.keys(deep)).toEqual(['unstable_createBreakpoints']);
  expect(deep.unstable_createBreakpoints).toBe(createBreakpoints);
  expect(resolveMuiImport('@mui/system/createBreakpoints', 'ios')).toBe(
    '@altroo/mui-native-system/createBreakpoints',
  );
  expect(resolveMuiImport('@mui/system/createBreakpoints', 'web')).toBe(
    '@mui/system/createBreakpoints',
  );
  expect(createNativeTsconfig().compilerOptions.paths['@mui/system/createBreakpoints']).toEqual([
    './node_modules/@altroo/mui-native-system/dist/createBreakpoints/index.d.ts',
  ]);
  expect(() => resolveMuiImport('@mui/system/createTheme/createSpacing', 'android')).toThrow(
    'not implemented',
  );
});

test('between evaluates valid accessor start values before reading the end boundary', () => {
  const trace: string[] = [];
  let armed = false,
    end = 600;
  const values = {
    get xs() {
      if (armed) {
        trace.push('xs');
        end = 800;
      }
      return 0;
    },
    get sm() {
      if (armed) trace.push('sm');
      return end;
    },
    md: 900,
    lg: 1200,
    xl: 1536,
  };
  const result = createBreakpoints({ values });
  armed = true;
  expect({ output: result.between('xs', 'sm'), trace }).toEqual(reference.evaluationOrder);
});
test('construction snapshots enumerable key names before a valid getter changes enumerability', () => {
  const values = {
    get xs() {
      Object.defineProperty(values, 'sm', { enumerable: false });
      return 0;
    },
    sm: 600,
    md: 900,
    lg: 1200,
    xl: 1536,
  };
  const result = createBreakpoints({ values });
  expect({
    keys: result.keys,
    values: result.values,
    mediaKeys: result.internal_mediaKeys,
    inputKeys: Object.keys(values),
  }).toEqual(reference.constructionKeys);
});
