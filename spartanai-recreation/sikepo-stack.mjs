/* Authored React/Motion view; imports resolved by patch_framer_export.mjs. */
import{o as jsx,_ as useState,b as useRef,y as useEffect}from"__REACT__";
import{t as initMotion,k as motion}from"__MOTION__";
initMotion();
export const stackItems=__STACK_DATA__;
const icon=(item,full=false)=>jsx('img',{src:`/assets/stack/${item.id==='bpjs'&&!full?'bpjs-symbol':item.id}-white.png?v=sikepo-source-sync-19`,alt:item.name,width:full&&item.id==='bpjs'?188:48,height:48,loading:'lazy',decoding:'async'});
export function stackTickerItems(){return stackItems.map(item=>jsx('a',{href:'#teknologi',className:'sikepo-stack-ticker-logo',style:{width:item.id==='bpjs'?240:Math.max(170,item.name.length*15+86),height:54,flexShrink:0},'aria-label':item.name,title:item.name,children:[icon(item,true),item.id!=='bpjs'?jsx('span',{children:item.name}):null]},item.id));}
export function SikepoStack(){
 const [active,setActive]=useState(null),dialog=useRef(null),opener=useRef(null);
 useEffect(()=>{if(active&&!dialog.current.open)dialog.current.showModal();},[active]);
 function close(){dialog.current?.close();}
 function afterClose(){setActive(null);opener.current?.focus();}
 const reveal={initial:{opacity:0,y:24},whileInView:{opacity:1,y:0},viewport:{once:true,amount:.15},transition:{duration:.65,ease:[.22,1,.36,1]}};
 return jsx(motion.section,{...reveal,id:'teknologi',className:'sikepo-stack','aria-labelledby':'sikepo-stack-title',children:[
  jsx('div',{className:'sikepo-stack-heading',children:[jsx('p',{className:'sikepo-stack-eyebrow',children:'DI BALIK SIKEPO'}),jsx('h2',{id:'sikepo-stack-title',children:'Teknologi yang saling terhubung.'}),jsx('p',{children:'Dari aplikasi hingga infrastruktur. Pilih logo untuk mengenal perannya di SiKePO.'})]}),
  jsx('div',{className:'sikepo-stack-rows',children:[...new Set(stackItems.map(item=>item.group))].map((group,index)=>jsx(motion.div,{...reveal,className:'sikepo-stack-row',children:[jsx('div',{className:'sikepo-stack-row-label',children:[jsx('span',{children:`0${index+1}`}),jsx('h3',{children:group})]}),jsx('div',{className:'sikepo-stack-icons',children:stackItems.filter(item=>item.group===group).map(item=>jsx(motion.button,{type:'button',className:'sikepo-stack-icon','aria-label':`Tentang ${item.name}`,'aria-haspopup':'dialog',whileHover:{y:-5,backgroundColor:'#28372e'},whileTap:{scale:.96},transition:{duration:.2},onClick:event=>{opener.current=event.currentTarget;setActive(item);},children:[icon(item),jsx('span',{className:'sikepo-stack-tooltip',children:item.name})]},item.id))})]},group))}),
  jsx('dialog',{ref:dialog,className:'sikepo-stack-dialog','aria-labelledby':'sikepo-stack-dialog-title',onClose:afterClose,onClick:event=>{if(event.target===event.currentTarget)close();},children:active?jsx(motion.div,{className:'sikepo-stack-dialog-body',initial:{opacity:0,y:16},animate:{opacity:1,y:0},transition:{duration:.25},children:[jsx('button',{type:'button',className:'sikepo-stack-close','aria-label':'Tutup penjelasan',onClick:close,children:'×'}),jsx('div',{className:'sikepo-stack-dialog-logo',children:icon(active,true)}),jsx('p',{className:'sikepo-stack-eyebrow',children:active.group}),jsx('h2',{id:'sikepo-stack-dialog-title',children:active.name}),jsx('p',{className:'sikepo-stack-dialog-role',children:active.role}),jsx('p',{children:active.description}),jsx('p',{className:'sikepo-stack-detail',children:active.detail}),jsx('a',{href:active.url,target:'_blank',rel:'noopener noreferrer',className:'sikepo-stack-source',children:'Kunjungi situs ↗'})]},active.id):null})
 ]});
}
