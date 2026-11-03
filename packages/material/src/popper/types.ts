import type { ViewInstance } from 'react-native';
import type { NativeStyle } from '@altroo/mui-native-system';
export type PopperPlacementType =
  | 'auto'
  | 'auto-start'
  | 'auto-end'
  | 'top'
  | 'top-start'
  | 'top-end'
  | 'bottom'
  | 'bottom-start'
  | 'bottom-end'
  | 'right'
  | 'right-start'
  | 'right-end'
  | 'left'
  | 'left-start'
  | 'left-end';
export type NativePopperSide = 'top' | 'right' | 'bottom' | 'left';
export type NativePopperPhase =
  | 'beforeRead'
  | 'read'
  | 'afterRead'
  | 'beforeMain'
  | 'main'
  | 'afterMain'
  | 'beforeWrite'
  | 'write'
  | 'afterWrite';
export interface NativePopperRect {
  x: number;
  y: number;
  width: number;
  height: number;
}
export interface PopperVirtualElement {
  getBoundingClientRect(): Pick<NativePopperRect, 'width' | 'height'> &
    ({ x: number; y: number } | { left: number; top: number });
  contextElement?: ViewInstance;
}
export type NativePopperAnchor = ViewInstance | PopperVirtualElement;
export type NativePopperBoundary =
  | 'clippingParents'
  | ViewInstance
  | PopperVirtualElement
  | (ViewInstance | PopperVirtualElement)[];
export type NativePopperPadding = number | Partial<Record<NativePopperSide, number>>;
export interface NativePopperOverflowOptions {
  placement?: PopperPlacementType;
  strategy?: 'absolute' | 'fixed';
  boundary?: NativePopperBoundary;
  rootBoundary?: 'viewport' | 'document';
  elementContext?: 'reference' | 'popper';
  altBoundary?: boolean;
  padding?: NativePopperPadding;
}
export interface NativePopperMeasurements {
  reference: NativePopperRect;
  popper: NativePopperRect;
  viewport: NativePopperRect;
  document: NativePopperRect;
  clipping: { reference: NativePopperRect | null; popper: NativePopperRect | null };
  offsetParent: { width: number; height: number; clientTop?: number; clientLeft?: number };
  pixelRatio: number;
}
export interface NativePopperModifierArguments<Options = Record<string, any>> {
  state: NativePopperState;
  instance: NativePopperInstance;
  name: string;
  options: Options;
}
export interface NativePopperModifier<Name extends string = string, Options = Record<string, any>> {
  name: Name;
  enabled?: boolean;
  phase?: NativePopperPhase;
  fn?: (args: NativePopperModifierArguments<Options>) => void | NativePopperState;
  effect?: (args: NativePopperModifierArguments<Options>) => void | (() => void);
  requires?: string[];
  requiresIfExists?: string[];
  options?: Options;
  data?: Record<string, any>;
}
export interface NativePopperOptions {
  placement: PopperPlacementType;
  strategy: 'absolute' | 'fixed';
  modifiers: NativePopperModifier[];
  onFirstUpdate?: (state: NativePopperState) => void;
}
export interface NativePopperState {
  placement: PopperPlacementType;
  orderedModifiers: NativePopperModifier[];
  options: NativePopperOptions;
  modifiersData: Record<string, any>;
  elements: { reference: NativePopperAnchor; popper: ViewInstance; arrow?: ViewInstance };
  rects: { reference: NativePopperRect; popper: NativePopperRect };
  reset: boolean;
  styles: Record<string, NativeStyle>;
  attributes: Record<string, Record<string, string | boolean>>;
  /** Snapshot of native measurement inputs for this update, all in one containing-block coordinate space. */
  native: NativePopperMeasurements;
}
export interface NativePopperInstance {
  readonly state: NativePopperState;
  setOptions(
    options:
      | Partial<NativePopperOptions>
      | ((previous: NativePopperOptions) => Partial<NativePopperOptions>),
  ): Promise<NativePopperState>;
  forceUpdate(): void;
  update(): Promise<NativePopperState>;
  destroy(): void;
}
export interface NativePopperPlatform {
  report(error: unknown): void;
  measure(
    state: NativePopperState,
  ): NativePopperMeasurements | null | Promise<NativePopperMeasurements | null>;
  boundary?(
    boundary: Exclude<NativePopperBoundary, 'clippingParents'>,
    state: NativePopperState,
  ): NativePopperRect | null;
  layout(element: ViewInstance): NativePopperRect | null;
  parent(element: ViewInstance, state: NativePopperState): NativePopperMeasurements['offsetParent'];
  contains(parent: ViewInstance, child: ViewInstance): boolean;
  subscribe?(
    instance: NativePopperInstance,
    options: { scroll: boolean; resize: boolean },
  ): () => void;
  apply?(state: NativePopperState): void;
}
