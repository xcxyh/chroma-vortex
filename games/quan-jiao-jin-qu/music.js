// "糖勺跳跳" — original 16-bar instrumental, 120 BPM, F major.
(() => {
  "use strict";
  const beat = .5, rate = 24000;
  // Each row carries the bass root, three offbeat plucks, and an eight-slot mallet phrase.
  const score = [
    [41,[57,60,65],[69,0,72,74,72,0,69,67]],
    [38,[53,57,60],[65,69,0,72,69,0,0,65]],
    [43,[55,58,62],[67,0,70,72,74,0,70,67]],
    [36,[52,58,60],[64,67,0,70,67,0,0,0]],
    [41,[53,57,60],[69,0,72,74,77,0,76,72]],
    [45,[55,60,64],[69,72,0,76,72,0,69,0]],
    [46,[53,58,62],[70,0,74,72,70,0,67,65]],
    [36,[55,58,64],[67,0,64,67,0,0,60,64]],
    [38,[53,57,62],[65,0,69,0,74,72,69,0]],
    [45,[55,60,64],[67,69,72,0,76,0,72,0]],
    [46,[53,58,62],[74,0,70,67,65,0,67,70]],
    [36,[52,58,62],[72,0,70,0,67,64,0,0]],
    [41,[57,60,65],[69,0,72,74,77,0,72,69]],
    [38,[53,57,60],[65,69,0,72,74,0,72,69]],
    [43,[53,58,62],[70,0,67,65,64,67,70,0]],
    [36,[52,58,60],[67,0,64,0,60,0,0,0]]
  ];

  async function makeLoop(context) {
    const buffer = context.createBuffer(1, rate * beat * 4 * score.length, rate);
    const track = buffer.getChannelData(0), cache = new Map();
    function sample(voice, midi) {
      const key = voice + midi;
      if (cache.has(key)) return cache.get(key);
      const length = {mallet:.44, pluck:.18, bass:.34, shaker:.065, tick:.085}[voice];
      const pcm = new Float32Array(Math.ceil(length * rate));
      const omega = 2 * Math.PI * 440 * Math.pow(2,(midi-69)/12);
      let seed = 7719, previous = 0;
      for (let i=0;i<pcm.length;i++) {
        const t=i/rate, p=t*omega;
        const attack=Math.min(1,t/.005), release=Math.min(1,(pcm.length-1-i)/(rate*.016));
        let wave;
        switch (voice) {
          case "mallet":
            wave = Math.sin(p)*Math.exp(-8*t) + .35*Math.sin(3.99*p)*Math.exp(-26*t) + .1*Math.sin(7*p)*Math.exp(-45*t); break;
          case "pluck":
            wave = (Math.sin(p)+.38*Math.sin(2*p)+.19*Math.sin(3*p))*Math.exp(-19*t); break;
          case "bass":
            wave = (Math.sin(p)+.28*Math.sin(2*p))*Math.exp(-6*t); break;
          case "tick":
            wave = (Math.sin(2*Math.PI*830*t)+.5*Math.sin(2*Math.PI*1240*t))*Math.exp(-55*t); break;
          default: {
            seed = (Math.imul(seed,1664525)+1013904223)>>>0;
            const noise=seed/2147483648-1;
            wave=(noise-previous)*Math.exp(-58*t); previous=noise;
          }
        }
        pcm[i]=wave*attack*release;
      }
      cache.set(key,pcm);
      return pcm;
    }
    function place(sound, at, volume) {
      const start=Math.round(at*rate);
      for(let i=0;i<sound.length;i++) track[(start+i)%track.length]+=sound[i]*volume;
    }
    for(let bar=0;bar<score.length;bar++) {
      const [root,chord,melody]=score[bar], start=bar*4*beat;
      for(let i=0;i<8;i++){
        const offbeat=i%2===1;
        const at=start+(Math.floor(i/2)+(offbeat ? .56 : 0))*beat;
        if(melody[i])place(sample("mallet",melody[i]),at,offbeat ? .23 : .30);
        if(offbeat)chord.forEach((note,k)=>place(sample("pluck",note),at+k*.008,i===7 ? .049 : .065));
        place(sample("shaker",0),at,offbeat ? .038 : .017);
        if(i===2||i===6)place(sample("tick",0),at+.006,.083);
      }
      place(sample("bass",root),start,.32);
      place(sample("bass",root+7),start+2*beat,.245);
      if(bar%4===3)place(sample("bass",score[(bar+1)%score.length][0]-1),start+3.56*beat,.17);
      if(bar%4===0)await new Promise(done=>setTimeout(done,0));
    }
    return buffer;
  }

  window.installCupMusic = function (foley, book) {
    const button=document.getElementById("music");
    let ready=false, interacted=false, present=true, preparing=null, buffer=null, source=null, gain=null;
    let offset=0, startedAt=0;
    function pause() {
      if(!source)return;
      const now=foley.context.currentTime;
      offset=(offset+now-startedAt)%buffer.duration;
      gain.gain.cancelScheduledValues(now);
      gain.gain.setTargetAtTime(0,now,.006);
      source.stop(now+.035);
      source=null;gain=null;
    }
    function sync() {
      const ctx=foley.context;
      if(!ready || !book.data.musicEnabled || !interacted || !present || document.hidden){pause();return;}
      if(!ctx || source)return;
      if(ctx.state!=="running"){
        if(ctx.state!=="closed")ctx.resume().catch(()=>{});
        return;
      }
      if(!buffer){
        if(!preparing)preparing=makeLoop(ctx).then(result=>{buffer=result;sync();}).catch(()=>{preparing=null;});
        return;
      }
      source=ctx.createBufferSource();
      source.buffer=buffer;source.loop=true;
      gain=ctx.createGain();
      startedAt=ctx.currentTime;
      gain.gain.setValueAtTime(0,startedAt);
      gain.gain.linearRampToValueAtTime(.32,startedAt+.055);
      source.connect(gain).connect(ctx.destination);
      const node=source, channel=gain;
      node.onended=()=>{node.disconnect();channel.disconnect();};
      source.start(startedAt,offset);
    }
    let observedContext=null;
    function gesture(event) {
      if(!event.isTrusted)return;
      interacted=true;
      if(ready&&!book.data.musicEnabled)return;
      const ctx=foley.getContext();
      if(ctx&&ctx!==observedContext){observedContext=ctx;ctx.addEventListener("statechange",sync);}
      if(ctx && ctx.state!=="running")ctx.resume().catch(()=>{});
      sync();
    }
    function label(){
      button.textContent=book.data.musicEnabled?"音乐开":"音乐关";
      button.setAttribute("aria-pressed",String(book.data.musicEnabled));
    }
    for(const type of ["pointerdown","pointerup","touchend","keydown","click"]){
      document.addEventListener(type,e=>{if(e.target!==button)gesture(e);},{capture:true,passive:true});
    }
    button.addEventListener("click",event=>{
      book.data.musicEnabled=!book.data.musicEnabled;
      label();gesture(event);sync();book.save();
    });
    document.addEventListener("visibilitychange",sync);
    window.addEventListener("pagehide",()=>{present=false;pause();});
    window.addEventListener("pageshow",()=>{present=true;sync();});
    return ()=>{ready=true;label();button.disabled=false;sync();};
  };
})();
