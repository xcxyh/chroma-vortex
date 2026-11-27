(() => {
  "use strict";
  const bases={vanilla:["香草鲜奶","#fff1d0"],matcha:["抹茶冰乳","#adc488"],banana:["香蕉牛奶","#f8e08e"],cocoa:["可可慕斯","#ba876d"]};
  const sauces={berry:["草莓酱","#d92752"],choco:["黑巧酱","#4a2519"],mango:["芒果泥","#ffb534"],grape:["蓝莓酱","#69427e"],caramel:["焦糖酱","#b76827"]};
  const garnishes={strawberry:["草莓片",.30],blueberry:["蓝莓",.21],wafer:["威化饼",.34],pearl:["珍珠",.36],cookie:["奥利奥碎",.44],sugar:["彩糖",.50],chocobanana:["巧克香蕉",.31]};
  const scattered=key=>key==="pearl" || key==="cookie" || key==="sugar";
  for(const reward of window.CupBook.rewards){
    (reward.kind==="base"?bases:sauces)[reward.id]=[reward.name,reward.color];
  }
  const own=(map,key)=>Object.prototype.hasOwnProperty.call(map,key);
  const validRecipe=r=>r && typeof r.name==="string" && own(bases,r.base) && Array.isArray(r.sauces) &&
    r.sauces.every(k=>own(sauces,k)) && Array.isArray(r.toppings) && r.toppings.every(p=>p && own(garnishes,p.key) &&
    [p.x,p.y,p.angle].every(Number.isFinite) && p.x>=0 && p.x<=1 && p.y>=0 && p.y<=1);
  window.DessertBar={validRecipe};
  window.createStudio=function(book,sound){
    const $=id=>document.getElementById(id),bowl=$("free-bowl"),space=$("free-space");
    let cream,phase="mix",base="vanilla",syrups=[],toppings=[],selected="strawberry",stroke=null,frame=0,saved=false;
    const ingredientRewards=new Map(book.rewards.map(r=>[r.id,r.at]));
    function name(){return (syrups.length?sauces[syrups[syrups.length-1]][0].replace(/[酱泥]$/,"")+"·":"")+bases[base][0]+"杯";}
    function counted(keys,labels){
      const counts=new Map();for(const key of keys)counts.set(key,(counts.get(key)||0)+1);
      return Array.from(counts,([key,n])=>labels[key][0]+(n>1?" ×"+n:""));
    }
    function ingredients(r){return [bases[r.base][0]].concat(counted(r.sauces,sauces),counted(r.toppings.map(t=>t.key),garnishes)).join(" · ");}
    function tip(text){$("free-tip").textContent=text;}
    function redraw(){if(cream && !space.hidden)cream.render();}
    function queue(){if(!frame)frame=requestAnimationFrame(()=>{frame=0;redraw();});}
    function end(){const id=stroke && stroke.id;stroke=null;sound.stop();if(id!=null && bowl.hasPointerCapture(id))bowl.releasePointerCapture(id);}
    function refresh(){
      space.dataset.phase=phase;
      $("bar-phase").textContent={mix:"调奶底",garnish:"摆小料",served:"甜品出杯"}[phase];
      $("cup-name").textContent=phase==="served" && $("dessert-name").value.trim()?$("dessert-name").value.trim():name();
      $("cup-bill").textContent=ingredients({base,sauces:syrups,toppings});
      $("mix-bar").hidden=phase!=="mix";$("garnish-bar").hidden=phase!=="garnish";$("served-bar").hidden=phase!=="served";
      $("undo-garnish").disabled=!toppings.length;
      bowl.tabIndex=phase==="served"?-1:0;
      bowl.setAttribute("aria-label",phase==="mix"?"拖动勺子搅拌奶底，也可按空格搅一圈":"点击杯面摆放小料，也可按空格放一份");
      for(const b of $("bases").children)b.setAttribute("aria-pressed",String(b.value===base));
      for(const b of $("toppings").children)b.setAttribute("aria-pressed",String(b.value===selected));
      $("collect").disabled=saved;$("collect").textContent=saved?"已收进食谱":"收进食谱";$("dessert-name").readOnly=saved;
    }
    function decorate(){
      end();phase="garnish";saved=false;refresh();tip("点小料直接撒一份，也可以点杯面指定位置。");
    }
    function mix(){end();phase="mix";saved=false;refresh();tip("点淋酱加一勺，按住杯面把它拌开。");}
    function load(r){
      end();base=r?r.base:"vanilla";syrups=r?r.sauces.slice():[];toppings=r?r.toppings.map(t=>Object.assign({},t)):[];
      selected="strawberry";$("dessert-name").value=r?r.name:"";cream.clear();cream.setBase(bases[base][1]);
      syrups.forEach((k,i)=>cream.drizzle(sauces[k][1],i));drawGarnishes();mix();redraw();
      if(r)tip("配料已经按食谱放好，搅出这次想要的纹路吧。");
    }
    function garnishImage(t, animate=false){
      let img;
      if(scattered(t.key)){
        img=window.sprinkleSprite(t.key,t.seed||0,animate);
      }else{
        img=window.CupPhotos.copy(t.key);
        if(animate)img.className="just-placed";
      }
      img.dataset.ingredient=t.key;
      img.style.width=garnishes[t.key][1]*100+"%";img.style.left=t.x*100+"%";img.style.top=t.y*100+"%";
      img.style.transform="translate(-50%,-50%) rotate("+t.angle+"rad)";
      return img;
    }
    function drawGarnishes(){
      const layer=$("garnishes");layer.textContent="";
      for(const t of toppings)layer.appendChild(garnishImage(t));
    }
    function sprinkle(){
      const angle=toppings.length*2.4-.8;
      const radius=toppings.length%3===2 ? .12 : .24;
      place({x:.5+radius*Math.cos(angle),y:.5+radius*Math.sin(angle)});
    }
    function place(p){
      if(phase!=="garnish")return;
      const t={key:selected,x:p.x,y:p.y,angle:(Math.random()-.5)*.95};
      if(scattered(selected))t.seed=Math.floor(Math.random()*4294967296);
      toppings.push(t);
      const img=garnishImage(t,true);$("garnishes").appendChild(img);
      refresh();sound.unlock();sound.ready();
      tip("已撒入"+garnishes[selected][0]+" · 共 "+toppings.length+" 份");
    }
    function location(e){
      const rect=$("free-flat").getBoundingClientRect();
      const p={x:(e.clientX-rect.left)/rect.width,y:(e.clientY-rect.top)/rect.height};
      return Math.hypot(p.x-.5,p.y-.5)<.48?p:null;
    }
    bowl.addEventListener("pointerdown",e=>{
      if(!cream||phase==="served"||stroke||e.button!==0)return;
      const p=location(e);if(!p)return;e.preventDefault();
      if(phase==="garnish"){place(p);return;}
      sound.unlock();stroke={id:e.pointerId,p};bowl.setPointerCapture(e.pointerId);
    });
    function drag(e){
      if(!stroke||stroke.id!==e.pointerId)return;
      const p=location(e);
      if(p && stroke.p){
        const len=Math.hypot(p.x-stroke.p.x,p.y-stroke.p.y);
        cream.stir(stroke.p,p);sound.stir(Math.min(1,len*10),.3,len);queue();
      }
      stroke.p=p;
    }
    bowl.addEventListener("pointermove",drag);
    bowl.addEventListener("pointerup",e=>{if(stroke&&stroke.id===e.pointerId){drag(e);end();}});
    for(const type of ["pointercancel","lostpointercapture"])bowl.addEventListener(type,e=>{if(stroke&&stroke.id===e.pointerId)end();});
    bowl.addEventListener("keydown",e=>{
      if((e.key!==" "&&e.key!=="Enter")||phase==="served"||e.repeat)return;
      e.preventDefault();sound.unlock();
      if(phase==="garnish"){sprinkle();return;}
      const pt=t=>({x:.5+.22*Math.cos(t),y:.5+.22*Math.sin(t)});
      for(let i=1;i<=18;i++)cream.stir(pt((i-1)*Math.PI/9),pt(i*Math.PI/9));queue();sound.pull();
    });
    window.addEventListener("resize",queue);window.addEventListener("cup-layout",queue);window.addEventListener("blur",end);
    document.addEventListener("visibilitychange",()=>{if(document.hidden)end();});
    function choices(id,items,choose){
      for(const key of Object.keys(items)){
        const b=document.createElement("button");b.type="button";b.value=key;
        let icon;
        if(id==="toppings"){
          if(scattered(key))icon=window.sprinkleSprite(key,71,false);
          else icon=window.CupPhotos.copy(key);
          b.setAttribute("aria-label","撒一份"+items[key][0]);
        }else{icon=document.createElement("i");icon.style.background=items[key][1];}
        b.hidden=(ingredientRewards.get(key)||0)>book.stars();
        b.append(icon,document.createTextNode(items[key][0]));b.onclick=()=>choose(key);$(id).appendChild(b);
      }
    }
    function shelf(){
      const list=$("recipes");list.textContent="";$("recipe-count").textContent=book.data.recipes.length+" 杯";
      if(!book.data.recipes.length){list.textContent="出杯后给甜品起个名字，就能留下自己的第一份食谱。";return;}
      for(const r of book.data.recipes.slice().reverse()){
        const entry=document.createElement("article"),info=document.createElement("div"),title=document.createElement("strong"),desc=document.createElement("small"),again=document.createElement("button");
        if(typeof r.thumb==="string" && r.thumb.startsWith("data:image/jpeg;base64,")){
          const img=new Image();img.src=r.thumb;img.alt=r.name;entry.appendChild(img);
        }
        title.textContent=r.name;desc.textContent=ingredients(r);info.append(title,desc);again.type="button";again.textContent="再做一杯";
        again.onclick=()=>{load(r);$("recipe-book").open=false;$("cup-name").scrollIntoView({block:"nearest"});};
        entry.append(info,again);list.appendChild(entry);
      }
    }
    async function thumbnail(portions){
      const c=document.createElement("canvas");c.width=c.height=96;const ctx=c.getContext("2d");
      ctx.fillStyle="#f6e7cb";ctx.fillRect(0,0,96,96);ctx.beginPath();ctx.arc(48,48,47,0,2*Math.PI);ctx.clip();
      ctx.drawImage(cream.capture(),0,0,96,96);
      for(const t of portions){
        const img=scattered(t.key)?window.sprinkleSprite(t.key,t.seed||0,false):await window.CupPhotos.ready(t.key);
        const size=garnishes[t.key][1]*96;
        ctx.save();ctx.translate(t.x*96,t.y*96);ctx.rotate(t.angle);ctx.drawImage(img,-size/2,-size/2,size,size);ctx.restore();}
      return c.toDataURL("image/jpeg",.68);
    }
    let cachedPoster = null, lastPosterFile = null, prepToken = 0;
    async function buildPoster(){
      if(cachedPoster)return cachedPoster;
      const title=$("dessert-name").value.trim()||name();
      const recipeText=ingredients({base,sauces:syrups,toppings});
      const loaded=await Promise.all(toppings.map(async t=>{
        try{
          return {t,img:scattered(t.key)?window.sprinkleSprite(t.key,t.seed||0,false):await window.CupPhotos.ready(t.key)};
        }catch(e){return null;}
      }));
      cachedPoster=window.CupSocial.renderPoster({
        badge:"甜品自助吧",
        title,
        subtitle:"配方："+recipeText,
        tag:"我的招牌",
        cupCanvas:cream.capture(),
        drawExtra(ctx,cx,cy,innerR){
          const side=innerR*2;
          for(const item of loaded){
            if(!item)continue;
            const t=item.t, sz=garnishes[t.key][1]*side;
            ctx.save();
            ctx.shadowColor="rgba(87,36,8,0.42)";
            ctx.shadowBlur=6;ctx.shadowOffsetX=2;ctx.shadowOffsetY=4;
            ctx.translate(cx+(t.x-.5)*side,cy+(t.y-.5)*side);
            ctx.rotate(t.angle);
            ctx.drawImage(item.img,-sz/2,-sz/2,sz,sz);
            ctx.restore();
          }
        }
      });
      return cachedPoster;
    }
    function preparePoster(){
      cachedPoster=null;lastPosterFile=null;
      const token=++prepToken;
      if(!window.CupSocial)return;
      buildPoster().then(canvas=>{
        if(token!==prepToken||!canvas)return null;
        return window.CupSocial.writePosterFile(canvas);
      }).then(path=>{
        if(token===prepToken&&path)lastPosterFile=path;
      }).catch(()=>{});
    }
    function syncSocial(){
      if(!window.CupSocial)return;
      $("studio-note").hidden=true;
      window.CupSocial.capabilities().then(cap=>{
        $("studio-comment").hidden=!cap.canComment;
        $("studio-comment-tip").hidden=!cap.canComment;
        $("studio-share").hidden=!cap.canShare;
        $("studio-social").hidden=!(cap.canComment||cap.canShare);
      });
    }
    $("studio-comment").onclick=()=>{
      if(!window.CupSocial||phase!=="served")return;
      const title=$("dessert-name").value.trim()||name();
      const recipeText=ingredients({base,sauces:syrups,toppings});
      const text="我在《全搅进去》调了杯「"+title+"」🍧 配方："+recipeText+"！你们调了什么神仙甜品，来评论区交作业👇";
      const snapshot={mode:"studio",name:title,base,sauces:syrups.slice(0,8),toppings:toppings.slice(0,12).map(t=>({k:t.key,x:+t.x.toFixed(2),y:+t.y.toFixed(2)}))};
      const done=(res)=>{
        if(res && res.reason==="not_routed"){
          if(res.filePath)lastPosterFile=res.filePath;
          const cap=window.CupSocial.syncCapabilities();
          if(cap.canPostNote)$("studio-note").hidden=false;
        }
      };
      // Synchronous SDK invocation when poster & temp file are already pre-warmed!
      if(lastPosterFile){
        window.CupSocial.postComment({text,posterCanvas:cachedPoster,prewrittenFilePath:lastPosterFile,snapshot,onStatus:tip,button:$("studio-comment")}).then(done);
      }else{
        buildPoster().catch(()=>null).then(posterCanvas=>window.CupSocial.postComment({text,posterCanvas,snapshot,onStatus:tip,button:$("studio-comment")})).then(done);
      }
    };
    $("studio-share").onclick=()=>{
      if(!window.CupSocial||phase!=="served")return;
      if(cachedPoster||lastPosterFile){
        window.CupSocial.shareCup({posterCanvas:cachedPoster,prewrittenFilePath:lastPosterFile,onStatus:tip,button:$("studio-share")});
      }else{
        buildPoster().catch(()=>null).then(posterCanvas=>window.CupSocial.shareCup({posterCanvas,onStatus:tip,button:$("studio-share")}));
      }
    };
    $("studio-note").onclick=()=>{
      if(!window.CupSocial||phase!=="served")return;
      const title=$("dessert-name").value.trim()||name();
      const recipeText=ingredients({base,sauces:syrups,toppings});
      const text="我在《全搅进去》调了一杯0卡「"+title+"」🍧 配方："+recipeText+"！不用下载，点开就能自己搅一杯～ #解压小游戏 #电子甜品 #全搅进去";
      buildPoster().catch(()=>null).then(posterCanvas=>window.CupSocial.postNote({title:"我的0卡招牌杯："+title,text,posterCanvas,filePath:lastPosterFile,onStatus:tip,button:$("studio-note")}));
    };
    $("decorate").onclick=decorate;$("back-mix").onclick=mix;
    $("undo-garnish").onclick=()=>{if(!toppings.length)return;toppings.pop();$("garnishes").lastElementChild.remove();refresh();tip("已撤下上一份小料。");};
    $("serve").onclick=()=>{
      end();phase="served";saved=false;if(!$("dessert-name").value.trim())$("dessert-name").value=name();
      refresh();syncSocial();preparePoster();tip("装杯完成！可以收进食谱，或一键晒到评论区👇");sound.unlock();sound.stamp("good");
    };
    $("edit-cup").onclick=decorate;$("new-cup").onclick=()=>load(null);
    let nameTimer=0;
    $("dessert-name").oninput=()=>{
      $("cup-name").textContent=$("dessert-name").value.trim()||name();
      clearTimeout(nameTimer);nameTimer=setTimeout(preparePoster,260);
    };
    $("recipe-form").onsubmit=async e=>{
      e.preventDefault();if(saved||phase!=="served")return;
      const title=$("dessert-name").value.trim();if(!title){$("dessert-name").focus();return;}
      const r={name:title,base,sauces:syrups.slice(),toppings:toppings.map(t=>Object.assign({},t))};
      saved=true;refresh();
      try{r.thumb=await thumbnail(r.toppings);}catch(error){/* The ingredient list can be saved on its own. */}
      book.data.recipes.push(r);shelf();
      if(phase==="served" && saved && $("dessert-name").value.trim()===title)tip("「"+title+"」已加入我的甜品食谱。");
      await book.save();
    };
    return {open(prize){
      if(!cream){
        cream=new window.DessertCream($("free-flat"),$("free-gl"),queue);
        choices("bases",bases,k=>{base=k;cream.setBase(bases[k][1]);refresh();redraw();});
        choices("sauces",sauces,k=>{cream.drizzle(sauces[k][1],syrups.length);syrups.push(k);sound.unlock();sound.pull();refresh();queue();tip("加好"+sauces[k][0]+"了，沿酱线拖一下勺子。");});
        choices("toppings",garnishes,k=>{selected=k;sprinkle();});
        for(const card of book.data.colors){const sw=document.createElement("span");sw.textContent=card.name+" "+card.hex;sw.style.borderLeft="12px solid "+card.hex;$("old-colors").lastElementChild.appendChild(sw);}
        $("old-colors").hidden=!book.data.colors.length;load(null);
      }
      const stars=book.stars();
      for(const group of [$("bases"),$("sauces")])for(const b of group.children)b.hidden=(ingredientRewards.get(b.value)||0)>stars;
      if(prize && stars>=prize.at){
        mix();const group=$(prize.kind==="base"?"bases":"sauces");
        for(const b of group.children)if(b.value===prize.id){b.click();break;}
        tip("已加入闯关奖励「"+prize.name+"」，可以开始搅拌。");
      }
      shelf();redraw();
    },leave:end};
  };
})();
