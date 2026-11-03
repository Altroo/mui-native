import React, { forwardRef } from 'react';
import { Dimensions, type ViewInstance } from 'react-native';
import {
  Menu,
  MenuPaper,
  PopoverRoot,
  type MenuProps,
  type MenuRootProps,
  type MenuPaperProps,
} from '../../packages/material/src';
import { useForkRef } from '../../packages/material/src/utils';
import { NativeMenuModel } from './nativeMenuModel';
const viewport = Dimensions.get('window');
function geometry(node: ViewInstance, root: boolean) {
  Object.defineProperties(node, {
    offsetWidth: { configurable: true, value: root ? viewport.width : 120 },
    offsetHeight: { configurable: true, value: root ? viewport.height : 80 },
    clientHeight: { configurable: true, value: root ? viewport.height : 80 },
  });
  node.measureInWindow = ((callback: any) =>
    callback(
      0,
      0,
      root ? viewport.width : 120,
      root ? viewport.height : 80,
    )) as ViewInstance['measureInWindow'];
  return node;
}
const anchor = {
  nodeType: 1 as const,
  getBoundingClientRect: () => ({ top: 200, left: 100, width: 40, height: 20 }),
};
export class NativeMenuOverlayModel extends NativeMenuModel {
  open = true;
  menuProps: Partial<MenuProps> = {};
  Root: React.ComponentType<MenuRootProps>;
  Paper: React.ComponentType<MenuPaperProps>;
  constructor(input: ConstructorParameters<typeof NativeMenuModel>[0]) {
    super(input);
    this.parents.set('overlay', null);
    this.parents.set('paper', 'overlay');
    this.parents.set('list', 'paper');
    const model = this;
    this.Root = forwardRef<ViewInstance, MenuRootProps>((props, ref) => {
      const merged = useForkRef(
        ref,
        (node) => {
          if (node) geometry(node, true);
        },
        model.attach('overlay'),
      );
      return <PopoverRoot {...props} ref={merged} />;
    });
    this.Paper = forwardRef<ViewInstance, MenuPaperProps>((props, ref) => {
      const merged = useForkRef(
        ref,
        (node) => {
          if (node) geometry(node, false);
        },
        model.attach('paper'),
      );
      return <MenuPaper {...props} ref={merged} />;
    });
  }
  element() {
    const list = super.element(),
      props: any = { ...list.props };
    for (const key of Object.keys(props)) if (props[key] === undefined) delete props[key];
    return (
      <Menu
        open={this.open}
        disablePortal
        anchorEl={anchor}
        transitionDuration={10}
        slots={{ root: this.Root, paper: this.Paper }}
        {...this.menuProps}
        slotProps={{
          root: { testID: 'overlay' },
          paper: { testID: 'paper' },
          list: props,
          ...this.menuProps.slotProps,
        }}
      >
        {list.props.children}
      </Menu>
    );
  }
}
