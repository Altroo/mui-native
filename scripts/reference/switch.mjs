import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { build } from 'esbuild';
import assert from 'node:assert/strict';
import { loadReference } from './load.mjs';
const material = await loadReference('@mui/material', [
  'Switch/Switch.js',
  'Switch/Switch.d.ts',
  'Switch/switchClasses.js',
  'Switch/switchClasses.d.ts',
  'internal/SwitchBase.js',
  'internal/SwitchBase.d.ts',
  'FormControlLabel/FormControlLabel.js',
  'utils/useSlot.js',
  'styles/shadows.js',
]);
const supporting = JSON.parse(
  await readFile('tests/fixtures/mui-check-controls-browser-9.5.0.json', 'utf8'),
);
// The checked-control reference verifies React DOM artifact/source integrity before this probe is built.
const { execFileSync } = await import('node:child_process');
execFileSync(process.execPath, ['scripts/reference/check-controls.mjs', '--check'], {
  stdio: 'pipe',
});
const cases = [
  { name: 'default toggles twice', actions: [{ click: true }, { click: true }] },
  { name: 'controlled declines toggle', props: { checked: false }, actions: [{ click: true }] },
  { name: 'default checked', props: { defaultChecked: true } },
  { name: 'numeric value', props: { value: 42, name: 'answer' }, actions: [{ click: true }] },
  { name: 'disabled ignores activation', props: { disabled: true }, actions: [{ click: true }] },
  { name: 'readOnly retains MUI model', props: { readOnly: true }, actions: [{ click: true }] },
  { name: 'required metadata', props: { required: true } },
  {
    name: 'input name value override',
    props: { name: 'outer', value: 'outer' },
    input: { name: 'inner', value: 'inner' },
    actions: [{ click: true }],
  },
  { name: 'input change cancellation', cancel: 'input', actions: [{ click: true }] },
  { name: 'root click cancellation', cancel: 'root', actions: [{ click: true }] },
  { name: 'input click propagation', stop: true, actions: [{ click: true }] },
  { name: 'source callback order', actions: [{ click: true }] },
  {
    name: 'switchBase checked does not replace model',
    props: { checked: true },
    base: { checked: false },
  },
  {
    name: 'switchBase name value do not replace input',
    props: { name: 'outer', value: 'outer' },
    base: { name: 'inner', value: 'inner' },
  },
  { name: 'input checked differs from visual', input: { checked: true } },
  { name: 'input checkbox role overrides switch default', input: { role: 'checkbox' } },
  { name: 'small secondary', props: { size: 'small', color: 'secondary', defaultChecked: true } },
  { name: 'default color dark', mode: 'dark', props: { color: 'default', defaultChecked: true } },
  { name: 'disabled checked primary', props: { disabled: true, checked: true } },
  { name: 'dark disabled checked', mode: 'dark', props: { disabled: true, checked: true } },
  { name: 'label toggles', label: true, actions: [{ label: true }] },
  {
    name: 'label disabled',
    label: true,
    labelProps: { disabled: true },
    actions: [{ label: true }],
  },
  { name: 'form disabled inheritance', form: { disabled: true }, actions: [{ click: true }] },
  {
    name: 'explicit false beats form disabled',
    form: { disabled: true },
    props: { disabled: false },
    actions: [{ click: true }],
  },
  { name: 'custom unchecked icon', props: { icon: 'Off' } },
  { name: 'custom checked icon', props: { checked: true, checkedIcon: 'On' } },
  {
    name: 'null icons remove thumb',
    props: { icon: null, checkedIcon: null },
    actions: [{ click: true }],
  },
  { name: 'input change mutation controls next state', mutate: true, actions: [{ click: true }] },
];
const keyboardCases = [
  { name: 'Switch Enter', kind: 'Switch', keys: ['Enter'] },
  { name: 'Switch Space', kind: 'Switch', keys: ['Space'] },
  { name: 'Switch canceled Space', kind: 'Switch', cancelSpace: true, keys: ['Space'] },
];
let keyboardFixture;
try {
  keyboardFixture = JSON.parse(
    await readFile('tests/fixtures/mui-switch-keyboard-9.5.0.json', 'utf8'),
  );
} catch (error) {
  if (error.code !== 'ENOENT') throw error;
}
cases.push(
  { name: 'top-level sx spacing', props: { sx: { mt: 2 } } },
  { name: 'root slot sx precedence', props: { sx: { mt: 2 } }, root: { sx: { mt: 3 } } },
  {
    name: 'style applies to switchBase and root style stays separate',
    props: { style: { opacity: 0.7 } },
    root: { style: { opacity: 0.8 } },
  },
);
cases.push({
  name: 'checked selector belongs to switchBase',
  props: { checked: true, sx: { '&.Mui-checked': { opacity: 0.27 } } },
  base: { sx: { '&.Mui-checked': { opacity: 0.37 } } },
});
cases.push({ name: 'track fills changed root width', props: { sx: { width: 68 } } });
cases.push({
  name: 'theme margin overrides default edge',
  props: { edge: 'start' },
  overrides: { root: { marginLeft: 0 } },
});
const helper = material.require(
  `${material.directory}/node_modules/@mui/material/Switch/switchClasses.js`,
);
const provenance = {
  material: material.reference,
  renderer: supporting.renderer,
  scope:
    'Actual original MUI Switch in Chromium: model, input/event/slot and static computed-style observations with transitions disabled; no physical native UI evidence.',
};
let fixture;
try {
  fixture = JSON.parse(await readFile('tests/fixtures/mui-switch-browser-9.5.0.json', 'utf8'));
} catch (error) {
  if (error.code !== 'ENOENT') throw error;
}
if (process.argv.includes('--check')) {
  assert(fixture);
  assert.deepEqual(
    fixture.fixtures.map((test) => test.input),
    cases,
  );
  assert.deepEqual(fixture.material, material.reference);
  assert.deepEqual(fixture.renderer, provenance.renderer);
  assert.deepEqual(fixture.helpers, helper.default);
  assert(keyboardFixture);
  assert.deepEqual(
    keyboardFixture.fixtures.map((test) => test.input),
    keyboardCases,
  );
  assert.deepEqual(keyboardFixture.material, material.reference);
  assert.deepEqual(keyboardFixture.renderer, provenance.renderer);
}
const path = material.directory,
  directory = resolve('.cache/switch-reference');
