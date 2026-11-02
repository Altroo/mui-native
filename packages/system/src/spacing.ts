// Adapted from @mui/system 9.5.0 createSpacing and spacing (MIT).
// Copyright (c) 2014 Call-Em-All. See NOTICE and upstream/reuse.json.
import { diagnostic } from './diagnostics';
export type SpacingArgument = number | string;
export interface Spacing {
  (): string;
  (value: SpacingArgument): string;
  (topBottom: SpacingArgument, rightLeft: SpacingArgument): string;
  (top: SpacingArgument, rightLeft: SpacingArgument, bottom: SpacingArgument): string;
  (
    top: SpacingArgument,
    right: SpacingArgument,
    bottom: SpacingArgument,
    left: SpacingArgument,
  ): string;
}
export type SpacingOptions =
  | number
  | string
  | Spacing
  | ((value: number) => number | string)
  | ((value: SpacingArgument) => number | string)
  | ReadonlyArray<number | string>;
type Transform = (value: SpacingArgument) => number | string | undefined;
function unary(input: SpacingOptions): Transform {
  if (typeof input === 'function') return input as Transform;
  return (value) => {
    if (typeof value === 'string') return value;
    if (typeof input === 'number') return input * value;
    if (typeof input === 'string') {
      if (input.startsWith('var(') && value === 0) return 0;
      if (input.startsWith('var(') && value === 1) return input;
      return `calc(${value} * ${input})`;
    }
    const index = Math.abs(value);
    if (!Number.isInteger(index) || index >= input.length)
      diagnostic(
        'spacing',
        `Spacing array has no entry for ${value}; use an available integer index or a function.`,
      );
    const item = input[index];
    if (value >= 0) return item;
    if (typeof item === 'number') return -item;
    return item?.startsWith('var(') ? `calc(-1 * ${item})` : `-${item}`;
  };
}
export function createSpacing(
  input: SpacingOptions = 8,
  transform: Transform = unary(input),
): Spacing {
  if (typeof input === 'function' && (input as Spacing & { mui?: boolean }).mui)
    return input as Spacing;
  const spacing = (...args: SpacingArgument[]) => {
    if (args.length > 4)
      diagnostic('spacing', `Expected at most four spacing arguments; received ${args.length}.`);
    return (args.length ? args : [1])
      .map((value) => {
        const result = transform(value);
        return typeof result === 'number' ? `${result}px` : result;
      })
      .join(' ');
  };
  spacing.mui = true;
  return spacing;
}
