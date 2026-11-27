(() => {
  // 《奶油小铺》 • 78 BPM, 3/4. Sixteen bars of original waltz for felt piano and pizzicato bass.
  const bars=[
    [48,55,64,72,76,74],[45,52,60,72,69,0],[53,60,65,69,72,77],[43,55,62,74,71,0],
    [48,55,64,76,79,76],[52,59,67,74,71,67],[50,57,65,69,74,72],[43,53,62,71,0,67],
    [53,57,64,69,72,76],[52,55,62,74,71,67],[45,52,60,72,76,81],[50,57,65,77,74,0],
    [53,60,69,76,72,69],[43,55,65,74,77,71],[48,55,64,72,67,64],[48,55,60,67,0,72]
  ];
  let enabled=true, active=false, timer=0,step=0,next=0,bus,ctx,present=true;
  const beat=60/78;
  function note(midi,t,len,gain,type){
    if(!midi)return;const o=ctx.createOscillator(),g=ctx.createGain();
    o.type=type;o.frequency.value=440*Math.pow(2,(midi-69)/12);g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(gain,t+.024);
    g.gain.exponentialRampToValueAtTime(.0001,t+len);o.connect(g).connect(bus);o.start(t);o.stop(t+len);
  }
  function pump(){
    if(next<ctx.currentTime-.2)next=ctx.currentTime+.015;
    while(next<ctx.currentTime+.17){
      const bar=bars[Math.floor(step/3)],b=step%3;
      note(bar[b],next,b===0?.64:.42,b===0?.085:.045,'sine');
      if(b)note(bar[2]+7,next+.032,.40,.020,'triangle');
      note(bar[3+b],next+.009,.67,.065,'sine');note(bar[3+b]?bar[3+b]+12:0,next+.02,.33,.016,'triangle');
      next+=beat;step=(step+1)%48;
    }
  }
  function sync(){
    if(!enabled||!present||!active||document.hidden){
      if(timer){clearInterval(timer);timer=0;bus.disconnect();bus=null;}return;
    }
    if(timer)return;ctx=Foley.unlock();if(!ctx)return;
    bus=ctx.createGain();bus.gain.value=.75;bus.connect(ctx.destination);next=ctx.currentTime+.035;pump();timer=setInterval(pump,90);
  }
  function gesture(){active=true;sync();}
  document.addEventListener('pointerdown',gesture,{capture:true,passive:true});
  document.addEventListener('keydown',gesture);
  document.addEventListener('visibilitychange',sync);window.addEventListener('pagehide',()=>{present=false;sync();});
  window.addEventListener('pageshow',()=>{present=true;sync();});
  window.ShopMusic={set(on){enabled=on;sync();}};
})();

