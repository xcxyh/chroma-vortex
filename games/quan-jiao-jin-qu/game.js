(() => {
  const MAX_PROGRESS = 1.08;
  const DISTANCE = 4.8;
  const orders = [
    {
      name: "草莓云顶",
      asset: "berry",
      request: "要红白粗纹，别把奶油全搅粉啦。",
      color: { first: "#d72459", second: "#fff2cc", mixed: "#f28b9f" },
      sample: 0.44,
      minimum: 0.26,
      maximum: 0.63,
      best: ["草莓云顶", "这一圈草莓酱，刚好挂住奶油。"],
      early: ["草莓还在分桌", "两边还没碰上。再试一次，多绕半圈。"],
      late: ["草莓粉底液", "云顶被你打成了粉底液。下次早点松手。"]
    },
    {
      name: "蜜橘日落",
      asset: "sunset",
      request: "这杯要搅透，只留一抹橘金色。",
      color: { first: "#ed542e", second: "#ffde65", mixed: "#ff9a32" },
      sample: 0.95,
      minimum: 0.8,
      maximum: MAX_PROGRESS,
      best: ["蜜橘日落", "杯底最后一缕金黄也融进去了。"],
      early: ["太阳蛋", "红是红，黄是黄。再绕一大圈试试。"]
    },
    {
      name: "葡萄海浪",
      asset: "wave",
      request: "照着样品，给我留一缕细浪。",
      color: { first: "#68419e", second: "#91dec8", mixed: "#a396bd" },
      sample: 0.62,
      minimum: 0.52,
      maximum: 0.74,
      best: ["葡萄海浪", "浪尖还在，正好封杯。"],
      early: ["葡萄撞冰山", "浪还没卷起来，再搅一点。"],
      late: ["消失的浪花", "浪花散了。下一杯早点收手。"]
    }
  ];
  const $ = (id) => document.getElementById(id);
  const bowl = $("bowl"), ink = $("ink");
  const paint = new window.StirPaint(ink);
  const sound = new window.StirFoley(true);
  const modes = { classic: {label:"松手出杯", board:1}, trace:{label:"一笔拉花", board:2}, hunt:{label:"旋纹寻色", board:3} };
  const book=window.CupBook;
  let track="classic", chapter=0, dailyDate="", batch=null, tier=0, slot=0;
  let practice=false, replaySet=false, practiceWon=false, mapTrack="classic", lastPrize=null, lastOutcome=null;
  let clockwise=0, reverse=0, shiftDown=false;
  const finalChapter=book.chapters.length-1;
  const directionHint=["顺时针绕一段","逆时针绕一段","先顺时针，再反手搅","先顺时针，再反手搅"];
  function directionOK(){
    if(mode!=="classic" || tier<4)return true;
    if(tier===4)return clockwise>=.35;
    if(tier===5)return reverse>=.35;
    return clockwise>=.35 && reverse>=.35;
  }
  let rotation = 0;
  let mode = "classic", challenge = null;
  let total = 0, misses = 0;
  let index, order, progress, spin, state, next;
  let hold, paintFrame, keyboardFrame;
  let previousTexture, previousCue;
  function verdict() {
    if (!directionOK()) return "direction";
    if (progress < order.minimum) return "early";
    if (progress > order.maximum) return "late";
    return "good";
  }
  function hasStirMeter() {
    return mode === "classic" && tier === 0 && slot < 2;
  }
  function texture() {
    if (progress < 0.13) return "两色刚入碗";
    if (progress < 0.39) return "彩带拉开";
    if (progress < 0.6) return "红白粗纹";
    if (progress < 0.87) return "细细的旋纹";
    return "已经搅匀";
  }
  function queuePaint() {
    if (paintFrame !== void 0) return;
    paintFrame = requestAnimationFrame(() => {
      paintFrame = void 0;
      paint.render();
    });
  }
  function updateReadout() {
    if (challenge) return;
    const label = texture().replace("红白粗纹", index === 0 ? "红白粗纹" : "粗纹卷起来了");
    let cue = "";
    if (state === "stirring" && hasStirMeter()) {
      if (verdict() === "good") cue = "可以松手！";
      if (verdict() === "late") cue = "搅过头了！";
    }
    if(state==="stirring" && !directionOK())cue=tier>=6 && clockwise>=.35?"现在反手搅":directionHint[tier-4];
    if (label !== previousTexture) $("texture").textContent = label;
    if (cue !== previousCue) $("cue").textContent = cue;
    $("needle").style.left = progress / MAX_PROGRESS * 100 + "%";
    $("meter").classList.toggle("in-range", cue === "可以松手！");
    if (cue === "可以松手！" && previousCue !== cue) sound.ready();
    previousTexture = label;
    previousCue = cue;
  }
  function drawSoundButton() {
    $("sound").textContent = sound.enabled ? "音效开" : "音效关";
    $("sound").setAttribute("aria-pressed", String(sound.enabled));
  }
  function start(newIndex) {
    cancelHold();
    if (newIndex === 0 && index === undefined) {
      total = 0;
      for (const slot of $("tray").children) slot.textContent = String(Array.prototype.indexOf.call($("tray").children, slot) + 1);
      $("count").textContent = "0 / 3";
    }
    bowl.classList.remove("done");
    $("order-space").classList.remove("is-result");
    $("cup-reward").hidden=true;lastPrize=null;lastOutcome=null;
    $("order-social").hidden=true;$("order-comment-tip").hidden=true;$("order-note").hidden=true;$("order-follow-tip").hidden=true;
    clockwise=reverse=0;practiceWon=false;
    window.CupRanks.reset();
    const spec=track==="daily" ? book.dailyPlan(dailyDate)[newIndex] : {mode:track,tier:chapter,slot:newIndex};
    if(newIndex!==index) rotation=track==="daily"?spec.angle:(track==="hunt"?Math.random()*Math.PI*2:0);
    mode=spec.mode; tier=spec.tier; slot=spec.slot;
    index=newIndex;
    misses=batch.misses;
    order=book.recipe(orders,tier,slot);
    progress = 0;
    spin = 1;
    state = "ready";
    previousTexture = previousCue = void 0;
    $("order-number").textContent = "第 ".concat(index + 1, " / ").concat(orders.length, " 杯");
    $("order-name").textContent = order.name;
    $("request").textContent = order.request;
    $("outcome").hidden = true;
    $("action").hidden = true;
    $("readout").hidden = false;
    $("meter").hidden = !hasStirMeter();
    $("window").style.left = order.minimum / MAX_PROGRESS * 100 + "%";
    $("window").style.width = (order.maximum - order.minimum) / MAX_PROGRESS * 100 + "%";
    $("note").hidden = false;
    $("note").textContent = hasStirMeter() ? "指针进绿区就松手，越靠近中心分越高。" : "对照右上角样品，纹路接近时松手。";
    $("gesture").textContent = "按住画圈，松手出杯";
    bowl.tabIndex = 0;
    bowl.removeAttribute("aria-disabled");
    if(order.asset)$("target").src = "./assets/" + order.asset + ".jpg";
    paint.reset(order.color, rotation);
    challenge = mode === "classic" ? null : window.CupChallenges[mode](slot, paint, tier, order);
    document.querySelector(".stand").dataset.mode = mode;
    $("order-number").textContent = (track==="daily"?"今日特调":book.chapters[chapter])+" · "+modes[mode].label + " · 第 " + (index+1) + " / 3 杯";
    $("goal-label").textContent = mode === "hunt" ? "找这个色" : mode === "trace" ? "照着画" : "照着搅";
    $("goal").hidden = !challenge;
    $("target").hidden = !!challenge || tier>0;
    if(!challenge && tier>0){
      $("goal").hidden=false;
      const sample=new window.StirPaint($("goal"));
      sample.reset(order.color,rotation);sample.preview(order.sample);
    }
    if(mode==="classic" && tier>=4){
      $("request").textContent=directionHint[tier-4]+"，"+order.request;
      $("note").textContent="看样品松手。键盘反向用 Shift + 空格。";
    }
    $("guide").hidden = mode !== "trace";
    $("contact").style.backgroundColor = "";
    $("cue").textContent = "";
    if (challenge) {
      $("order-name").textContent = challenge.name;
      $("request").textContent = challenge.request;
      $("gesture").textContent = challenge.gesture;
      $("note").textContent = challenge.note;
      $("texture").textContent = challenge.initial;
    }
    bowl.setAttribute("aria-label", challenge ? challenge.gesture + "。键盘按住空格，用方向键移动。" : "按住碗内画圈，松手出杯。也可按住空格搅拌。");
    paint.render();
    $("base").hidden = true;
    updateReadout();
  }
  function moveVisual(point) {
    const contact = $("contact");
    contact.hidden = false;
    contact.style.left = 50 + point.x * 42 + "%";
    contact.style.top = 50 + point.y * 42 + "%";
  }
  function begin(id, point, time) {
    if (challenge && !challenge.begin(point)) return false;
    sound.unlock();
    if (challenge) { state = "stirring"; bowl.classList.add("stirring"); sound.pull(); }
    hold = { id, point, time };
    moveVisual(point);
    return true;
  }
  function move(point, time) {
    const { x, y } = hold.point;
    const delta = Math.hypot(point.x - x, point.y - y);
    if (delta < 0.012) return;
    const elapsed = Math.max(8, time - hold.time);
    hold.point = point;
    hold.time = time;
    if (challenge) {
      challenge.move(point);
      moveVisual(point);
      if (mode === "trace") sound.stir(Math.min(1,delta*175/elapsed),0,delta);
      return;
    }
    if (state === "ready") {
      state = "stirring";
      bowl.classList.add("stirring");
      $("gesture").textContent = hasStirMeter() ? "看指针，松手出杯" : "看纹路，松手出杯";
      sound.pull();
    }
    const angularStep = Math.atan2(x * point.y - y * point.x, x * point.x + y * point.y);
    const radius = Math.min(Math.hypot(x, y), Math.hypot(point.x, point.y));
    if (radius > 0.18 && Math.abs(angularStep) > .001) {
      if(angularStep>0)clockwise+=angularStep;else if(tier<6 || clockwise>=.35)reverse-=angularStep;
      spin = spin * 0.68 + Math.sign(angularStep) * 0.32;
    }
    progress = Math.min(MAX_PROGRESS, progress + delta / DISTANCE);
    const speed = Math.min(1, delta * 175 / elapsed);
    paint.advance({ x, y }, point, spin, progress);
    moveVisual(point);
    sound.stir(speed, progress, delta);
    updateReadout();
    queuePaint();
  }
  function pointerPosition(event, box) {
    const x = (event.clientX - box.left) / box.width * 2 - 1;
    const y = (event.clientY - box.top) / box.height * 2 - 1;
    const scale = Math.max(1, Math.hypot(x, y) / 0.94);
    return { x: x / scale, y: y / scale };
  }
  function cancelHold() {
    const id = hold == null ? void 0 : hold.id;
    hold = void 0;
    if (Number.isInteger(id) && bowl.hasPointerCapture(id)) bowl.releasePointerCapture(id);
    cancelAnimationFrame(keyboardFrame);
    keyboardFrame = void 0;
    $("contact").hidden = true;
    bowl.classList.remove("stirring");
    sound.stop();
  }
  function finishHold() {
    const usedKeyboard = (hold == null ? void 0 : hold.id) === "keyboard";
    cancelHold();
    if (state !== "stirring") return;
    if (!challenge && progress < 0.014) {
      start(index);
      return;
    }
    state = "result";
    cancelAnimationFrame(paintFrame);
    paintFrame = void 0;
    paint.render();
    paint.imprint($("imprint"));
    const custom = challenge && challenge.result();
    if(custom && custom.more){
      state="ready";$("gesture").textContent="再找一抹，松手取样";$("texture").textContent=custom.message;$("cue").textContent="";
      sound.ready();return;
    }
    if (custom) challenge.stamp($("imprint"));
    const result = custom ? (custom.passed ? "good" : "early") : verdict();
    const passed = result === "good";
    const completed = !practice && passed && index === orders.length - 1;
    let [title, explanation] = custom ? [custom.title,custom.message] : passed ? order.best : result==="direction"?["还差一个手势",directionHint[tier-4]+"之后再松手。"]:order[result];
    bowl.classList.add("done");
    $("order-space").classList.add("is-result");
    const beforeStars=book.stars();
    let cupScore=0;
    if (passed) {
      const center = (order.minimum + order.maximum) / 2;
      const accuracy = custom ? custom.accuracy : Math.max(0, 1 - Math.abs(progress - center) / ((order.maximum - order.minimum) / 2));
      const score = Math.max(1, Math.round(70 + 30 * accuracy) - Math.min(30, misses * 5));
      cupScore=score;
      total += score;
      if(track!=="daily"){
        const cup=chapter*3+index, log=book.data.tracks[track].cups;
        log[cup]=Math.max(log[cup]||0,score);
      }else if(completed && dailyDate===book.day() && !book.data.dailyAwards.includes(dailyDate)){
        book.data.dailyAwards.push(dailyDate);
      }
      practiceWon=practice;
      batch.misses=0;
      if(!completed)batch.scores.push(score);
      const stamp = document.createElement("img");
      stamp.alt = title + "，" + score + "分";
      stamp.src = $("imprint").toDataURL("image/png");
      $("tray").children[index].appendChild(stamp);
      $("count").textContent = index + 1 + " / 3";
      if (completed) {
        batch.best[chapter]=Math.max(total,batch.best[chapter]);
        if(replaySet)book.data.tracks[track].best[chapter]=Math.max(book.data.tracks[track].best[chapter],total);
        batch.scores=[];
        if(track==="daily" && dailyDate===book.data.daily.date) book.data.daily.order="stir-first";
        if(track!=="daily")batch.chapter=Math.min(chapter+1,book.chapters.length-1);
        title=track==="daily"?"今日特调达成":book.chapters[chapter]+" · 已盖章";
        explanation=total+" / 300 分 · 本单最佳 "+batch.best[chapter]+" 分";
        const ranked=!practice && (track==="daily"?dailyDate===book.day():chapter===0);
        if(ranked){
          document.querySelector("#ranking h2").textContent=(track==="daily"?"今日特调":modes[mode].label+"入门")+"榜";
          window.CupRanks.finish(total,track==="daily"?4:modes[mode].board,track==="daily"?dailyDate:null);
        }
      } else explanation = score + " 分 · " + explanation;
    } else {
      misses++;
      batch.misses=misses;
      explanation += misses <= 6 ? " 本杯重试扣 5 分。" : "";
    }
    if(passed){
      const stars=book.stars(), earned=stars-beforeStars;
      const unlocked=book.rewards.filter(r=>r.at>beforeStars && r.at<=stars);
      lastPrize=unlocked[unlocked.length-1]||null;
      const upcoming=book.rewards.find(r=>r.at>stars);
      $("cup-reward").hidden=false;
      $("reward-title").textContent=earned?"★ +"+earned+" 糖星 · "+(track==="daily"?"今日首通":"首次通关"):track==="daily"?"本杯已完成":"已通关 · 最高 "+book.data.tracks[track].cups[chapter*3+index]+" 分";
      $("reward-detail").textContent=lastPrize?"新配料："+unlocked.map(r=>r.name).join("、"):upcoming?"再集 "+(upcoming.at-stars)+" 星解锁"+upcoming.name:"奖励配料已全部解锁";
      $("try-prize").hidden=!lastPrize;
      updateCounter();
    }
    book.save();
    $("result-name").textContent = title;
    $("result-tip").textContent = explanation;
    $("seal").textContent = passed ? "收杯" : "退杯";
    makeFlecks(passed);
    $("outcome").classList.toggle("failed", !passed);
    $("outcome").hidden = false;
    $("gesture").textContent = completed ? "三杯齐了" : passed ? "客人收货" : "客人退单";
    $("readout").hidden = true;
    $("note").hidden = true;
    $("meter").hidden = true;
    $("action").textContent = (practiceWon || (replaySet && completed))?"返回关卡地图":completed ? (track==="daily"?"再做今日特调":chapter===finalChapter?"接今日特调":"下一站 · "+book.chapters[chapter+1]) : passed ? "接下一杯" : (challenge ? "再试一次" : "再搅一次");
    $("action").hidden = false;
    lastOutcome = { passed, title, explanation, cupName: order.name, score: cupScore, completed, total, modeLabel: modes[mode].label, cupNum: index + 1 };
    orderPosterCache = null; orderPosterFile = null;
    if (window.CupSocial) {
      const token = ++orderPrepToken;
      const poster = buildOrderPoster();
      if (poster) {
        window.CupSocial.writePosterFile(poster).then(path => {
          if (token === orderPrepToken && path) orderPosterFile = path;
        }).catch(() => {});
      }
    }
    $("order-follow-tip").hidden = false;
    if (window.CupSocial) {
      window.CupSocial.capabilities().then(cap => {
        if (state !== "result") return;
        $("order-comment").hidden = !cap.canComment;
        $("order-comment-tip").hidden = !cap.canComment;
        $("order-share").hidden = !cap.canShare;
        $("order-social").hidden = !(cap.canComment || cap.canShare);
      });
    }
    next = completed ? 0 : passed ? index + 1 : index;
    bowl.tabIndex = -1;
    bowl.setAttribute("aria-disabled", "true");
    if (usedKeyboard) $("action").focus({ preventScroll: true });
    sound.stamp(result);
  }
  function makeFlecks(passed) {
    $("flecks").textContent = "";
    $("flecks").append(...Array.from({ length: passed ? 10 : 6 }, (_, i) => {
      const bit = document.createElement("i");
      const angle = i * 2.4 + 0.2;
      const radius = 63 + i % 3 * 11;
      bit.style.setProperty("--x", Math.cos(angle) * (radius + 12) + "px");
      bit.style.setProperty("--y", Math.sin(angle) * radius + "px");
      bit.style.setProperty("--rot", i * 37 + "deg");
      bit.style.setProperty("--size", 4 + i % 4 * 2 + "px");
      bit.style.setProperty("--splash", i % 2 ? order.color.first : order.color.second);
      return bit;
    }));
  }
  bowl.addEventListener("touchstart", () => sound.unlock(), { passive: true });
  bowl.addEventListener("pointerdown", (event) => {
    if (state !== "ready" || hold || event.button !== 0) return;
    const box = ink.getBoundingClientRect();
    const point = pointerPosition(event, box);
    event.preventDefault();
    if (!begin(event.pointerId, point, event.timeStamp)) return;
    bowl.setPointerCapture(event.pointerId);
    hold.box = box;
  });
  bowl.addEventListener("pointermove", (event) => {
    if ((hold == null ? void 0 : hold.id) !== event.pointerId) return;
    move(pointerPosition(event, hold.box), event.timeStamp);
  });
  bowl.addEventListener("pointerup", (event) => {
    if ((hold == null ? void 0 : hold.id) !== event.pointerId) return;
    move(pointerPosition(event, hold.box), event.timeStamp);
    sound.unlock();
    finishHold();
  });
  function interrupt(event) {
    if (hold && (!event || hold.id === event.pointerId)) start(index);
  }
  bowl.addEventListener("pointercancel", interrupt);
  bowl.addEventListener("lostpointercapture", interrupt);
  bowl.addEventListener("contextmenu", (event) => event.preventDefault());
  bowl.addEventListener("keydown", (event) => {
    shiftDown=event.shiftKey;
    const arrows = {ArrowLeft:[-.05,0],ArrowRight:[.05,0],ArrowUp:[0,-.05],ArrowDown:[0,.05]};
    if (challenge && hold && hold.id === "keyboard" && arrows[event.code]) {
      event.preventDefault();
      const step=arrows[event.code], x=hold.point.x+step[0], y=hold.point.y+step[1];
      if(Math.hypot(x,y)<=.94) move({x,y},performance.now());
      return;
    }
    if (event.code !== "Space") return;
    event.preventDefault();
    if (!batch || hold || state !== "ready" || event.repeat) return;
    if (challenge) { begin("keyboard", challenge.keyStart, performance.now()); return; }
    const orbit = (angle2) => ({ x: Math.cos(angle2) * 0.57, y: Math.sin(angle2) * 0.57 });
    let previous;
    let angle = 0;
    begin("keyboard", orbit(angle), performance.now());
    function tick(time) {
      const dt = previous === void 0 ? 0 : Math.min(45, time - previous);
      previous = time;
      angle += dt * 36e-4 * (shiftDown?-1:1);
      move(orbit(angle), time);
      keyboardFrame = requestAnimationFrame(tick);
    }
    keyboardFrame = requestAnimationFrame(tick);
  });
  document.addEventListener("keyup", (event) => {
    shiftDown=event.shiftKey;
    if (event.code === "Space" && (hold == null ? void 0 : hold.id) === "keyboard") {
      event.preventDefault();
      finishHold();
    }
  });
  window.addEventListener("blur", () => interrupt());
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) interrupt();
  });
  $("action").addEventListener("click", (event) => {
    sound.unlock();
    sound.reset();
    if(practiceWon || (replaySet && index===2 && next===0 && state==="result")){const key=track;openTrack(key);openAwards(key);return;}
    if(next===0 && index===2 && state==="result") openTrack(track!=="daily" && chapter===finalChapter ? "daily" : track);
    else start(next);
    if (event.detail === 0) bowl.focus({ preventScroll: true });
  });
  $("sound").addEventListener("click", () => {
    sound.setEnabled(!sound.enabled);
    drawSoundButton();
  });
  let orderPosterCache = null, orderPosterFile = null, orderPrepToken = 0;
  function showOrderStatus(msg) {
    $("rank-note").hidden = !msg;
    $("rank-note").textContent = msg;
  }
  function buildOrderPoster() {
    if (!lastOutcome || !window.CupSocial) return null;
    if (orderPosterCache) return orderPosterCache;
    const o = lastOutcome;
    orderPosterCache = window.CupSocial.renderPoster({
      badge: "甜品闯关 · " + o.modeLabel,
      title: o.title,
      subtitle: o.explanation,
      tag: o.passed ? (o.score ? o.score + " 分" : "收杯") : "翻车退杯",
      cupCanvas: $("imprint")
    });
    return orderPosterCache;
  }
  $("order-comment").addEventListener("click", () => {
    if (!lastOutcome || !window.CupSocial) return;
    const o = lastOutcome;
    const posterCanvas = buildOrderPoster();
    const text = o.passed
      ? (o.completed
        ? "我在《全搅进去》通关「" + o.title + "」拿到 " + o.total + " / 300 分🏆 有人能超过我的手感吗？"
        : "我在《全搅进去》搅出「" + o.title + "」打出 " + o.score + " 分✨ 快来测测你的盲搅手感！")
      : "救命😂 我在《全搅进去》把「" + o.cupName + "」搅成了「" + o.title + "」… 有人一把过的吗？";
    const snapshot = { mode: "order", track, chapter, cup: index, passed: o.passed, score: o.score };
    window.CupSocial.postComment({ text, posterCanvas, prewrittenFilePath: orderPosterFile, snapshot, onStatus: showOrderStatus, button: $("order-comment") }).then(res => {
      if (res && res.reason === "not_routed") {
        if (res.filePath) orderPosterFile = res.filePath;
        const cap = window.CupSocial.syncCapabilities();
        if (cap.canPostNote) $("order-note").hidden = false;
      }
    });
  });
  $("order-share").addEventListener("click", () => {
    if (!lastOutcome || !window.CupSocial) return;
    const posterCanvas = buildOrderPoster();
    window.CupSocial.shareCup({ posterCanvas, prewrittenFilePath: orderPosterFile, onStatus: showOrderStatus, button: $("order-share") });
  });
  $("order-note").addEventListener("click", () => {
    if (!lastOutcome || !window.CupSocial) return;
    const o = lastOutcome;
    const posterCanvas = buildOrderPoster();
    const text = o.passed
      ? "我在《全搅进去》搅出「" + o.title + "」打出 " + o.score + " 分✨ 不用下载，点开就能测手感！ #解压小游戏 #全搅进去"
      : "救命😂 我在《全搅进去》把「" + o.cupName + "」搅成了「" + o.title + "」… 有人盲搅一把过吗？ #解压小游戏 #全搅进去";
    window.CupSocial.postNote({ title: o.passed ? "搅出" + o.score + "分" + o.title : "笑死把奶油搅成" + o.title, text, posterCanvas, filePath: orderPosterFile, onStatus: showOrderStatus, button: $("order-note") });
  });
  function openTrack(selected, replayCup, wholeChapter=false) {
    replaySet=wholeChapter;
    practice=replayCup!==undefined && !wholeChapter;
    practiceWon=false;
    track=selected;
    batch=track==="daily"?book.dailyRun():book.data.tracks[track];
    dailyDate=book.day();
    book.data.last=track; chapter=track==="daily"?0:batch.chapter;
    if(practice || replaySet){
      chapter=Math.floor(replayCup/3);
      batch={chapter,scores:[],misses:0,best:batch.best.slice()};
    }
    index=undefined;
    start(practice?replayCup%3:batch.scores.length);
    total=batch.scores.reduce((a,b)=>a+b,0);
    Array.from($("tray").children).forEach((node,i)=>{
      node.textContent=batch.scores[i]===undefined?String(i+1):"✓";
      node.title=batch.scores[i]===undefined?"":batch.scores[i]+" 分";
    });
    $("count").textContent=batch.scores.length+" / 3";
  }
  const menu = $("menu");
  const openMenu = () => { if (typeof menu.showModal === "function") menu.showModal(); else menu.setAttribute("open", ""); };
  const closeMenu = () => { if (typeof menu.close === "function") menu.close(); else menu.removeAttribute("open"); };
  function updateCounter(){$("clear-count").textContent=book.cleared()+"/"+book.totalCups;}
  function cupName(key,ch,i){
    const r=book.recipe(orders,ch,i);
    if(key==="trace")return window.CupChallenges.traceName(ch,i);
    if(key==="hunt")return ch?r.name+"寻色":["草莓寻色","蜜橘寻色","葡萄寻色"][i];
    return r.name;
  }
  function ledger(){
    updateCounter();
    const stars=book.stars(),clears=book.cleared(),prizes=book.rewards.filter(r=>r.at<=stars);
    const chaptersDone=book.tracks.reduce((n,k)=>n+book.data.tracks[k].best.filter(Boolean).length,0);
    $("awards-summary").textContent="已通关 "+clears+" / "+book.totalCups+" 杯　·　"+chaptersDone+" 枚印章　·　"+stars+" 糖星";
    const countFor=k=>book.data.tracks[k].cups.filter(v=>v!==null).length;
    const badges=[
      ["开张大吉",clears>0,"首次收杯"],
      ["拉花学徒",countFor("trace")>=3,"完成 3 杯拉花"],
      ["寻色高手",countFor("hunt")>=6,"完成 6 杯寻色"],
      ["三店主理人",book.tracks.every(k=>book.data.tracks[k].best[0]>0),"三种玩法各完成第一章"],
      ["每日主厨",book.data.dailyAwards.length>0,"完成一次今日特调"],
      ["全菜单大师",clears===book.totalCups,"集齐全部 72 杯"]
    ];
    $("badge-count").textContent=badges.filter(b=>b[1]).length+" / "+badges.length;
    $("badge-list").textContent="";
    for(const [title,earned,rule] of badges){
      const row=document.createElement("div");row.className=earned?"earned":"";
      const name=document.createElement("b"),detail=document.createElement("small");
      name.textContent=(earned?"✓ ":"")+title;detail.textContent=earned?"已获得":rule;
      row.append(name,detail);$("badge-list").appendChild(row);
    }
    const pending=book.rewards[prizes.length];
    $("next-prize").textContent=pending?"下一份奖励 · "+pending.name:"已集齐全部奖励配料";
    $("prize-progress").textContent=pending?"还差 "+(pending.at-stars)+" 星。每杯首通 +1，今日特调首次做完 +3。":"九款配料都可以在甜品自助吧使用。";
    $("prize-meter").max=pending?pending.at:book.rewards[book.rewards.length-1].at;
    $("prize-meter").value=stars;
    $("prize-list").textContent="";
    for(const r of book.rewards){
      const btn=document.createElement("button");btn.type="button";btn.disabled=r.at>stars;
      btn.textContent=r.name+(btn.disabled?" · "+r.at+" 星解锁":" · 去试用");
      btn.onclick=()=>viewStudio(true,r);$("prize-list").appendChild(btn);
    }
    const list=$("level-map"),run=book.data.tracks[mapTrack];list.textContent="";
    for(const filter of $("map-filters").children)filter.setAttribute("aria-pressed",String(filter.value===mapTrack));
    book.chapters.forEach((label,ch)=>{
      const section=document.createElement("details"),head=document.createElement("summary");
      const open=ch===0 || run.best[ch-1]>0;
      const records=run.cups.slice(ch*3,ch*3+3),count=records.filter(v=>v!==null).length;
      head.textContent=(run.best[ch]?"✓ ":"")+label+"　"+count+"/3"+(open?"":" · 未解锁");
      section.open=ch===run.chapter;section.appendChild(head);
      if(!open){const hint=document.createElement("small");hint.textContent="通关「"+book.chapters[ch-1]+"」三杯后解锁";section.appendChild(hint);}
      records.forEach((score,i)=>{
        const btn=document.createElement("button");btn.type="button";
        const available=open && ch*3+i===book.nextSlot(mapTrack);
        btn.disabled=score===null&&!available;
        btn.textContent=cupName(mapTrack,ch,i)+"　"+(score!==null?"✓ 已通关"+(score?" · "+score+" 分":""):available?"可挑战 →":"未解锁");
        btn.onclick=()=>{
          if(available && run.chapter!==ch){
            run.chapter=ch;run.scores=records.slice(0,i);run.misses=0;
          }
          viewStudio(false);openTrack(mapTrack,score!==null?ch*3+i:undefined);book.save();bowl.focus({preventScroll:true});
        };
        section.appendChild(btn);
      });
      if(run.best[ch]>0){
        const again=document.createElement("button");again.type="button";
        again.textContent="重玩本章三杯 · 最佳 "+run.best[ch]+" 分";
        again.onclick=()=>{viewStudio(false);openTrack(mapTrack,ch*3,true);book.save();bowl.focus({preventScroll:true});};
        section.appendChild(again);
      }
      list.appendChild(section);
    });
  }
  function openAwards(key){
    if(!batch)return;
    if(hold)start(index);studio.leave();mapTrack=book.tracks.includes(key)?key:"classic";
    $("free-space").hidden=$("order-space").hidden=true;$("awards-space").hidden=false;
    $("studio-tab").setAttribute("aria-pressed","false");$("orders-tab").setAttribute("aria-pressed","false");
    $("awards-tab").setAttribute("aria-pressed","true");ledger();
  }
  for(const key of book.tracks){
    const b=document.createElement("button");b.type="button";b.value=key;b.textContent=modes[key].label;
    b.onclick=()=>{mapTrack=key;ledger();};$("map-filters").appendChild(b);
  }
  $("awards-tab").onclick=()=>openAwards(track);
  $("menu-map").onclick=()=>{closeMenu();openAwards(track);};
  $("try-prize").onclick=()=>{if(lastPrize)viewStudio(true,lastPrize);};
  $("mode-open").addEventListener("click", () => {
    if(!batch)return;
    if (hold) start(index);
    for(const option of menu.querySelectorAll("[data-mode]")) {
      const key=option.dataset.mode;
      option.setAttribute("aria-current",String(key===track));
      const r=key==="daily"?book.dailyRun():book.data.tracks[key];
      option.querySelector("small").textContent=key==="daily"?book.day()+" · 三种玩法各一杯"+(r.best[0]?" · 最佳 "+r.best[0]+"分":""):book.chapters[r.chapter]+" · 第 "+(r.scores.length+1)+" 杯";
    }
    $("more-play").open=false;
    openMenu();
  });
  $("menu-close").addEventListener("click", closeMenu);
  for (const option of menu.querySelectorAll("[data-mode]")) {
    option.addEventListener("click", () => {
      closeMenu();
      if(practice || replaySet || option.dataset.mode!==track || (track==="daily" && dailyDate!==book.day())) {openTrack(option.dataset.mode);book.save();}
      bowl.focus({preventScroll:true});
    });
  }
  const studio=window.createStudio(book,sound);
  function viewStudio(free,prize){
    if(!batch)return;
    if(hold) start(index);
    $("awards-space").hidden=true;$("awards-tab").setAttribute("aria-pressed","false");
    $("order-space").hidden=free;$("free-space").hidden=!free;
    $("orders-tab").setAttribute("aria-pressed",String(!free));
    $("studio-tab").setAttribute("aria-pressed",String(free));
    if(window.refreshCupViewport)window.refreshCupViewport();
    if(free)studio.open(prize);else {studio.leave();queuePaint();}
  }
  $("studio-tab").onclick=()=>viewStudio(true);
  $("orders-tab").onclick=()=>viewStudio(false);
  window.addEventListener("resize", queuePaint);
  window.addEventListener("cup-layout", queuePaint);
  drawSoundButton();
  const musicReady=window.installCupMusic(sound,book);
  book.init().then(()=>{
    musicReady();updateCounter();
    openTrack("classic");
    paint.loadMaterial($("surface"), queuePaint);
  });
})();
