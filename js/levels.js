/* Level data and short Chinese copy for 全搅进去. */
(function (global) {
  "use strict";

  var MixGame = global.MixGame || (global.MixGame = {});
  var P = MixGame.pigment;

  function tube(name) {
    var t = P.TUBES[name];
    return { name: name, r: t.r, y: t.y, b: t.b, w: t.w, label: t.label };
  }

  /* Eight vivid blobs used by the hook level, in ring order. */
  var EIGHT = ["red", "orange", "yellow", "green", "teal", "blue", "purple", "pink"];

  var eightMix = P.mixParts(EIGHT.map(function (n) {
    var t = P.TUBES[n];
    return { r: t.r, y: t.y, b: t.b, w: t.w, mass: 1 };
  }));
  var EIGHT_HEX = P.rgbToHex(eightMix.rgb);

  var khakiMix = P.mixParts([
    { r: P.TUBES.red.r, y: P.TUBES.red.y, b: P.TUBES.red.b, w: 0, mass: 1 },
    { r: P.TUBES.yellow.r, y: P.TUBES.yellow.y, b: P.TUBES.yellow.b, w: 0, mass: 1 },
    { r: P.TUBES.blue.r, y: P.TUBES.blue.y, b: P.TUBES.blue.b, w: 0, mass: 1 },
    { r: 0, y: 0, b: 0, w: 1, mass: 1.25 }
  ]);
  var KHAKI_HEX = P.rgbToHex(khakiMix.rgb);

  var LEVELS = [
    {
      id: 1,
      name: "入门",
      mode: "tutorial",
      palette: ["red", "yellow", "blue"],
      startLocked: ["red"],
      scooped: ["yellow", "blue"],
      blobs: [
        { color: "yellow", x: 0.32, y: 0.50, radius: 0.72, mass: 8.4 },
        { color: "blue", x: 0.68, y: 0.50, radius: 0.72, mass: 8.4 }
      ],
      prompts: {
        start: "先把黄和蓝搅在一起",
        green: "绿了。把红倒进去",
        mud: "越搅越脏"
      }
    },
    {
      id: 2,
      name: "全搅进去",
      mode: "guess",
      palette: [],
      guessFirst: true,
      saveName: "脏棕",
      prompt: "八种颜色，搅完会变成啥？",
      afterGuess: "搅开看看",
      right: "对了，就是这摊脏棕。",
      wrong: "这八种颜料混在一起会变成脏棕色。",
      correct: "mud",
      options: [
        { id: "white", label: "白色", hex: "#F3F0EA" },
        { id: "black", label: "黑色", hex: "#1B1B1B" },
        { id: "rainbow", label: "彩虹", hex: "rainbow" },
        { id: "mud", label: "脏棕", hex: EIGHT_HEX }
      ],
      blobs: EIGHT.map(function (name, i) {
        var a = (-Math.PI / 2) + (i / 8) * Math.PI * 2;
        return {
          color: name,
          x: 0.5 + Math.cos(a) * 0.26,
          y: 0.5 + Math.sin(a) * 0.26,
          radius: 0.24,
          mass: 3.1
        };
      })
    },
    {
      id: 3,
      name: "猜色",
      mode: "guess",
      palette: [],
      guessFirst: true,
      saveName: "橙",
      prompt: "红加黄，你觉得是？",
      afterGuess: "搅开看看",
      right: "橙。颜料也是这么混的。",
      wrong: "红加黄，是橙。",
      correct: "orange",
      options: [
        { id: "orange", label: "橙", hex: P.rgbToHex(P.pigmentToRgb(1, 1, 0, 0)) },
        { id: "green", label: "绿", hex: P.rgbToHex(P.pigmentToRgb(0, 1, 1, 0)) },
        { id: "brown", label: "棕", hex: P.rgbToHex(P.pigmentToRgb(1, 1, 1, 0)) },
        { id: "pink", label: "粉", hex: P.rgbToHex(P.pigmentToRgb(0.95, 0.12, 0.12, 0.46)) }
      ],
      blobs: [
        { color: "red", x: 0.32, y: 0.50, radius: 0.72, mass: 8.2 },
        { color: "yellow", x: 0.68, y: 0.50, radius: 0.72, mass: 8.2 }
      ]
    },
    {
      id: 4,
      name: "猜色",
      mode: "guess",
      palette: [],
      guessFirst: true,
      saveName: "紫",
      prompt: "红加蓝呢？",
      afterGuess: "搅开看看",
      right: "紫。还算干净。",
      wrong: "红加蓝，是紫。",
      correct: "purple",
      options: [
        { id: "purple", label: "紫", hex: P.rgbToHex(P.pigmentToRgb(1, 0, 1, 0)) },
        { id: "green", label: "绿", hex: P.rgbToHex(P.pigmentToRgb(0, 1, 1, 0)) },
        { id: "brown", label: "棕", hex: P.rgbToHex(P.pigmentToRgb(1, 1, 1, 0)) },
        { id: "blue", label: "蓝", hex: P.rgbToHex(P.pigmentToRgb(0, 0, 1, 0)) }
      ],
      blobs: [
        { color: "red", x: 0.32, y: 0.48, radius: 0.72, mass: 8.2 },
        { color: "blue", x: 0.68, y: 0.52, radius: 0.72, mass: 8.2 }
      ]
    },
    {
      id: 5,
      name: "猜色",
      mode: "guess",
      palette: [],
      guessFirst: true,
      saveName: "卡其",
      prompt: "红黄蓝，再加一点白。",
      afterGuess: "搅开看看",
      right: "卡其。三原色一碰，就往泥里走。",
      wrong: "是卡其。再加白也洗不回鲜色。",
      correct: "khaki",
      options: [
        { id: "khaki", label: "卡其", hex: KHAKI_HEX },
        { id: "graypurple", label: "灰紫", hex: "#8A7C8C" },
        { id: "skin", label: "肌色", hex: "#D9A07A" },
        { id: "latte", label: "浅咖", hex: "#A07B5A" }
      ],
      blobs: [
        { color: "red", x: 0.28, y: 0.32, radius: 0.48, mass: 5.4 },
        { color: "yellow", x: 0.72, y: 0.32, radius: 0.48, mass: 5.4 },
        { color: "blue", x: 0.50, y: 0.72, radius: 0.48, mass: 5.4 },
        { color: "white", x: 0.50, y: 0.50, radius: 0.30, mass: 3.8 }
      ]
    },
    {
      id: 6,
      name: "对色",
      mode: "match",
      palette: ["red", "yellow", "white"],
      drops: 6,
      targetHex: "#E88A1A",
      targetName: "橙子橙",
      saveName: "橙子橙",
      prompt: "调一摊橙子橙",
      seedWhite: 0
    },
    {
      id: 7,
      name: "对色",
      mode: "match",
      palette: ["red", "yellow", "blue", "white"],
      drops: 6,
      targetHex: "#3F8C3A",
      targetName: "草地绿",
      saveName: "草地绿",
      prompt: "调一摊草地绿",
      seedWhite: 0
    },
    {
      id: 8,
      name: "对色",
      mode: "match",
      palette: ["red", "yellow", "blue", "white"],
      drops: 8,
      targetHex: "#D9A07A",
      targetName: "皮肤色",
      saveName: "皮肤色",
      prompt: "调一摊皮肤色。小心，很容易搅成泥。",
      seedWhite: 0
    },
    {
      id: 9,
      name: "对色",
      mode: "match",
      palette: ["red", "yellow", "blue", "white"],
      drops: 8,
      targetHex: "#E86B4A",
      targetName: "晚霞",
      saveName: "晚霞",
      prompt: "最后一关：晚霞。要暖，要一点粉，别脏。",
      seedWhite: 0
    }
  ];

  const extra = [
    ["薰衣草", ["red", "blue", "white"], ["red", "blue", "white", "white"]],
    ["薄荷奶绿", ["yellow", "blue", "white"], ["yellow", "blue", "white", "white", "white"]],
    ["玫瑰陶土", ["red", "yellow", "blue", "white"], ["red", "red", "yellow", "white", "white"]]
  ];
  extra.forEach(([name, palette, recipe]) => {
    const target = P.mixParts(recipe.map(color => ({ ...P.TUBES[color], mass: 1 })));
    LEVELS.push({ id: LEVELS.length + 1, mode: "match", palette, drops: 7,
      targetHex: P.rgbToHex(target.rgb), targetName: name, saveName: name,
      prompt: "调出" + name + "，颜色相似度达到 75 分即可过关。" });
  });
  const covers = [
    ["原色觉醒", "lime", 0], ["万色漩涡", "pink", 0], ["橙色碰撞", "orange", 0], ["紫电反应", "blue", 30],
    ["卡其迷雾", "orange", 20], ["落日甜橙", "orange", -10], ["草地回声", "lime", 22], ["暖瓷肤色", "pink", 55],
    ["晚霞切片", "orange", -27], ["薰衣草田", "pink", -48], ["薄荷涌流", "blue", -27], ["玫瑰陶土", "pink", 32]
  ];
  LEVELS.forEach((level, i) => {
    [level.title, level.art, level.hue] = covers[i];
    level.difficulty = i < 4 ? 1 : i < 8 ? 2 : 3;
  });

  MixGame.levels = LEVELS;
  MixGame.tube = tube;
  MixGame.EIGHT_HEX = EIGHT_HEX;
  MixGame.KHAKI_HEX = KHAKI_HEX;
})(typeof window !== "undefined" ? window : this);
