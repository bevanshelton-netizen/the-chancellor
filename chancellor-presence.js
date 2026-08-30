(()=>{
  const portrait=document.querySelector('.chancellor-portrait');
  const avatar=document.querySelector('.avatar-img');
  const chat=document.querySelector('#messages');
  const stage=portrait?.closest('.portrait-stage');
  const mic=document.querySelector('#micButton');
  const voiceToggle=document.querySelector('#voiceToggle');
  if(!portrait&&!avatar)return;

  let resetTimer;
  function setState(state,timeout=0){
    clearTimeout(resetTimer);
    [portrait,avatar].filter(Boolean).forEach(el=>{
      el.dataset.chancellorState=state;
      el.classList.toggle('chancellor-speaking',state==='speaking');
      el.classList.toggle('chancellor-listening',state==='listening');
      el.classList.toggle('chancellor-thinking',state==='thinking');
    });
    if(stage)stage.dataset.chancellorState=state;
    if(timeout)resetTimer=setTimeout(()=>setState('idle'),timeout);
  }

  window.ChancellorPresence={
    idle:()=>setState('idle'),
    listen:()=>setState('listening'),
    think:()=>setState('thinking'),
    speak:(ms=4200)=>setState('speaking',ms)
  };

  setState('idle');

  mic?.addEventListener('click',()=>setState('listening',7000));
  voiceToggle?.addEventListener('click',()=>setTimeout(()=>setState('speaking',1800),60));

  const observer=new MutationObserver(mutations=>{
    if(chat?.querySelector('.thinking')){setState('thinking');return;}
    for(const mutation of mutations){
      for(const node of mutation.addedNodes){
        if(node.nodeType===1&&node.matches?.('.message.bot:not(.thinking)')){
          const words=(node.textContent||'').trim().split(/\s+/).filter(Boolean).length;
          const voiceOn=/Voice on/i.test(voiceToggle?.textContent||'');
          setState(voiceOn?'speaking':'idle',voiceOn?Math.min(12000,Math.max(1800,words*360)):0);
          return;
        }
      }
    }
  });
  if(chat)observer.observe(chat,{childList:true,subtree:true});
})();
