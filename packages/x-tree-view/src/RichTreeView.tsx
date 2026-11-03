import { useMemo } from 'react';
import { FlatList, Pressable, View, type GestureResponderEvent } from 'react-native';
import { Typography, useControlled } from '@altroo/mui-native';
import { useSx, type SxProps } from '@altroo/mui-native/styles';
export interface TreeViewBaseItem {
  id: string;
  label: string;
  children?: TreeViewBaseItem[];
  disabled?: boolean;
}
export type TreeSelection<Multiple extends boolean> = Multiple extends true
  ? string[]
  : string | null;
export interface RichTreeViewProps<
  R extends object = TreeViewBaseItem,
  Multiple extends boolean = false,
> {
  items: readonly R[];
  getItemId?: (item: R) => string;
  getItemLabel?: (item: R) => string;
  getItemChildren?: (item: R) => readonly R[];
  isItemDisabled?: (item: R) => boolean;
  expandedItems?: string[];
  defaultExpandedItems?: string[];
  onExpandedItemsChange?: (event: GestureResponderEvent | null, itemIds: string[]) => void;
  selectedItems?: TreeSelection<Multiple>;
  defaultSelectedItems?: TreeSelection<Multiple>;
  onSelectedItemsChange?: (
    event: GestureResponderEvent | null,
    itemIds: TreeSelection<Multiple>,
  ) => void;
  onItemClick?: (event: GestureResponderEvent, itemId: string) => void;
  multiSelect?: Multiple;
  disableSelection?: boolean;
  sx?: SxProps;
  height?: number;
}
export function flattenTree<R>(
  items: readonly R[],
  expanded: ReadonlySet<string>,
  id: (item: R) => string,
  children: (item: R) => readonly R[],
) {
  const seen = new Set<string>();
  const visible: Array<{ item: R; id: string; depth: number; hasChildren: boolean }> = [];
  function visit(list: readonly R[], depth: number, show: boolean) {
    for (const item of list) {
      const key = id(item);
      if (!key || seen.has(key)) throw new Error(`Duplicate or missing tree id: ${key}`);
      seen.add(key);
      const nested = children(item);
      if (show) visible.push({ item, id: key, depth, hasChildren: nested.length > 0 });
      visit(nested, depth + 1, show && expanded.has(key));
    }
  }
  visit(items, 0, true);
  return visible;
}
const defaultId = (item: object) => (item as TreeViewBaseItem).id;
const defaultLabel = (item: object) => (item as TreeViewBaseItem).label;
const defaultChildren = (item: object) => (item as TreeViewBaseItem).children ?? [];
export function RichTreeView<
  R extends object = TreeViewBaseItem,
  Multiple extends boolean = false,
>({
  items,
  getItemId = defaultId,
  getItemLabel = defaultLabel,
  getItemChildren = defaultChildren as unknown as (item: R) => readonly R[],
  isItemDisabled,
  expandedItems,
  defaultExpandedItems = [],
  onExpandedItemsChange,
  selectedItems,
  defaultSelectedItems,
  onSelectedItemsChange,
  onItemClick,
  multiSelect,
  disableSelection,
  sx,
  height = 320,
}: RichTreeViewProps<R, Multiple>) {
  const [expanded, setExpanded] = useControlled(expandedItems, defaultExpandedItems);
  const [selection, setSelection] = useControlled(
    selectedItems,
    (defaultSelectedItems ?? (multiSelect ? [] : null)) as TreeSelection<Multiple>,
  );
  const rows = useMemo(
    () => flattenTree(items, new Set(expanded), getItemId, getItemChildren),
    [items, expanded, getItemId, getItemChildren],
  );
  const style = useSx(sx);
  const selected = new Set(Array.isArray(selection) ? selection : selection ? [selection] : []);
  return (
    <FlatList
      style={[{ height }, style]}
      data={rows}
      keyExtractor={(row) => row.id}
      accessibilityRole="list"
      renderItem={({ item: row }) => {
        const disabled = isItemDisabled?.(row.item) ?? (row.item as TreeViewBaseItem).disabled;
        const label = getItemLabel(row.item);
        return (
          <View style={{ flexDirection: 'row', paddingLeft: row.depth * 20, alignItems: 'center' }}>
            {row.hasChildren ? (
              <Pressable
                disabled={disabled}
                accessibilityRole="button"
                accessibilityLabel={`${expanded.includes(row.id) ? 'Collapse' : 'Expand'} ${label}`}
                accessibilityState={{ expanded: expanded.includes(row.id), disabled }}
                style={{ width: 44, height: 44, justifyContent: 'center', alignItems: 'center' }}
                onPress={(event) => {
                  const next = expanded.includes(row.id)
                    ? expanded.filter((id) => id !== row.id)
                    : [...expanded, row.id];
                  setExpanded(next);
                  onExpandedItemsChange?.(event, next);
                }}
              >
                <Typography>{expanded.includes(row.id) ? '▾' : '▸'}</Typography>
              </Pressable>
            ) : (
              <View style={{ width: 44 }} />
            )}
            <Pressable
              disabled={disabled}
              accessibilityRole="button"
              accessibilityLabel={label}
              accessibilityState={{ selected: selected.has(row.id), disabled }}
              style={{
                flex: 1,
                minHeight: 44,
                justifyContent: 'center',
                opacity: disabled ? 0.4 : 1,
              }}
              onPress={(event) => {
                onItemClick?.(event, row.id);
                if (disableSelection) return;
                const next = (
                  multiSelect
                    ? selected.has(row.id)
                      ? [...selected].filter((id) => id !== row.id)
                      : [...selected, row.id]
                    : row.id
                ) as TreeSelection<Multiple>;
                setSelection(next);
                onSelectedItemsChange?.(event, next);
              }}
            >
              <Typography color={selected.has(row.id) ? 'primary.main' : 'text.primary'}>
                {label}
              </Typography>
            </Pressable>
          </View>
        );
      }}
    />
  );
}
