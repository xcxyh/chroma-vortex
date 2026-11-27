(() => {
  const sdk=()=>window.xhs&&window.xhs.miniTool;
  const preview=new URLSearchParams(location.search).get('preview')==='1';
  const methods={comment:'interactionOpenApi',share:'share',note:'postNote'};
  let sequence=0, poster=null, uri='', path='', state='idle', busy=false,build=0;
  const environment=window.xhs&&window.xhs.launchOptions;
  function version(options){return Math.floor(Number(options&&options.miniToolEnv&&options.miniToolEnv.buildVersion)/1000)||0;}
  build=version(environment);
  if(!build&&sdk()&&sdk().getLaunchOptions)Promise.resolve(sdk().getLaunchOptions()).then(o=>{build=version(o);}).catch(()=>{});
  function can(action){const s=sdk();return preview||!!(s&&typeof s[methods[action]]==='function'&&(!build||action!=='comment'||build>=9490));}
  function render(work,product){
    const can=CreamArt.surface(540,675),g=can.getContext('2d');
    const ink='#523931',berry='#963858',green='#61765a';
    function label(t,x,y,font,color,limit){g.fillStyle=color||ink;g.font=font.replace(/sans-serif$/u,'"PingFang SC", "Microsoft YaHei", sans-serif').replace(/(^| )serif$/u,' "Songti SC", "PingFang SC", serif');g.fillText(t,x,y,limit||500);}
    function dashed(y){g.save();g.setLineDash([4,5]);g.strokeStyle='#c6afa0';g.beginPath();g.moveTo(29,y);g.lineTo(511,y);g.stroke();g.restore();}
    g.fillStyle='#fffaec';g.fillRect(0,0,540,675);
    g.fillStyle='#f5e2dc';g.fillRect(20,75,500,300);
    g.save();g.beginPath();g.rect(20,75,500,300);g.clip();
    for(let i=0;i<550;i+=22){g.fillStyle='rgba(255,255,249,.24)';g.fillRect(i,75,10,300);}
    for(let y=77;y<376;y+=22){g.fillStyle='rgba(255,255,249,.28)';g.fillRect(20,y,500,10);}
    g.translate(275,225);g.rotate(-.08);g.drawImage(product,-91,-150,182,304);g.restore();
    label('全挤上去',30,50,'bold 30px serif',berry);
    label('Cream Atelier',177,49,'italic 24px Georgia',berry);
    label('手作出单小票',398,47,'15px sans-serif',green);
    label('HANDMADE',38,111,'bold 12px monospace',berry);
    label(work.date,38,132,'12px monospace',ink);
    g.save();g.translate(442,315);g.rotate(-.15);g.strokeStyle=berry;g.lineWidth=2.4;
    for(const r of [39,34]){g.beginPath();g.arc(0,0,r,0,Math.PI*2);g.stroke();}
    g.textAlign='center';label(work.grade||'DIY',0,5,'bold 26px Georgia',berry);label('手 作 出 品',0,21,'9px sans-serif',berry);g.restore();
    label(work.name,28,414,'bold 29px serif',ink,480);dashed(429);
    label('本款 DIY 材料清单',29,457,'bold 19px sans-serif',berry);
    const layout=size=>{
      g.font=size+'px "PingFang SC", "Microsoft YaHei", sans-serif';const lines=[];
      work.materials.forEach(([group,items])=>{
        let line='',first=true;for(const item of items){const next=line?line+' · '+item:item;
          if(line&&g.measureText(next).width>402){lines.push([first?group:'',line]);first=false;line=item;}else line=next;
        }lines.push([first?group:'',line]);
      });return lines;
    };
    let size=16,lines=layout(size);while(lines.length*(size+4)>168&&size>12)lines=layout(--size);
    lines.forEach(([k,v],i)=>{const y=482+i*(size+4);label(k,30,y,'bold '+size+'px sans-serif',green);label(v,98,y,size+'px sans-serif',ink,407);});
    dashed(645);label('点笔记左下角《全挤上去》免下载挤同款 🎀',30,663,'bold 13px sans-serif',berry,345);
    g.save();g.textAlign='right';label(work.score==null?'自由定制 · 奶油壳DIY':'接单评分  '+work.score+' / 100',510,663,'12px sans-serif',green,155);g.restore();
    return can;
  }
  function renderCaseCard(work,productCanvas){
    const card=CreamArt.surface(750,1200),g=card.getContext('2d');
    const ink='#493831',sage='#576b51',berry='#873951';
    const font='"PingFang SC","Microsoft YaHei",sans-serif';
    function label(text,x,y,size,color,bold,maxWidth){
      g.font=(bold?'bold ':'')+size+'px '+font;g.fillStyle=color;
      g.fillText(text,x,y,maxWidth||670);
    }
    g.fillStyle='#f8f2e5';g.fillRect(0,0,750,1200);
    for(let x=0;x<750;x+=22){g.fillStyle='rgba(193,169,139,.09)';g.fillRect(x,0,8,1200);}
    for(let y=0;y<1200;y+=22){g.fillStyle='rgba(255,255,251,.38)';g.fillRect(0,y,750,8);}
    label('全挤上去 · 奶油胶手机壳定制图',34,51,28,berry,true,513);
    g.textAlign='right';label(work.date,716,50,17,sage,false,148);g.textAlign='left';
    g.fillStyle='#d2c6b5';g.fillRect(34,70,682,1);
    const materials=new Map(work.materials);
    const lines=[];g.font='20px '+font;
    for(const group of ['奶油胶','花嘴','配件','撒料']){
      let line='',key=group;
      for(const item of materials.get(group)||['—']){
        const next=line?line+' · '+item:item;
        if(line&&g.measureText(next).width>527){lines.push([key,line]);key='';line=item;}else line=next;
      }
      lines.push([key,line]);
    }
    const top=1200-166-lines.length*30,areaHeight=top-90;
    // Preserve the product aspect ratio, including historical thumbnail sources.
    const pw=productCanvas.naturalWidth||productCanvas.width,ph=productCanvas.naturalHeight||productCanvas.height;
    const ratio=Math.min(624/pw,areaHeight/ph);
    const w=pw*ratio,h=ph*ratio;
    g.save();g.shadowColor='rgba(103,70,59,.22)';g.shadowBlur=13;g.shadowOffsetY=7;
    g.drawImage(productCanvas,(750-w)/2,76+(areaHeight-h)/2,w,h);g.restore();
    g.fillStyle='#fffbf1';g.fillRect(24,top,702,1176-top);
    g.strokeStyle='#cdbfac';g.strokeRect(24.5,top+.5,701,1175-top);
    label(work.name,48,top+42,31,ink,true,652);
    label((work.modelName||'机型未记录')+'  ·  '+(materials.get('底壳')||['底壳未记录']).join('、'),48,top+77,21,sage,false);
    g.fillStyle='#ded1bf';g.fillRect(48,top+94,653,1);
    lines.forEach(([key,value],i)=>{
      label(key,48,top+122+i*30,18,sage,true);label(value,161,top+122+i*30,20,ink,false,537);
    });
    label('把这张图发给定制店，按图沟通用料与摆放位置。',48,1157,16,berry,false);
    return card;
  }
  async function saveImage(canvas,filename,report){
    const dataURL=canvas.toDataURL('image/png'),s=sdk();
    let status='preview';
    try{
      if(s&&typeof s.saveImageToPhotosAlbum==='function'){
        let filePath=dataURL;
        if(typeof s.writeTempFile==='function'){
          try{const tmp=await limit(s.writeTempFile({data:dataURL}),4000);filePath=tmp.filePath||dataURL;}catch(e){/* SDK also accepts a data URL. */}
        }
        const result=await limit(s.saveImageToPhotosAlbum({filePath}),30000);
        if(!result||result.errMsg!=='saveImageToPhotosAlbum:ok')throw Error('相册未确认保存');
        status='album';
      }else if(!window.xhs&&typeof canvas.toBlob==='function'&&window.URL&&URL.createObjectURL){
        const link=document.createElement('a');
        if('download' in link){
          const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/png'));
          if(blob){
            const url=URL.createObjectURL(blob);
            try{link.href=url;link.download=filename;document.body.appendChild(link);link.click();status='download';}
            finally{link.remove();setTimeout(()=>URL.revokeObjectURL(url),30000);}
          }
        }
      }
    }catch(e){status='preview';}
    if(report)report(status,dataURL);
    return dataURL;
  }
  function limit(p,ms){return new Promise((resolve,reject)=>{const t=setTimeout(()=>reject(Error('timeout')),ms);
    Promise.resolve(p).then(v=>{clearTimeout(t);resolve(v);},e=>{clearTimeout(t);reject(e);});});}
  function prepare(canvas,changed){
    const id=++sequence;poster=canvas;uri='';path='';state='loading';busy=false;changed();
    if(!poster)return;
    try{uri=poster.toDataURL('image/png');}catch(e){state='failed';changed();return;}
    const s=sdk();if(!s||typeof s.writeTempFile!=='function'){state='unavailable';changed();return;}
    Promise.resolve().then(()=>limit(s.writeTempFile({data:uri}),4000)).then(r=>{
      if(id!==sequence)return;path=r&&r.filePath||'';state=path?'ready':'failed';changed();
    },()=>{if(id===sequence){state='failed';changed();}});
  }
  function send(action,work,report,changed){
    if(busy||!poster)return;const s=sdk(),token=sequence;
    if(!s||typeof s[methods[action]]!=='function'){report(preview?'预览模式：已准备好小票图片，真机可打开'+({comment:'评论区',note:'笔记发布页',share:'分享面板'})[action]+'。':'请在小红书内打开使用。');return;}
    if(action==='comment'&&!path){report(state==='loading'?'正在准备小票图片…':'图片尚未就绪，正在重新准备，请再点一次。');if(state!=='loading')prepare(poster,changed);return;}
    const content='我在《全挤上去》做了「'+work.name+'」🎀 材料参考：'+work.materials.map(r=>r[1].join('、')).join(' / ')+' #全挤上去 #奶油胶手机壳 #解压小游戏';
    busy=true;changed();
    try{
      let call;
      // The comment route must run on this click stack. All PNG encoding and file writes have already finished.
      if(action==='comment')call=s.interactionOpenApi({payload:{action:'post_comment',content,media_bean:[{media_type:'image',cover_image_url:path}]},saveToAlbum:true});
      else if(action==='note')call=s.postNote({title:work.name.slice(0,20),content,pageType:'photo_publish',mediaInfo:{image_resources:[{url:path||uri}]}});
      else call=Promise.resolve(s.share({type:'image',image_resource:path||uri})).catch(e=>{
        if(Number(e.errCode)===15501)return s.share({type:'card'});throw e;
      });
      limit(call,6000).then(r=>{
        if(token!==sequence)return;
        if(action==='comment'&&r&&[false,0,'false'].includes(r.routed))report('评论区未打开，请先从原笔记点开评论区后再试。');
        else report(action==='comment'?'已打开评论草稿，请在评论区确认发送。':action==='note'?'已带入小票，请在发布页确认。':'已打开分享面板。');
      },e=>{if(token===sequence)report(/cancel/i.test(String(e&&e.errMsg))?'已取消。':'暂未确认打开，请稍后再试。');}).then(()=>{if(token===sequence){busy=false;changed();}});
    }catch(e){busy=false;report('当前客户端暂时无法打开，请稍后再试。');changed();}
  }
  window.ShopSocial={render,renderCaseCard,saveImage,prepare,send,can,locked:action=>busy||(action==='comment'&&state==='loading')};
})();

