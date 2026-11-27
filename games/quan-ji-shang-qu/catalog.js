(() => {
  'use strict';
  const bases = [
    ['clear','冰透原色','#f6f2e9'], ['peach','蜜桃晶冻','#f6c9cd'],
    ['mint','薄荷苏打','#c5e1d2'], ['lilac','香芋布丁','#d9cee9']
  ].map(([id,name,color]) => ({id,name,color}));
  const creams = [
    ['pink','草莓粉','#f28ea7'], ['milk','香草白','#fff0cb'],
    ['tea','抹茶绿','#a9c991'], ['lilac','香芋紫','#c7a8dd'],
    ['cocoa','可可棕','#a77a67'], ['shake','草莓奶昔','#ee87a3','#ffedce'],
    ['latte','抹茶奶盖','#91bc87','#fff0ca'], ['banana','黑巧香蕉','#795449','#f4cf79']
  ].map(([id,name,a,b]) => ({id,name,a,b}));
  const tips = [{id:'shell',name:'8齿波浪嘴'}, {id:'rosette',name:'玫瑰大花嘴'}, {id:'ribbon',name:'丝带扁花嘴'}];
  const charms = [
    ['bear','奶油小熊'],['strawberry','亮面草莓'],['cookie','爱心曲奇'],['bow','粉色蝴蝶结'],
    ['cloud','微笑云朵'],['cherry','双樱桃'],['macaron','抹茶马卡龙'],['marshmallow','彩虹棉花糖']
  ].map(([id,name]) => ({id,name,src:'./assets/charms/'+id+'.png'}));
  const dust = [['pearl','白珍珠'],['sugar','彩色糖针'],['flower','五瓣小花'],['glint','星光细闪']].map(([id,name])=>({id,name}));
  const all = {bases,creams,tips,charms,dust};
  function get(group,id){ return all[group].find(item => item.id === id); }
  window.Catalog = Object.assign({get},all);
})();

