import { readFileSync, writeFileSync } from 'node:fs';

const inline = text => text.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
  .replace(/(https:\/\/[^\s]+)/g,'<a href="$1" rel="noopener">$1</a>')
  .replace(/`([^`]+)`/g,'<code>$1</code>').replace(/\*\*([^*]+)\*\*/g,'<strong>$1</strong>');
let table=false, list='', html='';
function closeTable(){if(table){html+='</tbody></table></div>';table=false;}}
function closeList(){if(list){html+=`</${list}>`;list='';}}
for(const line of readFileSync('docs/DATA-SUBMISSION.md','utf8').split('\n')){
  if(line.startsWith('|')){
    closeList();
    const cells=line.replace(/^\||\|$/g,'').split('|');
    if(cells.every(c=>/^\s*:?-+:?\s*$/.test(c)))continue;
    if(!table){html+='<div class="table"><table><tbody>';table=true;}
    html+='<tr>'+cells.map(c=>`<td>${inline(c.trim())}</td>`).join('')+'</tr>';continue;
  }
  closeTable();
  const item=line.match(/^(\d+\.|-) (.*)/);
  if(item){const type=item[1]==='-'?'ul':'ol';if(list!==type){closeList();html+=`<${type}>`;list=type;}html+=`<li>${inline(item[2])}</li>`;continue;}
  closeList();
  const heading=line.match(/^(#{1,3}) (.*)/);
  if(heading){const n=heading[1].length;html+=`<h${n}>${inline(heading[2])}</h${n}>`;}
  else if(line.trim())html+=`<p>${inline(line)}</p>`;
}
closeTable();closeList();
writeFileSync('spartanai-recreation/dist/data-methodology.html',`<!doctype html><html lang="id"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Informasi Data — SIKEPO</title><style>body{font:16px/1.7 system-ui,sans-serif;color:#203b2c;background:#f4f6f1;margin:0}main{max-width:1000px;margin:auto;padding:40px 24px}a{color:#206b4a;overflow-wrap:anywhere}h1{line-height:1.2;font-size:34px}h2{margin-top:42px}code{font-size:.87em;background:#e5eee5;border-radius:4px;padding:2px 4px;overflow-wrap:anywhere}li{margin:12px 0}table{border-collapse:collapse;font-size:14px;background:white;min-width:640px}td{padding:12px;border:1px solid #dce4db}tr:first-child{font-weight:600;background:#e5eee5}.table{overflow:auto}nav{display:flex;gap:24px}</style><main><nav><a href="/">SIKEPO</a><a href="/login">Masuk ke workspace</a></nav>${html}</main></html>\n`);
