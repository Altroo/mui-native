import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { build } from 'esbuild';
import { resolve } from 'node:path';
import assert from 'node:assert/strict';
import { loadReference } from './load.mjs';
const names = ['Checkbox', 'Radio', 'RadioGroup', 'FormGroup', 'FormControlLabel'];
const material = await loadReference('@mui/material', [
  ...names.flatMap((name) => [
    `${name}/${name}.js`,
    `${name}/${name}.d.ts`,
    `${name}/${name[0].toLowerCase() + name.slice(1)}Classes.js`,
  ]),
  'internal/SwitchBase.js',
  'internal/SwitchBase.d.ts',
  'RadioGroup/useRadioGroup.js',
  'RadioGroup/RadioGroupContext.js',
  'utils/useSlot.js',
  'FormControl/FormControl.js',
  'utils/mergeSlotProps.js',
]);
const lock = JSON.parse(await readFile(`${material.directory}/package-lock.json`, 'utf8')),
  renderer = lock.packages['node_modules/react-dom'];
const artifact = resolve('.cache/react-dom-19.3.0.tgz'),
  bytes = await readFile(artifact),
  [algorithm, expected] = renderer.integrity.split('-');
if (
  renderer.version !== '19.3.0' ||
  createHash(algorithm).update(bytes).digest('base64') !== expected
)
  throw new Error('Invalid React DOM artifact');
