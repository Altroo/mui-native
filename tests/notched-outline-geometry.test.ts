// Copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT
import { notchedOutlineGeometry } from '../packages/material/src/notchedOutlineGeometry';

test('a focused rounded outline stays inside its native bounds and retains corner arcs', () => {
  const result = notchedOutlineGeometry(200, 56, { borderWidth: 2, borderRadius: 16 });
  expect(result.thickness).toBe(2);
  expect(result.path.startsWith('M 16 1 ')).toBe(true);
  expect(result.path).toContain('A 15 15');
  expect(result.path).not.toMatch(/NaN|Infinity/);
});
test('logical radii mirror while retaining Fabric corner override precedence', () => {
  const style = {
    borderWidth: 2,
    borderRadius: 4,
    borderTopLeftRadius: 8,
    borderTopStartRadius: 20,
  };
  expect(notchedOutlineGeometry(200, 56, style).path.startsWith('M 8 1 ')).toBe(true);
  expect(notchedOutlineGeometry(200, 56, style, true).path.startsWith('M 8 1 ')).toBe(true);
  expect(
    notchedOutlineGeometry(200, 56, {
      borderWidth: 2,
      borderTopStartRadius: 20,
      borderStartStartRadius: 24,
    }).path.startsWith('M 20 1 '),
  ).toBe(true);
  expect(
    notchedOutlineGeometry(
      200,
      56,
      { borderWidth: 2, borderStartEndRadius: 24 },
      true,
    ).path.startsWith('M 24 1 '),
  ).toBe(true);
});
test('overlapping and percentage corners normalize while invalid numeric styles remain finite', () => {
  const oversized = notchedOutlineGeometry(100, 40, { borderWidth: 1, borderRadius: 80 });
  expect(oversized.path.startsWith('M 20 0.5 ')).toBe(true);
  const percent = notchedOutlineGeometry(100, 40, { borderWidth: 1, borderRadius: '50%' });
  expect(percent.path).toContain('A 49.5 19.5');
  expect(
    notchedOutlineGeometry(0, 0, { borderWidth: Infinity, borderRadius: Infinity }).path,
  ).not.toMatch(/NaN|Infinity/);
});
