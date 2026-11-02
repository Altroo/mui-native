import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, View, type ScrollViewInstance } from 'react-native';
import { Typography, TextField, useTheme } from '@mui/material';
import {
  DataGrid,
  type GridColDef,
  type GridFilterModel,
  type GridRowSelectionModel,
  type NativeGridCardParams,
  type NativeGridLayout,
} from '@mui/x-data-grid';

const clients = [
  'Atelier Atlas',
  'Maison Rive',
  'Studio Palm',
  'Les Jardins',
  'Comptoir Nord',
  'Dar Kora',
];
const statuses = ['Unpaid', 'Paid', 'Overdue'] as const;
type Invoice = {
  id: number;
  reference: string;
  client: string;
  amount: number;
  due: string;
  status: (typeof statuses)[number];
};
// Fictional, deterministic fixtures. No customer data is read from Facturation.
const rows: Invoice[] = Array.from({ length: 10000 }, (_, index) => ({
  id: index + 1,
  reference: `INV-${String(1042 + index).padStart(5, '0')}`,
  client: clients[index % clients.length],
  amount: 12480 + ((index * 7327) % 80000) / 10,
  due: `${String(2 + (index % 27)).padStart(2, '0')} Nov 2026`,
  status: statuses[index % statuses.length],
}));
const money = (value: number) =>
  `${value.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} MAD`;

function InvoiceStatus({ status }: { status: Invoice['status'] }) {
  const dark = useTheme().palette.mode === 'dark';
  const tones = {
    Paid: dark ? ['#b0ead0', '#213e35'] : ['#14734e', '#ecf8f1'],
    Unpaid: dark ? ['#d5deeb', '#344155'] : ['#526179', '#f1f5f9'],
    Overdue: dark ? ['#ffc7b9', '#4c302e'] : ['#a63c26', '#fff0eb'],
  };
  const [color, backgroundColor] = tones[status];
  return (
    <View
      style={{
        backgroundColor,
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 6,
        alignSelf: 'flex-start',
      }}
    >
      <Typography variant="caption" style={{ color, fontWeight: '600' }}>
        {status}
      </Typography>
    </View>
  );
}
const columns: GridColDef<Invoice>[] = [
  { field: 'reference', headerName: 'Invoice', width: 140 },
  { field: 'client', headerName: 'Client', width: 180 },
  {
    field: 'amount',
    headerName: 'Amount',
    width: 170,
    type: 'number',
    valueFormatter: (value) => money(Number(value)),
  },
  {
    field: 'status',
    headerName: 'Status',
    width: 110,
    renderCell: ({ row }) => <InvoiceStatus status={row.status} />,
  },
  { field: 'due', headerName: 'Due date', width: 130, sortable: false },
];
function InvoiceCard({ row, selectionControl, renderCell }: NativeGridCardParams<Invoice>) {
  const theme = useTheme();
  return (
    <View style={{ gap: 8 }}>
      <View
        style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: -8, marginEnd: -8 }}
      >
        <Typography variant="caption" color="text.secondary" style={{ flex: 1, fontWeight: '500' }}>
          {row.reference}
        </Typography>
        <View>{renderCell('status')}</View>
        {selectionControl}
      </View>
      <Typography variant="subtitle1" style={{ marginTop: -6 }}>
        {row.client}
      </Typography>
      <View
        style={{
          flexDirection: 'row',
          flexWrap: 'wrap',
          alignItems: 'flex-end',
          gap: 8,
          paddingTop: 10,
          borderTopWidth: 1,
          borderColor: theme.palette.divider,
        }}
      >
        <Typography variant="caption" color="text.secondary" style={{ flexGrow: 1 }}>
          Due {row.due}
        </Typography>
        <Typography variant="subtitle1" style={{ fontVariant: ['tabular-nums'] }}>
          {money(row.amount)}
        </Typography>
      </View>
    </View>
  );
}
const renderInvoiceCard = (params: NativeGridCardParams<Invoice>) => <InvoiceCard {...params} />;

