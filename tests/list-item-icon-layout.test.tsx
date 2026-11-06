// Copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT
import { render } from '@testing-library/react-native';
import Svg from 'react-native-svg';
import { ListItemIcon } from '../packages/material/src';
import Check from '../packages/icons/src/Check';
import reference from './fixtures/mui-list-item-icon-9.5.0.json';
test('the original inline-flex default lays out two vector children in a row', () => {
  const original = reference.fixtures.find((entry) => entry.input.name === 'unscoped');
  expect(original?.declarations.display).toBe('inline-flex');
  const tree = render(
    <ListItemIcon testID="row">
      <Check />
      <Check />
    </ListItemIcon>,
  );
  expect(tree.UNSAFE_getAllByType(Svg)).toHaveLength(2);
  expect(tree.getByTestId('row')).toHaveStyle({ flexDirection: 'row' });
});
test.each(['sx', 'style'] as const)(
  'authored %s can explicitly request a column for multiple children',
  (key) => {
    const style = { flexDirection: 'column' as const };
    const props = key === 'sx' ? { sx: style } : { style };
    const tree = render(
      <ListItemIcon testID="column" {...props}>
        <Check />
        <Check />
      </ListItemIcon>,
    );
    expect(tree.UNSAFE_getAllByType(Svg)).toHaveLength(2);
    expect(tree.getByTestId('column')).toHaveStyle({ flexDirection: 'column' });
  },
);
