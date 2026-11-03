import { diagnostic, resolveSx, type Theme, type SxProps } from '@altroo/mui-native-system';
export function nativeListProps<P extends object>(props: P): P {
  const { classes, className, focusVisibleClassName, ...native } = props as P &
    Record<string, unknown>;
  if (classes || className || focusVisibleClassName)
    diagnostic(
      'list-classes',
      'Use native list sx state selectors, slot props or styles instead of CSS classes.',
    );
  return native as P;
}
export function listSlotStyle(
  theme: Theme,
  name: string,
  slot: string,
  ownerState: object,
  width: number,
) {
  const config = theme.components[name];
  const override = config && typeof config === 'object' ? config.styleOverrides?.[slot] : undefined;
  const input =
    typeof override === 'function'
      ? override({ theme, ownerState: ownerState as Record<string, unknown> })
      : override;
  return resolveSx(input as SxProps, theme, { mode: 'css', slot, width });
}

// An absolute child sized by its parent cannot define that parent's natural size.
export function parentSizedListAction(
  style: object | null | undefined,
  axis: 'width' | 'height',
  direction: 'ltr' | 'rtl',
) {
  const value = (style ?? {}) as Record<string, unknown>;
  const percent = (input: unknown) => typeof input === 'string' && input.endsWith('%');
  const cap = axis[0].toUpperCase() + axis.slice(1);
  if ([axis, 'min' + cap, 'max' + cap].some((key) => percent(value[key]))) return true;
  if (value[axis] != null && value[axis] !== 'auto') return false;
  const edge = (key: string) => (value[key] === 'auto' ? undefined : value[key]);
  if (axis === 'height') return edge('top') != null && edge('bottom') != null;
  const left = edge(direction === 'rtl' ? 'end' : 'start') ?? edge('left');
  const right = edge(direction === 'rtl' ? 'start' : 'end') ?? edge('right');
  return left != null && right != null;
}

export function listDirection(value: unknown, fallback: 'ltr' | 'rtl') {
  return value === 'ltr' || value === 'rtl' ? value : fallback;
}
