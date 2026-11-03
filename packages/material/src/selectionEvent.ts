// Preserve native payload lifetime/methods while adapting the public value target.
export function selectionEvent(source: any, target: object, currentTarget = true): any {
  source.persist?.();
  const copy = Object.create(source);
  if ('nativeEvent' in source)
    Object.defineProperty(copy, 'nativeEvent', { value: source.nativeEvent, writable: true });
  Object.defineProperty(copy, 'target', { value: target, writable: true });
  if (currentTarget)
    Object.defineProperty(copy, 'currentTarget', { value: target, writable: true });
  for (const key of [
    'preventDefault',
    'stopPropagation',
    'persist',
    'isDefaultPrevented',
    'isPropagationStopped',
  ])
    if (typeof source[key] === 'function')
      Object.defineProperty(copy, key, { value: source[key].bind(source) });
  return copy;
}
