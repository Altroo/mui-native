import '@shopify/flash-list/jestSetup';
import React from 'react';
import { View, Text, ScrollView, Dimensions } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import {
  act,
  renderAsync,
  screen,
  fireEventAsync,
  cleanupAsync,
} from '@testing-library/react-native';

import { DataGrid, type GridColDef } from '../packages/x-data-grid/src';
import * as gridModel from '../packages/x-data-grid/src/model';

// FlashList measures and commits layout asynchronously, including during recycling.
beforeEach(() => {
  jest.useFakeTimers();
});
afterEach(async () => {
  await act(async () => {
    jest.runOnlyPendingTimers();
  });
  await cleanupAsync();
  jest.useRealTimers();
});

const rows = [
  { uuid: 'a', name: 'Alpha', amount: 30 },
  { uuid: 'b', name: 'Beta', amount: 10 },
  { uuid: 'c', name: 'Gamma', amount: 20 },
  { uuid: 'd', name: 'Delta', amount: 40 },
];
const getRowId = (row: (typeof rows)[number]) => row.uuid;
const columns: GridColDef<(typeof rows)[number]>[] = [
  { field: 'name', headerName: 'Name' },
  { field: 'amount', headerName: 'Amount', type: 'number', valueFormatter: (value) => `$${value}` },
];
const initialState = { pagination: { paginationModel: { page: 0, pageSize: 2 } } };
const base = { rows, columns, getRowId, initialState, checkboxSelection: true };

test('table remains the default and cards preserve formatting and custom cell values', async () => {
  const custom = [
    ...columns,
    {
      field: 'uuid',
      headerName: 'Reference',
      renderCell: ({ value }: { value: unknown }) => `Ref ${value}`,
    },
  ];
  const { rerenderAsync } = await renderAsync(<DataGrid {...base} columns={custom} />);
  expect(screen.getByTestId('native-grid-table')).toBeTruthy();
  expect(screen.getByText('$30')).toBeTruthy();
  expect(screen.getByText('Ref a')).toBeTruthy();
  await rerenderAsync(
    <DataGrid {...base} columns={custom} nativeLayout="cards" nativeCardTitleField="name" />,
  );
  expect(screen.getByTestId('native-grid-cards')).toBeTruthy();
  expect(screen.getByText('$30')).toBeTruthy();
  expect(screen.getByText('Ref a')).toBeTruthy();
  expect(screen.queryByText('Gamma')).toBeNull();
});

test('adaptive layout changes preserve selection, page and sorting state', async () => {
  const selection = jest.fn();
  const sorting = jest.fn();
  await renderAsync(
    <DataGrid
      {...base}
      nativeLayout="auto"
      onRowSelectionModelChange={selection}
      onSortModelChange={sorting}
    />,
  );
  const resize = async (width: number) =>
    await fireEventAsync(screen.getByTestId('native-data-grid'), 'layout', {
      nativeEvent: { layout: { x: 0, y: 0, width, height: 420 } },
    });
  await resize(390);
  expect(screen.getByTestId('native-grid-cards')).toBeTruthy();
  await fireEventAsync.press(screen.getByLabelText('Sort Amount'), { nativeEvent: {} });
  expect(sorting).toHaveBeenLastCalledWith([{ field: 'amount', sort: 'asc' }]);
  expect(
    screen
      .getAllByRole('checkbox')
      .map((node) => node.props.accessibilityLabel)
      .sort(),
  ).toEqual(['Select row b', 'Select row c']);
  await fireEventAsync.press(screen.getByLabelText('Select row b'), { nativeEvent: {} });
  expect(selection.mock.calls[0][0].ids).toEqual(new Set(['b']));
  await resize(800);
  expect(screen.getByTestId('native-grid-table')).toBeTruthy();
  expect(screen.getByLabelText('Select row b')).toBeChecked();
  await fireEventAsync.press(screen.getByLabelText('Next page'), { nativeEvent: {} });
  expect(screen.getByText('3-4 of 4')).toBeTruthy();
  await resize(390);
  expect(screen.getByTestId('native-grid-cards')).toBeTruthy();
  expect(
    screen
      .getAllByRole('checkbox')
      .map((node) => node.props.accessibilityLabel)
      .sort(),
  ).toEqual(['Select row a', 'Select row d']);
  expect(screen.getByText('3-4 of 4')).toBeTruthy();
  await fireEventAsync.press(screen.getByLabelText('Previous page'), { nativeEvent: {} });
  expect(screen.getByLabelText('Select row b')).toBeChecked();
});

