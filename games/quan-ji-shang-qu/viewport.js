(() => {
  const root=document.documentElement, slot=document.querySelector('.case-slot'),can=document.getElementById('case');
  let frame=0,nativeTimer=0;
  function size(){
    frame=0;const vv=window.visualViewport, height=Math.floor(vv&&vv.scale===1?Math.min(innerHeight,vv.height):innerHeight);
    root.style.setProperty('--play-height',height+'px');
    const rect=slot.getBoundingClientRect();if(rect.width>0&&rect.height>0){
      const h=Math.floor(Math.min(rect.height*.98,rect.width*720/420,670));can.style.width=(h*420/720)+'px';can.style.height=h+'px';
      window.dispatchEvent(new Event('atelier-layout'));
    }
  }
  function schedule(){if(!frame)frame=requestAnimationFrame(size);}
  function safe(info){
    if(!info)return;let top=Math.max(34,Number(info.safeArea&&info.safeArea.top)||0);
    const btn=info.menuButtons||{},valid=r=>r&&r.width>0&&r.height>0;
    (valid(btn.capsule)?[btn.capsule]:[btn.back,btn.me,btn.share].filter(valid)).forEach(r=>{top=Math.max(top,r.bottom+4);});
    root.style.setProperty('--top-space',Math.ceil(top)+'px');schedule();
  }
  const x=window.xhs;safe(x&&x.launchOptions&&x.launchOptions.miniToolEnv&&x.launchOptions.miniToolEnv.windowInfo);
  function measure(){const s=x&&x.miniTool;if(s&&s.getWindowInfo)Promise.resolve().then(()=>s.getWindowInfo()).then(safe).catch(()=>{});}
  window.addEventListener('resize',()=>{schedule();clearTimeout(nativeTimer);nativeTimer=setTimeout(measure,180);});
  window.addEventListener('orientationchange',schedule);window.addEventListener('pageshow',schedule);
  if(window.visualViewport)window.visualViewport.addEventListener('resize',schedule);
  if(window.ResizeObserver)new ResizeObserver(schedule).observe(slot);
  window.refreshAtelier=schedule;size();measure();
})();

