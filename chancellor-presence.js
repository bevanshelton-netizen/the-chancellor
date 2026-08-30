(()=>{
  const portrait=document.querySelector('.chancellor-portrait');
  const avatar=document.querySelector('.avatar-img');
  const chat=document.querySelector('#messages');
  const stage=portrait?.closest('.portrait-stage');
  if(!portrait&&!avatar)return;

  function setState(state){
    [portrait,avatar].filter(Boolean).forEach(el=>{
      el.dataset.chancellorState=state;
      el.classList.toggle('chancellor-speaking',state==='speaking');
      el.classList.toggle('chancellor-listening',state==='listening');
      el.classList.toggle('chancellor-thinking',state==='thinking');
    });
    if(stage)stage.dataset.chancellorState=state;
  }

  window.ChancellorPresence={
    idle:()=>setState('idle'),
    listen:()=>setState('listening'),
    think:()=>setState('thinking'),
    speak:()=>setState('speaking')
  };

  setState('idle');

  const observer=new MutationObserver(()=>{
    const thinking=chat?.querySelector('.thinking');
    if(thinking)setState('thinking');
  });
  if(chat)observer.observe(chat,{childList:true,subtree:true});
})();