test('explicit table mode stays a table in a narrow container', async () => {
  await renderAsync(<DataGrid {...base} nativeLayout="table" />);
  await fireEventAsync(screen.getByTestId('native-data-grid'), 'layout', {
    nativeEvent: { layout: { width: 320, height: 420, x: 0, y: 0 } },
  });
  expect(screen.getByTestId('native-grid-table')).toBeTruthy();
  expect(screen.queryByTestId('native-grid-cards')).toBeNull();
});

test('controlled server models stay application-owned in cards', async () => {
  const sort = jest.fn();
  const paginate = jest.fn();
  const select = jest.fn();
  const excluded = new Set(['a']);
  await renderAsync(
    <DataGrid
      {...base}
      rows={rows.slice(0, 2)}
      nativeLayout="cards"
      sortingMode="server"
      paginationMode="server"
      filterMode="server"
      rowCount={50}
      sortModel={[]}
      paginationModel={{ page: 2, pageSize: 2 }}
      rowSelectionModel={{ type: 'exclude', ids: excluded }}
      onSortModelChange={sort}
      onPaginationModelChange={paginate}
      onRowSelectionModelChange={select}
    />,
  );
  await fireEventAsync.press(screen.getByLabelText('Sort Amount'), { nativeEvent: {} });
  expect(sort).toHaveBeenCalledWith([{ field: 'amount', sort: 'asc' }]);
  expect(
    screen
      .getAllByRole('checkbox')
      .map((node) => node.props.accessibilityLabel)
      .sort(),
  ).toEqual(['Select row a', 'Select row b']);
  await fireEventAsync.press(screen.getByLabelText('Next page'), { nativeEvent: {} });
  expect(paginate).toHaveBeenCalledWith({ page: 3, pageSize: 2 });
  expect(screen.getByText('5-6 of 50')).toBeTruthy();
  await fireEventAsync.press(screen.getByLabelText('Select row b'), { nativeEvent: {} });
  expect(select.mock.calls[0][0]).toEqual({ type: 'exclude', ids: new Set(['a', 'b']) });
  expect(excluded).toEqual(new Set(['a']));
  expect(screen.getByLabelText('Select row b')).toBeChecked();
});

test('both layouts use the same filter and empty/loading states', async () => {
  const filter = { items: [{ field: 'amount', operator: '>' as const, value: 100 }] };
  const { rerenderAsync } = await renderAsync(
    <DataGrid {...base} nativeLayout="cards" filterModel={filter} />,
  );
  expect(screen.getByText('No rows')).toBeTruthy();
  expect(screen.getByText('0-0 of 0')).toBeTruthy();
  await rerenderAsync(<DataGrid {...base} nativeLayout="table" filterModel={filter} />);
  expect(screen.getByText('No rows')).toBeTruthy();
  await rerenderAsync(<DataGrid {...base} nativeLayout="cards" loading />);
  expect(screen.getByLabelText('Loading rows')).toBeTruthy();
  expect(screen.queryByRole('checkbox')).toBeNull();
});

test('layout and selection changes do not reprocess the dataset', async () => {
  const process = jest.spyOn(gridModel, 'processRows');
  try {
    await renderAsync(<DataGrid {...base} nativeLayout="auto" />);
    expect(process).toHaveBeenCalledTimes(1);
    await fireEventAsync(screen.getByTestId('native-data-grid'), 'layout', {
      nativeEvent: { layout: { width: 390, height: 420, x: 0, y: 0 } },
    });
    await fireEventAsync.press(screen.getByLabelText('Select row a'), { nativeEvent: {} });
    await fireEventAsync(screen.getByTestId('native-data-grid'), 'layout', {
      nativeEvent: { layout: { width: 800, height: 420, x: 0, y: 0 } },
    });
    expect(process).toHaveBeenCalledTimes(1);
    await fireEventAsync.press(screen.getByLabelText('Sort Amount'), { nativeEvent: {} });
    expect(process).toHaveBeenCalledTimes(2);
  } finally {
    process.mockRestore();
  }
});

