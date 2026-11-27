(() => {
  const key='cream-atelier.v1', badges=['初次开张','双色裱花师','花嘴收藏家','撒糖高手','满分店员','接单达人'];
  const data={model:Catalog.defaultModel,level:1,best:{},badges:[],works:[],music:true,sound:true};
  let backend='memory',sdk,queue=Promise.resolve(),available=true;
  function apply(raw){
    if(!raw)return;const o=JSON.parse(raw);if(!o||typeof o!=='object')return;
    data.model=Catalog.get('models',o.model)?o.model:Catalog.defaultModel;
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
      if(backend==='sdk'){
        try{const value=await timed(sdk.getStorage({key}));apply(value&&value.data);}
        catch(e){if(!/not found|not exist|不存在/i.test(String(e&&(e.errMsg||e.message))))throw e;}
      }
      if(backend==='browser')apply(localStorage.getItem(key));
      available=backend!=='memory';
    }catch(e){backend='memory';available=false;}
    return available;
  }
  function compressProduct(product){
    // Keep the full-resolution product separate from card typography, for clean re-exports after renaming.
    for(const quality of [.82,.65,.48]){
      const url=product.toDataURL('image/webp',quality);
      if(!url.startsWith('data:image/webp;'))break;
      if(url.length<=310000)return url;
    }
    const copy=CreamArt.surface(630,1080),g=copy.getContext('2d');
    g.drawImage(product,0,0,copy.width,copy.height);
    let url=copy.toDataURL('image/webp',.68);
    if(!url.startsWith('data:image/webp;')){
      g.globalCompositeOperation='destination-over';g.fillStyle='#f8f2e5';g.fillRect(0,0,copy.width,copy.height);
      url=copy.toDataURL('image/jpeg',.76);
    }
    return url;
  }
  function quotaError(error){
    return /quota|exceed|too large|storage.{0,12}(full|limit)|配额|超限|容量|空间不足/i.test(
      [error&&error.name,error&&error.message,error&&error.errMsg].join(' '));
  }
  async function persist(){
    if(backend==='memory')return false;
    const snapshot=Object.assign({},data,{works:data.works.slice()}),evicted=[];
    // Only commit evictions after a smaller snapshot has actually been written.
    for(;;){
      try{
        const raw=JSON.stringify(snapshot);
        if(backend==='sdk'){
          if(new Blob([raw]).size>1024*1024)throw Error('quota');
          const r=await timed(sdk.setStorage({key,data:raw}));
          if(!r||r.errMsg!=='setStorage:ok')throw r;
        }else localStorage.setItem(key,raw);
        if(evicted.length)data.works=data.works.filter(w=>!evicted.includes(w));
        available=true;return true;
      }catch(e){
        if(!quotaError(e)){available=false;return false;}
        if(snapshot.works.length>1){evicted.push(snapshot.works.pop());continue;}
        const last=snapshot.works[0];
        if(last&&last.productImage){
          snapshot.works[0]=Object.assign({},last);delete snapshot.works[0].productImage;continue;
        }
        available=false;return false;
      }
    }
  }
  function save(){queue=queue.then(persist,persist);return queue;}
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
  window.ShopStore={data,badges,load,save,record,compressProduct,available:()=>available};
})();

