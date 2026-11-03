import type { ViewInstance } from 'react-native';
import reference from './fixtures/mui-popper-geometry-9.5.0.json';
import { createNativePopper } from '../packages/material/src/popper/engine';
import { intersect } from '../packages/material/src/popper/geometry';
import type {
  NativePopperModifier,
  NativePopperPlatform,
  NativePopperRect,
  NativePopperOptions,
} from '../packages/material/src/popper/types';
function resolveStyle(
  style: Record<string, any>,
  size: { width: number; height: number },
  parent: { width: number; height: number },
) {
  let x =
      typeof style.left === 'number'
        ? style.left
        : typeof style.right === 'number'
          ? parent.width - size.width - style.right
          : 0,
    y =
      typeof style.top === 'number'
        ? style.top
        : typeof style.bottom === 'number'
          ? parent.height - size.height - style.bottom
          : 0;
  for (const transform of style.transform ?? []) {
    x += transform.translateX ?? 0;
    y += transform.translateY ?? 0;
  }
  return { x, y, ...size };
}
test.each(reference.fixtures)('original Core geometry: $input.name', async (fixture) => {
  const input = fixture.input as Record<string, any>,
    anchor = { isConnected: true } as unknown as ViewInstance,
    popup = { isConnected: true } as unknown as ViewInstance,
    arrow = { isConnected: true } as unknown as ViewInstance;
  const viewport = { x: 0, y: 0, ...reference.viewport },
    size = input.size ?? { width: 120, height: 80 },
    anchorRect = input.anchor ?? { x: 100, y: 200, width: 40, height: 20 },
    boundaryNodes = []
      .concat(input.boundary ?? [])
      .map((rect) => ({ getBoundingClientRect: () => rect }));
  const boundary = Array.isArray(input.boundary) ? boundaryNodes : boundaryNodes[0];
  const modifiers: NativePopperModifier[] = [
    { name: 'eventListeners', enabled: false },
    ...(input.modifiers ?? []).map((modifier: NativePopperModifier) => ({
      ...modifier,
      options:
        modifier.options?.boundary === 'fixture'
          ? { ...modifier.options, boundary }
          : modifier.options,
    })),
  ];
  if (input.offsetMode)
    modifiers.push({
      name: 'offset',
      options: {
        offset: ({ reference, placement }: any) => [
          reference.width / 10,
          placement.startsWith('top') ? 7 : 12,
        ],
      },
    });
  if (input.tetherMode)
    modifiers.push({
      name: 'preventOverflow',
      options: {
        altAxis: true,
        tetherOffset: ({ reference, popper }: any) => ({
          mainAxis: reference.width / 4,
          altAxis: popper.height / 4,
        }),
      },
    });
  if (input.roundMode)
    modifiers.push({
      name: 'computeStyles',
      options: { roundOffsets: ({ x, y }: any) => ({ x: Math.floor(x), y: Math.ceil(y) }) },
    });
  if (input.arrow)
    modifiers.push({ name: 'arrow', options: { element: arrow, padding: input.arrow.padding } });
  const platform: NativePopperPlatform = {
    report: () => {},
    measure: () => ({
      reference: anchorRect,
      popper: { x: 0, y: 0, ...size },
      viewport,
      document: { ...viewport, height: input.documentHeight ?? viewport.height },
      clipping: {
        reference: input.referenceClip ?? null,
        popper: null,
      },
      offsetParent: reference.viewport,
      pixelRatio: 1,
    }),
    layout: () =>
      input.arrow ? { x: 0, y: 0, width: input.arrow.width, height: input.arrow.height } : null,
    parent: () => size,
    contains: () => true,
    boundary: () =>
      []
        .concat(input.boundary)
        .reduce(
          (result: NativePopperRect | undefined, rect: NativePopperRect) =>
            result ? intersect(result, rect) : rect,
          undefined,
        )!,
  };
  const instance = createNativePopper(
    anchor,
    popup,
    {
      placement: input.placement ?? 'bottom',
      strategy: input.strategy ?? 'absolute',
      modifiers,
    } as Partial<NativePopperOptions>,
    platform,
  );
  try {
    await instance.update();
    const state = instance.state;
    const actual = JSON.parse(
      JSON.stringify({
        placement: state.placement,
        rects: state.rects,
        ordered: state.orderedModifiers.map((x) => x.name),
        data: state.modifiersData,
        attributes: state.attributes,
        position: resolveStyle(state.styles.popper, size, reference.viewport),
        arrowPosition: input.arrow
          ? resolveStyle(
              state.styles.arrow,
              { width: input.arrow.width, height: input.arrow.height },
              size,
            )
          : null,
      }),
    );
    const { document: ignored, ...expected } = fixture.state;
    void ignored;
    expect(actual).toEqual(expected);
  } finally {
    instance.destroy();
  }
});
