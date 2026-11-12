// Copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT
import babel from '@babel/core';
import { readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { format, resolveConfig } from 'prettier';
import { loadReference } from './load.mjs';
const files = [
  'Button/Button.js',
  'ButtonGroup/ButtonGroup.js',
  'ButtonBase/ButtonBase.js',
  'utils/createSimplePaletteValueFilter.js',
  'transitions/utils.js',
  'styles/reducedMotion.js',
  'styles/focusVisible.js',
];
const { reference, directory } = await loadReference('@mui/material', files);
const t = babel.types;
const declarations = [];
const replacements = {
  '_buttonClasses.default': 'buttonClasses',
  '_buttonGroupClasses.default': 'buttonGroupClasses',
  '_buttonBaseClasses.default': 'buttonBaseClasses',
  '_createSimplePaletteValueFilter.default': 'simplePaletteFilter',
  '_utils2.getTransitionStyles': 'sourceTransitionStyles',
  '_focusVisible.outsetFocusRing': 'sourceOutsetFocusRing',
  '_capitalize.default': 'sourceCapitalize',
};
const ownerType = t.tsTypeReference(t.identifier('CssOwner'));
const stylesType = t.tsTypeReference(t.identifier('CssSlots'));
function annotate(fn, kind) {
  if (kind === 'constructor') {
    fn.params[0].typeAnnotation = t.tsTypeAnnotation(
      t.tsTypeLiteral([
        t.tsPropertySignature(
          t.identifier('theme'),
          t.tsTypeAnnotation(t.tsTypeReference(t.identifier('CssTheme'))),
        ),
      ]),
    );
    fn.returnType = t.tsTypeAnnotation(t.tsTypeReference(t.identifier('ComponentStyleObject')));
  } else {
    fn.params[0].typeAnnotation = t.tsTypeAnnotation(
      t.tsTypeLiteral([
        t.tsPropertySignature(t.identifier('ownerState'), t.tsTypeAnnotation(ownerType)),
      ]),
    );
    fn.params[1].typeAnnotation = t.tsTypeAnnotation(stylesType);
    fn.returnType = t.tsTypeAnnotation(t.tsUnknownKeyword());
  }
  return fn;
}
for (const [file, original, name] of [
  ['Button/Button.js', 'ButtonRoot', 'buttonSource'],
  ['ButtonGroup/ButtonGroup.js', 'ButtonGroupRoot', 'groupSource'],
  ['ButtonBase/ButtonBase.js', 'ButtonBaseRoot', 'baseSource'],
]) {
  const ast = babel.parseSync(
    await readFile(directory + '/node_modules/@mui/material/' + file, 'utf8'),
  );
  let constructor, resolver;
  babel.traverse(ast, {
    VariableDeclarator(path) {
      if (path.node.id.name === 'overridesResolver' && original === 'ButtonGroupRoot')
        resolver = t.cloneNode(path.node.init, true);
      if (path.node.id.name !== original) return;
      let init = path.node.init;
      if (t.isAssignmentExpression(init)) init = init.right;
      if (!t.isCallExpression(init) || !t.isCallExpression(init.arguments[0]))
        throw Error('Changed styled constructor shape');
      constructor = t.cloneNode(init.arguments[0].arguments[0], true);
      const options = init.callee.arguments[1];
      for (const property of options.properties)
        if (
          property.key.name === 'overridesResolver' &&
          t.isArrowFunctionExpression(property.value)
        )
          resolver = t.cloneNode(property.value, true);
    },
  });
  if (!t.isArrowFunctionExpression(constructor)) throw Error('Missing original constructor');
  declarations.push(
    t.variableDeclaration('const', [
      t.variableDeclarator(t.identifier(name), annotate(constructor, 'constructor')),
    ]),
  );
  if (resolver)
    declarations.push(
      t.variableDeclaration('const', [
        t.variableDeclarator(t.identifier(name + 'Overrides'), annotate(resolver, 'resolver')),
      ]),
    );
}
const ast = t.file(t.program(declarations));
babel.traverse(ast, {
  MemberExpression(path) {
    const { object, property } = path.node;
    if (!t.isIdentifier(object) || !t.isIdentifier(property)) return;
    const replacement = replacements[object.name + '.' + property.name];
    if (replacement) path.replaceWith(t.identifier(replacement));
  },
  CallExpression: {
    exit(path) {
      const callee = path.node.callee;
      if (
        t.isSequenceExpression(callee) &&
        callee.expressions.length === 2 &&
        t.isNumericLiteral(callee.expressions[0], { value: 0 }) &&
        t.isIdentifier(callee.expressions[1])
      )
        path.node.callee = callee.expressions[1];
      if (
        t.isMemberExpression(callee) &&
        t.isIdentifier(callee.object, { name: 'theme' }) &&
        t.isIdentifier(callee.property, { name: 'alpha' })
      )
        path.replaceWith(
          t.callExpression(
            t.callExpression(t.identifier('sourceAlpha'), [t.identifier('theme')]),
            path.node.arguments,
          ),
        );
    },
  },
});
babel.traverse(ast, {
  ReferencedIdentifier(path) {
    const name = path.node.name;
    if (name.startsWith('_') && !path.scope.hasBinding(name))
      throw Error('Unadapted original constructor dependency: ' + name);
  },
});
const constructors = babel.transformFromAstSync(ast, undefined, {
  configFile: false,
  babelrc: false,
  comments: true,
}).code;
const helpers = `/* Constructor CSS programmes adapt MIT Material UI 9.5.0.
 * Copyright (c) MUI contributors. See NOTICE and upstream/button-style-programmes.json.
 * Native integration: Copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT */
// Generated by scripts/reference/button-style-programmes.mjs from verified source.
// These are CSS identity data. Rendering remains in the native implementations.
import { alpha, type Theme, type Palette, type PaletteColor, type ComponentStyleObject, type ComponentVariant } from '@altroo/mui-native-system';
import { serializeNativeCss } from '@altroo/mui-native-system/internal/prepared-style';
import { buttonClasses } from './buttonClasses';
import { buttonGroupClasses } from './buttonGroupClasses';
import { buttonBaseClasses } from './buttonBaseClasses';
type CssPalette = Palette & Record<string, PaletteColor>;
type CssTheme = Omit<Theme, 'palette' | 'focusVisible'> & {
  focusVisible?: Exclude<Theme['focusVisible'], false>;
  palette: CssPalette;
  vars?: Theme & { palette: CssPalette & { Button: { inheritContainedBg: string; inheritContainedHoverBg: string }; common: Palette['common'] & { onBackground: string } } };
  alpha?: typeof alpha;
};
type CssOwner = Record<string, unknown> & { variant: string; size: string; color: string; orientation: string; disableElevation: boolean; fullWidth: boolean; loading: boolean };
type CssSlots = Readonly<Record<string, unknown>>;
const sourceOutsetFocusRing = { '--_focusVisible-offset': 1, '--_focusVisible-behavior': 'initial' };
function sourceCapitalize(value: string): string { return value.charAt(0).toUpperCase() + value.slice(1); }
// Resolve the source callee before palette/opacity arguments, with one accessor read.
function sourceAlpha(theme: CssTheme) {
  const method = theme.alpha;
  return (color: string, opacity: number) => method ? Reflect.apply(method, theme, [color, opacity]) : alpha(color, opacity);
}
function simplePaletteFilter(extra: readonly string[] = []) {
  return ([, value]: [string, unknown]) => !!value && typeof value === 'object' && typeof (value as Record<string, unknown>).main === 'string' && extra.every((key) => Object.hasOwn(value, key) && typeof (value as Record<string, unknown>)[key] === 'string');
}
function sourceTransitionStyles(theme: CssTheme, props: string | string[], options: Parameters<Theme['transitions']['create']>[1]) {
  const transition = theme.transitions?.create?.(props, options);
  const mode = theme.motion?.reducedMotion;
  const reduced = mode === 'always' ? { transition: 'none' } : mode === 'system' ? { '@media (prefers-reduced-motion: reduce)': { transition: 'none' } } : undefined;
  return { ...(transition === undefined ? {} : { transition }), ...reduced };
}
`;
const footer = `
type Serialized = { styles: string };
type PreparedConstructor = { style: Serialized; variants: readonly (Omit<ComponentVariant, 'style'> & { style: ComponentVariant['style'] | Serialized })[] | undefined };
function memoConstructor(factory: (input: { theme: CssTheme }) => ComponentStyleObject) {
  let lastTheme: Theme | undefined, lastValue: PreparedConstructor | undefined;
  return (theme: Theme): PreparedConstructor => {
    if (!lastValue || theme !== lastTheme) {
      const { variants, ...style } = factory({ theme: theme as CssTheme });
      lastValue = { style: { styles: serializeNativeCss(style) }, variants: variants?.map((variant) => ({ ...variant, style: typeof variant.style === 'function' ? variant.style : { styles: serializeNativeCss(variant.style) } })) };
      lastTheme = theme;
    }
    return lastValue;
  };
}
function selectConstructor(prepared: PreparedConstructor, theme: Theme, ownerState: Record<string, unknown>): string {
  if (!prepared.variants) return prepared.style.styles + ';';
  const styles: unknown[] = [prepared.style];
  const args = { ...theme, theme, ...ownerState, ownerState };
  for (const variant of prepared.variants) {
    const condition = variant.props;
    const matches = typeof condition === 'function' ? condition(args) : Object.keys(condition).every((key) => ownerState[key] === condition[key]);
    if (matches) styles.push(typeof variant.style === 'function' ? variant.style(args) : variant.style);
  }
  return serializeNativeCss(styles);
}
const button = memoConstructor(buttonSource), group = memoConstructor(groupSource), base = memoConstructor(baseSource);
export const buttonConstructorCss = (theme: Theme, owner: object) => selectConstructor(button(theme), theme, owner as Record<string, unknown>);
export const buttonGroupConstructorCss = (theme: Theme, owner: object) => selectConstructor(group(theme), theme, owner as Record<string, unknown>);
export const buttonBaseConstructorCss = (theme: Theme, owner: object) => selectConstructor(base(theme), theme, owner as Record<string, unknown>);
export const buttonOverrideCss = (owner: Record<string, unknown>, styles: CssSlots) => buttonSourceOverrides({ ownerState: owner as CssOwner }, styles);
export const buttonGroupOverrideCss = (owner: Record<string, unknown>, styles: CssSlots) => groupSourceOverrides({ ownerState: owner as CssOwner }, styles);
export const buttonBaseOverrideCss = (_owner: Record<string, unknown>, styles: CssSlots) => styles.root;
`;
const target = 'packages/material/src/nativeButtonCss.ts';
const output = await format(helpers + constructors + footer, {
  ...(await resolveConfig(target)),
  filepath: target,
});
const record = {
  schemaVersion: 1,
  description:
    'Pinned original ButtonGroup, Button and ButtonBase constructor programmes and override resolver shape, retained independently of native geometry.',
  reference,
  generator: {
    source: 'scripts/reference/button-style-programmes.mjs',
    sha256: createHash('sha256')
      .update(await readFile('scripts/reference/button-style-programmes.mjs'))
      .digest('hex'),
  },
  localFiles: [target],
};
const recordFile = 'upstream/button-style-programmes.json';
const recordText = await format(JSON.stringify(record), {
  ...(await resolveConfig(recordFile)),
  filepath: recordFile,
});
if (process.argv.length === 3 && process.argv[2] === '--check') {
  if (
    (await readFile(target, 'utf8')) !== output ||
    (await readFile(recordFile, 'utf8')) !== recordText
  )
    throw Error('Stale button constructor source programmes');
  console.log('Verified original constructor programmes and source provenance');
} else if (process.argv.length === 2) {
  await writeFile(target, output);
  await writeFile(recordFile, recordText);
  console.log('Updated original constructor programmes and provenance');
} else throw Error('Use no arguments or --check');
