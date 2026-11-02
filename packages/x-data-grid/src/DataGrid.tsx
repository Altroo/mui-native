import React, { useMemo, useState } from 'react';
import { View, ScrollView, Pressable, useWindowDimensions } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import {
  Typography,
  Checkbox,
  IconButton,
  Paper,
  Stack,
  CircularProgress,
  useControlled,
} from '@altroo/mui-native';
import { useTheme, useSx, type SxProps } from '@altroo/mui-native/styles';
import {
  processRows,
  gridValue,
  type GridValidRowModel,
  type GridColDef,
  type GridRowId,
  type GridSortModel,
  type GridRowSelectionModel,
  type GridFilterModel,
  type GridPaginationModel,
} from './model';
export type NativeGridLayout = 'table' | 'cards' | 'auto';
export interface NativeGridCardParams<R extends GridValidRowModel = GridValidRowModel> {
  id: GridRowId;
  row: R;
  selected: boolean;
  /** The grid-owned checkbox, or null when checkboxSelection is disabled. */
  selectionControl: React.ReactNode;
  /** Uses the same valueGetter, valueFormatter and renderCell as the table. */
  renderCell: (field: string) => React.ReactNode;
}
export interface DataGridProps<R extends GridValidRowModel = GridValidRowModel> {
  rows: readonly R[];
  columns: readonly GridColDef<R>[];
  getRowId?: (row: R) => GridRowId;
  height?: number;
  rowHeight?: number;
  /** Native extension. Auto uses cards below 600 dp of available grid width. */
  nativeLayout?: NativeGridLayout;
  /** Native extension. Card heading field; defaults to the first column. */
  nativeCardTitleField?: string;
  /** Native extension. Compose card content inside the grid's shared card surface. */
  nativeRenderCard?: (params: NativeGridCardParams<R>) => React.ReactNode;
  sortModel?: GridSortModel;
  onSortModelChange?: (model: GridSortModel) => void;
  filterModel?: GridFilterModel;
  paginationModel?: GridPaginationModel;
  onPaginationModelChange?: (model: GridPaginationModel) => void;
  rowSelectionModel?: GridRowSelectionModel;
  onRowSelectionModelChange?: (model: GridRowSelectionModel) => void;
  checkboxSelection?: boolean;
  loading?: boolean;
  sx?: SxProps;
  paginationMode?: 'client' | 'server';
  sortingMode?: 'client' | 'server';
  filterMode?: 'client' | 'server';
  rowCount?: number;
  initialState?: {
    sorting?: { sortModel: GridSortModel };
    pagination?: { paginationModel: GridPaginationModel };
    filter?: { filterModel: GridFilterModel };
  };
}
const idOf = (row: GridValidRowModel) => row.id as GridRowId;
const rowKey = (id: GridRowId) => `${typeof id}:${String(id)}`;
export function DataGrid<R extends GridValidRowModel>({
  rows,
  columns,
  getRowId = idOf,
  height = 420,
  rowHeight = 52,
  nativeLayout = 'table',
  nativeCardTitleField,
  nativeRenderCard,
  sortModel,
  onSortModelChange,
  filterModel,
  paginationModel,
  onPaginationModelChange,
  rowSelectionModel,
  onRowSelectionModelChange,
  checkboxSelection,
  loading,
  sx,
  initialState,
  paginationMode = 'client',
  sortingMode = 'client',
  filterMode = 'client',
  rowCount,
}: DataGridProps<R>) {
  const theme = useTheme();
  const style = useSx(sx);
  const window = useWindowDimensions();
  const [containerWidth, setContainerWidth] = useState<number | null>(null);
  const cards =
    nativeLayout === 'cards' || (nativeLayout === 'auto' && (containerWidth ?? window.width) < 600);
  const titleColumn = columns.find((column) => column.field === nativeCardTitleField) ?? columns[0];
  const [initialFilter] = useState(() => initialState?.filter?.filterModel ?? { items: [] });
  const activeFilter = filterModel ?? initialFilter;
  const [sort, setSort] = useControlled(sortModel, initialState?.sorting?.sortModel ?? []);
  const [pagination, setPagination] = useControlled(
    paginationModel,
    initialState?.pagination?.paginationModel ?? { page: 0, pageSize: 100 },
  );
  const [selection, setSelection] = useControlled(rowSelectionModel, {
    type: 'include',
    ids: new Set(),
  } as GridRowSelectionModel);
  if (!Number.isInteger(pagination.page) || pagination.page < 0)
    throw new Error('page must be a non-negative integer.');
  if (
    !Number.isInteger(pagination.pageSize) ||
    pagination.pageSize < 1 ||
    pagination.pageSize > 100
  )
    throw new Error('Community pageSize must be an integer between 1 and 100.');
  const processed = useMemo(
    () =>
      processRows(
        rows,
        columns,
        sortingMode === 'client' ? sort : [],
        filterMode === 'client' ? activeFilter : { items: [] },
        getRowId,
      ),
    [rows, columns, sort, activeFilter, sortingMode, filterMode, getRowId],
  );
  const visible = useMemo(
    () =>
      paginationMode === 'client'
        ? processed.slice(
            pagination.page * pagination.pageSize,
            (pagination.page + 1) * pagination.pageSize,
          )
        : processed,
    [processed, paginationMode, pagination.page, pagination.pageSize],
  );
  const total = paginationMode === 'client' ? processed.length : (rowCount ?? processed.length);
  const firstVisible = visible.length
    ? Math.min(total, pagination.page * pagination.pageSize + 1)
    : 0;
  const lastVisible = visible.length
    ? Math.min(total, pagination.page * pagination.pageSize + visible.length)
    : 0;
  const contentWidth = columns.reduce(
    (sum, c) => sum + (c.width ?? 100),
    checkboxSelection ? 44 : 0,
  );
  const cycleSort = (column: GridColDef<R>) => {
    const current = sort[0]?.field === column.field ? sort[0].sort : null;
    const next: GridSortModel =
      current === 'desc' ? [] : [{ field: column.field, sort: current === 'asc' ? 'desc' : 'asc' }];
    setSort(next);
    onSortModelChange?.(next);
  };
  const sortIndicator = (column: GridColDef<R>) =>
    sort[0]?.field === column.field && sort[0].sort ? (sort[0].sort === 'asc' ? ' ↑' : ' ↓') : '';
  const sortDescription = (column: GridColDef<R>) =>
    sort[0]?.field === column.field && sort[0].sort
      ? sort[0].sort === 'asc'
        ? 'Ascending'
        : 'Descending'
      : 'Not sorted';
  const isSelected = (id: GridRowId) =>
    selection.type === 'include' ? selection.ids.has(id) : !selection.ids.has(id);
  const selectRow = (id: GridRowId, next: boolean) => {
    const ids = new Set(selection.ids);
    if (next === (selection.type === 'include')) ids.add(id);
    else ids.delete(id);
    const model = { ...selection, ids };
    setSelection(model);
    onRowSelectionModelChange?.(model);
  };
  const renderContent = (content: React.ReactNode, title = false): React.ReactNode => {
    if (typeof content === 'string' || typeof content === 'number' || typeof content === 'bigint')
      return (
        <Typography
          noWrap={!cards}
          variant={title ? 'subtitle1' : 'body2'}
          style={title ? { fontWeight: '600' } : undefined}
        >
          {typeof content === 'bigint' ? String(content) : content}
        </Typography>
      );
    if (
      Array.isArray(content) ||
      (content && typeof content === 'object' && Symbol.iterator in content)
    )
      return React.Children.map(content, (child) => renderContent(child, title));
    if (
      React.isValidElement<{ children?: React.ReactNode }>(content) &&
      content.type === React.Fragment
    )
      return React.cloneElement(content, undefined, renderContent(content.props.children, title));
    return content;
  };
  const renderValue = (row: R, column: GridColDef<R>, title = false) => {
    const value = gridValue(row, column);
    const content = column.renderCell
      ? column.renderCell({ id: getRowId(row), row, field: column.field, value })
      : column.valueFormatter
        ? column.valueFormatter(value, row, column)
        : String(value ?? '');
    const rendered = renderContent(content, title);
    return column.renderCell ? (
      <React.Fragment key={rowKey(getRowId(row))}>{rendered}</React.Fragment>
    ) : (
      rendered
    );
  };
  const selectionControl = (id: GridRowId) => (
    <Checkbox
      checked={isSelected(id)}
      aria-label={`Select row ${id}`}
      onChange={(_, next) => selectRow(id, next)}
    />
  );
  return (
    <View
      testID="native-data-grid"
      onLayout={(event) => setContainerWidth(event.nativeEvent.layout.width)}
      style={[
        {
          height,
          borderWidth: cards ? 0 : 1,
          borderColor: theme.palette.divider,
          borderRadius: theme.shape.borderRadius,
          overflow: 'hidden',
        },
        style,
      ]}
    >
      {loading ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <CircularProgress aria-label="Loading rows" />
        </View>
      ) : cards ? (
        <View testID="native-grid-cards" style={{ flex: 1 }}>
          {columns.some((column) => column.sortable !== false) ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingBottom: 8 }}>
              <Typography variant="caption" color="text.secondary">
                Sort
              </Typography>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
              >
                <View style={{ flexDirection: 'row', gap: 4 }}>
                  {columns
                    .filter((column) => column.sortable !== false)
                    .map((column) => {
                      const active = sort[0]?.field === column.field && Boolean(sort[0].sort);
                      return (
                        <Pressable
                          key={column.field}
                          accessibilityRole="button"
                          accessibilityLabel={`Sort ${column.headerName ?? column.field}`}
                          accessibilityState={{ selected: active }}
                          accessibilityValue={{ text: sortDescription(column) }}
                          accessibilityHint="Cycles ascending, descending and unsorted"
                          onPress={() => cycleSort(column)}
                          style={({ pressed }) => ({
                            minHeight: 44,
                            paddingHorizontal: 12,
                            justifyContent: 'center',
                            borderRadius: 8,
                            opacity: pressed ? 0.65 : 1,
                            backgroundColor: active ? theme.palette.action.selected : 'transparent',
                          })}
                        >
                          <Typography
                            variant="body2"
                            color={active ? 'primary.main' : 'text.secondary'}
                            style={{ fontWeight: active ? '600' : '400' }}
                          >
                            {column.headerName ?? column.field}
                            {sortIndicator(column)}
                          </Typography>
                        </Pressable>
                      );
                    })}
                </View>
              </ScrollView>
            </View>
          ) : null}
          <FlashList
            data={visible}
            extraData={selection}
            keyExtractor={(row) => rowKey(getRowId(row))}
            keyboardShouldPersistTaps="handled"
            nestedScrollEnabled
            renderItem={({ item: row }) => {
              const id = getRowId(row);
              return (
                <Paper
                  variant="outlined"
                  style={{
                    marginBottom: 12,
                    padding: 16,
                    borderColor: isSelected(id)
                      ? theme.palette.primary.main
                      : theme.palette.divider,
                  }}
                >
                  {nativeRenderCard ? (
                    <React.Fragment key={rowKey(id)}>
                      {renderContent(
                        nativeRenderCard({
                          id,
                          row,
                          selected: isSelected(id),
                          selectionControl: checkboxSelection ? selectionControl(id) : null,
                          renderCell: (field) => {
                            const column = columns.find((candidate) => candidate.field === field);
                            return column ? renderValue(row, column) : null;
                          },
                        }),
                      )}
                    </React.Fragment>
                  ) : (
                    <>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <View style={{ flex: 1, minWidth: 0 }}>
                          {titleColumn ? (
                            renderValue(row, titleColumn, true)
                          ) : (
                            <Typography variant="subtitle1">Row {id}</Typography>
                          )}
                        </View>
                        {checkboxSelection ? selectionControl(id) : null}
                      </View>
                      <View
                        style={{
                          flexDirection: 'row',
                          flexWrap: 'wrap',
                          columnGap: 16,
                          rowGap: 12,
                          marginTop: 8,
                        }}
                      >
                        {columns
                          .filter((column) => column !== titleColumn)
                          .map((column) => (
                            <View
                              key={column.field}
                              style={{ flexGrow: 1, flexBasis: '40%', minWidth: 0, gap: 2 }}
                            >
                              <Typography variant="caption" color="text.secondary">
                                {column.headerName ?? column.field}
                              </Typography>
                              {renderValue(row, column)}
                            </View>
                          ))}
                      </View>
                    </>
                  )}
                </Paper>
              );
            }}
            ListEmptyComponent={<Typography sx={{ p: 2 }}>No rows</Typography>}
          />
        </View>
      ) : (
        <ScrollView
          testID="native-grid-table"
          horizontal
          style={{ flex: 1 }}
          keyboardShouldPersistTaps="handled"
          nestedScrollEnabled
        >
          <View style={{ width: contentWidth, height: height - 56 }}>
            <View
              style={{
                flexDirection: 'row',
                height: rowHeight,
                borderBottomWidth: 1,
                borderColor: theme.palette.divider,
              }}
            >
              {checkboxSelection ? <View style={{ width: 44 }} /> : null}
              {columns.map((column) => (
                <Pressable
                  key={column.field}
                  disabled={column.sortable === false}
                  accessibilityRole={column.sortable === false ? 'header' : 'button'}
                  accessibilityLabel={
                    column.sortable === false
                      ? (column.headerName ?? column.field)
                      : `Sort ${column.headerName ?? column.field}`
                  }
                  accessibilityState={{
                    selected: sort[0]?.field === column.field && Boolean(sort[0].sort),
                  }}
                  accessibilityValue={
                    column.sortable === false ? undefined : { text: sortDescription(column) }
                  }
                  accessibilityHint={
                    column.sortable === false
                      ? undefined
                      : 'Cycles ascending, descending and unsorted'
                  }
                  style={{
                    width: column.width ?? 100,
                    justifyContent: 'center',
                    paddingHorizontal: 12,
                  }}
                  onPress={() => cycleSort(column)}
                >
                  <Typography variant="subtitle2">
                    {column.headerName ?? column.field}
                    {sortIndicator(column)}
                  </Typography>
                </Pressable>
              ))}
            </View>
            <FlashList
              data={visible}
              extraData={selection}
              keyExtractor={(row) => rowKey(getRowId(row))}
              keyboardShouldPersistTaps="handled"
              nestedScrollEnabled
              renderItem={({ item: row }) => {
                const id = getRowId(row);
                return (
                  <View
                    style={{
                      flexDirection: 'row',
                      height: rowHeight,
                      borderBottomWidth: 1,
                      borderColor: theme.palette.divider,
                    }}
                  >
                    {checkboxSelection ? (
                      <View style={{ width: 44, justifyContent: 'center' }}>
                        {selectionControl(id)}
                      </View>
                    ) : null}
                    {columns.map((column) => {
                      return (
                        <View
                          key={column.field}
                          style={{
                            width: column.width ?? 100,
                            justifyContent: 'center',
                            paddingHorizontal: 12,
                          }}
                        >
                          {renderValue(row, column)}
                        </View>
                      );
                    })}
                  </View>
                );
              }}
              ListEmptyComponent={<Typography sx={{ p: 2 }}>No rows</Typography>}
            />
          </View>
        </ScrollView>
      )}
      <Stack
        direction="row"
        style={{
          height: 56,
          paddingHorizontal: 8,
          gap: 4,
          justifyContent: 'flex-end',
          alignItems: 'center',
          borderTopWidth: 1,
          borderColor: theme.palette.divider,
        }}
      >
        <Typography variant="caption" color="text.secondary" style={{ flex: 1, marginEnd: 8 }}>
          {firstVisible}-{lastVisible} of {total}
        </Typography>
        <IconButton
          style={{ alignSelf: 'center', flexShrink: 0 }}
          aria-label="Previous page"
          disabled={pagination.page === 0}
          onClick={() => {
            const next = { ...pagination, page: pagination.page - 1 };
            setPagination(next);
            onPaginationModelChange?.(next);
          }}
        >
          ‹
        </IconButton>
        <IconButton
          style={{ alignSelf: 'center', flexShrink: 0 }}
          aria-label="Next page"
          disabled={(pagination.page + 1) * pagination.pageSize >= total}
          onClick={() => {
            const next = { ...pagination, page: pagination.page + 1 };
            setPagination(next);
            onPaginationModelChange?.(next);
          }}
        >
          ›
        </IconButton>
      </Stack>
    </View>
  );
}
