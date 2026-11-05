// Copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT
const assert = require('node:assert/strict');
const { createRequire } = require('node:module');
const Module = require('node:module');
const path = require('node:path');
const requireConsumer = createRequire(path.resolve(process.argv[2], 'package.json'));
const load = Module._load;
// Pure context imports must work without initializing a native renderer or host.
Module._load = function (request, parent, main) {
  assert.ok(
    request !== 'react-native' &&
      !request.startsWith('react-native/') &&
      request !== '@altroo/mui-native-host' &&
      !request.startsWith('@altroo/mui-native-host/'),
    'Renderless provider imported a native renderer: ' + request,
  );
  return load.call(this, request, parent, main);
};
try {
  const system = requireConsumer('@altroo/mui-native-system/DefaultPropsProvider');
  const material = requireConsumer('@altroo/mui-native/DefaultPropsProvider');
  assert.notEqual(material.default, system.default);
  assert.notEqual(material.useDefaultProps, system.useDefaultProps);
  const value = Object.freeze({ Probe: Object.freeze({ value: 'default' }) });
  const children = Object.freeze(['one', 'two']);
  const forwarded = material.default({ value, children });
  assert.equal(forwarded.type, system.default);
  assert.equal(forwarded.props.value, value);
  assert.equal(forwarded.props.children, children);
  const context = system.default(forwarded.props);
  assert.equal(context.props.value, value);
  assert.equal(context.props.children, children);
  console.log('Installed pure provider entries share context without loading a native renderer.');
} finally {
  Module._load = load;
}
