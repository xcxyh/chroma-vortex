(() => {
  "use strict";
  const tau = Math.PI * 2;
  const sugar = ["#e63773","#ffbd23","#53c1a6","#6088e5","#fbf2c6","#b878d9"];

  function particles(kind, seed) {
    let state = seed >>> 0;
    const random = () => ((state = (Math.imul(state, 1664525) + 1013904223) >>> 0) / 4294967296);
    const count = kind === "pearl" ? 5 : kind === "cookie" ? 23 : 26;
    const pieces = [];
    for (let i = 0; i < count; i++) {
      const angle = i * 2.4 + random() * .32;
      const radius = kind === "pearl" ? (i ? .25 + .045 * random() : .04) : .39 * Math.sqrt(random());
      const size = kind === "pearl" ? .099 + random() * .028 :
        kind === "cookie" ? (i < 6 ? .062 : .017) * (.7 + .7 * random()) : .026 + random() * .016;
      pieces.push({x:Math.cos(angle)*radius,y:Math.sin(angle)*radius,size,angle:random()*tau,
        delay:random()*.25,shape:Array.from({length:7},()=>.63+.37*random()),
        flecks:Array.from({length:9},()=>[random()-.5,random()-.5,random()]),
        shade:Math.floor(random()*sugar.length)});
    }
    return pieces.sort((a,b)=>a.y-b.y);
  }
  function pearl(ctx) {
    const shine=ctx.createRadialGradient(-.36,-.48,.06,.17,.13,1.24);
    shine.addColorStop(0,"#ddbc99");shine.addColorStop(.19,"#926754");
    shine.addColorStop(.44,"#4f342e");shine.addColorStop(.78,"#291c20");shine.addColorStop(1,"#614739");
    ctx.fillStyle=shine;ctx.beginPath();ctx.arc(0,0,1,0,tau);ctx.fill();
    ctx.fillStyle="#fce8cc";ctx.beginPath();ctx.ellipse(-.36,-.45,.19,.10,-.6,0,tau);ctx.fill();
  }
  function cookie(ctx,p) {
    ctx.beginPath();
    p.shape.forEach((r,i)=>{const a=i*tau/p.shape.length,x=r*Math.cos(a),y=r*Math.sin(a);if(i)ctx.lineTo(x,y);else ctx.moveTo(x,y);});
    ctx.closePath();ctx.fillStyle=["#382720","#2c2421","#45342a"][p.shade%3];ctx.fill();ctx.clip();
    for(const [x,y,n] of p.flecks){
      ctx.fillStyle=n>.78?"#e0d0af":n>.36?"#785c47":"#171313";
      ctx.fillRect(x*1.5,y*1.5,.09+n*.15,.11+n*.1);
    }
  }
  function candy(ctx,p) {
    ctx.lineCap="round";ctx.lineWidth=.68;ctx.strokeStyle=sugar[p.shade];
    ctx.beginPath();ctx.moveTo(-.8,0);ctx.lineTo(.8,0);ctx.stroke();
    ctx.strokeStyle="rgba(255,255,255,.6)";ctx.lineWidth=.12;
    ctx.beginPath();ctx.moveTo(-.61,-.16);ctx.lineTo(.42,-.16);ctx.stroke();
  }
  function sprite(kind, seed, animated) {
    const canvas=document.createElement("canvas"), ctx=canvas.getContext("2d");
    canvas.width=canvas.height=192;canvas.setAttribute("aria-hidden","true");
    const bits=particles(kind,seed), size=canvas.width, length=kind==="pearl"?540:kind==="cookie"?390:670;
    function draw(t) {
      ctx.clearRect(0,0,size,size);
      for(const p of bits){
        const u=Math.min(1,Math.max(0,(t-p.delay)/(1-p.delay)));
        if(u===0)continue;
        const remaining=1-u;
        const spread=kind==="pearl"?1-.47*remaining:kind==="cookie"?1-.22*remaining:1-.83*remaining;
        const hop=kind==="pearl"?Math.abs(Math.sin(u*2.5*tau))*.18*remaining:0;
        const fall=kind==="sugar"?.28:.12;
        ctx.save();ctx.translate(size*(.5+p.x*spread),size*(.5+p.y*spread-hop-fall*remaining*remaining));
        ctx.scale(size*p.size,size*p.size);
        ctx.rotate(kind==="pearl"?0:p.angle+remaining*(kind==="sugar"?3.6:.9));
        if(kind==="pearl")pearl(ctx);else if(kind==="cookie")cookie(ctx,p);else candy(ctx,p);
        ctx.restore();
      }
    }
    if(animated && !window.matchMedia("(prefers-reduced-motion: reduce)").matches){
      const start=performance.now();draw(.08);
      function tick(now){if(!document.documentElement.contains(canvas))return;const t=Math.min(1,.08+(now-start)/length);draw(t);if(t<1)requestAnimationFrame(tick);}
      requestAnimationFrame(tick);
    } else draw(1);
    return canvas;
  }
  window.sprinkleSprite=sprite;
})();
