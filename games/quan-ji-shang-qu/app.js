(() => {
  'use strict';
  const $=id=>document.getElementById(id), C=Catalog, A=CreamArt, store=ShopStore;
  const groups=['creams','charms','dust'], groupNames=['奶油胶','树脂配件','点缀撒料'];
  const initial=()=>({base:'clear',history:[],serial:0,step:0,tools:['pink','bear','pearl'],tip:'shell'});
  let mode='order',level=1,step=0,toolsSelected=['pink','bear','pearl'],tip='shell',engine,activePointer=null,uiFrame=0;
  let drafts={order:initial(),free:initial()},displayed=null,product=null,dialogKind='',toastTimer,opener,receiptId=0,layoutKey='';
  const order=()=>Orders.all[level-1];
  function make(tag,txt,cls){const el=document.createElement(tag);if(txt!=null)el.textContent=txt;if(cls)el.className=cls;return el;}
  function notice(s){$('toast').textContent=s;$('toast').hidden=false;clearTimeout(toastTimer);toastTimer=setTimeout(()=>{$('toast').hidden=true;},2900);}
  function queueUI(){if(!uiFrame)uiFrame=requestAnimationFrame(()=>{uiFrame=0;updateStats();});}
  function marginProps(){
    const mat=$('props'),w=mat.clientWidth,h=mat.clientHeight,k=w+'x'+h;
    if(w<1||h<1||layoutKey===k)return;layoutKey=k;
    const d=Math.min(2,window.devicePixelRatio||1);mat.width=Math.round(w*d);mat.height=Math.round(h*d);
    const g=mat.getContext('2d');g.scale(d,d);
    const scale=Math.max(.49,Math.min(.95,w/505,h/510));
    const phoneWidth=$('case').getBoundingClientRect().width*322/420;
    const side=Math.max(8,(w-phoneWidth)/2);
    // A filled piping bag rests diagonally on the edge of the silicone mat.
    g.save();g.translate(w-side*.36,h*.73);g.scale(scale,scale);g.rotate(.42);
    function shape(path,fill,line){
      g.beginPath();path(g);g.closePath();g.fillStyle=fill;g.fill();if(line){g.strokeStyle=line;g.lineWidth=1;g.stroke();}
    }
    const body=g.createLinearGradient(-32,0,34,0);[[0,'#bc7584'],[.15,'#f7b6c1'],[.3,'#ffdad4'],[.46,'#e9a5b3'],[.68,'#f4c4c8'],[.88,'#d08b9d'],[1,'#ad7384']].forEach(s=>body.addColorStop(s[0],s[1]));
    g.shadowColor='rgba(116,70,79,.27)';g.shadowBlur=9;g.shadowOffsetX=4;g.shadowOffsetY=6;
    shape(p=>{p.moveTo(-10,-62);p.quadraticCurveTo(-48,-43,-31,-6);p.lineTo(-5,66);p.lineTo(7,66);p.lineTo(36,-17);p.quadraticCurveTo(47,-46,10,-62);},body,'#c7969d');
    g.shadowColor='transparent';
    shape(p=>{p.moveTo(-6,-60);p.lineTo(-20,-89);p.lineTo(-9,-84);p.lineTo(0,-93);p.lineTo(8,-83);p.lineTo(19,-89);p.lineTo(8,-60);},'#f2d9d3','#caa9ab');
    g.fillStyle='#91616b';g.fillRect(-10,-63,20,4);g.fillStyle='#f9e5bc';g.fillRect(-10,-61,20,2);
    const steel=g.createLinearGradient(-7,0,8,0);[[0,'#918c88'],[.28,'#fcf5e9'],[.48,'#acaaa8'],[.65,'#e4e1d7'],[1,'#94918e']].forEach(s=>steel.addColorStop(s[0],s[1]));
    shape(p=>{p.moveTo(-9,58);p.lineTo(9,58);p.lineTo(3,84);p.lineTo(0,81);p.lineTo(-3,84);},steel,'#a69b91');
    g.strokeStyle='rgba(255,251,238,.75)';g.lineWidth=2.5;g.beginPath();g.moveTo(-9,-57);g.quadraticCurveTo(-41,-40,-25,-2);g.lineTo(-9,37);g.stroke();
    g.fillStyle='#924d60';g.font='italic 12px Georgia';g.textAlign='center';g.fillText('Crème',1,-9);g.font='6px monospace';g.fillText('ATELIER',1,1);g.restore();
    // Off-case loose pieces belong to the work mat only and never enter the material list.
    const loose=(id,x,y,s,angle)=>A.resin(g,{x,y,id,angle,scale:s},1,false);
    loose('strawberry',side*.40,h*.20,scale*.72,-.40);
    loose('bow',side*.40,h*.83,scale*.78,-.23);
    A.sprinkle(g,{x:side*.52,y:h*.76,id:'pearl',s:scale*1.3,a:.4});A.sprinkle(g,{x:side*.27,y:h*.73,id:'pearl',s:scale*.88,a:0});
    A.sprinkle(g,{x:w-side*.38,y:h*.27,id:'flower',s:scale*1.55,a:.4});
  }
  function sample(){
    const orderData=order(), free=mode==='free';
    const cv=$('sample'),g=cv.getContext('2d'),w=cv.width,h=cv.height;
    g.clearRect(0,0,w,h);g.fillStyle='#eee4cb';g.fillRect(0,0,w,h);
    for(let i=0;i<w;i+=14){g.fillStyle='#b6ba9466';g.fillRect(i,0,6,h);}
    for(let i=0;i<h;i+=14){g.fillStyle='#f6f0d688';g.fillRect(0,i,w,6);}
    const c=free?'shake':orderData.colors[0],second=free?'milk':(orderData.colors[1]||'milk');
    g.save();g.translate(122,98);g.rotate(.20);g.scale(.27,.27);g.translate(-210,-355);A.glass(g,'peach');
    function doll(x,y,index,r){A.drawStamp(g,{x,y,angle:index*.42,phase:index%3,rx:r,ry:r,tip:index%4===0?'rosette':'shell',color:index%5===0?second:c});}
    let n=0;for(let y=71;y<656;y+=29){doll(334,y,n++,22);if(y>182)doll(87,y,n++,22);}
    for(let x=107;x<335;x+=28){doll(x,651,n++,22);if(x>196)doll(x,68,n++,21);}
    for(const [x,y,r] of [[245,165,42],[294,312,46],[154,352,40],[190,544,47],[267,583,40],[127,246,33]])doll(x,y,4,r);
    const pieces=free?['bear','strawberry','bow']:orderData.charms;
    [[208,273,1.75,-.12],[266,459,1.52,.17],[160,486,1.15,-.19]].forEach(([x,y,scale,angle],i)=>{
      A.resin(g,{id:pieces[i%pieces.length],x,y,scale,angle},1,false);
    });
    for(let i=0;i<17;i++)A.sprinkle(g,{x:110+(i*71)%197,y:202+(i*47)%416,id:'pearl',a:.2,s:1.1});g.restore();
    A.resin(g,{id:free?'bow':pieces[0],x:201,y:147,angle:-.18,scale:.72},1,false);
  }
  function canvasIcon(w,h){return A.surface(w,h);}
  function itemIcon(group,id){
    if(group==='charms'){const im=new Image();im.src=C.get(group,id).src;im.alt='';return im;}
    const cv=canvasIcon(74,70),g=cv.getContext('2d');
    if(group==='creams')g.drawImage(A.stamp('rosette',id,1),4,1,66,66);
    else for(let i=0;i<5;i++)A.sprinkle(g,{id,x:[27,42,22,49,33][i],y:[25,20,43,37,49][i],s:id==='flower'?.97:1.25,a:i*.76,t:i});
    return cv;
  }
  function nozzleIcon(id){
    const cv=canvasIcon(90,48),g=cv.getContext('2d');
    if(id==='rosette')g.drawImage(A.stamp(id,toolsSelected[0],1),21,0,48,48);
    else for(let i=0;i<10;i++)A.drawStamp(g,{tip:id,color:toolsSelected[0],phase:Math.floor(i/3)%3,x:15+i*6,y:24+Math.sin(i*.6)*3,rx:10+(i%4),ry:id==='ribbon'?18:12,angle:.1});
    return cv;
  }
  function toolsUI(){
    const group=groups[step],id=toolsSelected[step];
    document.querySelectorAll('[data-step]').forEach((b,i)=>b.setAttribute('aria-pressed',String(step===i)));
    $('material-label').textContent=groupNames[step];$('choice').textContent=C.get(group,id).name;$('palette').textContent='';
    C[group].forEach(item=>{
      const b=make('button',null,'item');b.dataset.item=item.id;b.setAttribute('aria-pressed',String(item.id===id));b.setAttribute('aria-label',item.name);
      b.append(itemIcon(group,item.id),make('span',item.name));$('palette').appendChild(b);
    });
    $('tips').textContent='';
    if(step===0)C.tips.forEach(item=>{
      const b=make('button');b.dataset.tip=item.id;b.setAttribute('aria-pressed',String(item.id===tip));b.append(nozzleIcon(item.id),document.createTextNode(item.name));$('tips').appendChild(b);
    });
    $('nozzle-section').hidden=step!==0;$('edit-section').hidden=step!==1;
    queueUI();refreshAtelier();
  }
  function ticket(){
    const o=order(),free=mode==='free';
    $('ticket-kicker').textContent=free?'自由创作':'今日委托';$('ticket-num').textContent=free?'FREE DIY':'ORDER Nº '+String(level).padStart(2,'0');
    $('chapter').textContent=free?'材料架全部开放':['第一章','第二章','第三章'][Math.floor((level-1)/6)]+' · '+o.chapter;
    $('order-title').textContent=free?'我的定制款':o.name;
    $('request').textContent=free?'选喜欢的底壳和材料，做一款自己的手机壳。':o.guest+'：'+o.message+(o.colors.length>1?' 各色至少占 '+Math.ceil(70/o.colors.length)+'%。':'');
    $('orders-open').hidden=free;$('base-open').textContent='底壳 · '+C.get('bases',engine.base).name+' ▾';sample();
  }
  let lastChecks='';
  function updateStats(){
    if(!engine)return;const s=engine.stats(),o=order(),isOrder=mode==='order';
    const checks=isOrder?[...o.colors.map(id=>[C.get('creams',id).name+(o.colors.length>1?' '+Math.round(100*(s.colors[id]||0))+'%':''),(s.colors[id]||0)>=.7/o.colors.length]),...o.charms.map(id=>[C.get('charms',id).name,s.charms[id]>0]),...o.dust.map(id=>[C.get('dust',id).name,s.dust[id]>0])]:[['自由用料',true]];
    const key=JSON.stringify(checks);if(key!==lastChecks){$('checks').textContent='';checks.forEach(([name,met])=>$('checks').appendChild(make('span',(met?'✓ ':'○ ')+name,met?'met':'')));lastChecks=key;}
    $('coverage').textContent=s.coverage+'%'+(isOrder?' / '+o.target+'%':'');$('fill').style.width=Math.min(100,isOrder?s.coverage/o.target*100:s.coverage)+'%';
    const empty=engine.history.length===0;$('undo').disabled=$('clear').disabled=$('finish').disabled=empty;
    document.querySelectorAll('[data-edit]').forEach(b=>{b.disabled=!engine.piece();});
    let hint=step===0?(tip==='rosette'?'轻点挤玫瑰，长按让花朵长大':'按住壳面，慢慢拖动挤出奶油'):step===1?'轻点放配件，按住已有配件拖动':'轻点或滑动，把点缀撒在壳面上';
    if(isOrder&&level<=2){
      if(s.coverage<o.target&&step===0)hint=level===1?'① 选草莓粉，拖动挤满 12% 壳面':'① 选香草白，沿壳边挤满 16%';
      else if(!s.charms[o.charms[0]]&&step!==2)hint='② 点「按配件」，选'+C.get('charms',o.charms[0]).name+'后点壳面';
      else if(level===2&&!s.dust.pearl)hint='③ 点「撒点缀」，选白珍珠后点壳面';
      else if(Orders.evaluate(o,s).pass)hint='✓ 委托已完成，可以晾干出单了';
    }
    if($('gesture').textContent!==hint)$('gesture').textContent=hint;
  }
  function finishPointer(){if(activePointer!==null){engine.end();activePointer=null;}}
  function saveDraft(){if(mode==='gallery')return;finishPointer();
    drafts[mode]={workId:drafts[mode].workId,base:engine.base,history:engine.history,serial:engine.serial,step,tools:toolsSelected.slice(),tip};
  }
  function restore(){
    const d=drafts[mode];engine.history=d.history;engine.base=d.base;engine.serial=d.serial;step=d.step;toolsSelected=d.tools.slice();tip=d.tip;
    engine.updateBase();engine.rebuild();ticket();toolsUI();updateStats();
  }
  function switchMode(next){
    saveDraft();mode=next;document.querySelectorAll('[data-mode]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.mode===mode)));
    $('studio').hidden=next==='gallery';$('gallery').hidden=next!=='gallery';
    if(next==='gallery')gallery();else restore();refreshAtelier();
  }
  function showDialog(kind,title){
    finishPointer();if($('modal').hidden)opener=document.activeElement;
    dialogKind=kind;$('dialog-title').textContent=title;$('receipt').hidden=kind!=='receipt';$('options').hidden=kind==='receipt';
    $('options').textContent='';$('modal').hidden=false;document.querySelector('.dialog').scrollTop=0;$('close').focus();
  }
  function closeDialog(){
    receiptId++;ShopRanks.reset();$('modal').hidden=true;dialogKind='';displayed=null;product=null;if(opener&&opener.focus)opener.focus();
  }
  function chooseBase(){showDialog('base','挑一款底壳');C.bases.forEach(c=>{
    const b=make('button',null,'base-choice'),sw=make('i');sw.style.background=c.color;b.append(sw,document.createTextNode(c.name));b.setAttribute('aria-pressed',String(engine.base===c.id));
    b.onclick=()=>{engine.base=c.id;engine.updateBase();ticket();closeDialog();};$('options').appendChild(b);
  });}
  function startLevel(id){
    if(mode!=='order')switchMode('order');level=id;drafts.order=initial();restore();closeDialog();
  }
  function levels(){
    showDialog('levels','接单册 · 18 款委托');
    Orders.all.forEach(o=>{
      if((o.id-1)%6===0)$('options').appendChild(make('h3',o.chapter));
      const b=make('button',null,'level-choice'+(level===o.id?' current':''));b.disabled=o.id>store.data.level;
      b.append(make('b',String(o.id).padStart(2,'0')+'　'+o.name),make('span',b.disabled?'未解锁':store.data.best[o.id]!=null?'最佳 '+store.data.best[o.id]+' 分':'可接单'));
      b.onclick=()=>{if(o.id===level)closeDialog();else if(engine.history.length)confirmAction('更换订单','当前这单的草稿会清空。','接新单',()=>startLevel(o.id));else startLevel(o.id);};$('options').appendChild(b);
    });
  }
  function confirmAction(kind,text,label,action){
    showDialog('confirm',kind);$('options').appendChild(make('p',text));
    const yes=make('button',label,'option-button'),no=make('button','继续制作','option-button');yes.onclick=action;no.onclick=closeDialog;$('options').append(yes,no);
  }
  function gallery(){
    const d=store.data;$('work-count').textContent=d.works.length+' / 12 件';$('works').textContent='';$('badges').textContent='';
    store.badges.forEach((b,i)=>$('badges').appendChild(make('span',(['✿','❀','✧','✣','★','♛'][i])+' '+b,d.badges.includes(b)?'earned':'')));
    if(!d.works.length){const el=make('div',null,'empty');el.append(make('h2','第一张小票，等你来做'),make('p','晾干出单后，作品和用料会一起收进这里。'));
      const b=make('button','去自由挤壳 →','plain');b.onclick=()=>switchMode('free');el.appendChild(b);$('works').appendChild(el);}
    d.works.forEach(w=>{const b=make('button',null,'work'),im=new Image();im.src=w.thumb;im.alt=w.name;b.append(im,make('b',w.name),make('small',w.date+' · '+(w.grade?w.grade+' 级':'自由创作')));
      b.onclick=()=>{if(im.naturalWidth)openReceipt(w,im,false);};$('works').appendChild(b);});
  }
  function socialUI(){for(const key of ['comment','share','note']){
    $(key).hidden=!ShopSocial.can(key);$(key).disabled=ShopSocial.locked(key);
  }}
  function drawPoster(){
    const p=ShopSocial.render(displayed,product);$('poster').textContent='';$('poster').appendChild(p);ShopSocial.prepare(p,socialUI);
  }
  function rename(){
    if(!displayed)return;const name=$('work-name').value.trim();if(!name){$('work-name').value=displayed.name;return;}
    if(name===displayed.name)return;displayed.name=name;store.save().then(ok=>{if(!ok)notice('存储不可用，名称仅在本次打开时保留。');});
    drawPoster();if(mode==='gallery')gallery();
  }
  function openReceipt(w,img,fresh){
    showDialog('receipt','出单小票');displayed=w;product=img;$('work-name').value=w.name;$('social-status').textContent='';ShopRanks.reset();
    $('result-line').textContent=w.grade?w.grade+' 级 · '+w.score+' 分　'+(w.pass?'已完成客人委托':'可以继续制作，补齐订单要求。'):'自由创作 · 材料清单已随小票收好';
    $('storage-note').textContent=store.available()?'已收进我的作品集':'当前仅保存在本次会话';
    $('next').textContent=!fresh?'返回作品集':mode==='free'?'再做一款 →':!w.pass?'继续制作 →':level===18?'查看作品集 →':'接下一单 →';
    $('next').onclick=()=>{if(!fresh){closeDialog();return;}if(mode==='free'){drafts.free=initial();restore();closeDialog();}
      else if(w.pass&&level<18)startLevel(level+1);else if(w.pass){closeDialog();switchMode('gallery');}else closeDialog();};
    if(fresh&&mode==='order')ShopRanks.finish(w.score,1,ShopRanks.day());drawPoster();
  }
  function finish(){
    finishPointer();if(!engine.history.length)return;
    const o=mode==='order'?order():null,judgement=o?Orders.evaluate(o,engine.stats()):null;
    const img=engine.snapshot(),thumb=A.surface(230,394),g=thumb.getContext('2d');g.drawImage(img,0,0,230,394);
    let thumbUrl=thumb.toDataURL('image/webp',.86);
    if(!thumbUrl.startsWith('data:image/webp;')||thumbUrl.length>66000){
      g.globalCompositeOperation='destination-over';g.fillStyle='#f4e4d9';g.fillRect(0,0,230,394);
      thumbUrl=thumb.toDataURL('image/jpeg',.78);
    }
    const stamp=Date.now(),d=drafts[mode];
    const w={id:d.workId||('case-'+stamp.toString(36)+'-'+Math.random().toString(36).slice(2,7)),date:ShopRanks.day(),name:o?o.name:'我的奶油壳',
      thumb:thumbUrl,materials:engine.materials(),score:judgement?judgement.score:null,grade:judgement?judgement.grade:'',pass:!!(judgement&&judgement.pass)};
    const old=store.data.works.find(item=>item.id===w.id);if(old)w.name=old.name;d.workId=w.id;
    Foley.play('shutter');const token=++receiptId;const saving=store.record(w,o,judgement,engine);
    openReceipt(w,img,true);saving.then(ok=>{if(token===receiptId)$('storage-note').textContent=ok?'已收进我的作品集':'存储不可用，小票暂存于本次会话。';});
  }
  function bindCanvas(){
    const cv=$('case');
    function point(e){const b=cv.getBoundingClientRect();return [(e.clientX-b.left)*420/b.width,(e.clientY-b.top)*720/b.height];}
    cv.addEventListener('pointerdown',e=>{
      if(activePointer!==null||e.button!==0)return;const [x,y]=point(e);let ok=false;
      if(step===0)ok=engine.begin(x,y,{tip,color:toolsSelected[0]});
      if(step===1)ok=engine.place(x,y,toolsSelected[1]);
      if(step===2)ok=engine.startDust(x,y,toolsSelected[2]);
      if(!ok)return;e.preventDefault();activePointer=e.pointerId;cv.setPointerCapture(e.pointerId);Foley.play(step===0?(tip==='rosette'?'rose':'cream'):step===1?'press':'dust');
    });
    cv.addEventListener('pointermove',e=>{
      if(activePointer!==e.pointerId)return;const [x,y]=point(e);
      if(step===0&&tip!=='rosette'){engine.move(x,y);Foley.play('cream');}
      if(step===1)engine.dragTo(x,y);if(step===2){engine.spritz(x,y);Foley.play('dust');}
    });
    for(const name of ['pointercancel','lostpointercapture','pointerup'])cv.addEventListener(name,e=>{if(activePointer===e.pointerId)finishPointer();});
    document.addEventListener('visibilitychange',()=>{if(document.hidden)finishPointer();});
  }
  function soundUI(){for(const key of ['music','sound'])$(key).setAttribute('aria-pressed',String(store.data[key]));
    Foley.set(store.data.sound);ShopMusic.set(store.data.music);}
  async function start(){
    engine=new A.Engine($('case'),queueUI);const loaded=store.load();
    $('logo').getContext('2d').drawImage(A.stamp('rosette','shake',1),0,0,56,56);
    await Promise.all([loaded,A.ready]);level=store.data.level;restore();soundUI();layoutKey='';marginProps();bindCanvas();
    window.addEventListener('atelier-layout',marginProps);
    document.querySelectorAll('[data-mode]').forEach(b=>b.onclick=()=>{if(mode!==b.dataset.mode)switchMode(b.dataset.mode);});
    document.querySelectorAll('[data-step]').forEach(b=>b.onclick=()=>{finishPointer();step=Number(b.dataset.step);engine.selected=null;engine.request();toolsUI();});
    $('palette').onclick=e=>{const b=e.target.closest('[data-item]');if(!b)return;toolsSelected[step]=b.dataset.item;
      $('choice').textContent=C.get(groups[step],b.dataset.item).name;for(const el of $('palette').children)el.setAttribute('aria-pressed',String(el===b));
      if(step===0){const scroll=$('palette').scrollLeft;toolsUI();$('palette').scrollLeft=scroll;}
    };
    $('tips').onclick=e=>{const b=e.target.closest('[data-tip]');if(b){tip=b.dataset.tip;toolsUI();}};
    $('edits').onclick=e=>{const b=e.target.closest('[data-edit]');if(b)engine.edit(b.dataset.edit);};
    $('undo').onclick=()=>{finishPointer();engine.undo();};$('clear').onclick=()=>confirmAction('清空重挤','清除壳面上的奶油、配件和撒料？','清空壳面',()=>{engine.clear();delete drafts[mode].workId;closeDialog();});
    $('base-open').onclick=chooseBase;$('orders-open').onclick=levels;$('finish').onclick=finish;
    $('close').onclick=closeDialog;$('modal').onclick=e=>{if(e.target===$('modal'))closeDialog();};
    document.addEventListener('keydown',e=>{if(e.key==='Escape'&&dialogKind)closeDialog();});
    $('rename').onclick=()=>{rename();notice('作品名已更新');};$('work-name').onchange=rename;
    for(const key of ['comment','share','note'])$(key).onclick=()=>{if(displayed)ShopSocial.send(key,displayed,msg=>{$('social-status').textContent=msg;},socialUI);};
    for(const key of ['music','sound'])$(key).onclick=()=>{store.data[key]=!store.data[key];soundUI();store.save();notice((key==='music'?'《奶油小铺》':'手作音效')+(store.data[key]?'已开启':'已关闭'));};
  }
  start().catch(()=>notice('工作台加载失败，请重新打开小工具。'));
})();

