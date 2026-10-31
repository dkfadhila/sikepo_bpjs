import fs from 'node:fs/promises';
import path from 'node:path';
import {Presentation,PresentationFile} from 'file:///C:/Users/Administrator/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/@oai/artifact-tool/dist/artifact_tool.mjs';
const root='C:/Users/Administrator/Documents/ChatGPT/Sikepo';
const src=await fs.readFile(path.join(root,'slides/sikepo-pitch/index.tsx'),'utf8');
const notes=src.slice(src.indexOf('export const notes')).match(/"(?:[^"\\]|\\.)*"/g).map(s=>JSON.parse(s));
const deck=Presentation.create({slideSize:{width:1920,height:1080}});
for(let i=1;i<=10;i++){
 const slide=deck.slides.add();
 const bytes=await fs.readFile(path.join(root,`videos/sikepo-demo/presentation-film/assets/slide-${String(i).padStart(2,'0')}.png`));
 slide.images.add({blob:bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),contentType:'image/png',alt:`SIKEPO slide ${i}`,fit:'contain',position:{left:0,top:0,width:1920,height:1080}});
 slide.speakerNotes.text=notes[i-1];
}
await(await PresentationFile.exportPptx(deck)).save(path.join(root,'artifacts/pptx-build/candidate.pptx'));
console.log('Exported 10-slide PowerPoint with speaker notes.');
