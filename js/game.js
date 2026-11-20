(() => {
  "use strict";
  const game = window.MixGame;
  const { levels, pigment, audio, collection } = game;
  const data = game.storage.load();
  const $ = (id) => document.getElementById(id);
  const paths = {
    brush:
      '<path d="m14.5 14.5 6-9.5a1.5 1.5 0 0 0-2-2L9 10.5l5.5 4Zm-2.2.6c1.3 3.8-1.6 6.6-8.8 5.2 2.8-1 1.9-4.1 3.4-5.8a3.2 3.2 0 0 1 5.4.6Z"/>',
    game: '<path d="M7 7h10c2 0 3 1 3.7 4l1 5.2c.5 2.8-1.7 4.2-3.7 2.5L15 16H9l-3 2.7c-2 1.7-4.2.3-3.7-2.5l1-5.2C4 8 5 7 7 7Z"/><path d="M6 11.7h5m-2.5-2.5v5"/><circle cx="16" cy="11" r=".8"/><circle cx="18.4" cy="13.3" r=".8"/>',
    grid: '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>',
    cup: '<path d="M7 3h10v6a5 5 0 0 1-10 0Zm10 2h4v2c0 3-2 5-5 5M7 5H3v2c0 3 2 5 5 5m4 2v5m-5 2h10m-8-2h6"/>',
    arrow: '<path d="M4 12h15m-6-6 6 6-6 6"/>',
    back: '<path d="M20 12H5m6 6-6-6 6-6"/>',
    arrowUp: '<path d="M5 18 18 5M6 5h12v12"/>',
    close: '<path d="m5 5 14 14M19 5 5 19"/>',
    user: '<circle cx="12" cy="8" r="3.4"/><path d="M5.5 20v-2a6.5 6.5 0 0 1 13 0v2Z"/>',
    sound: '<path d="m11 4-5 5H3v6h3l5 5V4Zm4 4a6 6 0 0 1 0 8m3-11a10 10 0 0 1 0 14"/>',
    mute: '<path d="m11 4-5 5H3v6h3l5 5V4Zm5 5 5 6m0-6-5 6"/>',
    play: '<path fill="currentColor" stroke="none" d="M5 3.8c0-.8.8-1.3 1.5-.9l14 8.3a.9.9 0 0 1 0 1.6l-14 8.3c-.7.4-1.5-.1-1.5-.9Z"/>',
    book: '<path d="M12 6.5C9 4.5 6 4 2.5 5v13c3.5-1 6.5-.5 9.5 1.5 3-2 6-2.5 9.5-1.5V5c-3.5-1-6.5-.5-9.5 1.5Zm0 0v13"/>',
  };
  function icon(name) {
    return (
      '<svg class="icon" aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">' +
      paths[name] +
      "</svg>"
    );
  }
  document.querySelectorAll("[data-icon]").forEach((el) => {
    el.outerHTML = icon(el.dataset.icon);
  });
  const modeNames = { tutorial: "入门教学", guess: "猜色挑战", match: "目标调色" };
  const freeStudio = {
    mode: "free",
    title: "自由搅拌",
    palette: Object.keys(pigment.TUBES),
  };
  const difficulty = ["", "入门", "进阶", "挑战"];
  const accent = { lime: "#ceff45", pink: "#ff6ac3", blue: "#50c9ff", orange: "#ffad40" };
  const pad = (number) => String(number).padStart(2, "0");
  const brushSize = $("brush-size");
  if (data.brushDiameter !== undefined) brushSize.value = data.brushDiameter;
  const well = new game.PaintWell($("well"), brushSize.valueAsNumber);
  const wrap = $("well-wrap");
  let view = "home",
    filter = "all",
    rankFilter = "all",
    cardFilter = "all",
    picking = false,
    round,
    surface,
    drawing;
  let frameId = 0,
    pointer = null,
    lastBuzz = 0,
    quietTimer;
  function el(tag, cls, text) {
    const node = document.createElement(tag);
    if (cls) node.className = cls;
    if (text !== undefined) node.textContent = text;
    return node;
  }
  function button(label, cls, handler) {
    const b = el("button", cls, label);
    b.type = "button";
    b.addEventListener("click", handler);
    return b;
  }
  function persist() {
    $("save-status").textContent = game.storage.save(data) ? "本机存档已就绪" : "当前会话存档";
  }
  function release() {
    if (pointer && wrap.hasPointerCapture(pointer.id)) wrap.releasePointerCapture(pointer.id);
    clearTimeout(quietTimer);
    pointer = null;
    $("finger").style.display = "none";
    audio.stopStir();
  }
  function navigate(next, preferredColor) {
    if (view === "drawing") drawing.endStroke();
    release();
    setPicking(false);
    cancelAnimationFrame(frameId);
    frameId = 0;
    view = next;
    document.querySelectorAll(".view").forEach((node) => (node.hidden = node.id !== next));
    document.querySelectorAll(".nav-link").forEach((node) => {
      const current = node.dataset.view === next;
      node.classList.toggle("active", current);
      if (current) node.setAttribute("aria-current", "page");
      else node.removeAttribute("aria-current");
    });
    if (view === "home") {
      $("enter-level").textContent = data.cleared.length && data.cleared.length < levels.length
        ? "继续闯关" : "开始闯关";
      renderCards($("featured"), levels.slice(0, 4));
    }
    if (view === "archive") renderArchive();
    if (view === "ranking") renderRanking();
    if (view === "gallery") renderCollection();
    if (view === "drawing") {
      drawing ??= game.createDrawing();
      drawing.open(data.cards, preferredColor);
    }
    window.scrollTo(0, 0);
  }
  document
    .querySelectorAll("[data-view]")
    .forEach((node) => node.addEventListener("click", () => navigate(node.dataset.view)));

  function renderCards(parent, list) {
    parent.replaceChildren();
    for (const level of list) {
      const card = button("", "level-card", () => start(level));
      card.style.setProperty("--art", 'url("../assets/' + level.art + '.webp")');
      card.style.setProperty("--accent", accent[level.art]);
      card.style.setProperty("--hue", level.hue + "deg");
      const ticks = [1, 2, 3]
        .map((n) => '<i class="' + (n <= level.difficulty ? "filled" : "") + '"></i>')
        .join("");
      const done = data.cleared.includes(level.id);
      card.innerHTML =
        '<span class="card-art"><span class="card-id">EXP. ' +
        pad(level.id) +
        '</span></span><span class="card-info"><span><strong>' +
        level.title +
        '</strong><span class="card-meta">' +
        modeNames[level.mode] +
        '<b>/</b><span class="difficulty">' +
        ticks +
        "</span>" +
        (done ? "已完成" : difficulty[level.difficulty]) +
        '</span></span><span class="card-go">' +
        icon("arrowUp") +
        "</span></span>";
      parent.append(card);
    }
  }
  function filters(parent, options, current, handle) {
    parent.replaceChildren(
      ...options.map(([id, label]) => {
        const node = button(label, id === current ? "selected" : "", () => handle(id));
        node.setAttribute("aria-pressed", String(id === current));
        return node;
      }),
    );
  }
  function renderArchive() {
    $("cleared").textContent = data.cleared.length + " / " + levels.length + " 已完成";
    filters($("filters"), [["all", "全部 " + levels.length], ...Object.entries(modeNames)], filter, (id) => {
      filter = id;
      renderArchive();
    });
    renderCards(
      $("archive-cards"),
      levels.filter((lv) => filter === "all" || lv.mode === filter),
    );
  }
  function empty(title, message) {
    const box = el("div", "empty");
    box.innerHTML = icon("cup");
    box.append(el("h3", "", title), el("p", "", message), button("开始实验", "primary", resume));
    return box;
  }
  function renderRanking() {
    filters(
      $("rank-filters"),
      [
        ["all", "全部成绩"],
        ["today", "今日成绩"],
      ],
      rankFilter,
      (id) => {
        rankFilter = id;
        renderRanking();
      },
    );
    const now = new Date().toDateString();
    const records = data.records
      .filter((r) => rankFilter === "all" || new Date(r.date).toDateString() === now)
      .sort((a, b) => b.score - a.score || a.ms - b.ms || a.date - b.date);
    const list = $("rank-list");
    if (!records.length) {
      list.replaceChildren(empty("等待第一份成绩", "完成一场混色实验，你的分数就会出现在这里。"));
      return;
    }
    const table = el("table", "rank-table");
    const head = table.createTHead().insertRow();
    ["名次", "玩家", "实验", "得分", "用时"].forEach((t) => head.append(el("th", "", t)));
    const body = table.createTBody();
    records.forEach((record, index) => {
      const row = body.insertRow();
      [
        pad(index + 1),
        record.player,
        levels[record.id - 1].title,
        record.score,
        (record.ms / 1000).toFixed(1) + " s",
      ].forEach((v, i) => {
        const cell = row.insertCell();
        cell.append(el(i === 3 ? "strong" : "span", "", v));
      });
    });
    list.replaceChildren(table);
  }
  function chip(color) {
    const dot = el("span", "swatch");
    dot.style.setProperty("--color", color === "rainbow" ? "conic-gradient(red,yellow,blue,red)" : color);
    return dot;
  }
  function rarityBadge(tierIndex) {
    const tier = collection.tiers[tierIndex];
    const badge = el("span", "rarity-badge", tier.name);
    badge.style.setProperty("--tier-ink", tier.ink);
    return badge;
  }
  function sourceLabel(source) {
    const level = levels.find((l) => l.id === source.level);
    return (level ? level.title : "自由搅拌") + (source.kind === "reward" ? " · 通关" : " · 盘中取色");
  }
  function presentColor(body, hex) {
    const { tier, share } = collection.rate(hex);
    const swatch = el("div", "detail-swatch");
    swatch.style.backgroundColor = hex;
    swatch.append(el("code", "", hex));
    const info = el("div", "card-facts");
    const percent = (share * 100).toLocaleString("zh-CN", { maximumFractionDigits: 3 });
    info.append(rarityBadge(tier), el("span", "", "参考配方近色占比 " + percent + "%"));
    body.append(swatch, info);
  }
  function cardDetail(hex, title) {
    const card = data.cards[hex];
    const body = modal(title || card.name, "COLOR SPECIMEN");
    presentColor(body, hex);
    if (title) body.append(el("h3", "", card.name));
    body.append(el("p", "card-sources", card.sources.map(sourceLabel).join(" / ")));
    body.append(
      button("用这个颜色作画", "primary", () => {
        $("modal").close();
        navigate("drawing", hex);
      }),
    );
    body.append(button(view === "play" ? "继续搅拌" : "回到收藏板", "secondary", () => $("modal").close()));
  }
  function renderCollection() {
    const entries = Object.entries(data.cards).map(([hex, card]) => ({ hex, card, ...collection.rate(hex) }));
    entries.sort(
      (a, b) =>
        b.tier - a.tier ||
        a.share - b.share ||
        (b.card.date || 0) - (a.card.date || 0) ||
        a.hex.localeCompare(b.hex),
    );
    $("card-count").textContent = entries.length + " 张藏色";
    $("back-to-paint").hidden = !round;
    const choices = [["all", "全部"], ...collection.tiers.map((t, i) => [String(i), t.name])];
    filters($("card-filters"), choices, cardFilter, (id) => {
      cardFilter = id;
      renderCollection();
    });
    const list = $("collection");
    list.replaceChildren();
    for (const { hex, card, tier } of entries) {
      if (cardFilter !== "all" && cardFilter !== String(tier)) continue;
      const tile = button("", "specimen-card", () => cardDetail(hex));
      const block = el("span", "specimen-color");
      block.style.backgroundColor = hex;
      block.append(el("code", "", hex));
      const line = el("span", "specimen-line");
      line.append(el("strong", "", card.name), rarityBadge(tier));
      tile.append(block, line, el("small", "specimen-origin", sourceLabel(card.sources[0])));
      list.append(tile);
    }
    if (!list.children.length) {
      const box = el("div", "empty board-empty");
      box.innerHTML = icon("book");
      if (!entries.length) {
        box.append(
          el("h3", "", "收藏你的第一种颜色"),
          el("p", "", "在调色盘点「取色收藏」，再轻点喜欢的那一抹颜色。"),
          button(round ? "回到调色盘" : "去自由搅拌", "primary", returnToPaint),
        );
      } else {
        box.append(
          el("h3", "", "还没有这个等级的色卡"),
          button("查看全部藏色", "text-btn", () => {
            cardFilter = "all";
            renderCollection();
          }),
        );
      }
      list.append(box);
    }
  }
  function returnToPaint() {
    if (!round) return start(freeStudio);
    navigate("play");
    redraw();
  }
  $("back-to-paint").onclick = returnToPaint;
  $("rarity-guide").onclick = () => {
    const body = modal("颜色怎么定级？", "RARITY GUIDE");
    body.append(
      el(
        "p",
        "card-sources",
        "参考配方等概率选择 1 至 " +
          collection.maxDrops +
          " 滴，每滴从 " +
          Object.keys(pigment.TUBES).length +
          " 种颜料中等概率选取。与藏色色差 ΔE ≤ " +
          collection.tolerance +
          " 的配方计作近色，近色占比越低，颜色越稀有。",
      ),
    );
    const guide = el("div", "tier-guide");
    collection.tiers.forEach((t, i) => {
      const row = el("div", "");
      const lower = t.minimum * 100 + "%";
      const upper = i ? collection.tiers[i - 1].minimum * 100 + "%" : "";
      const range =
        i === 0 ? "占比 ≥ " + lower : t.minimum ? lower + " ≤ 占比 < " + upper : "占比 < " + upper;
      row.append(rarityBadge(i), el("span", "", range));
      guide.append(row);
    });
    body.append(guide);
  };
  function setPicking(on) {
    picking = on;
    wrap.classList.toggle("is-picking", on);
    $("pick-color").setAttribute("aria-pressed", String(on));
    $("pick-color").textContent = on ? "取消取色" : "取色收藏";
    $("pick-note").hidden = !on;
    $("pick-note").textContent = on ? "轻点盘中想收藏的颜色。" : "";
  }
  $("pick-color").onclick = () => {
    release();
    setPicking(!picking);
    if (picking) wrap.scrollIntoView({ block: "nearest" });
  };
  function pickFromWell(p) {
    const hex = well.sampleHex(p.x, p.y);
    if (!hex) {
      $("pick-note").textContent = "这里是空盘，轻点有颜料的位置。";
      return;
    }
    setPicking(false);
    if (data.cards[hex]) return cardDetail(hex, "已收藏这个色号");
    const body = modal("收藏这抹颜色", "PIGMENT SAMPLE");
    presentColor(body, hex);
    const form = el("form");
    const label = el("label", "card-name-label", "色卡名称");
    label.htmlFor = "sample-name";
    const input = el("input");
    input.id = "sample-name";
    input.maxLength = 18;
    input.value = collection.suggestName(hex);
    const paintNow = el("button", "secondary", "收藏并作画");
    paintNow.type = "submit";
    form.append(label, input, el("button", "primary", "收藏色卡"), paintNow);
    form.onsubmit = (e) => {
      e.preventDefault();
      const name = input.value.trim() || collection.suggestName(hex);
      collection.collect(data.cards, hex, name, { kind: "sample", level: round.level.id || 0 }, Date.now());
      persist();
      $("modal").close();
      if (e.submitter === paintNow) {
        navigate("drawing", hex);
        return;
      }
      $("pick-note").hidden = false;
      $("pick-note").textContent =
        "已收藏「" + name + "」 · " + collection.tiers[collection.rate(hex).tier].name;
    };
    body.append(form);
  }
  function modal(title, label) {
    const body = $("modal-content");
    body.replaceChildren(el("span", "eyebrow", label), el("h2", "modal-title", title));
    $("modal").setAttribute("aria-label", title);
    $("modal").showModal();
    return body;
  }
  $("help").onclick = () => {
    const body = modal("玩法说明", "FIELD GUIDE");
    const steps = el("ol", "help-steps");
    [
      "自由搅拌从空盘开始，轻点颜色添加颜料，再按住两种颜色的交界拖出色带。随时可以添色、停手或接着搅。",
      "想挑战时，从关卡档案选一盘。猜色可主动揭晓答案，对色可随时提交配色。",
      "猜对得 100 分并通关，猜错得 60 分，可以重试。对色关按颜色相似度计分，75 分过关；同分按用时排名。",
    ].forEach((t) => steps.append(el("li", "", t)));
    body.append(
      steps,
      button("自由搅拌", "primary", () => {
        $("modal").close();
        start(freeStudio);
      }),
    );
  };
  $("close-modal").onclick = () => $("modal").close();
  $("modal").addEventListener("click", (e) => {
    if (e.target === $("modal")) {
      const r = $("modal").getBoundingClientRect();
      if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom)
        $("modal").close();
    }
  });
  $("profile").onclick = () => {
    const body = modal("玩家昵称", "PLAYER PROFILE");
    const form = el("form");
    const input = el("input");
    input.value = data.player;
    input.maxLength = 12;
    input.required = true;
    input.setAttribute("aria-label", "玩家昵称");
    const submit = el("button", "primary", "保存昵称");
    submit.type = "submit";
    form.append(input, submit);
    body.append(form);
    form.onsubmit = (e) => {
      e.preventDefault();
      if (!input.value.trim()) {
        input.focus();
        return;
      }
      data.player = input.value.trim();
      $("player-name").textContent = data.player;
      persist();
      $("modal").close();
    };
    input.focus();
    input.select();
  };
  function soundState() {
    audio.setMuted(data.muted);
    const node = $("sound");
    node.innerHTML = icon(data.muted ? "mute" : "sound");
    node.title = data.muted ? "开启音效" : "关闭音效";
    node.setAttribute("aria-label", node.title);
    node.setAttribute("aria-pressed", String(!data.muted));
  }
  $("sound").onclick = () => {
    data.muted = !data.muted;
    soundState();
    persist();
    if (!data.muted) {
      audio.unlock();
      audio.dip();
    }
  };
  function resume() {
    const saved = levels[data.currentLevel - 1];
    if (saved && !data.cleared.includes(saved.id)) return start(saved);
    start(levels.find((level) => !data.cleared.includes(level.id)) || levels[0]);
  }
  $("start").onclick = () => start(freeStudio);
  $("enter-level").onclick = resume;
  $("mix-for-art").onclick = () => {
    if (round?.level.mode === "free") returnToPaint();
    else start(freeStudio);
  };

  function setBrushSize() {
    well.brushDiameter = brushSize.valueAsNumber;
    const label = "盘径的 " + well.brushDiameter + "%";
    $("brush-value").value = label;
    brushSize.setAttribute("aria-valuetext", label);
    if (pointer?.last) finger(pointer.last, pointer.pressure);
  }
  setBrushSize();
  brushSize.addEventListener("input", setBrushSize);
  brushSize.addEventListener("change", () => {
    data.brushDiameter = well.brushDiameter;
    persist();
  });

  function redraw() {
    if (view !== "play") return;
    if (well.dirty) {
      const uniformity = well.measureUniformity();
      $("uniformity").textContent = uniformity === null ? "—" : uniformity + "%";
    }
    $("pick-color").disabled = !well.mix.mass;
    well.render();
    if (surface === undefined) surface = game.createSurface?.(well, $("surface")) || null;
    surface?.draw();
  }
  function queueDraw() {
    if (frameId) return;
    frameId = requestAnimationFrame(() => {
      frameId = 0;
      redraw();
    });
  }
  function start(level) {
    audio.unlock();
    navigate("play");
    well.clear();
    round = {
      level,
      submitted: false,
      red: false,
      choice: null,
      started: performance.now(),
      hiddenAt: null,
      drops: 0,
      score: 0,
    };
    if (level.id) {
      data.currentLevel = level.id;
      persist();
    }
    if (level.blobs) well.seed(level.blobs);
    $("studio-id").textContent = level.id
      ? "EXP. " + pad(level.id) + " / " + pad(levels.length)
      : "OPEN STUDIO";
    $("play-mode").textContent = level.id
      ? modeNames[level.mode] + " / EXPERIMENT " + pad(level.id)
      : "PIGMENT PLAYGROUND";
    $("level-name").textContent = level.title;
    $("result").replaceChildren();
    updateControls();
    redraw();
  }
  function addDrop(name) {
    if (round.submitted) return;
    const level = round.level;
    if (level.mode === "tutorial" && round.red) return;
    if (level.mode === "match" && round.drops >= level.drops) return;
    const angle = round.drops * 2.4 - 1.2;
    well.drop(
      name,
      0.5 + 0.19 * Math.cos(angle),
      0.5 + 0.19 * Math.sin(angle),
      level.mode === "tutorial" ? level.blobs[0].mass : 1,
    );
    round.drops++;
    if (level.mode === "tutorial") round.red = true;
    audio.dip();
    navigator.vibrate?.(12);
    updateControls();
    queueDraw();
  }
  function updateControls() {
    const { level } = round;
    const controls = $("controls");
    controls.replaceChildren();
    if (round.submitted) return;
    let prompt;
    if (level.mode === "tutorial") {
      prompt = round.red
        ? "再搅一笔，松手即可完成教学。"
        : "沿黄蓝交界来回搅，再点「加入红色」。";
      controls.append(
        round.red
          ? button("完成本关", "primary", () => finish(100, true))
          : button("＋ 加入红色", "primary", () => addDrop("red")),
      );
    } else if (level.mode === "guess") {
      prompt = round.choice ? "随手搅一搅，想看结果时再揭晓。" : level.prompt;
      const choices = el("div", "choices");
      level.options.forEach((option) => {
        const node = button("", "option" + (round.choice === option.id ? " selected" : ""), () => {
          round.choice = option.id;
          updateControls();
        });
        node.append(chip(option.hex), el("span", "", option.label));
        choices.append(node);
      });
      controls.append(choices);
      if (round.choice) {
        const actions = el("div", "action-row");
        actions.append(
          button("揭晓答案", "primary", () => {
            const correct = round.choice === level.correct;
            finish(correct ? 100 : 60, correct);
          }),
        );
        controls.append(actions);
      }
    } else {
      if (level.mode === "free") {
        prompt = round.drops
          ? "按住颜料慢慢拖，轻点下方颜色可以再添一滴。"
          : "先点下方颜色，加一滴颜料到空盘里。";
      } else {
        prompt = "轻点颜料加入盘中，想比较颜色时再提交。";
        const target = el("div", "target");
        target.append(
          chip(level.targetHex),
          el("span", "", "目标 · " + level.targetName + "　剩 " + (level.drops - round.drops) + " 滴"),
        );
        controls.append(target);
      }
      const choices = el("div", "choices");
      level.palette.forEach((name) => {
        const node = button("", "tube", () => addDrop(name));
        node.append(chip(pigment.rgbToHex(pigment.tubeRgb(name))), el("span", "", pigment.TUBES[name].label));
        node.disabled = level.mode === "match" && round.drops >= level.drops;
        choices.append(node);
      });
      const actions = el("div", "action-row");
      if (level.mode === "match") {
        const submit = button("提交对色", "primary", () => {
          const score = pigment.scoreAgainstHex(well.mix.rgb, level.targetHex).score;
          finish(score, score >= 75);
        });
        submit.id = "submit-color";
        submit.disabled = !round.drops;
        actions.append(submit);
      }
      actions.append(button("重新开一盘", "secondary", () => start(level)));
      controls.append(choices, actions);
    }
    if (level.blobs && level.mode !== "free") {
      const rack = el("div", "ingredient-rack");
      rack.append(el("span", "", "盘中颜料"));
      const colors = [...new Set(level.blobs.map((blob) => blob.color))];
      if (round.red) colors.push("red");
      for (const name of colors) {
        const sample = chip(pigment.rgbToHex(pigment.tubeRgb(name)));
        sample.title = pigment.TUBES[name].label;
        sample.setAttribute("aria-label", sample.title);
        rack.append(sample);
      }
      controls.prepend(rack);
    }
    $("prompt").textContent = prompt;
  }
  function finish(score, pass) {
    if (round.submitted) return;
    release();
    round.submitted = true;
    round.score = score;
    const { level } = round;
    const ms = Math.max(1, Math.round(performance.now() - round.started));
    data.records.push({ id: level.id, player: data.player, date: Date.now(), score, ms });
    const name = level.saveName || "三原色棕";
    if (pass) {
      if (!data.cleared.includes(level.id)) data.cleared.push(level.id);
      collection.collect(
        data.cards,
        pigment.rgbToHex(well.mix.rgb),
        name,
        { kind: "reward", level: level.id, score },
        Date.now(),
      );
      data.currentLevel = (
        levels[level.id] ||
        levels.find((l) => !data.cleared.includes(l.id)) ||
        levels[0]
      ).id;
    }
    persist();
    audio.reveal();
    navigator.vibrate?.([16, 40, 22]);
    updateControls();
    const message =
      level.mode === "guess"
        ? pass
          ? level.right
          : level.wrong
        : pass
          ? "「" + name + "」已收入色卡收藏板。"
          : "对色达到 75 分即可通关，调整颜料比例再试一次。";
    const next = levels[level.id];
    const title = pass
      ? (data.cleared.length === levels.length ? "全部关卡已通关" : "第 " + level.id + " 关通关")
      : level.mode === "guess" ? "猜错了，本关未通过" : "本关未通过";
    $("prompt").textContent = title + " · " + message;
    const actionLabel = pass ? (next ? "下一关 · " + next.title : "查看关卡档案") : "再试一次";
    function advance() {
      if ($("modal").open) $("modal").close();
      if (!pass) start(level);
      else if (next) start(next);
      else navigate("archive");
    }
    const result = $("result"),
      points = el("div", "result-score", score + " ");
    points.append(el("small", "", "分 · " + (ms / 1000).toFixed(1) + " 秒"));
    const actions = el("div", "action-row");
    actions.append(button(actionLabel, "primary", advance));
    if (pass) {
      actions.append(button("再试一次", "secondary", () => start(level)), button("保存色卡", "text-btn", saveCard));
    }
    actions.append(button("查看榜单", "text-btn", () => navigate("ranking")));
    result.replaceChildren(points, actions);
    const summary = modal(title, level.title);
    const primary = button(actionLabel, "primary", advance);
    const options = el("div", "outcome-actions");
    options.append(primary, button("继续搅拌", "secondary", () => $("modal").close()));
    summary.append(points.cloneNode(true), el("p", "outcome-note", message), options);
    primary.focus();
    queueDraw();
  }
  function saveCard() {
    redraw();
    const card = el("canvas");
    card.width = 720;
    card.height = 860;
    const ctx = card.getContext("2d");
    ctx.fillStyle = "#17191a";
    ctx.fillRect(0, 0, 720, 860);
    ctx.fillStyle = "#ceff45";
    ctx.font = '900 35px "PingFang SC", "Microsoft YaHei", sans-serif';
    ctx.fillText(document.title, 40, 72);
    ctx.save();
    ctx.beginPath();
    ctx.arc(360, 403, 268, 0, Math.PI * 2);
    ctx.clip();
    ctx.drawImage(
      surface && $("surface").classList.contains("ready") ? $("surface") : well.canvas,
      92,
      135,
      536,
      536,
    );
    ctx.restore();
    ctx.fillStyle = "#f2f3ed";
    ctx.font = "bold 40px sans-serif";
    ctx.fillText(round.level.title, 40, 760);
    ctx.font = "22px monospace";
    ctx.fillText(
      "EXP. " +
        pad(round.level.id) +
        "  /  " +
        pigment.rgbToHex(well.mix.rgb) +
        "  /  " +
        round.score +
        " PTS  /  " +
        collection.tiers[collection.rate(pigment.rgbToHex(well.mix.rgb)).tier].name,
      40,
      810,
    );
    const link = el("a");
    link.download = document.title + "-" + round.level.title + ".png";
    link.href = card.toDataURL("image/png");
    link.click();
  }
  function point(e) {
    const rect = wrap.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5,
      y = (e.clientY - rect.top) / rect.height - 0.5;
    if (x * x + y * y > 0.25) return null;
    return { x: 0.5 + x, y: 0.5 + y };
  }
  function pressure(e) {
    return e.pointerType === "pen" ? e.pressure : 0.5;
  }
  function finger(p, pressure) {
    const f = $("finger");
    f.style.width = f.style.height = 200 * well.brushRadius(pressure) + "%";
    f.style.display = "block";
    f.style.left = p.x * 100 + "%";
    f.style.top = p.y * 100 + "%";
  }
  wrap.addEventListener("click", (e) => {
    if (!picking) return;
    const p = point(e);
    if (p) pickFromWell(p);
  });
  wrap.addEventListener("pointerdown", (e) => {
    if (picking || pointer || e.button !== 0 || !well.mix.mass) return;
    e.preventDefault();
    audio.unlock();
    const p = point(e);
    if (!p) return;
    pointer = { id: e.pointerId, last: p, pressure: pressure(e) };
    wrap.setPointerCapture(e.pointerId);
    finger(p, pressure(e));
  });
  wrap.addEventListener("pointermove", (e) => {
    if (!pointer || pointer.id !== e.pointerId) return;
    const samples = e.getCoalescedEvents?.();
    let distance = 0;
    for (const sample of samples?.length ? samples : [e]) {
      const p = point(sample);
      if (!p) {
        pointer.last = null;
        $("finger").style.display = "none";
        continue;
      }
      pointer.pressure = pressure(sample);
      if (pointer.last) distance += well.stroke(pointer.last, p, pointer.pressure);
      pointer.last = p;
      finger(p, pressure(sample));
    }
    queueDraw();
    if (!distance) {
      audio.stopStir();
      return;
    }
    pointer.stirred = true;
    audio.stir(Math.min(1, distance * 15), true);
    clearTimeout(quietTimer);
    quietTimer = setTimeout(audio.stopStir, 95);
    if (distance > 0.02 && performance.now() - lastBuzz > 230) {
      navigator.vibrate?.(4);
      lastBuzz = performance.now();
    }
  });
  wrap.addEventListener("pointerup", (e) => {
    if (pointer?.id !== e.pointerId) return;
    if (round.level.mode === "tutorial" && round.red && pointer.stirred && !round.submitted) {
      finish(100, true);
      return;
    }
    release();
    queueDraw();
  });
  wrap.addEventListener("pointercancel", release);
  wrap.addEventListener("lostpointercapture", (e) => {
    if (pointer?.id === e.pointerId) release();
  });
  document.addEventListener("visibilitychange", () => {
    if (view !== "play") return;
    if (document.hidden) {
      release();
      round.hiddenAt = performance.now();
    } else if (round.hiddenAt !== null) {
      round.started += performance.now() - round.hiddenAt;
      round.hiddenAt = null;
    }
  });
  window.addEventListener("resize", () => {
    if (view === "play") queueDraw();
  });
  $("player-name").textContent = data.player;
  soundState();
  navigate("home");
})();
