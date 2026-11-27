(() => {
  const key='cream-atelier.v1', badges=['初次开张','双色裱花师','花嘴收藏家','撒糖高手','满分店员','接单达人'];
  const data={level:1,best:{},badges:[],works:[],music:true,sound:true};
  let backend='memory',sdk,queue=Promise.resolve(),available=true;
  function apply(raw){
    if(!raw)return;const o=JSON.parse(raw);if(!o||typeof o!=='object')return;
    data.level=Math.max(1,Math.min(18,Math.floor(Number(o.level)||1)));
    if(o.best&&typeof o.best==='object')data.best=o.best;
    if(Array.isArray(o.badges))data.badges=badges.filter(b=>o.badges.includes(b));
    if(Array.isArray(o.works))data.works=o.works.filter(w=>w&&typeof w.id==='string'&&Array.isArray(w.materials)&&typeof w.thumb==='string').slice(0,12);
    data.music=o.music!==false;data.sound=o.sound!==false;
  }
  function timed(p){return new Promise((resolve,reject)=>{
    const t=setTimeout(()=>reject(Error('存储超时')),2200);
    Promise.resolve(p).then(v=>{clearTimeout(t);resolve(v);},e=>{clearTimeout(t);reject(e);});
  });}
  async function load(){
    try{
      if(window.xhs){
        sdk=window.xhs.miniTool;let opts=window.xhs.launchOptions;
        if((!opts||!opts.miniToolEnv)&&sdk&&sdk.getLaunchOptions)opts=await timed(sdk.getLaunchOptions());
        const ver=Math.floor(Number(opts&&opts.miniToolEnv&&opts.miniToolEnv.buildVersion)/1000);
        if(ver>=9460&&sdk&&sdk.getStorage&&sdk.setStorage)backend='sdk';
        else if(ver>0&&ver<9460)backend='browser';
      }else backend='browser';
      if(backend==='sdk')apply((await timed(sdk.getStorage({key}))).data);
      if(backend==='browser')apply(localStorage.getItem(key));
      available=backend!=='memory';
    }catch(e){backend='memory';available=false;}
    return available;
  }
  function save(){
    const raw=JSON.stringify(data);
    async function persist(){
      try{
        if(backend==='sdk'){const r=await sdk.setStorage({key,data:raw});available=!!r&&r.errMsg==='setStorage:ok';}
        if(backend==='browser'){localStorage.setItem(key,raw);available=true;}
      }catch(e){available=false;}
      return available;
    }
    queue=queue.then(persist,persist);return queue;
  }
  function record(work,order,judgement,engine){
    const awards=['初次开张'];
    if(Catalog.creams.some(c=>c.b&&engine.used.has(c.id)))awards.push(badges[1]);
    if(engine.nozzles.size===3)awards.push(badges[2]);
    if(Object.keys(engine.mix).length===4)awards.push(badges[3]);
    if(order){
      data.best[order.id]=Math.max(data.best[order.id]||0,judgement.score);
      if(judgement.pass)data.level=Math.max(data.level,Math.min(18,order.id+1));
      if(judgement.score===100)awards.push(badges[4]);
      if(order.id===18&&judgement.pass)awards.push(badges[5]);
    }
    awards.forEach(b=>{if(!data.badges.includes(b))data.badges.push(b);});
    data.works=[work].concat(data.works.filter(w=>w.id!==work.id)).slice(0,12);
    return save();
  }
  window.ShopStore={data,badges,load,save,record,available:()=>available};
})();

