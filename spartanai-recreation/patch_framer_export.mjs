/** Synchronize the checked-in Framer export at its source configuration.
 * Run: node spartanai-recreation/patch_framer_export.mjs
 * Structural edits use the JS syntax tree; motion curves and event handlers stay intact.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse } from 'acorn';

const root=path.dirname(fileURLToPath(import.meta.url)),dist=path.join(root,'dist'),assets=path.join(dist,'assets');
const names=fs.readdirSync(assets),find=prefix=>names.find(name=>name.startsWith(prefix)&&name.endsWith('.mjs'));
const main=find('script_main.'),page=find('iHx0Y'),faq=find('jOQBH'),button=find('AuyE7'),card=find('d3MrXgarR');
const version='sikepo-source-sync-14';
const copy=JSON.parse(fs.readFileSync(path.join(root,'sikepo-copy.json'),'utf8'));
Object.assign(copy,{
  'SIKEPO · Audit klaim lebih terarah':'SIKEPO',
  'Building self-optimizing task bots that handle complex multi-step workflows with zero human intervention.':'Telusuri hubungan diagnosis, biaya, durasi rawat, dan obat untuk memahami pola pengajuan yang perlu ditinjau.',
  'Streamlining data ingestion and processing using advanced RAG systems for real-time business intelligence.':'Rangkum temuan aturan dan anomali menjadi alasan serta rekomendasi yang dapat ditelaah oleh pengguna.',
  'USD Billed ':'',
  'Peran pengguna':'Peran pengguna',
  'SiKePO � Keputusan lebih tepat. Membantu pemeriksaan klaim BPJS/JKN sebelum pencairan.':'SiKePO — Keputusan lebih tepat. Membantu pemeriksaan klaim BPJS/JKN sebelum pencairan.',
});
const summary=fs.readFileSync(path.join(root,'sikepo-summary.html'),'utf8').trim();
const pipeline=fs.readFileSync(path.join(dist,'pipeline-section.html'),'utf8').trim();
const cards=JSON.parse(fs.readFileSync(path.join(root,'sikepo-risk-cards.json'),'utf8'));
const react=find('react.');
const stackData=fs.readFileSync(path.join(root,'sikepo-stack.json'),'utf8');
fs.writeFileSync(path.join(assets,'sikepo-stack.mjs'),fs.readFileSync(path.join(root,'sikepo-stack.mjs'),'utf8')
 .replace('__REACT__',`./${react}?v=${version}`)
 .replace('__MOTION__',`./${find('motion.')}?v=${version}`)
 .replace('__STACK_DATA__',stackData));
const inner=html=>html.slice(html.indexOf('>')+1,html.lastIndexOf('</'));
fs.writeFileSync(path.join(assets,'sikepo-sections.mjs'),`/* Authored SIKEPO content, rendered inside Framer's React tree. */
import{o as jsx}from"./${react}?v=${version}";
export function SikepoSummary(){return jsx("div",{className:"sikepo-summary","aria-label":"Ringkasan SiKePO",dangerouslySetInnerHTML:{__html:${JSON.stringify(inner(summary))}}});}
export function SikepoPipeline(){return jsx("section",{id:"pipeline",className:"sikepo-pipeline","aria-labelledby":"pipeline-title",dangerouslySetInnerHTML:{__html:${JSON.stringify(inner(pipeline))}}});}
const riskCards=${JSON.stringify(cards)};
export function adaptRiskCard(props){
  const image=props.iAB2PpJ2o?.src||"";
  const target=riskCards.find(card=>image.includes(card.image)||JSON.stringify(props.Hqq_VpYxk||"").includes(card.slug));
  if(!target)return props;
  return {...props,tlZo4cjcQ:target.label,fRZCRsXk4:target.stages,RodhnsiM3:target.reference,NXyzkEWHc:target.action,ewTQc62tX:target.focus};
}
`);

const report={version,modules:{}};
const value=node=>node?.type==='Literal'?node.value:node?.type==='TemplateLiteral'&&node.expressions.length===0?node.quasis[0].value.cooked:undefined;
const property=(node,key)=>node?.type==='ObjectExpression'?node.properties.find(prop=>prop.type==='Property'&&(prop.key.name||value(prop.key))===key):undefined;
function walk(node,visit,parent=null){
  if(!node||typeof node!=='object')return;
  if(node.type)visit(node,parent);
  for(const [key,child] of Object.entries(node)){
    if(['start','end','type'].includes(key))continue;
    if(Array.isArray(child))child.forEach(item=>walk(item,visit,node));else if(child&&typeof child==='object')walk(child,visit,node);
  }
}
function edit(source,edits){
  const selected=edits.sort((a,b)=>a.start-b.start||b.end-a.end).filter((item,index,all)=>!all.slice(0,index).some(other=>other.start<=item.start&&other.end>=item.end));
  for(let i=selected.length-1;i>=0;i--){const e=selected[i];source=source.slice(0,e.start)+e.text+source.slice(e.end);}
  return source;
}
function structural(source,filename){
  const edits=[],ast=parse(source,{ecmaVersion:'latest',sourceType:'module'});
  walk(ast,node=>{
    if(filename===card&&node.type==='AssignmentExpression'&&node.left.name==='be'&&node.right?.type==='ArrowFunctionExpression'&&node.right.body.type==='ObjectExpression')edits.push({start:node.right.body.start,end:node.right.body.end,text:`adaptRiskCard(${source.slice(node.right.body.start,node.right.body.end)})`});
    if(node.type!=='CallExpression')return;
    if(filename===page&&node.callee.name==='d'&&node.arguments[0]?.name==='a'){
      const children=property(node.arguments[1],'children')?.value;
      if(children?.type==='ArrayExpression'&&children.elements[0]?.arguments?.[0]?.name==='SikepoPipeline'&&value(property(children.elements[1]?.arguments?.[1],'className')?.value)==='framer-1abrxhm')edits.push({start:node.start,end:node.end,text:source.slice(children.elements[1].start,children.elements[1].end)});
    }
    const props=node.arguments[1],className=value(property(props,'className')?.value);
    if(filename===page&&className==='framer-15vldg4'){
      const children=property(props,'children')?.value;
      if(children&&source.slice(children.start,children.end)!=='stackTickerItems().map(item=>p(E,{style:{width:item.props.style.width,height:54},children:item}))')edits.push({start:children.start,end:children.end,text:'stackTickerItems().map(item=>p(E,{style:{width:item.props.style.width,height:54},children:item}))'});
      const gap=property(props,'tickerEffectGap')?.value;
      if(gap&&value(gap)!==36)edits.push({start:gap.start,end:gap.end,text:'36'});
    }
    if(filename===page&&className==='framer-1lgli9y'&&!source.includes('/*sikepo-stack-before-faq*/'))edits.push({start:node.start,end:node.end,text:`/*sikepo-stack-before-faq*/d(a,{children:[p(SikepoStack,{}),${source.slice(node.start,node.end)}]})`});
    if(filename===page&&['framer-12kvm91','framer-1kcu8ck'].includes(className)){
      const gap=property(props,'tickerEffectGap')?.value;
      if(value(gap)===60||value(gap)==='60px')edits.push({start:gap.start,end:gap.end,text:value(gap)===60?'30':'"30px"'});
    }
    if(filename===page&&className==='framer-ntzpvd')edits.push({start:node.start,end:node.end,text:'p(SikepoSummary,{})'});
    if(filename===page&&className==='framer-1oh96en'&&!source.includes('/*sikepo-capabilities-pipeline*/'))edits.push({start:node.start,end:node.end,text:`/*sikepo-capabilities-pipeline*/d(a,{children:[${source.slice(node.start,node.end)},p(SikepoPipeline,{})]})`});
    if(filename===main&&className==='framer-4474yi')edits.push({start:node.start,end:node.end,text:'y(W,{label:"Buka dashboard",link:"/login",variant:"Primary",style:{width:220,maxWidth:"100%"}})'});
    if(filename===main&&className==='framer-3z8se7')edits.push({start:node.start,end:node.end,text:'null'});
    if(filename===main&&className==='framer-bgd74x framer-12kasyw'&&!property(props,'aria-label'))edits.push({start:props.start+1,end:props.start+1,text:'"aria-label":"SIKEPO, beranda",'});
    if(filename===page&&['framer-1h8eal1','framer-16mkske'].includes(className)&&!property(props,'id'))edits.push({start:props.start+1,end:props.start+1,text:`id:"${className==='framer-1h8eal1'?'fokus-risiko':'tentang'}",`});
  });
  source=edit(source,edits);
  if(filename===page&&!source.includes('import{SikepoStack,'))source=`import{SikepoStack,stackTickerItems}from"./sikepo-stack.mjs?v=${version}";`+source;
  if(filename===page&&!source.includes('import{SikepoSummary'))source=`import{SikepoSummary,SikepoPipeline}from"./sikepo-sections.mjs?v=${version}";`+source;
  if(filename===card&&!source.includes('import{adaptRiskCard'))source=`import{adaptRiskCard}from"./sikepo-sections.mjs?v=${version}";`+source;
  return {source,count:edits.length};
}
for(const filename of [main,page,faq,button,card]){
  let source=fs.readFileSync(path.join(assets,filename),'utf8');
  const structuralResult=structural(source,filename);source=structuralResult.source;
  const edits=[],ast=parse(source,{ecmaVersion:'latest',sourceType:'module'});
  walk(ast,(node,parent)=>{
    const text=value(node);
    if(typeof text==='string'&&Object.hasOwn(copy,text)&&copy[text]!==text&&!(parent?.type==='Property'&&parent.key===node))edits.push({start:node.start,end:node.end,text:JSON.stringify(copy[text])});
    else if(typeof text==='string'&&Object.hasOwn(copy,text.trim())&&copy[text.trim()]!==text.trim()&&!(parent?.type==='Property'&&parent.key===node))edits.push({start:node.start,end:node.end,text:JSON.stringify(text.replace(text.trim(),copy[text.trim()]))});
    if(typeof text==='string'&&/^(?:https:\/\/)?(?:contra\.com|cal\.com|delani\.pro)(?:\/|$)/.test(text))edits.push({start:node.start,end:node.end,text:JSON.stringify(text.includes('cal.com')?'/#pipeline':text.includes('delani.pro')?'/#peran':'/login')});
    if(filename===page&&node.type==='Property'&&node.key.name==='voTAn_NFI'){
      const roles={'495':'SA','618':'SA','1,250':'VK','1,570':'VK','2,900':'ST','3,650':'ST','7,500':'AU','9,380':'AU'};
      if(roles[value(node.value)])edits.push({start:node.value.start,end:node.value.end,text:JSON.stringify(roles[value(node.value)])});
    }
    if(node.type==='ObjectExpression'){
      const webPage=value(property(node,'webPageId')?.value),hash=value(property(node,'hash')?.value);
      const links={LWxo_neDM:'/login',bz1sDzfcr:'/#fokus-risiko',YPxLehPrj:'/#tentang',XtUOWx7AC:'/#pipeline'};
      const destination=hash===':AfRn3fT8z'?'#peran':hash===':cyzRPII9H'?'#capabilities':links[webPage];
      if(destination)edits.push({start:node.start,end:node.end,text:JSON.stringify(destination)});
    }
    if(filename===main&&node.type==='Property'&&node.key.name==='href'&&value(property(node.value,'webPageId')?.value)==='cTsX0ulNF')edits.push({start:node.value.start,end:node.value.end,text:'"#pipeline"'});
    if(filename===main&&node.type==='Property'&&node.key.name==='AfRn3fT8z'&&value(node.value)==='pricing')edits.push({start:node.value.start,end:node.value.end,text:'"peran"'});
  });
  source=edit(source,edits);
  if(filename===main){
    // Use Framer's existing client-render path for the adapted local landing.
    // The original SSR fallback is still present, but it is not hydrated against
    // an obsolete export tree. Motion components render from the patched source.
    source=source.replace('`framerHydrateV2`in e.dataset?Bn(!0,e):Bn(!1,e)','`framerHydrateV2`in e.dataset&&!e.dataset.sikepoClientRender?Bn(!0,e):Bn(!1,e)');
    const start=source.indexOf('className:`framer-pipeline-nav framer-12kasyw`');
    if(start<0){
      // Reuse the old Catatan slot, preserving its Framer hover and mobile tap handlers.
      source=source.replaceAll('framer-vjofyj','framer-pipeline-nav');
      const regionStart=source.indexOf('nodeId:`IsSQcNCA0`'),regionEnd=source.indexOf('nodeId:`oJ2VtHj2s`',regionStart);
      if(regionStart<0||regionEnd<0)throw new Error('Navbar patch target missing');
      source=source.slice(0,regionStart)+source.slice(regionStart,regionEnd).replaceAll('`Catatan`','`Pipeline`')+source.slice(regionEnd);
    }
  }
  if(filename===page)source=source.replaceAll('\\"name\\":\\"pricing\\"','\\"name\\":\\"peran\\"').replace(/re=wa\(v,(?:`\$`|``)\),ie=wa\(x,""\)/,'re=v,ie=x');
  parse(source,{ecmaVersion:'latest',sourceType:'module'});
  fs.writeFileSync(path.join(assets,filename),source);
  report.modules[filename]={structural:structuralResult.count,configuration:edits.length};
}

// Invalidate the entire ES-module graph: changing only the top HTML query does
// not invalidate cached dynamic imports, shared components or CMS modules.
for(const filename of [...names.filter(n=>n.endsWith('.mjs')),'sikepo-sections.mjs']){
  const file=path.join(assets,filename);let source=fs.readFileSync(file,'utf8');
  source=source.replace(/\?v=sikepo-[a-zA-Z0-9-]+/g,`?v=${version}`);
  fs.writeFileSync(file,source);
}
fs.writeFileSync(path.join(root,'framer-source-patch-report.json'),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report,null,2));