test('custom cards share formatted cells and grid-owned selection without changing table rendering', async () => {
  const select = jest.fn();
  const renderCard = ({
    row,
    selected,
    selectionControl,
    renderCell,
  }: import('../packages/x-data-grid/src').NativeGridCardParams<(typeof rows)[number]>) => (
    <View>
      <Text>
        {row.name} {selected ? 'selected' : 'available'}
      </Text>
      {renderCell('amount')}
      {renderCell('missing')}
      {selectionControl}
    </View>
  );
  const { rerenderAsync } = await renderAsync(
    <DataGrid
      {...base}
      nativeLayout="cards"
      nativeRenderCard={renderCard}
      onRowSelectionModelChange={select}
    />,
  );
  expect(screen.getByText('$30')).toBeTruthy();
  expect(screen.getByText('Alpha available')).toBeTruthy();
  await fireEventAsync.press(screen.getByLabelText('Select row a'), { nativeEvent: {} });
  expect(screen.getByText('Alpha selected')).toBeTruthy();
  expect(select).toHaveBeenCalledWith({ type: 'include', ids: new Set(['a']) });
  await rerenderAsync(<DataGrid {...base} nativeLayout="table" nativeRenderCard={renderCard} />);
  expect(screen.getByText('Alpha')).toBeTruthy();
  expect(screen.queryByText('Alpha selected')).toBeNull();
  expect(screen.getByLabelText('Select row a')).toBeChecked();
  await rerenderAsync(
    <DataGrid
      {...base}
      checkboxSelection={false}
      nativeLayout="cards"
      nativeRenderCard={renderCard}
    />,
  );
  expect(screen.getByText('Alpha selected')).toBeTruthy();
  expect(screen.queryByRole('checkbox')).toBeNull();
});

test.each([
  { content: 'Invoice', text: ['Invoice'] },
  { content: 0, text: ['0'] },
  { content: ['Invoice', 0], text: ['Invoice', '0'] },
  {
    content: (
      <>
        {'Invoice'}
        {0}
      </>
    ),
    text: ['Invoice', '0'],
  },
])('custom card ReactNode text is hosted in native text: $text', async ({ content, text }) => {
  await renderAsync(
    <DataGrid
      {...base}
      rows={rows.slice(0, 1)}
      nativeLayout="cards"
      nativeRenderCard={() => content}
    />,
  );
  for (const value of text) expect(screen.getByText(value)).toBeTruthy();
});

test.each(['cards', 'table'] as const)(
  'custom cells normalize arrays and fragments in %s',
  async (nativeLayout) => {
    await renderAsync(
      <DataGrid
        {...base}
        rows={rows.slice(0, 1)}
        nativeLayout={nativeLayout}
        columns={[{ field: 'name', renderCell: () => <>{['Invoice', 0]}</> }]}
      />,
    );
    expect(screen.getByText('Invoice')).toBeTruthy();
    expect(screen.getByText('0')).toBeTruthy();
  },
);

test.each(['cards', 'table'] as const)(
  'sort direction is exposed through accessibility in %s',
  async (nativeLayout) => {
    await renderAsync(<DataGrid {...base} nativeLayout={nativeLayout} />);
    expect(screen.getByLabelText('Sort Amount')).toHaveAccessibilityValue({ text: 'Not sorted' });
    for (const direction of ['Ascending', 'Descending', 'Not sorted']) {
      await fireEventAsync.press(screen.getByLabelText('Sort Amount'), { nativeEvent: {} });
      expect(screen.getByLabelText('Sort Amount')).toHaveAccessibilityValue({ text: direction });
    }
  },
);

