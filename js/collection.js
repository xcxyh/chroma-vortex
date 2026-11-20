/* The reference experiment chooses a length first, then each tube independently. */
(function (game) {
  "use strict";
  const P = game.pigment;
  const tiers = [
    { name: "常见", minimum: 0.02, ink: "#bbc6ac" },
    { name: "少见", minimum: 0.005, ink: "#67dbcc" },
    { name: "稀有", minimum: 0.001, ink: "#c6a0ff" },
    { name: "传说", minimum: 0, ink: "#ffc868" },
  ];
  const maxDrops = 4;
  const tolerance = 8;
  let recipes;
  const ratings = new Map();

  function buildRecipes() {
    const tubes = Object.values(P.TUBES);
    const weights = new Map();
    function addDrop(parts) {
      for (const tube of tubes) {
        const recipe = [...parts, { ...tube, mass: 1 }];
        const hex = P.rgbToHex(P.mixParts(recipe).rgb);
        const weight = tubes.length ** (maxDrops - recipe.length);
        weights.set(hex, (weights.get(hex) || 0) + weight);
        if (recipe.length < maxDrops) addDrop(recipe);
      }
    }
    addDrop([]);
    const total = maxDrops * tubes.length ** maxDrops;
    return Array.from(weights, ([hex, weight]) => ({
      lab: P.rgbToLab(P.hexToRgb(hex)),
      share: weight / total,
    }));
  }

  function rate(hex) {
    if (ratings.has(hex)) return ratings.get(hex);
    recipes ??= buildRecipes();
    const lab = P.rgbToLab(P.hexToRgb(hex));
    let share = 0;
    for (const reference of recipes) {
      if (P.deltaE(lab, reference.lab) <= tolerance) share += reference.share;
    }
    const tier = tiers.findIndex((t) => share >= t.minimum);
    const rating = { tier, share };
    ratings.set(hex, rating);
    return rating;
  }

  function suggestName(hex) {
    const { h, s, l } = P.rgbToHsl(P.hexToRgb(hex));
    if (l > 0.92) return "瓷白";
    if (s < 0.14) return l > 0.65 ? "雾灰" : "岩灰";
    if (h < 55 && l < 0.44) return "陶土棕";
    const hues = [
      "朱红",
      "柿橙",
      "琥珀",
      "柠黄",
      "草绿",
      "松绿",
      "湖青",
      "海蓝",
      "靛蓝",
      "藤紫",
      "莓紫",
      "玫红",
    ];
    const hue = hues.find((_, i) => h < [14, 31, 49, 70, 99, 149, 183, 211, 254, 285, 325, 360][i]);
    return l > 0.68 ? "浅" + hue : hue;
  }

  function collect(cards, hex, name, source, date) {
    const key = hex.toUpperCase();
    const card = (cards[key] ??= { name, sources: [], date });
    const existing = card.sources.find((s) => s.kind === source.kind && s.level === source.level);
    if (!existing) card.sources.push(source);
    else if (source.score > (existing.score ?? -1)) existing.score = source.score;
    return card;
  }

  game.collection = { tiers, maxDrops, tolerance, rate, suggestName, collect };
})(window.MixGame);