const sourceFiles = {};
for (const file of ['LICENSE', 'cjs/react-dom-client.development.js']) {
  const actual = await readFile(`${material.directory}/node_modules/react-dom/${file}`);
  const original = execFileSync(
    'python3',
    [
      '-c',
      'import tarfile,sys;sys.stdout.buffer.write(tarfile.open(sys.argv[1]).extractfile("package/"+sys.argv[2]).read())',
      artifact,
      file,
    ],
    { maxBuffer: actual.byteLength + 65536 },
  );
  if (!actual.equals(original)) throw new Error('Modified React DOM source');
  sourceFiles[file] = createHash('sha256').update(actual).digest('hex');
}
const cases = [
  {
    name: 'checkbox default and toggle',
    kind: 'Checkbox',
    actions: [{ click: 'a' }, { click: 'a' }],
  },
  {
    name: 'checkbox controlled declines change',
    kind: 'Checkbox',
    props: { checked: false },
    actions: [{ click: 'a' }],
  },
  { name: 'checkbox default checked', kind: 'Checkbox', props: { defaultChecked: true } },
  {
    name: 'checkbox mixed stays mixed through changes',
    kind: 'Checkbox',
    props: { indeterminate: true },
    actions: [{ click: 'a' }, { click: 'a' }],
  },
  {
    name: 'checkbox numeric value',
    kind: 'Checkbox',
    props: { value: 42 },
    actions: [{ click: 'a' }],
  },
  {
    name: 'checkbox disabled does not publish',
    kind: 'Checkbox',
    props: { disabled: true },
    actions: [{ click: 'a' }],
  },
  {
    name: 'checkbox read only suppresses change',
    kind: 'Checkbox',
    props: { readOnly: true },
    actions: [{ click: 'a' }],
  },
  {
    name: 'input change cancellation suppresses control change',
    kind: 'Checkbox',
    cancel: 'input',
    actions: [{ click: 'a' }],
  },
  {
    name: 'root click cancellation suppresses change',
    kind: 'Checkbox',
    cancel: 'click',
    actions: [{ click: 'a' }],
  },
  {
    name: 'checkbox input/root/change callback ordering',
    kind: 'Checkbox',
    actions: [{ click: 'a' }],
  },
  {
    name: 'input slot value and name override',
    kind: 'Checkbox',
    props: { name: 'outer', value: 'outer' },
    inputProps: { name: 'inner', value: 'inner' },
    actions: [{ click: 'a' }],
  },
  { name: 'single radio selects once', kind: 'Radio', actions: [{ click: 'a' }, { click: 'a' }] },
  {
    name: 'radio group initial and change strings',
    kind: 'group',
    props: { defaultValue: 1, name: 'group' },
    options: [
      { id: 'a', value: 1 },
      { id: 'b', value: 2 },
    ],
    actions: [{ click: 'b' }, { click: 'b' }],
  },
  {
    name: 'controlled radio group declines change',
    kind: 'group',
    props: { value: 'a', name: 'group' },
    options: [
      { id: 'a', value: 'a' },
      { id: 'b', value: 'b' },
    ],
    actions: [{ click: 'b' }],
  },
  {
    name: 'explicit radio checked overrides group',
    kind: 'group',
    props: { value: 'a', name: 'group' },
    options: [
      { id: 'a', value: 'a', checked: false },
      { id: 'b', value: 'b', checked: true },
    ],
  },
  {
    name: 'radio own name overrides group name',
    kind: 'group',
    props: { defaultValue: 'a', name: 'group' },
    options: [
      { id: 'a', value: 'a' },
      { id: 'b', value: 'b', name: 'own' },
    ],
    actions: [{ click: 'b' }],
  },
  ...['end', 'start', 'top', 'bottom'].map((labelPlacement) => ({
    name: 'label placement ' + labelPlacement,
    kind: 'label',
    labelProps: { labelPlacement },
    actions: [{ label: true }],
  })),
  {
    name: 'label propagates missing checked name value and change',
    kind: 'label',
    controlChange: false,
    labelProps: { checked: true, name: 'label', value: 'label' },
    actions: [{ label: true }],
  },
  {
    name: 'control props beat label fallbacks',
    kind: 'label',
    props: { checked: false, name: 'control', value: 'control' },
    labelProps: { checked: true, name: 'label', value: 'label' },
    actions: [{ label: true }],
  },
  {
    name: 'form disabled inheritance',
    kind: 'label',
    form: { disabled: true },
    actions: [{ label: true }],
  },
  {
    name: 'explicit label false beats control disabled true',
    kind: 'label',
    props: { disabled: true },
    labelProps: { disabled: false },
    actions: [{ label: true }],
  },
  {
    name: 'form error and required label',
    kind: 'label',
    form: { error: true, required: true },
    labelProps: { required: true },
  },
];
const helpers = Object.fromEntries(
  names.map((name) => {
    const helper = material.require(
      `${material.directory}/node_modules/@mui/material/${name}/${name[0].toLowerCase() + name.slice(1)}Classes.js`,
    );
    return [name, helper.default];
  }),
);
const provenance = {
  material: material.reference,
  renderer: {
    name: 'react-dom',
    version: renderer.version,
    integrity: renderer.integrity,
    sourceFiles,
  },
  scope:
    'Actual MUI/React DOM in Chromium: checked values/events/state/label composition. Browser DOM state and native glyph state can differ; no native-device evidence.',
};
const keyboardCases = [
  {
    name: 'checkbox Enter',
    kind: 'Checkbox',
    keys: ['Enter'],
  },
  {
    name: 'checkbox Space',
    kind: 'Checkbox',
    keys: ['Space'],
  },
  {
    name: 'checkbox canceled Space',
    kind: 'Checkbox',
    cancelSpace: true,
    keys: ['Space'],
  },
  {
    name: 'radio LTR wraps',
    kind: 'group',
    keys: ['ArrowRight', 'ArrowRight', 'ArrowRight'],
  },
  {
    name: 'radio RTL',
    kind: 'group',
    rtl: true,
    keys: ['ArrowRight', 'ArrowLeft'],
  },
  {
    name: 'radio skips disabled',
    kind: 'group',
    options: [
      {
        id: 'a',
        value: 'a',
      },
      {
        id: 'b',
        value: 'b',
        disabled: true,
      },
      {
        id: 'c',
        value: 'c',
      },
    ],
    keys: ['ArrowRight', 'ArrowRight'],
  },
  {
    name: 'radio own name separate traversal',
    kind: 'group',
    options: [
      {
        id: 'a',
        value: 'a',
      },
      {
        id: 'b',
        value: 'b',
        name: 'own',
      },
      {
        id: 'c',
        value: 'c',
      },
    ],
    keys: ['ArrowRight'],
  },
  {
    name: 'radio Space',
    kind: 'group',
    focus: 'b',
    keys: ['Space'],
  },
  {
    name: 'radio Enter',
    kind: 'group',
    focus: 'b',
    keys: ['Enter'],
  },
];
const fixture = JSON.parse(
  await readFile('tests/fixtures/mui-check-controls-browser-9.5.0.json', 'utf8'),
);
const keyboardFixture = JSON.parse(
  await readFile('tests/fixtures/mui-check-controls-keyboard-9.5.0.json', 'utf8'),
);
if (process.argv.includes('--check')) {
  assert.deepEqual(
    fixture.fixtures.map((test) => test.input),
    cases,
  );
  assert.deepEqual(
    { material: fixture.material, renderer: fixture.renderer, scope: fixture.scope },
    provenance,
  );
  assert.deepEqual(fixture.helpers, helpers);
  assert.deepEqual(keyboardFixture.material, material.reference);
  assert.deepEqual(keyboardFixture.renderer, provenance.renderer);
  assert.deepEqual(
    keyboardFixture.fixtures.map((test) => test.input),
    keyboardCases,
  );
}
const directory = resolve('.cache/check-controls-reference');
await mkdir(directory, { recursive: true });
const path = material.directory;
const source = `
import React from ${JSON.stringify(path + '/node_modules/react/index.js')};
import {createRoot} from ${JSON.stringify(path + '/node_modules/react-dom/client.js')};
import {flushSync} from ${JSON.stringify(path + '/node_modules/react-dom/index.js')};
import {Checkbox,Radio,RadioGroup,FormControlLabel,FormControl,ThemeProvider,createTheme} from ${JSON.stringify(path + '/node_modules/@mui/material/index.js')};
import {installKeyboardReference} from ${JSON.stringify(resolve('scripts/reference/check-controls-keyboard.mjs'))};
installKeyboardReference(React,createRoot,flushSync,{Checkbox,Radio,RadioGroup});
const input=${JSON.stringify({ cases, provenance, helpers })};
const expected=${JSON.stringify(fixture)};
window.keyboardReferenceCases=${JSON.stringify(keyboardCases)};
const expectedKeyboard=${JSON.stringify(keyboardFixture.fixtures)};
window.verifyKeyboardReference=observed=>{if(JSON.stringify(observed)!==JSON.stringify(expectedKeyboard))throw new Error('Original trusted keyboard contracts differ');return {passed:observed.length};};
window.runReference=()=>{const fixtures=[];for(const test of input.cases){const trace=[],owners={};const container=document.createElement('div');document.body.append(container);const root=createRoot(container);let props={...test.props};const change=(id)=>(event,checked)=>trace.push({kind:'change',id,checked,value:event.target.value,name:event.target.name,indeterminate:event.target.indeterminate});const control=(item)=>React.createElement(test.kind==='Radio'||test.kind==='group'?Radio:Checkbox,{id:item.id,...props,...item,slotProps:{input:{...test.inputProps,onClick:e=>{trace.push({kind:'input-click',checked:e.target.checked});},onChange:e=>{trace.push({kind:'input-change',checked:e.target.checked});if(test.cancel==='input')e.preventDefault();}}},onClick:e=>{trace.push({kind:'click',checked:e.target.checked});if(test.cancel==='click')e.preventDefault();},onChange:test.controlChange===false?undefined:change(item.id)});
const theme=createTheme({components:Object.fromEntries(['MuiCheckbox','MuiRadio','MuiFormControlLabel','MuiFormGroup'].map(name=>[name,{styleOverrides:{root:({ownerState})=>{owners[name]=Object.fromEntries(['checked','disabled','color','size','indeterminate','labelPlacement','required','error','row'].filter(key=>ownerState[key]!==undefined).map(key=>[key,ownerState[key]]));return {};}}}]))});
const render=()=>{let body=test.kind==='group'?React.createElement(RadioGroup,{...props,onChange:(e,value)=>trace.push({kind:'group',value,name:e.target.name})},test.options.map(control)):test.kind==='label'?React.createElement(FormControlLabel,{label:'Label',...test.labelProps,onChange:(e,checked)=>trace.push({kind:'label-change',checked}),control:control({id:'a'})}):control({id:'a'});if(test.form)body=React.createElement(FormControl,test.form,body);return React.createElement(ThemeProvider,{theme},body);};flushSync(()=>root.render(render()));const snapshot=()=>({controls:Array.from(container.querySelectorAll('input'),node=>({id:node.id,checked:node.checked,modelChecked:node.parentElement.classList.contains('Mui-checked'),defaultChecked:node.defaultChecked,indeterminate:node.indeterminate,value:node.value,name:node.name,disabled:node.disabled,required:node.required,readOnly:node.readOnly})),owners:JSON.parse(JSON.stringify(owners))});const states=[snapshot()];for(const action of test.actions??[]){if(action.click)flushSync(()=>container.querySelector('#'+action.click).click());if(action.label)flushSync(()=>container.querySelector('label').click());states.push(snapshot());}fixtures.push({input:test,states,trace});flushSync(()=>root.unmount());container.remove();}window.referenceResult={...input.provenance,helpers:input.helpers,fixtures};return window.referenceResult;};
window.verifyReference=()=>{const observed=window.runReference();if(JSON.stringify(observed)!==JSON.stringify(expected))throw new Error('Original checked-control contracts differ');return {passed:observed.fixtures.length,material:observed.material.version,renderer:observed.renderer.version};};
const button=document.createElement('button');button.textContent='Verify original checked-control contracts';const status=document.createElement('pre');button.onclick=()=>{status.textContent=JSON.stringify(window.verifyReference(),null,2);};document.body.append(button,status);
`;
await build({
  stdin: { contents: source, resolveDir: process.cwd(), loader: 'js' },
  bundle: true,
  platform: 'browser',
  format: 'iife',
  outfile: `${directory}/bundle.js`,
  define: { 'process.env.NODE_ENV': '"development"' },
});
await writeFile(
  `${directory}/index.html`,
  '<!doctype html><meta charset="utf-8"><title>Original checked-control contracts</title><script defer src="bundle.js"></script>',
);
console.log(
  `Verified source/fixture inputs. Execute window.verifyReference() and trusted keyboard driver in Chromium: ${directory}/index.html (${cases.length} cases).`,
);
