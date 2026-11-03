import { portalCalibration } from '../packages/native-host/src/portalCoordinates';
import { portalBounds } from '../packages/material/src/portalGeometry';
import type { NativePortalLayout } from '../packages/native-host/src/nativePortal';
const base: NativePortalLayout = {
  revision: 'test',
  presented: true,
  reason: 'presented',
  x: 0,
  y: 0,
  width: 390,
  height: 844,
  a: 1,
  b: 0,
  c: 0,
  d: 1,
  rootX: 0,
  rootY: 0,
  rootA: 1,
  rootB: 0,
  rootC: 0,
  rootD: 1,
};
test.each([
  [
    'offset dispatch root',
    { x: 130, y: 250, a: 2, d: 2, rootX: 30, rootY: 50 },
    [2, 0, 0, 2, 100, 200],
  ],
  [
    'rotated dispatch root',
    {
      x: 40,
      y: 240,
      a: 0,
      b: 2,
      c: -2,
      d: 0,
      rootX: 100,
      rootY: 200,
      rootA: 0,
      rootB: 2,
      rootC: -2,
      rootD: 0,
    },
    [1, 0, 0, 1, 20, 30],
  ],
  ['window target outside translated React root', { rootX: 30, rootY: 70 }, [1, 0, 0, 1, -30, -70]],
  [
    'independent target scale and root rotation',
    {
      x: 40,
      y: 240,
      a: 3,
      b: 0,
      c: 0,
      d: 4,
      rootX: 100,
      rootY: 200,
      rootA: 0,
      rootB: 2,
      rootC: -2,
      rootD: 0,
    },
    [0, -1.5, 2, 0, 20, 30],
  ],
] as const)(
  '%s maps actual target bounds into native touch page coordinates',
  (_name, fields, expected) => {
    const result = portalCalibration({ ...base, ...fields });
    [
      'calibrationA',
      'calibrationB',
      'calibrationC',
      'calibrationD',
      'calibrationX',
      'calibrationY',
    ].forEach((key, i) => expect(result[key as keyof typeof result]).toBeCloseTo(expected[i]));
  },
);
test.each(['rootX', 'rootY', 'rootA', 'rootB', 'rootC', 'rootD'] as const)(
  'malformed dispatch-root %s cannot expose children',
  (key) => {
    expect(portalBounds({ ...base, [key]: NaN })).toBeNull();
  },
);
test('singular dispatch-root transform cannot expose children', () => {
  expect(portalBounds({ ...base, rootA: 1, rootB: 2, rootC: 2, rootD: 4 })).toBeNull();
});
