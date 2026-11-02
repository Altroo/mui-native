import type { ViewStyle } from 'react-native';
export function nativeInsets(
  style: Readonly<Partial<ViewStyle>> | null | undefined,
  kind: 'padding' | 'margin',
): Partial<ViewStyle> {
  const edges: { -readonly [K in keyof ViewStyle]?: ViewStyle[K] } = {};
  for (const edge of ['Top', 'Right', 'Bottom', 'Left'] as const) {
    const value =
      style?.[`${kind}${edge}`] ??
      style?.[`${kind}${edge === 'Top' || edge === 'Bottom' ? 'Vertical' : 'Horizontal'}`] ??
      style?.[kind];
    if (value != null) edges[`${kind}${edge}`] = value;
  }
  return edges;
}
