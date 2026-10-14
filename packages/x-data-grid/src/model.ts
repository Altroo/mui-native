export type GridRowId = string | number;
export type GridValidRowModel = Record<string, unknown>;
export interface GridColDef<R extends GridValidRowModel = GridValidRowModel> {
  field: string;
  headerName?: string;
  width?: number;
  sortable?: boolean;
  type?: 'string' | 'number' | 'boolean' | 'date';
  valueGetter?: (value: unknown, row: R, column: GridColDef<R>) => unknown;
  valueFormatter?: (value: unknown, row: R, column: GridColDef<R>) => string;
  renderCell?: (params: {
    id: GridRowId;
    row: R;
    field: string;
    value: unknown;
  }) => import('react').ReactNode;
}
export type GridSortModel = Array<{ field: string; sort: 'asc' | 'desc' | null }>;
export type GridRowSelectionModel = { type: 'include' | 'exclude'; ids: Set<GridRowId> };
export interface GridFilterModel {
  items: Array<{
    id?: string | number;
    field: string;
    operator:
      | 'contains'
      | 'equals'
      | 'startsWith'
      | 'endsWith'
      | 'isEmpty'
      | 'isNotEmpty'
      | '='
      | '>'
      | '<'
      | '>='
      | '<=';
    value?: unknown;
  }>;
}
export interface GridPaginationModel {
  page: number;
  pageSize: number;
}
export function gridValue<R extends GridValidRowModel>(row: R, column: GridColDef<R>) {
  return column.valueGetter
    ? column.valueGetter(row[column.field], row, column)
    : row[column.field];
}
export function processRows<R extends GridValidRowModel>(
  rows: readonly R[],
  columns: readonly GridColDef<R>[],
  sort: GridSortModel,
  filter: GridFilterModel,
  getRowId: (row: R) => GridRowId,
) {
  const seen = new Set<GridRowId>();
  for (const row of rows) {
    const id = getRowId(row);
    if ((typeof id !== 'string' && typeof id !== 'number') || seen.has(id))
      throw new Error(`Rows require unique ids; received ${String(id)}`);
    seen.add(id);
  }
  if (sort.length > 1 || filter.items.length > 1)
    throw new Error('Only Community single-column sorting and filtering are supported.');
  let result = [...rows];
  const item = filter.items[0];
  if (item) {
    const column = columns.find((c) => c.field === item.field);
    if (!column) throw new Error(`Unknown filter column ${item.field}`);
    result = result.filter((row) => {
      const raw = gridValue(row, column);
      const text = String(raw ?? '').toLocaleLowerCase();
      const value = String(item.value ?? '').toLocaleLowerCase();
      switch (item.operator) {
        case 'contains':
          return text.includes(value);
        case 'equals':
          return text === value;
        case 'startsWith':
          return text.startsWith(value);
        case 'endsWith':
          return text.endsWith(value);
        case 'isEmpty':
          return raw == null || raw === '';
        case 'isNotEmpty':
          return raw != null && raw !== '';
        case '=':
          return Number(raw) === Number(item.value);
        case '>':
          return Number(raw) > Number(item.value);
        case '<':
          return Number(raw) < Number(item.value);
        case '>=':
          return Number(raw) >= Number(item.value);
        case '<=':
          return Number(raw) <= Number(item.value);
        default:
          throw new Error('Unsupported filter operator');
      }
    });
  }
  const ordering = sort[0];
  if (ordering?.sort) {
    const column = columns.find((c) => c.field === ordering.field);
    if (!column) throw new Error(`Unknown sort column ${ordering.field}`);
    const direction = ordering.sort === 'asc' ? 1 : -1;
    result.sort((a, b) => {
      const x = gridValue(a, column);
      const y = gridValue(b, column);
      if (x == null) return y == null ? 0 : -direction;
      if (y == null) return direction;
      return (
        direction *
        (typeof x === 'number' && typeof y === 'number'
          ? x - y
          : x instanceof Date && y instanceof Date
            ? x.getTime() - y.getTime()
            : String(x).localeCompare(String(y)))
      );
    });
  }
  return result;
}
