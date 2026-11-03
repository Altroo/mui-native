/* Instance and modifier lifecycles adapt MIT-licensed @popperjs/core 2.11.8.
 * Copyright (c) 2019 Federico Zivolo. See NOTICE and upstream/native-positioning.json. */
import type { ViewInstance } from 'react-native';
import type {
  NativePopperAnchor,
  NativePopperOptions,
  NativePopperState,
  NativePopperInstance,
  NativePopperPlatform,
  NativePopperMeasurements,
} from './types';
import { orderModifiers, placements, modifierPhases, validRect } from './geometry';
import { defaultModifiers } from './modifiers';
import { registerPlatform } from './overflow';
const defaults: NativePopperOptions = { placement: 'bottom', strategy: 'absolute', modifiers: [] };
const initialMeasurements = (): NativePopperMeasurements => ({
  reference: { x: 0, y: 0, width: 0, height: 0 },
  popper: { x: 0, y: 0, width: 0, height: 0 },
  viewport: { x: 0, y: 0, width: 0, height: 0 },
  document: { x: 0, y: 0, width: 0, height: 0 },
  clipping: {
    reference: { x: 0, y: 0, width: 0, height: 0 },
    popper: { x: 0, y: 0, width: 0, height: 0 },
  },
  offsetParent: { width: 0, height: 0 },
  pixelRatio: 1,
});
function validMeasurements(data: NativePopperMeasurements) {
  return (
    [data.reference, data.popper, data.viewport, data.document].every(validRect) &&
    [data.clipping.reference, data.clipping.popper].every(
      (rect) => rect === null || [rect.x, rect.y, rect.width, rect.height].every(Number.isFinite),
    ) &&
    [data.offsetParent.width, data.offsetParent.height].every(
      (value) => Number.isFinite(value) && value >= 0,
    ) &&
    Number.isFinite(data.pixelRatio) &&
    data.pixelRatio > 0
  );
}
const connected = (element: object) => !('isConnected' in element) || element.isConnected !== false;
export function createNativePopper(
  reference: NativePopperAnchor,
  popper: ViewInstance,
  options: Partial<NativePopperOptions>,
  platform: NativePopperPlatform,
): NativePopperInstance {
  const initial = initialMeasurements();
  let state: NativePopperState = {
    placement: 'bottom',
    orderedModifiers: [],
    options: { ...defaults },
    modifiersData: {},
    elements: { reference, popper },
    rects: { reference: initial.reference, popper: initial.popper },
    reset: false,
    styles: {},
    attributes: {},
    native: initial,
  };
  // Geometry reads and effect setup have separate epochs: a modifier can synchronously
  // reconfigure or destroy the instance while an older read/setup is still unwinding.
  let cleanups: (() => void)[] = [],
    destroyed = false,
    generation = 0,
    configuration = 0,
    pending: Promise<NativePopperState> | undefined,
    firstDelivered = false;
  const firstUpdate = options.onFirstUpdate;
  function cleanup() {
    const effects = cleanups;
    cleanups = [];
    const errors: unknown[] = [];
    for (const effect of effects)
      try {
        effect();
      } catch (error) {
        errors.push(error);
      }
    if (errors.length)
      throw new AggregateError(errors, 'MUI Native: Popper modifier cleanup failed.');
  }
  function execute(
    data: NativePopperMeasurements | null,
    token: number,
    retries: number,
  ): NativePopperState | Promise<NativePopperState> {
    if (
      destroyed ||
      token !== generation ||
      !connected(state.elements.reference) ||
      !connected(state.elements.popper) ||
      !data
    )
      return state;
    if (retries > 16) throw new Error('MUI Native: Popper native geometry did not stabilize.');
    if (platform.isMeasurementCurrent?.(data) === false) return read(retries + 1);
    if (!validMeasurements(data))
      throw new Error('MUI Native: Popper received invalid native measurements.');
    state.native = data;
    state.rects = { reference: { ...data.reference }, popper: { ...data.popper } };
    state.placement = state.options.placement;
    state.reset = false;
    registerPlatform(state, platform);
    platform.bindMeasurement?.(state, data);
    for (const modifier of state.orderedModifiers)
      state.modifiersData[modifier.name] = { ...modifier.data };
    let resets = 0;
    for (let index = 0; index < state.orderedModifiers.length; index++) {
      if (destroyed || generation !== token) return state;
      if (state.reset) {
        if (++resets > 100)
          throw new Error('MUI Native: Popper modifiers exceeded the reset limit.');
        state.reset = false;
        index = -1;
        continue;
      }
      const modifier = state.orderedModifiers[index];
      if (modifier.fn) {
        const next = modifier.fn({
          state,
          instance,
          name: modifier.name,
          options: modifier.options ?? {},
        });
        // A callback can synchronously reconfigure, update or destroy this instance.
        if (destroyed || generation !== token) return state;
        if (platform.isMeasurementCurrent?.(data) === false) return read(retries + 1);
        state = next || state;
        if (!state.native) state.native = data;
        registerPlatform(state, platform);
        platform.bindMeasurement?.(state, data);
      }
    }
    platform.didUpdate?.(state);
    if (!firstDelivered) {
      firstDelivered = true;
      const firstState = state;
      if (firstUpdate)
        queueMicrotask(() => {
          if (!destroyed) firstUpdate(firstState);
        });
    }
    return state;
  }
  function read(retries = 0): NativePopperState | Promise<NativePopperState> {
    if (destroyed || !connected(state.elements.reference) || !connected(state.elements.popper))
      return state;
    const token = ++generation,
      measurement = platform.measure(state);
    return measurement &&
      typeof (measurement as PromiseLike<NativePopperMeasurements | null>).then === 'function'
      ? Promise.resolve(measurement).then((data) => execute(data, token, retries))
      : execute(measurement as NativePopperMeasurements | null, token, retries);
  }
  const instance: NativePopperInstance = {
    get state() {
      return state;
    },
    setOptions(action) {
      if (destroyed) return Promise.resolve(state);
      const observedConfiguration = configuration;
      // Match the source updater-before-cleanup order. Validate before touching live effects.
      const next = typeof action === 'function' ? action(state.options) : action;
      if (destroyed || observedConfiguration !== configuration) return instance.update();
      const candidate = { ...defaults, ...state.options, ...next };
      if (!placements.includes(candidate.placement))
        throw new Error('MUI Native: Popper placement is invalid.');
      if (!['absolute', 'fixed'].includes(candidate.strategy))
        throw new Error('MUI Native: Popper strategy must be absolute or fixed.');
      if (!Array.isArray(candidate.modifiers))
        throw new Error('MUI Native: Popper modifiers must be an array.');
      const modifiers = [...defaultModifiers(platform), ...candidate.modifiers];
      for (const modifier of modifiers)
        if (
          modifier.enabled !== false &&
          modifier.phase &&
          !modifierPhases.includes(modifier.phase)
        )
          throw new Error('MUI Native: Popper modifier phase is invalid.');
      const ordered = orderModifiers(modifiers);
      if (destroyed || observedConfiguration !== configuration) return instance.update();
      const setup = ++configuration;
      generation++;
      cleanup();
      if (destroyed || setup !== configuration) return instance.update();
      state.options = candidate;
      state.orderedModifiers = ordered;
      registerPlatform(state, platform);
      try {
        for (const modifier of state.orderedModifiers) {
          if (destroyed || setup !== configuration) break;
          const effect = modifier.effect?.({
            state,
            instance,
            name: modifier.name,
            options: modifier.options ?? {},
          });
          if (typeof effect === 'function') {
            if (destroyed || setup !== configuration) effect();
            else cleanups.push(effect);
          }
        }
      } catch (error) {
        // A retired setup must not roll back a newer setup's subscriptions.
        if (setup === configuration && !destroyed) {
          try {
            cleanup();
          } catch (cleanupError) {
            throw new AggregateError(
              [error, cleanupError],
              'MUI Native: Popper modifier setup failed.',
            );
          }
        }
        throw error;
      }
      return instance.update();
    },
    forceUpdate() {
      const result = read();
      if (result instanceof Promise) void result.catch(platform.report);
    },
    update() {
      if (destroyed) return Promise.resolve(state);
      return (
        pending ??
        (pending = Promise.resolve().then(() => {
          pending = undefined;
          return read();
        }))
      );
    },
    destroy() {
      if (destroyed) return;
      destroyed = true;
      configuration++;
      generation++;
      cleanup();
    },
  };
  void instance.setOptions(options).catch(platform.report);
  return instance;
}
