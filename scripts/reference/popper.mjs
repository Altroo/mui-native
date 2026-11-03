import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';
import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { loadReference } from './load.mjs';
const material = await loadReference('@mui/material', [
  'Popper/Popper.js',
  'Popper/Popper.d.ts',
  'Popper/BasePopper.js',
  'Popper/BasePopper.types.d.ts',
  'Popper/popperClasses.js',
  'Popper/popperClasses.d.ts',
]);
const metadata = JSON.parse(await readFile('.cache/popper-core-metadata.json', 'utf8'));
assert.equal(metadata.name, '@popperjs/core');
assert.equal(metadata.version, '2.11.8');
assert.equal(metadata.license, 'MIT');
const bytes = await readFile('.cache/popper-core-2.11.8.tgz');
assert.equal(
  'sha512-' + createHash('sha512').update(bytes).digest('base64'),
  metadata.dist.integrity,
);
const coreDirectory = material.directory + '/node_modules/@popperjs/core';
const files = [
  'lib/createPopper.js',
  'lib/enums.js',
  'lib/modifiers/popperOffsets.js',
  'lib/modifiers/offset.js',
  'lib/modifiers/flip.js',
  'lib/modifiers/preventOverflow.js',
  'lib/modifiers/arrow.js',
  'lib/modifiers/hide.js',
  'lib/modifiers/computeStyles.js',
  'lib/modifiers/applyStyles.js',
  'lib/modifiers/eventListeners.js',
  'lib/utils/computeAutoPlacement.js',
  'lib/utils/computeOffsets.js',
  'lib/utils/detectOverflow.js',
  'lib/utils/orderModifiers.js',
  'lib/utils/mergeByName.js',
  'lib/utils/within.js',
  'lib/utils/debounce.js',
  'lib/dom-utils/getClippingRect.js',
  'lib/dom-utils/getLayoutRect.js',
  'lib/dom-utils/getCompositeRect.js',
  'LICENSE.md',
];
const hashes = {};
for (const file of files) {
  const original = execFileSync('python3', [
      '-c',
      'import sys,tarfile;t=tarfile.open(sys.argv[1]);sys.stdout.buffer.write(t.extractfile("package/"+sys.argv[2]).read())',
      '.cache/popper-core-2.11.8.tgz',
      file,
    ]),
    installed = await readFile(coreDirectory + '/' + file);
  assert(original.equals(installed), 'Modified Core reference: ' + file);
  hashes[file] = createHash('sha256').update(installed).digest('hex');
}
const core = {
  name: '@popperjs/core',
  version: '2.11.8',
  integrity: metadata.dist.integrity,
  license: 'MIT',
  licenseSha256: hashes['LICENSE.md'],
  sourceFiles: hashes,
};
const provenance = {
  schemaVersion: 1,
  description:
    'Native Popper positioning adapts the current MIT Core algorithms behind the pinned MUI contract. Geometry and modifier reference evidence is separate from native device validation and does not advance verified MUI support.',
  core,
  localFiles: [
    'packages/material/src/nativePopper/types.ts',
    'packages/material/src/nativePopper/geometry.ts',
    'packages/material/src/nativePopper/overflow.ts',
    'packages/material/src/nativePopper/modifiers.ts',
    'packages/material/src/nativePopper/engine.ts',
    'packages/material/src/nativePopper/nativeAdapter.ts',
  ],
};
try {
  assert.deepEqual(
    JSON.parse(await readFile('upstream/native-positioning.json', 'utf8')),
    provenance,
  );
} catch (error) {
  if (error.code !== 'ENOENT') throw error;
  assert(!process.argv.includes('--check'));
  await writeFile('upstream/native-positioning.json', JSON.stringify(provenance, null, 2) + '\n');
  await writeFile(
    'upstream/licenses/popper-core-2.11.8.txt',
    await readFile(coreDirectory + '/LICENSE.md'),
  );
}
const all = ['top', 'bottom', 'right', 'left', 'auto'].flatMap((p) => [
  p,
  p + '-start',
  p + '-end',
]);
const locations = [
  { name: 'center', x: 100, y: 200, width: 40, height: 20 },
  { name: 'top left', x: 3, y: 2, width: 40, height: 20 },
  { name: 'bottom right', x: 375, y: 825, width: 40, height: 20 },
  { name: 'outside viewport', x: -100, y: 900, width: 40, height: 20 },
];
const cases = all.flatMap((placement) =>
  locations.map(({ name, ...anchor }) => ({ name: placement + ' ' + name, placement, anchor })),
);
cases.push(
  { name: 'numeric offset', modifiers: [{ name: 'offset', options: { offset: [7, 12] } }] },
  { name: 'callback offset', offsetMode: 'size' },
  {
    name: 'no flip at bottom',
    anchor: { x: 100, y: 825, width: 40, height: 20 },
    modifiers: [{ name: 'flip', enabled: false }],
  },
  {
    name: 'no overflow prevention',
    anchor: { x: 0, y: 200, width: 5, height: 20 },
    modifiers: [{ name: 'preventOverflow', enabled: false }],
  },
  {
    name: 'both overflow axes without tether',
    anchor: { x: -200, y: 900, width: 20, height: 20 },
    modifiers: [{ name: 'preventOverflow', options: { altAxis: true, tether: false } }],
  },
  {
    name: 'positive tether offset',
    anchor: { x: -30, y: 820, width: 8, height: 8 },
    modifiers: [{ name: 'preventOverflow', options: { tetherOffset: 20, altAxis: true } }],
  },
  {
    name: 'callback tether offset',
    anchor: { x: 380, y: 200, width: 8, height: 8 },
    tetherMode: 'size',
  },
  {
    name: 'separate tether offsets',
    anchor: { x: -30, y: 820, width: 8, height: 8 },
    modifiers: [
      {
        name: 'preventOverflow',
        options: { tetherOffset: { mainAxis: 12, altAxis: 4 }, altAxis: true },
      },
    ],
  },
  {
    name: 'numeric padding',
    anchor: { x: 0, y: 820, width: 10, height: 10 },
    modifiers: [
      { name: 'flip', options: { padding: 16 } },
      { name: 'preventOverflow', options: { padding: 16 } },
    ],
  },
  {
    name: 'edge padding',
    anchor: { x: 380, y: 200, width: 8, height: 8 },
    modifiers: [
      { name: 'preventOverflow', options: { padding: { left: 10, right: 30, top: 4, bottom: 8 } } },
    ],
  },
  {
    name: 'reference clipping uses alternate boundary',
    anchor: { x: 180, y: 200, width: 20, height: 20 },
    referenceClip: { x: 30, y: 50, width: 180, height: 200 },
    modifiers: [
      { name: 'flip', options: { altBoundary: true } },
      { name: 'preventOverflow', options: { altBoundary: true } },
    ],
  },
  {
    name: 'auto candidates retain source boundary selection',
    placement: 'auto-start',
    anchor: { x: 180, y: 200, width: 20, height: 20 },
    referenceClip: { x: 30, y: 50, width: 180, height: 200 },
    modifiers: [{ name: 'flip', options: { altBoundary: true } }],
  },
  {
    name: 'restricted auto placements',
    placement: 'auto',
    modifiers: [{ name: 'flip', options: { allowedAutoPlacements: ['left', 'right'] } }],
  },
  {
    name: 'auto restriction empty intersection uses original candidates',
    placement: 'auto-end',
    modifiers: [{ name: 'flip', options: { allowedAutoPlacements: ['left'] } }],
  },
  {
    name: 'no variation flips',
    placement: 'bottom-start',
    anchor: { x: 380, y: 820, width: 8, height: 8 },
    modifiers: [{ name: 'flip', options: { flipVariations: false } }],
  },
  {
    name: 'explicit fallback order',
    anchor: { x: 100, y: 820, width: 40, height: 20 },
    modifiers: [{ name: 'flip', options: { fallbackPlacements: ['left', 'right'] } }],
  },
  {
    name: 'document boundary',
    anchor: { x: 100, y: 1500, width: 40, height: 20 },
    documentHeight: 1600,
    modifiers: [
      { name: 'flip', options: { rootBoundary: 'document' } },
      { name: 'preventOverflow', options: { rootBoundary: 'document' } },
    ],
  },
  {
    name: 'explicit boundary',
    boundary: { x: 30, y: 40, width: 200, height: 300 },
    modifiers: [
      { name: 'flip', options: { boundary: 'fixture' } },
      { name: 'preventOverflow', options: { boundary: 'fixture' } },
    ],
  },
  {
    name: 'disjoint boundary',
    boundary: { x: 500, y: 900, width: 200, height: 300 },
    modifiers: [
      { name: 'flip', options: { boundary: 'fixture' } },
      { name: 'preventOverflow', options: { boundary: 'fixture' } },
    ],
  },
  {
    name: 'multiple boundaries',
    boundary: [
      { x: 30, y: 40, width: 200, height: 300 },
      { x: 90, y: 100, width: 100, height: 200 },
    ],
    modifiers: [
      { name: 'flip', options: { boundary: 'fixture' } },
      { name: 'preventOverflow', options: { boundary: 'fixture' } },
    ],
  },
  { name: 'native arrow geometry', arrow: { width: 10, height: 10, padding: 8 } },
  {
    name: 'oversized arrow tether',
    anchor: { x: 0, y: 200, width: 5, height: 5 },
    arrow: { width: 50, height: 50, padding: 8 },
  },
  {
    name: 'fractional coordinates with no rounding',
    anchor: { x: 100.125, y: 200.25, width: 40, height: 20 },
    modifiers: [{ name: 'computeStyles', options: { roundOffsets: false } }],
  },
  {
    name: 'custom coordinate rounding',
    anchor: { x: 100.125, y: 200.25, width: 40, height: 20 },
    roundMode: 'custom',
  },
  {
    name: 'plain top left styles',
    placement: 'top-end',
    modifiers: [{ name: 'computeStyles', options: { adaptive: false, gpuAcceleration: false } }],
  },
  {
    name: 'oversized popup',
    size: { width: 600, height: 1000 },
    anchor: { x: 100, y: 200, width: 40, height: 20 },
  },
  { name: 'fixed strategy', strategy: 'fixed' },
  {
    name: 'empty boundary means root only',
    modifiers: [
      { name: 'flip', options: { boundary: [] } },
      { name: 'preventOverflow', options: { boundary: [] } },
    ],
  },
);
let expected;
try {
  expected = JSON.parse(await readFile('tests/fixtures/mui-popper-geometry-9.5.0.json', 'utf8'));
} catch (error) {
  if (error.code !== 'ENOENT') throw error;
}
const reference = {
  material: material.reference,
  core,
  viewport: { width: 390, height: 844 },
  scope:
    'Actual original Popper Core in Chromium, using real DOM bounds: placements, offset, flip, overflow/tether, clipping, arrow, hide and rendered position. This fixture is not physical React Native evidence.',
};
if (process.argv.includes('--check')) {
  assert(expected);
  assert.deepEqual(expected.material, reference.material);
  assert.deepEqual(expected.core, reference.core);
  assert.deepEqual(
    expected.fixtures.map((x) => x.input),
    cases,
  );
}
const directory = resolve('.cache/popper-reference');
await mkdir(directory, { recursive: true });
const source = `
import {createPopper} from ${JSON.stringify(coreDirectory + '/lib/index.js')};
const input=${JSON.stringify({ cases, reference })},expected=${JSON.stringify(expected ?? null)};
const style=(node,rect)=>Object.assign(node.style,{position:'absolute',left:rect.x+'px',top:rect.y+'px',width:rect.width+'px',height:rect.height+'px'});
const rect=node=>{const r=node.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height};};
window.runReference=()=>{if(innerWidth!==390||innerHeight!==844)throw Error('Reference viewport must be390x844');const fixtures=[];
 for(const test of input.cases){document.body.style.height=(test.documentHeight??844)+'px';const owned=[];const add=(node,parent=document.body)=>{owned.push(node);parent.append(node);return node;};
 let instance;try{const referenceRect=test.anchor??{x:100,y:200,width:40,height:20},size=test.size??{width:120,height:80};
 let parent=document.body;if(test.referenceClip){parent=add(document.createElement('div'));style(parent,test.referenceClip);parent.style.overflow='hidden';}
 const anchor=add(document.createElement('div'),parent);style(anchor,{...referenceRect,x:referenceRect.x-(test.referenceClip?.x??0),y:referenceRect.y-(test.referenceClip?.y??0)});
 const popup=add(document.createElement('div'));Object.assign(popup.style,{width:size.width+'px',height:size.height+'px'});
 let arrow;if(test.arrow){arrow=add(document.createElement('div'),popup);Object.assign(arrow.style,{width:test.arrow.width+'px',height:test.arrow.height+'px'});}
 let boundary;if(test.boundary){const nodes=[].concat(test.boundary).map(box=>{const node=add(document.createElement('div'));style(node,box);return node;});boundary=Array.isArray(test.boundary)?nodes:nodes[0];}
 const modifiers=[{name:'eventListeners',enabled:false},...(test.modifiers??[]).map(modifier=>({...modifier,options:modifier.options?.boundary==='fixture'?{...modifier.options,boundary}:modifier.options}))];
 if(test.offsetMode)modifiers.push({name:'offset',options:{offset:({reference,placement})=>[reference.width/10,placement.startsWith('top')?7:12]}});
 if(test.tetherMode)modifiers.push({name:'preventOverflow',options:{altAxis:true,tetherOffset:({reference,popper})=>({mainAxis:reference.width/4,altAxis:popper.height/4})}});
 if(test.roundMode)modifiers.push({name:'computeStyles',options:{roundOffsets:({x,y})=>({x:Math.floor(x),y:Math.ceil(y)})}});
 if(arrow)modifiers.push({name:'arrow',options:{element:arrow,padding:test.arrow.padding}});
 instance=createPopper(anchor,popup,{placement:test.placement??'bottom',strategy:test.strategy??'absolute',modifiers});instance.forceUpdate();const state=instance.state;
 const position=rect(popup),arrowWindow=arrow?rect(arrow):null;
 fixtures.push({input:test,state:JSON.parse(JSON.stringify({placement:state.placement,rects:state.rects,ordered:state.orderedModifiers.map(x=>x.name),data:state.modifiersData,attributes:state.attributes,position,arrowPosition:arrowWindow?{x:arrowWindow.x-position.x,y:arrowWindow.y-position.y,width:arrowWindow.width,height:arrowWindow.height}:null,document:{x:0,y:0,width:Math.max(document.documentElement.scrollWidth,document.body.scrollWidth,390),height:Math.max(document.documentElement.scrollHeight,document.body.scrollHeight,844)}}))});
 }finally{instance?.destroy();owned.reverse().forEach(node=>node.remove());}}
 return {...input.reference,fixtures};};
window.verifyReference=()=>{const result=window.runReference();if(JSON.stringify(result)!==JSON.stringify(expected))throw Error('Original Popper reference changed');return {passed:result.fixtures.length};};
`;
await build({
  stdin: { contents: source, loader: 'js', resolveDir: process.cwd() },
  bundle: true,
  platform: 'browser',
  format: 'iife',
  outfile: directory + '/bundle.js',
  define: { 'process.env.NODE_ENV': '"development"' },
});
await writeFile(
  directory + '/index.html',
  `<!doctype html><meta charset="utf-8"><title>Original Popper positioning checks</title><style>html,body{margin:0;overflow:hidden}#explanation{position:fixed;z-index:10000;top:0;left:0;pointer-events:none;background:white;padding:12px;font:14px sans-serif}</style><aside id="explanation">Original MUI/Popper positioning checks. This temporary developer reference compares real DOM geometry with native positioning models.</aside><script defer src="bundle.js"></script>`,
);
console.log(
  'Verified MIT Core source and built ' +
    directory +
    ' for ' +
    cases.length +
    ' original geometry cases.',
);
