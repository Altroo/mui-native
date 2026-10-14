import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { processRows } from '../packages/x-data-grid/src/model';
import { RichTreeView, flattenTree } from '../packages/x-tree-view/src';
import { chartDomain, BarChart } from '../packages/x-charts/src';
import {
  AdapterDayjs,
  DateField,
  LocalizationProvider,
  validateDate,
} from '../packages/x-date-pickers/src';
test('grid filtering and sorting preserve row identities without mutating rows', () => {
  const rows = [
    { id: 'a', score: 2 },
    { id: 'b', score: 10 },
    { id: 'c', score: 1 },
  ];
  const columns = [{ field: 'score', type: 'number' as const }];
  expect(
    processRows(
      rows,
      columns,
      [{ field: 'score', sort: 'asc' }],
      { items: [{ field: 'score', operator: '>', value: 1 }] },
      (r) => r.id,
    ).map((r) => r.id),
  ).toEqual(['a', 'b']);
  expect(rows.map((r) => r.id)).toEqual(['a', 'b', 'c']);
  expect(() => processRows([{ id: 1 }, { id: 1 }], [], [], { items: [] }, (r) => r.id)).toThrow(
    'unique ids',
  );
});
test('grid excludes commercial multi-sort behavior', () => {
  expect(() =>
    processRows<{ id: string }>(
      [],
      [],
      [
        { field: 'a', sort: 'asc' },
        { field: 'b', sort: 'asc' },
      ],
      { items: [] },
      (r) => r.id as string,
    ),
  ).toThrow('Community');
});
test('collapsed tree hides descendants, expansion and selection callbacks preserve ids', () => {
  const select = jest.fn();
  render(
    <RichTreeView
      items={[{ id: 'parent', label: 'Parent', children: [{ id: 'child', label: 'Child' }] }]}
      onSelectedItemsChange={select}
    />,
  );
  expect(screen.queryByLabelText('Child')).toBeNull();
  fireEvent.press(screen.getByLabelText('Expand Parent'), { nativeEvent: {} });
  fireEvent.press(screen.getByLabelText('Child'), { nativeEvent: {} });
  expect(select.mock.calls[0][1]).toBe('child');
});
test('duplicate ids in collapsed branches are still invalid', () => {
  expect(() =>
    flattenTree<{ id: string; children?: { id: string }[] }>(
      [{ id: 'a', children: [{ id: 'a' }] }],
      new Set(),
      (r) => r.id,
      (r) => (r as { children?: { id: string }[] }).children ?? [],
    ),
  ).toThrow('Duplicate');
});
test('chart domains include negative data and remain usable for empty series', () => {
  expect(chartDomain([{ data: [-4, null, 8] }])).toEqual({ min: -4, max: 8 });
  expect(chartDomain([{ data: [] }])).toEqual({ min: 0, max: 1 });
  render(
    <BarChart
      series={[{ id: 'orders', label: 'Orders', data: [2] }]}
      xAxis={[{ data: ['Jan'] }]}
    />,
  );
  expect(screen.getByLabelText('Orders, Jan: 2')).toBeTruthy();
});
test('strict date parsing rejects impossible dates and preserves partial input', () => {
  const adapter = new AdapterDayjs();
  expect(adapter.parse('02/30/2026', 'MM/DD/YYYY')?.isValid()).toBe(false);
  const onChange = jest.fn();
  render(
    <LocalizationProvider>
      <DateField label="Date" onChange={onChange} />
    </LocalizationProvider>,
  );
  fireEvent(screen.getByLabelText('Date'), 'change', {
    nativeEvent: { text: '02/3', eventCount: 1, target: 1 },
  });
  expect(screen.getByLabelText('Date').props.value).toBe('02/3');
  expect(onChange.mock.calls[0][1]).toEqual({ validationError: 'invalidDate' });
});
test('date bounds use calendar days and named zones reject nonexistent DST time', () => {
  const a = new AdapterDayjs();
  const value = a.date('2026-10-14')!;
  expect(validateDate(value, { minDate: a.date('2026-10-15')! }, value)).toBe('minDate');
  expect(a.parse('2026-03-08 02:30', 'YYYY-MM-DD HH:mm', 'America/New_York')?.isValid()).toBe(
    false,
  );
  expect(a.parse('2026-03-08 03:30', 'YYYY-MM-DD HH:mm', 'America/New_York')?.isValid()).toBe(true);
});
