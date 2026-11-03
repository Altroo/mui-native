// Copyright (c) 2026 Altroo and contributors.
// SPDX-License-Identifier: MIT
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { loadReference } from './load.mjs';
const material = await loadReference('@mui/material', [
  'Autocomplete/Autocomplete.js',
  'Autocomplete/Autocomplete.d.ts',
  'Autocomplete/autocompleteClasses.js',
  'useAutocomplete/useAutocomplete.js',
  'useAutocomplete/useAutocomplete.d.ts',
]);
const parent = JSON.parse(
  await readFile('tests/fixtures/mui-portal-browser-9.5.0.json', { encoding: 'utf8' }),
);
const provenance = {
  material: material.reference,
  renderer: parent.renderer,
  scope:
    'Original Autocomplete component values, callbacks, renderValue, grouped cached exits, slot owner state, loading and free-solo composition in Chromium. Native transport, accessibility and physical keyboards are separate gates.',
};
let expected;
try {
  expected = JSON.parse(
    await readFile('tests/fixtures/mui-autocomplete-component-browser-9.5.0.json', {
      encoding: 'utf8',
    }),
  );
} catch (error) {
  if (error.code !== 'ENOENT') throw error;
}
if (process.argv.includes('--check')) {
  assert(expected);
  assert.deepEqual(expected.material, provenance.material);
  assert.deepEqual(expected.renderer, provenance.renderer);
}
const base = material.directory,
  directory = resolve('.cache/autocomplete-component-reference');
