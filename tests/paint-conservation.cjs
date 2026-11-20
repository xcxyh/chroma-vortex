const assert = require("node:assert/strict");
const test = require("node:test");

global.window = global;
global.matchMedia = () => ({ matches: false });
require("../js/pigment.js");
require("../js/levels.js");
require("../js/paint.js");

function createWell(diameter) {
  const ctx = { putImageData() {}, createImageData: (w, h) => ({ data: new Uint8ClampedArray(w * h * 4) }) };
  return new MixGame.PaintWell({ getContext: () => ctx }, diameter);
}

function measure(well) {
  const totals = new Float64Array(5);
  let painted = 0;
  const stride = well.field.length / (well.n * well.n);
  for (let y = 0; y < well.n; y++) {
    for (let x = 0; x < well.n; x++) {
      const i = (y * well.n + x) * stride;
      const mass = well.field[i + 4];
      if (Math.hypot(x + 0.5 - well.n / 2, y + 0.5 - well.n / 2) >= well.n / 2) {
        assert.equal(mass, 0, "paint escaped the dish");
        continue;
      }
      totals[4] += mass;
      for (let c = 0; c < 4; c++) totals[c] += mass * well.field[i + c];
      painted += Math.min(1, 4.5 * mass);
    }
  }
  return { totals, painted };
}

test("wide strokes along the rim preserve pigment, coverage and each colour component", () => {
  const well = createWell(44);
  well.seed(MixGame.levels[1].blobs);
  const before = measure(well);
  let from = { x: 0.02, y: 0.5 };
  for (let i = 1; i <= 72; i++) {
    const angle = i * Math.PI / 12;
    const to = { x: 0.5 - 0.48 * Math.cos(angle), y: 0.5 + 0.48 * Math.sin(angle) };
    well.stroke(from, to, 1);
    from = to;
  }
  const after = measure(well);
  before.totals.forEach((value, c) => assert.ok(Math.abs(after.totals[c] - value) <= value * 0.00001));
  assert.ok(after.painted >= before.painted * 0.99);
});

test("a brush pulls paint into bare space without altering distant pixels", () => {
  const well = createWell(24);
  well.drop("red", 0.3, 0.5);
  assert.equal(well.sampleHex(0.6, 0.5), null);
  const untouched = well.field.slice(0, well.field.length / well.n * Math.floor(well.n / 4));
  well.stroke({ x: 0.31, y: 0.5 }, { x: 0.7, y: 0.5 }, 0.5);
  assert.ok(well.sampleHex(0.6, 0.5));
  assert.deepEqual(well.field.subarray(0, untouched.length), untouched);
});

test("fresh red covers green until the brush crosses that part of the drop", () => {
  const well = createWell(12);
  well.seed([{ color: "green", mass: 8.4 }]);
  const red = MixGame.pigment.rgbToHex(MixGame.pigment.tubeRgb("red"));
  const green = well.sampleHex(0.5, 0.5);
  well.drop("red", 0.5, 0.5, 8.4);
  assert.equal(well.sampleHex(0.5, 0.5), red, "centre of fresh paint");
  assert.equal(well.sampleHex(0.80, 0.5), red, "inside the new red edge");
  assert.equal(well.sampleHex(0.96, 0.5), green);
  well.render();
  const pixel = (Math.floor(0.5 * well.n) * well.n + Math.floor(0.8 * well.n)) * 4;
  assert.equal(MixGame.pigment.rgbToHex(Array.from(well.image.data.slice(pixel, pixel + 3), c => c / 255)), red);
  const before = measure(well);
  well.stroke({x: 0.93, y: 0.5}, {x: 0.68, y: 0.5}, 0.5);
  assert.notEqual(well.sampleHex(0.80, 0.5), red);
  assert.equal(well.sampleHex(0.2, 0.5), red, "unbrushed edge");
  assert.equal(well.sampleHex(0.5, 0.5), red, "unbrushed centre");
  const after = measure(well);
  before.totals.forEach((v, k) => assert.ok(Math.abs(v - after.totals[k]) < 1e-5 * Math.max(1, v)));
});

test("successive overlapping drops show the last pigment, and clearing removes all layers", () => {
  const well = createWell(24);
  for (const name of ["blue", "yellow", "white", "red"]) {
    well.drop(name, 0.5, 0.5);
    assert.equal(well.sampleHex(0.5, 0.5), MixGame.pigment.rgbToHex(MixGame.pigment.tubeRgb(name)));
  }
  well.clear();
  assert.equal(well.sampleHex(0.5, 0.5), null);
  well.drop("green", 0.5, 0.5);
  assert.equal(well.measureUniformity(), 100);
});

test("a spiral draws out distinct pigment ribbons with a narrow mixed border", () => {
  const well = createWell(24);
  well.seed([{ color: "red", mass: 1 }]);
  const stride = well.field.length / (well.n * well.n);
  const yellow = MixGame.pigment.TUBES.yellow;
  for (let y = 0; y < well.n; y++) {
    for (let x = well.n / 2; x < well.n; x++) {
      well.field.set([yellow.r, yellow.y, yellow.b, yellow.w], (y * well.n + x) * stride);
    }
  }
  let from = { x: 0.59, y: 0.49 };
  for (let i = 1; i <= 72; i++) {
    const angle = i * Math.PI / 29, radius = 0.09 + 0.18 * i / 72;
    const to = { x: 0.5 + radius * Math.cos(angle), y: 0.49 + radius * Math.sin(angle) };
    well.stroke(from, to, 0.5);
    from = to;
  }
  let wet = 0, blended = 0;
  for (let i = 0; i < well.field.length; i += stride) {
    if (well.field[i + 4] === 0) continue;
    wet++;
    const red = well.field[i];
    assert.ok(red >= yellow.r - 1e-5 && red <= 1 + 1e-5);
    if (red > 0.2 && red < 0.82) blended++;
  }
  assert.ok(blended > 0 && blended / wet < 0.035, "red and yellow should mix along a narrow band");
});

test("repeat passes blend the two free-studio drops while conserving every pigment", () => {
  const well = createWell(24);
  well.drop("red", 0.57, 0.32);
  well.drop("yellow", 0.57, 0.68);
  const before = measure(well);
  const initialUniformity = well.measureUniformity();
  let from = { x: 0.89, y: 0.5 };
  for (let i = 1; i <= 6 * 48; i++) {
    const t = i * Math.PI / 24;
    const radius = 0.28 + 0.11 * Math.cos(3 * t);
    const to = { x: 0.5 + radius * Math.cos(2 * t), y: 0.5 + radius * Math.sin(2 * t) };
    well.stroke(from, to, 0.5);
    from = to;
  }
  const after = measure(well);
  assert.ok(well.measureUniformity() >= initialUniformity + 25);
  before.totals.forEach((value, c) => assert.ok(Math.abs(after.totals[c] - value) <= value * 1e-5));
});
