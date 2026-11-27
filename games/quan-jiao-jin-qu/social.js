// Xiaohongshu Mini-Tool social integration: synchronous-gesture post-comment (9.49+), share (9.53+), postNote fallback & native follow guide.
(() => {
  "use strict";
  let cachedVersion = undefined;
  let versionPromise = null;
  let cachedCap = null;
  let busy = false;

  function readBuildVersion(launchOptions) {
    const miniToolEnv = launchOptions && launchOptions.miniToolEnv;
    const value = miniToolEnv && miniToolEnv.buildVersion;
    if (typeof value !== "number" && typeof value !== "string") return null;
    if (!/^[1-9]\d{6,}$/.test(String(value))) return null;
    const version = Number(value);
    return Number.isSafeInteger(version) ? version : null;
  }

  function clientVersion(buildVersion) {
    return Number.isSafeInteger(buildVersion) && buildVersion > 0 ? Math.floor(buildVersion / 1000) : null;
  }

  function buildCap(build) {
    const preview = /(?:^|[?&])preview=1(?:&|$)/.test(location.search);
    const ver = clientVersion(build);
    const sdk = window.xhs && window.xhs.miniTool;
    const canComment = preview || Boolean(ver !== null && ver >= 9490 && sdk && typeof sdk.interactionOpenApi === "function");
    const canShare = preview || Boolean(ver !== null && ver >= 9530 && sdk && typeof sdk.share === "function");
    const canPostNote = preview || Boolean(sdk && typeof sdk.postNote === "function");
    cachedCap = { canComment, canShare, canPostNote, preview, sdk, ver };
    return cachedCap;
  }

  async function getBuildVersion() {
    if (cachedVersion !== undefined) return cachedVersion;
    const xhs = window.xhs;
    const syncVersion = readBuildVersion(xhs && xhs.launchOptions);
    if (syncVersion !== null) {
      cachedVersion = syncVersion;
      return cachedVersion;
    }
    const miniTool = xhs && xhs.miniTool;
    if (!miniTool || typeof miniTool.getLaunchOptions !== "function") {
      cachedVersion = null;
      return null;
    }
    if (!versionPromise) {
      versionPromise = Promise.resolve()
        .then(() => miniTool.getLaunchOptions())
        .then((opts) => {
          cachedVersion = readBuildVersion(opts);
          return cachedVersion;
        })
        .catch(() => {
          cachedVersion = null;
          return null;
        });
    }
    return versionPromise;
  }

  async function capabilities() {
    if (cachedCap) return cachedCap;
    const build = await getBuildVersion();
    return buildCap(build);
  }

  function syncCapabilities() {
    if (cachedCap) return cachedCap;
    const syncVersion = readBuildVersion(window.xhs && window.xhs.launchOptions);
    if (syncVersion !== null) return buildCap(syncVersion);
    return buildCap(null);
  }

  function withTimeout(promise, ms, label) {
    let timer;
    return Promise.race([
      Promise.resolve(promise).finally(() => clearTimeout(timer)),
      new Promise((_, reject) => {
        timer = setTimeout(() => reject({ errMsg: (label || "api") + ":fail timeout", isTimeout: true }), ms);
      })
    ]);
  }

  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  function wrapLines(ctx, text, maxWidth, maxLines) {
    const chars = Array.from(String(text || ""));
    const lines = [];
    let current = "";
    for (const ch of chars) {
      if (ch === "\n") {
        lines.push(current);
        current = "";
        continue;
      }
      if (ctx.measureText(current + ch).width > maxWidth && current) {
        lines.push(current);
        current = ch;
        if (lines.length >= maxLines - 1) break;
      } else {
        current += ch;
      }
    }
    if (current) lines.push(current);
    return lines.slice(0, maxLines);
  }

  // Render crisp 540x675 (4:5) dessert receipt poster — fast PNG export matching official §3.5/§3.9 spec.
  function renderPoster({ badge, title, subtitle, tag, cupCanvas, drawExtra }) {
    const W = 540, H = 675;
    const canvas = document.createElement("canvas");
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext("2d");

    ctx.fillStyle = "#bedbc6";
    ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = "rgba(116,159,131,0.22)";
    ctx.lineWidth = 1.5;
    for (let x = 0; x <= W; x += 42) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke();
    }
    for (let y = 0; y <= H; y += 42) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
    }

    const stripeW = 30, stripeH = 20;
    for (let x = 0, i = 0; x < W; x += stripeW, i++) {
      ctx.fillStyle = i % 2 === 0 ? "#a62e4f" : "#ffecca";
      ctx.fillRect(x, 0, stripeW + 1, stripeH);
    }
    ctx.fillStyle = "#6f5746";
    ctx.fillRect(0, stripeH, W, 4);
    ctx.fillStyle = "#89ab92";
    ctx.fillRect(0, stripeH + 4, W, 4);

    ctx.fillStyle = "#233f37";
    ctx.font = '900 26px "Songti SC","STSong",serif';
    ctx.textAlign = "left";
    ctx.fillText("全搅进去", 32, 66);
    ctx.fillStyle = "#9e2045";
    ctx.beginPath(); ctx.arc(146, 58, 6, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(155, 61, 6, 0, Math.PI * 2); ctx.fill();

    if (badge) {
      ctx.font = '700 17px "PingFang SC","Microsoft YaHei",sans-serif';
      const bw = Math.min(210, ctx.measureText(badge).width + 26);
      roundRect(ctx, W - 32 - bw, 40, bw, 32, 16);
      ctx.fillStyle = "#fff7df";
      ctx.fill();
      ctx.strokeStyle = "#8d9d80";
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.fillStyle = "#9e2045";
      ctx.textAlign = "center";
      ctx.fillText(badge, W - 32 - bw / 2, 62);
    }

    const cx = W / 2, cy = 276, R = 177;
    ctx.save();
    ctx.shadowColor = "rgba(53,87,61,0.34)";
    ctx.shadowBlur = 22;
    ctx.shadowOffsetY = 10;
    ctx.beginPath();
    ctx.arc(cx, cy, R, 0, Math.PI * 2);
    const rim = ctx.createRadialGradient(cx - 15, cy - 20, R * 0.65, cx, cy, R);
    rim.addColorStop(0, "#fffdf0");
    rim.addColorStop(0.55, "#ead6ac");
    rim.addColorStop(0.78, "#fff8da");
    rim.addColorStop(0.92, "#e1c69e");
    rim.addColorStop(1, "#7b6650");
    ctx.fillStyle = rim;
    ctx.fill();
    ctx.restore();

    const innerR = R * 0.865;
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, innerR, 0, Math.PI * 2);
    ctx.clip();
    ctx.fillStyle = "#fff1d0";
    ctx.fillRect(cx - innerR, cy - innerR, innerR * 2, innerR * 2);
    if (cupCanvas) {
      ctx.drawImage(cupCanvas, cx - innerR, cy - innerR, innerR * 2, innerR * 2);
    }
    if (typeof drawExtra === "function") {
      drawExtra(ctx, cx, cy, innerR);
    }
    ctx.strokeStyle = "rgba(126,74,56,0.28)";
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.arc(cx, cy, innerR + 1.5, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();

    if (tag) {
      ctx.save();
      ctx.translate(cx + 118, cy + 122);
      ctx.rotate(-0.2);
      ctx.font = '900 21px "PingFang SC","Microsoft YaHei",sans-serif';
      const tw = ctx.measureText(tag).width + 24;
      roundRect(ctx, -tw / 2, -20, tw, 40, 8);
      ctx.fillStyle = "#fff3d8";
      ctx.fill();
      ctx.strokeStyle = "#9e2045";
      ctx.lineWidth = 3;
      ctx.stroke();
      ctx.fillStyle = "#9e2045";
      ctx.textAlign = "center";
      ctx.fillText(tag, 0, 8);
      ctx.restore();
    }

    const cardX = 36, cardY = 478, cardW = W - 72, cardH = 168;
    ctx.save();
    ctx.shadowColor = "rgba(85,112,92,0.28)";
    ctx.shadowBlur = 12;
    ctx.shadowOffsetY = 6;
    roundRect(ctx, cardX, cardY, cardW, cardH, 12);
    ctx.fillStyle = "#fff7df";
    ctx.fill();
    ctx.strokeStyle = "#91a68b";
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.restore();

    ctx.fillStyle = "#9e2045";
    ctx.fillRect(cardX + 18, cardY + 20, 5, 34);

    ctx.fillStyle = "#233f37";
    ctx.textAlign = "left";
    ctx.font = '900 32px "Songti SC","STSong",serif';
    const titleLines = wrapLines(ctx, title || "我的招牌甜品", cardW - 58, 1);
    ctx.fillText(titleLines[0] || "", cardX + 34, cardY + 50);

    ctx.fillStyle = "#476050";
    ctx.font = '500 18px "PingFang SC","Microsoft YaHei",sans-serif';
    const subLines = wrapLines(ctx, subtitle || "", cardW - 48, 2);
    subLines.forEach((line, idx) => {
      ctx.fillText(line, cardX + 22, cardY + 86 + idx * 24);
    });

    ctx.strokeStyle = "#c8cbac";
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    ctx.moveTo(cardX + 20, cardY + 126);
    ctx.lineTo(cardX + cardW - 20, cardY + 126);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.fillStyle = "#8a2947";
    ctx.font = '700 17px "PingFang SC","Microsoft YaHei",sans-serif';
    ctx.textAlign = "center";
    ctx.fillText("点笔记左下角《全搅进去》免下载直接开搅 🍨", W / 2, cardY + 153);

    return canvas;
  }

  function safeSnapshot(obj) {
    if (!obj) return undefined;
    try {
      const json = JSON.stringify(obj);
      if (new Blob([json]).size <= 1800) return json;
    } catch (e) {}
    return undefined;
  }

  // Pre-write poster to container temp file using official image/png format so click can call interactionOpenApi synchronously!
  async function writePosterFile(posterCanvas) {
    const cap = await capabilities();
    const sdk = cap.sdk;
    if (!posterCanvas || !sdk || typeof sdk.writeTempFile !== "function") return null;
    for (const mime of ["image/png", "image/jpeg"]) {
      try {
        const dataUrl = mime === "image/png" ? posterCanvas.toDataURL(mime) : posterCanvas.toDataURL(mime, 0.86);
        const written = await withTimeout(sdk.writeTempFile({ data: dataUrl }), 3500, "writeTempFile");
        const path = written && (written.filePath || written.tempFilePath || written.path);
        if (typeof path === "string" && path.length > 0) return path;
      } catch (err) {}
    }
    return null;
  }

  function isNotRouted(res) {
    if (!res) return false;
    if (res.routed === false || res.routed === 0 || res.routed === "false") return true;
    if (res.data && (res.data.routed === false || res.data.routed === 0)) return true;
    return false;
  }

  // IMPORTANT: When prewrittenFilePath is supplied, this invokes sdk.interactionOpenApi SYNCHRONOUSLY
  // inside the user's tap event stack (zero awaits beforehand!) to preserve native user-gesture trust.
  function postComment({ text, posterCanvas, prewrittenFilePath, snapshot, onStatus, button }) {
    if (busy) return Promise.resolve({ ok: false, reason: "busy" });
    const cap = syncCapabilities();
    if (!cap.canComment) {
      if (onStatus) onStatus("当前版本暂不支持一键晒评论，可截图发到评论区哦～");
      return Promise.resolve({ ok: false, reason: "unsupported" });
    }
    if (cap.preview && (!cap.sdk || typeof cap.sdk.interactionOpenApi !== "function")) {
      if (onStatus) onStatus("预览模式：已生成 540×675 晒杯小票图，真机将同步直调评论区。");
      return Promise.resolve({ ok: true, reason: "preview" });
    }

    busy = true;
    const prevLabel = button ? button.textContent : "";
    if (button) { button.disabled = true; button.textContent = "拉起评论区…"; }
    if (onStatus) onStatus("正在拉起评论区…");

    const invoke = (filePath) => {
      const payload = {
        action: "post_comment",
        content: text
      };
      if (filePath) {
        payload.media_bean = [{ media_type: "image", cover_image_url: filePath }];
      }
      const snap = safeSnapshot(snapshot);
      if (snap) payload.miniToolSnapshotInfo = snap;
      // Match official §3.9 example verbatim (saveToAlbum: true default; graceful albumFailReason if denied)
      const callPromise = cap.sdk.interactionOpenApi({ payload, saveToAlbum: true });
      return withTimeout(callPromise, 4500, "interactionOpenApi").then((res) => ({ res, filePath }));
    };

    // Fast path: SYNCHRONOUS call inside click gesture when filePath is already pre-written!
    const runPromise = prewrittenFilePath
      ? invoke(prewrittenFilePath)
      : writePosterFile(posterCanvas).then((filePath) => invoke(filePath));

    return runPromise.then(({ res, filePath }) => {
      if (isNotRouted(res)) {
        if (onStatus) onStatus("评论区未激活（routed=false）：视频页首次需先点开一下评论区再进，或直接点「发笔记晒杯 / 分享」✨");
        return { ok: false, reason: "not_routed", filePath, raw: res };
      }
      if (onStatus) onStatus("已唤起评论区，点发送就能晒出你的甜品啦✨");
      return { ok: true, reason: "routed", filePath, raw: res };
    }).catch((err) => {
      const msg = String((err && err.errMsg) || "");
      const code = err && err.errCode != null ? " [" + err.errCode + "]" : "";
      if (/cancel/i.test(msg)) {
        if (onStatus) onStatus("已取消发布，随时可以再晒杯哦～");
        return { ok: false, reason: "cancel" };
      }
      if (err && err.isTimeout) {
        if (onStatus) onStatus("评论区无响应（超时）：请先点开一下笔记评论区再试，或直接点「发笔记晒杯」✨");
        return { ok: false, reason: "not_routed", filePath: prewrittenFilePath || null };
      }
      if (onStatus) onStatus("拉起评论区失败" + code + "：可先点开评论区再进，或点「发笔记晒杯」✨");
      return { ok: false, reason: "not_routed", filePath: prewrittenFilePath || null };
    }).finally(() => {
      busy = false;
      if (button) { button.disabled = false; button.textContent = prevLabel; }
    });
  }

  async function postNote({ title, text, posterCanvas, filePath, onStatus, button }) {
    if (busy) return false;
    const cap = await capabilities();
    if (!cap.canPostNote) {
      if (onStatus) onStatus("当前版本暂不支持直接发笔记，可截图发布哦～");
      return false;
    }
    if (cap.preview && (!cap.sdk || typeof cap.sdk.postNote !== "function")) {
      if (onStatus) onStatus("预览模式：已准备好晒杯笔记素材，真机将拉起发布页。");
      return true;
    }
    busy = true;
    const prevLabel = button ? button.textContent : "";
    if (button) { button.disabled = true; button.textContent = "打开发布页…"; }
    try {
      const url = filePath || (await writePosterFile(posterCanvas)) || (posterCanvas ? posterCanvas.toDataURL("image/png") : "");
      const mediaInfo = url ? { image_resources: [{ url }] } : {};
      await withTimeout(cap.sdk.postNote({
        title: String(title || "我的0卡招牌甜品").slice(0, 20),
        content: String(text || "").slice(0, 1000),
        pageType: "photo_publish",
        mediaInfo
      }), 5000, "postNote");
      if (onStatus) onStatus("已为你带入晒杯小票图，发篇笔记炫耀一下吧✨");
      return true;
    } catch (err) {
      if (/cancel/i.test(String((err && err.errMsg) || ""))) {
        if (onStatus) onStatus("已取消发笔记，随时可以再晒～");
      } else if (onStatus) {
        onStatus("暂时打不开发布页，可以先点「分享给好友」或稍后再试～");
      }
      return false;
    } finally {
      busy = false;
      if (button) { button.disabled = false; button.textContent = prevLabel; }
    }
  }

  async function shareCup({ posterCanvas, prewrittenFilePath, onStatus, button }) {
    if (busy) return false;
    const cap = await capabilities();
    if (!cap.canShare) {
      if (onStatus) onStatus("请升级小红书 App 或点右上角 ··· 分享给好友～");
      return false;
    }
    if (cap.preview && (!cap.sdk || typeof cap.sdk.share !== "function")) {
      if (onStatus) onStatus("预览模式：已准备好出杯分享图，真机将直接拉起分享面板。");
      return true;
    }
    busy = true;
    const prevLabel = button ? button.textContent : "";
    if (button) { button.disabled = true; button.textContent = "拉起分享中…"; }
    try {
      if (onStatus) onStatus("正在拉起分享面板…");
      const imgRes = prewrittenFilePath || (posterCanvas ? posterCanvas.toDataURL("image/png") : null);
      if (imgRes) {
        try {
          await withTimeout(cap.sdk.share({ type: "image", image_resource: imgRes }), 4500, "share");
        } catch (err) {
          const code = Number(err && err.errCode);
          if (code === 15501) {
            await withTimeout(cap.sdk.share({ type: "card" }), 4500, "share");
          } else {
            throw err;
          }
        }
      } else {
        await withTimeout(cap.sdk.share({ type: "card" }), 4500, "share");
      }
      if (onStatus) onStatus("已拉起分享，快拉闺蜜一起来搅一杯吧✨");
      return true;
    } catch (err) {
      const code = Number(err && err.errCode);
      if (code === 15503) {
        if (onStatus) onStatus("今天分享次数已达上限（10次）啦，明天再来～");
      } else if (code === 15502) {
        if (onStatus) onStatus("展开全屏后就能直接分享给好友啦～");
      } else {
        if (onStatus) onStatus("暂时拉不起分享面板，也可以点右上角 ··· 分享哦～");
      }
      return false;
    } finally {
      busy = false;
      if (button) { button.disabled = false; button.textContent = prevLabel; }
    }
  }

  // Eagerly resolve capabilities at startup so click handlers run synchronously with zero awaits.
  capabilities();

  window.CupSocial = { capabilities, syncCapabilities, renderPoster, writePosterFile, postComment, postNote, shareCup };
})();