test.each(['cards', 'table'] as const)(
  'type-distinct row IDs retain separate recycling keys and selection in %s',
  async (nativeLayout) => {
    const onSelect = jest.fn();
    const mixedRows = [
      { id: 1, name: 'Numeric' },
      { id: '1', name: 'String' },
    ];
    await renderAsync(
      <DataGrid
        rows={mixedRows}
        columns={[{ field: 'name' }]}
        nativeLayout={nativeLayout}
        checkboxSelection
        onRowSelectionModelChange={onSelect}
      />,
    );
    const key = screen.UNSAFE_getByType(FlashList).props.keyExtractor;
    expect(key(mixedRows[0], 0)).not.toBe(key(mixedRows[1], 1));
    expect(screen.getByText('Numeric')).toBeTruthy();
    expect(screen.getByText('String')).toBeTruthy();
    await fireEventAsync.press(screen.getAllByRole('checkbox')[0], { nativeEvent: {} });
    await fireEventAsync.press(screen.getAllByRole('checkbox')[1], { nativeEvent: {} });
    expect(onSelect).toHaveBeenLastCalledWith({ type: 'include', ids: new Set([1, '1']) });
  },
);

test.each(['cards', 'table'] as const)(
  'an empty controlled page reports no displayed rows in %s',
  async (nativeLayout) => {
    const onPage = jest.fn();
    await renderAsync(
      <DataGrid
        {...base}
        nativeLayout={nativeLayout}
        paginationModel={{ page: 2, pageSize: 2 }}
        onPaginationModelChange={onPage}
      />,
    );
    expect(screen.getByText('0-0 of 4')).toBeTruthy();
    expect(screen.queryByRole('checkbox')).toBeNull();
    expect(onPage).not.toHaveBeenCalled();
  },
);

test('a partial server page reports only the supplied rows', async () => {
  await renderAsync(
    <DataGrid
      {...base}
      rows={rows.slice(0, 1)}
      nativeLayout="cards"
      paginationMode="server"
      rowCount={50}
      paginationModel={{ page: 2, pageSize: 2 }}
    />,
  );
  expect(screen.getByText('5-5 of 50')).toBeTruthy();
});

test.each([
  { page: -1, pageSize: 2 },
  { page: 0.5, pageSize: 2 },
  { page: Number.NaN, pageSize: 2 },
  { page: 0, pageSize: 1.5 },
  { page: 0, pageSize: Number.NaN },
])('invalid pagination models fail explicitly: %j', async (paginationModel) => {
  await expect(
    renderAsync(<DataGrid {...base} paginationModel={paginationModel} />),
  ).rejects.toThrow(/page|pageSize/);
});

test('table scrolling layers preserve handled keyboard taps', async () => {
  await renderAsync(<DataGrid {...base} />);
  const horizontal = screen
    .UNSAFE_getAllByType(ScrollView)
    .find((node) => node.props.testID === 'native-grid-table');
  expect(horizontal?.props.keyboardShouldPersistTaps).toBe('handled');
  expect(screen.UNSAFE_getByType(FlashList).props.keyboardShouldPersistTaps).toBe('handled');
});

test.each(['cards', 'table'] as const)(
  'custom content state resets when a %s holder recycles to another row',
  async (nativeLayout) => {
    function Draft({ name }: { name: string }) {
      const [draft] = React.useState(name);
      return (
        <Text>
          {name}:{draft}
        </Text>
      );
    }
    const recyclingRows = [
      { ...rows[0], uuid: 1 },
      { ...rows[1], uuid: '1' },
    ];
    await renderAsync(
      <DataGrid
        {...base}
        rows={recyclingRows}
        getRowId={(row) => row.uuid}
        nativeLayout={nativeLayout}
        nativeRenderCard={({ row }) => <Draft name={row.name} />}
        columns={[{ field: 'name', renderCell: ({ row }) => <Draft name={row.name} /> }]}
      />,
    );
    const renderItem = screen.UNSAFE_getByType(FlashList).props.renderItem;
    await cleanupAsync();
    const holder = await renderAsync(renderItem({ item: recyclingRows[0], index: 0 }));
    expect(screen.getByText('Alpha:Alpha')).toBeTruthy();
    await holder.rerenderAsync(
      renderItem({ item: { ...recyclingRows[0], name: 'Renamed' }, index: 0 }),
    );
    expect(screen.getByText('Renamed:Alpha')).toBeTruthy();
    await holder.rerenderAsync(renderItem({ item: recyclingRows[1], index: 1 }));
    expect(screen.getByText('Beta:Beta')).toBeTruthy();
  },
);

