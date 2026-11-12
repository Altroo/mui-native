// Copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT
export const cacheScenarios = [
  { name: 'target-first', steps: ['target'] },
  { name: 'defaults-target', steps: ['defaults', 'target'] },
  { name: 'target-defaults-target', steps: ['target', 'defaults', 'target'] },
  { name: 'defaults-reset-target', steps: ['defaults', 'reset', 'target'] },
  { name: 'standalone-defaults-target', steps: ['standalone', 'target'] },
  { name: 'standalone-disabled-target', steps: ['standalone-disabled', 'target'] },
  { name: 'theme-replacement-target', steps: ['defaults', 'theme', 'target'] },
  { name: 'independent-cache-target', steps: ['defaults', 'independent', 'target'] },
  { name: 'discarded-suspense-target', steps: ['suspended-defaults', 'target'] },
  { name: 'strict-defaults-target', steps: ['defaults', 'target'], strict: true },
  { name: 'nested-styled-cache-first', steps: ['warm-styled-b', 'nested-target-b'] },
  { name: 'nested-fresh-caches', steps: ['nested-target-b'] },
  { name: 'nested-button-cache-first', steps: ['warm-button-b', 'nested-target-b'] },
  {
    name: 'nested-existing-group-cache',
    steps: ['warm-group-a', 'warm-button-b', 'nested-target-b'],
  },
  {
    name: 'live-button-cache-switch',
    steps: ['warm-button-b', 'nested-target-b', 'nested-target-a'],
    retain: true,
  },
];
const equal = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const names = (value) =>
  Array.isArray(value) &&
  value.every((name) => typeof name === 'string' && name.length > 0) &&
  new Set(value).size === value.length;
export function assertCacheObservations(rows) {
  if (
    !Array.isArray(rows) ||
    !equal(
      rows.map((row) => row.name),
      cacheScenarios.map((row) => row.name),
    )
  )
    throw Error('Incomplete cache sequences');
  for (const [index, row] of rows.entries()) {
    const expected = cacheScenarios[index];
    const steps = expected.steps.filter(
      (step) => !['reset', 'independent', 'theme'].includes(step),
    );
    if (
      !equal(row.steps, expected.steps) ||
      row.strict !== !!expected.strict ||
      !Array.isArray(row.observations) ||
      !equal(
        row.observations.map((item) => item.step),
        steps,
      )
    )
      throw Error('Incorrect cache sequence: ' + row.name);
    for (const item of row.observations) {
      const suspended = item.step === 'suspended-defaults';
      const styled = item.step === 'warm-styled-b';
      const standalone = item.step.startsWith('standalone') || item.step === 'warm-button-b';
      const count = suspended || styled ? 0 : standalone ? 1 : 3;
      if (
        !names(item.inserted) ||
        !(
          Array.isArray(item.tagOwners) &&
          item.tagOwners.every((key) => typeof key === 'string' && key.length > 0)
        ) ||
        !Array.isArray(item.cacheInsertions) ||
        item.cacheInsertions.some((cache) => typeof cache.key !== 'string' || !cache.key) ||
        item.cacheInsertions.some((cache) => !names(cache.names)) ||
        !Array.isArray(item.buttons) ||
        item.buttons.length !== count ||
        !Array.isArray(item.immediateBorders) ||
        item.immediateBorders.length !== count ||
        item.immediateBorders.some((value) => typeof value !== 'string') ||
        !Array.isArray(item.matchingBorderRules) ||
        item.matchingBorderRules.some((rule) =>
          ['selector', 'border', 'right'].some((key) => typeof rule[key] !== 'string'),
        ) ||
        item.buttons.some((button) =>
          ['className', 'rightBorder', 'leftBorder', 'minWidth', 'opacity'].some(
            (key) => typeof button[key] !== 'string',
          ),
        )
      )
        throw Error('Incomplete render observation: ' + row.name + '/' + item.step);
      if (
        !suspended &&
        (!item.inserted.length ||
          !item.tagOwners.length ||
          !item.cacheInsertions.length ||
          item.cacheInsertions.some((cache) => !cache.names.length) ||
          (!styled && !item.matchingBorderRules.length))
      )
        throw Error('Missing committed source-order evidence');
      if (suspended) {
        if (
          item.rootClass !== null ||
          item.inserted.length ||
          item.cacheInsertions.length ||
          item.tagOwners.length ||
          item.matchingBorderRules.length
        )
          throw Error('Discarded Suspense render inserted CSS');
      } else if (styled) {
        if (
          item.rootClass !== null ||
          item.inserted.length !== 1 ||
          item.styledClass !== 'group-cache-b-' + item.inserted[0]
        )
          throw Error('Invalid styled root warm-up');
      } else if (standalone) {
        if (
          item.rootClass !== null ||
          item.inserted.length !== 2 ||
          item.buttons[0].className.includes('Mui-disabled') !==
            (item.step === 'standalone-disabled')
        )
          throw Error('Invalid standalone warm-up');
      } else {
        if (
          typeof item.rootClass !== 'string' ||
          !item.rootClass.includes('MuiButtonGroup-root') ||
          !['firstButton', 'middleButton', 'lastButton'].every((slot, position) =>
            item.buttons[position].className.includes('MuiButtonGroup-' + slot),
          )
        )
          throw Error('Missing joined-button selector identities');
      }
    }
  }
}

