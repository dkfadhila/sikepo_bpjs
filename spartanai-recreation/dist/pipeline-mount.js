(() => {
  let scheduled=false;
  function mount(){
    scheduled=false;
    const anchor=document.querySelector('#capabilities > .framer-1oh96en');
    const template=document.getElementById('sikepo-pipeline-template');
    if(anchor && template && !document.querySelector('#capabilities > #pipeline')) anchor.after(template.content.cloneNode(true));
    document.querySelectorAll('.framer-TFhzF a[href*="#capabilities"]').forEach(link=>{
      const parent=link.parentElement;
      if(parent.querySelector('[data-pipeline-link]')) return;
      const nav=link.cloneNode(true);
      nav.setAttribute('href','#pipeline');
      nav.setAttribute('data-pipeline-link','true');
      nav.removeAttribute('data-framer-page-link-current');
      const text=nav.querySelector('.framer-text');
      if(text)text.textContent='Pipeline';
      link.after(nav);
    });
  }
  function schedule(){if(!scheduled){scheduled=true;requestAnimationFrame(mount);}}
  addEventListener('load',()=>{mount();new MutationObserver(schedule).observe(document.body,{childList:true,subtree:true});});
  document.addEventListener('click',e=>{
    const link=e.target.closest('[data-pipeline-link]');
    if(!link)return;
    e.preventDefault();e.stopImmediatePropagation();
    document.querySelector('#pipeline')?.scrollIntoView({behavior:'smooth',block:'start'});
    history.replaceState(null,'','#pipeline');
    if(innerWidth<810) link.closest('.framer-TFhzF')?.querySelector('.framer-1i2hyxe')?.click();
  },true);
})();
