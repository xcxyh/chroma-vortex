(() => {
  let ctx,noise,enabled=true,last=-1;
  function unlock(){
    if(!ctx){const Audio=window.AudioContext||window.webkitAudioContext;if(!Audio)return null;
      try{ctx=new Audio();noise=ctx.createBuffer(1,Math.ceil(ctx.sampleRate*.3),ctx.sampleRate);
        const data=noise.getChannelData(0);let v=0;for(let i=0;i<data.length;i++){v=.65*v+.35*(Math.random()*2-1);data[i]=v;}
      }catch(e){return null;}
    }
    if(ctx.state==='suspended')ctx.resume().catch(()=>{});return ctx;
  }
  function voice(from,to,delay,len,volume,source){
    const g=ctx.createGain(),t=ctx.currentTime+delay;
    g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(volume,t+.009);g.gain.exponentialRampToValueAtTime(.0001,t+len);g.connect(ctx.destination);
    if(source==='noise'){const n=ctx.createBufferSource(), f=ctx.createBiquadFilter();n.buffer=noise;f.type='lowpass';f.frequency.setValueAtTime(from,t);f.frequency.exponentialRampToValueAtTime(to,t+len);n.connect(f).connect(g);n.start(t);n.stop(t+len);}
    else{const o=ctx.createOscillator();o.type=source||'sine';o.frequency.setValueAtTime(from,t);o.frequency.exponentialRampToValueAtTime(to,t+len);o.connect(g);o.start(t);o.stop(t+len);}
  }
  function play(type){
    if(!enabled||document.hidden||!unlock())return;
    if(type==='cream'||type==='dust'){if(ctx.currentTime-last<.085)return;last=ctx.currentTime;}
    if(type==='cream'){voice(1150,330,0,.12,.22,'noise');voice(190,87,.008,.09,.07);}
    if(type==='rose'){voice(380,115,0,.14,.14);voice(560,250,.055,.095,.10);}
    if(type==='press'){voice(245,66,0,.17,.19);voice(910,210,.008,.1,.2,'noise');}
    if(type==='dust'){voice(1780,1420,0,.045,.044,'triangle');voice(2270,1930,.034,.065,.036);}
    if(type==='shutter'){voice(4400,760,0,.055,.40,'noise');voice(2200,460,.083,.075,.34,'noise');voice(870,870,.12,.14,.037);}
  }
  window.Foley={unlock,play,set:on=>{enabled=on;}};
})();

