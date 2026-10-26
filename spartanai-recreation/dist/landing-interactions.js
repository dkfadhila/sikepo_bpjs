// The exported HTML is the source of truth; do not hydrate it with an older Framer tree.
const siteNav=document.querySelector('.sk-site-nav');
const toggle=siteNav.querySelector('.sk-menu-toggle');
function closeMenu(){siteNav.classList.remove('is-open');toggle.setAttribute('aria-expanded','false');toggle.setAttribute('aria-label','Buka menu');}
toggle.addEventListener('click',()=>{const open=siteNav.classList.toggle('is-open');toggle.setAttribute('aria-expanded',String(open));toggle.setAttribute('aria-label',open?'Tutup menu':'Buka menu');});
document.addEventListener('keydown',event=>{if(event.key==='Escape')closeMenu();});
document.addEventListener('click',event=>{if(!siteNav.contains(event.target))closeMenu();});
siteNav.querySelectorAll('a').forEach(link=>link.addEventListener('click',event=>{
 closeMenu();
 if(link.hash){const target=document.getElementById(link.hash.slice(1));if(target){event.preventDefault();history.replaceState(null,'',link.hash);target.scrollIntoView({behavior:'instant',block:'start'});}}
}));
// Native details give the FAQ keyboard support and a predictable mobile height.
document.querySelectorAll('.framer-hYikM').forEach(card=>{
 const heading=card.querySelector('h4');if(!heading)return;
 const answer=card.querySelector('.framer-gvm7ja');
 const details=document.createElement('details');details.className='sk-faq';
 const summary=document.createElement('summary');summary.textContent=heading.textContent;
 details.append(summary);
 if(answer){const body=document.createElement('div');body.className='sk-faq-answer';body.textContent=answer.textContent;details.append(body);}
 card.replaceWith(details);
});
// Expand all capability descriptions in a compact stack on phones.
document.querySelectorAll('.framer-s5Zje').forEach(panel=>{panel.style.cursor='default';});
