/* Local SiKePO navigation; keep calls to action inside the workspace. */
/* A small, keyboard-accessible shortcut after reading down the page. */
(()=>{
 const button=document.createElement('button');
 button.type='button';button.className='sikepo-back-top';
 button.setAttribute('aria-label','Kembali ke atas');button.title='Kembali ke atas';
 button.innerHTML='<svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M12 19V5M5 12l7-7 7 7" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>';
 button.hidden=true;
 button.addEventListener('click',()=>window.scrollTo({top:0,behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'}));
 document.body.append(button);
 const update=()=>{button.hidden=window.scrollY<400;};
 addEventListener('scroll',update,{passive:true});addEventListener('pageshow',update);update();
})();
(() => {
  const sections = {'/project':'#fokus-risiko','/articles':'#catatan','/about':'#tentang','/digital-brain':'#capabilities'};
  document.addEventListener('click', event => {
    const link = event.target.closest('a[href]');
    if (!link) return;
    const value = link.getAttribute('href');
    if (!value || value.startsWith('#')) return;
    const url = new URL(value, location.href);
    if (url.origin !== location.origin || /\.(png|jpe?g|svg|webp|avif|mp4|pdf)$/i.test(url.pathname)) return;
    if (url.pathname === '/' || url.pathname.endsWith('/index.html')) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    if (url.pathname.startsWith('/project/')) { location.href = url.pathname.replace(/\/$/,'') + '/'; return; }
    const target = sections[url.pathname.replace(/\/$/,'')];
    if (target) {
      location.hash = target;
      document.querySelector(target)?.scrollIntoView({behavior:'smooth'});
    } else location.href = '/login';
  }, true);
})();

/* Preserve old bookmarks while publishing Peran as the canonical section anchor. */
(()=>{
 function repairRoleAnchor(){
  const role=document.querySelector('section.framer-xvtoea');
  if(role&&role.id!=='peran')role.id='peran';
  document.querySelectorAll('a[href*="#pricing"]').forEach(link=>link.setAttribute('href',link.getAttribute('href').replace('#pricing','#peran')));
  if(location.hash==='#pricing'){history.replaceState(null,'',location.pathname+location.search+'#peran');role?.scrollIntoView({block:'start'});}
 }
 addEventListener('load',repairRoleAnchor);
 addEventListener('hashchange',repairRoleAnchor);
})();
