/* SIKEPO motion experiment: native browser animation, no React/Framer runtime. */
(() => {
  'use strict';
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const clamp = (n, a = 0, b = 1) => Math.max(a, Math.min(b, n));
  const animations = new Set();
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  let profile = {}, entranceObserver;

  // Sample the same mass/stiffness/damping values as the exported entrance data.
  // This is a damped harmonic oscillator, including the over-damped case.
  function spring(t, stiffness = 400, damping = 64, mass = 1) {
    const w0 = Math.sqrt(stiffness / mass), zeta = damping / (2 * Math.sqrt(stiffness * mass));
    if (zeta < 1) {
      const wd = w0 * Math.sqrt(1 - zeta * zeta);
      return 1 - Math.exp(-zeta * w0 * t) * (Math.cos(wd * t) + zeta * w0 / wd * Math.sin(wd * t));
    }
    if (Math.abs(zeta - 1) < .0001) return 1 - Math.exp(-w0 * t) * (1 + w0 * t);
    const root = Math.sqrt(zeta * zeta - 1), r1 = -w0 * (zeta - root), r2 = -w0 * (zeta + root);
    return 1 - (r2 * Math.exp(r1 * t) - r1 * Math.exp(r2 * t)) / (r2 - r1);
  }
  function entrance(element, config = {}) {
    if (reduced.matches || !element.getClientRects().length) return;
    const state = config.initial || { opacity: 0, y: 30, scale: 1 }, end = config.animate || { opacity: 1, x: 0, y: 0, scale: 1 };
    const transition = end.transition || {}, duration = transition.duration || 1.2;
    const frames = Array.from({length: 81}, (_, i) => {
      const t = i / 80;
      const stiffness = transition.stiffness || (transition.bounce ? 170 : 180);
      const damping = transition.damping || (transition.bounce ? 20 : 27);
      const progress = i === 80 ? 1 : spring(t * duration, stiffness, damping, transition.mass || 1);
      const value = (key, fallback) => (state[key] ?? fallback) + ((end[key] ?? fallback) - (state[key] ?? fallback)) * progress;
      return {offset:t,opacity:clamp(value('opacity', 1)),transform:`translate3d(${value('x',0)}px,${value('y',0)}px,0) scale(${value('scale',1)}) rotate(${value('rotate',0)}deg)`};
    });
    const animation = element.animate(frames, {duration:duration * 1000, delay:(transition.delay || 0) * 1000, easing:'linear', fill:'backwards'});
    animations.add(animation); animation.finished.catch(() => {}).finally(() => animations.delete(animation));
  }
  function startEntrances() {
    entranceObserver?.disconnect();
    animations.forEach(animation => animation.cancel());
    const viewportWidth = innerWidth;
    entranceObserver = new IntersectionObserver(entries => entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      const element = entry.target, variants = profile[element.dataset.framerAppearId];
      const key = viewportWidth < 810 ? '1gwjcs2' : viewportWidth < 1200 ? 'aak1h0' : 'default';
      const config = variants?.[key] || variants?.default;
      if (config?.initial) entrance(element, config);
      entranceObserver.unobserve(element);
    }), {threshold:.04});
    $$('[data-framer-appear-id]').forEach(element => {
      element.style.opacity = '1'; element.style.transform = 'none'; entranceObserver.observe(element);
    });
    $$('.motion-nav,.motion-dashboard').forEach(element => entrance(element, {initial:{opacity:0,y:-100,scale:1},animate:{opacity:1,y:0,scale:1,transition:{duration:.8,delay:.5}}}));
  }

  const reveals = $$('.motion-text-reveal').map(element => {
    const text = element.textContent.trim();
    element.setAttribute('aria-label', text); element.textContent = '';
    const characters = []; let characterIndex = 0;
    text.split(/\s+/).forEach((word, i, words) => {
      const wrapper = document.createElement('span'); wrapper.className = 'motion-word'; wrapper.setAttribute('aria-hidden','true');
      [...word].forEach((letter,j) => { const span=document.createElement('span');span.className='motion-char';span.textContent=letter;wrapper.append(span);characters.push({span,start:i/words.length+j/(words.length*word.length),end:i/words.length+(j+1)/(words.length*word.length),always:characterIndex++<13}); });
      characterIndex++;
      element.append(wrapper); if(i < words.length-1) element.append(document.createTextNode(' '));
    });
    return {element,characters};
  });
  let scrollPending = false;
  function updateScroll() {
    scrollPending = false;
    reveals.forEach(({element,characters}) => {
      if (!element.getClientRects().length) return;
      const rect = element.getBoundingClientRect(), progress = reduced.matches ? 1 : clamp((innerHeight * .75 - rect.top) / (innerHeight * .6));
      characters.forEach(({span,start,end,always}) => span.style.opacity = String(always ? 1 : .1 + .9 * clamp((progress-start)/(end-start))));
    });
  }
  function scheduleScroll() { if(!scrollPending){scrollPending=true;requestAnimationFrame(updateScroll);} }
  addEventListener('scroll',scheduleScroll,{passive:true}); addEventListener('resize',scheduleScroll,{passive:true});

  const tickers = [];
  function setupTickers() {
    tickers.forEach(record => record.animation?.cancel()); tickers.length = 0;
    $$('[data-motion-ticker]').forEach(track => {
      $$('[data-motion-clone]',track).forEach(element=>element.remove());
      if (!track.getClientRects().length) return;
      const original = [...track.children]; if(!original.length)return;
      const first = original[0], last = original[original.length-1];
      const gap = parseFloat(getComputedStyle(track).gap) || 0;
      const distance = last.offsetLeft + last.offsetWidth - first.offsetLeft + gap;
      if (!distance) return;
      const copies = Math.max(2,Math.ceil(innerWidth / distance)+1);
      for(let i=0;i<copies;i++)original.forEach(element=>{const clone=element.cloneNode(true);clone.dataset.motionClone='true';clone.setAttribute('aria-hidden','true');$$('a,button',clone).forEach(a=>a.tabIndex=-1);track.append(clone);});
      track.style.opacity='1';
      const animation = reduced.matches ? null : track.animate([{transform:'translateX(0)'},{transform:`translateX(-${distance}px)`}],{duration:distance / Number(track.dataset.motionSpeed || 50) * 1000,iterations:Infinity,easing:'linear'});
      tickers.push({track,animation,distance});
    });
  }
  let tickerResize;
  addEventListener('resize',()=>{clearTimeout(tickerResize);tickerResize=setTimeout(setupTickers,180);});

  $$('[data-motion-hover]').forEach(element=>{
    const toggle = state => element.classList.toggle('hover',state);
    element.addEventListener('pointerenter',()=>toggle(true));element.addEventListener('pointerleave',()=>toggle(false));
    element.addEventListener('focusin',()=>toggle(true));element.addEventListener('focusout',()=>toggle(false));
  });
  $$('.motion-capabilities').forEach(group=>{
    $$('.motion-cap-trigger',group).forEach(trigger=>trigger.addEventListener('click',()=>{
      $$('.motion-cap',group).forEach(card=>{const active=card===trigger.parentElement;card.classList.toggle('is-active',active);card.querySelector('button').setAttribute('aria-expanded',String(active));card.querySelector('.motion-cap-content').setAttribute('aria-hidden',String(!active));});
    }));
  });
  function accordion(selector, triggerSelector, exclusive) {
    $$(selector).forEach(card=>card.querySelector(triggerSelector).addEventListener('click',()=>{
      const open=!card.classList.contains('is-open');
      if(exclusive)$$(selector).forEach(other=>{if(other!==card){other.classList.remove('is-open');other.querySelector(triggerSelector).setAttribute('aria-expanded','false');other.querySelector('[id]').setAttribute('aria-hidden','true');}});
      card.classList.toggle('is-open',open);card.querySelector(triggerSelector).setAttribute('aria-expanded',String(open));card.querySelector('[id]').setAttribute('aria-hidden',String(!open));
    }));
  }
  accordion('.motion-faq','.motion-faq-trigger',true);accordion('.motion-step','.motion-step-trigger',true);
  $$('.motion-faq,.motion-step').forEach(card=>card.querySelector('[id]').setAttribute('aria-hidden',String(!card.classList.contains('is-open'))));
  const nav=document.querySelector('[data-motion-nav]'),toggle=nav.querySelector('button');
  function closeMenu(){nav.classList.remove('is-open');toggle.setAttribute('aria-expanded','false');toggle.setAttribute('aria-label','Buka menu');}
  toggle.addEventListener('click',()=>{const open=nav.classList.toggle('is-open');toggle.setAttribute('aria-expanded',String(open));toggle.setAttribute('aria-label',open?'Tutup menu':'Buka menu');});
  document.addEventListener('keydown',event=>{if(event.key==='Escape')closeMenu();});
  document.addEventListener('click',event=>{
    if(!nav.contains(event.target))closeMenu();
    const link=event.target.closest('a[href^="#"]');if(!link)return;
    const target=document.querySelector(link.getAttribute('href'));if(!target)return;
    event.preventDefault();target.scrollIntoView({behavior:reduced.matches?'instant':'smooth',block:'start'});history.replaceState(null,'',link.getAttribute('href'));closeMenu();
  });
  async function initialize() {
    try { profile=await fetch('/motion-lab/motion-profile.json').then(response=>response.json()); }
    catch { /* Keep the content visible if the optional entrance profile cannot load. */ }
    await document.fonts.ready;
    startEntrances();setupTickers();updateScroll();
    $$('.sikepo-summary .sk-summary-card').forEach((element,index)=>{
      const observer=new IntersectionObserver(entries=>{if(entries.some(x=>x.isIntersecting)){entrance(element,{initial:{opacity:0,y:35,scale:1},animate:{opacity:1,y:0,scale:1,transition:{duration:.75,delay:index*.08}}});observer.disconnect();}},{threshold:.15});observer.observe(element);
    });
    document.documentElement.dataset.motionReady='true';
  }
  document.querySelector('[data-motion-replay]').addEventListener('click',()=>{
    scrollTo({top:0,behavior:'instant'});startEntrances();setupTickers();updateScroll();
  });
  if(document.readyState==='complete')initialize();else addEventListener('load',initialize,{once:true});
  reduced.addEventListener('change',()=>{startEntrances();setupTickers();updateScroll();});
})();