await mkdir(directory, { recursive: true });
const source = `
import React from ${JSON.stringify(base + '/node_modules/react/index.js')};
import * as ReactDOMClient from ${JSON.stringify(base + '/node_modules/react-dom/client.js')};
const {createRoot}=ReactDOMClient;
import * as ReactDOM from ${JSON.stringify(base + '/node_modules/react-dom/index.js')};
const {flushSync}=ReactDOM;
import Autocomplete from ${JSON.stringify(base + '/node_modules/@mui/material/Autocomplete/index.js')};
import TextField from ${JSON.stringify(base + '/node_modules/@mui/material/TextField/index.js')};
const provenance=${JSON.stringify(provenance)}, expected=${JSON.stringify(expected ?? null)};
const settle=async()=>{await Promise.resolve();await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));};
window.runReference=async()=>{
 const observations=[];
 const options=[{id:1,label:'Rabat',region:'Capital'},{id:2,label:'Casablanca',region:'Coast'},{id:3,label:'Essaouira',region:'Coast'}];
 async function scenario(name,props,steps){
  const mount=document.createElement('div');document.body.append(mount);const root=createRoot(mount);const calls=[];let params,owner,renderedValue;
  const Popper=React.forwardRef(function Popper({children,open,ownerState,disablePortal,anchorEl,placement,popperRef,modifiers,keepMounted,...rest},ref){return React.createElement('div',{...rest,ref,'data-popup':open?'open':'closed'},children);});
  let current={...props};
  const render=async()=>{
   const {captureValue,...forwarded}=current;
   flushSync(()=>root.render(React.createElement(Autocomplete,{options,disablePortal:true,slots:{popper:Popper},...forwarded,
    onChange:(e,value,reason,details)=>calls.push(['change',value,reason,details??null]),
    onClose:(e,reason)=>calls.push(['close',reason]),
    onInputChange:(e,value,reason)=>calls.push(['input',value,reason]),
    renderInput:value=>{params=value;return React.createElement(TextField,{...value,label:'City'});},
    ...(captureValue?{renderValue:(value,getItemProps,state)=>{renderedValue=value;owner=state;const bindings=getItemProps();return React.createElement('span',{'data-value':'yes','data-item-index':bindings['data-item-index']},String(value));}}:{}),
    slotProps:{...current.slotProps,root:state=>{owner=state;return {'data-root':'yes'};}}
   })));await settle();
  };
  const input=()=>mount.querySelector('input');
  const snapshot=label=>{
   const active=input().getAttribute('aria-activedescendant');
   const rows=[...mount.querySelectorAll('[role=option]')];
   observations.push({scenario:name,label,input:input().value,expanded:input().getAttribute('aria-expanded'),
    highlighted:active?document.getElementById(active)?.textContent??null:null,
    rows:rows.map(row=>({label:row.textContent,selected:row.getAttribute('aria-selected')==='true',disabled:row.getAttribute('aria-disabled')==='true'})),
    clear:!!mount.querySelector('[aria-label=Clear]'),popup:mount.querySelector('[data-popup]')?.getAttribute('data-popup')??null,
    loading:mount.textContent.includes('Loading'),noOptions:mount.textContent.includes('No options'),
    renderValue:renderedValue??null,
    inputParams:{fullWidth:params.fullWidth,size:params.size??null,slots:Object.keys(params.slotProps).sort()},
    owner:{focused:owner.focused,popupOpen:owner.popupOpen,hasClearIcon:owner.hasClearIcon,hasPopupIcon:owner.hasPopupIcon,inputFocused:owner.inputFocused},
    calls:calls.splice(0)});
  };
  const focus=async()=>{input().focus();await settle();};
  const type=async text=>{await focus();const setter=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set;flushSync(()=>{setter.call(input(),text);input().dispatchEvent(new Event('input',{bubbles:true}));});await settle();};
  const key=async name=>{flushSync(()=>input().dispatchEvent(new KeyboardEvent('keydown',{key:name,bubbles:true,cancelable:true})));await settle();};
  const click=async label=>{const row=[...mount.querySelectorAll('[role=option]')].find(row=>row.textContent===label);if(!row)throw Error('Missing '+label);flushSync(()=>row.dispatchEvent(new MouseEvent('click',{bubbles:true})));await settle();};
  try { await render();await steps({snapshot,focus,type,key,click,update:async next=>{current={...current,...next};await render();}}); }
  finally {flushSync(()=>root.unmount());mount.remove();await settle();}
 }
 await scenario('raw selection',{},async s=>{await s.type('casa');s.snapshot('filtered');await s.click('Casablanca');s.snapshot('selected');});
 await scenario('mapped controlled',{value:1,getOptionValue:o=>o.id},async s=>{s.snapshot('initial');await s.type('Casa');await s.click('Casablanca');s.snapshot('request');});
 await scenario('mapped multiple',{multiple:true,value:[1,2],getOptionValue:o=>o.id,filterSelectedOptions:true,open:true},async s=>{s.snapshot('remaining');await s.click('Essaouira');s.snapshot('request');});
 await scenario('disabled navigation',{open:true,autoHighlight:true,getOptionDisabled:o=>o.id===2},async s=>{await s.focus();await s.key('ArrowDown');s.snapshot('skipped');});
 await scenario('free solo commit',{freeSolo:true,autoHighlight:true},async s=>{await s.type('New city');await s.key('Enter');s.snapshot('created');});
 await scenario('scalar renderValue',{value:1,getOptionValue:o=>o.id,captureValue:true},async s=>{s.snapshot('rendered');});
 await scenario('loading and empty',{options:[],open:true,loading:true},async s=>{s.snapshot('loading');await s.update({loading:false});s.snapshot('empty');await s.update({freeSolo:true});s.snapshot('free solo suppressed');await s.update({slotProps:{popper:()=>({keepMounted:true})}});s.snapshot('kept');});
 await scenario('grouped exit cache',{open:true,groupBy:o=>o.region},async s=>{s.snapshot('open');await s.update({open:false,groupBy:undefined});s.snapshot('cached');await s.update({open:true,options:[]});s.snapshot('fresh empty');});
 await scenario('read only and disabled',{multiple:true,value:[options[0]],readOnly:true},async s=>{s.snapshot('read only');await s.update({disabled:true});s.snapshot('disabled');});
 return {...provenance,observations};
};
window.verifyReference=async()=>{if(!expected)throw Error('No recorded fixture');const actual=await window.runReference();if(JSON.stringify(actual)!==JSON.stringify(expected))throw Error('Autocomplete reference changed');return {passed:actual.observations.length};};
document.body.innerHTML='<h1>Original Autocomplete component reference</h1><p>Run window.runReference() or window.verifyReference().</p>';
`;
const bundleName = 'bundle.js';
await build({
  stdin: { contents: source, resolveDir: base, loader: 'js' },
  outfile: resolve(directory, bundleName),
  bundle: true,
  platform: 'browser',
  format: 'iife',
  define: { 'process.env.NODE_ENV': '"development"' },
});
await writeFile(
  directory + '/index.html',
  `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Autocomplete component reference</title><link rel="icon" href="data:,"><script src="${bundleName}" defer></script></head><body></body></html>`,
);
console.log('Built original Autocomplete component reference at ' + directory);
