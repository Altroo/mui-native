// Copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT
// Pseudo paint consumes accepted ancestor CSS; source callbacks are already prepared.
import {
  componentStyle,
  isNativeTextStyleProperty,
  type NativeStyle,
  type NativeStyleTarget,
  type StyleContext,
  type Theme,
} from '@altroo/mui-native-system';
import type { NativeButtonGroupRule } from './buttonGroupContext';
import { nativeStyleAncestors } from './nativeStyleScope';
type Facts = Pick<StyleContext, 'lastChild' | 'firstOfType' | 'lastOfType'>;
/** Rebind only the exact source root aliases identified by their forwarded marker.
 * Outer ancestor predicates keep their own facts; a path through the root gets
 * its projected facts too. No native tree or mutable registry is read here.
 */
function ancestorsAt(rules: readonly NativeButtonGroupRule[], marker: string, facts: Facts) {
  const target: NativeStyleTarget = { classes: [], tag: '::before' };
  const projectTarget = (value: NativeStyleTarget) =>
    value.classes.includes(marker) ? { ...value, ...facts } : value;
  return rules.map((rule, index) => {
    const path = [
      ...rules
        .slice(index + 1)
        .flatMap((next) => (next.selector ? [projectTarget(next.selector)] : [])),
      target,
    ];
    const ancestor = rule.cascade(target.classes, path);
    if (!rule.selector?.classes.includes(marker)) return ancestor;
    return {
      ...ancestor,
      context: { ...ancestor.context, ...facts },
      ...(ancestor.prepared
        ? {
            prepared: {
              ...ancestor.prepared,
              sheets: ancestor.prepared.sheets.map((sheet) => ({
                ...sheet,
                context: {
                  ...sheet.context,
                  ...facts,
                  ...(sheet.context.descendantPath
                    ? { descendantPath: sheet.context.descendantPath.map(projectTarget) }
                    : {}),
                },
              })),
            },
          }
        : {}),
    };
  });
}
export function accordionBeforeStyle(
  theme: Theme,
  rules: readonly NativeButtonGroupRule[],
  context: StyleContext,
): NativeStyle {
  return componentStyle(theme, '', {}, undefined, {
    ...context,
    ancestors: nativeStyleAncestors(rules, { classes: [], tag: '::before' }),
  });
}
/** Parent-native selection uses the same eight structural fact combinations. */
export function accordionBeforeCases(
  theme: Theme,
  rules: readonly NativeButtonGroupRule[],
  context: StyleContext,
  marker: string,
): readonly NativeStyle[] {
  return Array.from({ length: 8 }, (_, bits) => {
    const facts = { lastChild: !!(bits & 1), firstOfType: !!(bits & 2), lastOfType: !!(bits & 4) };
    const style = componentStyle(theme, '', {}, undefined, {
      ...context,
      ancestors: ancestorsAt(rules, marker, facts),
    });
    return Object.fromEntries(
      Object.entries(style).filter(([key]) => !isNativeTextStyleProperty(key)),
    );
  });
}
