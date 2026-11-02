import { joinClassNames, mergeNativeStyles } from '@altroo/mui-native-system';

type Callback = (...args: any[]) => any;
const asProps = (value: unknown): Record<string, any> =>
  value && typeof value === 'object' ? (value as Record<string, any>) : {};
// Adapted from Material UI 9.5.0 mergeSlotProps (MIT); native styles preserve
// ordered arrays/callbacks. Event composition is distinct from default resolution.
export function mergeSlotProps<
  T extends object | undefined,
  K = T,
  U = T extends Callback ? T : K extends Callback ? K : T extends undefined ? K : T,
>(external: T | undefined, defaults: K): U {
  if (!external) return defaults as unknown as U;
  const merge = (suppliedValue: unknown, fallbackValue: unknown, ownerState?: unknown) => {
    const supplied = asProps(suppliedValue),
      fallback = asProps(fallbackValue);
    const result = { ...fallback, ...supplied };
    for (const [key, handler] of Object.entries(fallback))
      if (
        /^on[A-Z]/.test(key) &&
        typeof handler === 'function' &&
        typeof supplied[key] === 'function'
      )
        result[key] = (...args: unknown[]) => {
          supplied[key](...args);
          handler(...args);
        };
    const className = joinClassNames(
      asProps(ownerState).className,
      fallback.className,
      supplied.className,
    );
    if (className) result.className = className;
    if (fallback.style && supplied.style)
      result.style = mergeNativeStyles(fallback.style, supplied.style);
    if (fallback.sx && supplied.sx)
      result.sx = [
        ...(Array.isArray(fallback.sx) ? fallback.sx : [fallback.sx]),
        ...(Array.isArray(supplied.sx) ? supplied.sx : [supplied.sx]),
      ];
    return result;
  };
  if (typeof external === 'function' || typeof defaults === 'function')
    return ((ownerState: unknown) => {
      const fallback = typeof defaults === 'function' ? defaults(ownerState) : defaults;
      const supplied =
        typeof external === 'function'
          ? external({ ...asProps(ownerState), ...asProps(fallback) })
          : external;
      return merge(supplied, fallback, ownerState);
    }) as unknown as U;
  return merge(external, defaults) as U;
}