await mkdir(directory, { recursive: true });
const source = `
import React from ${JSON.stringify(path + '/node_modules/react/index.js')};
import {createRoot} from ${JSON.stringify(path + '/node_modules/react-dom/client.js')};
import {flushSync} from ${JSON.stringify(path + '/node_modules/react-dom/index.js')};
import {Switch,FormControlLabel,FormControl,ThemeProvider,createTheme} from ${JSON.stringify(path + '/node_modules/@mui/material/index.js')};
import {installKeyboardReference} from ${JSON.stringify(resolve('scripts/reference/check-controls-keyboard.mjs'))};
installKeyboardReference(React,createRoot,flushSync,{Switch});
window.switchKeyboardCases=${JSON.stringify(keyboardCases)};
const expectedKeyboard=${JSON.stringify(keyboardFixture?.fixtures ?? null)};
window.verifySwitchKeyboardReference=observed=>{if(JSON.stringify(observed)!==JSON.stringify(expectedKeyboard))throw new Error('Original Switch keyboard reference differs');return {passed:observed.length};};
const input=${JSON.stringify({ cases, provenance, helpers: helper.default })};const expected=${JSON.stringify(fixture ?? null)};
window.runReference=()=>{const fixtures=[];for(const test of input.cases){const container=document.createElement('div');document.body.append(container);const root=createRoot(container),trace=[],owners={};const theme=createTheme({palette:{mode:test.mode??'light'},components:{MuiSwitch:{styleOverrides:Object.fromEntries(['root','switchBase','thumb','track'].map(slot=>[slot,({ownerState})=>{owners[slot]=Object.fromEntries(['checked','disabled','color','edge','size'].filter(key=>ownerState[key]!==undefined).map(key=>[key,ownerState[key]]));return test.overrides?.[slot]??{};}]))}}});
const control=React.createElement(Switch,{id:'a',...test.props,slotProps:{root:test.root,switchBase:{...test.base,onChange:event=>trace.push({kind:'base-change',checked:event.target.checked})},input:{...test.input,onClick:event=>{trace.push({kind:'input-click',checked:event.target.checked});if(test.stop)event.stopPropagation();},onChange:event=>{trace.push({kind:'input-change',checked:event.target.checked});if(test.cancel==='input')event.preventDefault();if(test.mutate)event.target.checked=false;}}},onClick:event=>{trace.push({kind:'click',checked:event.target.checked});if(test.cancel==='root')event.preventDefault();},onChange:(event,checked)=>trace.push({kind:'change',checked,value:event.target.value,name:event.target.name})});let body=test.label?React.createElement(FormControlLabel,{label:'Label',...test.labelProps,control}):control;if(test.form)body=React.createElement(FormControl,test.form,body);flushSync(()=>root.render(React.createElement(ThemeProvider,{theme},body)));
const snapshot=()=>{const node=container.querySelector('input'),base=node.parentElement,outer=base.parentElement,thumb=outer.querySelector('.MuiSwitch-thumb'),track=outer.querySelector('.MuiSwitch-track');const style=element=>{if(!element)return null;const css=getComputedStyle(element);return Object.fromEntries(['width','height','backgroundColor','color','opacity','transform','marginTop','marginLeft','marginRight'].map(key=>[key,css[key]]));};return {checked:node.checked,modelChecked:base.classList.contains('Mui-checked'),value:node.value,name:node.name,disabled:node.disabled,readOnly:node.readOnly,required:node.required,role:node.getAttribute('role'),thumbText:thumb?.textContent??null,baseText:base.textContent,styles:{root:style(outer),base:style(base),thumb:style(thumb),track:style(track)},owners:JSON.parse(JSON.stringify(owners))};};const states=[snapshot()];for(const action of test.actions??[]){flushSync(()=>action.label?container.querySelector('label').click():container.querySelector('input').click());states.push(snapshot());}fixtures.push({input:test,states,trace});flushSync(()=>root.unmount());container.remove();}return {...input.provenance,helpers:input.helpers,fixtures};};
window.verifyReference=()=>{const value=window.runReference();if(JSON.stringify(value)!==JSON.stringify(expected))throw new Error('Original Switch reference differs');return {passed:value.fixtures.length};};
const button=document.createElement('button');button.textContent='Verify original Switch';const status=document.createElement('pre');button.onclick=()=>status.textContent=JSON.stringify(window.verifyReference(),null,2);document.body.append(button,status);
`;
await build({
  stdin: { contents: source, loader: 'js', resolveDir: process.cwd() },
  bundle: true,
  platform: 'browser',
  format: 'iife',
  outfile: `${directory}/bundle.js`,
  define: { 'process.env.NODE_ENV': '"development"' },
});
await writeFile(
  `${directory}/index.html`,
  '<!doctype html><meta charset="utf-8"><title>Original Switch contracts</title><style>*,*::before,*::after{transition:none!important;animation:none!important}</style><script defer src="bundle.js"></script>',
);
console.log(
  `Verified source; reference built in ${directory} (${cases.length} cases). Browser execution is separate.`,
);
