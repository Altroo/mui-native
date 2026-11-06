// Copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT
const escapeAttribute = (value) =>
  String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('"', '&quot;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;');
const scriptData = (value) =>
  JSON.stringify(value)
    .replaceAll('<', '\\u003c')
    .replaceAll('\u2028', '\\u2028')
    .replaceAll('\u2029', '\\u2029');
/**
 * A static, offline page: original rendered markup is visible without hydration.
 * Only the parent observer executes JS; srcdoc frames retain isolated CSS roots.
 * @param {{fixtures: Array<{input: {name:string,dense?:boolean,htmlFontSize?:number,expected:{minWidth:number,fontSize?:number,color?:string}},owner?:unknown,markup:string}>,reference:object,systemReference:object,sourceFixture:{path:string,sha256:string}}} spec
 */
export function createMenuIconBrowserHtml(spec) {
  const frames = spec.fixtures.map((fixture, index) => ({
    fixture,
    index,
    kind: 'baseline',
    rootSize: fixture.input.htmlFontSize ?? 16,
    expected: fixture.input.expected,
  }));
  const denseIndex = spec.fixtures.findIndex(
    (fixture) => fixture.input.dense && (fixture.input.htmlFontSize ?? 16) === 16,
  );
  if (denseIndex >= 0) {
    const fixture = spec.fixtures[denseIndex];
    frames.push({
      fixture,
      index: frames.length,
      kind: 'document-root-calibration',
      rootSize: 24,
      // The pinned dense rule is 1.25rem; this isolated document sets 24px.
      expected: { ...fixture.input.expected, fontSize: 30 },
    });
  }
  const cases = frames.map(({ fixture, index, kind, rootSize, expected }) => {
    const key = String(index).padStart(2, '0');
    const ids = {
      frame: `menu-style-frame-${key}`,
      root: `menu-style-case-${key}-root`,
      icon: `menu-style-case-${key}-icon`,
      svg: `menu-style-case-${key}-svg`,
    };
    let markup = fixture.markup;
    for (const [original, next] of [
      ['menu-root', ids.root],
      ['icon-root', ids.icon],
      ['svg-root', ids.svg],
    ]) {
      const target = `id="${original}"`;
      if (markup.split(target).length !== 2)
        throw new Error('Original reference must contain exactly one ' + original + ' root');
      markup = markup.replace(target, `id="${next}"`);
    }
    const document = `<!doctype html><html style="font-size:${rootSize}px"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="margin:0">${markup}</body></html>`;
    return {
      ids,
      kind,
      input: fixture.input,
      owner: fixture.owner,
      expected,
      documentRoot: rootSize,
      document,
    };
  });
  const manifest = {
    schemaVersion: 1,
    reference: spec.reference,
    systemReference: spec.systemReference,
    sourceFixture: spec.sourceFixture,
    scope:
      'Actual getComputedStyle and DOM rectangles from isolated original SSR. No native paint, hydration/event or Emotion insertion-history claim.',
    cases: cases.map(({ document: _document, ...metadata }) => metadata),
  };
  const framesHtml = cases
    .map(
      (item) =>
        `<section><h2>${escapeAttribute(item.input.name)}${item.kind === 'baseline' ? '' : ' · document root 24'}</h2><iframe id="${item.ids.frame}" title="${escapeAttribute(item.input.name)}" sandbox="allow-same-origin" width="400" height="200" srcdoc="${escapeAttribute(item.document)}"></iframe></section>`,
    )
    .join('\n');
  const observer = String.raw`
(function(){
 'use strict';
 const manifest=MANIFEST_DATA;
 const status=document.getElementById('menu-style-status');
 const properties=['display','direction','minWidth','width','height','fontSize','lineHeight','color','fill','opacity','marginTop','paddingLeft','paddingRight'];
 const number=value=>Number.isFinite(value)?value:null;
 function observe(frame,id){
  const element=frame.contentDocument.getElementById(id);
  if(!element)throw new Error('Missing original root '+id);
  const computed=frame.contentWindow.getComputedStyle(element),rect=element.getBoundingClientRect();
  return {id,tag:element.tagName.toLowerCase(),className:element.getAttribute('class'),inlineStyle:element.getAttribute('style'),computed:Object.fromEntries(properties.map(key=>[key,computed[key]])),rect:{x:number(rect.x),y:number(rect.y),width:number(rect.width),height:number(rect.height)}};
 }
 async function ready(frame,ids){
  if(!frame.contentDocument||frame.contentDocument.readyState!=='complete'||![ids.root,ids.icon,ids.svg].every(id=>frame.contentDocument.getElementById(id))){
   await new Promise((resolve,reject)=>{
    const done=()=>{clearTimeout(timeout);resolve();};
    const timeout=setTimeout(()=>{frame.removeEventListener('load',done);reject(new Error('Original iframe load timed out: '+frame.id));},10000);
    frame.addEventListener('load',done,{once:true});
   });
  }
  if(frame.contentDocument.fonts)await frame.contentDocument.fonts.ready;
  await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
 }
 function canonicalColor(doc,value){
  const probe=doc.createElement('span');probe.style.cssText='position:fixed;visibility:hidden;pointer-events:none';probe.style.color=value;doc.body.append(probe);
  try{return doc.defaultView.getComputedStyle(probe).color;}finally{probe.remove();}
 }
 const api={count:manifest.cases.filter(item=>item.kind==='baseline').length,total:manifest.cases.length,manifest,last:null,error:null};
 api.collect=async()=>{
  try{
   status.textContent='Reading original computed styles…';
   const failures=[],observations=[];
   await Promise.all(manifest.cases.map(item=>ready(document.getElementById(item.ids.frame),item.ids)));
   for(const item of manifest.cases){
    const frame=document.getElementById(item.ids.frame);
    const root=observe(frame,item.ids.root),icon=observe(frame,item.ids.icon),svg=observe(frame,item.ids.svg);
    const actual={minWidth:number(parseFloat(icon.computed.minWidth)),fontSize:number(parseFloat(svg.computed.fontSize)),color:svg.computed.color};
    const expected={minWidth:item.expected.minWidth,fontSize:item.expected.fontSize??24,...(item.expected.color?{color:canonicalColor(frame.contentDocument,item.expected.color)}:{})};
    for(const key of Object.keys(expected))if(actual[key]!==expected[key])failures.push({name:item.input.name,kind:item.kind,key,expected:expected[key],actual:actual[key]});
    observations.push({...item,documentRoot:number(parseFloat(frame.contentWindow.getComputedStyle(frame.contentDocument.documentElement).fontSize)),root,icon,svg,nativeAdaptation:actual,expectedNative:expected});
   }
   api.last={schemaVersion:1,reference:manifest.reference,systemReference:manifest.systemReference,sourceFixture:manifest.sourceFixture,renderer:'Actual browser DOM getComputedStyle and bounding rectangles; original SSR, scripts disabled inside frames.',baseline:observations.filter(item=>item.kind==='baseline'),calibrations:observations.filter(item=>item.kind!=='baseline'),failures,passed:failures.length===0};
   api.error=null;status.textContent=failures.length?'Computed-style mismatches: '+failures.length:'Original computed styles verified: '+api.count+' baseline + '+(api.total-api.count)+' CSS-root calibration';
   return api.last;
  }catch(error){api.error=String(error);status.textContent=api.error;throw error;}
 };
 window.menuIconCascade=api;
 status.textContent='Ready: '+api.count+' original cases. Call await window.menuIconCascade.collect().';
})();
`;
  // A callback inserts JSON literally; fixture text must not expand the
  // replacement-string dollar tokens into observer source.
  return `<!doctype html><html><head><meta charset="utf-8"><title>Original MenuItem icon cascade</title><style>body{font:14px system-ui;margin:24px;background:#f5f6f7;color:#182028}h1{font-size:22px}h2{font-size:15px}section{padding:12px 0;border-top:1px solid #c9ced4}iframe{display:block;max-width:100%;border:1px solid #a8b1ba;background:white}#menu-style-status{padding:12px;background:white}</style></head><body><h1>Original MenuItem icon cascade · pinned 9.5.0</h1><p>Offline original SSR with isolated document roots. Computed CSS and rectangles are browser evidence; native rendering is checked separately.</p><p id="menu-style-status">Original examples rendered below.</p>${framesHtml}<script id="menu-style-observer">${observer.replace('MANIFEST_DATA', () => scriptData(manifest))}</script></body></html>`;
}
