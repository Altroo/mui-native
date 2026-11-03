import type { NativePortalLayout } from './nativePortal';
/** Measurement calibration maps native container coordinates into its dispatch root. */
export function portalCalibration(data: NativePortalLayout) {
  const determinant = data.rootA * data.rootD - data.rootB * data.rootC;
  const a = data.rootD / determinant,
    b = -data.rootB / determinant,
    c = -data.rootC / determinant,
    d = data.rootA / determinant;
  return {
    calibrationA: a * data.a + c * data.b,
    calibrationB: b * data.a + d * data.b,
    calibrationC: a * data.c + c * data.d,
    calibrationD: b * data.c + d * data.d,
    calibrationX: a * (data.x - data.rootX) + c * (data.y - data.rootY),
    calibrationY: b * (data.x - data.rootX) + d * (data.y - data.rootY),
  };
}
