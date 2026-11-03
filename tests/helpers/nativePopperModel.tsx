import React from 'react';
import { View, Text, StyleSheet, type ViewInstance } from 'react-native';
import { act } from '@testing-library/react-native';
import {
  Popper,
  type PopperProps,
  type PopperChildrenProps,
} from '../../packages/material/src/popper';
import type { NativePopperInstance } from '../../packages/material/src/nativePopper/types';
import { NativePortalModel } from './nativePortalModel';
import { nativePopperSnapshot } from './nativePopperSnapshot';
export class NativePopperModel extends NativePortalModel {
  instance = React.createRef<NativePopperInstance>();
  root: React.RefObject<ViewInstance | null> = React.createRef<ViewInstance>();
  childProps: PopperChildrenProps | undefined;
  mounts = 0;
  props: { -readonly [K in keyof PopperProps]?: PopperProps[K] } = {
    open: true,
    anchorEl: { getBoundingClientRect: () => ({ x: 120, y: 200, width: 100, height: 40 }) },
    style: { width: 80, height: 30 },
  };
  Content = () => {
    const [id] = React.useState(() => ++this.mounts);
    return <Text testID="content">{id}</Text>;
  };
  child = (props: PopperChildrenProps) => {
    this.childProps = props;
    return <this.Content />;
  };
  rootRef = (node: ViewInstance | null) => {
    if (!node) {
      this.root.current = null;
      return;
    }
    this.root.current = node;
    const release = this.attach('popup')(node);
    return () => {
      release?.();
      if (this.root.current === node) this.root.current = null;
    };
  };
  element() {
    const { component, ...props } = this.props;
    const common = {
      open: true,
      ...props,
      ref: this.props.ref ?? this.rootRef,
      popperRef: this.props.popperRef ?? this.instance,
      testID: 'popup',
      children: this.props.children ?? this.child,
    };
    return this.wrapper(
      <View ref={this.attach('app')}>
        <View ref={this.attach('container')} />
        {component ? <Popper {...common} component={component} /> : <Popper {...common} />}
      </View>,
    );
  }
  async ready() {
    if (!this.props.disablePortal) await this.layout();
    await act(async () => {
      await Promise.resolve();
    });
    return this;
  }
  async observe(change: (value: ReturnType<typeof nativePopperSnapshot>) => void = () => {}) {
    const props = this.host().props,
      value = nativePopperSnapshot(props.popperTag);
    value.revision = props.revision;
    value.observationRevision = props.observationRevision;
    value.observedTag = props.observedTag;
    value.anchorAvailable = props.observedTag > 0;
    value.position!.anchorAvailable = value.anchorAvailable;
    value.position!.arrow.tag = props.arrowTag;
    value.position!.boundaries = (props.boundaryTags ?? []).map((tag: number) => ({
      tag,
      available: true,
      x: 0,
      y: 0,
      width: 390,
      height: 844,
    }));
    change(value);
    await act(async () => {
      props.onPortalObservation({ nativeEvent: value });
      await Promise.resolve();
      await Promise.resolve();
    });
    return value;
  }
  style() {
    return StyleSheet.flatten(
      this.tree!.getByTestId('popup', { includeHiddenElements: true }).props.style,
    );
  }
  async invoke(handler: () => void) {
    await act(async () => {
      handler();
      await Promise.resolve();
    });
  }
}
