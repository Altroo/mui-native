# Native grid layouts

`DataGrid` keeps the same rows, columns, sorting, filtering, pagination and selection models across its native presentations. Both use FlashList recycling. Layout and selection changes do not rerun the whole dataset's sorting/filtering pass.

| Native extension       | Behavior                                                                                                                       |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| `nativeLayout="table"` | Default. Fixed-width table with horizontal scrolling.                                                                          |
| `nativeLayout="cards"` | Cards at every container width.                                                                                                |
| `nativeLayout="auto"`  | Cards below 600 dp of measured grid width, table at 600 dp and above. Uses window width until the first container measurement. |
| `nativeCardTitleField` | Heading field for the default card. Defaults to the first column; an unknown field also falls back to the first column.        |
| `nativeRenderCard`     | Optional callback that composes content inside the shared card surface. Table rendering is unaffected.                         |

These are independent native presentation extensions, not upstream MUI props or a claim of Pro/Premium feature parity. Keep them in a native platform file, or supply them only to the native implementation. The web resolver continues to use original MUI.

```tsx
import { DataGrid } from '@altroo/mui-native-x-data-grid';

<DataGrid
  rows={rows}
  columns={columns}
  nativeLayout="auto"
  nativeCardTitleField="client"
  checkboxSelection
  height={500}
/>;
```

The default card emphasizes its heading once and presents remaining columns as compact labeled values. It preserves `valueGetter`, `valueFormatter` and `renderCell`. A card's height grows with its content.

## Compose cards for your data

Use the application theme and a stable renderer. Keep important information visible, use status text as well as color, and retain the provided checkbox when selection is enabled. Avoid placing independent actions inside one large press target.

```tsx
import { View } from 'react-native';
import { Typography } from '@altroo/mui-native';
import type { NativeGridCardParams } from '@altroo/mui-native-x-data-grid';

type Invoice = { id: number; client: string; amount: number };

function renderInvoice({ row, selectionControl, renderCell }: NativeGridCardParams<Invoice>) {
  return (
    <View style={{ gap: 12 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <Typography variant="subtitle1" style={{ flex: 1 }}>
          {row.client}
        </Typography>
        {selectionControl}
      </View>
      {renderCell('amount')}
    </View>
  );
}

<DataGrid
  rows={rows}
  columns={columns}
  checkboxSelection
  nativeLayout="auto"
  nativeRenderCard={renderInvoice}
/>;
```

String/number card output, arrays and fragments receive native text wrappers; application-owned element trees retain their own rendering responsibility.

The callback receives `id`, `row`, `selected`, `selectionControl`, and `renderCell(field)`. `selectionControl` is null when `checkboxSelection` is disabled. `renderCell` uses the existing column definition and returns null for an unknown field. The grid owns the surface, border and padding; the application owns the information hierarchy inside it. See the catalog's `InvoiceGrid.tsx` for an example with fictional invoice data, status, amounts, client search and a layout selector.

FlashList recycles row holders. Custom card and cell content is keyed by the row's typed ID, so component-local state stays with the same row during ordinary updates and resets when a holder moves to another row. Keep drafts or other state that must survive offscreen recycling in application state keyed by `GridRowId`; local component state is not persistent storage. Grid-owned selection and pagination remain separate from this content lifecycle.

Controlled models remain application-owned in both layouts. Server sorting/filtering/pagination are still server responsibilities. When a search changes the result set, reset a controlled pagination model to page zero, as the catalog does. Layout changes preserve model state; scroll offset preservation is not promised. Pages must be non-negative integers and page sizes must be integers from 1 through 100. An empty controlled page displays `0-0 of total` without changing the supplied page; a partially supplied server page counts only its available rows.

Sort controls expose their current ascending/descending/unsorted direction as an accessibility value. Grid scroll layers preserve handled keyboard taps. The catalog uses a bounded grid inside a stable screen-level scroller when controls plus the minimum grid height exceed the viewport. This allows controls to scroll away in short windows and resets the outer offset when space returns, while preserving grid models. Native nested-scroll and keyboard behavior still require device checks.

## Validation boundaries

Regression tests cover layout changes, custom cards, model preservation, server models, empty/loading states, formatted values, and avoiding dataset reprocessing on layout or selection updates. Earlier iPhone development-preview observations are recorded separately in [validation](validation.md); they do not verify the exact delivered revision after subsequent theme/layout changes. Native interaction and visual checks of this increment, large text, RTL, focus navigation and release performance remain open gates. See the [performance contract](performance.md).