export function InvoiceGrid() {
  const theme = useTheme();
  const [layout, setLayout] = useState<NativeGridLayout>('auto');
  const [viewportHeight, setViewportHeight] = useState(420);
  const [headerHeight, setHeaderHeight] = useState(0);
  const [searchHeight, setSearchHeight] = useState(0);
  const viewportRef = useRef<ScrollViewInstance>(null);
  const [search, setSearch] = useState('');
  const [pagination, setPagination] = useState({ page: 0, pageSize: 25 });
  const [selection, setSelection] = useState<GridRowSelectionModel>({
    type: 'include',
    ids: new Set(),
  });
  const filter = useMemo<GridFilterModel>(
    () => ({
      items: search.trim() ? [{ field: 'client', operator: 'contains', value: search.trim() }] : [],
    }),
    [search],
  );
  const controlsHeight = headerHeight + searchHeight;
  const height = Math.max(160, viewportHeight - controlsHeight);
  const overflow = controlsHeight + 160 > viewportHeight;
  useEffect(() => {
    if (!overflow) viewportRef.current?.scrollTo({ y: 0, animated: false });
  }, [overflow]);
  return (
    <ScrollView
      ref={viewportRef}
      testID="invoice-grid-viewport"
      style={{ flex: 1 }}
      contentContainerStyle={{ minHeight: viewportHeight }}
      scrollEnabled={overflow}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
      nestedScrollEnabled
      onLayout={(event) => setViewportHeight(Math.max(0, event.nativeEvent.layout.height))}
    >
      <View
        testID="invoice-grid-header"
        style={{ paddingBottom: 12, gap: 4 }}
        onLayout={(event) => setHeaderHeight(event.nativeEvent.layout.height)}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Typography variant="h5" style={{ flex: 1 }}>
            Invoices
          </Typography>
          <View
            accessibilityRole="tablist"
            style={{
              width: 180,
              flexDirection: 'row',
              padding: 3,
              borderRadius: 12,
              backgroundColor: theme.palette.mode === 'dark' ? '#1a2332' : '#e9edf1',
            }}
          >
            {(['auto', 'cards', 'table'] as const).map((value) => (
              <Pressable
                key={value}
                accessibilityRole="tab"
                accessibilityLabel={`${value[0].toUpperCase()}${value.slice(1)} layout`}
                accessibilityState={{ selected: layout === value }}
                onPress={() => setLayout(value)}
                style={({ pressed }) => ({
                  flex: 1,
                  minHeight: 44,
                  justifyContent: 'center',
                  alignItems: 'center',
                  borderRadius: 9,
                  opacity: pressed ? 0.65 : 1,
                  backgroundColor:
                    layout === value ? theme.palette.background.paper : 'transparent',
                })}
              >
                <Typography
                  variant="body2"
                  color={layout === value ? 'text.primary' : 'text.secondary'}
                  style={{ fontWeight: layout === value ? '600' : '400' }}
                >
                  {value[0].toUpperCase()}
                  {value.slice(1)}
                </Typography>
              </Pressable>
            ))}
          </View>
        </View>
        <Typography accessibilityLiveRegion="polite" variant="caption" color="text.secondary">
          10,000 sample invoices{selection.ids.size ? ` · ${selection.ids.size} selected` : ''}
        </Typography>
      </View>
      <View
        testID="invoice-grid-search"
        onLayout={(event) => setSearchHeight(event.nativeEvent.layout.height)}
      >
        <TextField
          placeholder="Search clients"
          value={search}
          onChange={(event) => {
            setSearch(event.target.value);
            setPagination((previous) => ({ ...previous, page: 0 }));
          }}
          slotProps={{
            htmlInput: {
              accessibilityLabel: 'Search clients',
              autoCorrect: false,
              returnKeyType: 'search',
            },
          }}
          fullWidth
          size="small"
          sx={{ mb: 1 }}
        />
      </View>
      <View style={{ height }}>
        <DataGrid
          rows={rows}
          columns={columns}
          height={height}
          nativeLayout={layout}
          nativeCardTitleField="client"
          nativeRenderCard={renderInvoiceCard}
          checkboxSelection
          paginationModel={pagination}
          onPaginationModelChange={setPagination}
          rowSelectionModel={selection}
          onRowSelectionModelChange={setSelection}
          filterModel={filter}
        />
      </View>
    </ScrollView>
  );
}
