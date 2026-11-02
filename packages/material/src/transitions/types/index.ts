import type React from 'react';
import type {
  ViewProps,
  ViewStyle,
  ViewInstance,
  StyleProp,
  PressableStateCallbackType,
} from 'react-native';
export type TransitionStatus = 'entering' | 'entered' | 'exiting' | 'exited' | 'unmounted';
export interface TransitionActions {
  appear?: boolean;
  enter?: boolean;
  exit?: boolean;
}
export type EnterHandler = (node: ViewInstance, isAppearing: boolean) => void;
export type ExitHandler = (node: ViewInstance) => void;
export interface TransitionHandlerProps {
  onEnter?: EnterHandler;
  onEntering?: EnterHandler;
  onEntered?: EnterHandler;
  onExit?: ExitHandler;
  onExiting?: ExitHandler;
  onExited?: ExitHandler;
}
export type TransitionHandlerKeys = keyof TransitionHandlerProps;
export interface EasingProps {
  easing: string | { enter?: string; exit?: string };
}
export type NativeTransitionStyle = Omit<
  ViewStyle,
  'transitionDuration' | 'transitionDelay' | 'transitionTimingFunction'
> & {
  transitionDuration?: number | string;
  transitionDelay?: number | string;
  transitionTimingFunction?: string;
};
export type TransitionStyle =
  | StyleProp<NativeTransitionStyle>
  | ((state: PressableStateCallbackType) => StyleProp<NativeTransitionStyle>);
export interface TransitionProps
  extends TransitionActions,
    TransitionHandlerProps,
    Omit<ViewProps, 'children' | 'style'> {
  in?: boolean;
  mountOnEnter?: boolean;
  unmountOnExit?: boolean;
  timeout?: number | { appear?: number; enter?: number; exit?: number };
  easing?: EasingProps['easing'];
  addEndListener?: (node: ViewInstance, done: () => void) => void;
  disablePrefersReducedMotion?: boolean;
  style?: TransitionStyle;
  children?: React.ReactElement<any>;
}
export type TransitionKeys =
  | 'in'
  | 'mountOnEnter'
  | 'unmountOnExit'
  | 'timeout'
  | 'easing'
  | 'addEndListener'
  | 'disablePrefersReducedMotion'
  | TransitionHandlerKeys;
