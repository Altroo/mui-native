// Adapted from @mui/system 9.5.0 createBreakpoints (MIT).
// Copyright (c) 2014 Call-Em-All. See NOTICE and upstream/reuse.json.
export interface BreakpointOverrides {}
type BreakpointFlags = Omit<
  Record<'xs' | 'sm' | 'md' | 'lg' | 'xl', true>,
  keyof BreakpointOverrides
> &
  BreakpointOverrides;
export type Breakpoint = Extract<
  {
    [K in keyof BreakpointFlags]: true extends BreakpointFlags[K] ? K : never;
  }[keyof BreakpointFlags],
  string
>;
export interface Breakpoints {
  keys: Breakpoint[];
  values: { [K in Breakpoint]: number };
  up: (key: Breakpoint | number) => string;
  down: (key: Breakpoint | number) => string;
  between: (start: Breakpoint | number, end: Breakpoint | number) => string;
  only: (key: Breakpoint) => string;
  not: (key: Breakpoint) => string;
  unit?: string;
  internal_mediaKeys: string[];
}
export interface BreakpointsOptions extends Partial<Breakpoints> {
  step?: number;
}
export const breakpointKeys = ['xs', 'sm', 'md', 'lg', 'xl'] as Breakpoint[];
export function createBreakpoints(options: BreakpointsOptions = {}): Breakpoints {
  const {
    values = { xs: 0, sm: 600, md: 900, lg: 1200, xl: 1536 } as Breakpoints['values'],
    unit = 'px',
    step = 5,
    ...other
  } = options;
  const sortedValues = Object.fromEntries(
    Object.entries(values).sort((a, b) => a[1] - b[1]),
  ) as Breakpoints['values'];
  const keys = Object.keys(sortedValues) as Breakpoint[];
  const value = (key: Breakpoint | number): string | number =>
    typeof (values as Record<string | number, number>)[key] === 'number'
      ? (values as Record<string | number, number>)[key]
      : key;
  const up = (key: Breakpoint | number) => `@media (min-width:${value(key)}${unit})`;
  const down = (key: Breakpoint | number) =>
    `@media (max-width:${Number(value(key)) - step / 100}${unit})`;
  const between = (start: Breakpoint | number, end: Breakpoint | number) =>
    `${up(start)} and (max-width:${Number(value(end)) - step / 100}${unit})`;
  const only = (key: Breakpoint) =>
    keys.indexOf(key) + 1 < keys.length ? between(key, keys[keys.indexOf(key) + 1]) : up(key);
  const not = (key: Breakpoint) => {
    const index = keys.indexOf(key);
    if (index === 0) return up(keys[1]);
    if (index === keys.length - 1) return down(key);
    return between(key, keys[index + 1]).replace('@media', '@media not all and');
  };
  return {
    keys,
    values: sortedValues,
    up,
    down,
    between,
    only,
    not,
    unit,
    internal_mediaKeys: keys.map(up),
    ...other,
  };
}
