/* Local SiKePO navigation; keep calls to action inside the workspace. */
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
 addEventListener('load',()=>{repairRoleAnchor();new MutationObserver(repairRoleAnchor).observe(document.body,{subtree:true,childList:true});});
 addEventListener('hashchange',repairRoleAnchor);
})();
