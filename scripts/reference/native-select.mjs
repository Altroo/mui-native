import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { build } from 'esbuild';
import assert from 'node:assert/strict';
import { resolve } from 'node:path';
import { loadReference } from './load.mjs';
const material = await loadReference('@mui/material', [
  'NativeSelect/NativeSelect.js',
  'NativeSelect/NativeSelect.d.ts',
  'NativeSelect/NativeSelectInput.js',
  'NativeSelect/NativeSelectInput.d.ts',
  'NativeSelect/nativeSelectClasses.js',
  'NativeSelect/nativeSelectClasses.d.ts',
  'Select/Select.js',
  'Select/Select.d.ts',
  'InputBase/InputBase.js',
  'InputBase/utils.js',
  'TextField/TextField.js',
  'TextField/TextField.d.ts',
]);
const lock = JSON.parse(await readFile(`${material.directory}/package-lock.json`, 'utf8'));
const renderer = lock.packages['node_modules/react-dom'];
if (renderer.version !== '19.3.0') throw new Error('Unexpected React DOM reference');
const artifact = '.cache/react-dom-19.3.0.tgz',
  bytes = await readFile(artifact);
const [algorithm, expected] = renderer.integrity.split('-');
if (createHash(algorithm).update(bytes).digest('base64') !== expected)
  throw new Error('React DOM integrity differs');
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
  if (!actual.equals(original)) throw new Error('Modified React DOM reference');
  sourceFiles[file] = createHash('sha256').update(actual).digest('hex');
}
const base = [
  { id: 'a', value: 'a', text: 'Alpha' },
  { id: 'b', value: 'b', text: 'Beta' },
  { id: 'c', value: 'c', text: 'Gamma' },
];
const cases = [
  { name: 'default native first option', options: base },
  { name: 'uncontrolled value and native event', options: base, actions: [{ change: ['b'] }] },
  {
    name: 'controlled string declines a native change',
    props: { value: 'a' },
    options: base,
    actions: [{ change: ['b'] }],
  },
  {
    name: 'numeric value stringifies',
    props: { value: 2 },
    options: [
      { id: 'a', value: 1, text: 'One' },
      { id: 'b', value: 2, text: 'Two' },
    ],
  },
  {
    name: 'missing controlled value falls back to first own-enabled option',
    props: { value: 'missing' },
    options: [
      { id: 'a', value: 'a', text: 'A', disabled: true },
      { id: 'b', value: 'b', text: 'B' },
    ],
  },
  {
    name: 'uncontrolled skips a disabled group initially',
    options: [
      { id: 'g', label: 'Group', disabled: true, options: [{ id: 'a', value: 'a', text: 'A' }] },
      { id: 'b', value: 'b', text: 'B' },
    ],
  },
  {
    name: 'authored missing value fallback inspects own disabled rather than group',
    props: { value: 'missing' },
    options: [
      { id: 'g', label: 'Group', disabled: true, options: [{ id: 'a', value: 'a', text: 'A' }] },
      { id: 'b', value: 'b', text: 'B' },
    ],
  },
  {
    name: 'matching disabled option can be selected programmatically',
    props: { value: 'a' },
    options: [
      { id: 'a', value: 'a', text: 'A', disabled: true },
      { id: 'b', value: 'b', text: 'B' },
    ],
  },
  {
    name: 'multiple has no implicit initial selection',
    props: { multiple: true },
    options: base,
    actions: [{ change: ['b', 'c'] }, { change: [] }],
  },
  {
    name: 'multiple exposes first string and option order',
    props: { multiple: true, defaultValue: ['c', 'a'] },
    options: base,
    actions: [{ change: ['b', 'c'] }],
  },
  {
    name: 'controlled multiple restores authored selection',
    props: { multiple: true, value: ['a', 'c'] },
    options: base,
    actions: [{ change: ['b'] }],
  },
  {
    name: 'empty option is a real value',
    props: { defaultValue: '' },
    options: [
      { id: 'a', value: '', text: 'None' },
      { id: 'b', value: 'b', text: 'Beta' },
    ],
    actions: [{ change: ['b'] }],
  },
  {
    name: 'option text supplies absent value and collapses HTML spaces',
    options: [{ id: 'a', text: '  Alpha\n  Beta  ' }],
  },
  {
    name: 'option label attribute differs from text value',
    options: [{ id: 'a', label: 'Visible', text: 'Value text' }],
  },
  {
    name: 'duplicate values single selects first match',
    props: { value: 'same' },
    options: [
      { id: 'a', value: 'same', text: 'First' },
      { id: 'b', value: 'same', text: 'Second' },
    ],
  },
  {
    name: 'duplicate values multiple selects every match',
    props: { multiple: true, value: ['same'] },
    options: [
      { id: 'a', value: 'same', text: 'First' },
      { id: 'b', value: 'same', text: 'Second' },
    ],
  },
  {
    name: 'uncontrolled selection survives value mutation on the same option node',
    props: { defaultValue: 'b' },
    options: base,
    actions: [{ options: base.map((x) => (x.id === 'b' ? { ...x, value: 'changed' } : x)) }],
  },
  {
    name: 'uncontrolled selected removal chooses first eligible remaining option',
    props: { defaultValue: 'b' },
    options: base,
    actions: [{ options: base.filter((x) => x.id !== 'b') }],
  },
  {
    name: 'uncontrolled selected key follows reorder',
    props: { defaultValue: 'b' },
    options: base,
    actions: [{ options: [base[2], base[1], base[0]] }],
  },
  {
    name: 'changing defaultValue alone does not reset selection',
    props: { defaultValue: 'b' },
    options: base,
    actions: [{ props: { defaultValue: 'c' } }],
  },
  {
    name: 'changing multiple resets to authored default',
    props: { defaultValue: ['b'] },
    options: base,
    actions: [{ props: { multiple: true } }, { props: { multiple: false } }],
  },
  {
    name: 'null value behaves as uncontrolled',
    props: { value: null },
    options: base,
    actions: [{ change: ['b'] }],
  },
  {
    name: 'controlled becomes uncontrolled preserving its last DOM state',
    props: { value: 'b' },
    options: base,
    actions: [{ props: { $remove: ['value'] } }, { change: ['c'] }],
  },
  {
    name: 'all disabled without an authored value has no selection',
    options: [{ id: 'a', value: 'a', text: 'A', disabled: true }],
  },
  { name: 'no options has empty string and minus-one index', options: [] },
  {
    name: 'child selected attribute initializes uncontrolled state',
    options: [{ ...base[0] }, { ...base[1], selected: true }, base[2]],
  },
  ...['SelectNative', 'TextFieldNative'].map((component) => ({
    name: component + ' composition',
    component,
    props: { defaultValue: 'b', name: 'choice' },
    options: base,
    actions: [{ change: ['c'] }],
  })),
];
cases.push(
  {
    name: 'empty option label falls back to text',
    options: [{ id: 'a', value: 'a', label: '', text: 'Alpha' }],
  },
  {
    name: 'single list size has no implicit selection',
    props: { inputProps: { size: 4 } },
    options: base,
  },
  {
    name: 'single list size retains an authored selection',
    props: { defaultValue: 'b', inputProps: { size: 4 } },
    options: base,
  },
  {
    name: 'changing selected attributes updates the same uncontrolled option',
    options: base,
    actions: [{ options: base.map((x) => ({ ...x, selected: x.id === 'c' })) }],
  },
);
for (const test of cases) {
  if (!test.component && test.props && Object.hasOwn(test.props, 'multiple')) {
    const { multiple, ...rest } = test.props;
    test.props = { ...rest, inputProps: { multiple } };
  }
  if (!test.component)
    for (const action of test.actions ?? [])
      if (action.props && Object.hasOwn(action.props, 'multiple')) {
        const { multiple, ...rest } = action.props;
        action.props = { ...rest, inputProps: { multiple } };
      }
}
const provenance = {
  material: material.reference,
  renderer: {
    name: 'react-dom',
    version: renderer.version,
    integrity: renderer.integrity,
    sourceFiles,
  },
  scope:
    'Actual original MUI and React DOM in Chromium; DOM option/value/change contracts only, not physical native picker evidence.',
};
const fixture = JSON.parse(
  await readFile('tests/fixtures/mui-native-select-browser-9.5.0.json', 'utf8'),
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
}
const directory = resolve('.cache/native-select-reference');
await mkdir(directory, { recursive: true });
await writeFile(`${directory}/input.json`, JSON.stringify({ cases, provenance }, null, 2));
const path = material.directory;
const source = `
import React from ${JSON.stringify(path + '/node_modules/react/index.js')};
import {createRoot} from ${JSON.stringify(path + '/node_modules/react-dom/client.js')};
import {flushSync} from ${JSON.stringify(path + '/node_modules/react-dom/index.js')};
import NativeSelect from ${JSON.stringify(path + '/node_modules/@mui/material/NativeSelect/NativeSelect.js')};
import Select from ${JSON.stringify(path + '/node_modules/@mui/material/Select/Select.js')};
import TextField from ${JSON.stringify(path + '/node_modules/@mui/material/TextField/TextField.js')};
const input=${JSON.stringify({ cases, provenance })};
const expected=${JSON.stringify(fixture)};
function children(items){return items.map(item=>item.options?React.createElement('optgroup',{key:item.id,label:item.label,disabled:item.disabled,'data-case':item.id},children(item.options)):React.createElement('option',{key:item.id,value:item.value,label:item.label,disabled:item.disabled,selected:item.selected,'data-case':item.id},item.text));}
function snapshot(node){return {value:node.value,selectedIndex:node.selectedIndex,multiple:node.multiple,options:Array.from(node.options,x=>({id:x.dataset.case,value:x.value,label:x.label,text:x.text,selected:x.selected,disabled:x.disabled,groupDisabled:!!x.parentElement.closest('optgroup')?.disabled}))};}
window.runReference=()=>{const fixtures=[];for(const test of input.cases){const trace=[],form=document.createElement('form');document.body.append(form);const root=createRoot(form);let props={...test.props},items=test.options;const paint=()=>flushSync(()=>root.render(React.createElement(test.component==='SelectNative'?Select:test.component==='TextFieldNative'?TextField:NativeSelect,{...props,...(test.component==='SelectNative'?{native:true}:test.component==='TextFieldNative'?{select:true,slotProps:{select:{native:true}}}:{}),onChange:(event,child)=>trace.push({value:event.target.value,name:event.target.name,selected:Array.from(event.target.selectedOptions,x=>x.dataset.case),current: event.currentTarget===event.target, child:child===undefined?'undefined':'present'})},children(items))));paint();const states=[snapshot(form.querySelector('select'))];for(const action of test.actions??[]){if(action.props){const {$remove,...next}=action.props;props={...props,...next};for(const name of $remove??[])delete props[name];paint();}if(action.options){items=action.options;paint();}if(action.change){const node=form.querySelector('select');if(!node.multiple)node.selectedIndex=-1;for(const option of node.options)option.selected=action.change.includes(option.dataset.case);node.dispatchEvent(new Event('change',{bubbles:true}));}states.push(snapshot(form.querySelector('select')));}fixtures.push({input:test,states,trace});flushSync(()=>root.unmount());form.remove();}window.referenceResult={...input.provenance,fixtures};return window.referenceResult;};
window.verifyReference=()=>{const result=window.runReference();if(JSON.stringify(result)!==JSON.stringify(expected))throw new Error('Original NativeSelect contracts differ from the recorded fixture');return {passed:result.fixtures.length,material:result.material.version,renderer:result.renderer.version};};
const button=document.createElement('button');button.textContent='Verify original NativeSelect contracts';const status=document.createElement('pre');button.onclick=()=>{try{status.textContent=JSON.stringify(window.verifyReference(),null,2);}catch(error){status.textContent=String(error);throw error;}};document.body.append(button,status);

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
  '<!doctype html><meta charset="utf-8"><title>Original NativeSelect contracts</title><script defer src="bundle.js"></script>',
);
console.log(
  `Verified source/fixture inputs; execute window.verifyReference() in Chromium. Original reference built: ${directory}/index.html (${cases.length} cases).`,
);
