import React, { useMemo } from 'react';
import { View, ScrollView, Pressable } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import {
  Typography,
  Checkbox,
  Button,
  Stack,
  CircularProgress,
  useControlled,
} from '@altroo/mui-native';
import { useTheme, useSx, type SxProps } from '@altroo/mui-native-system';
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
export interface DataGridProps<R extends GridValidRowModel = GridValidRowModel> {
  rows: readonly R[];
  columns: readonly GridColDef<R>[];
  getRowId?: (row: R) => GridRowId;
  height?: number;
  rowHeight?: number;
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
export function DataGrid<R extends GridValidRowModel>({
  rows,
  columns,
  getRowId = idOf,
  height = 420,
  rowHeight = 52,
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
  const [sort, setSort] = useControlled(sortModel, initialState?.sorting?.sortModel ?? []);
  const [pagination, setPagination] = useControlled(
    paginationModel,
    initialState?.pagination?.paginationModel ?? { page: 0, pageSize: 100 },
  );
  const [selection, setSelection] = useControlled(rowSelectionModel, {
    type: 'include',
    ids: new Set(),
  } as GridRowSelectionModel);
  if (pagination.pageSize < 1 || pagination.pageSize > 100)
    throw new Error('Community pageSize must be between 1 and 100.');
  const processed = useMemo(
    () =>
      processRows(
        rows,
        columns,
        sortingMode === 'client' ? sort : [],
        filterMode === 'client'
          ? (filterModel ?? initialState?.filter?.filterModel ?? { items: [] })
          : { items: [] },
        getRowId,
      ),
    [rows, columns, sort, filterModel, initialState, sortingMode, filterMode, getRowId],
  );
  const visible =
    paginationMode === 'client'
      ? processed.slice(
          pagination.page * pagination.pageSize,
          (pagination.page + 1) * pagination.pageSize,
        )
      : processed;
  const total = paginationMode === 'client' ? processed.length : (rowCount ?? processed.length);
  const contentWidth = columns.reduce(
    (sum, c) => sum + (c.width ?? 100),
    checkboxSelection ? 44 : 0,
  );
  return (
    <View
      style={[
        { height, borderWidth: 1, borderColor: theme.palette.divider, borderRadius: 4 },
        style,
      ]}
    >
      {loading ? (
        <CircularProgress aria-label="Loading rows" />
      ) : (
        <ScrollView horizontal style={{ flex: 1 }}>
          <View style={{ width: contentWidth, height: height - 60 }}>
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
                  accessibilityRole="button"
                  accessibilityLabel={`Sort ${column.headerName ?? column.field}`}
                  style={{
                    width: column.width ?? 100,
                    justifyContent: 'center',
                    paddingHorizontal: 12,
                  }}
                  onPress={() => {
                    const current = sort[0]?.field === column.field ? sort[0].sort : null;
                    const next: GridSortModel =
                      current === 'desc'
                        ? []
                        : [{ field: column.field, sort: current === 'asc' ? 'desc' : 'asc' }];
                    setSort(next);
                    onSortModelChange?.(next);
                  }}
                >
                  <Typography variant="subtitle2">
                    {column.headerName ?? column.field}
                    {sort[0]?.field === column.field ? (sort[0].sort === 'asc' ? ' ↑' : ' ↓') : ''}
                  </Typography>
                </Pressable>
              ))}
            </View>
            <FlashList
              data={visible}
              keyExtractor={(row) => String(getRowId(row))}
              renderItem={({ item: row }) => {
                const id = getRowId(row);
                const checked =
                  selection.type === 'include' ? selection.ids.has(id) : !selection.ids.has(id);
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
                      <Checkbox
                        checked={checked}
                        aria-label={`Select row ${id}`}
                        onChange={(_, next) => {
                          const ids = new Set(selection.ids);
                          if (next === (selection.type === 'include')) ids.add(id);
                          else ids.delete(id);
                          const model = { ...selection, ids };
                          setSelection(model);
                          onRowSelectionModelChange?.(model);
                        }}
                      />
                    ) : null}
                    {columns.map((column) => {
                      const value = gridValue(row, column);
                      return (
                        <View
                          key={column.field}
                          style={{
                            width: column.width ?? 100,
                            justifyContent: 'center',
                            paddingHorizontal: 12,
                          }}
                        >
                          {column.renderCell ? (
                            column.renderCell({ id, row, field: column.field, value })
                          ) : (
                            <Typography noWrap>
                              {column.valueFormatter
                                ? column.valueFormatter(value, row, column)
                                : String(value ?? '')}
                            </Typography>
                          )}
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
        style={{ height: 60, justifyContent: 'flex-end', alignItems: 'center' }}
      >
        <Typography>
          {Math.min(total, pagination.page * pagination.pageSize + 1)}-
          {Math.min(total, (pagination.page + 1) * pagination.pageSize)} of {total}
        </Typography>
        <Button
          aria-label="Previous page"
          disabled={pagination.page === 0}
          onClick={() => {
            const next = { ...pagination, page: pagination.page - 1 };
            setPagination(next);
            onPaginationModelChange?.(next);
          }}
        >
          ‹
        </Button>
        <Button
          aria-label="Next page"
          disabled={(pagination.page + 1) * pagination.pageSize >= total}
          onClick={() => {
            const next = { ...pagination, page: pagination.page + 1 };
            setPagination(next);
            onPaginationModelChange?.(next);
          }}
        >
          ›
        </Button>
      </Stack>
    </View>
  );
}
