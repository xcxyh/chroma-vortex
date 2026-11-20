/* Pigment math for 全搅进去.
 * RYB subtractive mixing with a mud term. Not light/additive RGB.
 */
(function (global) {
  "use strict";

  var MixGame = global.MixGame || (global.MixGame = {});

  // RYB unit cube corners → sRGB (wet acrylic, not neon screen primaries).
  // 111 is dirty brown, never black or white.
  var CUBE = {
    c000: [1.000, 1.000, 1.000],
    c100: [0.860, 0.118, 0.090],
    c010: [0.965, 0.820, 0.070],
    c001: [0.110, 0.265, 0.690],
    c110: [0.910, 0.505, 0.070],
    c011: [0.160, 0.575, 0.200],
    c101: [0.470, 0.100, 0.560],
    c111: [0.365, 0.268, 0.185]
  };

  function lerp(a, b, t) {
    return a + (b - a) * t;
  }

  function lerp3(a, b, t) {
    return [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
  }

  function clamp01(x) {
    if (x < 0) return 0;
    if (x > 1) return 1;
    return x;
  }

  // Trilinear interpolation on the RYB cube.
  function rybToRgb(r, y, b) {
    r = clamp01(r);
    y = clamp01(y);
    b = clamp01(b);
    var c00 = lerp3(CUBE.c000, CUBE.c100, r);
    var c10 = lerp3(CUBE.c010, CUBE.c110, r);
    var c01 = lerp3(CUBE.c001, CUBE.c101, r);
    var c11 = lerp3(CUBE.c011, CUBE.c111, r);
    var c0 = lerp3(c00, c10, y);
    var c1 = lerp3(c01, c11, y);
    return lerp3(c0, c1, b);
  }

  // When all three primaries (or complementary pairs) are present,
  // push toward the mud corner and slightly crush remaining white.
  function applyMud(r, y, b) {
    var mn = Math.min(r, y, b);
    var mud = Math.min(1, mn * 3.15);
    if (mud <= 0.0001) {
      return { r: r, y: y, b: b };
    }
    var k = mud * 0.88;
    return {
      r: r + (1 - r) * k,
      y: y + (1 - y) * k,
      b: b + (1 - b) * k
    };
  }

  // Mix mass-weighted RYB + white concentrations, then apply mud.
  // Each part: { r, y, b, w, mass } with r,y,b,w in 0..1.
  function mixParts(parts) {
    var i, p, m, tr = 0, ty = 0, tb = 0, tw = 0, tm = 0;
    for (i = 0; i < parts.length; i++) {
      p = parts[i];
      m = p.mass;
      if (!(m > 0)) continue;
      tr += p.r * m;
      ty += p.y * m;
      tb += p.b * m;
      tw += (p.w || 0) * m;
      tm += m;
    }
    if (tm <= 0) {
      return { r: 0, y: 0, b: 0, w: 0, mass: 0, rgb: [0.82, 0.78, 0.72] };
    }
    return finishPigment(tr / tm, ty / tm, tb / tm, tw / tm, tm);
  }

  function finishPigment(r, y, b, w, mass) {
    w = clamp01(w);
    // Average RYB is a partition; the cube's secondaries live at (1,1,0) etc.
    // Normalize chroma so Y+B lands on green, not a washed midpoint.
    var mx = Math.max(r, y, b);
    var nr = 0, ny = 0, nb = 0;
    if (mx > 1e-6) {
      nr = r / mx;
      ny = y / mx;
      nb = b / mx;
    }
    var mudded = applyMud(nr, ny, nb);
    var rgbP = rybToRgb(mudded.r, mudded.y, mudded.b);
    // White is titanium: lifts value and slightly kills chroma.
    var lift = w;
    var rgb = [
      clamp01(rgbP[0] * (1 - lift) + 0.985 * lift),
      clamp01(rgbP[1] * (1 - lift) + 0.975 * lift),
      clamp01(rgbP[2] * (1 - lift) + 0.955 * lift)
    ];
    return { r: r, y: y, b: b, w: w, mass: mass, rgb: rgb };
  }

  function pigmentToRgb(r, y, b, w) {
    return finishPigment(r, y, b, w || 0, 1).rgb;
  }

  function rgbToHex(rgb) {
    var h = "#";
    for (var i = 0; i < 3; i++) {
      var v = Math.round(clamp01(rgb[i]) * 255);
      h += (v < 16 ? "0" : "") + v.toString(16);
    }
    return h.toUpperCase();
  }

  function hexToRgb(hex) {
    var h = hex.replace("#", "");
    return [
      parseInt(h.slice(0, 2), 16) / 255,
      parseInt(h.slice(2, 4), 16) / 255,
      parseInt(h.slice(4, 6), 16) / 255
    ];
  }

  function srgbToLinear(c) {
    return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  }

  function rgbToLab(rgb) {
    var R = srgbToLinear(clamp01(rgb[0]));
    var G = srgbToLinear(clamp01(rgb[1]));
    var B = srgbToLinear(clamp01(rgb[2]));
    var x = R * 0.4124564 + G * 0.3575761 + B * 0.1804375;
    var y = R * 0.2126729 + G * 0.7151522 + B * 0.0721750;
    var z = R * 0.0193339 + G * 0.1191920 + B * 0.9503041;
    var xn = 0.95047, yn = 1.0, zn = 1.08883;
    function f(t) {
      return t > 0.008856 ? Math.cbrt(t) : 7.787037 * t + 16 / 116;
    }
    var fx = f(x / xn), fy = f(y / yn), fz = f(z / zn);
    return {
      L: 116 * fy - 16,
      a: 500 * (fx - fy),
      b: 200 * (fy - fz)
    };
  }

  function deltaE(lab1, lab2) {
    var dL = lab1.L - lab2.L;
    var da = lab1.a - lab2.a;
    var db = lab1.b - lab2.b;
    return Math.sqrt(dL * dL + da * da + db * db);
  }

  // Map ΔE to 0–100. ~90 at ΔE 8, ~75 at ΔE 18.
  function scoreFromDeltaE(dE) {
    if (dE <= 8) return Math.round(100 - (dE / 8) * 10);
    if (dE <= 18) return Math.round(90 - ((dE - 8) / 10) * 15);
    if (dE <= 50) return Math.round(75 - ((dE - 18) / 32) * 50);
    return Math.max(0, Math.round(25 - (dE - 50) * 0.5));
  }

  function scoreAgainstHex(rgb, targetHex) {
    var dE = deltaE(rgbToLab(rgb), rgbToLab(hexToRgb(targetHex)));
    return { deltaE: dE, score: scoreFromDeltaE(dE) };
  }

  function rgbToHsl(rgb) {
    var r = clamp01(rgb[0]), g = clamp01(rgb[1]), b = clamp01(rgb[2]);
    var max = Math.max(r, g, b), min = Math.min(r, g, b);
    var l = (max + min) / 2;
    var d = max - min;
    var h = 0, s = 0;
    if (d > 1e-6) {
      s = d / (1 - Math.abs(2 * l - 1));
      if (max === r) h = ((g - b) / d) % 6;
      else if (max === g) h = (b - r) / d + 2;
      else h = (r - g) / d + 4;
      h *= 60;
      if (h < 0) h += 360;
    }
    return { h: h, s: s, l: l };
  }

  // Named tube colors used by the palette and level blobs.
  var TUBES = {
    red:    { r: 1, y: 0.02, b: 0.0,  w: 0,    label: "红" },
    orange: { r: 0.96, y: 0.72, b: 0, w: 0,    label: "橙" },
    yellow: { r: 0.02, y: 1, b: 0.0,  w: 0,    label: "黄" },
    green:  { r: 0.05, y: 0.92, b: 0.78, w: 0.02, label: "绿" },
    teal:   { r: 0.0, y: 0.42, b: 0.95, w: 0.04, label: "青" },
    blue:   { r: 0.0, y: 0.04, b: 1,  w: 0,    label: "蓝" },
    purple: { r: 0.82, y: 0.0, b: 0.88, w: 0.04, label: "紫" },
    pink:   { r: 0.92, y: 0.12, b: 0.18, w: 0.42, label: "粉" },
    white:  { r: 0, y: 0, b: 0, w: 1, label: "白" }
  };

  function tubeRgb(name) {
    var t = TUBES[name];
    return pigmentToRgb(t.r, t.y, t.b, t.w);
  }

  MixGame.pigment = {
    rybToRgb: rybToRgb,
    applyMud: applyMud,
    mixParts: mixParts,
    finishPigment: finishPigment,
    pigmentToRgb: pigmentToRgb,
    rgbToHex: rgbToHex,
    hexToRgb: hexToRgb,
    rgbToLab: rgbToLab,
    deltaE: deltaE,
    scoreFromDeltaE: scoreFromDeltaE,
    scoreAgainstHex: scoreAgainstHex,
    rgbToHsl: rgbToHsl,
    TUBES: TUBES,
    tubeRgb: tubeRgb,
    clamp01: clamp01,
    lerp: lerp
  };

  if (typeof module !== "undefined" && module.exports) {
    module.exports = MixGame.pigment;
  }
})(typeof window !== "undefined" ? window : global);
