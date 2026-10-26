import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { parse } from 'acorn';

const assets=path.resolve('spartanai-recreation/dist/assets');

test('risk cards keep their domain copy when fresh CMS numbers and links arrive',async()=>{
  const source=await fs.readFile(path.join(assets,'sikepo-sections.mjs'),'utf8');
  // The tested adapter is pure. Its sibling view factories do not need a browser.
  const module=await import('data:text/javascript,'+encodeURIComponent(source.replace(/^import\{o as jsx\}from[^;]+;/m,'const jsx=()=>null;')));
  const link={webPageId:'Gvwe5MOQh',pathVariables:{E4irk1JYi:'cigna-smart-health-systems'}};
  const input={iAB2PpJ2o:{src:'/assets/sikepo-card-upcoding.png'},fRZCRsXk4:'$45M+',RodhnsiM3:'700%',Hqq_VpYxk:link};
  const output=module.adaptRiskCard(input);
  assert.equal(output.fRZCRsXk4,'A1 + A2');
  assert.equal(output.RodhnsiM3,'ICD-10');
  assert.equal(output.NXyzkEWHc,'HOLD');
  assert.equal(output.Hqq_VpYxk,link,'preserve the Framer CMS route object');
  assert.equal(input.fRZCRsXk4,'$45M+','do not mutate incoming CMS props');
  const unknown={iAB2PpJ2o:{src:'/assets/unrelated.png'}};
  assert.equal(module.adaptRiskCard(unknown),unknown);
});

test('landing renders owned sections through its retained Framer source graph',async()=>{
  const html=await fs.readFile('spartanai-recreation/dist/index.html','utf8');
  assert.match(html,/script[^>]+src="\/assets\/script_main\./);
  assert.doesNotMatch(html,/<script[^>]+src="[^"\n]*(?:sikepo-branding|pipeline-mount)\.js/);
  assert.equal((html.match(/id="pipeline"/g)||[]).length,1);
  assert.equal((html.match(/class="framer-no1ell-container"/g)||[]).length,1);
  for(const name of await fs.readdir(assets)){
    if(!name.endsWith('.mjs'))continue;
    const source=await fs.readFile(path.join(assets,name),'utf8');
    assert.doesNotThrow(()=>parse(source,{ecmaVersion:'latest',sourceType:'module'}),name);
    assert.doesNotMatch(source,/\?v=sikepo-logo-open-3/,name+' must not import stale components');
  }
});