// Keep constructor timing and registered CSS as strict as the cache sequences.
export const styledProgrammeTraces = [
  { name: 'static-object', definition: ['css:padding'], render: ['css:padding'] },
  { name: 'dynamic-object', definition: [], render: ['call:base', 'css:padding'] },
  {
    name: 'static-variants',
    definition: ['css:padding', 'get:variant-style', 'get:variant-style'],
    render: ['css:padding', 'get:variant-style', 'get:variant-style'],
  },
  {
    name: 'dynamic-variants',
    definition: [],
    render: ['call:base', 'css:padding', 'get:variant-style', 'get:variant-style'],
  },
  {
    name: 'themed-variant-no-owner',
    definition: [],
    render: [
      'call:base',
      'css:padding',
      'predicate:true:true:undefined',
      'variant:true:true:undefined',
    ],
  },
  {
    name: 'shared-static-variants',
    definition: ['css:padding', 'get:variant-style', 'get:variant-style', 'css:padding'],
    render: ['css:padding', 'get:variant-style', 'get:variant-style', 'css:padding'],
  },
];
export function assertStyledProgrammes(rows) {
  if (
    !Array.isArray(rows) ||
    !equal(
      rows.map((row) => row.name),
      styledProgrammeTraces.map((row) => row.name),
    )
  )
    throw Error('Incomplete original styled preprocessing observations');
  for (const [index, row] of rows.entries()) {
    const expected = styledProgrammeTraces[index];
    if (
      typeof row.css !== 'string' ||
      !row.css ||
      typeof row.className !== 'string' ||
      !/^constructor-css-[a-z0-9]+-MuiCacheProbe-root$/.test(row.className) ||
      !equal(row.definitionTrace, expected.definition) ||
      !equal(row.renderTrace, expected.render) ||
      (row.name === 'shared-static-variants' && row.secondClassName !== row.className)
    )
      throw Error('Invalid original styled preprocessing CSS or timing: ' + row.name);
  }
}

export const cssEmissionInputs = [
  '',
  'label:empty;',
  '&:hover{}',
  '@media(min-width:100px){}',
  '@layer empty{}',
  '@keyframes empty{}',
  'cursor:pointer;',
  '--empty:;',
  '--empty: ;',
  '--empty:/**/;',
  '--empty:0;',
  'color:;',
  'content:"label:kept;";',
  '@supports(display:grid){}',
];
export function assertCssEmissions(rows) {
  if (
    !Array.isArray(rows) ||
    !equal(
      rows.map((row) => row.css),
      cssEmissionInputs,
    ) ||
    rows.some(
      (row) =>
        typeof row.hasRules !== 'boolean' ||
        !Number.isInteger(row.ruleCount) ||
        row.ruleCount < 0 ||
        row.hasRules !== row.ruleCount > 0,
    )
  )
    throw Error('Incomplete original CSS emission observations');
}

export const classMembershipNames = [
  'different-keys-cold',
  'different-keys-b-first',
  'same-key-cold',
  'same-key-registered',
  'same-key-aborted-registration',
  'same-key-b-first-unregistered',
  'foreign-emitter-reset',
  'multiple-foreign-class-order',
  'terminal-does-not-register',
  'focus-resolves-new-class-membership',
  'as-default',
  'as-forwarded',
  'as-consumed',
  'as-opaque-composition',
  'box-foreign-emitter-reset',
  'as-explicit-undefined',
  'as-inherited-undefined',
];
export function assertClassMembership(rows) {
  const strings = (values) =>
    Array.isArray(values) && values.every((value) => typeof value === 'string');
  const registry = (value) =>
    value &&
    !Array.isArray(value) &&
    typeof value === 'object' &&
    Object.entries(value).every(([key, css]) => key && typeof css === 'string' && css.length);
  const text = (row, fields) => fields.every((key) => typeof row[key] === 'string' && row[key]);
  if (
    !Array.isArray(rows) ||
    JSON.stringify(rows.map((row) => row.name)) !== JSON.stringify(classMembershipNames)
  )
    throw Error('Incomplete original class membership cases');
  for (const [index, row] of rows.entries()) {
    let valid;
    if (index < 6)
      valid =
        text(row, ['incomingClass', 'buttonClass', 'color']) &&
        typeof row.incomingRetained === 'boolean' &&
        text(row.keys, ['a', 'b']) &&
        strings(row.before?.a) &&
        strings(row.before?.b) &&
        registry(row.after?.a) &&
        registry(row.after?.b) &&
        Array.isArray(row.calls) &&
        row.calls.length &&
        row.calls.every(
          (call) => ['a', 'b'].includes(call.cache) && text(call, ['selector', 'name', 'css']),
        );
    else if (index === 6 || index === 14)
      valid =
        text(row, ['incomingClass', 'buttonClass', 'beforeColor', 'afterColor']) &&
        row.incomingRetained === true;
    else if (index === 7)
      valid =
        text(row, ['color', 'buttonClass']) &&
        registry(row.registeredReceiver) &&
        Object.keys(row.registeredReceiver).length >= 2;
    else if (index === 8)
      valid =
        text(row, ['color', 'buttonClass']) &&
        registry(row.registeredBefore) &&
        !Object.keys(row.registeredBefore).length;
    else if (index === 9)
      valid =
        text(row, ['beforeColor', 'registeredColor', 'afterColor', 'beforeClass', 'afterClass']) &&
        registry(row.registered);
    else if (index < 13 || index === 15)
      valid =
        ['SPAN', 'DIV'].includes(row.tag) &&
        [null, 'span'].includes(row.forwardedAs) &&
        strings(row.factoryCalls) &&
        registry(row.registered) &&
        text(row, ['className']);
    else
      valid =
        row.tag === 'SPAN' &&
        strings(row.factoryCalls) &&
        strings(row.renderCalls) &&
        strings(row.receivers) &&
        row.receivers.every((value) => ['undefined', 'inner', 'outer'].includes(value)) &&
        text(row, ['css', 'className']) &&
        registry(row.registered);
    if (!valid) throw Error('Invalid original class membership evidence: ' + row.name);
  }
}
