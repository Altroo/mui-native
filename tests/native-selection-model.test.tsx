import React from 'react';
import reference from './fixtures/mui-native-select-browser-9.5.0.json';
import {
  nativeOptionModels,
  reconcileNativeSelection,
  nativeSelectionValue,
  nativeSelectionProposal,
  type NativeSelectionState,
} from '../packages/material/src/nativeSelectionModel';
function children(items: any[]): React.ReactNode {
  return items.map((item) =>
    item.options
      ? React.createElement(
          'optgroup',
          { key: item.id, label: item.label, disabled: item.disabled },
          children(item.options),
        )
      : React.createElement(
          'option',
          {
            key: item.id,
            value: item.value,
            label: item.label,
            disabled: item.disabled,
            selected: item.selected,
            'data-case': item.id,
          },
          item.text,
        ),
  );
}
function snapshot(state: NativeSelectionState) {
  const options = state.options.map((option) => ({
    id: option.element.props['data-case'],
    value: option.value,
    label: option.label,
    text: option.text,
    selected: state.selectedKeys.includes(option.key),
    disabled: option.disabled,
    groupDisabled: option.groupDisabled,
  }));
  return {
    value: nativeSelectionValue(state),
    selectedIndex: options.findIndex((option) => option.selected),
    multiple: state.multiple,
    options,
  };
}
function hostProps(test: any, props: any) {
  return {
    ...props,
    ...props.inputProps,
    multiple: test.component ? props.multiple : props.inputProps?.multiple,
  };
}
for (const fixture of reference.fixtures)
  test('original native select model: ' + fixture.input.name, () => {
    const input: any = fixture.input;
    let props: any = { ...input.props },
      items = input.options;
    let state = reconcileNativeSelection(
      undefined,
      nativeOptionModels(children(items)),
      hostProps(input, props),
    );
    const states = [snapshot(state)],
      trace: any[] = [];
    for (const action of input.actions ?? []) {
      if (action.props) {
        const { $remove, ...next } = action.props;
        props = { ...props, ...next };
        for (const name of $remove ?? []) delete props[name];
      }
      if (action.options) items = action.options;
      if (action.props || action.options)
        state = reconcileNativeSelection(
          state,
          nativeOptionModels(children(items)),
          hostProps(input, props),
        );
      if (action.change) {
        const proposal = {
          ...state,
          selectedKeys: state.options
            .filter((option) => action.change.includes(option.element.props['data-case']))
            .map((option) => option.key),
        };
        trace.push({
          value: nativeSelectionValue(proposal),
          name: props.name ?? '',
          selected: proposal.options
            .filter((option) => proposal.selectedKeys.includes(option.key))
            .map((option) => option.element.props['data-case']),
          current: true,
          child: 'undefined',
        });
        state = reconcileNativeSelection(proposal, proposal.options, hostProps(input, props));
      }
      states.push(snapshot(state));
    }
    expect({ states, trace }).toEqual({ states: fixture.states, trace: fixture.trace });
  });
test('native requests reject disabled groups and toggle only the actual duplicate option', () => {
  const options = nativeOptionModels(
    <>
      <optgroup label="Disabled" disabled>
        <option value="same">Blocked</option>
      </optgroup>
      <option value="same">Allowed</option>
    </>,
  );
  const state = reconcileNativeSelection(undefined, options, { multiple: true });
  expect(nativeSelectionProposal(state, options[0].key, true)).toBeNull();
  const next = nativeSelectionProposal(state, options[1].key, true)!;
  expect(next.selectedKeys).toEqual([options[1].key]);
  expect(nativeSelectionValue(next)).toBe('same');
});
