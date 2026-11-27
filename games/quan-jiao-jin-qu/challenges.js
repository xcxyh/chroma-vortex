(() => {
  "use strict";
  const $ = id => document.getElementById(id);
  const distance = (a,b) => Math.hypot(a.x-b.x,a.y-b.y);
  const names = ["草莓爱心","蜜橘海浪","葡萄螺旋"];
  const designs=[
    ["樱花瓣","M 0 .62 Q -.86 .02 -.32 -.52 Q -.1 -.70 0 -.38 Q .15 -.76 .40 -.50 Q .78 -.05 0 .62"],
    ["双叶","M -.65 .56 Q -.82 -.24 -.08 -.44 Q -.06 .20 -.65 .56 L .05 -.06 Q .12 -.72 .72 -.54 Q .74 .06 .05 -.06"],
    ["蝴蝶结","M 0 0 Q -.76 -.78 -.71 -.12 Q -.65 .41 0 0 Q .71 -.78 .72 -.12 Q .65 .41 0 0 L .36 .61"],
    ["贝壳","M -.7 .40 Q -.94 -.06 -.56 -.25 Q -.52 -.59 -.25 -.49 Q .02 -.77 .26 -.49 Q .55 -.59 .57 -.26 Q .94 -.05 .68 .40 Q 0 .70 -.7 .40"],
    ["鲸尾","M 0 .58 Q -.14 -.03 -.66 -.40 Q -.29 -.53 0 -.15 Q .32 -.56 .67 -.41 Q .20 -.05 0 .58"],
    ["海星","M 0 -.75 L .18 -.22 .71 -.24 .33 .10 .45 .65 0 .34 -.45 .65 -.33 .10 -.71 -.24 -.18 -.22 Z"],
    ["弯月","M .40 -.59 A .64 .64 0 1 0 .55 .46 Q -.48 .41 .40 -.59"],
    ["流星","M -.78 .47 Q -.12 .46 .30 -.24 L .31 -.57 .48 -.35 .73 -.41 .60 -.18 .71 .02 .45 -.03 .28 .18 .30 -.11 Q -.11 .21 -.52 .18"],
    ["四叶星","M 0 -.78 Q .06 -.12 .72 0 Q .14 .09 0 .76 Q -.09 .12 -.72 0 Q -.12 -.09 0 -.78"],
    ["蜜桃叶","M 0 .70 Q -.72 .37 -.59 -.16 Q -.50 -.56 0 -.38 Q .63 -.61 .64 -.08 Q .64 .38 0 .70 L .04 -.35 Q .12 -.76 .53 -.63 Q .39 -.34 .04 -.35"],
    ["小雨伞","M -.75 .04 Q -.53 -.63 0 -.63 Q .56 -.64 .75 .04 Q .53 -.14 .36 .06 Q .15 -.13 0 .07 L 0 .54 Q -.03 .79 -.28 .54"],
    ["小帆船","M -.74 .23 L .64 .23 .42 .52 -.43 .52 Z M -.74 .23 L -.08 .22 -.08 -.72 .58 .12 -.08 .12"],
    ["橡树叶","M -.64 .58 Q -.8 .17 -.42 .19 Q -.72 -.2 -.27 -.16 Q -.39 -.58 -.05 -.39 Q .10 -.83 .45 -.66 Q .74 -.37 .39 -.14 Q .75 -.04 .40 .17 Q .65 .43 .2 .40 Q -.14 .68 -.64 .58 L .36 -.51"],
    ["山谷","M -.78 .40 L -.38 -.30 -.19 .03 .11 -.63 .76 .40 Z"],
    ["松树","M 0 -.81 L .36 -.24 .19 -.24 .50 .13 .29 .13 .66 .48 .11 .48 .11 .72 -.10 .72 -.10 .48 -.66 .48 -.29 .13 -.50 .13 -.19 -.24 -.36 -.24 Z"],
    ["雪钻","M -.72 -.15 L -.39 -.47 .39 -.47 .72 -.15 0 .65 Z M -.72 -.15 L .72 -.15"],
    ["鱼尾浪","M -.71 .04 Q -.38 -.52 .15 -.19 L .63 -.50 .55 -.02 .65 .39 .13 .14 Q -.34 .51 -.71 .04"],
    ["北极光","M -.80 .38 C -.50 .50 -.68 -.62 -.27 -.51 S -.24 .60 .02 .33 S .34 -.65 .46 -.43 S .44 .24 .79 -.02"],
    ["小皇冠","M -.60 .40 L -.70 -.37 -.25 -.07 0 -.61 .26 -.07 .69 -.37 .57 .40 Z"],
    ["八字结","M 0 0 C -.86 -.78 -.86 .77 0 0 S .87 -.75 .68 .03 S .25 .32 0 0"],
    ["庆典烟花","M 0 .70 Q .08 .24 0 -.06 L -.53 .25 0 -.06 -.66 -.22 0 -.06 -.32 -.58 0 -.06 .10 -.77 0 -.06 .53 -.53 0 -.06 .72 -.11 0 -.06 .50 .26"]
  ];
  function pattern(index,tier) {
    if(tier){
      const path=document.createElementNS("http://www.w3.org/2000/svg","path");
      path.setAttribute("d",designs[(tier-1)*3+index][1]);
      const len=path.getTotalLength();
      return Array.from({length:73},(_,n)=>{const p=path.getPointAtLength(n*len/72);return {x:p.x,y:p.y};});
    }
    const points = [];
    for (let n=0; n<=48; n++) {
      const t=n/48, angle=t*Math.PI*2;
      if (index===0) points.push({x:.66*Math.pow(Math.sin(angle),3),y:-(13*Math.cos(angle)-5*Math.cos(2*angle)-2*Math.cos(3*angle)-Math.cos(4*angle))*.037});
      if (index===1) points.push({x:-.78+1.56*t,y:.35*Math.sin(angle*1.5)});
      if (index===2) points.push({x:(.12+.58*t)*Math.cos(angle*1.28),y:(.12+.58*t)*Math.sin(angle*1.28)});
    }
    return points;
  }
  // All geometry is relative to the paint surface, including the exported icing strokes.
  function line(ctx,points,width,color,dashed) {
    if (!points.length) return;
    ctx.beginPath();
    ctx.lineWidth=width; ctx.strokeStyle=color; ctx.lineCap=ctx.lineJoin="round";
    ctx.setLineDash(dashed ? [.04,.045] : []);
    ctx.moveTo(points[0].x,points[0].y);
    for (let i=1;i<points.length;i++) ctx.lineTo(points[i].x,points[i].y);
    ctx.stroke(); ctx.setLineDash([]);
  }
  function normalized(canvas) {
    const ctx=canvas.getContext("2d");
    ctx.setTransform(canvas.width/2,0,0,canvas.height/2,canvas.width/2,canvas.height/2);
    return ctx;
  }
  function icing(ctx,stroke) {
    line(ctx,stroke,.051,"rgba(89,45,47,.7)");
    line(ctx,stroke,.038,"#fff0c7");
    line(ctx,stroke,.013,"#fffdf3");
  }
  function trace(index,paint,tier=0,order) {
    const name=tier?designs[(tier-1)*3+index][0]:names[index];
    const width=Math.max(.068,.105-.006*tier);
    const points=pattern(index,tier), stroke=[];
    let cursor=0, outside=0, length=0;
    const layer=$("guide");
    const ctx=normalized(layer), sample=$("goal"), mini=normalized(sample);
    mini.fillStyle=order?order.color.first:["#b84965","#d67936","#786098"][index];mini.fillRect(-1,-1,2,2);icing(mini,points);
    function draw() {
      ctx.clearRect(-1,-1,2,2);
      line(ctx,points,.035,"rgba(50,38,32,.66)",true);
      line(ctx,points,.016,"#fffae7",true);
      icing(ctx,stroke);
      if (cursor<points.length) {
        const at=points[cursor];
        ctx.beginPath();ctx.arc(at.x,at.y,.065,0,2*Math.PI);
        ctx.fillStyle="#225346";ctx.fill();ctx.lineWidth=.016;ctx.strokeStyle="#fff9dc";ctx.stroke();
      }
    }
    function feed(point) {
      if (cursor === points.length) return;
      const last=stroke[stroke.length-1];
      if (last) {
        const d=distance(last,point);
        if(d<.006)return;
        const steps=Math.ceil(d/.025);
        for(let i=1;i<=steps;i++){
          const p={x:last.x+(point.x-last.x)*i/steps,y:last.y+(point.y-last.y)*i/steps};
          if(cursor<points.length && distance(p,points[cursor])<=width) {
            while(cursor<points.length && distance(p,points[cursor])<=width) cursor++;
          } else if(cursor<points.length && distance(p,points[Math.max(0,cursor-1)])>.16) outside+=d/steps;
        }
        length+=d;
      } else if(distance(point,points[0])<=.14) cursor=1;
      stroke.push(point);draw();
      const percent=Math.round(100*cursor/points.length);
      $("texture").textContent="拉花完成 "+percent+"%";
      $("cue").textContent=percent===100?"松手收杯":"";
    }
    draw();
    return {
      name,request:"让奶油线跟着绿点走，一笔画到底。",gesture:"从绿点起笔，一笔拉花",note:"越贴近虚线，拉花得分越高。",initial:"等待起笔",keyStart:points[0],
      begin(point){if(distance(point,points[0])>.16){$("cue").textContent="从绿点开始";return false;}feed(point);return true;},
      move:feed,
      result(){const passed=cursor===points.length && outside/Math.max(length,.01)<.32;
        return {passed,accuracy:Math.max(0,1-3*outside/Math.max(length,.01)),title:passed?name:"奶油线断啦",message:passed?"这朵拉花是你亲手画的。":cursor<points.length?"沿着移动的绿点画完整条线，再松手。":"线条绕远了，再贴近虚线一点。"};},
      stamp(canvas){const c=normalized(canvas);icing(c,stroke);c.setTransform(1,0,0,1,0,0);}
    };
  }
  function hunt(index,paint,tier=0,order) {
    // Use an attainable patch from the actual mixed batch, sampled away from the rim.
    paint.preview([.18,.27,.37][index]+tier*.033);
    const wanted=tier?[[.28,.61,.75],[.67,.34,.52],[.39,.56,.72],[.24,.63,.38],[.56,.35,.71],[.31,.66,.42],[.68,.34,.55]][tier-1][index]:[.20,.70,.48][index];
    const tolerance=tier?Math.max(.065,.14-Math.min(tier,4)*.018):[.19,.15,.12][index];
    const targets=tier>=6?[wanted,1-wanted,.45]:tier>=4?[wanted,1-wanted]:[wanted];
    let step=0,accuracySum=0;
    let goal=null, gap=Infinity, found=null;
    function selectGoal(){
    gap=Infinity;found=null;
    for(let y=-.72;y<=.72;y+=.08) for(let x=-.72;x<=.72;x+=.08) {
      if(Math.hypot(x,y)>.75)continue;
      const r=paint.ratioAt({x,y});
      if(r!==null && Math.abs(r-targets[step])<gap){goal=r;gap=Math.abs(r-targets[step]);}
    }
    }
    selectGoal();
    function swatch(r){const k=Math.round(r*1023)*3;return "rgb("+Array.from(paint.rgb.subarray(k,k+3),Math.round).join(",")+")";}
    const mini=normalized($("goal"));
    mini.fillStyle=swatch(goal);mini.fillRect(-1,-1,2,2);
    function sample(point) {
      found=paint.ratioAt(point);
      const contact=$("contact");
      contact.style.backgroundColor=found===null?"transparent":swatch(found);
      $("texture").textContent=found===null?"这里是杯沿":"正在取色";
      $("cue").textContent=found===null?"往碗里移":Math.abs(found-goal)<=tolerance?"颜色接近！":tier>=2?"对照右上色样":found>goal?"找浓一点的颜色":"找淡一点的颜色";
    }
    return {name:tier?order.name+"寻色":["草莓寻色","蜜橘寻色","葡萄寻色"][index],request:targets.length>1?"依次取齐 "+targets.length+" 种色样，才能收杯。":"从这碗旋纹里，找出右侧色样。",gesture:"按住找色，松手取样",note:"指尖圆点显示取到的颜色，对准色样再松手。",initial:"等待取样",keyStart:{x:0,y:0},
      begin(point){sample(point);return true;},move:sample,
      result(){const diff=found===null?1:Math.abs(found-goal),passed=diff<=tolerance;
        const quality=Math.max(0,1-diff/tolerance);
        if(passed && step+1<targets.length){
          accuracySum+=quality;step++;selectGoal();mini.fillStyle=swatch(goal);mini.fillRect(-1,-1,2,2);
          return {more:true,message:"已取 "+step+" / "+targets.length+" 色，找下一抹"};
        }
        return {passed,accuracy:(accuracySum+quality)/targets.length,title:passed?"这抹颜色找到了":"差一点颜色",message:passed?"这一勺就是客人要的颜色。":found===null?"杯沿没有奶油，往里找。":found>goal?"这勺太淡，再找浓一点的地方。":"这勺偏浓，下次往奶油色靠一点。"};},
      stamp(canvas){if(found===null)return;const c=canvas.getContext("2d");c.save();c.beginPath();c.arc(canvas.width*.72,canvas.height*.73,canvas.width*.13,0,Math.PI*2);c.fillStyle=swatch(found);c.fill();c.lineWidth=3;c.strokeStyle="#fff5de";c.stroke();c.restore();}
    };
  }
  window.CupChallenges={trace,hunt,traceName:(tier,i)=>tier?designs[(tier-1)*3+i][0]:names[i]};
})();
