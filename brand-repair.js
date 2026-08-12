(()=>{
  const apply=async()=>{
    try{
      const r=await fetch('/brand-assets.js?v=20260812-3',{cache:'no-store'});
      if(!r.ok)throw new Error('brand asset bundle unavailable');
      const text=await r.text();
      const portrait=text.match(/const portrait='(data:image\/webp;base64,[^']+)'/i)?.[1];
      const crest=text.match(/const crest='(data:image\/webp;base64,[^']+)'/i)?.[1];
      if(portrait){
        document.querySelectorAll('.chancellor-portrait,.avatar-img,.rescue-portrait').forEach(el=>{
          el.src=portrait;
          el.style.visibility='visible';
          el.style.opacity='1';
          el.dataset.brandReady='1';
        });
      }
      if(crest){
        document.querySelectorAll('.crest-logo').forEach(el=>{
          el.src=crest;
          el.dataset.brandReady='1';
        });
      }
    }catch(error){
      console.warn('Approved Chancellor brand fallback could not be applied:',error.message);
    }
  };
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',apply,{once:true});
  else apply();
  window.addEventListener('pageshow',()=>setTimeout(apply,50));
})();
