(() => {
  'use strict';
  const W=420,H=720, TAU=Math.PI*2, C=window.Catalog;
  const outer=[49,26,322,661,48], inner=[58,36,304,641,41], camera=[66,44,128,133,32];
  function surface(w,h){const c=document.createElement('canvas');c.width=w;c.height=h;return c;}
  function rect(path,x,y,w,h,r){
    path.moveTo(x+r,y);path.arcTo(x+w,y,x+w,y+h,r);path.arcTo(x+w,y+h,x,y+h,r);
    path.arcTo(x,y+h,x,y,r);path.arcTo(x,y,x+w,y,r);path.closePath();
  }
  function inside(x,y,box){
    const [a,b,w,h,r]=box;
    const dx=Math.max(a+r-x,0,x-a-w+r),dy=Math.max(b+r-y,0,y-b-h+r);
    return dx*dx+dy*dy<=r*r;
  }
  const allowed=(x,y)=>inside(x,y,inner)&&!inside(x,y,camera);
  const mask=new Path2D();rect(mask,...inner);rect(mask,...camera);
  function plate(g,box,fill,stroke,line){
    g.beginPath();rect(g,...box);
    if(fill){g.fillStyle=fill;g.fill();}
    if(stroke){g.lineWidth=line||1;g.strokeStyle=stroke;g.stroke();}
  }
  function gradient(g,x,y,xx,yy,stops){
    const a=g.createLinearGradient(x,y,xx,yy);stops.forEach(([at,c])=>a.addColorStop(at,c));return a;
  }
  function ball(g,x,y,r,stops){
    const a=g.createRadialGradient(x-r*.38,y-r*.43,r*.02,x,y,r);
    stops.forEach(([at,c])=>a.addColorStop(at,c));g.fillStyle=a;g.beginPath();g.arc(x,y,r,0,TAU);g.fill();
  }
  function glass(g,base){
    const tint=C.get('bases',base).color;
    // Cast the rim and its shadow outside the clear back, leaving the mat visible through it.
    g.save();g.beginPath();g.rect(-40,-40,W+80,H+80);rect(g,...inner);g.clip('evenodd');
    g.save();g.shadowColor='rgba(82,44,51,.32)';g.shadowBlur=15;g.shadowOffsetX=6;g.shadowOffsetY=11;
    plate(g,outer,'#d1bfb9');g.restore();
    const edge=gradient(g,42,15,376,690,[[0,'#fbf8eb'],[.16,'#ad9897'],[.23,'#fff8eb'],[.44,'#b09d9a'],[.61,'#fff9f5'],[.83,'#c0a6a1'],[1,'#f8eadb']]);
    plate(g,outer,edge,'#ab9695',2);
    plate(g,[53,30,314,651,46],null,'rgba(255,255,255,.91)',3);
    g.restore();
    const glassFill=gradient(g,53,52,362,646,[[0,'#fffaf1'],[.15,tint],[.34,'#fffaf2'],[.43,tint],[.77,tint],[1,'#f7e6db']]);
    g.save();g.globalAlpha=base==='clear'?.53:.81;plate(g,inner,glassFill);g.restore();
    plate(g,inner,null,'rgba(132,104,100,.52)',2);
    g.save();g.beginPath();rect(g,...inner);g.clip();
    const shine=gradient(g,0,350,240,500,[[0,'rgba(255,255,255,0)'],[.37,'rgba(255,255,255,.1)'],[.42,'rgba(255,255,255,.68)'],[.48,'rgba(255,255,255,.12)'],[.55,'rgba(255,255,255,.45)'],[.77,'rgba(255,255,255,0)']]);
    g.fillStyle=shine;g.fillRect(57,36,307,644);
    g.strokeStyle='rgba(171,139,134,.19)';g.lineWidth=1;g.beginPath();g.arc(210,609,10,0,TAU);g.stroke();
    g.fillStyle='rgba(140,111,108,.43)';g.font='italic 14px Georgia';g.textAlign='center';g.fillText('c',210,613);g.font='8px Georgia';g.fillText('C R E A M   A T E L I E R',210,638);g.restore();
    // Raised impact bumpers catch light along all four corners.
    for(const [x,y,flipX,flipY] of [[51,28,1,1],[369,28,-1,1],[51,684,1,-1],[369,684,-1,-1]]){
      g.save();g.translate(x,y);g.scale(flipX,flipY);
      g.beginPath();g.moveTo(3,59);g.quadraticCurveTo(-1,1,58,3);g.lineWidth=6;g.strokeStyle='rgba(255,255,255,.7)';g.stroke();
      g.beginPath();g.moveTo(8,50);g.quadraticCurveTo(7,9,47,8);g.lineWidth=1.8;g.strokeStyle='#b49f9c';g.stroke();g.restore();
    }
    plate(g,[45,178,4,38,2],'#cbb6b0');plate(g,[45,229,4,52,2],'#cbb6b0');plate(g,[371,207,4,71,2],'#cbb6b0');
    g.save();g.shadowColor='rgba(77,52,62,.38)';g.shadowBlur=5;g.shadowOffsetY=3;plate(g,camera,edge);g.restore();
    plate(g,camera,edge,'#ac9b99',2);plate(g,[70,48,120,125,28],glassFill,'#fffaf2',2);
    for(const [x,y] of [[101,79],[154,138]]){
      ball(g,x,y,27,[[0,'#fff'],[.74,'#b7a7a3'],[.82,'#fff9ef'],[.90,'#827976'],[1,'#b9aaa6']]);
      ball(g,x,y,22.7,[[0,'#373c47'],[.38,'#111923'],[.66,'#232731'],[.8,'#0a1017'],[1,'#42434b']]);
      ball(g,x,y,13,[[0,'#47516c'],[.34,'#141b26'],[.7,'#090e16'],[1,'#394355']]);
      ball(g,x-5,y-7,3.2,[[0,'#e9f9ff'],[1,'#6e8494']]);ball(g,x+4,y+4,2,[[0,'#a5a0d2'],[1,'#3e4963']]);
      g.beginPath();g.arc(x,y,19,3.32,4.65);g.strokeStyle='rgba(208,224,243,.58)';g.lineWidth=1.3;g.stroke();
    }
    ball(g,159,75,9,[[0,'#fffde8'],[.62,'#fff2ce'],[.85,'#d0bda2'],[1,'#f7ead7']]);
    ball(g,98,143,4,[[0,'#776a62'],[.7,'#382f2e'],[1,'#b9a698']]);
  }

  // Bake a small height field per pastry tip. Its normals determine light, creases and wet highlights.
  const stamps=new Map(), pixels=104, unit=46;
  const rgb=s=>[1,3,5].map(i=>parseInt(s.slice(i,i+2),16));
  function relief(tip,x,y,phase){
    const angle=Math.atan2(y,x), r=Math.sqrt(x*x+y*y);
    let ridge, boundary, stripe;
    if(tip==='ribbon'){
      const u=x+.15*Math.sin(y*3.9+phase), v=y;
      boundary=1-Math.pow(Math.abs(u)/.73,3)-Math.pow(Math.abs(v)/.96,5);
      ridge=.5+.5*Math.cos(v*14+u*3+phase);
      stripe=Math.sin(v*5.4+1.6*u+phase);
    }else{
      const rose=tip==='rosette';
      // The rosette is one coiled strip: its curled lip undulates into overlapping petals.
      const turn=15.8*r-angle+.82*Math.sin(5*angle-8*r+phase)*Math.min(1,r*3)+phase;
      const fold=rose?turn:angle*8-r*2.8+phase;
      ridge=.5+.5*Math.cos(fold);
      boundary=1-r/(rose?.91+.055*Math.cos(5*angle-6*r+phase):.87+.095*Math.cos(8*angle+phase-r));
      stripe=rose?Math.sin(angle*2-r*7+.6*Math.sin(turn)):Math.sin(angle*2-r*3+phase);
    }
    if(boundary<=0) return [0,stripe,0];
    const dome=Math.sqrt(Math.min(1,boundary));
    const lip=tip==='rosette'?Math.pow(ridge,.64):ridge;
    return [dome*(.53+.47*lip),stripe,ridge];
  }
  function stamp(tip,id,phaseIndex){
    const key=[tip,id,phaseIndex].join('/');
    if(stamps.has(key))return stamps.get(key);
    const paint=C.get('creams',id), a=rgb(paint.a), b=rgb(paint.b||paint.a);
    const img=surface(pixels,pixels), g=img.getContext('2d'), data=g.createImageData(pixels,pixels);
    const z=new Float32Array(pixels*pixels),blend=new Float32Array(z.length),ridge=new Float32Array(z.length);
    const phase=phaseIndex*Math.PI/4;
    for(let i=0;i<z.length;i++){
      const x=((i%pixels)-pixels/2)/unit,y=(Math.floor(i/pixels)-pixels/2)/unit;
      const h=relief(tip,x,y,phase);z[i]=h[0];blend[i]=Math.min(1,Math.max(0,.5+h[1]*3));ridge[i]=h[2];
    }
    for(let i=pixels+1;i<z.length-pixels-1;i++){
      const k=i*4, height=z[i];
      if(!height){
        const shadow=z[i-3*pixels-2]||0;
        data.data[k]=105;data.data[k+1]=63;data.data[k+2]=62;data.data[k+3]=Math.min(68,shadow*185);continue;
      }
      const dx=(z[i+1]-z[i-1])*15,dy=(z[i+pixels]-z[i-pixels])*15;
      const inv=1/Math.sqrt(1+dx*dx+dy*dy);
      const light=Math.max(0,(.46*dx+.55*dy+.69)*inv);
      const spec=Math.pow(Math.max(0,(.25*dx+.31*dy+.91)*inv),19);
      const shade=.67+.34*light+.035*ridge[i];
      for(let ch=0;ch<3;ch++){
        const color=a[ch]+(b[ch]-a[ch])*blend[i];
        data.data[k+ch]=color*shade+(255-color*.63)*(spec*.36+height*.04)-(2-ch)*(1-light)*2;
      }
      data.data[k+3]=Math.min(255,height*3800);
    }
    g.putImageData(data,0,0);stamps.set(key,img);return img;
  }
  function drawStamp(g,s){
    const img=stamp(s.tip,s.color,s.phase);
    g.save();g.translate(s.x,s.y);g.rotate(s.angle);g.scale(s.rx/unit,s.ry/unit);
    g.drawImage(img,-pixels/2,-pixels/2);g.restore();
  }
  const images={};
  const fileImages=new Promise(resolve=>{
    if(location.protocol!=='file:'){resolve();return;}
    const script=document.createElement('script');script.src='./assets/charms/offline.js';
    script.onload=script.onerror=()=>resolve();document.head.appendChild(script);
  });
  const ready=fileImages.then(()=>Promise.all(C.charms.map(item=>new Promise(resolve=>{
    const img=new Image();img.onload=()=>{images[item.id]=img;resolve(true);};img.onerror=()=>resolve(false);img.src=(window.FileCharmImages&&window.FileCharmImages[item.id])||item.src;
  }))));
  function resin(g,p,scale,selected){
    const size=94*p.scale, img=images[p.id];if(!img)return;
    g.save();g.translate(p.x,p.y);g.rotate(p.angle);g.scale(scale,scale);
    g.save();g.scale(1,.83);
    ball(g,2,6,size*.43,[[0,'rgba(107,65,63,.32)'],[.75,'rgba(134,82,77,.23)'],[.93,'rgba(255,247,226,.35)'],[1,'rgba(255,247,226,0)']]);
    g.restore();g.shadowColor='rgba(78,41,41,.38)';g.shadowBlur=4;g.shadowOffsetY=4;
    g.drawImage(img,-size/2,-size/2,size,size);g.shadowColor='transparent';
    if(selected){g.strokeStyle='#8b5363';g.lineWidth=1.8;g.setLineDash([4,5]);g.beginPath();g.arc(0,0,size*.5,0,TAU);g.stroke();}
    g.restore();
  }
  const sugar=['#ed91a7','#b2c888','#eab76e','#c5a8d6','#9ac5ce'];
  function sprinkle(g,p){
    g.save();g.translate(p.x,p.y);g.rotate(p.a);g.scale(p.s,p.s);
    if(p.id==='pearl'){
      ball(g,1,2,5.6,[[0,'#ac8b7c'],[.76,'#cab5a2'],[1,'rgba(140,104,86,0)']]);
      ball(g,0,0,5,[[0,'#ffffff'],[.32,'#fff9ed'],[.62,'#f5dec8'],[.88,'#c6afb1'],[1,'#fbe4d2']]);
    }else if(p.id==='sugar'){
      plate(g,[-2,-6,4.4,12,2],sugar[p.t], '#b99c8d',.55);plate(g,[-.9,-4.5,1,7,.5],'#fff4d7');
    }else if(p.id==='flower'){
      for(let j=0;j<5;j++){g.rotate(TAU/5);ball(g,0,-4.6,3.7,[[0,'#fffbed'],[1,'#ecafbd']]);}
      ball(g,0,0,2.8,[[0,'#ffeb9f'],[1,'#d39d4f']]);
    }else{
      g.beginPath();for(let j=0;j<8;j++){const r=j%2?1.8:6;g.lineTo(Math.cos(j*TAU/8)*r,Math.sin(j*TAU/8)*r);}g.closePath();g.fillStyle='#fff4bf';g.fill();g.strokeStyle='#d3a25e';g.lineWidth=.8;g.stroke();
    }
    g.restore();
  }

  const cell=8,cols=Math.ceil(W/cell),rows=Math.ceil(H/cell);
  const valid=new Uint8Array(cols*rows);let total=0;
  for(let y=0;y<rows;y++)for(let x=0;x<cols;x++)if(allowed((x+.5)*cell,(y+.5)*cell)){valid[y*cols+x]=1;total++;}
  class Engine{
    constructor(canvas,changed){
      this.canvas=canvas;canvas.width=W;canvas.height=H;this.changed=changed||function(){};
      this.base='clear';this.history=[];this.selected=null;this.serial=0;this.layers={};
      for(const key of ['glass','cream','dust'])this.layers[key]=surface(W,H);
      this.resetLayers();this.updateBase();this.request();
      ready.then(()=>this.request());
    }
    updateBase(){const g=this.layers.glass.getContext('2d');g.clearRect(0,0,W,H);glass(g,this.base);this.request();}
    resetLayers(){
      this.grid=new Uint8Array(valid.length);this.counts=Array(8).fill(0);this.covered=0;this.charms=[];this.mix={};this.used=new Set();this.nozzles=new Set();
      for(const key of ['cream','dust']){
        const g=this.layers[key].getContext('2d');g.restore();g.clearRect(0,0,W,H);g.save();g.clip(mask,'evenodd');
      }
    }
    request(){
      if(this.frame)return;
      this.frame=requestAnimationFrame(now=>{this.frame=0;this.paint(this.canvas,true,now);});
    }
    paint(canvas,live,now){
      const g=canvas.getContext('2d');g.clearRect(0,0,canvas.width,canvas.height);g.save();g.scale(canvas.width/W,canvas.height/H);
      g.drawImage(this.layers.glass,0,0);g.drawImage(this.layers.cream,0,0);
      g.save();g.clip(mask,'evenodd');
      if(live&&this.hold){
        const s=this.rose(now);drawStamp(g,s);if(now-this.hold.time<1050)this.request();
      }
      g.drawImage(this.layers.dust,0,0);
      for(const p of this.charms){
        const age=live?(now-p.born)/350:1;
        const scale=age>=0&&age<1?1+.22*Math.sin(age*Math.PI*2.5)*Math.exp(-3*age):1;
        resin(g,p,scale,live&&p.key===this.selected);
        if(age>=0&&age<1)this.request();
      }
      g.restore();g.restore();
    }
    applyStamp(s){
      drawStamp(this.layers.cream.getContext('2d'),s);
      const radius=Math.max(s.rx,s.ry)*1.1, ca=Math.cos(s.angle),sa=Math.sin(s.angle);
      const pigment=C.creams.findIndex(c=>c.id===s.color)+1;
      for(let y=Math.max(0,Math.floor((s.y-radius)/cell));y<=Math.min(rows-1,Math.floor((s.y+radius)/cell));y++){
        for(let x=Math.max(0,Math.floor((s.x-radius)/cell));x<=Math.min(cols-1,Math.floor((s.x+radius)/cell));x++){
          const i=y*cols+x;if(!valid[i]||this.grid[i]===pigment)continue;
          const dx=(x+.5)*cell-s.x,dy=(y+.5)*cell-s.y;
          const u=(dx*ca+dy*sa)/s.rx,v=(dy*ca-dx*sa)/s.ry;
          if(relief(s.tip,u,v,s.phase*Math.PI/4)[0]<=0)continue;
          if(this.grid[i])this.counts[this.grid[i]-1]--;else this.covered++;
          this.grid[i]=pigment;this.counts[pigment-1]++;
        }
      }
      this.used.add(s.color);this.nozzles.add(s.tip);
    }
    notify(){this.request();this.changed();}
    recordStamp(s){this.stroke.items.push(s);this.applyStamp(s);}
    deposit(x,y,angle,factor){
      const p=this.stroke, wave=(1+Math.cos(p.distance*.16))*.5;
      const width=p.tip==='ribbon'?31:19+wave*6;
      this.recordStamp({x,y,angle:angle+(p.tip==='ribbon'?Math.sin(p.distance*.09)*.22:0),rx:(p.tip==='ribbon'?15:width)*factor,ry:width*factor,phase:Math.floor(p.distance/18)%4,color:p.color,tip:p.tip});
    }
    begin(x,y,tool){
      if(!allowed(x,y))return false;
      this.selected=null;
      if(tool.tip==='rosette'){this.hold={x,y,time:performance.now(),color:tool.color};this.request();return true;}
      this.stroke={kind:'cream',items:[],tip:tool.tip,color:tool.color,distance:0,carry:0,x,y,rawX:x,rawY:y,angle:0};
      this.deposit(x,y,0,.84);this.notify();return true;
    }
    rose(now){const h=this.hold,r=30+Math.min(1,Math.max(0,(now-h.time)/1000))*25;
      return {tip:'rosette',color:h.color,x:h.x,y:h.y,angle:0,phase:1,rx:r,ry:r};}
    line(x,y){
      const p=this.stroke,dx=x-p.x,dy=y-p.y,length=Math.hypot(dx,dy);if(!length)return;
      const angle=Math.atan2(dy,dx),spacing=p.tip==='ribbon'?4.8:5.5;
      for(let d=spacing-p.carry;d<=length;d+=spacing){
        p.distance+=spacing;this.deposit(p.x+dx*d/length,p.y+dy*d/length,angle,1);
      }
      p.carry=(p.carry+length)%spacing;p.x=x;p.y=y;p.angle=angle;
    }
    move(x,y){
      const p=this.stroke;if(!p)return;
      // Quadratic midpoint interpolation rounds turns without accumulating input events.
      const ax=p.x,ay=p.y,bx=p.rawX,by=p.rawY,cx=(bx+x)/2,cy=(by+y)/2;
      const steps=Math.max(1,Math.ceil((Math.hypot(ax-bx,ay-by)+Math.hypot(cx-bx,cy-by))/9));
      for(let i=1;i<=steps;i++){const t=i/steps,k=1-t;this.line(k*k*ax+2*k*t*bx+t*t*cx,k*k*ay+2*k*t*by+t*t*cy);}
      p.rawX=x;p.rawY=y;this.notify();
    }
    end(){
      if(this.hold){const s=this.rose(performance.now());this.applyStamp(s);this.history.push({kind:'cream',items:[s]});this.hold=null;}
      if(this.stroke){
        const p=this.stroke;this.line(p.rawX,p.rawY);
        for(let i=1;i<=6;i++)this.deposit(p.x+i*2*Math.cos(p.angle),p.y+i*2*Math.sin(p.angle)-i*.55,p.angle,1-i*.135);
        this.history.push({kind:'cream',items:p.items});this.stroke=null;
      }
      if(this.scatter){if(this.scatter.items.length)this.history.push(this.scatter);this.scatter=null;}
      if(this.drag){const d=this.drag,p=this.piece();if(p&&(p.x!==d.x||p.y!==d.y))this.history.push({kind:'edit',key:p.key,patch:{x:p.x,y:p.y}});this.drag=null;}
      this.notify();
    }
    piece(){return this.charms.find(p=>p.key===this.selected);}
    place(x,y,id){
      if(!allowed(x,y)||!images[id])return false;
      const hit=this.charms.slice().reverse().find(p=>Math.hypot(p.x-x,p.y-y)<40*p.scale);
      if(hit){this.selected=hit.key;this.drag={x:hit.x,y:hit.y,dx:hit.x-x,dy:hit.y-y};}
      else{
        const p={key:++this.serial,id,x,y,angle:0,scale:1};this.history.push({kind:'resin',p});
        this.charms.push(Object.assign({born:performance.now()},p));this.selected=p.key;
      }
      this.notify();return true;
    }
    dragTo(x,y){if(!this.drag)return;const p=this.piece();x+=this.drag.dx;y+=this.drag.dy;if(p&&allowed(x,y)){p.x=x;p.y=y;this.request();}}
    edit(action){
      const p=this.piece();if(!p)return;
      if(action==='remove'){this.history.push({kind:'remove',key:p.key});this.charms=this.charms.filter(c=>c!==p);this.selected=null;}
      else{
        const patch=action==='rotate'?{angle:p.angle+Math.PI/9}:{scale:Math.max(.55,Math.min(1.65,p.scale+(action==='grow'?.15:-.15)))};
        this.history.push({kind:'edit',key:p.key,patch});Object.assign(p,patch);
      }this.notify();
    }
    startDust(x,y,id){if(!allowed(x,y))return false;this.selected=null;this.scatter={kind:'dust',items:[],id};this.spritz(x,y);return true;}
    spritz(x,y){
      const s=this.scatter;if(!s||Math.hypot(x-s.x,y-s.y)<18)return;
      s.x=x;s.y=y;
      for(let i=0;i<7;i++){
        const a=Math.random()*TAU,r=i?Math.sqrt(Math.random())*24:0,px=x+Math.cos(a)*r,py=y+Math.sin(a)*r;
        if(!allowed(px,py))continue;
        const p={id:s.id,x:px,y:py,a:Math.random()*TAU,s:.64+Math.random()*.64,t:Math.floor(Math.random()*5)};
        s.items.push(p);this.addDust(p);
      }this.notify();
    }
    addDust(p){sprinkle(this.layers.dust.getContext('2d'),p);this.mix[p.id]=(this.mix[p.id]||0)+1;}
    rebuild(){
      this.resetLayers();this.selected=null;
      this.history.forEach(op=>{
        if(op.kind==='cream')op.items.forEach(s=>this.applyStamp(s));
        if(op.kind==='dust')op.items.forEach(p=>this.addDust(p));
        if(op.kind==='resin')this.charms.push(Object.assign({born:-1000},op.p));
        if(op.kind==='edit')Object.assign(this.charms.find(p=>p.key===op.key),op.patch);
        if(op.kind==='remove')this.charms=this.charms.filter(p=>p.key!==op.key);
      });this.notify();
    }
    undo(){if(this.history.length){this.history.pop();this.rebuild();}}
    clear(){this.history=[];this.stroke=this.hold=this.drag=this.scatter=null;this.rebuild();}
    stats(){
      const colors={},charms={};C.creams.forEach((c,i)=>{colors[c.id]=this.covered?this.counts[i]/this.covered:0;});
      this.charms.forEach(p=>{charms[p.id]=(charms[p.id]||0)+1;});
      return {coverage:Math.round(100*this.covered/total),colors,charms,dust:Object.assign({},this.mix)};
    }
    materials(){
      const s=this.stats();return [
        ['底壳',[C.get('bases',this.base).name+' ×1']],
        ['奶油胶',C.creams.filter(c=>this.used.has(c.id)).map(c=>c.name+' ×1')],
        ['花嘴',C.tips.filter(c=>this.nozzles.has(c.id)).map(c=>c.name)],
        ['配件',C.charms.filter(c=>s.charms[c.id]).map(c=>c.name+' ×'+s.charms[c.id])],
        ['撒料',C.dust.filter(c=>s.dust[c.id]).map(c=>c.name)]
      ].filter(row=>row[1].length);
    }
    snapshot(){const c=surface(W,H);this.paint(c,false,0);return c;}
  }
  window.CreamArt={Engine,stamp,glass,resin,sprinkle,drawStamp,ready,allowed,surface};
})();

