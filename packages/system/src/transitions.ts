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
  easing?: Partial<Easing>;
  duration?: Partial<Duration>;
  create?:
    | Transitions['create']
    | ((props: string | string[], options?: TransitionCreateOptions) => string);
  getAutoHeightDuration?: Transitions['getAutoHeightDuration'];
}
export type ReducedMotionMode = 'never' | 'system' | 'always';
export interface Motion {
  reducedMotion: ReducedMotionMode;
}
export interface MotionOptions {
  reducedMotion?: ReducedMotionMode;
}
export function createMotion(input: MotionOptions = {}): Motion {
  return { reducedMotion: 'never', ...input };
}
export function createTransitions(input: TransitionsOptions = {}): Transitions {
  const transitions = { ...input };
  delete (transitions as Record<string, unknown>).reducedMotion;
  const mergedEasing = { ...easing, ...transitions.easing },
    mergedDuration = { ...duration, ...transitions.duration };
  const create: Transitions['create'] = (props = ['all'], options = {}) => {
    const {
      duration: time = mergedDuration.standard,
      easing: curve = mergedEasing.easeInOut,
      delay = 0,
    } = options;
    const ms = (value: number | string) =>
      typeof value === 'string' ? value : `${Math.round(value)}ms`;
    return (Array.isArray(props) ? props : [props])
      .map((prop) => `${prop} ${ms(time)} ${curve} ${ms(delay)}`)
      .join(',');
  };
  const getAutoHeightDuration = (height: number) => {
    if (!height) return 0;
    const constant = height / 36;
    return Math.min(Math.round((4 + 15 * constant ** 0.25 + constant / 5) * 10), 3000);
  };
  return {
    getAutoHeightDuration,
    ...transitions,
    create: (transitions.create ?? create) as Transitions['create'],
    easing: mergedEasing,
    duration: mergedDuration,
  };
}
