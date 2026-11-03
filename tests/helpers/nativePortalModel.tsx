import React from 'react';
import { act } from '@testing-library/react-native';
import { View } from 'react-native';
import { Portal, Button, type NativePortalHandle } from '../../packages/material/src';
import { NativePortalHost, type NativePortalLayout } from '../../packages/native-host/src';
import { NativeMenuModel } from './nativeMenuModel';
export class NativePortalModel extends NativeMenuModel {
  props: Record<string, any> = {};
  portal = React.createRef<NativePortalHandle>();
  content: React.ReactNode;
  wrapper: (node: React.ReactElement) => React.ReactElement = (node) => node;
  constructor() {
    super({ items: [] });
    this.parents.set('app', null);
    this.parents.set('button', 'app');
  }
  element() {
    return this.wrapper(
      <View ref={this.attach('app')}>
        <View testID="container" ref={this.attach('container')} />
        <Portal {...this.props} ref={this.props.ref ?? this.portal}>
          {this.content ?? (
            <Button ref={this.attach('button')} onClick={() => this.trace.push('click')}>
              Action
            </Button>
          )}
        </Portal>
      </View>,
    );
  }
  host() {
    return this.tree!.UNSAFE_getByType(NativePortalHost);
  }
  async layout(data: Partial<NativePortalLayout> = {}) {
    const props = this.host().props;
    await act(async () =>
      props.onPortalLayout({
        nativeEvent: {
          revision: props.revision,
          presented: true,
          reason: 'presented',
          x: 0,
          y: 0,
          width: 390,
          height: 844,
          rootX: 0,
          rootY: 0,
          rootA: 1,
          rootB: 0,
          rootC: 0,
          rootD: 1,
          a: 1,
          b: 0,
          c: 0,
          d: 1,
          ...data,
        },
      }),
    );
  }
}
