(function (game) {
  "use strict";
  const key = "quan-jiao-jinqu-v1";
  function load() {
    let old;
    try {
      old = JSON.parse(localStorage.getItem(key));
    } catch {
      old = null;
    }
    old = old && typeof old === "object" ? old : {};
    const levels = game.levels;
    const highest = Math.min(9, Number(old.highestCleared) || 0);
    const cards = old.cards && typeof old.cards === "object" ? old.cards : {};
    for (const level of levels) {
      const item = old.gallery?.[level.id];
      if (item && /^#[0-9a-f]{6}$/i.test(item.hex)) {
        game.collection.collect(
          cards,
          item.hex,
          item.name,
          { kind: "reward", level: level.id, score: item.score },
          null,
        );
      }
    }
    return {
      currentLevel: levels.some((l) => l.id === old.currentLevel) ? old.currentLevel : 1,
      cleared: Array.isArray(old.cleared)
        ? old.cleared
        : levels.filter((l) => l.id <= highest).map((l) => l.id),
      cards,
      records: Array.isArray(old.records) ? old.records : [],
      player: typeof old.player === "string" ? old.player : "玩家 01",
      muted: old.muted === true,
      brushDiameter: Number.isFinite(old.brushDiameter) ? old.brushDiameter : undefined,
    };
  }
  function save(data) {
    try {
      localStorage.setItem(key, JSON.stringify(data));
      return true;
    } catch {
      return false;
    }
  }
  game.storage = { load, save };
})(window.MixGame);
