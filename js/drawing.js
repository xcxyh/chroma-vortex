/* The visible canvas, undo history and PNG export share a fixed paper coordinate system. */
(function (game) {
  "use strict";
  game.createDrawing = function () {
    const $ = (id) => document.getElementById(id);
    const paper = $("paper");
    // Keep incremental strokes and draft replay on the same rasterization path.
    const ctx = paper.getContext("2d", { alpha: false, willReadFrequently: true });
    const oil = new game.OilSurface(ctx);
    const widthInput = $("art-width");
    const draftKey = "quan-jiao-jinqu-art-v1";
    let history = [],
      position = 0,
      color = null,
      erasing = false,
      active = null;

    function dot(stroke, point) {
      ctx.fillStyle = stroke.ink === "#FFFFFF" ? oil.linen : stroke.ink;
      ctx.beginPath();
      ctx.arc(point[0], point[1], point[2] / 2, 0, 2 * Math.PI);
      ctx.fill();
    }

    function drawSegment(stroke, index) {
      const points = stroke.points;
      if (!index) return dot(stroke, points[0]);
      const previous = points[index - 1],
        next = points[index];
      const before = points[Math.max(0, index - 2)];
      ctx.strokeStyle = stroke.ink === "#FFFFFF" ? oil.linen : stroke.ink;
      ctx.lineWidth = (previous[2] + next[2]) / 2;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo((before[0] + previous[0]) / 2, (before[1] + previous[1]) / 2);
      ctx.quadraticCurveTo(
        previous[0],
        previous[1],
        (previous[0] + next[0]) / 2,
        (previous[1] + next[1]) / 2,
      );
      ctx.stroke();
    }

    function closeTip(stroke) {
      const points = stroke.points;
      if (points.length < 2) return;
      const last = points.at(-1),
        previous = points.at(-2);
      ctx.strokeStyle = stroke.ink === "#FFFFFF" ? oil.linen : stroke.ink;
      ctx.lineWidth = last[2];
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo((previous[0] + last[0]) / 2, (previous[1] + last[1]) / 2);
      ctx.lineTo(last[0], last[1]);
      ctx.stroke();
    }

    function replay() {
      oil.clear();
      let flatLayerPending = false;
      let first = position;
      while (first > 0 && !history[first - 1].clear) first--;
      for (let i = first; i < position; i++) {
        const stroke = history[i];
        if (stroke.material) {
          if (flatLayerPending) {
            oil.adoptFlatLayer();
            flatLayerPending = false;
          }
          for (let j = 0; j < stroke.points.length; j++) oil.point(stroke, j);
          oil.finish(stroke);
        } else {
          // Existing drafts keep their original flat brush and recorded paths.
          oil.present();
          for (let j = 0; j < stroke.points.length; j++) drawSegment(stroke, j);
          closeTip(stroke);
          flatLayerPending = true;
        }
      }
      if (flatLayerPending) oil.adoptFlatLayer();
      oil.present();
    }

    function buttons() {
      const hasDrawing = position > 0 && !history[position - 1].clear;
      $("undo-art").disabled = position === 0;
      $("redo-art").disabled = position === history.length;
      $("clear-art").disabled = $("export-art").disabled = !hasDrawing;
    }

    function store() {
      buttons();
      try {
        localStorage.setItem(
          draftKey,
          JSON.stringify({ history, position, color, width: widthInput.valueAsNumber }),
        );
        $("draft-status").textContent = "草稿已保存到本机";
      } catch {
        $("draft-status").textContent = "草稿仅保留在当前页面，可导出 PNG 留存";
      }
    }

    function commit(action) {
      history.splice(position);
      history.push(action);
      position = history.length;
      store();
    }

    function endStroke() {
      if (!active) return;
      const { id, stroke } = active;
      active = null;
      if (paper.hasPointerCapture(id)) paper.releasePointerCapture(id);
      oil.finish(stroke);
      oil.present();
      commit(stroke);
    }

    function addPoint(event, rect) {
      const { stroke, diameter } = active;
      const pressure = event.pointerType === "pen" && event.pressure > 0 ? 0.45 + event.pressure * 1.1 : 1;
      const x = Math.round(((event.clientX - rect.left) / rect.width) * paper.width * 10) / 10;
      const y = Math.round(((event.clientY - rect.top) / rect.height) * paper.height * 10) / 10;
      const last = stroke.points.at(-1);
      if (last && last[0] === x && last[1] === y) return;
      stroke.points.push([x, y, Math.round(diameter * pressure * 10) / 10]);
      oil.point(stroke, stroke.points.length - 1);
    }

    paper.addEventListener("pointerdown", (event) => {
      if (!color || active || event.button !== 0) return;
      event.preventDefault();
      active = {
        id: event.pointerId,
        diameter: widthInput.valueAsNumber,
        stroke: { ink: color, material: erasing ? "erase" : "oil", points: [] },
      };
      paper.setPointerCapture(event.pointerId);
      addPoint(event, paper.getBoundingClientRect());
      oil.present();
    });
    paper.addEventListener("pointermove", (event) => {
      if (active?.id !== event.pointerId) return;
      const rect = paper.getBoundingClientRect();
      const samples = event.getCoalescedEvents?.();
      for (const sample of samples?.length ? samples : [event]) addPoint(sample, rect);
      oil.present();
    });
    paper.addEventListener("pointerup", (event) => {
      if (active?.id !== event.pointerId) return;
      addPoint(event, paper.getBoundingClientRect());
      endStroke();
    });
    for (const type of ["pointercancel", "lostpointercapture"]) {
      paper.addEventListener(type, (event) => {
        if (active?.id === event.pointerId) endStroke();
      });
    }
    window.addEventListener("pagehide", endStroke);
    document.addEventListener("visibilitychange", () => {
      if (document.hidden) endStroke();
    });

    function setTool(erase) {
      erasing = erase;
      $("ink-tool").setAttribute("aria-pressed", String(!erase));
      $("rubber-tool").setAttribute("aria-pressed", String(erase));
      paper.classList.toggle("can-draw", Boolean(color));
    }
    function select(hex) {
      color = hex;
      setTool(false);
      for (const swatch of $("drawing-colors").children) {
        swatch.setAttribute("aria-pressed", String(swatch.dataset.hex === color));
      }
    }
    $("ink-tool").onclick = () => setTool(false);
    $("rubber-tool").onclick = () => setTool(true);
    $("undo-art").onclick = () => {
      endStroke();
      if (position > 0) {
        position--;
        replay();
        store();
      }
    };
    $("redo-art").onclick = () => {
      endStroke();
      if (position < history.length) {
        position++;
        replay();
        store();
      }
    };
    $("clear-art").onclick = () => {
      endStroke();
      oil.clear();
      commit({ clear: true });
    };
    $("export-art").onclick = () => {
      endStroke();
      paper.toBlob((blob) => {
        if (!blob) {
          $("draft-status").textContent = "PNG 导出失败，请重试";
          return;
        }
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = document.title + "-我的画作.png";
        document.body.append(link);
        link.click();
        link.remove();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
      }, "image/png");
    };
    function widthLabel() {
      $("art-width-label").value = widthInput.value + " px";
    }
    widthInput.addEventListener("input", widthLabel);
    widthInput.addEventListener("change", store);

    let draft;
    try {
      draft = JSON.parse(localStorage.getItem(draftKey));
    } catch {
      draft = null;
    }
    if (draft && Array.isArray(draft.history)) {
      history = draft.history;
      position = Math.min(history.length, Math.max(0, Math.trunc(draft.position) || 0));
      color = draft.color;
      if (Number.isFinite(draft.width)) widthInput.value = draft.width;
      $("draft-status").textContent = "本机草稿已恢复";
    }
    widthLabel();
    replay();
    buttons();

    function open(cards, preferred) {
      const entries = Object.entries(cards);
      const selected = preferred || color;
      const palette = $("drawing-colors");
      palette.replaceChildren();
      for (const [hex, card] of entries) {
        const swatch = document.createElement("button");
        swatch.type = "button";
        swatch.className = "drawing-swatch";
        swatch.dataset.hex = hex;
        swatch.title = card.name + " · " + hex;
        swatch.setAttribute("aria-label", swatch.title);
        const paint = document.createElement("i");
        paint.style.setProperty("--pigment-color", hex);
        const label = document.createElement("span");
        label.textContent = card.name;
        swatch.append(paint, label);
        swatch.onclick = () => select(hex);
        palette.append(swatch);
      }
      $("no-drawing-colors").hidden = Boolean(entries.length);
      $("ink-tool").disabled = $("rubber-tool").disabled = !entries.length;
      select(selected && cards[selected] ? selected : entries[0]?.[0] || null);
    }
    return { open, endStroke };
  };
})(window.MixGame);
