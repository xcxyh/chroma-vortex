(() => {
  const chapters = ['新手爆款单','双拼进阶单','网红定制单'];
  // Each recipe names its requested pigments, minimum piped area, resin pieces and finishing mix.
  const recipes = [
    ['草莓小熊','莓莓','想把草莓色的小熊带在身边。','pink',12,'bear',''],
    ['云朵来信','小满','给云朵垫一圈软乎乎的香草奶油，再撒些珍珠。','milk',16,'cloud','pearl'],
    ['抹茶茶歇','阿青','想要一块藏在抹茶里的马卡龙。','tea',22,'macaron','sugar'],
    ['紫芋蝴蝶结','圆圆','淡紫底上系个蝴蝶结，点几朵小花。','lilac',26,'bow','flower'],
    ['可可曲奇','栗子','可可色里留一块爱心曲奇，加一点闪。','cocoa',30,'cookie','glint'],
    ['樱桃冰淇淋','柚柚','草莓粉和香草白各挤一些，放上双樱桃。','pink milk',32,'cherry','pearl'],
    ['草莓奶昔','桃子','让粉白奶昔转起来，留一颗亮面草莓。','shake',34,'strawberry','sugar'],
    ['抹茶奶盖','小森','用拼挤的抹茶奶盖托住小熊和马卡龙。','latte',36,'bear macaron','pearl'],
    ['香蕉巧克力','可可','黑巧香蕉花边，配一块爱心曲奇。','banana',39,'cookie','glint'],
    ['晨间云莓','一一','奶昔拼上香草，云朵旁边来颗草莓。','shake milk',42,'cloud strawberry','flower'],
    ['薄荷花园','芽芽','抹茶奶盖配香芋紫，花园里住着蝴蝶结。','latte lilac',44,'bow macaron','flower'],
    ['焦糖马戏团','七喜','黑巧香蕉搭草莓粉，小熊想吃彩虹糖。','banana pink',46,'bear marshmallow','sugar pearl'],
    ['云端野餐','米粒','草莓奶昔和抹茶绿交错，云下摆上野餐点心。','shake tea',48,'cloud cookie strawberry','pearl'],
    ['樱桃舞会','小葵','香草搭草莓粉，给樱桃和蝴蝶结撒上星光。','milk pink',50,'cherry bow','glint flower'],
    ['森林甜铺','木木','抹茶奶盖配可可，给森林小熊留两份点心。','latte cocoa',52,'bear macaron cookie','sugar pearl'],
    ['银河软糖','星星','香芋紫和奶昔里，藏着云朵与糖果。','lilac shake',55,'cloud marshmallow bow','glint pearl'],
    ['三色下午茶','茶茶','三款双色奶油都来一点，茶点要丰盛。','shake latte banana',58,'strawberry macaron cookie','flower sugar'],
    ['奶油小铺纪念款','店长','用三种拼挤奶油做周年款，小熊、蝴蝶结和樱桃都到场。','shake latte banana',62,'bear bow cherry','pearl glint flower']
  ];
  const split = value => value ? value.split(' ') : [];
  const all = recipes.map(([name,guest,message,colors,target,pieces,mix],i)=>({
    id:i+1,chapter:chapters[Math.floor(i/6)],name,guest,message,target,
    colors:split(colors),charms:split(pieces),dust:split(mix)
  }));
  function evaluate(order, stats) {
    const area = Math.min(1,stats.coverage/order.target);
    // Balance is measured against equal requested shares. Painting one pixel of a second color cannot satisfy a two-color order.
    const color = order.colors.reduce((sum,id)=>sum+Math.min(1/order.colors.length, stats.colors[id]||0),0);
    const matched = (ids, counts) => ids.reduce((n,id)=>n+(counts[id]>0?1:0),0);
    const resin = matched(order.charms,stats.charms)/order.charms.length;
    const finish = order.dust.length ? matched(order.dust,stats.dust)/order.dust.length : 0;
    const score = Math.min(100,Math.round(area*35+color*30+resin*(order.dust.length?25:35)+finish*10));
    const colorsMet = order.colors.every(id=>(stats.colors[id]||0)>=.7/order.colors.length);
    const pass = area===1 && resin===1 && colorsMet && (!order.dust.length || finish===1);
    return {score,grade:score>=90?'S':score>=75?'A':'B',pass,area,color,resin,finish};
  }
  window.Orders = {all,evaluate};
})();

