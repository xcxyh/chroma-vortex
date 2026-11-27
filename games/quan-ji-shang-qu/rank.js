(() => {
  const byId = (id) => document.getElementById(id);
  const open = byId("rank-open"), note = byId("rank-note"), panel = byId("ranking");
  let board = 1, orderDate=null;
  const period = "day";
  let run = 0, score = null, blocked = false, busy = false, submitted = false, uncertain = false;
  let sdk, version = 0, cache, cooldown = 0;
  function readVersion(options) {
    const value = options && options.miniToolEnv && options.miniToolEnv.buildVersion;
    return /^[1-9]\d{6,}$/.test(String(value)) && Number.isSafeInteger(Number(value)) ? Math.floor(Number(value) / 1e3) : 0;
  }
  function eligible() {
    return !blocked && version >= 9510 && sdk && ["submitScore", "getRankList", "getMyRank"].every((key) => typeof sdk[key] === "function");
  }
  function reset() {
    run++;
    busy = submitted = uncertain = false;
    score = null;
    open.hidden = panel.hidden = note.hidden = true;
    byId("leaders").textContent = "";
  }
  function finish(points, selectedBoard = 1, date=null) {
    orderDate=date;
    if (board !== selectedBoard) cache = null;
    board = selectedBoard;
    score = points;
    const id = run;
    const xhs = window.xhs;
    sdk = xhs && xhs.miniTool;
    version = readVersion(xhs && xhs.launchOptions);
    function reveal() {
      if (id === run && eligible()) {
        open.hidden = false;
        open.disabled = false;
        open.textContent = "用本轮成绩上榜 · 看今日排名";
      }
    }
    if (!version && sdk && typeof sdk.getLaunchOptions === "function") {
      Promise.resolve().then(() => sdk.getLaunchOptions()).then((options) => {
        if (id === run) {
          version = readVersion(options);
          reveal();
        }
      }).catch(() => {
      });
    } else reveal();
  }
  function message(value) {
    note.hidden = !value;
    note.textContent = value;
  }
  function show(data) {
    panel.hidden = false;
    const mine = data.mine;
    const states = { EXACT: "我的排名 · 第 " + mine.rank + " 名（" + mine.score + " 分）", OVER_LIMIT: "我的排名 · 500 名以外", NO_SCORE: "今天还没有上榜成绩", NOT_PARTICIPATING: "尚未参与今日榜" };
    byId("mine").textContent = states[mine.status] || "个人排名暂不可用";
    const list = byId("leaders");
    list.textContent = "";
    for (const row of data.rows) {
      const item = document.createElement("li"), name = document.createElement("span"), points = document.createElement("b");
      name.textContent = row.rank + "　" + (row.nickname || "小红薯");
      points.textContent = row.score + " 分";
      item.append(name, points);
      list.appendChild(item);
    }
    if (!data.rows.length) list.textContent = "今日榜暂时还没有成绩";
    panel.scrollIntoView({ block: "nearest" });
  }
  async function rankings(id) {
    if (cache && Date.now() < cache.until) return cache;
    for (let attempt = 0; ; attempt++) {
      if (id !== run) return null;
      try {
        const [list, mine] = await Promise.all([sdk.getRankList({ board, period }), sdk.getMyRank({ board, period })]);
        if (!Array.isArray(list.data) || !mine || typeof mine.status !== "string") throw Error("响应异常");
        const result = { rows: list.data, mine, until: Date.now() + 45e3 };
        if (id === run) cache = result;
        return result;
      } catch (error) {
        if (Number(error.errCode) !== 2002 || attempt >= 2) throw error;
        await new Promise((resolve) => setTimeout(resolve, 500 * (attempt + 1)));
      }
    }
  }
  open.addEventListener("click", async () => {
    if(orderDate && orderDate!==window.ShopRanks.day()){open.hidden=panel.hidden=true;message("这张小票属于昨天，请用今天的新单上榜。");return;}
    if (busy || !eligible() || !Number.isInteger(score)) return;
    if (cooldown > Date.now()) {
      message("榜单正忙，稍后再看。");
      return;
    }
    const id = run;
    busy = open.disabled = true;
    let writing = false;
    try {
      if (!submitted && !uncertain) {
        writing = true;
        message("正在提交本轮成绩…");
        const reply = await sdk.submitScore({ board, score });
        if (id !== run) return;
        if (!reply || !Number.isFinite(reply.score)) throw Error("未收到成绩回执");
        submitted = true;
        cache = null;
        writing = false;
      }
      message("正在读取今日榜…");
      const data = await rankings(id);
      if (id !== run || !data) return;
      message(uncertain ? "本轮提交结果待确认，以下为平台当前排名。" : "");
      open.textContent = "查看今日排名";
      show(data);
    } catch (error) {
      if (id !== run) return;
      const code = Number(error.errCode);
      if ([1005, 1006, 10003].includes(code)) {
        blocked = true;
        open.hidden = panel.hidden = true;
        message("此小工具暂未开通榜单，本轮成绩仍然有效。");
      } else if (writing && (!code || code === 2004)) {
        uncertain = true;
        cache = null;
        open.textContent = "查询当前排名";
        message("提交结果待确认，可查询排名。");
      } else {
        if (code === 2009 || code === 2008) cooldown = Date.now() + 5e3;
        message(code === 2002 ? "榜单正在生成，稍后再看。" : writing ? "本轮成绩未确认，请稍后再试。" : "暂时读不到排名，请稍后再看。");
        if (submitted || uncertain) open.textContent = "重新查看排名";
      }
    } finally {
      if (id === run) {
        busy = false;
        open.disabled = false;
      }
    }
  });
  byId("rank-close").addEventListener("click", () => {
    panel.hidden = true;
    open.focus();
  });
  window.ShopRanks = { reset, finish, day: () => new Date(Date.now()+8*3600000).toISOString().slice(0,10) };
})();
