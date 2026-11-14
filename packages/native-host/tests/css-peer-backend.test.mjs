// Copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT
// Initialization/import controls with explicit JSX/host doubles, not native mounting.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import { transformSync } from 'esbuild';
const source = await readFile(new URL('../src/cssPeerView.tsx', import.meta.url), 'utf8');
const code = transformSync(source, { loader: 'tsx', format: 'cjs', jsx: 'automatic' }).code;
for (const initiallySupported of [false, true]) {
  test(
    'peer backend captures readiness and keeps stable host identity: ' + initiallySupported,
    () => {
      let supported = initiallySupported,
        reads = 0,
        profiles = 0;
      const loads = [];
      const profile = Object.freeze({ schema: 1, rn: '0.88.1' });
      const module = { exports: {} };
      vm.runInNewContext(code, {
        module,
        exports: module.exports,
        require(name) {
          loads.push(name);
          if (name === 'react') return { forwardRef: (render) => render };
          if (name === 'react/jsx-runtime') return { jsx: (type, props) => ({ type, props }) };
          if (name === 'react-native') return { View: 'View' };
          if (name === './ownedStyleBootstrap')
            return {
              supportsPeerStyleIdentity() {
                reads++;
                return supported;
              },
              requireOwnedStyleProfile() {
                profiles++;
                return profile;
              },
            };
          if (name === './ownedStructuralHost') return { OwnedStructuralHost: 'OwnedHost' };
          if (name === './AltrooMUIStructuralViewNativeComponent')
            return { default: 'NativePeerView' };
          throw Error('Unexpected eager backend/codec import: ' + name);
        },
      });
      const render = module.exports.CSSPeerView;
      const first = { expanded: false, classes: [] },
        second = {
          expanded: true,
          classes: [{ cacheKey: 'css', css: 'height:4px;', eligible: false }],
        };
      const style = { height: 4 },
        ref = {};
      const a = render({ identity: first, testID: 'peer', style }, ref);
      supported = !supported;
      const b = render({ identity: second, testID: 'peer', style }, ref);
      assert.equal(a.type, b.type);
      assert.equal(a.type, initiallySupported ? 'OwnedHost' : 'View');
      assert.equal(reads, 1);
      assert.equal(profiles, initiallySupported ? 1 : 0);
      assert.equal(a.props.ref, ref);
      assert.equal(b.props.ref, ref);
      assert.equal(b.props.style, style);
      assert.equal(Object.hasOwn(b.props, 'identity'), false);
      assert.equal(b.props.activation, undefined);
      assert.equal(loads.includes('./ownedStyleEncoding'), false);
      assert.equal(loads.includes('./structuralStyleActivation'), false);
      if (initiallySupported) {
        assert.equal(a.props.ownedProgramme.schema, 4);
        assert.equal(a.props.ownedProgramme.profile, profile);
        assert.equal(a.props.ownedProgramme.peer, first);
        assert.equal(b.props.ownedProgramme.peer, second);
      } else {
        assert.equal(Object.hasOwn(b.props, 'ownedProgramme'), false);
        assert.equal(loads.includes('./ownedStructuralHost'), false);
        assert.equal(loads.includes('./AltrooMUIStructuralViewNativeComponent'), false);
      }
    },
  );
}
