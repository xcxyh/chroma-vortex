(() => {
  "use strict";
  const chapters=["试营业","花市早班","海边午后","星光夜市","蜜桃山庄","森林茶会","极光冰港","云顶庆典"];
  const tracks=["classic","trace","hunt"];
  const fresh=()=>({chapter:0,scores:[],misses:0,best:Array(chapters.length).fill(0),cups:Array(chapters.length*3).fill(null)});
  const day=()=>new Date(Date.now()+8*3600000).toISOString().slice(0,10);
  const data={version:1,last:"classic",tracks:{classic:fresh(),trace:fresh(),hunt:fresh()},daily:{date:day(),run:fresh(),order:"stir-first"},colors:[],recipes:[],musicEnabled:true,dailyAwards:[]};
  const key="stir-stand-book-v1";
  const between=(n,min,max)=>Number.isInteger(n)&&n>=min&&n<=max;
  function valid(run){
    return run && between(run.chapter,0,chapters.length-1) && Array.isArray(run.scores) && run.scores.length<=2 && run.scores.every(v=>between(v,1,100))
      && between(run.misses,0,1000000) && Array.isArray(run.best) && (run.best.length===4 || run.best.length===chapters.length) && run.best.every(v=>between(v,0,300));
  }
  function restored(run){
    const migrated=Object.assign(fresh(),run);
    migrated.best=Array.from({length:chapters.length},(_,i)=>run.best[i]||0);
    migrated.cups=Array.from({length:chapters.length*3},(_,i)=>{
      const saved=run.cups && run.cups[i], chapter=Math.floor(i/3);
      // Zero marks a known clear from an old chapter receipt whose individual scores were not saved.
      let value=between(saved,0,100)?saved:migrated.best[chapter]>0?0:null;
      if(chapter===run.chapter && i%3<run.scores.length)value=Math.max(value||0,run.scores[i%3]);
      return value;
    });
    // Old regular campaigns stopped at the fourth chapter.
    if(run.best.length===4 && run.chapter===3 && run.best[3]>0 && !run.scores.length)migrated.chapter=4;
    return migrated;
  }
  const rewards=[
    {at:1,id:"peach",kind:"sauce",name:"蜜桃酱",color:"#ff9d99"},
    {at:3,id:"milkTea",kind:"base",name:"伯爵奶茶",color:"#d0a580"},
    {at:6,id:"blackcurrant",kind:"sauce",name:"黑加仑酱",color:"#713168"},
    {at:12,id:"taro",kind:"base",name:"香芋冰乳",color:"#c0a4ce"},
    {at:24,id:"pistachio",kind:"sauce",name:"开心果酱",color:"#91b76d"},
    {at:36,id:"coconut",kind:"base",name:"椰云奶底",color:"#f8efd9"},
    {at:48,id:"apricot",kind:"sauce",name:"金杏果酱",color:"#ec9d38"},
    {at:60,id:"rose",kind:"base",name:"玫瑰奶冻",color:"#edbac9"},
    {at:72,id:"honey",kind:"sauce",name:"桂花蜜",color:"#dc9827"}
  ];
  const totalCups=chapters.length*tracks.length*3;
  function cleared(){return tracks.reduce((n,key)=>n+data.tracks[key].cups.filter(v=>v!==null).length,0);}
  function stars(){return cleared()+3*data.dailyAwards.length;}
  function nextSlot(key){
    const run=data.tracks[key];
    const missing=run.cups.findIndex(v=>v===null);
    return missing<0?run.cups.length:missing;
  }
  let api=null,queue=Promise.resolve(),status="正在读取手账";
  const update=s=>{status=s;document.getElementById("storage-note").textContent=s;};
  async function load(){
    try{
      const xhs=window.xhs, sdk=xhs && xhs.miniTool;
      let opts=xhs && xhs.launchOptions;
      if(sdk && !(opts && opts.miniToolEnv && opts.miniToolEnv.buildVersion) && sdk.getLaunchOptions) opts=await sdk.getLaunchOptions();
      const build=Number(opts && opts.miniToolEnv && opts.miniToolEnv.buildVersion);
      if(!Number.isSafeInteger(build)||Math.floor(build/1000)<9460||!sdk || !sdk.getStorage || !sdk.setStorage) return null;
      const r=await sdk.getStorage({key});
      if(!r || r.errMsg!=="getStorage:ok" || !("data" in r))throw Error("read");
      if(r.data===null || r.data==="")return {sdk};
      const v=JSON.parse(r.data);
      if(!v || v.version!==1 || !tracks.every(m=>valid(v.tracks && v.tracks[m])) || !valid(v.daily && v.daily.run) || !Array.isArray(v.colors))throw Error("format");
      return {sdk,v};
    }catch(e){return null;}
  }
  async function init(){
    let timer;
    const result=await Promise.race([load(),new Promise(resolve=>{timer=setTimeout(()=>resolve(null),2400);})]);
    clearTimeout(timer);
    if(!result){update("本次手账仅在当前页面保留");return;}
    api=result.sdk;
    if(result.v){
      const v=result.v;
      for(const t of tracks)data.tracks[t]=restored(v.tracks[t]);
      if(Array.isArray(v.dailyAwards))data.dailyAwards=Array.from(new Set(v.dailyAwards.filter(d=>typeof d==="string" && /^\d{4}-\d{2}-\d{2}$/.test(d))));
      if(v.daily.run.best[0]>0 && !data.dailyAwards.includes(v.daily.date))data.dailyAwards.push(v.daily.date);
      data.musicEnabled=v.musicEnabled!==false;
      if(v.daily.date===day()){
        const started=v.daily.run.scores.length>0 || v.daily.run.misses>0;
        const order=started && v.daily.order!=="stir-first"?"original":"stir-first";
        data.daily={date:v.daily.date,run:restored(v.daily.run),order};
      }
      if(tracks.includes(v.last)||v.last==="daily")data.last=v.last;
      if (Array.isArray(v.recipes)) data.recipes=v.recipes.filter(window.DessertBar.validRecipe);
      data.colors=v.colors.filter(c=>c&&/^#[a-f0-9]{6}$/i.test(c.hex)&&typeof c.name==="string");
    }
    update("手账已就绪");
  }
  function save(){
    if(!api)return Promise.resolve(false);
    const snapshot=JSON.stringify(data);
    queue=queue.then(async()=>{
      try{const r=await api.setStorage({key,data:snapshot});if(!r||r.errMsg!=="setStorage:ok")throw Error("save");update("手账已保存");return true;}
      catch(e){update("本次修改仅在当前页面保留");return false;}
    });
    return queue;
  }
  function dailyRun(){
    if(data.daily.date!==day())data.daily={date:day(),run:fresh(),order:"stir-first"};
    return data.daily.run;
  }
  const sets=[
    ["桂花乌龙","覆盆玫瑰","茉莉青提"],
    ["海盐青柠","落日芒果","蓝莓潮汐"],
    ["黑樱桃","薄荷可可","紫芋晚星"],
    ["蜜桃乌龙","杏子奶酪","杨梅雪酪"],["开心果拿铁","黑莓松露","榛果茶旋"],
    ["冰蓝青柠","雪顶柚子","北极莓果"],["玫瑰星云","金桂流心","极光盛宴"]
  ];
  const colors=[
    ["#ac591d","#ffe4a0","#e7a64c"],["#9f164b","#fde3bd","#e87e94"],["#4e9045","#fff3bb","#b9ce79"],
    ["#247f85","#d8f5a5","#84c8ac"],["#d84d2f","#ffdc68","#ff9850"],["#3f4580","#f7c8e4","#ab89be"],
    ["#871b3e","#ffd3b7","#c16a80"],["#654538","#a7ead0","#a9af8a"],["#634a99","#fff2bd","#b5a1b7"],
    ["#fb827e","#fae5af","#f7ae95"],["#dc872e","#fff7cb","#efc185"],["#993c69","#f8cecb","#c788a3"],
    ["#759b53","#ffe3b0","#c8cd8c"],["#57244f","#cf9d88","#97687a"],["#985d34","#d2edb0","#c8af81"],
    ["#26797c","#d8ffc5","#8cd7be"],["#dc9d26","#fff9d7","#f4dd97"],["#794581","#c2eaf2","#aca6cc"],
    ["#c23e71","#ecd6d9","#d984a6"],["#d78822","#f5dfa0","#ebb35a"],["#604989","#a2efcf","#919abb"]
  ];
  const centers=[[.445,.94,.63],[.34,.73,.54],[.49,.84,.40],[.59,.32,.76],[.38,.57,.74],[.42,.71,.55],[.68,.51,.81],[.57,.79,.65]];
  function recipe(base,chapter,slot){
    if(!chapter)return base[slot];
    const i=(chapter-1)*3+slot, name=sets[chapter-1][slot], c=colors[i],target=centers[chapter][slot],half=[0,.12,.095,.075,.105,.095,.09,.075][chapter];
    return {name,color:{first:c[0],second:c[1],mixed:c[2]},sample:target,minimum:target-half,maximum:target+half,
      request:target<.45?"留住宽宽的双色带。":target>.7?"再细一点，把两种颜色揉开。":"要看得清、一圈一圈的旋纹。",
      best:[name,"这一杯收进营业手账了。"],early:["搅得太浅","旋纹还没展开，再多绕一点。"],late:["花纹散了","下次早一点松手。"]};
  }
  function dailyPlan(date){
    let h=0;for(const c of date)h=(Math.imul(h,31)+c.charCodeAt(0))>>>0;
    const random=()=>{h=(Math.imul(h,1664525)+1013904223)>>>0;return h/4294967296;};
    const shuffled=tracks.slice();
    for(let i=2;i>0;i--){const j=Math.floor(random()*(i+1));[shuffled[i],shuffled[j]]=[shuffled[j],shuffled[i]];}
    const cups=shuffled.map(mode=>({mode,tier:1+Math.floor(random()*3),slot:Math.floor(random()*3),angle:random()*Math.PI*2}));
    // Keep each seeded recipe with its original mode, including during upgrades.
    if(data.daily.date===date && data.daily.order==="original")return cups;
    const first=cups.findIndex(cup=>cup.mode==="classic");
    cups.unshift(cups.splice(first,1)[0]);
    return cups;
  }
  window.CupBook={chapters,tracks,data,rewards,totalCups,cleared,stars,nextSlot,day,dailyRun,dailyPlan,init,save,recipe,get status(){return status;}};
})();
