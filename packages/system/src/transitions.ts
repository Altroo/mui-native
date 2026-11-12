// Adapted from @mui/material 9.5.0 createTransitions/createMotion (MIT).
// Copyright (c) 2014 Call-Em-All. Full permission notice: root NOTICE.
// Source provenance and adaptations: upstream/reuse.json.
// Native implementation: Copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT
export interface Easing {
  easeInOut: string;
  easeOut: string;
  easeIn: string;
  sharp: string;
}
export interface Duration {
  shortest: number;
  shorter: number;
  short: number;
  standard: number;
  complex: number;
  enteringScreen: number;
  leavingScreen: number;
}
export const easing: Easing = {
  easeInOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
  easeOut: 'cubic-bezier(0.0, 0, 0.2, 1)',
  easeIn: 'cubic-bezier(0.4, 0, 1, 1)',
  sharp: 'cubic-bezier(0.4, 0, 0.6, 1)',
};
export const duration: Duration = {
  shortest: 150,
  shorter: 200,
  short: 250,
  standard: 300,
  complex: 375,
  enteringScreen: 225,
  leavingScreen: 195,
};
export interface TransitionCreateOptions {
  duration?: number | string;
  easing?: string;
  delay?: number | string;
}
export interface Transitions {
  easing: Easing;
  duration: Duration;
  create: (props?: string | string[], options?: TransitionCreateOptions) => string;
  getAutoHeightDuration: (height: number) => number;
}
export interface TransitionsOptions {
  easing?: Partial<Easing> | undefined;
  duration?: Partial<Duration> | undefined;
  create?:
    | Transitions['create']
    | ((props: string | string[], options?: TransitionCreateOptions) => string)
    | undefined;
  getAutoHeightDuration?: Transitions['getAutoHeightDuration'] | undefined;
}
export type ReducedMotionMode = 'never' | 'system' | 'always';
export interface Motion {
  reducedMotion: ReducedMotionMode;
}
export interface MotionOptions {
  reducedMotion?: ReducedMotionMode | undefined;
}
const EMPTY_MOTION = {};
export function createMotion(input: MotionOptions = EMPTY_MOTION): Motion {
  return { reducedMotion: 'never', ...input };
}
// Share factory defaults and the auto-height function as upstream does.
const DEFAULT_TRANSITION_PROPS = ['all'];
const EMPTY_OPTIONS = {};
function formatMs(milliseconds: number): string {
  return `${Math.round(milliseconds)}ms`;
}
function getAutoHeightDuration(height: number): number {
  if (!height) return 0;
  const constant = height / 36;
  return Math.min(Math.round((4 + 15 * constant ** 0.25 + constant / 5) * 10), 3000);
}
export function createTransitions(input?: TransitionsOptions): Transitions {
  const transitions = { ...input };
  delete (transitions as Record<string, unknown>).reducedMotion;
  const mergedEasing = { ...easing, ...transitions.easing },
    mergedDuration = { ...duration, ...transitions.duration };
  const createTransitionValue: Transitions['create'] = (
    props = DEFAULT_TRANSITION_PROPS,
    options = EMPTY_OPTIONS,
  ) => {
    // Collect unknown options in every build: their getters are observable even
    // when development diagnostics are removed from the production bundle.
    const {
      duration: time = mergedDuration.standard,
      easing: curve = mergedEasing.easeInOut,
      delay = 0,
      ...other
    } = options;
    if (process.env.NODE_ENV !== 'production') {
      const isString = (value: unknown) => typeof value === 'string';
      const isNumber = (value: unknown) => !Number.isNaN(parseFloat(value as string));
      if (!isString(props) && !Array.isArray(props))
        console.error('MUI Native: Argument "props" must be a string or Array.');
      if (!isNumber(time) && !isString(time))
        console.error(
          `MUI Native: Argument "duration" must be a number or a string but found ${time}.`,
        );
      if (!isString(curve)) console.error('MUI Native: Argument "easing" must be a string.');
      if (!isNumber(delay) && !isString(delay))
        console.error('MUI Native: Argument "delay" must be a number or a string.');
      if (typeof options !== 'object')
        console.error(
          [
            'MUI Native: Secong argument of transition.create must be an object.',
            "Arguments should be either `create('prop1', options)` or `create(['prop1', 'prop2'], options)`",
          ].join('\n'),
        );
      if (Object.keys(other).length !== 0)
        console.error(`MUI Native: Unrecognized argument(s) [${Object.keys(other).join(',')}].`);
    }
    return (Array.isArray(props) ? props : [props])
      .map(
        (prop) =>
          `${prop} ${typeof time === 'string' ? time : formatMs(time)} ${curve} ${typeof delay === 'string' ? delay : formatMs(delay)}`,
      )
      .join(',');
  };
  const create = transitions.create ?? createTransitionValue;
  // Preserve the source spread order, including authored undefined callbacks.
  // Omit an optional callback key to retain its default implementation.
  return {
    getAutoHeightDuration,
    create,
    ...transitions,
    easing: mergedEasing,
    duration: mergedDuration,
  } as Transitions;
}
