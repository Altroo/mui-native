import React from 'react';
import { View, type ViewInstance } from 'react-native';
import Fade, { type FadeProps } from '@mui/material/Fade';
import { Fade as RootFade, Dialog, Backdrop, ThemeProvider } from '@mui/material';
import { createTheme, type TransitionsOptions, type MotionOptions } from '@mui/material/styles';
import createTransitions, {
  duration,
  easing,
  type Transitions,
} from '@mui/material/styles/createTransitions';
import createMotion, { type ReducedMotionMode } from '@mui/material/styles/createMotion';
import type { TransitionProps } from '@mui/material/transitions';
import type { TransitionHandlerProps } from '@mui/material/transitions/types';
const ref = React.createRef<ViewInstance>();
const callbacks: TransitionHandlerProps = {
  onEntered: (node, appearing) => {
    node.measure(() => {});
    const initial: boolean = appearing;
    void initial;
  },
  onExited: (node) => node.measure(() => {}),
};
const Transition = React.forwardRef<ViewInstance, FadeProps>(function Transition(props, forwarded) {
  return <Fade {...props} ref={forwarded} />;
});
const timing: TransitionsOptions = {
  create: (props: string | string[]) =>
    `${Array.isArray(props) ? props[0] : props} 10ms linear 0ms`,
};
const motion: MotionOptions = { reducedMotion: 'system' };
const theme = createTheme({ motion, transitions: timing });
const values: Transitions = createTransitions({ duration: { standard: duration.short } });
const mode: ReducedMotionMode = createMotion().reducedMotion;
const props: TransitionProps = {
  in: true,
  timeout: { appear: 5, enter: 10, exit: 15 },
  easing: easing.easeInOut,
};
export const transitions = (
  <ThemeProvider theme={theme}>
    <RootFade {...props} ref={ref} {...callbacks}>
      <View />
    </RootFade>
    <Backdrop
      open
      ref={ref}
      transitionDuration={20}
      slots={{ transition: Transition }}
      slotProps={{ transition: { disablePrefersReducedMotion: true } }}
    />
    <Dialog
      open
      slots={{ transition: Transition }}
      transitionDuration={{ enter: 20, exit: 10 }}
      slotProps={{ transition: { ...callbacks, appear: false } }}
    >
      <View />
    </Dialog>
  </ThemeProvider>
);
void values;
void mode;
// @ts-expect-error Native Fade requires one ref-forwarding React element.
export const invalidChild = <Fade>text</Fade>;
export const browserRef = (
  // @ts-expect-error A browser node is not a native transition ref.
  <Fade ref={React.createRef<HTMLDivElement>()}>
    <View />
  </Fade>
);
