import reference from './fixtures/mui-popover-9.5.0.json';
import {
  positionPopover,
  getOffsetTop,
  getOffsetLeft,
  type PopoverOrigin,
} from '../packages/material/src/popoverGeometry';
test.each(reference.fixtures)('matches original MUI geometry: $name', (fixture) => {
  const input = fixture as any;
  const result = positionPopover({
    anchor: input.resolvedAnchor,
    size: input.resolvedSize,
    viewport: input.viewport,
    anchorReference: input.anchorReference ?? 'anchorEl',
    anchorOrigin: input.anchorOrigin ?? { vertical: 'top', horizontal: 'left' },
    transformOrigin: input.transformOrigin ?? { vertical: 'top', horizontal: 'left' },
    anchorPosition: input.anchorPosition,
    marginThreshold: Object.hasOwn(input, 'marginThreshold') ? input.marginThreshold : 16,
  });
  expect({
    top: result.top === null ? null : result.top + 'px',
    left: result.left === null ? null : result.left + 'px',
    transformOrigin: result.origin.horizontal + 'px ' + result.origin.vertical + 'px',
  }).toEqual(input.result);
});
test.each(reference.offsets)('public offset helpers match original lengths $length', (fixture) => {
  for (const [input, expected] of fixture.vertical)
    expect(getOffsetTop({ height: fixture.length }, input as PopoverOrigin['vertical'])).toBe(
      expected,
    );
  for (const [input, expected] of fixture.horizontal)
    expect(getOffsetLeft({ width: fixture.length }, input as PopoverOrigin['horizontal'])).toBe(
      expected,
    );
});