test('auto uses window width only before measurement and switches exactly at 600dp', async () => {
  const window = Dimensions.get('window');
  const screenSize = Dimensions.get('screen');
  const resizeWindow = async (width: number) =>
    act(async () =>
      Dimensions.set({ window: { ...window, width }, screen: { ...screenSize, width } }),
    );
  await resizeWindow(599);
  const view = await renderAsync(<DataGrid {...base} nativeLayout="auto" />);
  try {
    expect(screen.getByTestId('native-grid-cards')).toBeTruthy();
    await resizeWindow(700);
    expect(screen.getByTestId('native-grid-table')).toBeTruthy();
    const measure = async (width: number) =>
      fireEventAsync(screen.getByTestId('native-data-grid'), 'layout', {
        nativeEvent: { layout: { width, height: 420, x: 0, y: 0 } },
      });
    await measure(599);
    await resizeWindow(1000);
    expect(screen.getByTestId('native-grid-cards')).toBeTruthy();
    await measure(600);
    expect(screen.getByTestId('native-grid-table')).toBeTruthy();
    await view.rerenderAsync(<DataGrid {...base} nativeLayout="cards" />);
    expect(screen.getByTestId('native-grid-cards')).toBeTruthy();
  } finally {
    await view.unmountAsync();
    await act(async () => Dimensions.set({ window, screen: screenSize }));
  }
});

test('unknown card heading fields fall back to the first column and no-column rows remain identifiable', async () => {
  const { rerenderAsync } = await renderAsync(
    <DataGrid
      {...base}
      rows={rows.slice(0, 1)}
      nativeLayout="cards"
      nativeCardTitleField="missing"
    />,
  );
  expect(screen.getAllByText('Alpha')).toHaveLength(1);
  await rerenderAsync(
    <DataGrid {...base} rows={rows.slice(0, 1)} columns={[]} nativeLayout="cards" />,
  );
  expect(screen.getByText('Row a')).toBeTruthy();
});

test('memoized processing reflects changed rows, columns and filters', async () => {
  const filter = { items: [{ field: 'amount', operator: '>' as const, value: 15 }] };
  const { rerenderAsync } = await renderAsync(
    <DataGrid {...base} nativeLayout="cards" filterModel={filter} />,
  );
  expect(screen.getByText('Alpha')).toBeTruthy();
  const changedRows = rows.map((row) => (row.uuid === 'a' ? { ...row, amount: 5 } : row));
  await rerenderAsync(
    <DataGrid {...base} rows={changedRows} nativeLayout="cards" filterModel={filter} />,
  );
  expect(screen.queryByText('Alpha')).toBeNull();
  const changedColumns: typeof columns = [
    columns[0],
    { ...columns[1], valueGetter: (value) => Number(value) * 2 },
  ];
  await rerenderAsync(
    <DataGrid
      {...base}
      rows={changedRows}
      columns={changedColumns}
      nativeLayout="cards"
      filterModel={filter}
    />,
  );
  expect(screen.getByText('Beta')).toBeTruthy();
  expect(screen.getByText('$20')).toBeTruthy();
  await rerenderAsync(
    <DataGrid
      {...base}
      rows={changedRows}
      columns={changedColumns}
      nativeLayout="cards"
      filterModel={{ items: [{ field: 'amount', operator: '<', value: 15 }] }}
    />,
  );
  expect(screen.getByText('Alpha')).toBeTruthy();
  expect(screen.queryByText('Beta')).toBeNull();
});
